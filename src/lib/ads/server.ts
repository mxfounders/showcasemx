import type Stripe from 'stripe';
import { solutionsSql } from '@/lib/solutions/server';
import type { BillingProfile } from '@/lib/billing/model';
import { categories } from '@/lib/taxonomy';
import {
  addDays,
  adTimeZone,
  adToday,
  checkoutHoldMinutes,
  firstRefundableDay,
  maxCampaignDays,
  maxChargeAmount,
  maxLeadDays,
  refundAmount,
  type AdCurrency,
  type AdPlacement,
  type CampaignRequest,
  type StopReason,
} from './model';

/*
 * A booking holds inventory from the moment Checkout opens until its hold expires
 * (abandoned) or for its days once paid. Every query below shares that definition:
 *   status IN ('paid','processing') OR (status = 'checkout' AND hold_expires_at > now())
 * and a booking occupies day d when starts_on <= d < coalesce(served_until, ends_on).
 */

export type AdOffer = {
  placement: AdPlacement;
  slots: number;
  rates: Partial<Record<AdCurrency, number>>;
};

/** Placements open for purchase, with their daily rates. */
export async function adOffers(): Promise<AdOffer[]> {
  const rows = await solutionsSql()`SELECT p.id, p.slots, r.currency, r.daily_amount
    FROM ad_placements p JOIN ad_rates r ON r.placement = p.id
    WHERE p.enabled ORDER BY p.id`;
  const offers = new Map<AdPlacement, AdOffer>();
  for (const row of rows) {
    const placement = row.id as AdPlacement;
    const offer = offers.get(placement) ?? { placement, slots: Number(row.slots), rates: {} };
    offer.rates[row.currency as AdCurrency] = Number(row.daily_amount);
    offers.set(placement, offer);
  }
  return [...offers.values()];
}

/** Free slots per day for one placement and scope, from today to the booking horizon. */
export async function adAvailability(placement: AdPlacement, scope: string) {
  const today = adToday();
  const last = addDays(today, maxLeadDays + maxCampaignDays - 1);
  const rows = await solutionsSql()`SELECT to_char(d, 'YYYY-MM-DD') AS day,
      p.slots - (SELECT count(*) FROM ad_campaigns c
        WHERE c.placement = p.id AND c.scope = ${scope}
          AND (c.status IN ('paid','processing') OR (c.status = 'checkout' AND c.hold_expires_at > now()))
          AND c.starts_on <= d AND d < coalesce(c.served_until, c.ends_on))::int AS free
    FROM ad_placements p, generate_series(${today}::date, ${last}::date, interval '1 day') d
    WHERE p.id = ${placement}`;
  const free: Record<string, number> = {};
  for (const row of rows) if (Number(row.free) < 1) free[String(row.day)] = 0;
  return { from: today, to: last, full: Object.keys(free) };
}

export type Reservation =
  | {
      ok: true;
      id: string;
      solutionName: string;
      dailyAmount: number;
      subtotal: number;
      endsOn: string;
    }
  | { ok: false; reason: 'notAllowed' | 'soldOut' | 'disputed' };

/**
 * Places a hold for a validated request. The advisory lock serializes every reservation
 * for the same placement and scope, so the capacity check and the insert cannot race.
 */
