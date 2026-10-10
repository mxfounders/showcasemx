import { getDb } from '../db';
import { iso } from '../http';

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed', 'all'] as const;
export type ReportStatusFilter = (typeof REPORT_STATUSES)[number];

export async function listSolutionReports(status: ReportStatusFilter, page = 1, pageSize = 30) {
  const sql = getDb();
  const rows = await sql`
    SELECT r.id, r.reason, r.details, r.status, r.decision, r.created_at, r.resolved_at, r.version,
      r.solution_id, COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name,
      s.status AS solution_status, (s.published_data IS NOT NULL) AS solution_published,
      owner.id AS owner_id, owner.email AS owner_email, reporter.email AS reporter_email, reviewer.email AS reviewer_email,
      (SELECT count(*)::int FROM solution_reports o WHERE o.solution_id = r.solution_id AND o.status = 'open') AS open_on_solution
    FROM solution_reports r
    JOIN founder_solutions s ON s.id = r.solution_id
    JOIN auth_accounts owner ON owner.id = s.owner_id
    LEFT JOIN auth_accounts reporter ON reporter.id = r.reporter_id
    LEFT JOIN auth_accounts reviewer ON reviewer.id = r.reviewer_id
    WHERE (${status}::text = 'all' OR r.status = ${status})
    ORDER BY CASE WHEN r.status = 'open' THEN r.created_at END ASC, r.created_at DESC
    LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
  `;
  return {
    hasMore: rows.length > pageSize,
    page,
    items: rows.slice(0, pageSize).map(r => ({
      id: String(r.id),
      reason: String(r.reason),
      details: String(r.details ?? ''),
      status: String(r.status),
      decision: r.decision ? String(r.decision) : null,
      createdAt: iso(r.created_at),
      resolvedAt: iso(r.resolved_at),
      version: Number(r.version),
      solutionId: String(r.solution_id),
      solutionName: r.solution_name ? String(r.solution_name) : '(retirada)',
      solutionStatus: String(r.solution_status),
      solutionPublished: Boolean(r.solution_published),
      ownerId: String(r.owner_id),
      ownerEmail: String(r.owner_email),
      reporterEmail: r.reporter_email ? String(r.reporter_email) : null,
      reviewerEmail: r.reviewer_email ? String(r.reviewer_email) : null,
      openOnSolution: Number(r.open_on_solution),
    })),
  };
}

export async function listCommunityReports(status: ReportStatusFilter, page = 1, pageSize = 30) {
  const sql = getDb();
  const rows = await sql`
    SELECT r.id, r.subject_type, r.reason, r.details, r.status, r.decision, r.created_at, r.resolved_at, r.version,
      r.list_id, l.name AS list_name, l.curator_name, l.visibility AS list_visibility,
      owner.id AS owner_id, owner.email AS owner_email,
      r.comment_id, c.body AS comment_body, c.author_name AS comment_author_name, author.email AS comment_author_email,
      reporter.email AS reporter_email, reviewer.email AS reviewer_email
    FROM community_reports r
    JOIN buyer_lists l ON l.id = r.list_id
    JOIN auth_accounts owner ON owner.id = l.owner_id
    LEFT JOIN community_list_comments c ON c.id = r.comment_id
    LEFT JOIN auth_accounts author ON author.id = c.author_id
    LEFT JOIN auth_accounts reporter ON reporter.id = r.reporter_id
    LEFT JOIN auth_accounts reviewer ON reviewer.id = r.reviewer_id
    WHERE (${status}::text = 'all' OR r.status = ${status})
    ORDER BY CASE WHEN r.status = 'open' THEN r.created_at END ASC, r.created_at DESC
    LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
  `;
  return {
    hasMore: rows.length > pageSize,
    page,
    items: rows.slice(0, pageSize).map(r => ({
      id: String(r.id),
      subjectType: String(r.subject_type),
      reason: String(r.reason),
      details: String(r.details ?? ''),
      status: String(r.status),
      decision: r.decision ? String(r.decision) : null,
      createdAt: iso(r.created_at),
      resolvedAt: iso(r.resolved_at),
      version: Number(r.version),
      listId: String(r.list_id),
      listName: String(r.list_name),
      listVisibility: String(r.list_visibility),
      curatorName: r.curator_name ? String(r.curator_name) : '',
      ownerId: String(r.owner_id),
      ownerEmail: String(r.owner_email),
      commentId: r.comment_id ? String(r.comment_id) : null,
      commentBody: r.comment_body ? String(r.comment_body) : null,
      commentAuthorName: r.comment_author_name ? String(r.comment_author_name) : null,
      commentAuthorEmail: r.comment_author_email ? String(r.comment_author_email) : null,
      reporterEmail: r.reporter_email ? String(r.reporter_email) : null,
      reviewerEmail: r.reviewer_email ? String(r.reviewer_email) : null,
    })),
  };
}

