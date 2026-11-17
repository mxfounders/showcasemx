import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { authSql } from '@/lib/auth/security';
import { hashToken } from '@/lib/auth/password';
import { isSolutionId } from '@/lib/solutions/model';

/**
 * Personal tokens for the founder's AI assistant (SHCWS-152, docs/assistant-mcp.md).
 *
 * A token is shown once, when it is created; only its SHA-256 is stored, like a session.
 * It names what it may touch (`scope`, only the owner's listings for now), expires, can be
 * revoked at once, and dies when the account's password changes (`password_stamp`), the
 * same rule that closes every session. A suspended account's tokens stop working too.
 */
export const TOKEN_PREFIX = 'shwcs_mcp_';
export const TOKEN_SCOPES = ['solutions'] as const;
export type TokenScope = (typeof TOKEN_SCOPES)[number];
/** Days a new token may live; the owner picks one. */
export const TOKEN_LIFETIMES = [7, 30, 90, 365] as const;
export const DEFAULT_TOKEN_LIFETIME = 90;
/** Live tokens one account may hold at once. */
export const MAX_ACTIVE_TOKENS = 10;
export const TOKEN_NAME_LIMIT = 60;

const tokenPattern = /^shwcs_mcp_[A-Za-z0-9_-]{43}$/;

/** A fresh secret: the prefix plus 32 random bytes in base64url. */
export function generateToken() {
  const secret = randomBytes(32).toString('base64url');
  return { token: `${TOKEN_PREFIX}${secret}`, hint: secret.slice(0, 4) };
}

export function isTokenFormat(value: string) {
  return tokenPattern.test(value);
}

/** The token in an `Authorization: Bearer …` header, or null. Never read from a query. */
export function readBearer(header: string | null): string | null {
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header ?? '');
  return match && isTokenFormat(match[1]) ? match[1] : null;
}

/** Ties a token to the password it was created under. */
export function passwordStamp(passwordHash: string) {
  return hashToken(passwordHash);
}

