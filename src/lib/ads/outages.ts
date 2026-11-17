import type Stripe from 'stripe';
import { solutionsSql } from '@/lib/solutions/server';
import {
  addDays,
  adToday,
  dayRefundAmount,
  dayStart,
  makegoodPlan,
  undeliveredDays,
  type OutageCreditReason,
} from './model';
import { outageMaxAgeDays, type OutageReport } from './outage-report';
import { issueRefund } from './refund';

/*
 * Outage make-goods (SHCWS-179). A monitor outside Vercel reports each outage once the
 * site is back (src/app/api/internal/outages); the report is stored, then every booked day
 * the outages left unserved for four hours or more is settled without anyone asking:
 *
 *   - a make-good day: one more day in the same placement and scope, right after the
 *     booking (and any make-good day it already got), when that day still has room; it
 *     is its own free booking (makegood_of), so the paid days and their refunds stay as
 *     they were sold;
 *   - otherwise a refund of that day, with the same proportion and the same idempotency
 *     key as a cancellation or a withdrawal (refund:<booking>:<requested total>).
 *
 * Each booking and day is decided once (ad_outage_credits' primary key). The decision is
 * written before Stripe is called, so a refund Stripe did not confirm is reissued later
 * with the same key (retryOutageRefunds, from the daily cron) and never twice.
 */

/** Stores a report; a retried or widened report of the same incident updates its window. */
export async function recordOutage(report: OutageReport) {
  const [row] =
    await solutionsSql()`INSERT INTO site_outages (id, source, external_id, started_at, ended_at)
    VALUES (${crypto.randomUUID()}, ${report.source}, ${report.externalId},
      ${report.startedAt.toISOString()}::timestamptz, ${report.endedAt.toISOString()}::timestamptz)
    ON CONFLICT (source, external_id) DO UPDATE SET
      started_at = least(site_outages.started_at, EXCLUDED.started_at),
      ended_at = greatest(site_outages.ended_at, EXCLUDED.ended_at),
      received_at = now(),
      processed_at = CASE
        WHEN EXCLUDED.started_at < site_outages.started_at OR EXCLUDED.ended_at > site_outages.ended_at
        THEN NULL ELSE site_outages.processed_at END
    RETURNING id, processed_at`;
  return { id: String(row.id), pending: row.processed_at === null };
}

type Window = { id: string; start: Date; end: Date };

export type OutageRun = {
  windows: number;
  days: string[];
  makegoods: number;
  refunds: number;
  /** Refunds recorded that Stripe has not accepted yet (retried by the daily cron). */
  pendingRefunds: number;
  /** Bookings that changed while being credited; their windows stay pending. */
  retry: number;
};

/**
 * Settles every outage window not processed yet. Safe to run from the webhook and the
 * cron at the same time: windows are leased, and each booking and day is credited once.
 */
