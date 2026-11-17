import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { hashToken } from './password';
export function authSql() {
  const url = getDatabaseUrl();
  if (!url) throw new Error('Storage unavailable');
  return neon(url);
}

/**
 * The network a request comes from, for pre-authentication limits (SHCWS-171).
 * IPv4 as is; IPv6 grouped by its /64, because one connection usually owns a whole /64
 * (2^64 addresses) and counting single addresses would let it walk around every limit.
 * Vercel replaces its forwarding headers. Callers persist only a hash of this value.
 */
export function requestIdentity(headers: Headers) {
  const candidate = (
    headers.get('x-forwarded-for')?.split(',')[0] ??
    headers.get('x-real-ip') ??
    ''
  ).trim();
  return networkOf(candidate) ?? 'unknown';
}

const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** An IPv4 address, or the /64 of an IPv6 one; null for anything else. */
export function networkOf(value: string): string | null {
  if (!value || value.length > 64) return null;
  const four = ipv4.exec(value);
  if (four) return four.slice(1).every(part => Number(part) <= 255) ? value : null;
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return null;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  if (mapped) return networkOf(mapped[1]);
  let text = value;
  if (text.includes('.')) {
    // An embedded IPv4 tail fills the last 32 bits, which the /64 drops anyway.
    const cut = text.lastIndexOf(':');
    if (!networkOf(text.slice(cut + 1))) return null;
    text = `${text.slice(0, cut + 1)}0:0`;
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) return null;
  const groups = [...head, ...Array<string>(Math.max(0, missing)).fill('0'), ...tail];
  if (groups.some(group => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
  return `${groups
    .slice(0, 4)
    .map(group => parseInt(group, 16).toString(16))
    .join(':')}::/64`;
}

/**
 * What one identity may still do. The shared counter of a scope is a pressure signal, not
 * a wall (SHCWS-171): above `globalMaximum` a minute, identities that already used a
 * quarter of their allowance are refused and everyone else still gets through, so a few
 * busy networks can't lock the whole site out of a feature.
 */
export function withinLimit(own: number, shared: number, maximum: number, globalMaximum: number) {
  return own <= (shared > globalMaximum ? pressureAllowance(maximum) : maximum);
}
export function pressureAllowance(maximum: number) {
  return Math.max(1, Math.ceil(maximum / 4));
}

/** Fixed windows: an hour per identity, a minute for the shared counter of the scope. */
export async function securityLimit(
  scope: string,
  identity: string,
  maximum = 8,
  globalMaximum = 60,
) {
  const sql = authSql();
  const key = `${scope}:${hashToken(identity)}`;
  const global = `${scope}:global`;
  const rows = await sql`INSERT INTO auth_rate_limits (key,window_start,attempts)
    VALUES (${key},date_trunc('hour',now()),1),(${global},date_trunc('minute',now()),1)
    ON CONFLICT (key) DO UPDATE SET attempts=CASE WHEN auth_rate_limits.window_start=EXCLUDED.window_start THEN auth_rate_limits.attempts+1 ELSE 1 END,window_start=EXCLUDED.window_start RETURNING key,attempts`;
  const count = (name: string) => Number(rows.find(row => row.key === name)?.attempts ?? 0);
  return withinLimit(count(key), count(global), maximum, globalMaximum);
}
