import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import { validateNewsletter } from '@/lib/newsletter';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).newsletter.api;
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
    const sql = neon(url);
    // Unique email makes retries safe. Never overwrite an existing opt-out.
    await sql`INSERT INTO newsletter_subscribers (email, profile, role, consent_version) VALUES (${subscription.email}, ${subscription.profile}, ${subscription.role}, 'newsletter-v2') ON CONFLICT (email) DO NOTHING`;
    // Same response for new/existing addresses; does not expose membership.
    return NextResponse.json({ ok: true });
  } catch {
    return fail(t.subscribeUnavailable, 503);
  }
}