export async function processOutages(
  stripe: Stripe | null,
  now: Date = new Date(),
): Promise<OutageRun> {
  const sql = solutionsSql();
  const run: OutageRun = {
    windows: 0,
    days: [],
    makegoods: 0,
    refunds: 0,
    pendingRefunds: 0,
    retry: 0,
  };
  const claimed = await sql`UPDATE site_outages SET locked_until = now() + interval '5 minutes'
    WHERE id IN (SELECT id FROM site_outages
      WHERE processed_at IS NULL AND (locked_until IS NULL OR locked_until < now())
      ORDER BY received_at LIMIT 50 FOR UPDATE SKIP LOCKED)
    RETURNING id, started_at, ended_at`;
  if (!claimed.length) return run;
  run.windows = claimed.length;

  const today = adToday(now);
  const oldest = addDays(today, -outageMaxAgeDays);
  const touched = new Set<string>();
  for (const row of claimed) {
    const end = new Date(String(row.ended_at));
    for (let day = adToday(new Date(String(row.started_at))); dayStart(day) < end;) {
      touched.add(day);
      day = addDays(day, 1);
    }
  }
  const sortedTouched = [...touched].sort();
  const from = dayStart(sortedTouched[0]);
  const to = dayStart(addDays(sortedTouched[sortedTouched.length - 1], 1));

  // Every report overlapping those days, processed or not: a day's minutes add up across
  // reporters and across separate outages the same day.
  const rows = await sql`SELECT id, started_at, ended_at FROM site_outages
    WHERE started_at < ${to.toISOString()}::timestamptz AND ended_at > ${from.toISOString()}::timestamptz`;
  const windows: Window[] = rows.map(row => ({
    id: String(row.id),
    start: new Date(String(row.started_at)),
    end: new Date(String(row.ended_at)),
  }));

  let incomplete = false;
  for (const { day, minutes } of undeliveredDays(windows)) {
    if (!touched.has(day) || day < oldest) continue;
    run.days.push(day);
    const dayFrom = dayStart(day).getTime();
    const dayTo = dayStart(addDays(day, 1)).getTime();
    const outageIds = windows
      .filter(window => window.start.getTime() < dayTo && window.end.getTime() > dayFrom)
      .map(window => window.id);
    try {
      const result = await creditDay(stripe, day, Math.min(minutes, 1500), outageIds, today);
      run.makegoods += result.makegoods;
      run.refunds += result.refunds;
      run.pendingRefunds += result.pendingRefunds;
      run.retry += result.retry;
      if (result.retry) incomplete = true;
    } catch (error) {
      console.error('[ads/outages] crediting a day failed', day, error);
      incomplete = true;
    }
  }

  const ids = claimed.map(row => String(row.id));
  if (incomplete) {
    // Let the next run (the cron, or the next report) try the whole set again.
    await sql`UPDATE site_outages SET locked_until = NULL WHERE id = ANY(${ids}::uuid[])`;
  } else {
    await sql`UPDATE site_outages SET processed_at = now(), locked_until = NULL
      WHERE id = ANY(${ids}::uuid[])`;
  }
  return run;
}

type Booking = {
  id: string;
  version: number;
  placement: string;
  scope: string;
  solutionId: string | null;
  ownerId: string | null;
  name: string;
  startsOn: string;
  endsOn: string;
  servedUntil: string | null;
  canceledAt: string | null;
  totalAmount: number;
  refundRequested: number;
  paymentIntent: string | null;
  rootId: string;
  lastEnd: string;
  published: boolean;
};

/** Every page booking that was serving on `day` and has no decision for it yet. */
async function bookingsServing(day: string): Promise<Booking[]> {
  const nextDay = dayStart(addDays(day, 1)).toISOString();
  const rows = await solutionsSql()`SELECT c.id, c.version, c.placement, c.scope, c.solution_id,
      c.owner_id, c.solution_name, to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on,
      to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on, to_char(c.served_until, 'YYYY-MM-DD') AS served_until,
      c.canceled_at, c.total_amount, c.refund_requested_amount, c.stripe_payment_intent_id,
      coalesce(c.makegood_of, c.id) AS root_id,
      (SELECT to_char(max(x.ends_on), 'YYYY-MM-DD') FROM ad_campaigns x
        WHERE x.id = coalesce(c.makegood_of, c.id) OR x.makegood_of = coalesce(c.makegood_of, c.id)) AS last_end,
      s.published_data IS NOT NULL AS published
    FROM ad_campaigns c LEFT JOIN founder_solutions s ON s.id = c.solution_id
    WHERE c.status = 'paid' AND c.placement <> 'newsletter'
      AND c.starts_on <= ${day}::date AND ${day}::date < coalesce(c.served_until, c.ends_on)
      -- A dispute settles at Stripe, not here (the terms say so).
      AND (c.dispute_status IS NULL OR c.dispute_status = 'won')
      -- Paused before the day was over: it was not serving that day anyway.
      AND (c.paused_at IS NULL OR c.paused_at >= ${nextDay}::timestamptz)
      AND NOT EXISTS (SELECT 1 FROM ad_outage_credits k WHERE k.campaign_id = c.id AND k.day = ${day}::date)
    ORDER BY c.paid_at, c.id`;
  return rows.map(row => ({
    id: String(row.id),
    version: Number(row.version),
    placement: String(row.placement),
    scope: String(row.scope),
    solutionId: row.solution_id ? String(row.solution_id) : null,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    name: String(row.solution_name),
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    servedUntil: row.served_until ? String(row.served_until) : null,
    canceledAt: row.canceled_at ? String(row.canceled_at) : null,
    totalAmount: Number(row.total_amount ?? 0),
    refundRequested: Number(row.refund_requested_amount),
    paymentIntent: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
    rootId: String(row.root_id),
    lastEnd: String(row.last_end),
    published: Boolean(row.published),
  }));
}

