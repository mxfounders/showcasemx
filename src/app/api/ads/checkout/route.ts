import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { categories } from '@/lib/taxonomy';
import { adTermsVersion, adToday, readCampaignRequest, readPromotionCode } from '@/lib/ads/model';
import { isPromotionRejection, resolvePromotionCode, type ResolvedPromo } from '@/lib/ads/promo';
import { checkoutSessionParams } from '@/lib/ads/checkout';
import {
  attachCheckoutSession,
  releaseHold,
  reserveBooking,
  stripeCustomerFor,
} from '@/lib/ads/server';
import { automaticTaxEnabled, publishableKey, stripeClient } from '@/lib/ads/stripe';
import { getBillingProfile } from '@/lib/billing/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { captureServerEvent } from '@/lib/analytics/server';

/**
 * Holds the requested days and opens a Checkout Session for them in `ui_mode: 'elements'`.
 * Nothing redirects to Stripe: the response carries what the promote page needs to mount
 * the payment form on shwcs (the session's client secret, and the buyer's own billing
 * details to prefill the address), plus the booking id and version to release the hold
 * if the buyer goes back.
 */
export async function POST(request: NextRequest) {
  const locale = requestLocale(request);
  const dictionary = await getDictionary(locale);
  const t = dictionary.ads.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  const stripe = stripeClient();
  // Stripe.js needs the publishable key in the browser to mount the form.
  if (!stripe || !publishableKey()) return failure(t.unavailable, 503);

  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body) return failure(t.invalid, 400);
    if (body.acceptTerms !== true) return failure(t.terms, 400);
    if (body.business !== true) return failure(t.business, 400);
    const parsed = readCampaignRequest(body, adToday());
    if (!parsed.ok) return failure(t.codes[parsed.error], 400);
    const code = readPromotionCode(body.promotionCode);
    if (code === 'invalid') return failure(t.promoInvalid, 400);
    if (!(await securityLimit('ad-checkout', account.id, 20))) return failure(t.tooMany, 429);

    // Sales are B2B and every payment gets a document: billing details come first.
    const profile = await getBillingProfile(account.id);
    if (!profile) return failure(t.billingRequired, 400);

    const reservation = await reserveBooking(account, parsed.request, { version: adTermsVersion });
    if (!reservation.ok) {
      return failure(t[reservation.reason], reservation.reason === 'soldOut' ? 409 : 403);
    }

    let promo: ResolvedPromo | null = null;
    try {
      const placement = dictionary.ads.placements[parsed.request.placement].label;
      const category = categories.find(entry => entry.slug === parsed.request.scope)?.label;
      const customer = await stripeCustomerFor(stripe, account, profile);
      if (code) {
        // Checked again here, not trusted from the form: the code may have run out since.
        const resolved = await resolvePromotionCode(stripe, code, {
          currency: parsed.request.currency,
          subtotal: reservation.subtotal,
          customer,
        });
        if (!resolved.ok) {
          await releaseHold(reservation.id, 'failed');
          return failure(t[resolved.error], 400);
        }
        promo = resolved.promo;
      }
      const session = await stripe.checkout.sessions.create(
        checkoutSessionParams({
          bookingId: reservation.id,
          request: parsed.request,
          dailyAmount: reservation.dailyAmount,
          customer,
          productName: [dictionary.ads.slot.label, placement, category, reservation.solutionName]
            .filter(Boolean)
            .join(' · '),
          locale,
          origin: request.nextUrl.origin,
          automaticTax: automaticTaxEnabled(),
          promotionCodeId: promo?.id ?? null,
        }),
        { idempotencyKey: `checkout:${reservation.id}` },
      );
      if (!session.client_secret) throw new Error('Checkout Session without a client secret');
      await attachCheckoutSession(reservation.id, session.id, promo?.code ?? null);
      captureServerEvent(request, account.id, 'ad_checkout_started', {
        placement: parsed.request.placement,
        scope: parsed.request.scope,
        promotion: Boolean(promo),
      });
      return NextResponse.json(
        {
          clientSecret: session.client_secret,
          sessionId: session.id,
          bookingId: reservation.id,
          version: reservation.version,
          billing: {
            name: profile.legalName,
            email: profile.invoiceEmail ?? account.email,
            country: profile.countryCode,
            postalCode: profile.postalCode,
          },
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch (error) {
      // Nothing was charged: free the days right away instead of waiting for the hold.
      await releaseHold(reservation.id, 'failed');
      const stripeError = error instanceof Stripe.errors.StripeError ? error : null;
      // A code Stripe refuses at this point (first purchase only, used up meanwhile).
      if (promo && isPromotionRejection(stripeError)) return failure(t.promoInvalid, 400);
      // Stripe Tax setup problems (no head office, a failed calculation) carry no stable
      // code, so the message is read here — and never logged: it can echo customer data.
      const tax = Boolean(
        stripeError && /tax/i.test(`${stripeError.code ?? ''} ${stripeError.message}`),
      );
      console.error(
        'ads.checkout',
        reservation.id,
        stripeError?.code ?? stripeError?.type ?? 'error',
      );
      return failure(tax ? t.tax : t.unavailable, 503);
    }
  } catch {
    return failure(t.unavailable, 503);
  }
}
