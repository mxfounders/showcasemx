import { getDb } from '../db';
import { iso, likePattern } from '../http';

export const NEWSLETTER_FILTERS = ['active', 'unsubscribed', 'all'] as const;
export type NewsletterFilter = (typeof NEWSLETTER_FILTERS)[number];

export async function newsletterOverview(options: {
  filter: NewsletterFilter;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const sql = getDb();
  const pageSize = options.pageSize ?? 50;
  const page = options.page ?? 1;
  const like = likePattern(options.q ?? '');
  const [rows, totals, profiles, roles, growth] = await sql.transaction(
    [
      sql`
        SELECT n.email, n.consent_version, n.profile, n.role, n.created_at, n.unsubscribed_at,
          a.id AS account_id, count(*) OVER () AS total
        FROM newsletter_subscribers n LEFT JOIN auth_accounts a ON a.email = n.email
        WHERE CASE ${options.filter} WHEN 'active' THEN n.unsubscribed_at IS NULL
          WHEN 'unsubscribed' THEN n.unsubscribed_at IS NOT NULL ELSE true END
          AND (${like}::text IS NULL OR lower(n.email) LIKE ${like})
        ORDER BY n.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`
        SELECT count(*) FILTER (WHERE unsubscribed_at IS NULL)::int AS active,
          count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int AS unsubscribed,
          count(*)::int AS all,
          count(*) FILTER (WHERE created_at > now() - interval '30 days' AND unsubscribed_at IS NULL)::int AS new_30d,
          count(*) FILTER (WHERE unsubscribed_at > now() - interval '30 days')::int AS left_30d
        FROM newsletter_subscribers
      `,
      sql`SELECT COALESCE(profile, 'sin dato') AS key, count(*)::int AS n FROM newsletter_subscribers WHERE unsubscribed_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
      sql`SELECT COALESCE(role, 'sin dato') AS key, count(*)::int AS n FROM newsletter_subscribers WHERE unsubscribed_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
      sql`
        WITH days AS (SELECT generate_series(current_date - 89, current_date, interval '1 day')::date AS day)
        SELECT d.day::text AS day,
          (SELECT count(*)::int FROM newsletter_subscribers n
            WHERE n.created_at::date <= d.day AND (n.unsubscribed_at IS NULL OR n.unsubscribed_at::date > d.day)) AS active
        FROM days d ORDER BY d.day
      `,
    ],
    { readOnly: true },
  );
  const t = totals[0] ?? {};
  return {
    page,
    pageSize,
    hasMore: rows.length > pageSize,
    total: rows.length ? Number(rows[0].total) : 0,
    totals: {
      active: Number(t.active ?? 0),
      unsubscribed: Number(t.unsubscribed ?? 0),
      all: Number(t.all ?? 0),
      new30d: Number(t.new_30d ?? 0),
      left30d: Number(t.left_30d ?? 0),
    } as Record<string, number>,
    profiles: profiles.map(r => ({ key: String(r.key), n: Number(r.n) })),
    roles: roles.map(r => ({ key: String(r.key), n: Number(r.n) })),
    growth: growth.map(r => ({ day: String(r.day), active: Number(r.active) })),
    items: rows.slice(0, pageSize).map(r => ({
      email: String(r.email),
      consentVersion: String(r.consent_version),
      profile: r.profile ? String(r.profile) : null,
      role: r.role ? String(r.role) : null,
      createdAt: iso(r.created_at),
      unsubscribedAt: iso(r.unsubscribed_at),
      accountId: r.account_id ? String(r.account_id) : null,
    })),
  };
}
