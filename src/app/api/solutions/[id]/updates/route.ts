import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { readUpdateInput, updatesPerWeek } from '@/lib/solutions/updates';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * A founder's dated updates on their published listing (SHCWS-24).
 *
 * - `post`: only the owner, only while the listing is published, at most
 *   {@link updatesPerWeek} in any seven days (hidden ones count too). The id comes from
 *   the client, so a retried post is the same row. Followers hear about it through the
 *   trigger in db/solution-updates.sql, in their weekly notice.
 * - `delete`: the owner removes one of theirs (softly: it still counts for the week).
 *   Ops hides updates; nobody else can remove a founder's update.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const t = (await getDictionary(requestLocale(request))).follows.updates.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  const { id } = await props.params;
  if (!isSolutionId(id)) return failure(t.notFound, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || typeof body.action !== 'string') return failure(t.invalid, 400);
    if (!(await securityLimit('solution-update-post', account.id, 20)))
      return failure(t.rateLimited, 429);
    const sql = solutionsSql();

    if (body.action === 'post') {
      const input = readUpdateInput(body);
      if (!input) return failure(t.invalid, 400);
      // The listing row is locked so two posts can't both take the last slot of the week.
      const [, inserted, [listing]] = await sql.transaction([
        sql`SELECT id FROM founder_solutions WHERE id = ${id} AND owner_id = ${account.id} FOR UPDATE`,
        sql`INSERT INTO solution_updates (id, solution_id, author_id, kind, body, link)
          SELECT ${input.id}, s.id, ${account.id}, ${input.kind}, ${input.body}, ${input.link}
          FROM founder_solutions s
          WHERE s.id = ${id} AND s.owner_id = ${account.id} AND s.published_data IS NOT NULL
            AND (SELECT count(*) FROM solution_updates u WHERE u.solution_id = s.id
                 AND u.created_at > now() - interval '7 days') < ${updatesPerWeek}
          ON CONFLICT (id) DO NOTHING
          RETURNING id`,
        sql`SELECT s.published_data IS NOT NULL AS published,
            EXISTS(SELECT 1 FROM solution_updates u WHERE u.id = ${input.id} AND u.solution_id = s.id) AS exists
          FROM founder_solutions s WHERE s.id = ${id} AND s.owner_id = ${account.id}`,
      ]);
      if (!listing) return failure(t.notFound, 404);
      // A retry of a post that already landed is a success, not a second update.
      if (inserted.length || listing.exists) return ok({ id: input.id });
      if (!listing.published) return failure(t.notPublished, 409);
      return failure(t.weekly.replace('{count}', String(updatesPerWeek)), 409);
    }

    if (body.action === 'delete') {
      if (typeof body.updateId !== 'string' || !isSolutionId(body.updateId))
        return failure(t.invalid, 400);
      // Soft: it disappears for everyone but still counts against the weekly cap.
      const removed = await sql`UPDATE solution_updates u SET deleted_at = now()
        FROM founder_solutions s
        WHERE u.id = ${body.updateId} AND u.solution_id = s.id AND s.id = ${id}
          AND s.owner_id = ${account.id} AND u.deleted_at IS NULL
        RETURNING u.id`;
      return removed.length ? ok() : failure(t.notFound, 404);
    }
    return failure(t.invalid, 400);
  } catch {
    return failure(t.unavailable, 503);
  }
}
