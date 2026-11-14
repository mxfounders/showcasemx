import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { newInviteToken } from '@/lib/reviews/invitations';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

/**
 * The founder's invitation link to review a published listing (SHCWS-132).
 *
 * - create: returns the listing's link token, creating it the first time.
 * - rotate: replaces it; the old link stops working. Reviews already written through it
 *   keep their «invited» mark.
 *
 * Only the listing's owner, from shwcs, signed in. The token is not a credential: it
 * only records that the reviewer came from the founder.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const t = (await getDictionary(requestLocale(request))).reviews.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  const { id } = await props.params;
  if (!isSolutionId(id)) return failure(t.invalidRequest, 400);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    if (!body || (body.action !== 'create' && body.action !== 'rotate'))
      return failure(t.invalidRequest, 400);
    if (!(await securityLimit('review-invite', account.id, 20))) return failure(t.rateLimited, 429);
    const sql = solutionsSql();
    const [listing] =
      await sql`SELECT owner_id,published_data IS NOT NULL AS published FROM founder_solutions WHERE id=${id}`;
    if (!listing || String(listing.owner_id) !== account.id) return failure(t.notOwner, 403);
    if (!listing.published) return failure(t.unpublished, 409);
    const token = newInviteToken();
    const [row] =
      body.action === 'create'
        ? await sql`WITH created AS (
              INSERT INTO solution_review_invites(solution_id,token) VALUES (${id},${token})
              ON CONFLICT (solution_id) DO NOTHING RETURNING token)
            SELECT token FROM created
            UNION ALL SELECT token FROM solution_review_invites WHERE solution_id=${id}
            LIMIT 1`
        : await sql`INSERT INTO solution_review_invites(solution_id,token) VALUES (${id},${token})
            ON CONFLICT (solution_id) DO UPDATE SET token=EXCLUDED.token,updated_at=now()
            RETURNING token`;
    if (!row) return failure(t.saveFailed, 503);
    return NextResponse.json(
      { ok: true, token: String(row.token) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.saveFailed, 503);
  }
}
