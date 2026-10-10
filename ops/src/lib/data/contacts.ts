import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const CONTACT_STATUSES = ['all', 'new', 'conversation', 'closed', 'withdrawn'] as const;
export type ContactStatusFilter = (typeof CONTACT_STATUSES)[number];

/**
 * Contact requests as metadata only: who, which project, which state, when.
 * details (what the buyer wrote) and contact_events.message are never selected.
 */
export async function listContacts(options: {
  status: ContactStatusFilter;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const sql = getDb();
  const pageSize = options.pageSize ?? 30;
  const page = options.page ?? 1;
  const like = likePattern(options.q ?? '');
  const [rows, counts, series] = await sql.transaction(
    [
      sql`
        SELECT cr.id, cr.status, cr.project_name, cr.solution_id, cr.created_at, cr.updated_at, cr.consent_version,
          cr.buyer_id, buyer.email AS buyer_email, cr.recipient_id, recipient.email AS recipient_email,
          (SELECT count(*)::int FROM contact_events ce WHERE ce.request_id = cr.id) AS event_count,
          (SELECT max(ce.created_at) FROM contact_events ce WHERE ce.request_id = cr.id) AS last_event_at,
          count(*) OVER () AS total
        FROM contact_requests cr
        LEFT JOIN auth_accounts buyer ON buyer.id = cr.buyer_id
        LEFT JOIN auth_accounts recipient ON recipient.id = cr.recipient_id
        WHERE (${options.status}::text = 'all' OR cr.status = ${options.status})
          AND (${like}::text IS NULL OR lower(cr.project_name) LIKE ${like}
            OR lower(COALESCE(buyer.email, cr.buyer_email)) LIKE ${like} OR lower(COALESCE(recipient.email, '')) LIKE ${like})
        ORDER BY cr.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`SELECT status, count(*)::int AS n FROM contact_requests GROUP BY status`,
      sql`
        WITH days AS (SELECT generate_series(current_date - 29, current_date, interval '1 day')::date AS day)
        SELECT d.day::text AS day, count(cr.id)::int AS requests
        FROM days d LEFT JOIN contact_requests cr ON cr.created_at::date = d.day
        GROUP BY d.day ORDER BY d.day
      `,
    ],
    { readOnly: true },
  );
  const statusCounts: Record<string, number> = { all: 0 };
  for (const row of counts) {
    statusCounts[String(row.status)] = Number(row.n);
    statusCounts.all += Number(row.n);
  }
  return {
    page,
    pageSize,
    hasMore: rows.length > pageSize,
    total: rows.length ? Number(rows[0].total) : 0,
    statusCounts,
    series: series.map(r => ({ day: String(r.day), requests: Number(r.requests) })),
    items: rows.slice(0, pageSize).map(r => ({
      id: String(r.id),
      status: String(r.status),
      projectName: String(r.project_name),
      solutionId: String(r.solution_id),
      createdAt: iso(r.created_at),
      updatedAt: iso(r.updated_at),
      consentVersion: String(r.consent_version ?? ''),
      buyerId: r.buyer_id ? String(r.buyer_id) : null,
      buyerEmail: r.buyer_email ? String(r.buyer_email) : null,
      recipientId: r.recipient_id ? String(r.recipient_id) : null,
      recipientEmail: r.recipient_email ? String(r.recipient_email) : null,
      eventCount: Number(r.event_count),
      lastEventAt: iso(r.last_event_at),
    })),
  };
}

/** State transitions of one request, without any message text. */
export async function contactTimeline(id: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT ce.id, ce.status, ce.created_at, a.email AS actor_email
    FROM contact_events ce LEFT JOIN auth_accounts a ON a.id = ce.actor_id
    WHERE ce.request_id = ${id} ORDER BY ce.created_at ASC, ce.id ASC LIMIT 100
  `;
  return rows.map(r => ({
    id: String(r.id),
    status: String(r.status),
    createdAt: iso(r.created_at),
    actorEmail: r.actor_email ? String(r.actor_email) : null,
  }));
}
