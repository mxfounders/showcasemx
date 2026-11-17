import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { readWeeklyUnsubscribeToken } from '@/lib/notifications/weekly-token';

/**
 * Turns the weekly summary off (SHCWS-21). The signed token is the authorization: it
 * comes in the query for the mail client's one-click button (RFC 8058, a POST without
 * our Origin) or in a JSON body from the confirmation page. Only weekly_email changes;
 * the response is the same whether or not the account still exists.
 */
export async function POST(request: NextRequest) {
  const done = (status = 200, error?: string) =>
    NextResponse.json(error ? { error } : { ok: true }, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  let token: unknown = request.nextUrl.searchParams.get('token');
  if (!token && request.headers.get('content-type')?.includes('application/json')) {
    if (request.headers.get('origin') !== request.nextUrl.origin) return done(403, 'origin');
    try {
      const text = await request.text();
      if (text.length > 1024) return done(413, 'too-long');
      const body: unknown = JSON.parse(text);
      token = body && typeof body === 'object' ? (body as Record<string, unknown>).token : null;
    } catch {
      return done(400, 'invalid');
    }
  }
  const account = readWeeklyUnsubscribeToken(token);
  if (!account) return done(400, 'invalid');
  try {
    if (!(await securityLimit('weekly-unsubscribe', requestIdentity(request.headers), 30, 300)))
      return done(429, 'too-many');
    await authSql()`INSERT INTO notification_preferences(owner_id, weekly_email)
      SELECT id, false FROM auth_accounts WHERE id = ${account}
      ON CONFLICT (owner_id) DO UPDATE SET weekly_email = false, updated_at = now()`;
    return done();
  } catch {
    return done(503, 'unavailable');
  }
}
