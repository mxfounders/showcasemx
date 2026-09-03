import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  hashToken, generateToken, sessionCookieOptions, challengeCookieOptions,
  OPS_SESSION_SECONDS, OPS_CHALLENGE_COOKIE, opsLimit, requestIdentity, audit, requestIp,
} from '@/lib/auth';
import { failure, opsBody, sameOrigin } from '@/lib/http';
import { decryptSecret, hashBackupCode } from '@/lib/crypto';
import { verifyTotp } from '@/lib/totp';

export const runtime = 'nodejs';

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return failure('Origen no autorizado.', 403);

  const challengeToken = req.cookies.get(OPS_CHALLENGE_COOKIE)?.value;
  if (!challengeToken || !/^[a-f0-9]{64}$/.test(challengeToken)) {
    return failure('Sesión de acceso expirada. Inicia sesión de nuevo.', 401);
  }

  const body = await opsBody(req);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!/^\d{6}$/.test(code) && !/^\d{8}$/.test(code)) return failure('Código inválido.', 400);

  const identity = requestIdentity(req.headers);
  if (!(await opsLimit('totp', identity, 30, 300))) {
    return new NextResponse(JSON.stringify({ error: 'Demasiados intentos. Espera unos minutos.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '300' },
    });
  }

  try {
    const sql = getDb();
    const challengeHash = hashToken(challengeToken);

    const rows = await sql`
      SELECT c.account_id, c.password_hash_at_issue, c.attempts,
        a.email, a.password_hash, a.suspended_at,
        r.level, r.totp_secret, r.totp_confirmed_at, r.totp_last_step, r.backup_codes
      FROM ops_login_challenges c
      JOIN auth_accounts a ON a.id = c.account_id
      JOIN solution_reviewers r ON r.account_id = c.account_id
      WHERE c.token_hash = ${challengeHash} AND c.expires_at > now()
      LIMIT 1
    `;

    if (!rows.length) return failure('Sesión de acceso expirada. Inicia sesión de nuevo.', 401);
    const row = rows[0];

    if (row.suspended_at) {
      await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
      return failure('Cuenta suspendida.', 403);
    }
    if (String(row.password_hash) !== String(row.password_hash_at_issue)) {
      await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
      return failure('Tu contraseña cambió. Inicia sesión de nuevo.', 401);
    }
    if (!row.totp_confirmed_at || !row.totp_secret) {
      return failure('Configura tu autenticador antes de continuar.', 409);
    }
    if (Number(row.attempts) >= MAX_ATTEMPTS) {
      await sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`;
      return failure('Demasiados intentos. Inicia sesión de nuevo.', 429);
    }

    const accountId = String(row.account_id);
    let acceptedStep: bigint | null = null;
    let usedBackupCode: string | null = null;

    if (/^\d{6}$/.test(code)) {
      const secret = decryptSecret(String(row.totp_secret));
      const lastStep = row.totp_last_step !== null ? BigInt(String(row.totp_last_step)) : null;
      acceptedStep = verifyTotp(secret, code, lastStep);
    } else {
      const codeHash = hashBackupCode(code);
      const codes: string[] = Array.isArray(row.backup_codes) ? row.backup_codes : [];
      if (codes.includes(codeHash)) usedBackupCode = codeHash;
    }

    if (acceptedStep === null && usedBackupCode === null) {
      await sql`UPDATE ops_login_challenges SET attempts = attempts + 1 WHERE token_hash = ${challengeHash}`;
      return failure('Código incorrecto.', 401);
    }

    // Single-use: consume the challenge and (if applicable) the backup code atomically with session creation.
    const sessionToken = generateToken();
    await sql.transaction([
      sql`DELETE FROM ops_login_challenges WHERE token_hash = ${challengeHash}`,
      acceptedStep !== null
        ? sql`UPDATE solution_reviewers SET totp_last_step = ${acceptedStep.toString()} WHERE account_id = ${accountId}`
        : sql`UPDATE solution_reviewers SET backup_codes = array_remove(backup_codes, ${usedBackupCode}) WHERE account_id = ${accountId}`,
      sql`INSERT INTO ops_sessions (token_hash, account_id, expires_at, ip, user_agent)
          VALUES (${hashToken(sessionToken)}, ${accountId}, now() + ${OPS_SESSION_SECONDS} * interval '1 second',
            ${requestIp(req.headers)}, ${req.headers.get('user-agent')?.slice(0, 300) ?? null})`,
    ]);

    await audit({
      actorId: accountId,
      actorEmail: String(row.email),
      action: 'login_success',
      subjectType: 'account',
      subjectId: accountId,
      metadata: { method: usedBackupCode ? 'backup_code' : 'totp' },
      ip: requestIp(req.headers),
    });

    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set({ ...sessionCookieOptions(OPS_SESSION_SECONDS), value: sessionToken });
    res.cookies.set({ ...challengeCookieOptions(0), value: '' });
    return res;
  } catch (err) {
    console.error('[ops/auth/totp]', err);
    return failure('Error interno.', 503);
  }
}
