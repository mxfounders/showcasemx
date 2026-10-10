import { isSolutionId } from '@/lib/solutions/model';
import { categories } from '@/lib/taxonomy';

/**
 * Sponsored placements: a founder buys a window of whole days in a clearly labelled
 * "Patrocinado" slot. Price = days × daily rate, paid up front; tax is added by Stripe.
 * Nothing here feeds the organic catalog order (src/lib/solutions/ranking.ts).
 */

export const adPlacements = ['category', 'home', 'newsletter'] as const;
export type AdPlacement = (typeof adPlacements)[number];

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

export type CampaignRequest = {
  solutionId: string;
  placement: AdPlacement;
  /** Category slug for `category`; empty otherwise. */
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
  const scopeValid =
    input.placement === 'category'
      ? categories.some(category => category.slug === scope)
      : scope === '';
  if (!scopeValid) return { ok: false, error: 'scope' };

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
