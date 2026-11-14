// Sponsored placements, ops side (SHCWS-69). The product keeps the same rules in
// src/lib/ads/model.ts (firstRefundableDay, refundAmount); ops builds separately and
// cannot import from it, so the pieces it needs are copied here. Keep both in step:
// tests/ops-ads.test.ts compares them on the same inputs.

export const AD_TIME_ZONE = 'America/Mexico_City';
export const AD_PLACEMENTS = ['category', 'home', 'newsletter'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export const AD_CURRENCIES = ['usd', 'mxn'] as const;
export type AdCurrency = (typeof AD_CURRENCIES)[number];

/** Same limits as the product: one Stripe charge and the longest booking. */
const MAX_CHARGE_AMOUNT = 99_999_999;
const MAX_CAMPAIGN_DAYS = 90;
/** Highest daily rate that still lets a 90-day booking fit in one Stripe charge. */
export const MAX_DAILY_RATE = Math.floor(MAX_CHARGE_AMOUNT / MAX_CAMPAIGN_DAYS);

/** pause_reason written by an ops pause; removals keep the product's own codes. */
export const OPS_PAUSE_REASON = 'opsPause';

/** Why shwcs stops a booking early (see «Publicidad y espacios patrocinados»). */
export type RemovalReason = 'platformRemoval' | 'policyRemoval';
export const REMOVAL_REASONS: readonly RemovalReason[] = ['platformRemoval', 'policyRemoval'];
export const REMOVAL_LABEL: Record<RemovalReason, string> = {
  platformRemoval: 'Decisión de shwcs',
  policyRemoval: 'Incumplimiento',
};

const CANCELLATION_NOTICE_HOURS = 24;

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function adToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function zoneOffsetMinutes(at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: AD_TIME_ZONE, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
}

function dayStart(date: string): Date {
  const utcMidnight = Date.parse(`${date}T00:00:00Z`);
  const firstGuess = utcMidnight - zoneOffsetMinutes(new Date(utcMidnight)) * 60_000;
  return new Date(utcMidnight - zoneOffsetMinutes(new Date(firstGuess)) * 60_000);
}

/** First booked day that is refunded (copy of the product's rule). */
export function firstRefundableDay(
  booking: { startsOn: string; endsOn: string },
  reason: RemovalReason | 'advertiserCancel',
  now: Date = new Date(),
): string {
  const today = adToday(now);
  let first: string;
  if (reason === 'platformRemoval') {
    first = today;
  } else if (reason === 'policyRemoval') {
    first = addDays(today, 1);
  } else {
    const notice = now.getTime() + CANCELLATION_NOTICE_HOURS * 3_600_000;
    first = today;
    while (first < booking.endsOn && dayStart(first).getTime() < notice) first = addDays(first, 1);
  }
  if (first < booking.startsOn) return booking.startsOn;
  return first > booking.endsOn ? booking.endsOn : first;
}

/** Refund owed from `firstRefundable` to the end, net of what was already requested. */
export function refundAmount(
  booking: { startsOn: string; endsOn: string; totalAmount: number; refundRequested: number },
  firstRefundable: string,
): number {
  const bookedDays = daysBetween(booking.startsOn, booking.endsOn);
  const refundableDays = Math.max(0, daysBetween(firstRefundable, booking.endsOn));
  const owed = Math.floor((booking.totalAmount * refundableDays) / bookedDays);
  return Math.max(0, Math.min(owed, booking.totalAmount) - booking.refundRequested);
}

export interface RemovableBooking {
  status: string;
  startsOn: string;
  endsOn: string;
  servedUntil: string | null;
  totalAmount: number | null;
  refundRequested: number;
  pauseReason: string | null;
  disputeStatus: string | null;
}

export type RemovalPlan =
  | { ok: true; firstRefundable: string; servedUntil: string; refund: number }
  | { ok: false; error: 'not_paid' | 'dispute' | 'already_removed' | 'ended' };

/**
 * What withdrawing a booking now does: the day it stops, and the refund it records.
 * A booking the advertiser already cancelled can still be withdrawn; the refund nets
 * out what that cancellation requested and served_until never moves later.
 */
export function planRemoval(
  booking: RemovableBooking,
  reason: RemovalReason,
  now: Date = new Date(),
): RemovalPlan {
  if (booking.status !== 'paid' || booking.totalAmount === null)
    return { ok: false, error: 'not_paid' };
  if (booking.disputeStatus === 'open') return { ok: false, error: 'dispute' };
  if (booking.pauseReason && (REMOVAL_REASONS as readonly string[]).includes(booking.pauseReason))
    return { ok: false, error: 'already_removed' };
  const end = booking.servedUntil ?? booking.endsOn;
  if (adToday(now) >= end) return { ok: false, error: 'ended' };
  const firstRefundable = firstRefundableDay(booking, reason, now);
  const servedUntil = firstRefundable < end ? firstRefundable : end;
  return {
    ok: true,
    firstRefundable,
    servedUntil,
    refund: refundAmount(
      {
        startsOn: booking.startsOn,
        endsOn: booking.endsOn,
        totalAmount: booking.totalAmount,
        refundRequested: booking.refundRequested,
      },
      firstRefundable,
    ),
  };
}

export const REMOVAL_ERROR: Record<Exclude<RemovalPlan, { ok: true }>['error'], string> = {
  not_paid: 'Solo se retiran reservas pagadas.',
  dispute: 'Hay una disputa abierta: el reembolso va por el proceso de Stripe.',
  already_removed: 'shwcs ya retiró esta reserva.',
  ended: 'La reserva ya no tiene días por servir.',
};

/**
 * A daily rate typed by an operator («25», «25.5», «1,250.00») in minor units, or null.
 * Parsed as text so 19.99 never turns into 1998 through floating point.
 */
export function parseRate(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value : '';
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text.trim().replace(/,/g, ''));
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return minor > 0 && minor <= MAX_DAILY_RATE ? minor : null;
}

export function isPlacement(value: unknown): value is AdPlacement {
  return typeof value === 'string' && (AD_PLACEMENTS as readonly string[]).includes(value);
}

export function isCurrency(value: unknown): value is AdCurrency {
  return typeof value === 'string' && (AD_CURRENCIES as readonly string[]).includes(value);
}
