import type Stripe from 'stripe';
import { solutionsSql } from '@/lib/solutions/server';
import type { BillingProfile } from '@/lib/billing/model';
import { categories } from '@/lib/taxonomy';
import {
  addDays,
  attributionDays,
  adTimeZone,
  adToday,
  checkoutHoldMinutes,
  reachDays,
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

export type PlacementStatus = AdOffer & { enabled: boolean };

/**
 * Every placement, open or not, with whatever rates it has. A closed placement is shown
 * with its waitlist instead of being hidden (SHCWS-72).
 */
export async function adPlacementStatus(): Promise<PlacementStatus[]> {
  const rows = await solutionsSql()`SELECT p.id, p.slots, p.enabled, r.currency, r.daily_amount
    FROM ad_placements p LEFT JOIN ad_rates r ON r.placement = p.id ORDER BY p.id`;
  const placements = new Map<AdPlacement, PlacementStatus>();
  for (const row of rows) {
    const placement = row.id as AdPlacement;
    const status = placements.get(placement) ?? {
      placement,
      slots: Number(row.slots),
      enabled: Boolean(row.enabled),
      rates: {},
    };
    if (row.currency) status.rates[row.currency as AdCurrency] = Number(row.daily_amount);
    placements.set(placement, status);
  }
  return [...placements.values()];
}

export type PlacementReach = {
  /** Page views in the last {@link reachDays} days (today excluded: it is not over). */
  views: number;
  /** First day counted, when counting started less than {@link reachDays} days ago. */
  since: string | null;
};

/**
 * How many times each placement's page was seen lately, for the reach estimate shown
 * before buying. Keys are `placement:scope`. Pages never measured are simply absent.
 */
export async function placementReach(): Promise<Record<string, PlacementReach>> {
  const today = adToday();
  const from = addDays(today, -reachDays);
  const rows = await solutionsSql()`SELECT placement, scope,
      coalesce(sum(views) FILTER (WHERE day >= ${from}::date AND day < ${today}::date), 0)::int AS views,
      to_char(min(day), 'YYYY-MM-DD') AS first_day
    FROM ad_placement_daily_views GROUP BY placement, scope`;
  const reach: Record<string, PlacementReach> = {};
  for (const row of rows) {
    const first = String(row.first_day);
    reach[`${row.placement}:${row.scope}`] = {
      views: Number(row.views),
      since: first > from ? first : null,
    };
  }
  return reach;
}

/** Counts one view of a placement's page, as a daily total. */
export async function recordPlacementView(placement: AdPlacement, scope: string) {
  await solutionsSql()`INSERT INTO ad_placement_daily_views (placement, scope, day, views)
    SELECT p.id, ${scope}, (now() AT TIME ZONE ${adTimeZone})::date, 1
    FROM ad_placements p WHERE p.id = ${placement}
    ON CONFLICT (placement, scope, day) DO UPDATE SET views = ad_placement_daily_views.views + 1`;
}

/** Placements this account is waiting for (not yet notified). */
export async function waitlistedPlacements(accountId: string): Promise<AdPlacement[]> {
  const rows = await solutionsSql()`SELECT placement FROM ad_waitlist
    WHERE account_id = ${accountId} AND notified_at IS NULL`;
  return rows.map(row => row.placement as AdPlacement);
}

/**
 * Joins or leaves the waitlist of a closed placement. Joining again after a notice puts
 * the account back on the list. Returns false when the placement is already open.
 */
export async function setWaitlist(
  accountId: string,
  placement: AdPlacement,
  join: boolean,
  solutionId: string | null,
): Promise<boolean> {
  const sql = solutionsSql();
  if (!join) {
    await sql`DELETE FROM ad_waitlist WHERE account_id = ${accountId} AND placement = ${placement}`;
    return true;
  }
  const rows = await sql`INSERT INTO ad_waitlist (account_id, placement, solution_id)
    SELECT ${accountId}, p.id,
      (SELECT s.id FROM founder_solutions s WHERE s.id = ${solutionId}::uuid AND s.owner_id = ${accountId})
    FROM ad_placements p WHERE p.id = ${placement} AND NOT p.enabled
    ON CONFLICT (account_id, placement) DO UPDATE SET notified_at = NULL, created_at = now(),
      solution_id = coalesce(EXCLUDED.solution_id, ad_waitlist.solution_id)
    RETURNING placement`;
  return rows.length > 0;
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
      /** Row version, so the buyer can release the hold from the payment step. */
      version: number;
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
      RETURNING id, solution_name, daily_amount, subtotal_amount, version`,
  ]);

  const row = inserted[0];
  if (row) {
    return {
      ok: true,
      id: String(row.id),
      solutionName: String(row.solution_name),
      dailyAmount: Number(row.daily_amount),
      subtotal: Number(row.subtotal_amount),
      version: Number(row.version),
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

export async function attachCheckoutSession(
  id: string,
  sessionId: string,
  promotionCode: string | null = null,
) {
  await solutionsSql()`UPDATE ad_campaigns SET stripe_checkout_session_id = ${sessionId},
      promotion_code = ${promotionCode}, updated_at = now()
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

  // A 100 % promotion code leaves nothing to charge: Stripe settles it as
  // `no_payment_required`, with no PaymentIntent, and the booking is paid in full.
  const settled =
    session.payment_status === 'paid' || session.payment_status === 'no_payment_required';
  if (!settled) {
    // A delayed payment method: keep the hold while it settles.
    await sql`UPDATE ad_campaigns SET status = 'processing', hold_expires_at = now() + interval '7 days',
        stripe_payment_intent_id = coalesce(stripe_payment_intent_id, ${paymentIntent ?? null}), updated_at = now()
      WHERE id = ${id} AND status = 'checkout' AND stripe_checkout_session_id = ${session.id}`;
    return false;
  }

  const [paid] =
    await sql`UPDATE ad_campaigns SET status = 'paid', paid_at = coalesce(paid_at, now()),
      stripe_payment_intent_id = ${paymentIntent ?? null}, total_amount = ${session.amount_total},
      tax_amount = ${session.total_details?.amount_tax ?? 0},
      discount_amount = ${session.total_details?.amount_discount ?? 0},
      updated_at = now(), version = version + 1
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
  discount: number;
  promotionCode: string | null;
  impressions: number;
  clicks: number;
  visits: number;
  siteClicks: number;
  contacts: number;
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
      c.invoice_url, c.discount_amount, c.promotion_code,
      coalesce(sum(m.impressions), 0)::int AS impressions, coalesce(sum(m.clicks), 0)::int AS clicks,
      coalesce(sum(m.visits), 0)::int AS visits, coalesce(sum(m.site_clicks), 0)::int AS site_clicks,
      (SELECT count(*) FROM ad_contact_attributions a WHERE a.campaign_id = c.id)::int AS contacts
    FROM ad_campaigns c LEFT JOIN ad_campaign_daily_metrics m ON m.campaign_id = c.id
    WHERE c.owner_id = ${accountId} AND c.solution_id = ${solutionId}
      AND NOT (c.status IN ('expired','failed') AND c.paid_at IS NULL AND c.created_at < now() - interval '2 days')
    GROUP BY c.id ORDER BY c.created_at DESC LIMIT 50`;
  return rows.map(ownedBooking);
}

function ownedBooking(row: Record<string, unknown>): OwnedBooking {
  return {
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
    canceledAt: row.canceled_at ? new Date(String(row.canceled_at)).toISOString() : null,
    pausedAt: row.paused_at ? new Date(String(row.paused_at)).toISOString() : null,
    disputeStatus: (row.dispute_status as OwnedBooking['disputeStatus']) ?? null,
    invoiceUrl: row.invoice_url ? String(row.invoice_url) : null,
    discount: Number(row.discount_amount ?? 0),
    promotionCode: row.promotion_code ? String(row.promotion_code) : null,
    impressions: Number(row.impressions),
    clicks: Number(row.clicks),
    visits: Number(row.visits),
    siteClicks: Number(row.site_clicks),
    contacts: Number(row.contacts),
  };
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
 * What a sponsored slot measures, as daily totals per booking:
 * - `impression`, `click`: the card itself, only while the booking is serving.
 * - `visit`, `site`: the listing opened from the card and a click from it to the project's
 *   site. These follow a click, so they count from the first day until
 *   {@link attributionDays} after the last served one, and only on the booked listing.
 */
export type AdEventKind = 'impression' | 'click' | 'visit' | 'site';

/** Counts one event as an aggregate per day. Nothing identifies the visitor. */
export async function recordAdEvent(
  bookingId: string,
  kind: AdEventKind,
  solutionId: string | null = null,
) {
  const one = (wanted: AdEventKind) => (kind === wanted ? 1 : 0);
  const onSlot = kind === 'impression' || kind === 'click';
  await solutionsSql()`WITH today AS (SELECT (now() AT TIME ZONE ${adTimeZone})::date AS d)
    INSERT INTO ad_campaign_daily_metrics (campaign_id, day, impressions, clicks, visits, site_clicks)
    SELECT c.id, today.d, ${one('impression')}, ${one('click')}, ${one('visit')}, ${one('site')}
    FROM ad_campaigns c, today
    WHERE c.id = ${bookingId} AND c.status = 'paid' AND c.starts_on <= today.d
      AND CASE WHEN ${onSlot}
        THEN c.paused_at IS NULL AND today.d < coalesce(c.served_until, c.ends_on)
        ELSE c.solution_id = ${solutionId}::uuid
          AND today.d < coalesce(c.served_until, c.ends_on) + ${attributionDays}::int END
    ON CONFLICT (campaign_id, day) DO UPDATE SET
      impressions = ad_campaign_daily_metrics.impressions + EXCLUDED.impressions,
      clicks = ad_campaign_daily_metrics.clicks + EXCLUDED.clicks,
      visits = ad_campaign_daily_metrics.visits + EXCLUDED.visits,
      site_clicks = ad_campaign_daily_metrics.site_clicks + EXCLUDED.site_clicks`;
}

/**
 * A signed-in buyer opened a listing's contact form from a sponsored slot. Their request,
 * if they send one within {@link attributionDays} days, is counted for that booking by the
 * contact_requests trigger (db/ad-self-serve.sql), which deletes this row. Nothing is kept
 * when they already wrote to that listing or own the booking.
 */
export async function recordContactIntent(
  accountId: string,
  bookingId: string,
  solutionId: string,
) {
  const sql = solutionsSql();
  await sql.transaction([
    sql`DELETE FROM ad_contact_intents WHERE expires_at < now()`,
    sql`WITH today AS (SELECT (now() AT TIME ZONE ${adTimeZone})::date AS d)
      INSERT INTO ad_contact_intents (account_id, solution_id, campaign_id, expires_at)
      SELECT ${accountId}, c.solution_id, c.id, now() + make_interval(days => ${attributionDays})
      FROM ad_campaigns c, today
      WHERE c.id = ${bookingId} AND c.solution_id = ${solutionId} AND c.status = 'paid'
        AND c.owner_id IS DISTINCT FROM ${accountId}::uuid
        AND c.starts_on <= today.d
        AND today.d < coalesce(c.served_until, c.ends_on) + ${attributionDays}::int
        AND NOT EXISTS (SELECT 1 FROM contact_requests r
          WHERE r.buyer_id = ${accountId} AND r.solution_id = c.solution_id)
      ON CONFLICT (account_id, solution_id) DO UPDATE SET campaign_id = EXCLUDED.campaign_id,
        expires_at = EXCLUDED.expires_at`,
  ]);
}

export type ReportDay = {
  day: string;
  impressions: number;
  clicks: number;
  visits: number;
  siteClicks: number;
  contacts: number;
};

export type BookingReport = {
  booking: OwnedBooking;
  solutionId: string | null;
  /** Every booked day that served (or will), in order, with its counts. */
  days: ReportDay[];
  /** Visits, site clicks and requests that came after the last served day. */
  after: Pick<ReportDay, 'visits' | 'siteClicks' | 'contacts'>;
  /**
   * The listing as a whole on completed sponsored days against up to 30 earlier days
   * without any sponsorship of it (and after it was first published). Null until the
   * first sponsored day is over.
   */
  comparison: {
    sponsored: { days: number; views: number; contacts: number };
    baseline: { days: number; views: number; contacts: number };
  } | null;
};

/** The advertiser's report of one of their bookings (SHCWS-70), or null if it is not theirs. */
export async function bookingReport(
  accountId: string,
  bookingId: string,
): Promise<BookingReport | null> {
  const sql = solutionsSql();
  const [row] = await sql`SELECT c.id, c.version, c.placement, c.scope, c.solution_id,
      to_char(c.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(c.ends_on, 'YYYY-MM-DD') AS ends_on,
      to_char(c.served_until, 'YYYY-MM-DD') AS served_until, c.currency, c.subtotal_amount,
      c.total_amount, c.refunded_amount, c.status, c.canceled_at, c.paused_at, c.dispute_status,
      c.invoice_url, c.discount_amount, c.promotion_code,
      coalesce(sum(m.impressions), 0)::int AS impressions, coalesce(sum(m.clicks), 0)::int AS clicks,
      coalesce(sum(m.visits), 0)::int AS visits, coalesce(sum(m.site_clicks), 0)::int AS site_clicks,
      (SELECT count(*) FROM ad_contact_attributions a WHERE a.campaign_id = c.id)::int AS contacts
    FROM ad_campaigns c LEFT JOIN ad_campaign_daily_metrics m ON m.campaign_id = c.id
    WHERE c.id = ${bookingId} AND c.owner_id = ${accountId}
    GROUP BY c.id`;
  if (!row) return null;
  const booking = ownedBooking(row);
  const today = adToday();
  const servedEnd = booking.servedUntil ?? booking.endsOn;

  const [metrics, contacts, comparison] = await sql.transaction([
    sql`SELECT to_char(day, 'YYYY-MM-DD') AS day, impressions, clicks, visits, site_clicks
      FROM ad_campaign_daily_metrics WHERE campaign_id = ${bookingId}`,
    sql`SELECT to_char(day, 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM ad_contact_attributions WHERE campaign_id = ${bookingId} GROUP BY day`,
    // Listing views come from solution_daily_metrics (counted per UTC day); requests are
    // read on the Mexico City calendar like the booking. Only completed days compare.
    sql`WITH days AS (
        SELECT d::date AS day, d::date >= ${booking.startsOn}::date AS sponsored
        FROM generate_series(${booking.startsOn}::date - 30,
          least(${servedEnd}::date, ${today}::date) - 1, interval '1 day') d
        WHERE d::date >= ${booking.startsOn}::date OR (
          d::date >= (SELECT coalesce(min(e.created_at), s.published_at)::date
            FROM founder_solutions s LEFT JOIN solution_events e
              ON e.solution_id = s.id AND e.status = 'published'
            WHERE s.id = ${row.solution_id}::uuid GROUP BY s.published_at)
          AND NOT EXISTS (SELECT 1 FROM ad_campaigns o
            WHERE o.solution_id = ${row.solution_id}::uuid AND o.status = 'paid'
              AND o.starts_on <= d::date AND d::date < coalesce(o.served_until, o.ends_on)))),
      requests AS (
        SELECT (created_at AT TIME ZONE ${adTimeZone})::date AS day, count(*)::int AS n
        FROM contact_requests WHERE solution_id = ${row.solution_id}::uuid GROUP BY 1)
      SELECT days.sponsored, count(*)::int AS days, coalesce(sum(m.views), 0)::int AS views,
        coalesce(sum(r.n), 0)::int AS contacts
      FROM days
      LEFT JOIN solution_daily_metrics m
        ON m.solution_id = ${row.solution_id}::uuid AND m.day = days.day
      LEFT JOIN requests r ON r.day = days.day
      GROUP BY days.sponsored`,
  ]);

  const byDay = new Map(metrics.map(item => [String(item.day), item]));
  const contactsByDay = new Map(contacts.map(item => [String(item.day), Number(item.n)]));
  const days: ReportDay[] = [];
  for (let day = booking.startsOn; day < servedEnd; day = addDays(day, 1)) {
    const item = byDay.get(day);
    days.push({
      day,
      impressions: Number(item?.impressions ?? 0),
      clicks: Number(item?.clicks ?? 0),
      visits: Number(item?.visits ?? 0),
      siteClicks: Number(item?.site_clicks ?? 0),
      contacts: contactsByDay.get(day) ?? 0,
    });
  }
  const after = { visits: 0, siteClicks: 0, contacts: 0 };
  for (const item of metrics) {
    if (String(item.day) < servedEnd) continue;
    after.visits += Number(item.visits);
    after.siteClicks += Number(item.site_clicks);
  }
  for (const [day, n] of contactsByDay) if (day >= servedEnd) after.contacts += n;

  const group = (sponsored: boolean) => {
    const found = comparison.find(item => Boolean(item.sponsored) === sponsored);
    return {
      days: Number(found?.days ?? 0),
      views: Number(found?.views ?? 0),
      contacts: Number(found?.contacts ?? 0),
    };
  };
  const sponsored = group(true);
  return {
    booking,
    solutionId: row.solution_id ? String(row.solution_id) : null,
    days,
    after,
    comparison: sponsored.days > 0 ? { sponsored, baseline: group(false) } : null,
  };
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
