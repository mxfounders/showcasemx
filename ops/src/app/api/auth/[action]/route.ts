import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  verifyPassword, DUMMY_HASH, hashToken, generateToken,
  cookieOptions, SESSION_SECONDS, OPS_COOKIE,
} from '@/lib/auth';

export const runtime = 'nodejs';

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest, props: { params: Promise<{ action: string }> }) {
  const { action } = await props.params;

  if (!['login', 'logout'].includes(action)) return fail('Ruta no disponible.', 404);

  if (action === 'logout') {
    const token = req.cookies.get(OPS_COOKIE)?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
      try {
        const sql = getDb();
        await sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(token)}`;
      } catch { /* ignore */ }
    }
    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set({ ...cookieOptions(0), value: '' });
    return res;
  }

  // Login
  if (!req.headers.get('content-type')?.includes('application/json')) return fail('Formato no válido.', 415);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('Datos inválidos.', 400);
  }

  const input = body as Record<string, unknown>;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';

  if (!email || !password || password.length < 6) return fail('Correo o contraseña inválidos.', 400);

  try {
    const sql = getDb();

    // Rate limiting
    const emailKey = `ops:email:${hashToken(email)}`;
    const globalKey = 'ops:global';
    const limits = await sql`
      INSERT INTO auth_rate_limits (key, window_start, attempts)
      VALUES
        (${emailKey}, date_trunc('hour', now()) + floor(extract(minute from now()) / 15) * interval '15 minutes', 1),
        (${globalKey}, date_trunc('minute', now()), 1)
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start
          THEN auth_rate_limits.attempts + 1 ELSE 1 END,
        window_start = EXCLUDED.window_start
      RETURNING key, attempts
    `;
    if (limits.some(r => Number(r.attempts) > (r.key === globalKey ? 60 : 5))) {
      return new NextResponse(JSON.stringify({ error: 'Demasiados intentos. Espera 15 minutos.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Retry-After': '900' },
      });
    }

    // Find account that is also a reviewer
    const rows = await sql`
      SELECT a.id, a.password_hash
      FROM auth_accounts a
      JOIN solution_reviewers r ON r.account_id = a.id
      WHERE a.email = ${email}
      LIMIT 1
    `;

    const storedHash = rows.length ? String(rows[0].password_hash) : DUMMY_HASH;
    const valid = await verifyPassword(password, storedHash);

    if (!rows.length || !valid) return fail('Correo, contraseña o permisos incorrectos.', 401);

    const accountId = String(rows[0].id);
    const token = generateToken();

    const sessionResult = await sql.transaction([
      sql`SELECT id FROM auth_accounts WHERE id = ${accountId} FOR UPDATE`,
      sql`DELETE FROM auth_sessions WHERE account_id = ${accountId} AND expires_at <= now()`,
      sql`INSERT INTO auth_sessions (token_hash, account_id, expires_at)
          SELECT ${hashToken(token)}, id, now() + ${SESSION_SECONDS} * interval '1 second'
          FROM auth_accounts WHERE id = ${accountId} AND password_hash = ${storedHash}
          RETURNING account_id`,
    ]);

    if (!sessionResult[2].length) return fail('No se pudo crear la sesión.', 503);

    const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    res.cookies.set({ ...cookieOptions(SESSION_SECONDS), value: token });
    return res;
  } catch (err) {
    console.error('[ops/auth]', err);
    return fail('Error interno.', 503);
  }
}