async function creditDay(
  stripe: Stripe | null,
  day: string,
  minutes: number,
  outageIds: string[],
  today: string,
) {
  const result = { makegoods: 0, refunds: 0, pendingRefunds: 0, retry: 0 };
  for (const booking of await bookingsServing(day)) {
    const plan = makegoodPlan(booking, booking.published, today);
    if (plan.ok) {
      const added = await addMakegood(booking, day, plan.day, minutes, outageIds);
      if (added) {
        result.makegoods++;
        await notify(booking, day, minutes, { makegoodDay: plan.day });
        continue;
      }
    }
    const reason: OutageCreditReason = plan.ok ? 'noRoom' : plan.reason;
    const refund = await recordDayRefund(booking, day, minutes, reason, outageIds);
    if (!refund) {
      // The booking changed in between, or another run decided this day first.
      result.retry++;
      continue;
    }
    result.refunds++;
    await notify(booking, day, minutes, { refund: refund.amount });
    if (refund.amount > 0) {
      const issued = await issueDayRefund(stripe, {
        bookingId: booking.id,
        day,
        paymentIntent: booking.paymentIntent,
        amount: refund.amount,
        requestedTotal: refund.requestedTotal,
      });
      if (!issued) result.pendingRefunds++;
    }
  }
  return result;
}

/**
 * Adds the free make-good day under the same lock as a purchase in that placement and
 * scope, so the room check and the insert cannot race a buyer. Writes the decision in
 * the same statement. False when the day has no room or the booking moved on.
 */
