import { isSolutionId } from '@/lib/solutions/model';
import { categories, collections, industries } from '@/lib/taxonomy';

/**
 * Sponsored placements: a founder buys a window of whole days in a clearly labelled
 * "Patrocinado" slot. Price = days × daily rate, paid up front; tax is added by Stripe.
 * Nothing here feeds the organic catalog order (src/lib/solutions/ranking.ts).
 */

export const adPlacements = [
  'category',
  'industry',
  'collection',
  'search',
  'home',
  'newsletter',
] as const;
export type AdPlacement = (typeof adPlacements)[number];

/**
 * Placements tied to one page of a closed set, named by its slug (SHCWS-79): a category, an
 * industry, a collection, or for `search` the category a query points at
 * (src/lib/search/topics.ts, inferQueryCategory). The others have no scope.
 */
export const scopedPlacements = ['category', 'industry', 'collection', 'search'] as const;
export type ScopedPlacement = (typeof scopedPlacements)[number];

export function isScopedPlacement(placement: AdPlacement): placement is ScopedPlacement {
  return (scopedPlacements as readonly string[]).includes(placement);
}

/** Every slug a placement can be scoped to, from the taxonomy. Empty when it takes none. */
export function placementScopeSlugs(placement: AdPlacement): string[] {
  if (placement === 'category' || placement === 'search') return categories.map(c => c.slug);
  if (placement === 'industry') return industries.map(i => i.slug);
  if (placement === 'collection') return collections.map(c => c.slug);
  return [];
}

/** Whether `scope` is a valid page for `placement` (empty for unscoped placements). */
export function isPlacementScope(placement: AdPlacement, scope: string): boolean {
  return isScopedPlacement(placement)
    ? placementScopeSlugs(placement).includes(scope)
    : scope === '';
}

export const adCurrencies = ['usd', 'mxn'] as const;
export type AdCurrency = (typeof adCurrencies)[number];

/** Days start and end at midnight here; the terms of service say so. */
export const adTimeZone = 'America/Mexico_City';

/** Longest single campaign. There is no minimum: one day is a valid purchase. */
export const maxCampaignDays = 90;

/** How far ahead a campaign may start, so inventory is not locked indefinitely. */
export const maxLeadDays = 180;

/** Stripe's minimum Checkout Session lifetime; inventory is held for the same time. */
export const checkoutHoldMinutes = 30;

/** Largest amount a single Stripe charge accepts, in minor units (eight digits). */
export const maxChargeAmount = 99_999_999;

/** Version of the advertising terms a buyer accepts; bump it when the terms change. */
export const adTermsVersion = 'ads-2026-10';

/** Cancelling refunds every booked day that starts at least this long afterwards. */
const cancellationNoticeHours = 24;

/** Duration shortcuts in the booking form (SHCWS-150). */
export const presetDays = [7, 14, 30] as const;

/** The reach estimate shown before buying counts this many past days (SHCWS-72). */
export const reachDays = 30;

/**
 * Days after a booking's last served day during which a visit, a site click or a contact
 * request that started on its slot still counts for it (SHCWS-70).
 */
export const attributionDays = 7;

/**
 * Query flag a sponsored slot adds to the listing URL, next to `from=sponsored`: the
 * booking it came from. A booking id identifies the purchase, never the visitor.
 */
export const sponsoredBookingParam = 'ad';

/** A promotion code as typed: Stripe's alphabet (letters, digits, dashes), up to 60. */
export function readPromotionCode(value: unknown): string | null | 'invalid' {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return 'invalid';
  const code = value.trim();
  if (code === '') return null;
  return /^[A-Za-z0-9-]{1,60}$/.test(code) ? code : 'invalid';
}

export type PromoDiscount = {
  code: string;
  /** Percentage off, or the fixed amount off in the booking's currency (minor units). */
  percentOff: number | null;
  amountOff: number | null;
};

/**
 * What a promotion code takes off a pre-tax subtotal, the way Stripe applies a coupon:
 * a percentage rounded to the minor unit, or a fixed amount never above the subtotal.
 * An estimate for the form; the amount kept is the one Stripe reports when it settles.
 */
