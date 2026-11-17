import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * Following public lists and curators (SHCWS-121, db/community-follows.sql).
 *
 * - `list` / `curator` toggle a follow from a public list the viewer doesn't own. A
 *   curator is followed through one of their lists: the server resolves the account and
 *   signature behind it, and neither is ever sent back.
 * - `unfollow-list` (by list) and `unfollow-curator` (by the follower's own follow id)
 *   work from the account page even after a list went private.
 *
 * Nothing here tells anyone who follows them; the response carries only the viewer's state.
 */
export async function POST(request: NextRequest) {
  const t = (await getDictionary(requestLocale(request))).follows.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.action !== 'string') return failure(t.invalid, 400);
    const id = typeof body.id === 'string' && isSolutionId(body.id) ? body.id : null;
    if (!id) return failure(t.invalid, 400);
    if (!(await securityLimit('community-follow', account.id, 60)))
      return failure(t.rateLimited, 429);
    const sql = solutionsSql(),
      me = account.id;
    if (body.action === 'list' || body.action === 'curator') {
      const rows =
        body.action === 'list'
          ? await sql`WITH deleted AS (
                DELETE FROM community_list_follows WHERE list_id = ${id} AND follower_id = ${me}
                RETURNING false AS active),
              inserted AS (
                INSERT INTO community_list_follows (list_id, follower_id)
                SELECT l.id, ${me} FROM buyer_lists l
                 WHERE l.id = ${id} AND l.owner_id <> ${me} AND community_list_visible(l.id)
                   AND NOT EXISTS (SELECT 1 FROM deleted)
                ON CONFLICT DO NOTHING RETURNING true AS active)
              SELECT active FROM inserted UNION ALL SELECT active FROM deleted`
          : await sql`WITH target AS (
                SELECT l.owner_id, curator_key(l.curator_name) AS key, left(btrim(l.curator_name), 60) AS name
                  FROM buyer_lists l
                 WHERE l.id = ${id} AND l.owner_id <> ${me} AND community_list_visible(l.id)
                   AND char_length(curator_key(l.curator_name)) BETWEEN 1 AND 60),
              deleted AS (
                DELETE FROM community_curator_follows c USING target t
                 WHERE c.curator_id = t.owner_id AND c.curator_key = t.key AND c.follower_id = ${me}
                RETURNING false AS active),
              inserted AS (
                INSERT INTO community_curator_follows (curator_id, curator_key, curator_name, follower_id)
                SELECT owner_id, key, name, ${me} FROM target WHERE NOT EXISTS (SELECT 1 FROM deleted)
                ON CONFLICT DO NOTHING RETURNING true AS active)
              SELECT active FROM inserted UNION ALL SELECT active FROM deleted`;
      if (rows.length) return ok({ active: !!rows[0].active });
      const [list] = await sql`SELECT owner_id = ${me} AS own FROM buyer_lists WHERE id = ${id}`;
      return list?.own ? failure(t.own, 409) : failure(t.notPublic, 404);
    }
    if (body.action === 'unfollow-list') {
      await sql`DELETE FROM community_list_follows WHERE list_id = ${id} AND follower_id = ${me}`;
      return ok({ active: false });
    }
    if (body.action === 'unfollow-curator') {
      await sql`DELETE FROM community_curator_follows WHERE id = ${id} AND follower_id = ${me}`;
      return ok({ active: false });
    }
    return failure(t.invalid, 400);
  } catch {
    return failure(t.unavailable, 503);
  }
}
