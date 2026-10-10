import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { readBillingProfile } from '@/lib/billing/model';
import { saveBillingProfile } from '@/lib/billing/server';
import { syncStripeCustomer } from '@/lib/ads/server';
import { stripeClient } from '@/lib/ads/stripe';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/** Saves the account's billing details, guarded by the version the form was loaded with. */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).billing.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.origin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || !Number.isInteger(body.version)) return failure(t.invalid, 400);
    const parsed = readBillingProfile(body);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: t.codes[parsed.error], field: parsed.error },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (!(await securityLimit('billing-profile', account.id, 30))) return failure(t.tooMany, 429);

    const version = await saveBillingProfile(account.id, parsed.profile, Number(body.version));
    if (version === null) return failure(t.stale, 409);

    // Keep Stripe's copy in step so Checkout opens prefilled; never block the save on it.
    const stripe = stripeClient();
    if (stripe) {
      await syncStripeCustomer(stripe, account, parsed.profile).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, version }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.unavailable, 503);
  }
}
