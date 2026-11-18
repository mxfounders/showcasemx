import { getDb } from '../db';
import { localToday } from '../north';

export const CHANNEL_RANGES = ['7', '30', '90'] as const;
export type ChannelRange = (typeof CHANNEL_RANGES)[number];

export interface ChannelRow {
  channel: string;
  visits: number;
  browse: number;
  listing: number;
  apply: number;
  signups: number;
  founderSignups: number;
}
export interface SourceRow {
  channel: string;
  source: string;
  medium: string;
  campaign: string;
  visits: number;
  signups: number;
}
export interface SiteRow {
  site: string;
  visits: number;
  listing: number;
}

const num = (value: unknown) => Number(value ?? 0);

/**
 * Where visits and sign-ups come from (SHCWS-111), from the product's aggregate table
 * traffic_daily and each account's origin (account_signup_origins). Visits are counted
 * once per browser tab and visit, not per person; nothing here says who. A database
 * without db/traffic-attribution.sql shows an empty board.
 */
export async function channelReport(range: ChannelRange, now = new Date()) {
  const sql = getDb();
  const [table] = await sql`SELECT to_regclass('traffic_daily') IS NOT NULL AS ok`;
  if (!table?.ok) return { available: false as const };
  const today = localToday(now);
  const days = Number(range);
  const [byChannel, signups, sources, signupSources, badge, referrers, landings, since] =
    await sql.transaction(
      [
        sql`SELECT channel,
            COALESCE(sum(sessions) FILTER (WHERE step = 'visit'), 0)::int AS visits,
            COALESCE(sum(sessions) FILTER (WHERE step = 'browse'), 0)::int AS browse,
            COALESCE(sum(sessions) FILTER (WHERE step = 'listing'), 0)::int AS listing,
            COALESCE(sum(sessions) FILTER (WHERE step = 'apply'), 0)::int AS apply
          FROM traffic_daily WHERE day > ${today}::date - ${days}::int
          GROUP BY channel`,
        sql`SELECT COALESCE(o.channel, 'unknown') AS channel, count(*)::int AS signups,
            count(*) FILTER (WHERE o.intent = 'founder')::int AS founder_signups
          FROM auth_accounts a LEFT JOIN account_signup_origins o ON o.account_id = a.id
          WHERE (a.created_at AT TIME ZONE 'America/Mexico_City')::date > ${today}::date - ${days}::int
          GROUP BY 1`,
        sql`SELECT channel, source, medium, campaign, sum(sessions)::int AS visits
          FROM traffic_daily WHERE step = 'visit' AND day > ${today}::date - ${days}::int
          GROUP BY 1, 2, 3, 4 ORDER BY visits DESC, channel, source LIMIT 40`,
        sql`SELECT o.channel, o.source, o.medium, o.campaign, count(*)::int AS signups
          FROM account_signup_origins o JOIN auth_accounts a ON a.id = o.account_id
          WHERE (a.created_at AT TIME ZONE 'America/Mexico_City')::date > ${today}::date - ${days}::int
          GROUP BY 1, 2, 3, 4`,
        // ref=badge: which sites show a badge that people click (the referrer's host only).
        sql`SELECT site,
            COALESCE(sum(sessions) FILTER (WHERE step = 'visit'), 0)::int AS visits,
            COALESCE(sum(sessions) FILTER (WHERE step = 'listing'), 0)::int AS listing
          FROM traffic_daily WHERE channel = 'badge' AND day > ${today}::date - ${days}::int
          GROUP BY site ORDER BY visits DESC, site LIMIT 30`,
        sql`SELECT site,
            COALESCE(sum(sessions) FILTER (WHERE step = 'visit'), 0)::int AS visits,
            COALESCE(sum(sessions) FILTER (WHERE step = 'listing'), 0)::int AS listing
          FROM traffic_daily WHERE channel = 'referral' AND site <> '' AND day > ${today}::date - ${days}::int
          GROUP BY site ORDER BY visits DESC, site LIMIT 30`,
        sql`SELECT channel, landing, sum(sessions)::int AS visits
          FROM traffic_daily WHERE step = 'visit' AND channel IN ('organic', 'ai')
            AND day > ${today}::date - ${days}::int
          GROUP BY 1, 2 ORDER BY visits DESC`,
        sql`SELECT min(day)::text AS first FROM traffic_daily`,
      ],
      { readOnly: true },
    );

  const channels = new Map<string, ChannelRow>();
  const row = (channel: string) => {
    const existing = channels.get(channel);
    if (existing) return existing;
    const fresh: ChannelRow = {
      channel,
      visits: 0,
      browse: 0,
      listing: 0,
      apply: 0,
      signups: 0,
      founderSignups: 0,
    };
    channels.set(channel, fresh);
    return fresh;
  };
  for (const item of byChannel) {
    const target = row(String(item.channel));
    target.visits = num(item.visits);
    target.browse = num(item.browse);
    target.listing = num(item.listing);
    target.apply = num(item.apply);
  }
  for (const item of signups) {
    const target = row(String(item.channel));
    target.signups = num(item.signups);
    target.founderSignups = num(item.founder_signups);
  }

  const key = (r: Record<string, unknown>) =>
    [r.channel, r.source, r.medium, r.campaign].map(String).join('|');
  const signupBySource = new Map(signupSources.map(r => [key(r), num(r.signups)]));
  const sourceRows: SourceRow[] = sources.map(r => ({
    channel: String(r.channel),
    source: String(r.source),
    medium: String(r.medium),
    campaign: String(r.campaign),
    visits: num(r.visits),
    signups: signupBySource.get(key(r)) ?? 0,
  }));
  // Sign-ups from a source with no counted visit in the range still show (DNT browsers
  // are not counted as visits, and a visit can start before the range).
  const seen = new Set(sources.map(key));
  for (const r of signupSources)
    if (!seen.has(key(r)))
      sourceRows.push({
        channel: String(r.channel),
        source: String(r.source),
        medium: String(r.medium),
        campaign: String(r.campaign),
        visits: 0,
        signups: num(r.signups),
      });

  const sites = (list: Record<string, unknown>[]): SiteRow[] =>
    list.map(r => ({ site: String(r.site), visits: num(r.visits), listing: num(r.listing) }));
  return {
    available: true as const,
    since: since[0]?.first ? String(since[0].first) : null,
    channels: [...channels.values()].sort((a, b) => b.visits - a.visits || b.signups - a.signups),
    sources: sourceRows,
    badge: sites(badge),
    referrers: sites(referrers),
    landings: landings.map(r => ({
      channel: String(r.channel),
      landing: String(r.landing),
      visits: num(r.visits),
    })),
  };
}

export type ChannelReport = Awaited<ReturnType<typeof channelReport>>;
