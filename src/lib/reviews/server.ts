import { solutionsSql } from '@/lib/solutions/server';
import {
  freeEmailDomains,
  freeEmailPattern,
  reviewLevel,
  type ReviewLevel,
  type ReviewUsageDuration,
} from './model';

export type PublicReview = {
  id: string;
  name: string;
  rating: number;
  recommends: boolean;
  headline: string;
  useCase: string;
  pros: string;
  cons: string;
  usageDuration: ReviewUsageDuration;
  companySize: string | null;
  country: string | null;
  level: ReviewLevel | 'unverified';
  createdAt: string;
  edited: boolean;
  reply: { body: string; at: string } | null;
  mine: boolean;
  /** Only on the viewer's own review: the version to edit and why it is not public. */
  own?: { version: number; hiddenReason: string | null };
};

export type ReviewSummary = {
  count: number;
  average: number | null;
  /** Reviews per star, index 0 = one star. */
  distribution: [number, number, number, number, number];
  recommends: number;
  /** Each review counts once, at its highest level: `work` excludes proven purchases. */
  work: number;
  /** Reviews backed by a checked receipt. */
  customers: number;
};

export const emptyReviewSummary: ReviewSummary = {
  count: 0,
  average: null,
  distribution: [0, 0, 0, 0, 0],
  recommends: 0,
  work: 0,
  customers: 0,
};

/**
 * Reviews shown on a ficha: the public ones — published, from a verified address — plus
 * the viewer's own whatever its state, so they can see it is waiting for verification
 * or was hidden and why. The author's email domain is read to compute the level and
 * never leaves the server.
 */
export async function getSolutionReviews(
  solutionId: string,
  viewer = '',
): Promise<{ summary: ReviewSummary; reviews: PublicReview[] }> {
  const sql = solutionsSql();
  const viewerId = viewer || null;
  const [rows, [aggregate]] = await Promise.all([
    sql`SELECT r.id,r.author_name,r.rating,r.recommends,r.headline,r.use_case,r.pros,r.cons,
      r.usage_duration,r.company_size,r.country,r.status,r.hidden_reason,r.reply,r.reply_at,
      r.version,r.created_at,r.updated_at,r.author_id=${viewerId}::uuid AS mine,
      split_part(a.email,'@',2) AS domain,a.email_verified_at IS NOT NULL AS verified,
      EXISTS(SELECT 1 FROM solution_review_proofs p WHERE p.review_id=r.id) AS proven
      FROM solution_reviews r JOIN auth_accounts a ON a.id=r.author_id
      JOIN founder_solutions s ON s.id=r.solution_id
      WHERE r.solution_id=${solutionId} AND r.author_id<>s.owner_id
        AND ((r.status='published' AND a.email_verified_at IS NOT NULL) OR r.author_id=${viewerId}::uuid)
      ORDER BY (r.author_id=${viewerId}::uuid) DESC,r.created_at DESC,r.id LIMIT 100`,
    sql`SELECT count(*)::int AS count,avg(r.rating)::float AS average,
      count(*) FILTER (WHERE r.recommends)::int AS recommends,
      count(*) FILTER (WHERE r.rating=1)::int AS s1,count(*) FILTER (WHERE r.rating=2)::int AS s2,
      count(*) FILTER (WHERE r.rating=3)::int AS s3,count(*) FILTER (WHERE r.rating=4)::int AS s4,
      count(*) FILTER (WHERE r.rating=5)::int AS s5,
      count(*) FILTER (WHERE split_part(a.email,'@',2)<>ALL(${freeEmailDomains as readonly string[]}::text[])
        AND split_part(a.email,'@',2)!~${freeEmailPattern}
        AND NOT EXISTS(SELECT 1 FROM solution_review_proofs p WHERE p.review_id=r.id))::int AS work,
      count(*) FILTER (WHERE EXISTS(SELECT 1 FROM solution_review_proofs p WHERE p.review_id=r.id))::int AS customers
      FROM solution_reviews r JOIN auth_accounts a ON a.id=r.author_id
      JOIN founder_solutions s ON s.id=r.solution_id
      WHERE r.solution_id=${solutionId} AND r.status='published'
        AND a.email_verified_at IS NOT NULL AND r.author_id<>s.owner_id`,
  ]);
  const summary: ReviewSummary = aggregate
    ? {
        count: Number(aggregate.count),
        average: aggregate.average == null ? null : Number(aggregate.average),
        distribution: [
          Number(aggregate.s1),
          Number(aggregate.s2),
          Number(aggregate.s3),
          Number(aggregate.s4),
          Number(aggregate.s5),
        ],
        recommends: Number(aggregate.recommends),
        work: Number(aggregate.work),
        customers: Number(aggregate.customers),
      }
    : emptyReviewSummary;
  const reviews = rows.map(row => {
    const mine = Boolean(row.mine);
    const created = new Date(row.created_at);
    return {
      id: String(row.id),
      name: String(row.author_name),
      rating: Number(row.rating),
      recommends: Boolean(row.recommends),
      headline: String(row.headline),
      useCase: String(row.use_case),
      pros: String(row.pros),
      cons: String(row.cons),
      usageDuration: row.usage_duration as ReviewUsageDuration,
      companySize: row.company_size ? String(row.company_size) : null,
      country: row.country ? String(row.country) : null,
      level: reviewLevel(String(row.domain), Boolean(row.verified), Boolean(row.proven)),
      createdAt: created.toISOString(),
      // A minute of slack so the first save never reads as an edit.
      edited: new Date(row.updated_at).getTime() - created.getTime() > 60_000,
      reply: row.reply
        ? { body: String(row.reply), at: new Date(row.reply_at).toISOString() }
        : null,
      mine,
      ...(mine && {
        own: {
          version: Number(row.version),
          hiddenReason: row.status === 'hidden' ? String(row.hidden_reason) : null,
        },
      }),
    } satisfies PublicReview;
  });
  return { summary, reviews };
}

/** What the owner needs on their own listing page: public count, average and unanswered. */
export async function getOwnerReviewDigest(solutionId: string) {
  const sql = solutionsSql();
  const [row] = await sql`SELECT count(*)::int AS count, avg(r.rating)::float AS average,
      count(*) FILTER (WHERE r.reply IS NULL)::int AS unanswered
    FROM solution_reviews r JOIN auth_accounts a ON a.id=r.author_id
    JOIN founder_solutions s ON s.id=r.solution_id
    WHERE r.solution_id=${solutionId} AND r.status='published'
      AND a.email_verified_at IS NOT NULL AND r.author_id<>s.owner_id`;
  return {
    count: Number(row?.count ?? 0),
    average: row?.average == null ? null : Number(row.average),
    unanswered: Number(row?.unanswered ?? 0),
  };
}
