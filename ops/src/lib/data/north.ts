import { getDb } from '../db';
import { periods, type Periods } from '../north';

const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value));
const seconds = (value: unknown) =>
  value === null || value === undefined ? null : Math.round(Number(value));

/**
 * The north-star metrics of docs/strategy.md plus the business ones (SHCWS-110), from
 * the database only. Month to date against the same stretch of last month; «founders
 * who come back» uses four-week windows. Reads metadata only: never a message, a note
 * or what a buyer saved (CLAUDE.md §44).
 */
export async function northStar(now: Date = new Date()) {
  const p = periods(now);
  const sql = getDb();
  const at = (d: Date) => d.toISOString();
  const [contacts, briefs, reviews, founders, listings] = await sql.transaction(
    [
      // 1 + 3. A request counts as answered at the first event its recipient wrote.
      sql`
        WITH first_reply AS (
          SELECT r.created_at, min(e.created_at) AS replied_at
          FROM contact_requests r
          LEFT JOIN contact_events e ON e.request_id = r.id AND e.actor_id = r.recipient_id
          GROUP BY r.id, r.created_at
        )
        SELECT
          count(*) FILTER (WHERE replied_at >= ${at(p.curStart)} AND replied_at < ${at(p.now)}) AS answered_cur,
          count(*) FILTER (WHERE replied_at >= ${at(p.prevStart)} AND replied_at < ${at(p.prevEnd)}) AS answered_prev,
          count(*) FILTER (WHERE created_at >= ${at(p.curStart)} AND created_at < ${at(p.now)}) AS received_cur,
          count(*) FILTER (WHERE created_at >= ${at(p.prevStart)} AND created_at < ${at(p.prevEnd)}) AS received_prev,
          count(*) FILTER (WHERE created_at >= ${at(p.curStart)} AND created_at < ${at(p.now)} AND replied_at IS NOT NULL) AS received_answered_cur,
          count(*) FILTER (WHERE created_at >= ${at(p.prevStart)} AND created_at < ${at(p.prevEnd)} AND replied_at IS NOT NULL) AS received_answered_prev,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM replied_at - created_at))
            FILTER (WHERE created_at >= ${at(p.curStart)} AND created_at < ${at(p.now)} AND replied_at IS NOT NULL) AS median_cur,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM replied_at - created_at))
            FILTER (WHERE created_at >= ${at(p.prevStart)} AND created_at < ${at(p.prevEnd)} AND replied_at IS NOT NULL) AS median_prev
        FROM first_reply
      `,
      // 1. Briefs: «Cuéntanos qué necesitas» lands in contact_inquiries with reason 'find'.
      sql`
        SELECT
          count(*) FILTER (WHERE handled_at >= ${at(p.curStart)} AND handled_at < ${at(p.now)}) AS handled_cur,
          count(*) FILTER (WHERE handled_at >= ${at(p.prevStart)} AND handled_at < ${at(p.prevEnd)}) AS handled_prev,
          count(*) FILTER (WHERE created_at >= ${at(p.curStart)} AND created_at < ${at(p.now)}) AS received_cur,
          count(*) FILTER (WHERE created_at >= ${at(p.prevStart)} AND created_at < ${at(p.prevEnd)}) AS received_prev
        FROM contact_inquiries WHERE reason = 'find'
      `,
      // 2. Published listings with three or more public reviews (verified author, not
      // the owner). «Then» rebuilds the start of the month from creation and
      // verification dates; withdrawals and hides since then are not known.
      sql`
        SELECT
          count(*) FILTER (WHERE now_reviews >= 3) AS listings_now,
          count(*) FILTER (WHERE then_reviews >= 3 AND published_then) AS listings_then
        FROM (
          SELECT s.published_at < ${at(p.curStart)} AS published_then,
            count(r.id) AS now_reviews,
            count(r.id) FILTER (WHERE r.created_at < ${at(p.curStart)} AND a.email_verified_at < ${at(p.curStart)}) AS then_reviews
          FROM founder_solutions s
          LEFT JOIN solution_reviews r ON r.solution_id = s.id AND r.status = 'published' AND r.author_id <> s.owner_id
          LEFT JOIN auth_accounts a ON a.id = r.author_id AND a.email_verified_at IS NOT NULL
          WHERE s.published_data IS NOT NULL AND (r.id IS NULL OR a.id IS NOT NULL)
          GROUP BY s.id
        ) x
      `,
      // 4. Founders (accounts that own a listing) with dated signals of use: sign-ins,
      // a session's latest use, events they wrote (answers, submissions) and notices
      // they read. Weeks are counted back from now.
      sql`
        WITH founders AS (SELECT DISTINCT owner_id AS id FROM founder_solutions),
        signals AS (
          SELECT account_id AS id, created_at AS at FROM auth_sessions
          UNION ALL SELECT account_id, last_seen_at FROM auth_sessions WHERE last_seen_at IS NOT NULL
          UNION ALL SELECT actor_id, created_at FROM solution_events WHERE actor_id IS NOT NULL
          UNION ALL SELECT actor_id, created_at FROM contact_events
          UNION ALL SELECT recipient_id, recipient_read_at FROM contact_requests WHERE recipient_read_at IS NOT NULL
          UNION ALL SELECT owner_id, read_at FROM account_notifications WHERE read_at IS NOT NULL
        ),
        weeks AS (
          SELECT s.id, floor(extract(epoch FROM (${at(p.now)}::timestamptz - s.at)) / 604800)::int AS wk
          FROM signals s JOIN founders f ON f.id = s.id
          WHERE s.at > ${at(p.prevWeeksStart)} AND s.at <= ${at(p.now)}
        ),
        per_founder AS (
          SELECT id, count(DISTINCT wk) FILTER (WHERE wk < 4) AS cur_weeks,
            count(DISTINCT wk) FILTER (WHERE wk >= 4) AS prev_weeks
          FROM weeks GROUP BY id
        )
        SELECT
          (SELECT count(*) FROM founders) AS founders,
          count(*) FILTER (WHERE cur_weeks >= 2) AS returning_cur,
          count(*) FILTER (WHERE prev_weeks >= 2) AS returning_prev,
          count(*) FILTER (WHERE cur_weeks = 4) AS every_week_cur,
          count(*) FILTER (WHERE cur_weeks >= 1) AS active_cur
        FROM per_founder
      `,
      // 6. Listings: published now and at the start of the month, the review queue, and
      // how long a decision took (submission → publish, changes or rejection).
      sql`
        WITH decisions AS (
          SELECT d.created_at AS decided_at,
            (SELECT max(s.created_at) FROM solution_events s
              WHERE s.solution_id = d.solution_id AND s.status = 'pending' AND s.created_at <= d.created_at) AS submitted_at
          FROM solution_events d
          WHERE d.status IN ('published', 'changes_requested', 'rejected')
            AND d.created_at >= ${at(p.prevStart)} AND d.created_at < ${at(p.now)}
        )
        SELECT
          (SELECT count(*) FROM founder_solutions WHERE published_data IS NOT NULL) AS published_now,
          (SELECT count(*) FROM founder_solutions WHERE published_data IS NOT NULL AND published_at < ${at(p.curStart)}) AS published_then,
          (SELECT count(*) FROM founder_solutions WHERE status = 'pending') AS pending_now,
          (SELECT count(*) FROM solution_events WHERE status = 'pending'
            AND created_at >= ${at(p.curStart)} AND created_at < ${at(p.now)}) AS submitted_cur,
          (SELECT count(*) FROM solution_events WHERE status = 'pending'
            AND created_at >= ${at(p.prevStart)} AND created_at < ${at(p.prevEnd)}) AS submitted_prev,
          (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM decided_at - submitted_at))
            FROM decisions WHERE submitted_at IS NOT NULL AND decided_at >= ${at(p.curStart)}) AS review_cur,
          (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM decided_at - submitted_at))
            FROM decisions WHERE submitted_at IS NOT NULL AND decided_at < ${at(p.prevEnd)}) AS review_prev,
          (SELECT count(*) FROM decisions WHERE decided_at >= ${at(p.curStart)}) AS decided_cur
      `,
    ],
    { readOnly: true },
  );
  const c = contacts[0] ?? {};
  const b = briefs[0] ?? {};
  const r = reviews[0] ?? {};
  const f = founders[0] ?? {};
  const l = listings[0] ?? {};
  return {
    periods: p,
    contacts: {
      answeredCur: num(c.answered_cur),
      answeredPrev: num(c.answered_prev),
      receivedCur: num(c.received_cur),
      receivedPrev: num(c.received_prev),
      receivedAnsweredCur: num(c.received_answered_cur),
      receivedAnsweredPrev: num(c.received_answered_prev),
      medianCur: seconds(c.median_cur),
      medianPrev: seconds(c.median_prev),
    },
    briefs: {
      handledCur: num(b.handled_cur),
      handledPrev: num(b.handled_prev),
      receivedCur: num(b.received_cur),
      receivedPrev: num(b.received_prev),
    },
    reviews: { listingsNow: num(r.listings_now), listingsThen: num(r.listings_then) },
    founders: {
      founders: num(f.founders),
      returningCur: num(f.returning_cur),
      returningPrev: num(f.returning_prev),
      everyWeekCur: num(f.every_week_cur),
      activeCur: num(f.active_cur),
    },
    listings: {
      publishedNow: num(l.published_now),
      publishedThen: num(l.published_then),
      pendingNow: num(l.pending_now),
      submittedCur: num(l.submitted_cur),
      submittedPrev: num(l.submitted_prev),
      reviewCur: seconds(l.review_cur),
      reviewPrev: seconds(l.review_prev),
      decidedCur: num(l.decided_cur),
    },
    ads: await adsNorth(p),
  };
}

