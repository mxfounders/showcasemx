import { randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import { dummyHash, hashPassword, hashToken, validateCredentials, verifyPassword } from '@/lib/auth/password';
import { cookieOptions, sessionCookie, sessionSeconds } from '@/lib/auth/session';
import { requestIdentity } from '@/lib/auth/security';
export const runtime = 'nodejs';

export async function POST(request: NextRequest, props: { params: Promise<{ action: string }> }) {
  const params = await props.params;
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  const action = params.action;
  if (!['login', 'register', 'logout'].includes(action)) return fail('Ruta no disponible.', 404);
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
    let accountId: string;
    let verifiedHash = '';
    if (action === 'register') {
      const hash = await hashPassword(password);
      await sql`INSERT INTO auth_accounts (id, email, password_hash) VALUES (${randomUUID()}, ${email}, ${hash}) ON CONFLICT (email) DO NOTHING`;
      // Generic registration result; never authenticate an existing account.
      return NextResponse.json({ ok: true, registered: true }, { headers: { 'Cache-Control': 'no-store' } });
    } else {
      const rows = await sql`SELECT id, password_hash, suspended_at FROM auth_accounts WHERE email = ${email} LIMIT 1`;
      const valid = await verifyPassword(password, rows.length ? String(rows[0].password_hash) : dummyHash);
      if (!rows.length || !valid || rows[0].suspended_at) return fail('Correo o contraseña incorrectos.', 401);
      accountId = String(rows[0].id);
      verifiedHash = String(rows[0].password_hash);
    }
    const token = randomBytes(32).toString('hex');
    const oldToken = request.cookies.get(sessionCookie)?.value ?? '';
    const sessionResult = await sql.transaction([
      sql`SELECT id FROM auth_accounts WHERE id=${accountId} FOR UPDATE`,
      sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(oldToken)} OR (account_id = ${accountId} AND expires_at <= now())`,
      sql`INSERT INTO auth_sessions (token_hash, account_id, expires_at) SELECT ${hashToken(token)}, id, now() + ${sessionSeconds} * interval '1 second' FROM auth_accounts WHERE id=${accountId} AND password_hash=${verifiedHash} RETURNING account_id`,
    ]);
    if (!sessionResult[2].length) return fail('Tu acceso cambió. Vuelve a iniciar sesión.', 401);
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(sessionCookie, token, cookieOptions);
    return response;
  } catch {
    return fail('No pudimos completar la operación. Inténtalo más tarde.', 503);
  }
}
