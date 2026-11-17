import type Stripe from 'stripe';
import type { AdCurrency, PromoDiscount } from './model';

export type PromoError = 'promoInvalid' | 'promoCurrency' | 'promoMinimum';

export type ResolvedPromo = PromoDiscount & { id: string };

/**
 * Looks up a customer-facing promotion code in Stripe and checks it fits this booking
 * (SHCWS-75). The server applies the code to the Checkout Session itself, so the form can
 * show the discount before paying and nobody can stack a second code on the hosted page.
 *
 * Codes and their coupons are created in the Stripe Dashboard (docs/ads.md). A code only
 * fits when its coupon is a one-off percentage or an amount in the booking's currency,
 * is not tied to specific products (sponsored days are one-off line items), and is not
 * reserved to another customer. Stripe enforces first-purchase limits when the session is
 * created; the caller maps that rejection to `promoInvalid`.
 */
export async function resolvePromotionCode(
  stripe: Stripe,
  code: string,
  booking: { currency: AdCurrency; subtotal: number; customer: string | null },
): Promise<{ ok: true; promo: ResolvedPromo } | { ok: false; error: PromoError }> {
  // The same text can be active once per customer, so look past codes reserved to others.
  const found = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 10,
    expand: ['data.promotion.coupon'],
  });
  const reservedTo = (promotion: Stripe.PromotionCode) =>
    typeof promotion.customer === 'string' ? promotion.customer : (promotion.customer?.id ?? null);
  const promotion =
    found.data.find(item => reservedTo(item) !== null && reservedTo(item) === booking.customer) ??
    found.data.find(item => reservedTo(item) === null);
  if (!promotion) return { ok: false, error: 'promoInvalid' };
  const now = Date.now() / 1000;
  const coupon = typeof promotion.promotion.coupon === 'object' ? promotion.promotion.coupon : null;
  if (
    !coupon ||
    !coupon.valid ||
    (promotion.expires_at !== null && promotion.expires_at <= now) ||
    (promotion.max_redemptions !== null && promotion.times_redeemed >= promotion.max_redemptions) ||
    (coupon.applies_to?.products?.length ?? 0) > 0
  ) {
    return { ok: false, error: 'promoInvalid' };
  }

  const minimum =
    promotion.restrictions.currency_options?.[booking.currency]?.minimum_amount ??
    (promotion.restrictions.minimum_amount_currency === booking.currency
      ? promotion.restrictions.minimum_amount
      : null);
  if (minimum !== null && booking.subtotal < minimum) return { ok: false, error: 'promoMinimum' };

  if (coupon.percent_off !== null) {
    return {
      ok: true,
      promo: {
        id: promotion.id,
        code: promotion.code,
        percentOff: coupon.percent_off,
        amountOff: null,
      },
    };
  }
  const amountOff =
    coupon.currency === booking.currency
      ? coupon.amount_off
      : (coupon.currency_options?.[booking.currency]?.amount_off ?? null);
  if (amountOff === null) return { ok: false, error: 'promoCurrency' };
  return {
    ok: true,
    promo: { id: promotion.id, code: promotion.code, percentOff: null, amountOff },
  };
}

/** Whether Stripe refused a session because of the promotion code it carried. */
export function isPromotionRejection(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { param, code } = error as { param?: unknown; code?: unknown };
  return (
    (typeof param === 'string' && param.startsWith('discounts')) ||
    (typeof code === 'string' && /promotion|coupon/i.test(code))
  );
}
