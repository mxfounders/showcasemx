import { NextRequest, NextResponse } from 'next/server';
import { authSql, requestIdentity, securityLimit } from '@/lib/auth/security';
import { readNoticeUnsubscribeToken } from '@/lib/notifications/unsubscribe-token';

/**
 * One-click unsubscribe from a kind of account notice (SHCWS-161, RFC 8058). The signed
 * token is the authorization and says which kind: the mail client's button POSTs here
 * with it in the query, without our Origin. Only that kind's email preference changes,
 * for that account; the answer is the same whether or not the account still exists.
 */
export async function POST(request: NextRequest) {
  const done = (status = 200, error?: string) =>
    NextResponse.json(error ? { error } : { ok: true }, {
      status,
      headers: { 'Cache-Control': 'no-store' },
    });
  const target = readNoticeUnsubscribeToken(request.nextUrl.searchParams.get('token'));
  if (!target) return done(400, 'invalid');
  try {
    if (!(await securityLimit('notice-unsubscribe', requestIdentity(request.headers), 30, 300)))
      return done(429, 'too-many');
    const sql = authSql();
    const { accountId } = target;
    // One static statement per kind: the column name never comes from the request.
    if (target.category === 'contact')
      await sql`INSERT INTO notification_preferences(owner_id, contact_email)
        SELECT id, false FROM auth_accounts WHERE id = ${accountId}
        ON CONFLICT (owner_id) DO UPDATE SET contact_email = false, updated_at = now()`;
    else if (target.category === 'solution')
      await sql`INSERT INTO notification_preferences(owner_id, solution_email)
        SELECT id, false FROM auth_accounts WHERE id = ${accountId}
        ON CONFLICT (owner_id) DO UPDATE SET solution_email = false, updated_at = now()`;
    else if (target.category === 'community')
      await sql`INSERT INTO notification_preferences(owner_id, community_email)
        SELECT id, false FROM auth_accounts WHERE id = ${accountId}
        ON CONFLICT (owner_id) DO UPDATE SET community_email = false, updated_at = now()`;
    else
      await sql`INSERT INTO notification_preferences(owner_id, alert_email)
        SELECT id, false FROM auth_accounts WHERE id = ${accountId}
        ON CONFLICT (owner_id) DO UPDATE SET alert_email = false, updated_at = now()`;
    return done();
  } catch {
    return done(503, 'unavailable');
  }
}

/**
 * A client that opens the address instead of posting to it lands on Preferencias de
 * avisos: a GET never changes anything by itself (CLAUDE.md §5).
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/es/account/settings/notifications', request.url), 303);
}
