import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { hashToken } from './password';
export function authSql() { const url = getDatabaseUrl(); if (!url) throw new Error('Storage unavailable'); return neon(url); }
export function requestIdentity(headers: Headers) {
  const candidate = (headers.get('x-forwarded-for')?.split(',')[0] ?? headers.get('x-real-ip') ?? '').trim();
  // Vercel replaces its forwarding headers. Bound the value here and persist
  // only its hash below, never the raw network identifier.
  return candidate && candidate.length <= 128 && /^[0-9a-f:.]+$/i.test(candidate) ? candidate : 'unknown';
}
export async function securityLimit(scope: string, identity: string, maximum = 8, globalMaximum = 60) {
  const sql = authSql();
  const key = `${scope}:${hashToken(identity)}`;
  const global = `${scope}:global`;
  const rows = await sql`INSERT INTO auth_rate_limits (key,window_start,attempts)
    VALUES (${key},date_trunc('hour',now()),1),(${global},date_trunc('minute',now()),1)
    ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.window_start=EXCLUDED.window_start THEN auth_rate_limits.attempts+1 ELSE 1 END,window_start=EXCLUDED.window_start RETURNING key,attempts`;
  return rows.every(row => Number(row.attempts) <= (row.key === global ? globalMaximum : maximum));
}
