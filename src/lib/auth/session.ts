import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { hashToken } from './password';
export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-showcasemx-session' : 'showcasemx-session';
export const sessionSeconds = 60 * 60 * 24 * 7;
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: sessionSeconds };

// Second step of a two-step login. Holds a verified password, never an identity:
// it cannot read or write anything until the code is accepted and it expires fast.
export const challengeCookie = process.env.NODE_ENV === 'production' ? '__Host-showcasemx-challenge' : 'showcasemx-challenge';
export const challengeSeconds = 60 * 5;
export const challengeCookieOptions = { ...cookieOptions, maxAge: challengeSeconds };

/**
 * A short, readable device label so a person can tell their own sessions apart.
 * Coarse on purpose: browser and platform family only, never a full fingerprint,
 * and no network address (see db/account-security.sql).
 */
export function deviceLabel(userAgent: string | null | undefined): string {
  const value = (userAgent ?? '').slice(0, 300);
  if (!value) return 'Dispositivo desconocido';
  const browser = /Edg\//.test(value) ? 'Edge' : /OPR\/|Opera/.test(value) ? 'Opera' : /Firefox\//.test(value) ? 'Firefox' : /Chrome\//.test(value) ? 'Chrome' : /Safari\//.test(value) ? 'Safari' : 'Navegador';
  const platform = /iPhone|iPad|iPod/.test(value) ? 'iOS' : /Android/.test(value) ? 'Android' : /Mac OS X|Macintosh/.test(value) ? 'macOS' : /Windows/.test(value) ? 'Windows' : /Linux/.test(value) ? 'Linux' : 'sistema desconocido';
  return `${browser} en ${platform}`;
}
export function readUserAgent(headers: Headers): string | null { return headers.get('user-agent')?.slice(0, 300) ?? null; }

export async function getSession(token: string | undefined): Promise<{ id: string; email: string } | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const url = getDatabaseUrl();
  if (!url) throw new Error('Storage unavailable');
  const sql = neon(url);
  const rows = await sql`SELECT a.id, a.email FROM auth_sessions s JOIN auth_accounts a ON a.id = s.account_id WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now() AND a.suspended_at IS NULL LIMIT 1`;
  return rows.length ? { id: String(rows[0].id), email: String(rows[0].email) } : null;
}