export function discountAmount(
  subtotal: number,
  promo: Pick<PromoDiscount, 'percentOff' | 'amountOff'> | null,
): number {
  if (!promo || subtotal <= 0) return 0;
  if (promo.percentOff !== null) {
    return Math.min(subtotal, Math.round((subtotal * promo.percentOff) / 100));
  }
  return Math.min(subtotal, Math.max(0, promo.amountOff ?? 0));
}

/**
 * The tax rate Stripe Tax adds for a billing country, with shwcs's head office in Mexico
 * (docs/ads.md): IVA 16 % for Mexico and nothing elsewhere (export, reverse charge or no
 * registration there). Null while the country is unknown. Stripe has the last word.
 */
export function estimatedTaxRate(country: string | null): number | null {
  if (!country) return null;
  return country === 'MX' ? 0.16 : 0;
}

/**
 * The currency a booking form opens with: the billing country's (pesos for Mexico, dollars
 * elsewhere) or, before there is one, the language's. The buyer can always change it.
 */
export function preferredCurrency(country: string | null, locale: string): AdCurrency {
  if (country) return country === 'MX' ? 'mxn' : 'usd';
  return locale === 'es' ? 'mxn' : 'usd';
}

/** Clicks per impression, or null before the first impression. */
export function clickThroughRate(clicks: number, impressions: number): number | null {
  return impressions > 0 ? clicks / impressions : null;
}

/**
 * The last day a booking starting on `start` can cover without crossing a full day or the
 * longest campaign. Null when `start` itself is full.
 */
export function lastBookableDay(
  start: string,
  full: readonly string[],
  maxDays: number = maxCampaignDays,
): string | null {
  if (full.includes(start)) return null;
  let last = start;
  for (let day = 1; day < maxDays; day++) {
    const next = addDays(start, day);
    if (full.includes(next)) break;
    last = next;
  }
  return last;
}

export type CampaignRequest = {
  solutionId: string;
  placement: AdPlacement;
  /** Page slug for a scoped placement ({@link isPlacementScope}); empty otherwise. */
  scope: string;
  /** YYYY-MM-DD in {@link adTimeZone}. */
  startsOn: string;
  days: number;
  currency: AdCurrency;
};

export type CampaignRequestError =
  | 'solution'
  | 'placement'
  | 'scope'
  | 'startsOn'
  | 'startsInPast'
  | 'startsTooLate'
  | 'days'
  | 'currency';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export function isAdPlacement(value: unknown): value is AdPlacement {
  return typeof value === 'string' && (adPlacements as readonly string[]).includes(value);
}

function isAdCurrency(value: unknown): value is AdCurrency {
  return typeof value === 'string' && (adCurrencies as readonly string[]).includes(value);
}

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-30). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !isoDate.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Today's calendar date in the platform time zone. */
export function adToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: adTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * Validates an untrusted purchase request. Ownership, publication and whether the
 * listing declares the category are checked against the database by the caller.
 */
export function readCampaignRequest(
  value: unknown,
  today: string,
): { ok: true; request: CampaignRequest } | { ok: false; error: CampaignRequestError } {
  if (!value || typeof value !== 'object') return { ok: false, error: 'solution' };
  const input = value as Record<string, unknown>;

  if (typeof input.solutionId !== 'string' || !isSolutionId(input.solutionId)) {
    return { ok: false, error: 'solution' };
  }
  if (!isAdPlacement(input.placement)) return { ok: false, error: 'placement' };

  const scope = typeof input.scope === 'string' ? input.scope : '';
  if (!isPlacementScope(input.placement, scope)) return { ok: false, error: 'scope' };

  if (!isIsoDate(input.startsOn)) return { ok: false, error: 'startsOn' };
  if (input.startsOn < today) return { ok: false, error: 'startsInPast' };
  if (input.startsOn > addDays(today, maxLeadDays)) return { ok: false, error: 'startsTooLate' };

  const days = input.days;
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > maxCampaignDays) {
    return { ok: false, error: 'days' };
  }
  if (!isAdCurrency(input.currency)) return { ok: false, error: 'currency' };

  return {
    ok: true,
    request: {
      solutionId: input.solutionId,
      placement: input.placement,
      scope,
      startsOn: input.startsOn,
      days,
      currency: input.currency,
    },
  };
}

