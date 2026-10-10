import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getDb } from './db';
import { failure } from './http';
import { audit } from './audit';
import { clientIp } from './net';
import { readUserAgent } from './device';
import { decryptSecret } from './crypto';
import { verifyTotp } from './totp';

export const OPS_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-ops-session' : 'ops-session';
export const OPS_CHALLENGE_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-ops-challenge' : 'ops-challenge';
/** Absolute lifetime, deliberately far shorter than the product's 7 days. */
export const OPS_SESSION_SECONDS = 60 * 60 * 8;
/** Inactivity limit: a session nobody used for this long is dead. */
export const OPS_IDLE_SECONDS = 60 * 30;
/** Window to type the TOTP code after the password step. */
export const OPS_CHALLENGE_SECONDS = 60 * 5;
/** How long a fresh TOTP code unlocks critical actions on one session. */
export const OPS_ELEVATION_SECONDS = 60 * 10;
/** Accounts added or reset from the panel must enroll within this window. */
export const OPS_ENROLL_SECONDS = 60 * 60 * 72;

export type OpsLevel = 'reviewer' | 'admin';

export interface OpsUser {
  id: string;
  email: string;
  name: string | null;
  level: OpsLevel;
  /** SHA-256 of this session's token; identifies the row, unusable as a credential. */
  sessionId: string;
  elevated: boolean;
  elevatedUntil: string | null;
  idleExpiresAt: string;
  expiresAt: string;
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
      err ? reject(err) : resolve(key as Buffer),
    ),
  );
}

export async function verifyPassword(password: string, stored: string) {
  const [version, salt, hash] = stored.split(':');
  if (
    version !== 'scrypt-v1' ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(hash ?? '')
  )
    return false;
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, 'hex'));
}

export const DUMMY_HASH = `scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`;

const TOKEN_RE = /^[a-f0-9]{64}$/;