/** 7. Ads, per currency. Null when db/ad-campaigns.sql is not applied here. */
async function adsNorth(p: Periods) {
  const sql = getDb();
  const at = (d: Date) => d.toISOString();
  try {
    const rows = await sql`
      SELECT currency,
        COALESCE(sum(total_amount - refunded_amount) FILTER (WHERE paid_at >= ${at(p.curStart)} AND paid_at < ${at(p.now)}), 0) AS net_cur,
        COALESCE(sum(total_amount - refunded_amount) FILTER (WHERE paid_at >= ${at(p.prevStart)} AND paid_at < ${at(p.prevEnd)}), 0) AS net_prev,
        COALESCE(sum(total_amount) FILTER (WHERE paid_at >= ${at(p.curStart)} AND paid_at < ${at(p.now)}), 0) AS gross_cur,
        count(*) FILTER (WHERE starts_on > ${p.today}::date
          AND (pause_reason IS NULL OR pause_reason NOT IN ('platformRemoval', 'policyRemoval'))
          AND coalesce(served_until, ends_on) > starts_on) AS future_now,
        COALESCE(sum(total_amount - refund_requested_amount) FILTER (WHERE starts_on > ${p.today}::date
          AND (pause_reason IS NULL OR pause_reason NOT IN ('platformRemoval', 'policyRemoval'))
          AND coalesce(served_until, ends_on) > starts_on), 0) AS future_amount_now,
        count(*) FILTER (WHERE paid_at < ${at(p.prevEnd)} AND starts_on > ${p.prevToday}::date) AS future_then
      FROM ad_campaigns
      WHERE status = 'paid' AND total_amount IS NOT NULL
      GROUP BY currency ORDER BY currency
    `;
    return rows.map(row => ({
      currency: String(row.currency),
      netCur: num(row.net_cur),
      netPrev: num(row.net_prev),
      grossCur: num(row.gross_cur),
      futureNow: num(row.future_now),
      futureAmountNow: num(row.future_amount_now),
      futureThen: num(row.future_then),
    }));
  } catch (err) {
    if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '42P01')
      return null;
    throw err;
  }
}

export type NorthStar = Awaited<ReturnType<typeof northStar>>;
