import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const INQUIRY_FILTERS = ['pending', 'handled', 'all'] as const;
export type InquiryFilter = (typeof INQUIRY_FILTERS)[number];

export async function listInquiries(options: {
  filter: InquiryFilter;
  q?: string;
  reason?: string;
  page?: number;
  pageSize?: number;
}) {
  const sql = getDb();
  const pageSize = options.pageSize ?? 30;
  const page = options.page ?? 1;
  const like = likePattern(options.q ?? '');
  const reason = options.reason?.trim() || null;
  const [rows, counts] = await sql.transaction(
    [
      sql`
        SELECT i.id, i.reason, i.name, i.email, i.organization, i.role, i.website, i.message, i.urgency,
          i.email_state, i.consent_version, i.created_at, i.handled_at, handler.email AS handled_by_email,
          (SELECT a.id FROM auth_accounts a WHERE a.email = lower(i.email) LIMIT 1) AS account_id
        FROM contact_inquiries i LEFT JOIN auth_accounts handler ON handler.id = i.handled_by
        WHERE CASE ${options.filter} WHEN 'pending' THEN i.handled_at IS NULL WHEN 'handled' THEN i.handled_at IS NOT NULL ELSE true END
          AND (${reason}::text IS NULL OR i.reason = ${reason})
          AND (${like}::text IS NULL OR lower(i.name) LIKE ${like} OR lower(i.email) LIKE ${like}
            OR lower(i.organization) LIKE ${like} OR lower(i.message) LIKE ${like})
        ORDER BY CASE WHEN i.handled_at IS NULL THEN 0 ELSE 1 END,
          CASE WHEN i.urgency = 'soon' THEN 0 WHEN i.urgency = 'month' THEN 1 ELSE 2 END,
          i.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`
        SELECT count(*) FILTER (WHERE handled_at IS NULL)::int AS pending,
          count(*) FILTER (WHERE handled_at IS NOT NULL)::int AS handled, count(*)::int AS all
        FROM contact_inquiries
      `,
    ],
    { readOnly: true },
  );
  const c = counts[0] ?? {};
  return {
    page,
    hasMore: rows.length > pageSize,
    counts: {
      pending: Number(c.pending ?? 0),
      handled: Number(c.handled ?? 0),
      all: Number(c.all ?? 0),
    } as Record<string, number>,
    items: rows.slice(0, pageSize).map(r => ({
      id: String(r.id),
      reason: String(r.reason),
      name: String(r.name),
      email: String(r.email),
      organization: String(r.organization ?? ''),
      role: r.role ? String(r.role) : null,
      website: r.website ? String(r.website) : null,
      message: String(r.message),
      urgency: String(r.urgency),
      emailState: String(r.email_state ?? ''),
      consentVersion: String(r.consent_version ?? ''),
      createdAt: iso(r.created_at),
      handledAt: iso(r.handled_at),
      handledByEmail: r.handled_by_email ? String(r.handled_by_email) : null,
      accountId: r.account_id ? String(r.account_id) : null,
    })),
  };
}
