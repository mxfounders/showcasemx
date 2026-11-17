import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import { validateNewsletter } from '@/lib/newsletter';
import { requestNewsletterConfirmation } from '@/lib/newsletter/confirm';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * Newsletter sign-up with double opt-in (SHCWS-124): stores an unconfirmed address and emails
 * a confirmation link. Nothing is sent to the address until it confirms, and an existing
 * subscriber is never changed from here (its owner confirms what it asked for).
 */
export async function POST(request: NextRequest) {
  const locale = requestLocale(request);
  const t = (await getDictionary(locale)).newsletter.api;
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail(t.useForm, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return fail(t.invalidFormat, 415);
  const reader = request.body?.getReader();
  if (!reader) return fail(t.missingEmail, 400);
  let size = 0;
  const chunks: Uint8Array[] = [];
  let body: unknown;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) {
        await reader.cancel();
        return fail(t.formTooLong, 413);
      }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return fail(t.unreadableForm, 400);
  }
  const subscription = validateNewsletter(body);
  if (!subscription) return fail(t.invalidSubscription, 400);
  const url = getDatabaseUrl();
  if (!url) return fail(t.subscriptionsDisabled, 503);
  try {
    if (
      !(await securityLimit(
        'newsletter',
        `${requestIdentity(request.headers)}:${subscription.email}`,
        5,
        240,
      ))
    )
      return fail(t.subscribeTooMany, 429);
  } catch {
    return fail(t.subscribeUnavailable, 503);
  }
  try {
    // Same response whether a confirmation went out or the address was already confirmed:
    // the form never tells whether an address is on the list.
    await requestNewsletterConfirmation({ ...subscription, locale });
    return NextResponse.json({ ok: true });
  } catch {
    return fail(t.confirmationUnavailable, 503);
  }
}
