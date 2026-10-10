import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { securityLimit } from '@/lib/auth/security';
import { solutionsSql } from '@/lib/solutions/server';
import { failure, solutionBody } from '@/lib/solutions/http';
import { isSolutionId } from '@/lib/solutions/model';
import { verificationDomain } from '@/lib/trust/domain';
import { conflictsWithWebsite, readReply, readReview, readReviewReport } from '@/lib/reviews/model';
import { cfdiStatus, readCfdiReceipt } from '@/lib/compliance/cfdi';
import { getDictionary } from '@/i18n/get-dictionary';
import { requestLocale } from '@/i18n/negotiate';

const ok = (data: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });

/**
 * Reviews of one published solution (docs/reviews.md).
 *
 * - save: write or edit your own review. The id comes from the client so a retried
 *   submit returns the same row; an edit carries `version` and loses to a newer one.
 * - delete: remove your own review.
 * - reply: the owner's public answer ('' removes it). The owner can never delete or
 *   edit a review — only ops can hide one, with a reason.
 * - report: flag someone else's public review for ops.
 * - prove: back your own review with a receipt from the vendor, checked with a public
 *   authority. Mexico: a CFDI issued by the vendor's declared RFC that the SAT reports as
 *   vigente. Only the outcome and a hash of the receipt's UUID are kept.
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
    const reviewId = body?.reviewId;
    if (
      !body ||
      typeof body.action !== 'string' ||
      typeof reviewId !== 'string' ||
      !isSolutionId(reviewId)
    )
      return failure(t.invalidRequest, 400);
    const sql = solutionsSql();

    if (body.action === 'save') {
      const parsed = readReview(body);
      if (!parsed.ok)
        return NextResponse.json(
          { error: t.fields[parsed.error.field], field: parsed.error.field },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      if (!(await securityLimit('solution-review', account.id, 10)))
        return failure(t.rateLimited, 429);
      const [target] =
        await sql`SELECT s.owner_id,s.published_data->>'website' AS website,split_part(a.email,'@',2) AS domain
          FROM founder_solutions s JOIN auth_accounts a ON a.id=${account.id}
          WHERE s.id=${id} AND s.published_data IS NOT NULL`;
      if (!target) return failure(t.unpublished, 409);
      if (String(target.owner_id) === account.id) return failure(t.own, 409);
      if (conflictsWithWebsite(String(target.domain), verificationDomain(target.website)))
        return failure(t.conflict, 409);
      const review = parsed.review;

      if (body.version === undefined) {
        // The SELECT re-checks publication and ownership inside the write, so a ficha
        // withdrawn between the read above and this insert takes no review.
        const [inserted] =
          await sql`INSERT INTO solution_reviews(id,solution_id,author_id,author_name,rating,recommends,headline,use_case,pros,cons,usage_duration,company_size,country)
            SELECT ${reviewId},s.id,${account.id},${review.name},${review.rating},${review.recommends},${review.headline},${review.useCase},${review.pros},${review.cons},${review.usageDuration},${review.companySize},${review.country}
            FROM founder_solutions s WHERE s.id=${id} AND s.published_data IS NOT NULL AND s.owner_id<>${account.id}
            ON CONFLICT DO NOTHING RETURNING id,version`;
        if (inserted) {
          revalidateTag('catalog');
          return ok({ id: inserted.id, version: Number(inserted.version), created: true });
        }
        // Nothing inserted: either this exact submit already landed (a retry) or the
        // person already reviewed this solution under another id.
        const [existing] =
          await sql`SELECT id,version FROM solution_reviews WHERE solution_id=${id} AND author_id=${account.id}`;
        if (existing && String(existing.id) === reviewId)
          return ok({ id: existing.id, version: Number(existing.version), created: false });
        return failure(existing ? t.alreadyReviewed : t.unpublished, 409);
      }

      if (!Number.isSafeInteger(body.version)) return failure(t.invalidRequest, 400);
      const [updated] =
        await sql`UPDATE solution_reviews SET author_name=${review.name},rating=${review.rating},recommends=${review.recommends},
          headline=${review.headline},use_case=${review.useCase},pros=${review.pros},cons=${review.cons},
          usage_duration=${review.usageDuration},company_size=${review.companySize},country=${review.country},
          version=version+1,updated_at=now()
          WHERE id=${reviewId} AND solution_id=${id} AND author_id=${account.id} AND version=${Number(body.version)}
          RETURNING id,version`;
      if (!updated) return failure(t.versionConflict, 409);
      revalidateTag('catalog');
      return ok({ id: updated.id, version: Number(updated.version), created: false });
    }

    if (body.action === 'delete') {
      const rows =
        await sql`DELETE FROM solution_reviews WHERE id=${reviewId} AND solution_id=${id} AND author_id=${account.id} RETURNING id`;
      if (!rows.length) return failure(t.notFound, 404);
      revalidateTag('catalog');
      return ok();
    }

    if (body.action === 'reply') {
      const reply = readReply(body.reply);
      if (reply === undefined) return failure(t.replyInvalid, 400);
      if (!(await securityLimit('solution-review-reply', account.id, 30)))
        return failure(t.rateLimited, 429);
      const rows =
        await sql`UPDATE solution_reviews r SET reply=${reply},reply_at=CASE WHEN ${reply}::text IS NULL THEN NULL ELSE now() END
          FROM founder_solutions s
          WHERE r.id=${reviewId} AND r.solution_id=${id} AND s.id=r.solution_id AND s.owner_id=${account.id}
          RETURNING r.reply_at`;
      if (!rows.length) return failure(t.notOwner, 403);
      return ok({ replyAt: rows[0].reply_at });
    }

    if (body.action === 'prove') {
      if (body.consent !== true) return failure(t.proofConsent, 400);
      const parsed = readCfdiReceipt(body);
      if (!parsed.ok)
        return NextResponse.json(
          { error: t.proofFields[parsed.field], field: parsed.field },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      if (!(await securityLimit('solution-review-proof', account.id, 5)))
        return failure(t.rateLimited, 429);
      const [target] = await sql`SELECT t.country, t.tax_id FROM solution_reviews r
          LEFT JOIN solution_tax_identities t ON t.solution_id = r.solution_id
          WHERE r.id=${reviewId} AND r.solution_id=${id} AND r.author_id=${account.id}`;
      if (!target) return failure(t.notFound, 404);
      if (target.country !== 'MX') return failure(t.proofUnavailable, 409);
      const receipt = parsed.receipt;
      if (receipt.issuer !== String(target.tax_id))
        return NextResponse.json(
          { error: t.issuerMismatch, field: 'issuer' },
          { status: 400, headers: { 'Cache-Control': 'no-store' } },
        );
      let status;
      try {
        status = await cfdiStatus(receipt);
      } catch {
        return failure(t.satUnavailable, 503);
      }
      if (status === 'cancelado') return failure(t.cfdiCancelled, 409);
      if (status === 'no_encontrado') return failure(t.cfdiNotFound, 409);
      const hash = createHash('sha256').update(`cfdi:${receipt.uuid}`).digest('hex');
      const [proof] = await sql`INSERT INTO solution_review_proofs (review_id, method, receipt_hash)
          SELECT id, 'cfdi', ${hash} FROM solution_reviews WHERE id=${reviewId} AND author_id=${account.id}
          ON CONFLICT DO NOTHING RETURNING review_id`;
      if (!proof) {
        // A retry of the same receipt for the same review is fine; anything else is not.
        const [same] =
          await sql`SELECT 1 FROM solution_review_proofs WHERE review_id=${reviewId} AND receipt_hash=${hash}`;
        if (!same) return failure(t.receiptUsed, 409);
      }
      revalidateTag('catalog');
      return ok({ level: 'customer' });
    }

    if (body.action === 'report') {
      const report = readReviewReport(body);
      if (!report) return failure(t.reportDetails, 400);
      if (!(await securityLimit('solution-review-report', account.id, 5)))
        return failure(t.reportRateLimited, 429);
      const rows =
        await sql`INSERT INTO solution_review_reports(review_id,solution_id,reporter_id,reason,details)
          SELECT r.id,r.solution_id,${account.id},${report.reason},${report.details} FROM solution_reviews r
          WHERE r.id=${reviewId} AND r.solution_id=${id} AND r.author_id<>${account.id} AND r.status='published'
          ON CONFLICT DO NOTHING RETURNING id`;
      return rows.length ? ok() : failure(t.reportConflict, 409);
    }

    return failure(t.invalidRequest, 400);
  } catch {
    return failure(t.saveFailed, 503);
  }
}
