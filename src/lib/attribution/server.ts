import { authSql } from '@/lib/auth/security';
import {
  classifyTouch,
  likelyBot,
  readFunnel,
  readSignupOrigin,
  type Touch,
} from '@/lib/attribution/classify';

type Sql = ReturnType<typeof authSql>;

/** DNT or GPC on the request: nothing about the visit is counted or kept. */
export function optedOut(headers: Headers): boolean {
  return headers.get('dnt') === '1' || headers.get('sec-gpc') === '1';
}

/**
 * Adds one to each funnel step of a visit (SHCWS-109/111), per day in Mexico City and per
 * classified channel. Counters only: no account, address or visitor id. Callers have
 * already checked the origin and their own rate limit. Never throws: counting must not
 * break the request it rides on.
 */
export async function countFunnel(raw: unknown, headers: Headers, sql?: Sql) {
  if (optedOut(headers) || likelyBot(headers.get('user-agent'))) return false;
  const funnel = readFunnel(raw);
  if (!funnel) return false;
  const t = classifyTouch(funnel.touch);
  try {
    const db = sql ?? authSql();
    await db`INSERT INTO traffic_daily (day, step, channel, source, medium, campaign, site, landing, sessions)
      SELECT (now() AT TIME ZONE 'America/Mexico_City')::date, step, ${t.channel}, ${t.source}, ${t.medium},
        ${t.campaign}, ${t.site}, CASE WHEN step = 'visit' THEN ${t.landing} ELSE '' END, 1
      FROM unnest(${funnel.steps}::text[]) AS step
      ON CONFLICT (day, step, channel, source, medium, campaign, site, landing)
      DO UPDATE SET sessions = traffic_daily.sessions + 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Keeps where a new account's visit came from (its «origen de alta»), once. Nothing with
 * DNT/GPC or without data from the form. Best-effort: a failure never blocks a sign-up.
 */
export async function saveSignupOrigin(
  accountId: string,
  raw: unknown,
  headers: Headers,
  sql?: Sql,
) {
  if (optedOut(headers)) return false;
  const origin = readSignupOrigin(raw);
  if (!origin) return false;
  return insertOrigin(sql, accountId, origin);
}

/** The origin of an account created from an invitation link, known to the server. */
export async function saveInvitationOrigin(accountId: string, headers: Headers, sql?: Sql) {
  if (optedOut(headers)) return false;
  const touch = classifyTouch({ ref: 'invite', landing: 'review' });
  return insertOrigin(sql, accountId, { ...touch, intent: 'buyer' });
}

async function insertOrigin(
  sql: Sql | undefined,
  accountId: string,
  origin: Touch & { intent: 'founder' | 'buyer' | '' },
) {
  try {
    const db = sql ?? authSql();
    const rows = await db`INSERT INTO account_signup_origins
        (account_id, channel, source, medium, campaign, site, landing, intent)
      VALUES (${accountId}, ${origin.channel}, ${origin.source}, ${origin.medium}, ${origin.campaign},
        ${origin.site}, ${origin.landing}, ${origin.intent})
      ON CONFLICT (account_id) DO NOTHING RETURNING account_id`;
    return rows.length > 0;
  } catch {
    return false;
  }
}
