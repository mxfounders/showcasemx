import { NextRequest, NextResponse } from 'next/server';
import { noticeHref } from '@/lib/notifications/href';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql, securityLimit } from '@/lib/auth/security';
import { isSolutionId } from '@/lib/solutions/model';
import { failure, solutionBody } from '@/lib/solutions/http';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
export async function GET(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).notifications.errors;
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const before = request.nextUrl.searchParams.get('before'),
      beforeId = request.nextUrl.searchParams.get('beforeId'),
      cursorId = beforeId ?? '';
    if (
      (before && !beforeId) ||
      (!before && beforeId) ||
      (before && (!Number.isFinite(Date.parse(before)) || !isSolutionId(cursorId)))
    )
      return failure(t.invalidCursor, 400);
    const sql = authSql();
    const rows = before
      ? await sql`SELECT id::text,title,href,read_at::text,created_at::text FROM account_notifications WHERE owner_id=${account.id} AND (created_at,id)<(${before}::timestamptz,${cursorId}::uuid) ORDER BY created_at DESC,id DESC LIMIT 11`
      : await sql`SELECT id::text,title,href,read_at::text,created_at::text FROM account_notifications WHERE owner_id=${account.id} ORDER BY created_at DESC,id DESC LIMIT 11`;
    const [count] =
      await sql`SELECT count(*)::int AS unread FROM account_notifications WHERE owner_id=${account.id} AND read_at IS NULL`;
    const visible = rows.slice(0, 10).map(item => {
      const href = String(item.href);
      return {
        id: String(item.id),
        title: String(item.title),
        href: noticeHref(href),
        readAt: item.read_at ? String(item.read_at) : null,
        createdAt: String(item.created_at),
      };
    });
    const last = visible.at(-1);
    return NextResponse.json(
      {
        notifications: visible,
        unreadCount: Number(count?.unread ?? 0),
        hasMore: rows.length > 10,
        nextCursor: last ? { before: last.createdAt, beforeId: last.id } : null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.loadUnavailable, 503);
  }
}
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).notifications.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useAccount, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    if (!(await securityLimit('notifications', account.id, 180)))
      return failure(t.tooManyChanges, 429);
    const body = await solutionBody(request),
      sql = authSql();
    if (body?.action === 'preferences') {
      // communityEmail is optional so an older open settings page keeps working.
      const community = typeof body.communityEmail === 'boolean' ? body.communityEmail : null;
      const weekly = typeof body.weeklyEmail === 'boolean' ? body.weeklyEmail : null;
      const alert = typeof body.alertEmail === 'boolean' ? body.alertEmail : null;
      if (
        typeof body.contactEmail !== 'boolean' ||
        typeof body.solutionEmail !== 'boolean' ||
        (body.communityEmail !== undefined && community === null) ||
        (body.weeklyEmail !== undefined && weekly === null) ||
        (body.alertEmail !== undefined && alert === null)
      )
        return failure(t.invalidPreferences, 400);
      const [row] = await sql`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;
      if ((body.contactEmail || body.solutionEmail || community || alert) && !row.email_verified_at)
        return failure(t.verifyFirst, 403);
      await sql`INSERT INTO notification_preferences(owner_id,contact_email,solution_email,community_email,weekly_email,alert_email) VALUES(${account.id},${body.contactEmail},${body.solutionEmail},COALESCE(${community}::boolean,false),COALESCE(${weekly}::boolean,true),COALESCE(${alert}::boolean,true)) ON CONFLICT(owner_id) DO UPDATE SET contact_email=EXCLUDED.contact_email,solution_email=EXCLUDED.solution_email,community_email=COALESCE(${community}::boolean,notification_preferences.community_email),weekly_email=COALESCE(${weekly}::boolean,notification_preferences.weekly_email),alert_email=COALESCE(${alert}::boolean,notification_preferences.alert_email),updated_at=now()`;
    } else if (body?.action === 'read-all') {
      await sql`UPDATE account_notifications SET read_at=now() WHERE owner_id=${account.id} AND read_at IS NULL`;
    } else if (body?.action === 'read' && typeof body.id === 'string' && isSolutionId(body.id)) {
      await sql`UPDATE account_notifications SET read_at=COALESCE(read_at,now()) WHERE owner_id=${account.id} AND id=${body.id}`;
    } else return failure(t.invalidAction, 400);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.saveUnavailable, 503);
  }
}