function sameStamp(stored: string, passwordHash: string) {
  const a = Buffer.from(stored, 'hex'),
    b = Buffer.from(passwordStamp(passwordHash), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function readTokenName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= TOKEN_NAME_LIMIT ? name : null;
}

export function readLifetime(value: unknown): number | null {
  const days = Number(value);
  return TOKEN_LIFETIMES.some(item => item === days) ? days : null;
}

export type AssistantIdentity = {
  tokenId: string;
  accountId: string;
  email: string;
  scope: TokenScope;
  locale: 'es' | 'en';
};

/**
 * The account a bearer token acts for, or null when the token is unknown, revoked,
 * expired, belongs to a suspended account or predates a password change. One indexed
 * lookup by hash, checked on every request: revoking takes effect on the next call.
 */
export async function authenticateToken(token: string): Promise<AssistantIdentity | null> {
  if (!isTokenFormat(token)) return null;
  const sql = authSql();
  const [row] = await sql`SELECT t.id::text AS token_id, t.scope, t.locale, t.password_stamp,
      a.id::text AS account_id, a.email, a.password_hash
    FROM assistant_tokens t JOIN auth_accounts a ON a.id = t.account_id
    WHERE t.token_hash = ${hashToken(token)} AND t.revoked_at IS NULL AND t.expires_at > now()
      AND a.suspended_at IS NULL
    LIMIT 1`;
  if (!row || !sameStamp(String(row.password_stamp), String(row.password_hash))) return null;
  return {
    tokenId: String(row.token_id),
    accountId: String(row.account_id),
    email: String(row.email),
    scope: row.scope as TokenScope,
    locale: row.locale === 'en' ? 'en' : 'es',
  };
}

/** At most once a minute, so a busy assistant does not write on every call. */
export async function touchToken(tokenId: string) {
  await authSql()`UPDATE assistant_tokens SET last_used_at = now()
    WHERE id = ${tokenId} AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`;
}

/**
 * Creates a token for `accountId` under the password hash the caller just verified.
 * Returns the secret, which is never stored, or 'limit' when the account already holds
 * MAX_ACTIVE_TOKENS live ones, or 'changed' when the password changed meanwhile.
 */
export async function createToken(options: {
  accountId: string;
  passwordHash: string;
  name: string;
  days: number;
  locale: 'es' | 'en';
}): Promise<{ id: string; token: string } | 'limit' | 'changed'> {
  const sql = authSql();
  const { token, hint } = generateToken();
  const id = randomUUID();
  // The account row is locked so two creations at once cannot both pass the count.
  const result = await sql.transaction([
    sql`SELECT id FROM auth_accounts WHERE id = ${options.accountId} FOR UPDATE`,
    sql`INSERT INTO assistant_tokens (id, account_id, name, token_hash, token_hint, scope, locale, password_stamp, expires_at)
      SELECT ${id}, a.id, ${options.name}, ${hashToken(token)}, ${hint}, 'solutions', ${options.locale},
        ${passwordStamp(options.passwordHash)}, now() + make_interval(days => ${options.days})
      FROM auth_accounts a
      WHERE a.id = ${options.accountId} AND a.password_hash = ${options.passwordHash}
        AND (SELECT count(*) FROM assistant_tokens t WHERE t.account_id = a.id AND t.revoked_at IS NULL
               AND t.expires_at > now() AND t.password_stamp = ${passwordStamp(options.passwordHash)}) < ${MAX_ACTIVE_TOKENS}
      RETURNING id::text`,
    sql`SELECT password_hash FROM auth_accounts WHERE id = ${options.accountId}`,
  ]);
  if (result[1].length) return { id: String(result[1][0].id), token };
  return String(result[2][0]?.password_hash) === options.passwordHash ? 'limit' : 'changed';
}

/** Revokes one of the owner's tokens. False when it is not theirs or already revoked. */
export async function revokeToken(accountId: string, tokenId: string) {
  const rows = await authSql()`UPDATE assistant_tokens SET revoked_at = now()
    WHERE id = ${tokenId} AND account_id = ${accountId} AND revoked_at IS NULL RETURNING id`;
  return rows.length > 0;
}

export type TokenStatus = 'active' | 'revoked' | 'expired' | 'passwordChanged';
export type TokenSummary = {
  id: string;
  name: string;
  hint: string;
  scope: TokenScope;
  status: TokenStatus;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};
export type TokenEvent = {
  id: string;
  tokenName: string;
  tool: string;
  outcome: 'ok' | 'error';
  code: string | null;
  /** Null when the call touched no listing, '' for a draft still without a name. */
  solutionName: string | null;
  createdAt: string;
};

/** The owner's tokens (newest first) and the latest 40 things they did. Never a hash. */
export async function listTokens(accountId: string) {
  const sql = authSql();
  const [tokens, events, account] = await Promise.all([
    sql`SELECT id::text, name, token_hint, scope, password_stamp, created_at::text, expires_at::text,
        last_used_at::text, revoked_at::text, expires_at <= now() AS expired
      FROM assistant_tokens WHERE account_id = ${accountId} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT e.id::text, t.name AS token_name, e.tool, e.outcome, e.code, s.id IS NOT NULL AS has_solution, s.data->>'name' AS solution_name,
        e.created_at::text
      FROM assistant_token_events e JOIN assistant_tokens t ON t.id = e.token_id
      LEFT JOIN founder_solutions s ON s.id = e.solution_id AND s.owner_id = e.account_id
      WHERE e.account_id = ${accountId} ORDER BY e.created_at DESC, e.id DESC LIMIT 40`,
    sql`SELECT password_hash FROM auth_accounts WHERE id = ${accountId}`,
  ]);
  const passwordHash = String(account[0]?.password_hash ?? '');
  return {
    tokens: tokens.map((row): TokenSummary => ({
      id: String(row.id),
      name: String(row.name),
      hint: String(row.token_hint),
      scope: row.scope as TokenScope,
      status: row.revoked_at
        ? 'revoked'
        : row.expired
          ? 'expired'
          : !sameStamp(String(row.password_stamp), passwordHash)
            ? 'passwordChanged'
            : 'active',
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
      lastUsedAt: row.last_used_at ? String(row.last_used_at) : null,
      revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    })),
    events: events.map((row): TokenEvent => ({
      id: String(row.id),
      tokenName: String(row.token_name),
      tool: String(row.tool),
      outcome: row.outcome === 'ok' ? 'ok' : 'error',
      code: row.code ? String(row.code) : null,
      solutionName: row.has_solution ? String(row.solution_name ?? '') : null,
      createdAt: String(row.created_at),
    })),
  };
}

/**
 * One line of the token's log: which tool, on which of the owner's listings, and how it
 * ended. Never the arguments or the listing's text. Drops that token's lines older than
 * 180 days in the same statement.
 */
export async function logTokenEvent(
  identity: Pick<AssistantIdentity, 'tokenId' | 'accountId'>,
  event: { tool: string; solutionId?: string | null; outcome: 'ok' | 'error'; code?: string },
) {
  const sql = authSql();
  const code = event.code && /^[A-Za-z]{1,40}$/.test(event.code) ? event.code : null;
  const solutionId = event.solutionId && isSolutionId(event.solutionId) ? event.solutionId : null;
  await sql`WITH old AS (
      DELETE FROM assistant_token_events WHERE token_id = ${identity.tokenId} AND created_at < now() - interval '180 days'
    )
    INSERT INTO assistant_token_events (token_id, account_id, tool, solution_id, outcome, code)
    SELECT ${identity.tokenId}, ${identity.accountId}, ${event.tool},
      (SELECT id FROM founder_solutions WHERE id = ${solutionId}::uuid AND owner_id = ${identity.accountId}),
      ${event.outcome}, ${code}`;
}