/** Pre-tax price in minor units, or null when it exceeds a single Stripe charge. */
export function campaignSubtotal(days: number, dailyAmount: number): number | null {
  const subtotal = days * dailyAmount;
  return Number.isSafeInteger(subtotal) && subtotal <= maxChargeAmount ? subtotal : null;
}

export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** The UTC instant at which `date` begins in the platform time zone. */
export function dayStart(date: string): Date {
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  // Local midnight is UTC midnight shifted by the zone offset; resolving the offset at
  // the shifted instant keeps this right across any future DST change.
  const firstGuess = utcMidnight - zoneOffsetMinutes(new Date(utcMidnight)) * 60_000;
  return new Date(utcMidnight - zoneOffsetMinutes(new Date(firstGuess)) * 60_000);
}

function zoneOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: adTimeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

/**
 * Why a booking stops early, which decides what is refunded (see the advertising terms):
 * - `advertiserCancel`: days that start at least {@link cancellationNoticeHours} later;
 *   the paid days before that keep serving.
 * - `platformRemoval`: shwcs's own decision; every day not fully served, including today.
 * - `policyRemoval`: the advertiser broke the terms; from tomorrow on.
 */
export type StopReason = 'advertiserCancel' | 'platformRemoval' | 'policyRemoval';

/** First booked day that is refunded; the booking serves (or served) only the days before it. */
export function firstRefundableDay(
  booking: { startsOn: string; endsOn: string },
  reason: StopReason,
  now: Date = new Date(),
): string {
  const today = adToday(now);
  let first: string;
  if (reason === 'platformRemoval') {
    first = today;
  } else if (reason === 'policyRemoval') {
    first = addDays(today, 1);
  } else {
    const notice = now.getTime() + cancellationNoticeHours * 3_600_000;
    first = today;
    while (first < booking.endsOn && dayStart(first).getTime() < notice) first = addDays(first, 1);
  }
  if (first < booking.startsOn) return booking.startsOn;
  return first > booking.endsOn ? booking.endsOn : first;
}

/**
 * Refund owed for the days from `firstRefundableDay` to the end, as a share of what was
 * actually charged (tax included, so tax is refunded in proportion). Rounded down so
 * shwcs never refunds more than was paid, and net of refunds already requested.
 */
export function refundAmount(
  booking: { startsOn: string; endsOn: string; totalAmount: number; refundRequested: number },
  firstRefundable: string,
): number {
  const bookedDays = daysBetween(booking.startsOn, booking.endsOn);
  const refundableDays = Math.max(0, daysBetween(firstRefundable, booking.endsOn));
  const owed = Math.floor((booking.totalAmount * refundableDays) / bookedDays);
  return Math.max(0, Math.min(owed, booking.totalAmount) - booking.refundRequested);
}

export type BookingState =
  | 'checkout'
  | 'processing'
  | 'scheduled'
  | 'live'
  | 'ended'
  | 'canceled'
  | 'paused'
  | 'disputed'
  | 'expired'
  | 'failed';

/** What a booking is doing today, from the advertiser's point of view. */
export function bookingState(
  booking: {
    status: 'checkout' | 'processing' | 'paid' | 'expired' | 'failed';
    startsOn: string;
    endsOn: string;
    servedUntil: string | null;
    canceledAt: string | null;
    pausedAt: string | null;
    disputeStatus: 'open' | 'won' | 'lost' | null;
  },
  today: string,
): BookingState {
  if (booking.status !== 'paid') return booking.status;
  if (booking.disputeStatus === 'open' || booking.disputeStatus === 'lost') return 'disputed';
  if (booking.pausedAt) return 'paused';
  const end = booking.servedUntil ?? booking.endsOn;
  if (today >= end) return booking.canceledAt && end < booking.endsOn ? 'canceled' : 'ended';
  if (booking.canceledAt) return today < booking.startsOn ? 'canceled' : 'live';
  return today < booking.startsOn ? 'scheduled' : 'live';
}

