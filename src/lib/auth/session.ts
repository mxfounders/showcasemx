import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from '@/lib/database-url';
import { hashToken } from './password';
export const sessionCookie = process.env.NODE_ENV === 'production' ? '__Host-showcasemx-session' : 'showcasemx-session';
export const sessionSeconds = 60 * 60 * 24 * 7;
export const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: sessionSeconds };
export async function getSession(token: string | undefined): Promise<{ id: string; email: string } | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const url = getDatabaseUrl();
  if (!url) throw new Error('Storage unavailable');
  const sql = neon(url);
  const rows = await sql`SELECT a.id, a.email FROM auth_sessions s JOIN auth_accounts a ON a.id = s.account_id WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now() AND a.suspended_at IS NULL LIMIT 1`;
  return rows.length ? { id: String(rows[0].id), email: String(rows[0].email) } : null;
}
