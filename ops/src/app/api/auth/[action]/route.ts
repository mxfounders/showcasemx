import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyPassword,
  DUMMY_HASH,
  hashToken,
  generateToken,
  sessionCookieOptions,
  challengeCookieOptions,
  OPS_CHALLENGE_SECONDS,
  OPS_COOKIE,
  opsLimit,
  requestIdentity,
} from '@/lib/auth';
import { audit } from '@/lib/audit';
import { failure, opsBody, sameOrigin } from '@/lib/http';
import { clientIp } from '@/lib/net';
import { deviceLabel, readUserAgent } from '@/lib/device';

export const runtime = 'nodejs';

const NO_STORE = { 'Cache-Control': 'no-store' };

function tooMany(retryAfter: number, message: string) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { ...NO_STORE, 'Retry-After': String(retryAfter) } },
  );
}

export async function POST(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const { action } = await props.params;

  if (!['login', 'logout'].includes(action)) return failure('Ruta no disponible.', 404);
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  if (action === 'logout') {
    const token = req.cookies.get(OPS_COOKIE)?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      try {
        const sql = getDb();
        const rows = await sql`
          DELETE FROM ops_sessions s USING auth_accounts a
          WHERE s.token_hash = ${hashToken(token)} AND a.id = s.account_id
          RETURNING a.id, a.email
        `;
        if (rows.length)
          await audit({
            actorId: String(rows[0].id),
            actorEmail: String(rows[0].email),
            action: 'logout',
            subjectType: 'session',
            subjectId: hashToken(token).slice(0, 12),
            ip: clientIp(req.headers),
          });
      } catch {
        /* the cookie is cleared below either way */
      }
    }
    const res = NextResponse.json({ ok: true }, { headers: NO_STORE });
    res.cookies.set({ ...sessionCookieOptions(0), value: '' });
    res.cookies.set({ ...challengeCookieOptions(0), value: '' });
    return res;
  }

  // Login step 1: password only. Never creates a session — only a short-lived challenge.
  const body = await opsBody(req);
  if (!body) return failure('Datos inválidos.', 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length < 6 || password.length > 4096)
    return failure('Correo o contraseña inválidos.', 400);

  const ip = clientIp(req.headers);
  const userAgent = readUserAgent(req.headers);

  try {
    const emailOk = await opsLimit('login-email', email, 5, 60);
    const networkOk = await opsLimit('login-global', requestIdentity(req.headers), 10, 60);
    if (!emailOk || !networkOk) {
      await audit({
        actorId: null,
        actorEmail: email,
        action: 'login_throttled',
        subjectType: 'account',
        subjectId: email,
        metadata: { device: deviceLabel(userAgent) },
        ip,
      });
      return tooMany(900, 'Demasiados intentos. Espera 15 minutos.');
    }

    const sql = getDb();
    const rows = await sql`
      SELECT a.id, a.password_hash, r.totp_confirmed_at,
        (r.totp_confirmed_at IS NULL AND r.enroll_by IS NOT NULL AND r.enroll_by < now()) AS enroll_expired
      FROM auth_accounts a
      JOIN solution_reviewers r ON r.account_id = a.id
      WHERE a.email = ${email} AND r.disabled_at IS NULL AND a.suspended_at IS NULL
      LIMIT 1
    `;

    // Uniform timing and wording whether the account exists, lacks ops access or
    // the password is wrong.
    const storedHash = rows.length ? String(rows[0].password_hash) : DUMMY_HASH;
    const valid = await verifyPassword(password, storedHash);

    if (!rows.length || !valid) {
      // actorId stays null: whoever typed this password is not known to be the owner.
      await audit({
        actorId: null,
        actorEmail: email,
        action: 'login_failed',
        subjectType: 'account',
        subjectId: email,
        metadata: { device: deviceLabel(userAgent) },
        ip,
      });
      return failure('Correo, contraseña o permisos incorrectos.', 401);
    }

    const accountId = String(rows[0].id);
    if (rows[0].enroll_expired) {
      await audit({
        actorId: accountId,
        actorEmail: email,
        action: 'enroll_expired',
        subjectType: 'account',
        subjectId: accountId,
        ip,
      });
      return failure(
        'Tu invitación para configurar el autenticador venció. Pide a un administrador que la renueve.',
        403,
      );
    }

    const totpConfirmed = Boolean(rows[0].totp_confirmed_at);
    const challengeToken = generateToken();

    await sql.transaction([
      sql`DELETE FROM ops_login_challenges WHERE account_id = ${accountId} AND expires_at <= now()`,
      sql`
        INSERT INTO ops_login_challenges (token_hash, account_id, password_hash_at_issue, expires_at)
        VALUES (${hashToken(challengeToken)}, ${accountId}, ${storedHash}, now() + ${OPS_CHALLENGE_SECONDS} * interval '1 second')
      `,
    ]);

    const res = NextResponse.json(
      { ok: true, step: totpConfirmed ? 'totp' : 'enroll' },
      { headers: NO_STORE },
    );
    res.cookies.set({ ...challengeCookieOptions(OPS_CHALLENGE_SECONDS), value: challengeToken });
    return res;
  } catch (err) {
    console.error('[ops/auth]', err);
    if (err instanceof Error && err.message === 'NO_DATABASE_URL')
      return failure('Falta la variable DATABASE_URL en Vercel.', 503);
    return failure('Error interno. Intenta más tarde.', 503);
  }
}
