import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

export const OPS_COOKIE = 'ops-session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

export interface OpsUser {
  id: string;
  email: string;
}

/** Validate the ops session cookie. Returns user or null. */
export async function getOpsSession(): Promise<OpsUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPS_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT a.id, a.email
      FROM auth_sessions s
      JOIN auth_accounts a ON a.id = s.account_id
      JOIN solution_reviewers r ON r.account_id = a.id
      WHERE s.token_hash = ${hashToken(token)}
        AND s.expires_at > now()
      LIMIT 1
    `;
    return rows.length ? { id: String(rows[0].id), email: String(rows[0].email) } : null;
  } catch {
    return null;
  }
}

export function cookieOptions(maxAge: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    name: OPS_COOKIE,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}
