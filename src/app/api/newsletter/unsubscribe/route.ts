import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { getDatabaseUrl } from '@/lib/database-url';
import { readNewsletterUnsubscribeToken } from '@/lib/newsletter-unsubscribe';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Newsletter unsubscribe. The signed token is the authorization and arrives either in the
 * query, from the mail client's one-click button (RFC 8058: a POST with
 * `List-Unsubscribe=One-Click` and no Origin of ours), or in a JSON body from the
 * confirmation page. `c` names the campaign whose link was used, only to count unsubscribes
 * per campaign. The response is identical for known and unknown addresses.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).newsletter.api;
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

  const query = request.nextUrl.searchParams;
  let token: unknown = query.get('token');
  let campaign: unknown = query.get('c');
  const oneClick = typeof token === 'string' && token.length > 0;
  if (!oneClick) {
    if (request.headers.get('origin') !== request.nextUrl.origin) return fail(t.openFromShwcs, 403);
    if (!request.headers.get('content-type')?.includes('application/json'))
      return fail(t.invalidFormat, 415);
    try {
      const text = await request.text();
      if (text.length > 1024) return fail(t.requestTooLong, 413);
      const body: unknown = JSON.parse(text);
      const input = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      token = input.token;
      campaign = input.campaign;
    } catch {
      return fail(t.unreadableRequest, 400);
    }
  }
  const email = readNewsletterUnsubscribeToken(token);
  if (!email) return fail(t.unsubscribeLinkInvalid, 400);
  if (!getDatabaseUrl()) return fail(t.unsubscribeDisabled, 503);
  const campaignId = typeof campaign === 'string' && uuid.test(campaign) ? campaign : null;

  try {
    if (
      !(await securityLimit('newsletter-unsubscribe', requestIdentity(request.headers), 30, 300))
    ) {
      return fail(t.unsubscribeTooMany, 429);
    }
    // Only an active subscription changes; the campaign counts one unsubscribe when it does.
    await authSql()`WITH left_list AS (
        UPDATE newsletter_subscribers SET unsubscribed_at = now(),
          unsubscribe_reason = ${oneClick ? 'one_click' : 'link'}
        WHERE email = ${email} AND unsubscribed_at IS NULL RETURNING email
      )
      UPDATE newsletter_campaigns SET unsubscribed = unsubscribed + 1
      WHERE id = ${campaignId}::uuid AND EXISTS (SELECT 1 FROM left_list)
        AND EXISTS (SELECT 1 FROM newsletter_deliveries d WHERE d.campaign_id = ${campaignId}::uuid AND d.email = ${email})`;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(t.unsubscribeUnavailable, 503);
  }
}
