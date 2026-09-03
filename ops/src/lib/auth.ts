import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from './db';
import { failure } from './http';

export const OPS_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-ops-session' : 'ops-session';
export const OPS_CHALLENGE_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-ops-challenge' : 'ops-challenge';
export const OPS_SESSION_SECONDS = 60 * 60 * 8; // 8 hours, deliberately shorter than the product's 7 days
export const OPS_CHALLENGE_SECONDS = 60 * 5; // 5 minutes to enter the TOTP code

export type OpsLevel = 'reviewer' | 'admin';

export interface OpsUser {
  id: string;
  email: string;
  level: OpsLevel;
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken() {
  return randomBytes(32).toString('hex');
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key as Buffer)
    )
  );
}

export async function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split(':');
  if (version !== 'scrypt-v1' || !/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(hash ?? '')) return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, 'hex'));
}

export const DUMMY_HASH = `scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`;

/** Validates the ops session cookie. Requires an active, non-disabled reviewer/admin row and a non-suspended account. */
export async function getOpsSession(): Promise<OpsUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPS_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT a.id, a.email, r.level
      FROM ops_sessions s
      JOIN auth_accounts a ON a.id = s.account_id
      JOIN solution_reviewers r ON r.account_id = a.id
      WHERE s.token_hash = ${hashToken(token)}
        AND s.expires_at > now()
        AND r.disabled_at IS NULL
        AND a.suspended_at IS NULL
      LIMIT 1
    `;
    if (!rows.length) return null;
    // Best-effort presence refresh; failure here must not fail the request.
    sql`UPDATE ops_sessions SET last_seen_at = now() WHERE token_hash = ${hashToken(token)}`.catch(() => {});
    return { id: String(rows[0].id), email: String(rows[0].email), level: rows[0].level === 'admin' ? 'admin' : 'reviewer' };
  } catch {
    return null;
  }
}

function cookieOptions(name: string, maxAge: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

export function sessionCookieOptions(maxAge = OPS_SESSION_SECONDS) {
  return cookieOptions(OPS_COOKIE, maxAge);
}

export function challengeCookieOptions(maxAge = OPS_CHALLENGE_SECONDS) {
  return cookieOptions(OPS_CHALLENGE_COOKIE, maxAge);
}

/** Rate limiting on the shared auth_rate_limits table, namespaced under the "ops:" scope prefix. */
export async function opsLimit(scope: string, identity: string, maximum = 8, globalMaximum = 60): Promise<boolean> {
  const sql = getDb();
  const key = `ops:${scope}:${hashToken(identity)}`;
  const global = `ops:${scope}:global`;
  const rows = await sql`
    INSERT INTO auth_rate_limits (key, window_start, attempts)
    VALUES (${key}, date_trunc('hour', now()), 1), (${global}, date_trunc('minute', now()), 1)
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN auth_rate_limits.window_start = EXCLUDED.window_start
        THEN auth_rate_limits.attempts + 1 ELSE 1 END,
      window_start = EXCLUDED.window_start
    RETURNING key, attempts
  `;
  return rows.every(row => Number(row.attempts) <= (row.key === global ? globalMaximum : maximum));
}

export function requestIdentity(headers: Headers): string {
  const candidate = (headers.get('x-forwarded-for')?.split(',')[0] ?? headers.get('x-real-ip') ?? '').trim();
  return candidate && candidate.length <= 128 && /^[0-9a-f:.]+$/i.test(candidate) ? candidate : 'unknown';
}

export { audit, requestIp } from './audit';
export { sameOrigin, isUuid, failure, opsBody } from './http';

// --- Guards -----------------------------------------------------------

/** Server Component guard: redirects unauthenticated visitors to /login. */
export async function requireOps(): Promise<OpsUser> {
  const user = await getOpsSession();
  if (!user) redirect('/login');
  return user;
}

/** Route Handler guard: returns a 401 Response instead of redirecting. */
export async function requireOpsApi(): Promise<OpsUser | Response> {
  const user = await getOpsSession();
  if (!user) return failure('No autenticado.', 401);
  return user;
}

/** Route Handler guard restricted to admin-level ops accounts. */
export async function requireAdmin(): Promise<OpsUser | Response> {
  const user = await getOpsSession();
  if (!user) return failure('No autenticado.', 401);
  if (user.level !== 'admin') return failure('Requiere permisos de administrador.', 403);
  return user;
}
