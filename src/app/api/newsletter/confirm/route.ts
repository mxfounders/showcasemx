import { NextRequest, NextResponse } from 'next/server';
import { requestIdentity, securityLimit } from '@/lib/auth/security';
import { getDatabaseUrl } from '@/lib/database-url';
import { confirmNewsletterToken } from '@/lib/newsletter/confirm';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * Consumes a newsletter confirmation token (double opt-in, SHCWS-124). Only from the
 * confirmation page, by a button: mail scanners that open links never confirm, and a GET
 * never changes anything (§5). The token comes from the URL fragment, never the query.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).newsletter.api;
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail(t.openFromShwcs, 403);
  if (!request.headers.get('content-type')?.includes('application/json'))
    return fail(t.invalidFormat, 415);
  let token: unknown;
  try {
    const text = await request.text();
    if (text.length > 512) return fail(t.requestTooLong, 413);
    const body: unknown = JSON.parse(text);
    token = body && typeof body === 'object' ? (body as Record<string, unknown>).token : null;
  } catch {
    return fail(t.unreadableRequest, 400);
  }
  if (!getDatabaseUrl()) return fail(t.confirmUnavailable, 503);
  try {
    if (!(await securityLimit('newsletter-confirm', requestIdentity(request.headers), 30, 300)))
      return fail(t.confirmTooMany, 429);
    const confirmed = await confirmNewsletterToken(token);
    if (!confirmed) return fail(t.confirmLinkInvalid, 400);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail(t.confirmUnavailable, 503);
  }
}
