import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { isHandleShape } from '@/lib/profiles/handle-shape';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * Following public lists and curators (SHCWS-121, db/community-follows.sql) and listings.
 *
 * - `list` / `curator` toggle a follow from a public list the viewer doesn't own. A
 *   curator is followed through one of their lists: the server resolves the account and
 *   signature behind it, and neither is ever sent back.
 * - `unfollow-list` (by list) and `unfollow-curator` (by the follower's own follow id)
 *   work from the account page even after a list went private.
 *
 * - `solution` toggles following a published listing, `unfollow-solution` stops it from
 *   the account page (SHCWS-24, db/solution-updates.sql).
 *
 * - `profile` toggles following a visible public profile by its handle (SHCWS-120); the
 *   account behind it is resolved here and never sent. `unfollow-profile` stops it by the
 *   follower's own follow id, from the account page, even once the profile is off.
 *
 * Nothing here tells anyone who follows them; the response carries only the viewer's state.
 */
export async function POST(request: NextRequest) {
  const dictionary = (await getDictionary(requestLocale(request))).follows;
  const t = dictionary.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.action !== 'string') return failure(t.invalid, 400);
    if (body.action === 'profile') {
      // A public profile by its handle (SHCWS-120). Toggles, like lists and listings.
      const handle = typeof body.handle === 'string' ? body.handle.toLowerCase() : '';
      if (!isHandleShape(handle)) return failure(t.invalid, 400);
      if (!(await securityLimit('community-follow', account.id, 60)))
        return failure(t.rateLimited, 429);
      const errors = (await getDictionary(requestLocale(request))).profiles.errors;
      const sql = solutionsSql(),
        me = account.id;
      const rows = await sql`WITH target AS (
          SELECT p.account_id FROM public_profiles p
           WHERE p.handle = ${handle} AND p.account_id <> ${me} AND profile_visible(p.account_id)),
        deleted AS (
          DELETE FROM profile_follows f USING target t
           WHERE f.profile_id = t.account_id AND f.follower_id = ${me}
          RETURNING false AS active),
        inserted AS (
          INSERT INTO profile_follows (profile_id, follower_id)
          SELECT account_id, ${me} FROM target WHERE NOT EXISTS (SELECT 1 FROM deleted)
          ON CONFLICT DO NOTHING RETURNING true AS active)
        SELECT active FROM inserted UNION ALL SELECT active FROM deleted`;
      if (rows.length) return ok({ active: !!rows[0].active });
      const [profile] =
        await sql`SELECT account_id = ${me} AS own FROM public_profiles WHERE handle = ${handle}`;
      return profile?.own ? failure(errors.own, 409) : failure(errors.notFound, 404);
    }
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
    if (body.action === 'solution') {
      // A published listing the viewer doesn't own (SHCWS-24). Toggles, like lists.
      const rows = await sql`WITH deleted AS (
          DELETE FROM solution_follows WHERE solution_id = ${id} AND follower_id = ${me}
          RETURNING false AS active),
        inserted AS (
          INSERT INTO solution_follows (solution_id, follower_id)
          SELECT s.id, ${me} FROM founder_solutions s
           WHERE s.id = ${id} AND s.owner_id <> ${me} AND s.published_data IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM deleted)
          ON CONFLICT DO NOTHING RETURNING true AS active)
        SELECT active FROM inserted UNION ALL SELECT active FROM deleted`;
      if (rows.length) return ok({ active: !!rows[0].active });
      const [listing] =
        await sql`SELECT owner_id = ${me} AS own FROM founder_solutions WHERE id = ${id}`;
      return listing?.own
        ? failure(dictionary.solution.errors.own, 409)
        : failure(dictionary.solution.errors.notPublished, 404);
    }
    if (body.action === 'unfollow-solution') {
      // From the account page, even after the listing was withdrawn.
      await sql`DELETE FROM solution_follows WHERE solution_id = ${id} AND follower_id = ${me}`;
      return ok({ active: false });
    }
    if (body.action === 'unfollow-list') {
      await sql`DELETE FROM community_list_follows WHERE list_id = ${id} AND follower_id = ${me}`;
      return ok({ active: false });
    }
    if (body.action === 'unfollow-profile') {
      // By the follower's own follow id: works after the profile was switched off or hidden.
      await sql`DELETE FROM profile_follows WHERE id = ${id} AND follower_id = ${me}`;
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
