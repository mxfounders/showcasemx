import { getDb } from '../db';
import { iso } from '../http';

export const MAIL_FILTERS = ['problems', 'failed', 'queued', 'sent', 'all'] as const;
export type MailFilter = (typeof MAIL_FILTERS)[number];

export async function mailOverview(filter: MailFilter, page = 1, pageSize = 40) {
  const sql = getDb();
  const [rows, states, daily, inquiries] = await sql.transaction(
    [
      sql`
        SELECT n.id, n.category, n.title, n.email_state, n.attempts, n.next_attempt_at, n.locked_at, n.created_at,
          (n.provider_id IS NOT NULL) AS has_provider_id, a.id AS owner_id, a.email AS owner_email
        FROM account_notifications n JOIN auth_accounts a ON a.id = n.owner_id
        WHERE CASE ${filter}
          WHEN 'problems' THEN n.email_state IN ('failed', 'pending', 'sending')
          WHEN 'failed' THEN n.email_state = 'failed'
          WHEN 'queued' THEN n.email_state IN ('pending', 'sending')
          WHEN 'sent' THEN n.email_state = 'sent'
          ELSE true END
        ORDER BY n.email_state = 'failed' DESC, n.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`SELECT email_state, count(*)::int AS n FROM account_notifications GROUP BY email_state`,
      sql`
        WITH days AS (SELECT generate_series(current_date - 13, current_date, interval '1 day')::date AS day)
        SELECT d.day::text AS day,
          count(n.id) FILTER (WHERE n.email_state = 'sent')::int AS sent,
          count(n.id) FILTER (WHERE n.email_state = 'failed')::int AS failed
        FROM days d LEFT JOIN account_notifications n ON n.created_at::date = d.day
        GROUP BY d.day ORDER BY d.day
      `,
      sql`SELECT email_state, count(*)::int AS n FROM contact_inquiries GROUP BY email_state`,
    ],
    { readOnly: true },
  );
  const stateCounts: Record<string, number> = {};
  for (const row of states) stateCounts[String(row.email_state)] = Number(row.n);
  const inquiryStates: Record<string, number> = {};
  for (const row of inquiries)
    inquiryStates[String(row.email_state ?? 'desconocido')] = Number(row.n);
  return {
    page,
    hasMore: rows.length > pageSize,
    stateCounts,
    inquiryStates,
    daily: daily.map(r => ({ day: String(r.day), sent: Number(r.sent), failed: Number(r.failed) })),
    items: rows.slice(0, pageSize).map(r => ({
      id: String(r.id),
      category: String(r.category),
      title: String(r.title),
      emailState: String(r.email_state),
      attempts: Number(r.attempts),
      nextAttemptAt: iso(r.next_attempt_at),
      lockedAt: iso(r.locked_at),
      createdAt: iso(r.created_at),
      hasProviderId: Boolean(r.has_provider_id),
      ownerId: String(r.owner_id),
      ownerEmail: String(r.owner_email),
    })),
  };
}
