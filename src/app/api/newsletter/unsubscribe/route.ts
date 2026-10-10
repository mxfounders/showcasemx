import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseUrl } from '@/lib/database-url';
import { readNewsletterUnsubscribeToken } from '@/lib/newsletter-unsubscribe';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).newsletter.api;
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail(t.openFromShwcs, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return fail(t.invalidFormat, 415);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 1024) return fail(t.requestTooLong, 413);
    body = JSON.parse(text);
  } catch {
    return fail(t.unreadableRequest, 400);
  }
  const token = body && typeof body === 'object' ? (body as Record<string, unknown>).token : null;
  const email = readNewsletterUnsubscribeToken(token);
  if (!email) return fail(t.unsubscribeLinkInvalid, 400);
  const url = getDatabaseUrl();
  if (!url) return fail(t.unsubscribeDisabled, 503);

  try {
    if (
      !(await securityLimit('newsletter-unsubscribe', requestIdentity(request.headers), 30, 300))
    ) {
      return fail(t.unsubscribeTooMany, 429);
    }
    const sql = neon(url);
    await sql`UPDATE newsletter_subscribers SET unsubscribed_at=COALESCE(unsubscribed_at,now()) WHERE email=${email}`;
    // Identical response for known and unknown addresses prevents membership discovery.
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(t.unsubscribeUnavailable, 503);
  }
}
