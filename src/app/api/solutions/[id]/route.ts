import { questionPhase } from '@/lib/solutions/questions';
import { NextRequest, NextResponse, after } from 'next/server';
import { notifyReviewersOfSubmission, reviewAlertsEnabled } from '@/lib/review-queue/alerts';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { revalidateTag } from 'next/cache';
import {
  isSolutionId,
  readSolutionData,
  solutionErrors,
  solutionSystemMessages,
} from '@/lib/solutions/model';
import { cancelAccountBookings } from '@/lib/ads/account';
import { adsCacheTag } from '@/lib/ads/settle';
import { failure, solutionBody } from '@/lib/solutions/http';
import { securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
import { captureServerEvent } from '@/lib/analytics/server';
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.useShwcsAccount, 403);
  if (!isSolutionId(params.id)) return failure(t.draftNotFound, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.sessionEnded, 401);
    if (!(await securityLimit('solution-delete', account.id, 20)))
      return failure(t.tooManyChanges, 429);
    const sql = solutionsSql();
    const result = await sql.transaction([
      sql`SELECT id,status,published_data IS NOT NULL AS was_published FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,
      // Never a listing that was approved once, even if unpublished since (SHCWS-32):
      // deleting it would cascade its reviews and buyers' conversations away.
      sql`DELETE FROM founder_solutions s WHERE s.id=${params.id} AND s.owner_id=${account.id} AND s.status='draft' AND s.published_data IS NULL
        AND s.catalog_key IS NULL
        AND NOT EXISTS(SELECT 1 FROM solution_events e WHERE e.solution_id=s.id AND e.status='published')
        AND NOT EXISTS(SELECT 1 FROM contact_requests r WHERE r.solution_id=s.id) RETURNING s.id`,
    ]);
    if (!result[0].length) return failure(t.draftNotFound, 404);
    if (!result[1].length) return failure(t.deleteOnlyNeverApproved, 409);
    captureServerEvent(request, account.id, 'solution_deleted');
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return failure(t.deleteFailed, 503);
  }
}
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = (await getDictionary(requestLocale(request))).solutionEditor.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin) return failure(t.useShwcsForm, 403);
  if (!isSolutionId(params.id)) return failure(t.applicationNotFound, 404);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.sessionEnded, 401);
    if (!(await securityLimit('solution-update', account.id, 180)))
      return failure(t.tooManyChanges, 429);
    const body = await solutionBody(request);
    if (!body || !Number.isSafeInteger(body.version) || Number(body.version) < 0)
      return failure(t.invalidRequest, 400);
    const sql = solutionsSql();
    let rows;
    if (body.action === 'save' || body.action === 'submit') {
      // questionPhase also knows the ids of the previous editor, so a tab left open
      // on it can still save (src/lib/solutions/questions.ts).
      if (body.question !== undefined && questionPhase(body.question) === undefined)
        return failure(t.invalidQuestion, 400);
      const data = readSolutionData(body.data);
      if (!data || !Number.isInteger(body.step) || Number(body.step) < 0 || Number(body.step) > 3)
        return failure(t.checkFields, 400);
      if (body.action === 'submit' && Object.keys(solutionErrors(data)).length)
        return failure(t.completeBeforeSubmit, 400);
      const question = body.question === undefined ? null : String(body.question);
      if (question && questionPhase(question) !== Number(body.step))
        return failure(t.stepMismatch, 400);
      const status = body.action === 'submit' ? 'pending' : 'draft';
      // Stored in solution_events and read by the Spanish-only ops backoffice too, so it
      // is persisted in the source locale rather than the requester's language.
      const message =
        body.action === 'submit' ? solutionSystemMessages.submitted : 'Borrador guardado.';
      const imageIds = (data.screenshots ?? []).map(image => image.id);
      const result = await sql.transaction([
        sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,
        sql`WITH changed AS (UPDATE founder_solutions SET data=${JSON.stringify(data)}::jsonb,status=${status},step=${Number(body.step)},editor_question=${question},version=version+1,updated_at=now() WHERE id=${params.id} AND owner_id=${account.id} AND version=${Number(body.version)} AND status IN ('draft','changes_requested','published','rejected') AND (SELECT count(*) FROM solution_media WHERE solution_id=${params.id} AND id=ANY(${imageIds}::uuid[]))=${imageIds.length} RETURNING *), event AS (INSERT INTO solution_events(solution_id,status,message,actor_id) SELECT id,status,${message},${account.id} FROM changed WHERE ${body.action === 'submit'} RETURNING id) SELECT * FROM changed`,
      ]);
      rows = result[1];
      // The review team hears about a submission right away (SHCWS-139).
      if (body.action === 'submit' && rows.length && reviewAlertsEnabled())
        after(() => notifyReviewersOfSubmission(params.id).catch(() => undefined));
      // Approving, rejecting or requesting changes happens only in the ops backoffice.
    } else if (body.action === 'withdraw-submission') {
      // SHCWS-31: take a pending submission back to edit it. Same version check as any
      // write; ops sees it leave the queue. A published version stays published.
      rows =
        await sql`WITH changed AS (UPDATE founder_solutions SET status='draft',version=version+1,updated_at=now()
        WHERE id=${params.id} AND owner_id=${account.id} AND version=${Number(body.version)} AND status='pending' RETURNING *),
        event AS (INSERT INTO solution_events(solution_id,status,message,actor_id) SELECT id,'draft',${solutionSystemMessages.submissionWithdrawn},${account.id} FROM changed)
        SELECT * FROM changed`;
      if (!rows.length) return failure(t.notPending, 409);
    } else if (body.action === 'unpublish') {
      // SHCWS-32: the founder takes their own listing off the catalog. It keeps the
      // draft, reviews and conversations, exactly like ops' withdrawal, and coming back
      // goes through review again.
      const [current] =
        await sql`SELECT version,published_data IS NOT NULL AS live FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id}`;
      if (!current) return failure(t.applicationNotFound, 404);
      if (!current.live) return failure(t.notPublished, 409);
      if (Number(current.version) !== Number(body.version)) return failure(t.conflict, 409);
      // Sponsored days can't serve without the listing: cancel them first, under the
      // advertiser rule of docs/ads.md. If a refund can't be issued, nothing changes.
      if (!(await cancelAccountBookings(account.id, params.id)))
        return failure(t.unpublishBookingsPending, 503);
      rows =
        await sql`WITH changed AS (UPDATE founder_solutions SET published_data=NULL,published_at=NULL,status='draft',version=version+1,updated_at=now()
        WHERE id=${params.id} AND owner_id=${account.id} AND version=${Number(body.version)} AND published_data IS NOT NULL RETURNING *),
        event AS (INSERT INTO solution_events(solution_id,status,message,actor_id) SELECT id,'draft',${solutionSystemMessages.unpublished},${account.id} FROM changed)
        SELECT * FROM changed`;
      if (!rows.length) return failure(t.conflict, 409);
      revalidateTag('catalog');
      revalidateTag(adsCacheTag);
      captureServerEvent(request, account.id, 'solution_unpublished');
    } else return failure(t.invalidAction, 400);
    if (!rows.length) return failure(t.conflict, 409);
    if (body.action === 'submit') captureServerEvent(request, account.id, 'solution_submitted');
    return NextResponse.json(
      { ok: true, version: rows[0].version, status: rows[0].status },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.saveFailed, 503);
  }
}
