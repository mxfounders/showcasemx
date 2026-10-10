import { isSolutionQuestion, solutionQuestions } from '@/lib/solutions/questions';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { solutionsSql } from '@/lib/solutions/server';
import { isSolutionId, readSolutionData, solutionErrors } from '@/lib/solutions/model';
import { failure, solutionBody } from '@/lib/solutions/http';
import { securityLimit } from '@/lib/auth/security';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';
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
      sql`DELETE FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} AND status='draft' AND published_data IS NULL RETURNING id`,
    ]);
    if (!result[0].length) return failure(t.draftNotFound, 404);
    if (!result[1].length) return failure(t.deleteOnlyNeverApproved, 409);
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
      if (body.question !== undefined && !isSolutionQuestion(body.question))
        return failure(t.invalidQuestion, 400);
      const data = readSolutionData(body.data);
      if (!data || !Number.isInteger(body.step) || Number(body.step) < 0 || Number(body.step) > 3)
        return failure(t.checkFields, 400);
      if (body.action === 'submit' && Object.keys(solutionErrors(data)).length)
        return failure(t.completeBeforeSubmit, 400);
      const question = body.question === undefined ? null : String(body.question);
      if (
        question &&
        solutionQuestions.find(item => item.id === question)?.phase !== Number(body.step)
      )
        return failure(t.stepMismatch, 400);
      const status = body.action === 'submit' ? 'pending' : 'draft';
      // Stored in solution_events and read by the Spanish-only ops backoffice too, so it
      // is persisted in the source locale rather than the requester's language.
      const message =
        body.action === 'submit' ? 'Postulación enviada a revisión.' : 'Borrador guardado.';
      const imageIds = (data.screenshots ?? []).map(image => image.id);
      const result = await sql.transaction([
        sql`SELECT id FROM founder_solutions WHERE id=${params.id} AND owner_id=${account.id} FOR UPDATE`,
        sql`WITH changed AS (UPDATE founder_solutions SET data=${JSON.stringify(data)}::jsonb,status=${status},step=${Number(body.step)},editor_question=${question},version=version+1,updated_at=now() WHERE id=${params.id} AND owner_id=${account.id} AND version=${Number(body.version)} AND status IN ('draft','changes_requested','published','rejected') AND (SELECT count(*) FROM solution_media WHERE solution_id=${params.id} AND id=ANY(${imageIds}::uuid[]))=${imageIds.length} RETURNING *), event AS (INSERT INTO solution_events(solution_id,status,message,actor_id) SELECT id,status,${message},${account.id} FROM changed WHERE ${body.action === 'submit'} RETURNING id) SELECT * FROM changed`,
      ]);
      rows = result[1];
      // Approving, rejecting or requesting changes happens only in the ops backoffice.
    } else return failure(t.invalidAction, 400);
    if (!rows.length) return failure(t.conflict, 409);
    return NextResponse.json(
      { ok: true, version: rows[0].version, status: rows[0].status },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(t.saveFailed, 503);
  }
}