export async function reserveBooking(
  account: { id: string; email: string },
  request: CampaignRequest,
  terms: { version: string },
): Promise<Reservation> {
  const sql = solutionsSql();
  const id = crypto.randomUUID();
  const endsOn = addDays(request.startsOn, request.days);
  const category = categories.find(entry => entry.slug === request.scope)?.label ?? '';
  const holdUntil = new Date(Date.now() + (checkoutHoldMinutes + 1) * 60_000).toISOString();

  const [, inserted] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${`ad:${request.placement}:${request.scope}`}))`,
    sql`INSERT INTO ad_campaigns (id, solution_id, owner_id, solution_name, billing_email, placement,
        scope, starts_on, ends_on, currency, daily_amount, subtotal_amount, hold_expires_at,
        terms_version, terms_accepted_at)
      SELECT ${id}, s.id, s.owner_id, left(coalesce(s.published_data->>'name', ''), 120), ${account.email},
        p.id, ${request.scope}, ${request.startsOn}::date, ${endsOn}::date, r.currency, r.daily_amount,
        r.daily_amount * ${request.days}, ${holdUntil}::timestamptz, ${terms.version}, now()
      FROM founder_solutions s
      JOIN ad_placements p ON p.id = ${request.placement} AND p.enabled
      JOIN ad_rates r ON r.placement = p.id AND r.currency = ${request.currency}
      WHERE s.id = ${request.solutionId} AND s.owner_id = ${account.id}
        AND s.published_data IS NOT NULL
        AND (p.id <> 'category' OR s.published_data->'categories' ? ${category}
             OR s.published_data->>'category' = ${category})
        AND r.daily_amount::bigint * ${request.days} <= ${maxChargeAmount}
        AND NOT EXISTS (SELECT 1 FROM ad_campaigns d
          WHERE d.owner_id = ${account.id} AND d.dispute_status = 'open')
        AND NOT EXISTS (
          SELECT 1 FROM generate_series(${request.startsOn}::date, ${endsOn}::date - 1, interval '1 day') day
          WHERE (SELECT count(*) FROM ad_campaigns c
            WHERE c.placement = p.id AND c.scope = ${request.scope}
              AND (c.status IN ('paid','processing') OR (c.status = 'checkout' AND c.hold_expires_at > now()))
              AND c.starts_on <= day AND day < coalesce(c.served_until, c.ends_on)) >= p.slots)
      RETURNING id, solution_name, daily_amount, subtotal_amount`,
  ]);

  const row = inserted[0];
  if (row) {
    return {
      ok: true,
      id: String(row.id),
      solutionName: String(row.solution_name),
      dailyAmount: Number(row.daily_amount),
      subtotal: Number(row.subtotal_amount),
      endsOn,
    };
  }

  // Nothing was inserted: tell a sold-out window apart from a request that was never allowed.
  const [why] = await sql`SELECT
      EXISTS (SELECT 1 FROM ad_campaigns WHERE owner_id = ${account.id} AND dispute_status = 'open') AS disputed,
      EXISTS (SELECT 1 FROM founder_solutions s
        JOIN ad_placements p ON p.id = ${request.placement} AND p.enabled
        JOIN ad_rates r ON r.placement = p.id AND r.currency = ${request.currency}
        WHERE s.id = ${request.solutionId} AND s.owner_id = ${account.id} AND s.published_data IS NOT NULL
          AND (p.id <> 'category' OR s.published_data->'categories' ? ${category}
               OR s.published_data->>'category' = ${category})
          AND r.daily_amount::bigint * ${request.days} <= ${maxChargeAmount}) AS allowed`;
  if (why?.disputed) return { ok: false, reason: 'disputed' };
  return { ok: false, reason: why?.allowed ? 'soldOut' : 'notAllowed' };
}

export async function attachCheckoutSession(id: string, sessionId: string) {
  await solutionsSql()`UPDATE ad_campaigns SET stripe_checkout_session_id = ${sessionId}, updated_at = now()
    WHERE id = ${id} AND status = 'checkout'`;
}

/** Frees a hold whose Checkout could not be created or was abandoned. */
export async function releaseHold(id: string, status: 'expired' | 'failed' = 'expired') {
  await solutionsSql()`UPDATE ad_campaigns SET status = ${status}, updated_at = now(), version = version + 1
    WHERE id = ${id} AND status IN ('checkout','processing')`;
}

/** The Stripe Customer for an account, created once (idempotently) and remembered. */
export async function stripeCustomerFor(
  stripe: Stripe,
  account: { id: string; email: string },
  profile: BillingProfile,
) {
  const sql = solutionsSql();
  const [known] =
    await sql`SELECT customer_id FROM stripe_customers WHERE account_id = ${account.id}`;
  if (known) return String(known.customer_id);
  const customer = await stripe.customers.create(
    { ...stripeCustomerDetails(account, profile), metadata: { account_id: account.id } },
    { idempotencyKey: `customer:${account.id}` },
  );
  await sql`INSERT INTO stripe_customers (account_id, customer_id) VALUES (${account.id}, ${customer.id})
    ON CONFLICT (account_id) DO NOTHING`;
  const [stored] =
    await sql`SELECT customer_id FROM stripe_customers WHERE account_id = ${account.id}`;
  return String(stored.customer_id);
}

/** Billing details Checkout should open with, from the account's billing profile. */
function stripeCustomerDetails(account: { email: string }, profile: BillingProfile) {
  return {
    name: profile.legalName,
    email: profile.invoiceEmail ?? account.email,
    address: { country: profile.countryCode, postal_code: profile.postalCode ?? undefined },
  };
}

/** Updates the account's Stripe customer after its billing profile changes, if one exists. */
export async function syncStripeCustomer(
  stripe: Stripe,
  account: { id: string; email: string },
  profile: BillingProfile,
) {
  const [known] = await solutionsSql()`SELECT customer_id FROM stripe_customers
    WHERE account_id = ${account.id}`;
  if (known)
    await stripe.customers.update(
      String(known.customer_id),
      stripeCustomerDetails(account, profile),
    );
}

/**
 * Records a settled Checkout Session. Idempotent and strict: the session must be the one
 * attached to the booking and its pre-tax amount and currency must match what was quoted.
 * Returns whether the booking is now paid (it may already have been).
 */
export async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<boolean> {
  const id = session.metadata?.booking_id ?? session.client_reference_id;
  if (!id) return false;
  const sql = solutionsSql();
  const paymentIntent =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  if (session.payment_status !== 'paid') {
    // A delayed payment method: keep the hold while it settles.
    await sql`UPDATE ad_campaigns SET status = 'processing', hold_expires_at = now() + interval '7 days',
        stripe_payment_intent_id = coalesce(stripe_payment_intent_id, ${paymentIntent ?? null}), updated_at = now()
      WHERE id = ${id} AND status = 'checkout' AND stripe_checkout_session_id = ${session.id}`;
    return false;
  }

  const [paid] =
    await sql`UPDATE ad_campaigns SET status = 'paid', paid_at = coalesce(paid_at, now()),
      stripe_payment_intent_id = ${paymentIntent ?? null}, total_amount = ${session.amount_total},
      tax_amount = ${session.total_details?.amount_tax ?? 0}, updated_at = now(), version = version + 1
    WHERE id = ${id} AND status IN ('checkout','processing')
      AND stripe_checkout_session_id = ${session.id}
      AND currency = ${session.currency} AND subtotal_amount = ${session.amount_subtotal}
    RETURNING id`;
  if (paid) return true;
  const [current] = await sql`SELECT status FROM ad_campaigns WHERE id = ${id}`;
  return current?.status === 'paid';
}

export async function recordInvoiceUrl(sessionId: string, url: string) {
  await solutionsSql()`UPDATE ad_campaigns SET invoice_url = ${url}
    WHERE stripe_checkout_session_id = ${sessionId} AND invoice_url IS NULL`;
}

export async function expireCheckout(sessionId: string, status: 'expired' | 'failed') {
  await solutionsSql()`UPDATE ad_campaigns SET status = ${status}, updated_at = now(), version = version + 1
    WHERE stripe_checkout_session_id = ${sessionId} AND status IN ('checkout','processing')`;
}

export async function recordRefunded(paymentIntent: string, amountRefunded: number) {
  await solutionsSql()`UPDATE ad_campaigns SET refunded_amount = greatest(refunded_amount, ${amountRefunded}),
      updated_at = now()
    WHERE stripe_payment_intent_id = ${paymentIntent}`;
}

/** A disputed booking stops serving at once and blocks further purchases by its owner. */
export async function recordDispute(paymentIntent: string, status: 'open' | 'won' | 'lost') {
  const sql = solutionsSql();
  if (status === 'open') {
    await sql`UPDATE ad_campaigns SET dispute_status = 'open', paused_at = coalesce(paused_at, now()),
        pause_reason = coalesce(pause_reason, 'dispute'), updated_at = now(), version = version + 1
      WHERE stripe_payment_intent_id = ${paymentIntent}`;
  } else {
    await sql`UPDATE ad_campaigns SET dispute_status = ${status}, updated_at = now(), version = version + 1
      WHERE stripe_payment_intent_id = ${paymentIntent}`;
  }
}

/** Claims a webhook event; false when it was already processed. */
export async function claimStripeEvent(event: Stripe.Event) {
  const [row] =
    await solutionsSql()`INSERT INTO stripe_events (id, type) VALUES (${event.id}, ${event.type})
    ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type RETURNING processed_at`;
  return !row?.processed_at;
}

export async function completeStripeEvent(id: string) {
  await solutionsSql()`UPDATE stripe_events SET processed_at = now() WHERE id = ${id}`;
}

export type OwnedBooking = {
  id: string;
  version: number;
  placement: AdPlacement;
  scope: string;
  startsOn: string;
  endsOn: string;
  servedUntil: string | null;
  currency: AdCurrency;
  subtotal: number;
  total: number | null;
  refunded: number;
  status: 'checkout' | 'processing' | 'paid' | 'expired' | 'failed';
  canceledAt: string | null;
  pausedAt: string | null;
  disputeStatus: 'open' | 'won' | 'lost' | null;
  invoiceUrl: string | null;
  impressions: number;
  clicks: number;
};

/** The owner's bookings for one listing, newest first, with delivery counts. */
export async function ownedBookings(
  accountId: string,
  solutionId: string,
): Promise<OwnedBooking[]> {
  const rows = await solutionsSql()`SELECT c.id, c.version, c.placement, c.scope,
      to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
      to_char(c.served_until, 'YYYY-MM-DD') AS served_until, c.currency, c.subtotal_amount,
      c.total_amount, c.refunded_amount, c.status, c.canceled_at, c.paused_at, c.dispute_status,
      c.invoice_url,
      coalesce(sum(m.impressions), 0)::int AS impressions, coalesce(sum(m.clicks), 0)::int AS clicks
    FROM ad_campaigns c LEFT JOIN ad_campaign_daily_metrics m ON m.campaign_id = c.id
    WHERE c.owner_id = ${accountId} AND c.solution_id = ${solutionId}
      AND NOT (c.status IN ('expired','failed') AND c.paid_at IS NULL AND c.created_at < now() - interval '2 days')
    GROUP BY c.id ORDER BY c.created_at DESC LIMIT 50`;
  return rows.map(row => ({
    id: String(row.id),
    version: Number(row.version),
    placement: row.placement as AdPlacement,
    scope: String(row.scope),
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    servedUntil: row.served_until ? String(row.served_until) : null,
    currency: row.currency as AdCurrency,
    subtotal: Number(row.subtotal_amount),
    total: row.total_amount === null ? null : Number(row.total_amount),
    refunded: Number(row.refunded_amount),
    status: row.status as OwnedBooking['status'],
    canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
    pausedAt: row.paused_at ? new Date(row.paused_at).toISOString() : null,
    disputeStatus: (row.dispute_status as OwnedBooking['disputeStatus']) ?? null,
    invoiceUrl: row.invoice_url ? String(row.invoice_url) : null,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
  }));
}

export type StopOutcome =
  | {
      ok: true;
      refund: number;
      /** Refunds requested for this booking so far, this one included. */
      requestedTotal: number;
      paymentIntent: string | null;
      checkoutSession: string | null;
    }
  | { ok: false; reason: 'notFound' | 'stale' | 'notCancelable' };

/**
 * Stops a booking early and records the refund it is owed, before Stripe is called, so a
 * retry reissues exactly the same idempotent refund. Unpaid holds are simply released.
 */
export async function stopBooking(
  bookingId: string,
  reason: StopReason,
  scope: { ownerId: string; version: number } | { reviewer: true },
  now: Date = new Date(),
): Promise<StopOutcome> {
  const sql = solutionsSql();
  const [booking] = await sql`SELECT id, owner_id, version, status, dispute_status, canceled_at,
      to_char(starts_on, 'YYYY-MM-DD') AS starts_on, to_char(ends_on, 'YYYY-MM-DD') AS ends_on,
      total_amount, refund_requested_amount, stripe_payment_intent_id, stripe_checkout_session_id
    FROM ad_campaigns WHERE id = ${bookingId}`;
  if (!booking || ('ownerId' in scope && booking.owner_id !== scope.ownerId)) {
    return { ok: false, reason: 'notFound' };
  }
  if ('version' in scope && Number(booking.version) !== scope.version) {
    return { ok: false, reason: 'stale' };
  }

  if (booking.status === 'checkout' || booking.status === 'processing') {
    await releaseHold(bookingId);
    return {
      ok: true,
      refund: 0,
      requestedTotal: 0,
      paymentIntent: null,
      checkoutSession: booking.stripe_checkout_session_id
        ? String(booking.stripe_checkout_session_id)
        : null,
    };
  }
  if (booking.status !== 'paid' || booking.canceled_at || booking.dispute_status === 'open') {
    return { ok: false, reason: 'notCancelable' };
  }

  const firstRefundable = firstRefundableDay(
    { startsOn: String(booking.starts_on), endsOn: String(booking.ends_on) },
    reason,
    now,
  );
  const refund = refundAmount(
    {
      startsOn: String(booking.starts_on),
      endsOn: String(booking.ends_on),
      totalAmount: Number(booking.total_amount ?? 0),
      refundRequested: Number(booking.refund_requested_amount),
    },
    firstRefundable,
  );
  const removal = reason !== 'advertiserCancel';

  const [stopped] = await sql`UPDATE ad_campaigns SET
      canceled_at = CASE WHEN ${removal} THEN canceled_at ELSE now() END,
      paused_at = CASE WHEN ${removal} THEN coalesce(paused_at, now()) ELSE paused_at END,
      pause_reason = CASE WHEN ${removal} THEN ${reason} ELSE pause_reason END,
      served_until = ${firstRefundable}::date,
      refund_requested_amount = refund_requested_amount + ${refund},
      updated_at = now(), version = version + 1
    WHERE id = ${bookingId} AND version = ${Number(booking.version)} AND status = 'paid'
      AND canceled_at IS NULL AND dispute_status IS DISTINCT FROM 'open'
    RETURNING refund_requested_amount`;
  if (!stopped) return { ok: false, reason: 'stale' };
  return {
    ok: true,
    refund,
    requestedTotal: Number(stopped.refund_requested_amount),
    paymentIntent: booking.stripe_payment_intent_id
      ? String(booking.stripe_payment_intent_id)
      : null,
    checkoutSession: null,
  };
}

/** Bookings serving today for a placement and scope, oldest purchase first. */
export async function liveBookings(placement: AdPlacement, scope: string) {
  const rows = await solutionsSql()`SELECT c.id, c.solution_id
    FROM ad_campaigns c
    JOIN ad_placements p ON p.id = c.placement
    JOIN founder_solutions s ON s.id = c.solution_id AND s.published_data IS NOT NULL
    WHERE c.placement = ${placement} AND c.scope = ${scope} AND c.status = 'paid'
      AND c.paused_at IS NULL
      AND c.starts_on <= (now() AT TIME ZONE ${adTimeZone})::date
      AND (now() AT TIME ZONE ${adTimeZone})::date < coalesce(c.served_until, c.ends_on)
    ORDER BY c.paid_at, c.id LIMIT 2`;
  return rows.map(row => ({ bookingId: String(row.id), solutionId: String(row.solution_id) }));
}

/**
 * Counts an impression or click, only for a booking serving right now and only as an
 * aggregate per day. Nothing identifies the visitor.
 */
export async function recordAdEvent(bookingId: string, kind: 'impression' | 'click') {
  const click = kind === 'click' ? 1 : 0;
  await solutionsSql()`INSERT INTO ad_campaign_daily_metrics (campaign_id, day, impressions, clicks)
    SELECT c.id, (now() AT TIME ZONE ${adTimeZone})::date, ${1 - click}, ${click}
    FROM ad_campaigns c
    WHERE c.id = ${bookingId} AND c.status = 'paid' AND c.paused_at IS NULL
      AND c.starts_on <= (now() AT TIME ZONE ${adTimeZone})::date
      AND (now() AT TIME ZONE ${adTimeZone})::date < coalesce(c.served_until, c.ends_on)
    ON CONFLICT (campaign_id, day) DO UPDATE SET
      impressions = ad_campaign_daily_metrics.impressions + EXCLUDED.impressions,
      clicks = ad_campaign_daily_metrics.clicks + EXCLUDED.clicks`;
}

/**
 * A refund recorded for a stopped booking that Stripe has not confirmed yet. Reissuing it
 * with the same idempotency key is safe: Stripe returns the refund it already created.
 */
export async function pendingRefund(bookingId: string, ownerId: string) {
  const [row] = await solutionsSql()`SELECT stripe_payment_intent_id, refund_requested_amount,
      refunded_amount
    FROM ad_campaigns
    WHERE id = ${bookingId} AND owner_id = ${ownerId} AND status = 'paid'
      AND refund_requested_amount > refunded_amount AND stripe_payment_intent_id IS NOT NULL
      AND dispute_status IS DISTINCT FROM 'open'`;
  if (!row) return null;
  return {
    paymentIntent: String(row.stripe_payment_intent_id),
    requested: Number(row.refund_requested_amount),
    amount: Number(row.refund_requested_amount) - Number(row.refunded_amount),
  };
}

/** The Checkout Session of one of the account's own bookings, if it is that account's. */
export async function ownedCheckoutSession(sessionId: string, accountId: string) {
  const [row] = await solutionsSql()`SELECT id FROM ad_campaigns
    WHERE stripe_checkout_session_id = ${sessionId} AND owner_id = ${accountId}`;
  return row ? String(row.id) : null;
}
