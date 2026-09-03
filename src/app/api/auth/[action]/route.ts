import { randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import { dummyHash, hashPassword, hashToken, validateCredentials, verifyPassword } from '@/lib/auth/password';
import { challengeCookie, challengeCookieOptions, challengeSeconds, cookieOptions, readUserAgent, sessionCookie, sessionSeconds } from '@/lib/auth/session';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { decryptSecret, hashBackupCode, verifyTotp } from '@/lib/auth/totp';
export const runtime = 'nodejs';

const MAX_CHALLENGE_ATTEMPTS = 5;

export async function POST(request: NextRequest, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  const action = params.action;
  if (!['login', 'register', 'logout', 'totp'].includes(action)) return fail('Ruta no disponible.', 404);
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail('Usa el formulario de shwcs.', 403);
  const url = getDatabaseUrl();
  if (!url) return fail('El acceso todavía no está habilitado. Inténtalo más tarde.', 503);
  try {
    const sql = neon(url);
    if (action === 'logout') {
      const token = request.cookies.get(sessionCookie)?.value;
      if (token) await sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(token)}`;
      const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
      response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
      return response;
    }
    if (!request.headers.get('content-type')?.includes('application/json')) return fail('Formato no válido.', 415);
    const reader = request.body?.getReader();
    if (!reader) return fail('Faltan tus datos.', 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    let body: unknown;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) { await reader.cancel(); return fail('Datos demasiado largos.', 413); }
        chunks.push(value);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch { return fail('Revisa los datos del formulario.', 400); }

    // Issues the real session. Shared by a one-step login and by the second factor,
    // so both paths record the device and drop the previous cookie the same way.
    const openSession = async (accountId: string, verifiedHash: string) => {
      const token = randomBytes(32).toString('hex');
      const oldToken = request.cookies.get(sessionCookie)?.value ?? '';
      const result = await sql.transaction([
        sql`SELECT id FROM auth_accounts WHERE id=${accountId} FOR UPDATE`,
        sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(oldToken)} OR (account_id = ${accountId} AND expires_at <= now())`,
        sql`INSERT INTO auth_sessions (token_hash, account_id, expires_at, user_agent) SELECT ${hashToken(token)}, id, now() + ${sessionSeconds} * interval '1 second', ${readUserAgent(request.headers)} FROM auth_accounts WHERE id=${accountId} AND password_hash=${verifiedHash} RETURNING account_id`,
      ]);
      return result[2].length ? token : null;
    };

    if (action === 'totp') {
      // The challenge cookie proves a password was verified minutes ago; it is not
      // an identity and grants nothing until the code checks out.
      const challengeToken = request.cookies.get(challengeCookie)?.value ?? '';
      if (!/^[a-f0-9]{64}$/.test(challengeToken)) return fail('Tu verificación expiró. Inicia sesión de nuevo.', 401);
      const code = typeof (body as { code?: unknown })?.code === 'string' ? (body as { code: string }).code.trim().replace(/\s/g, '') : '';
      if (!/^\d{6}$/.test(code) && !/^\d{8}$/.test(code)) return fail('Escribe el código de 6 dígitos o uno de respaldo de 8.', 400);
      if (!await securityLimit('auth-totp', requestIdentity(request.headers), 20, 200)) return fail('Demasiados intentos. Espera antes de volver a intentar.', 429);

      const rows = await sql`SELECT c.account_id, c.password_hash_at_issue, c.attempts, a.password_hash, a.suspended_at, a.totp_secret, a.totp_confirmed_at, a.totp_last_step, a.backup_codes
        FROM auth_login_challenges c JOIN auth_accounts a ON a.id = c.account_id
        WHERE c.token_hash = ${hashToken(challengeToken)} AND c.expires_at > now() LIMIT 1`;
      const challenge = rows[0];
      if (!challenge || challenge.suspended_at || !challenge.totp_confirmed_at || !challenge.totp_secret) return fail('Tu verificación expiró. Inicia sesión de nuevo.', 401);
      if (String(challenge.password_hash) !== String(challenge.password_hash_at_issue)) return fail('Tu acceso cambió. Vuelve a iniciar sesión.', 401);
      if (Number(challenge.attempts) >= MAX_CHALLENGE_ATTEMPTS) {
        await sql`DELETE FROM auth_login_challenges WHERE token_hash = ${hashToken(challengeToken)}`;
        return fail('Demasiados códigos incorrectos. Inicia sesión de nuevo.', 401);
      }

      const accountId = String(challenge.account_id);
      const lastStep = challenge.totp_last_step === null || challenge.totp_last_step === undefined ? null : BigInt(String(challenge.totp_last_step));
      let acceptedStep: bigint | null = null;
      let usedBackup = false;
      if (code.length === 6) {
        acceptedStep = verifyTotp(decryptSecret(String(challenge.totp_secret)), code, lastStep);
      } else {
        // A backup code is single use: it is removed in the same statement that
        // opens the session, so a replay finds nothing to consume.
        const stored = (challenge.backup_codes as string[] | null) ?? [];
        usedBackup = stored.includes(hashBackupCode(code));
      }
      if (acceptedStep === null && !usedBackup) {
        await sql`UPDATE auth_login_challenges SET attempts = attempts + 1 WHERE token_hash = ${hashToken(challengeToken)}`;
        return fail('Código incorrecto.', 401);
      }

      const verifiedHash = String(challenge.password_hash);
      const token = await openSession(accountId, verifiedHash);
      if (!token) return fail('Tu acceso cambió. Vuelve a iniciar sesión.', 401);
      await sql.transaction([
        acceptedStep === null
          ? sql`UPDATE auth_accounts SET backup_codes = array_remove(backup_codes, ${hashBackupCode(code)}) WHERE id = ${accountId}`
          : sql`UPDATE auth_accounts SET totp_last_step = ${acceptedStep.toString()} WHERE id = ${accountId}`,
        sql`DELETE FROM auth_login_challenges WHERE account_id = ${accountId}`,
      ]);
      const response = NextResponse.json({ ok: true, usedBackupCode: usedBackup }, { headers: { 'Cache-Control': 'no-store' } });
      response.cookies.set(sessionCookie, token, cookieOptions);
      response.cookies.set(challengeCookie, '', { ...challengeCookieOptions, maxAge: 0 });
      return response;
    }

    const credentials = validateCredentials(body);
    if (!credentials) return fail('Revisa tu correo y contraseña. Necesitas al menos 6 caracteres.', 400);
    // Atomic database counters work across serverless instances. Limit both account
    // guessing and total expensive password operations; no in-memory limiter.
    const emailKey = `auth:email:${hashToken(credentials.email)}`;
    const addressKey = `auth:address:${hashToken(requestIdentity(request.headers))}`;
    const globalKey = 'auth:global';
    const limits = await sql`INSERT INTO auth_rate_limits (key, window_start, attempts)
      VALUES (${emailKey}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1),
             (${addressKey}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1),
             (${globalKey}, date_trunc('minute', now()), 1)
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start THEN auth_rate_limits.attempts + 1 ELSE 1 END,
        window_start = EXCLUDED.window_start RETURNING key, attempts`;
    if (limits.some(row => Number(row.attempts) > (row.key === globalKey ? 120 : row.key === addressKey ? 30 : 10))) {
      const response = fail('Demasiados intentos. Espera 15 minutos antes de volver a intentar.', 429);
      response.headers.set('Retry-After', '900');
      return response;
    }
    const { email, password } = credentials;
    if (action === 'register') {
      const hash = await hashPassword(password);
      await sql`INSERT INTO auth_accounts (id, email, password_hash) VALUES (${randomUUID()}, ${email}, ${hash}) ON CONFLICT (email) DO NOTHING`;
      // Generic registration result; never authenticate an existing account.
      return NextResponse.json({ ok: true, registered: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const rows = await sql`SELECT id, password_hash, suspended_at, totp_confirmed_at FROM auth_accounts WHERE email = ${email} LIMIT 1`;
    const valid = await verifyPassword(password, rows.length ? String(rows[0].password_hash) : dummyHash);
    if (!rows.length || !valid || rows[0].suspended_at) return fail('Correo o contraseña incorrectos.', 401);
    const accountId = String(rows[0].id);
    const verifiedHash = String(rows[0].password_hash);

    if (rows[0].totp_confirmed_at) {
      // Password alone stops here. No session exists until the second factor passes.
      const challengeToken = randomBytes(32).toString('hex');
      await sql.transaction([
        sql`DELETE FROM auth_login_challenges WHERE account_id = ${accountId} OR expires_at <= now()`,
        sql`INSERT INTO auth_login_challenges (token_hash, account_id, password_hash_at_issue, expires_at)
            VALUES (${hashToken(challengeToken)}, ${accountId}, ${verifiedHash}, now() + ${challengeSeconds} * interval '1 second')`,
      ]);
      const response = NextResponse.json({ ok: true, step: 'totp' }, { headers: { 'Cache-Control': 'no-store' } });
      response.cookies.set(challengeCookie, challengeToken, challengeCookieOptions);
      return response;
    }

    const token = await openSession(accountId, verifiedHash);
    if (!token) return fail('Tu acceso cambió. Vuelve a iniciar sesión.', 401);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, token, cookieOptions);
    return response;
  } catch {
    return fail('No pudimos completar la operación. Inténtalo más tarde.', 503);
  }
}