async function addMakegood(
  booking: Booking,
  day: string,
  makegoodDay: string,
  minutes: number,
  outageIds: string[],
): Promise<boolean> {
  const sql = solutionsSql();
  const childId = crypto.randomUUID();
  const [, inserted] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${`ad:${booking.placement}:${booking.scope}`}))`,
    sql`WITH child AS (
        INSERT INTO ad_campaigns (id, solution_id, owner_id, solution_name, billing_email, placement,
          scope, starts_on, ends_on, currency, daily_amount, subtotal_amount, discount_amount,
          tax_amount, total_amount, status, hold_expires_at, terms_version, terms_accepted_at,
          paid_at, makegood_of, makegood_day)
        SELECT ${childId}, c.solution_id, c.owner_id, c.solution_name, c.billing_email, c.placement,
          c.scope, ${makegoodDay}::date, ${makegoodDay}::date + 1, c.currency, c.daily_amount,
          c.daily_amount, c.daily_amount, 0, 0, 'paid', now(), c.terms_version, c.terms_accepted_at,
          now(), ${booking.rootId}, ${day}::date
        FROM ad_campaigns c
        JOIN ad_placements p ON p.id = c.placement
        JOIN founder_solutions s ON s.id = c.solution_id AND s.published_data IS NOT NULL
        WHERE c.id = ${booking.id} AND c.status = 'paid' AND c.canceled_at IS NULL
          AND c.served_until IS NULL
          AND NOT EXISTS (SELECT 1 FROM ad_outage_credits k
            WHERE k.campaign_id = c.id AND k.day = ${day}::date)
          -- The chain still ends where this make-good starts (no other make-good meanwhile).
          AND NOT EXISTS (SELECT 1 FROM ad_campaigns x
            WHERE (x.id = ${booking.rootId} OR x.makegood_of = ${booking.rootId})
              AND x.ends_on > ${makegoodDay}::date)
          AND (SELECT count(*) FROM ad_campaigns o
            WHERE o.placement = c.placement AND o.scope = c.scope
              AND (o.status IN ('paid','processing') OR (o.status = 'checkout' AND o.hold_expires_at > now()))
              AND o.starts_on <= ${makegoodDay}::date
              AND ${makegoodDay}::date < coalesce(o.served_until, o.ends_on)) < p.slots
        RETURNING id)
      INSERT INTO ad_outage_credits (campaign_id, day, unserved_minutes, outcome, reason,
        makegood_campaign_id, outage_ids)
      SELECT ${booking.id}, ${day}::date, ${minutes}, 'makegood', 'room', id, ${outageIds}::uuid[]
      FROM child
      RETURNING makegood_campaign_id`,
  ]);
  return inserted.length > 0;
}

/**
 * Records the refund of one undelivered day: the booking's requested total and the
 * decision move together, guarded by the booking's version, before Stripe is called.
 */
async function recordDayRefund(
  booking: Booking,
  day: string,
  minutes: number,
  reason: OutageCreditReason,
  outageIds: string[],
): Promise<{ amount: number; requestedTotal: number } | null> {
  const amount = dayRefundAmount({
    startsOn: booking.startsOn,
    endsOn: booking.endsOn,
    totalAmount: booking.totalAmount,
    refundRequested: booking.refundRequested,
  });
  const status = amount > 0 ? 'pending' : 'none';
  const [row] = await solutionsSql()`WITH changed AS (
      UPDATE ad_campaigns SET refund_requested_amount = refund_requested_amount + ${amount},
        updated_at = now(), version = version + 1
      WHERE id = ${booking.id} AND version = ${booking.version} AND status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM ad_outage_credits k
          WHERE k.campaign_id = ${booking.id} AND k.day = ${day}::date)
      RETURNING id, refund_requested_amount)
    INSERT INTO ad_outage_credits (campaign_id, day, unserved_minutes, outcome, reason,
      refund_amount, refund_requested_total, refund_status, outage_ids)
    SELECT id, ${day}::date, ${minutes}, 'refund', ${reason}, ${amount}, refund_requested_amount,
      ${status}, ${outageIds}::uuid[]
    FROM changed
    RETURNING refund_requested_total`;
  if (!row) return null;
  return { amount, requestedTotal: Number(row.refund_requested_total) };
}

/** Sends a recorded day refund to Stripe and keeps the outcome; true once Stripe accepts it. */
async function issueDayRefund(
  stripe: Stripe | null,
  refund: {
    bookingId: string;
    day: string;
    paymentIntent: string | null;
    amount: number;
    requestedTotal: number;
  },
): Promise<boolean> {
  const sql = solutionsSql();
  if (!stripe || !refund.paymentIntent) {
    await sql`UPDATE ad_outage_credits SET refund_status = 'pending',
        refund_error = ${refund.paymentIntent ? 'stripe_not_configured' : 'no_payment'}, updated_at = now()
      WHERE campaign_id = ${refund.bookingId} AND day = ${refund.day}::date`;
    return false;
  }
  try {
    // Same call as a withdrawal: no reason, same key. A retry returns the same refund.
    await issueRefund(
      stripe,
      {
        bookingId: refund.bookingId,
        paymentIntent: refund.paymentIntent,
        amount: refund.amount,
        requestedTotal: refund.requestedTotal,
      },
      undefined,
    );
    await sql`UPDATE ad_outage_credits SET refund_status = 'issued', refund_error = NULL,
        updated_at = now()
      WHERE campaign_id = ${refund.bookingId} AND day = ${refund.day}::date`;
    return true;
  } catch (error) {
    // Only Stripe's code: its messages can echo payment details.
    const code =
      error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'stripe_error';
    await sql`UPDATE ad_outage_credits SET refund_status = 'failed',
        refund_error = ${code.slice(0, 80)}, updated_at = now()
      WHERE campaign_id = ${refund.bookingId} AND day = ${refund.day}::date`;
    return false;
  }
}

/**
 * Reissues day refunds Stripe has not accepted (from the daily cron), with the amount and
 * key they were recorded with. A dispute pauses them: Stripe's process decides instead.
 */
export async function retryOutageRefunds(stripe: Stripe | null, limit = 25) {
  if (!stripe) return { retried: 0, issued: 0 };
  const rows = await solutionsSql()`SELECT k.campaign_id, to_char(k.day, 'YYYY-MM-DD') AS day,
      k.refund_amount, k.refund_requested_total, c.stripe_payment_intent_id
    FROM ad_outage_credits k JOIN ad_campaigns c ON c.id = k.campaign_id
    WHERE k.refund_status IN ('pending','failed') AND k.refund_amount > 0
      AND k.updated_at < now() - interval '2 minutes'
      AND c.dispute_status IS DISTINCT FROM 'open'
    ORDER BY k.updated_at LIMIT ${limit}`;
  let issued = 0;
  for (const row of rows) {
    const ok = await issueDayRefund(stripe, {
      bookingId: String(row.campaign_id),
      day: String(row.day),
      paymentIntent: row.stripe_payment_intent_id ? String(row.stripe_payment_intent_id) : null,
      amount: Number(row.refund_amount),
      requestedTotal: Number(row.refund_requested_total),
    });
    if (ok) issued++;
  }
  return { retried: rows.length, issued };
}

const dateLabel = (day: string) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${day}T12:00:00Z`),
  );

