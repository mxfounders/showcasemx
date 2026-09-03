import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyPassword, DUMMY_HASH, hashToken, generateToken,
  sessionCookieOptions, challengeCookieOptions, OPS_CHALLENGE_SECONDS,
  OPS_COOKIE, opsLimit, requestIdentity, audit, requestIp,
} from '@/lib/auth';
import { failure, opsBody, sameOrigin } from '@/lib/http';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const { action } = await props.params;

  if (!['login', 'logout'].includes(action)) return failure('Ruta no disponible.', 404);
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  if (action === 'logout') {
    const token = req.cookies.get(OPS_COOKIE)?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      try {
        const sql = getDb();
        await sql`DELETE FROM ops_sessions WHERE token_hash = ${hashToken(token)}`;
      } catch { /* ignore */ }
    }
    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set({ ...sessionCookieOptions(0), value: '' });
    return res;
  }

  // Login step 1: password only. Never creates a session — only a short-lived challenge.
  const body = await opsBody(req);
  if (!body) return failure('Datos inválidos.', 400);

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password || password.length < 6) return failure('Correo o contraseña inválidos.', 400);

  try {
    const identity = requestIdentity(req.headers);
    const emailOk = await opsLimit('login-email', email, 5, 60);
    const globalOk = await opsLimit('login-global', identity, 5, 60);
    if (!emailOk || !globalOk) {
      return new NextResponse(JSON.stringify({ error: 'Demasiados intentos. Espera 15 minutos.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '900' },
      });
    }

    const sql = getDb();
    const rows = await sql`
      SELECT a.id, a.password_hash, r.totp_confirmed_at
      FROM auth_accounts a
      JOIN solution_reviewers r ON r.account_id = a.id
      WHERE a.email = ${email} AND r.disabled_at IS NULL AND a.suspended_at IS NULL
      LIMIT 1
    `;

    const storedHash = rows.length ? String(rows[0].password_hash) : DUMMY_HASH;
    const valid = await verifyPassword(password, storedHash);

    if (!rows.length || !valid) {
      await audit({ actorId: null, actorEmail: email, action: 'login_failed', subjectType: 'account', subjectId: email, ip: requestIp(req.headers) });
      return failure('Correo, contraseña o permisos incorrectos.', 401);
    }

    const accountId = String(rows[0].id);
    const totpConfirmed = Boolean(rows[0].totp_confirmed_at);
    const challengeToken = generateToken();

    await sql`DELETE FROM ops_login_challenges WHERE account_id = ${accountId} AND expires_at <= now()`;
    await sql`
      INSERT INTO ops_login_challenges (token_hash, account_id, password_hash_at_issue, expires_at)
      VALUES (${hashToken(challengeToken)}, ${accountId}, ${storedHash}, now() + ${OPS_CHALLENGE_SECONDS} * interval '1 second')
    `;

    const res = NextResponse.json(
      { ok: true, step: totpConfirmed ? 'totp' : 'enroll' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    res.cookies.set({ ...challengeCookieOptions(OPS_CHALLENGE_SECONDS), value: challengeToken });
    return res;
  } catch (err) {
    console.error('[ops/auth]', err);
    if (err instanceof Error && err.message === 'NO_DATABASE_URL') return failure('Falta la variable DATABASE_URL en Vercel.', 503);
    return failure('Error interno. Intenta más tarde.', 503);
  }
}
