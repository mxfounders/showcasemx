import { getDb } from '../db';
import { localToday } from '../north';
import {
  BUYER_STEPS,
  FOUNDER_STEPS,
  countAccount,
  emptyCounts,
  recentWeeks,
  type BuyerKey,
  type ChannelKey,
  type CohortAccount,
  type FounderKey,
} from '../funnels';

export interface FunnelWeek {
  week: string;
  buyer: Record<BuyerKey, number>;
  founder: Record<FounderKey, number>;
}

const tableExists = async (name: string) => {
  const [row] = await getDb()`SELECT to_regclass(${name}) IS NOT NULL AS ok`;
  return Boolean(row?.ok);
};

/**
 * The buyer and founder funnels (SHCWS-109), per week in Mexico City and optionally for
 * one channel (SHCWS-111). Visit steps are the product's daily aggregates (traffic_daily:
 * visits, never people); account steps follow the accounts created that week and how far
 * each has got so far. Reads metadata only — whether an account saved, wrote or was
 * answered, never what (CLAUDE.md §44).
 */
export async function funnels(channel: ChannelKey | null, weeks = 8, now = new Date()) {
  const sql = getDb();
  const list = recentWeeks(localToday(now), weeks);
  const start = list[0];
  if (!(await tableExists('traffic_daily')))
    return { available: false as const, weeks: list, rows: [] as FunnelWeek[] };
  const hasBriefs = await tableExists('buyer_briefs');
  const only = channel ?? null;

  const [visits, cohort] = await sql.transaction(
    [
      sql`SELECT to_char(date_trunc('week', day), 'YYYY-MM-DD') AS week, step, sum(sessions)::int AS n
        FROM traffic_daily
        WHERE day >= ${start}::date AND (${only}::text IS NULL OR channel = ${only})
        GROUP BY 1, 2`,
      // One row per account created in the window, with how far it has got. «Answered»
      // means the recipient wrote at least one event on one of its requests.
      sql`
        WITH cohort AS (
          SELECT a.id, a.email, a.name, a.profile,
            to_char(date_trunc('week', a.created_at AT TIME ZONE 'America/Mexico_City'), 'YYYY-MM-DD') AS week,
            COALESCE(o.channel, 'unknown') AS channel, COALESCE(o.intent, '') AS intent
          FROM auth_accounts a
          LEFT JOIN account_signup_origins o ON o.account_id = a.id
          WHERE (a.created_at AT TIME ZONE 'America/Mexico_City')::date >= ${start}::date
            AND (${only}::text IS NULL OR COALESCE(o.channel, 'unknown') = ${only})
        )
        SELECT c.id, c.week, c.channel, c.intent, c.profile,
          (c.name IS NOT NULL AND c.profile IS NOT NULL) AS onboarded,
          EXISTS (SELECT 1 FROM buyer_saved_projects p WHERE p.owner_id = c.id) AS saved,
          EXISTS (SELECT 1 FROM contact_requests r WHERE r.buyer_id = c.id) AS requested,
          EXISTS (SELECT 1 FROM contact_requests r JOIN contact_events e
            ON e.request_id = r.id AND e.actor_id = r.recipient_id WHERE r.buyer_id = c.id) AS answered,
          EXISTS (SELECT 1 FROM founder_solutions s WHERE s.owner_id = c.id) AS drafted,
          EXISTS (SELECT 1 FROM founder_solutions s WHERE s.owner_id = c.id
            AND (s.status <> 'draft' OR s.published_at IS NOT NULL
              OR EXISTS (SELECT 1 FROM solution_events v WHERE v.solution_id = s.id AND v.status = 'pending'))) AS submitted,
          EXISTS (SELECT 1 FROM founder_solutions s WHERE s.owner_id = c.id AND s.published_at IS NOT NULL) AS published,
          EXISTS (SELECT 1 FROM contact_requests r WHERE r.recipient_id = c.id) AS first_request,
          EXISTS (SELECT 1 FROM contact_requests r JOIN contact_events e
            ON e.request_id = r.id AND e.actor_id = r.recipient_id WHERE r.recipient_id = c.id) AS first_reply,
          -- «Cuéntanos qué necesitas» (/contacto, reason 'find') from the same address.
          EXISTS (SELECT 1 FROM contact_inquiries i WHERE i.reason = 'find' AND lower(i.email) = lower(c.email)) AS inquired,
          EXISTS (SELECT 1 FROM contact_inquiries i WHERE i.reason = 'find' AND lower(i.email) = lower(c.email)
            AND i.handled_at IS NOT NULL) AS inquiry_handled
        FROM cohort c
      `,
    ],
    { readOnly: true },
  );

  // Briefs (SHCWS-58/60, db/buyer-briefs.sql) count as a request, and a proposal or a short
  // list from ops as an answer, once that migration exists here.
  const briefs = new Map<string, boolean>();
  const ids = cohort.map(row => String(row.id));
  if (hasBriefs && ids.length) {
    // The proposals and short lists tables come in the same migration as buyer_briefs.
    const rows = await sql`SELECT b.buyer_id::text AS id,
        bool_or(EXISTS (SELECT 1 FROM buyer_brief_proposals p WHERE p.brief_id = b.id)
          OR EXISTS (SELECT 1 FROM buyer_brief_shortlists l WHERE l.brief_id = b.id)) AS answered
      FROM buyer_briefs b WHERE b.buyer_id = ANY(${ids}::uuid[]) GROUP BY b.buyer_id`.catch(
      () => [] as Record<string, unknown>[],
    );
    for (const row of rows) briefs.set(String(row.id), Boolean(row.answered));
  }

  const rows: FunnelWeek[] = list.map(week => ({
    week,
    buyer: emptyCounts(BUYER_STEPS),
    founder: emptyCounts(FOUNDER_STEPS),
  }));
  const byWeek = new Map(rows.map(row => [row.week, row]));
  for (const row of visits) {
    const target = byWeek.get(String(row.week));
    if (!target) continue;
    const n = Number(row.n);
    if (row.step === 'visit') target.buyer.visit += n;
    else if (row.step === 'browse') target.buyer.browse += n;
    else if (row.step === 'listing') target.buyer.listing += n;
    else if (row.step === 'apply') target.founder.apply += n;
  }
  for (const row of cohort) {
    const target = byWeek.get(String(row.week));
    if (!target) continue;
    const id = String(row.id);
    const account: CohortAccount = {
      week: String(row.week),
      channel: String(row.channel),
      intent: String(row.intent),
      profile: row.profile === null ? null : String(row.profile),
      onboarded: Boolean(row.onboarded),
      saved: Boolean(row.saved),
      requested: Boolean(row.requested) || Boolean(row.inquired) || briefs.has(id),
      answered: Boolean(row.answered) || Boolean(row.inquiry_handled) || briefs.get(id) === true,
      drafted: Boolean(row.drafted),
      submitted: Boolean(row.submitted),
      published: Boolean(row.published),
      firstRequest: Boolean(row.first_request),
      firstReply: Boolean(row.first_reply),
    };
    countAccount(account, target.buyer, target.founder);
  }
  return { available: true as const, weeks: list, rows, briefs: hasBriefs };
}

export type Funnels = Awaited<ReturnType<typeof funnels>>;