/**
 * Reports on product reviews (db/solution-reviews.sql). The review row may be gone —
 * its author can delete it — so every review column is nullable here.
 */
export async function listReviewReports(status: ReportStatusFilter, page = 1, pageSize = 30) {
  const sql = getDb();
  const rows = await sql`
    SELECT r.id, r.reason, r.details, r.status, r.decision, r.created_at, r.resolved_at, r.version,
      r.solution_id, COALESCE(s.published_data->>'name', s.data->>'name') AS solution_name,
      r.review_id, v.headline, v.rating, v.use_case, v.pros, v.cons, v.author_name, v.status AS review_status,
      v.hidden_reason, author.id AS author_id, author.email AS author_email,
      reporter.email AS reporter_email, (r.reporter_id = s.owner_id) AS reported_by_owner,
      reviewer.email AS reviewer_email
    FROM solution_review_reports r
    JOIN founder_solutions s ON s.id = r.solution_id
    LEFT JOIN solution_reviews v ON v.id = r.review_id
    LEFT JOIN auth_accounts author ON author.id = v.author_id
    LEFT JOIN auth_accounts reporter ON reporter.id = r.reporter_id
    LEFT JOIN auth_accounts reviewer ON reviewer.id = r.reviewer_id
    WHERE (${status}::text = 'all' OR r.status = ${status})
    ORDER BY CASE WHEN r.status = 'open' THEN r.created_at END ASC, r.created_at DESC
    LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
  `;
  return {
    hasMore: rows.length > pageSize,
    page,
    items: rows.slice(0, pageSize).map(r => ({
      id: String(r.id),
      reason: String(r.reason),
      details: String(r.details ?? ''),
      status: String(r.status),
      decision: r.decision ? String(r.decision) : null,
      createdAt: iso(r.created_at),
      resolvedAt: iso(r.resolved_at),
      version: Number(r.version),
      solutionId: String(r.solution_id),
      solutionName: r.solution_name ? String(r.solution_name) : '(sin nombre)',
      review: r.review_id
        ? {
            id: String(r.review_id),
            headline: String(r.headline),
            rating: Number(r.rating),
            useCase: String(r.use_case),
            pros: String(r.pros),
            cons: String(r.cons),
            authorName: String(r.author_name),
            authorId: r.author_id ? String(r.author_id) : null,
            authorEmail: r.author_email ? String(r.author_email) : null,
            hidden: r.review_status === 'hidden',
            hiddenReason: r.hidden_reason ? String(r.hidden_reason) : null,
          }
        : null,
      reporterEmail: r.reporter_email ? String(r.reporter_email) : null,
      reportedByOwner: Boolean(r.reported_by_owner),
      reviewerEmail: r.reviewer_email ? String(r.reviewer_email) : null,
    })),
  };
}

export async function reportCounts() {
  const sql = getDb();
  const [row] = await sql`
    SELECT
      (SELECT count(*)::int FROM solution_reports WHERE status = 'open') AS solution_open,
      (SELECT count(*)::int FROM community_reports WHERE status = 'open') AS community_open,
      (SELECT count(*)::int FROM solution_review_reports WHERE status = 'open') AS review_open,
      (SELECT count(*)::int FROM solution_reports) AS solution_all,
      (SELECT count(*)::int FROM community_reports) AS community_all,
      (SELECT count(*)::int FROM solution_review_reports) AS review_all
  `;
  return {
    solutionOpen: Number(row?.solution_open ?? 0),
    communityOpen: Number(row?.community_open ?? 0),
    solutionAll: Number(row?.solution_all ?? 0),
    communityAll: Number(row?.community_all ?? 0),
    reviewOpen: Number(row?.review_open ?? 0),
    reviewAll: Number(row?.review_all ?? 0),
  };
}