async function loadSession(touch: boolean): Promise<OpsUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(OPS_COOKIE)?.value;
  if (!token || !TOKEN_RE.test(token)) return null;
  const tokenHash = hashToken(token);
  const requestHeaders = await headers();
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT a.id, a.email, a.name, r.level, s.user_agent,
        s.elevated_until, (s.elevated_until > now()) AS elevated,
        s.expires_at, s.last_seen_at + ${OPS_IDLE_SECONDS} * interval '1 second' AS idle_expires_at
      FROM ops_sessions s
      JOIN auth_accounts a ON a.id = s.account_id
      JOIN solution_reviewers r ON r.account_id = a.id
      WHERE s.token_hash = ${tokenHash}
        AND s.expires_at > now()
        AND s.last_seen_at > now() - ${OPS_IDLE_SECONDS} * interval '1 second'
        AND r.disabled_at IS NULL
        AND a.suspended_at IS NULL
      LIMIT 1
    `;
    if (!rows.length) return null;
    const row = rows[0];

    // A session is bound to the browser that created it. A stolen cookie replayed
    // from another client kills the session instead of opening the panel.
    const boundAgent = row.user_agent ? String(row.user_agent) : null;
    const currentAgent = readUserAgent(requestHeaders);
    if (boundAgent !== null && boundAgent !== currentAgent) {
      await sql`DELETE FROM ops_sessions WHERE token_hash = ${tokenHash}`;
      await audit({
        actorId: String(row.id),
        actorEmail: String(row.email),
        action: 'session_binding_mismatch',
        subjectType: 'session',
        subjectId: tokenHash.slice(0, 12),
        metadata: {
          expectedAgent: boundAgent.slice(0, 120),
          seenAgent: currentAgent?.slice(0, 120),
        },
        ip: clientIp(requestHeaders),
      });
      return null;
    }

    let idleExpiresAt = new Date(row.idle_expires_at as string).toISOString();
    if (touch) {
      // Throttled: at most one write per 30 s per session. Best-effort.
      const touched = await sql`
        UPDATE ops_sessions SET last_seen_at = now()
        WHERE token_hash = ${tokenHash} AND last_seen_at < now() - interval '30 seconds'
        RETURNING last_seen_at + ${OPS_IDLE_SECONDS} * interval '1 second' AS idle_expires_at
      `.catch(() => []);
      if (touched.length)
        idleExpiresAt = new Date(touched[0].idle_expires_at as string).toISOString();
    }

    return {
      id: String(row.id),
      email: String(row.email),
      name: row.name ? String(row.name) : null,
      level: row.level === 'admin' ? 'admin' : 'reviewer',
      sessionId: tokenHash,
      elevated: Boolean(row.elevated),
      elevatedUntil: row.elevated ? new Date(row.elevated_until as string).toISOString() : null,
      idleExpiresAt,
      expiresAt: new Date(row.expires_at as string).toISOString(),
    };
  } catch (err) {
    console.error('[ops/session]', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Validates the ops session cookie and counts the request as activity. Deduped per render. */
export const getOpsSession = cache(() => loadSession(true));

/** Reads the session without extending the inactivity window (status polling). */
export function peekOpsSession() {
  return loadSession(false);
}

function cookieOptions(name: string, maxAge: number) {
  return {
    name,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
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

/** Rate limiting on the shared auth_rate_limits table, namespaced under "ops:". */
export async function opsLimit(
  scope: string,
  identity: string,
  maximum = 8,
  globalMaximum = 60,
): Promise<boolean> {
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

/** Network identity for pre-authentication rate limits. */
export function requestIdentity(requestHeaders: Headers): string {
  return clientIp(requestHeaders) ?? 'unknown';
}

export type TotpOutcome = 'ok' | 'invalid' | 'replay' | 'not_enrolled';

/**
 * Verifies a TOTP code for an enrolled account and records its step in the same
 * conditional UPDATE, so two concurrent requests carrying one code cannot both
 * succeed (the second re-checks totp_last_step after the first commits).
 */
export async function consumeTotp(accountId: string, code: string): Promise<TotpOutcome> {
  if (!/^\d{6}$/.test(code)) return 'invalid';
  const sql = getDb();
  const rows = await sql`
    SELECT totp_secret, totp_last_step, totp_confirmed_at
    FROM solution_reviewers WHERE account_id = ${accountId} LIMIT 1
  `;
  if (!rows.length || !rows[0].totp_secret || !rows[0].totp_confirmed_at) return 'not_enrolled';
  const lastStep = rows[0].totp_last_step !== null ? BigInt(String(rows[0].totp_last_step)) : null;
  const secret = decryptSecret(String(rows[0].totp_secret));
  const step = verifyTotp(secret, code, lastStep);
  // A code that is valid for an already-consumed step is a replay, not a typo.
  if (step === null) return verifyTotp(secret, code, null) !== null ? 'replay' : 'invalid';
  const updated = await sql`
    UPDATE solution_reviewers SET totp_last_step = ${step.toString()}
    WHERE account_id = ${accountId}
      AND (totp_last_step IS NULL OR totp_last_step < ${step.toString()})
    RETURNING account_id
  `;
  return updated.length ? 'ok' : 'replay';
}

export { audit } from './audit';
export { sameOrigin, isUuid, failure, opsBody } from './http';

// --- Guards -----------------------------------------------------------

/** Server Component guard: redirects visitors without a live session to /login. */
export async function requireOps(): Promise<OpsUser> {
  const user = await getOpsSession();
  if (!user) redirect('/login?reason=expired');
  return user;
}

/** Server Component guard for admin-only pages: reviewers get a plain 404. */
export async function requireAdminPage(): Promise<OpsUser> {
  const user = await requireOps();
  if (user.level !== 'admin') notFound();
  return user;
}

/** Route Handler guard: returns a 401 Response instead of redirecting. */
export async function requireOpsApi(): Promise<OpsUser | Response> {
  const user = await getOpsSession();
  if (!user) return failure('No autenticado.', 401);
  return user;
}
