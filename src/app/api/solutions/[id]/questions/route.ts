import { NextRequest, NextResponse, after } from 'next/server';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { readAnswer, readQuestion, readQuestionReport } from '@/lib/questions/model';
import { deliverNotifications } from '@/lib/notifications/server';
import { captureServerEvent } from '@/lib/analytics/server';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * Public questions on one published listing (SHCWS-57, db/solution-questions.sql).
 *
 * - ask: a verified account other than the owner asks under an alias. The id comes from
 *   the client, so a retried submit returns the same row. The owner hears about it by
 *   email through their listing notices, sent right away.
 * - delete: the author removes their own question.
 * - answer: the owner's public answer ('' removes it). The owner can never edit or delete
 *   someone else's question; only ops hides one.
 * - report: anyone signed in but the author flags a visible question for ops.
 */
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const t = (await getDictionary(requestLocale(request))).questions.errors;
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return failure(t.foreignOrigin, 403);
  const { id } = await props.params;
  if (!isSolutionId(id)) return failure(t.invalidRequest, 400);
  try {
    const account = await getSession(request.cookies.get(sessionCookie)?.value);
    if (!account) return failure(t.signIn, 401);
    const body = await solutionBody(request);
    const questionId = body?.questionId;
    if (
      !body ||
      typeof body.action !== 'string' ||
      typeof questionId !== 'string' ||
      !isSolutionId(questionId)
    )
      return failure(t.invalidRequest, 400);
    const sql = solutionsSql();

    if (body.action === 'ask') {
      const parsed = readQuestion(body);
      if (!parsed.ok)
        return NextResponse.json(
          { error: t.fields[parsed.field], field: parsed.field },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      if (!(await securityLimit('solution-question', account.id, 10)))
        return failure(t.rateLimited, 429);
      // Publication, ownership and a verified address are checked inside the insert.
      const [inserted] =
        await sql`INSERT INTO solution_questions(id,solution_id,author_id,author_name,body)
          SELECT ${questionId},s.id,a.id,${parsed.name},${parsed.body}
          FROM founder_solutions s JOIN auth_accounts a ON a.id=${account.id}
          WHERE s.id=${id} AND s.published_data IS NOT NULL AND s.owner_id<>a.id
            AND a.email_verified_at IS NOT NULL
          ON CONFLICT DO NOTHING RETURNING id`;
      if (inserted) {
        captureServerEvent(request, account.id, 'question_asked');
        const [notice] =
          await sql`SELECT id FROM account_notifications WHERE source_key=${'question:' + questionId} AND email_state='pending'`;
        if (notice)
          after(() => deliverNotifications({ ids: [String(notice.id)] }).catch(() => undefined));
        return ok({ id: questionId, created: true });
      }
      const [state] = await sql`SELECT
          (SELECT author_id FROM solution_questions WHERE id=${questionId}) AS author,
          s.owner_id,s.published_data IS NOT NULL AS published,a.email_verified_at IS NOT NULL AS verified
        FROM founder_solutions s JOIN auth_accounts a ON a.id=${account.id} WHERE s.id=${id}`;
      if (state?.author && String(state.author) === account.id)
        return ok({ id: questionId, created: false });
      if (!state?.published) return failure(t.unpublished, 409);
      if (String(state.owner_id) === account.id) return failure(t.own, 409);
      if (!state.verified) return failure(t.verify, 403);
      return failure(t.invalidRequest, 409);
    }

    if (body.action === 'delete') {
      const rows =
        await sql`DELETE FROM solution_questions WHERE id=${questionId} AND solution_id=${id} AND author_id=${account.id} RETURNING id`;
      return rows.length ? ok() : failure(t.notFound, 404);
    }

    if (body.action === 'answer') {
      const answer = readAnswer(body.answer);
      if (answer === undefined) return failure(t.answerInvalid, 400);
      if (!(await securityLimit('solution-question-answer', account.id, 30)))
        return failure(t.rateLimited, 429);
      const rows =
        await sql`UPDATE solution_questions q SET answer=${answer},answered_at=CASE WHEN ${answer}::text IS NULL THEN NULL ELSE now() END
          FROM founder_solutions s
          WHERE q.id=${questionId} AND q.solution_id=${id} AND s.id=q.solution_id AND s.owner_id=${account.id}
            AND s.published_data IS NOT NULL
          RETURNING q.answered_at`;
      if (!rows.length) return failure(t.notOwner, 403);
      captureServerEvent(request, account.id, answer ? 'question_answered' : 'answer_removed');
      return ok({ answeredAt: rows[0].answered_at });
    }

    if (body.action === 'report') {
      const report = readQuestionReport(body);
      if (!report) return failure(t.reportDetails, 400);
      if (!(await securityLimit('solution-question-report', account.id, 5)))
        return failure(t.reportRateLimited, 429);
      const rows =
        await sql`INSERT INTO solution_question_reports(question_id,solution_id,reporter_id,reason,details)
          SELECT q.id,q.solution_id,${account.id},${report.reason},${report.details} FROM solution_questions q
          WHERE q.id=${questionId} AND q.solution_id=${id} AND q.author_id<>${account.id} AND q.hidden_at IS NULL
          ON CONFLICT DO NOTHING RETURNING id`;
      return rows.length ? ok() : failure(t.reportConflict, 409);
    }

    return failure(t.invalidRequest, 400);
  } catch {
    return failure(t.saveFailed, 503);
  }
}
