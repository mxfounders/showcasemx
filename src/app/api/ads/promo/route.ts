import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { solutionsSql } from '@/lib/solutions/server';
import {
  campaignSubtotal,
  isAdPlacement,
  maxCampaignDays,
  readPromotionCode,
} from '@/lib/ads/model';
import { resolvePromotionCode } from '@/lib/ads/promo';
import { stripeClient } from '@/lib/ads/stripe';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * Checks a promotion code against the booking being set up, so the form can show the
 * discount before paying (SHCWS-75). Read-only: nothing is reserved or redeemed here, and
 * the checkout checks the code again. Rate limited so codes cannot be guessed by trying.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).ads.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  const stripe = stripeClient();
  if (!stripe) return failure(t.unavailable, 503);

  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    const code = readPromotionCode(body?.code);
    const { placement, currency, days } = body ?? {};
    if (!code || code === 'invalid') return failure(t.promoInvalid, 400);
    if (
      !isAdPlacement(placement) ||
      (currency !== 'usd' && currency !== 'mxn') ||
      typeof days !== 'number' ||
      !Number.isInteger(days) ||
      days < 1 ||
      days > maxCampaignDays
    ) {
      return failure(t.invalid, 400);
    }
    if (!(await securityLimit('ad-promo', account.id, 20))) return failure(t.tooMany, 429);

    const sql = solutionsSql();
    const [[rate], [known]] = await sql.transaction([
      sql`SELECT daily_amount FROM ad_rates WHERE placement = ${placement} AND currency = ${currency}`,
      sql`SELECT customer_id FROM stripe_customers WHERE account_id = ${account.id}`,
    ]);
    const subtotal = rate ? campaignSubtotal(days, Number(rate.daily_amount)) : null;
    if (subtotal === null) return failure(t.invalid, 400);

    const resolved = await resolvePromotionCode(stripe, code, {
      currency,
      subtotal,
      customer: known ? String(known.customer_id) : null,
    });
    if (!resolved.ok) return failure(t[resolved.error], 400);
    const { percentOff, amountOff } = resolved.promo;
    return NextResponse.json(
      { code: resolved.promo.code, percentOff, amountOff },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.unavailable, 503);
  }
}