const durationLabel = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

/**
 * The founder hears what happened and what shwcs did, once per booking and day. Stored in
 * Spanish like every other notice (CLAUDE.md §63); the refund itself sends its own notice
 * when Stripe confirms it (db/listing-notices.sql).
 */
async function notify(
  booking: Booking,
  day: string,
  minutes: number,
  outcome: { makegoodDay: string } | { refund: number },
) {
  if (!booking.ownerId) return;
  const lead = `El ${dateLabel(day)} shwcs estuvo caído ${durationLabel(minutes)}`;
  const title =
    'makegoodDay' in outcome
      ? `${lead}: tu espacio patrocinado para ${booking.name} se mostrará un día más, el ${dateLabel(outcome.makegoodDay)}`
      : outcome.refund > 0
        ? `${lead}: te reembolsamos ese día de tu espacio patrocinado para ${booking.name}`
        : `${lead}: ese día de tu espacio patrocinado para ${booking.name} no se mostró completo`;
  const href = booking.solutionId
    ? `/account/solutions/${booking.solutionId}/promote`
    : '/account/solutions';
  try {
    await solutionsSql()`SELECT listing_notice(${booking.ownerId}::uuid,
      ${`ad:${booking.id}:outage:${day}`}, ${title}, ${href})`;
  } catch (error) {
    // The decision stands without its notice; it is visible on the promote page and in ops.
    console.error('[ads/outages] notice failed', error);
  }
}

export type OutageCredit = {
  bookingId: string;
  day: string;
  unservedMinutes: number;
  outcome: 'makegood' | 'refund';
  reason: OutageCreditReason;
  makegoodBookingId: string | null;
  makegoodDay: string | null;
  refundAmount: number;
  refundStatus: 'none' | 'pending' | 'issued' | 'failed';
};

/** What outages did to the owner's bookings of one listing, newest day first. */
export async function ownedOutageCredits(
  accountId: string,
  solutionId: string,
): Promise<OutageCredit[]> {
  const rows = await solutionsSql()`SELECT k.campaign_id, to_char(k.day, 'YYYY-MM-DD') AS day,
      k.unserved_minutes, k.outcome, k.reason, k.makegood_campaign_id, k.refund_amount,
      k.refund_status, to_char(m.starts_on, 'YYYY-MM-DD') AS makegood_day
    FROM ad_outage_credits k
    JOIN ad_campaigns c ON c.id = k.campaign_id
    LEFT JOIN ad_campaigns m ON m.id = k.makegood_campaign_id
    WHERE c.owner_id = ${accountId} AND c.solution_id = ${solutionId}
    ORDER BY k.day DESC LIMIT 100`;
  return rows.map(row => ({
    bookingId: String(row.campaign_id),
    day: String(row.day),
    unservedMinutes: Number(row.unserved_minutes),
    outcome: row.outcome as OutageCredit['outcome'],
    reason: row.reason as OutageCreditReason,
    makegoodBookingId: row.makegood_campaign_id ? String(row.makegood_campaign_id) : null,
    makegoodDay: row.makegood_day ? String(row.makegood_day) : null,
    refundAmount: Number(row.refund_amount),
    refundStatus: row.refund_status as OutageCredit['refundStatus'],
  }));
}
