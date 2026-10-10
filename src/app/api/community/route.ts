import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { solutionBody, failure } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { communityComment, communityReport } from '@/lib/library/community-model';
const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).community.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (
      !body ||
      typeof body.listId !== 'string' ||
      !isSolutionId(body.listId) ||
      typeof body.action !== 'string'
    )
      return failure(t.invalidRequest, 400);
    const sql = solutionsSql(),
      id = body.listId;
    if (!(await securityLimit('community', account.id, 60))) return failure(t.rateLimited, 429);
    if (body.action === 'like' || body.action === 'save') {
      const rows =
        body.action === 'like'
          ? await sql`WITH deleted AS (DELETE FROM community_list_likes WHERE list_id=${id} AND owner_id=${account.id} RETURNING false active),inserted AS (INSERT INTO community_list_likes(list_id,owner_id) SELECT id,${account.id} FROM buyer_lists WHERE id=${id} AND visibility='public' AND owner_id<>${account.id} AND NOT EXISTS(SELECT 1 FROM deleted) ON CONFLICT DO NOTHING RETURNING true active) SELECT active FROM inserted UNION ALL SELECT active FROM deleted`
          : await sql`WITH deleted AS (DELETE FROM community_saved_lists WHERE list_id=${id} AND owner_id=${account.id} RETURNING false active),inserted AS (INSERT INTO community_saved_lists(list_id,owner_id) SELECT id,${account.id} FROM buyer_lists WHERE id=${id} AND visibility='public' AND owner_id<>${account.id} AND NOT EXISTS(SELECT 1 FROM deleted) ON CONFLICT DO NOTHING RETURNING true active) SELECT active FROM inserted UNION ALL SELECT active FROM deleted`;
      if (!rows.length) return failure(t.ownOrPrivate, 409);
      const [{ count }] =
        body.action === 'like'
          ? await sql`SELECT count(*)::int count FROM community_list_likes WHERE list_id=${id}`
          : await sql`SELECT count(*)::int count FROM community_saved_lists WHERE list_id=${id}`;
      return ok({ active: !!rows[0].active, count: Number(count) });
    }
    if (body.action === 'comment') {
      const details = communityComment(body);
      if (typeof body.commentId !== 'string' || !isSolutionId(body.commentId))
        return failure(t.invalidComment, 400);
      if (!details) return failure(t.commentDetails, 400);
      if (!(await securityLimit('community-comment', account.id, 10)))
        return failure(t.commentCooldown, 429);
      const rows =
        await sql`WITH target AS (SELECT id FROM buyer_lists WHERE id=${id} AND visibility='public'),inserted AS (INSERT INTO community_list_comments(id,list_id,author_id,author_name,body) SELECT ${body.commentId},id,${account.id},${details.name},${details.comment} FROM target ON CONFLICT(id) DO NOTHING RETURNING id,created_at) SELECT id,created_at,true created FROM inserted UNION ALL SELECT c.id,c.created_at,false created FROM community_list_comments c JOIN target t ON t.id=c.list_id WHERE c.id=${body.commentId} AND c.author_id=${account.id} LIMIT 1`;
      if (!rows.length) return failure(t.listNotPublic, 404);
      return ok({ id: rows[0].id, createdAt: rows[0].created_at, created: !!rows[0].created });
    }
    if (body.action === 'delete-comment') {
      if (typeof body.commentId !== 'string' || !isSolutionId(body.commentId))
        return failure(t.invalidComment, 400);
      const rows =
        await sql`DELETE FROM community_list_comments c USING buyer_lists l WHERE c.id=${body.commentId} AND c.list_id=l.id AND (c.author_id=${account.id} OR l.owner_id=${account.id}) RETURNING c.id`;
      return rows.length ? ok() : failure(t.cannotDeleteComment, 404);
    }
    if (body.action === 'report') {
      const details = communityReport(body);
      if (!details) return failure(t.reportDetails, 400);
      if (
        body.commentId !== undefined &&
        (typeof body.commentId !== 'string' || !isSolutionId(body.commentId))
      )
        return failure(t.invalidComment, 400);
      if (!(await securityLimit('community-report', account.id, 5)))
        return failure(t.reportRateLimited, 429);
      const rows =
        typeof body.commentId === 'string'
          ? await sql`INSERT INTO community_reports(subject_type,list_id,comment_id,reporter_id,reason,details) SELECT 'comment',c.list_id,c.id,${account.id},${details.reason},${details.details} FROM community_list_comments c JOIN buyer_lists l ON l.id=c.list_id WHERE c.id=${body.commentId} AND c.list_id=${id} AND l.visibility='public' AND c.author_id<>${account.id} ON CONFLICT DO NOTHING RETURNING id`
          : await sql`INSERT INTO community_reports(subject_type,list_id,reporter_id,reason,details) SELECT 'list',l.id,${account.id},${details.reason},${details.details} FROM buyer_lists l WHERE l.id=${id} AND l.visibility='public' AND l.owner_id<>${account.id} ON CONFLICT DO NOTHING RETURNING id`;
      return rows.length ? ok() : failure(t.reportConflict, 409);
    }
    return failure(t.invalidAction, 400);
  } catch {
    return failure(t.saveFailed, 503);
  }
}