/*
 * Outages (SHCWS-179). The advertising terms (/terminos#publicidad) count a booked day as
 * not delivered when shwcs could not serve for four hours or more, added up over that day
 * in Mexico City time. Such a day is made good with one more day right after the booking
 * when that day has room, and refunded otherwise. The windows come from a monitor outside
 * Vercel (src/app/api/internal/outages), because the daily cron goes down with the site.
 */
export const outageThresholdMinutes = 4 * 60;

export type OutageWindow = { start: Date; end: Date };

/** Minutes of each day (Mexico City) covered by the windows; overlapping reports count once. */
export function unservedMinutesByDay(windows: readonly OutageWindow[]): Map<string, number> {
  const sorted = windows
    .filter(window => window.end.getTime() > window.start.getTime())
    .map(window => ({ start: window.start.getTime(), end: window.end.getTime() }))
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const window of sorted) {
    const last = merged[merged.length - 1];
    if (last && window.start <= last.end) last.end = Math.max(last.end, window.end);
    else merged.push({ ...window });
  }
  const minutes = new Map<string, number>();
  for (const window of merged) {
    for (let day = adToday(new Date(window.start)); ; day = addDays(day, 1)) {
      const from = Math.max(window.start, dayStart(day).getTime());
      const to = Math.min(window.end, dayStart(addDays(day, 1)).getTime());
      if (from >= window.end) break;
      if (to > from) minutes.set(day, (minutes.get(day) ?? 0) + (to - from) / 60_000);
    }
  }
  for (const [day, value] of minutes) minutes.set(day, Math.floor(value));
  return minutes;
}

/** The days the windows left unserved for at least {@link outageThresholdMinutes}, in order. */
export function undeliveredDays(
  windows: readonly OutageWindow[],
): { day: string; minutes: number }[] {
  return [...unservedMinutesByDay(windows)]
    .filter(([, minutes]) => minutes >= outageThresholdMinutes)
    .map(([day, minutes]) => ({ day, minutes }))
    .sort((a, b) => (a.day < b.day ? -1 : 1));
}

/**
 * The refund for `days` whole booked days: the same proportion of what was charged as a
 * cancellation or a withdrawal (see {@link refundAmount}), rounded down, and never more
 * than what has not been refunded yet.
 */
export function dayRefundAmount(
  booking: { startsOn: string; endsOn: string; totalAmount: number; refundRequested: number },
  days = 1,
): number {
  const bookedDays = daysBetween(booking.startsOn, booking.endsOn);
  if (bookedDays <= 0 || days <= 0) return 0;
  const owed = Math.floor((booking.totalAmount * Math.min(days, bookedDays)) / bookedDays);
  return Math.max(0, Math.min(owed, booking.totalAmount - booking.refundRequested));
}

/** Why an undelivered day was made good or refunded (db/ad-placements-outages.sql). */
export type OutageCreditReason = 'room' | 'noRoom' | 'ended' | 'stopped' | 'unlisted';

/**
 * Where a make-good day for an undelivered day would go: the day right after the booking
 * and the make-good days it already has (`lastEnd`, exclusive). It has to be a whole day
 * still to come; a booking that was cancelled or withdrawn, or whose listing is no longer
 * published, cannot run another day, so that day is refunded instead. Whether the day
 * has room is checked against the inventory when the make-good is written.
 */
export function makegoodPlan(
  booking: { servedUntil: string | null; canceledAt: string | null; lastEnd: string },
  published: boolean,
  today: string,
):
  | { ok: true; day: string }
  | { ok: false; reason: Exclude<OutageCreditReason, 'room' | 'noRoom'> } {
  if (booking.canceledAt || booking.servedUntil) return { ok: false, reason: 'stopped' };
  if (!published) return { ok: false, reason: 'unlisted' };
  if (booking.lastEnd <= today) return { ok: false, reason: 'ended' };
  return { ok: true, day: booking.lastEnd };
}
