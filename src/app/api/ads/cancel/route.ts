import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { pendingRefund, stopBooking } from '@/lib/ads/server';
import { issueRefund } from '@/lib/ads/refund';
import { adsCacheTag } from '@/lib/ads/settle';
import { stripeClient } from '@/lib/ads/stripe';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * The advertiser cancels a booking. An unpaid hold is released; a paid booking keeps
 * serving the days that start within 24 hours and every later day is refunded. Calling
 * it again after a failed refund completes that same refund.
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
    const bookingId = body?.bookingId;
    if (
      typeof bookingId !== 'string' ||
      !isSolutionId(bookingId) ||
      !Number.isInteger(body?.version)
    ) {
      return failure(t.invalid, 400);
    }
    if (!(await securityLimit('ad-cancel', account.id, 30))) return failure(t.tooMany, 429);

    const outcome = await stopBooking(bookingId, 'advertiserCancel', {
      ownerId: account.id,
      version: Number(body?.version),
    });

    if (!outcome.ok) {
      // Already cancelled with a refund Stripe never confirmed: finish that refund.
      const pending =
        outcome.reason === 'notCancelable' ? await pendingRefund(bookingId, account.id) : null;
      if (!pending) {
        return failure(t[outcome.reason], outcome.reason === 'notFound' ? 404 : 409);
      }
      await issueRefund(
        stripe,
        {
          bookingId,
          paymentIntent: pending.paymentIntent,
          amount: pending.amount,
          requestedTotal: pending.requested,
        },
        'requested_by_customer',
      );
      return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    revalidateTag(adsCacheTag);
    if (outcome.checkoutSession) {
      // The hold is already released; closing the session stops a late payment.
      await stripe.checkout.sessions.expire(outcome.checkoutSession).catch(() => undefined);
    }
    if (outcome.paymentIntent && outcome.refund > 0) {
      try {
        await issueRefund(
          stripe,
          {
            bookingId,
            paymentIntent: outcome.paymentIntent,
            amount: outcome.refund,
            requestedTotal: outcome.requestedTotal,
          },
          'requested_by_customer',
        );
      } catch {
        return failure(t.refundFailed, 502);
      }
    }
    return NextResponse.json(
      { ok: true, refund: outcome.refund },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.unavailable, 503);
  }
}
