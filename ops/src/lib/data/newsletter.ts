import { getDb } from '../db';
import { iso, likePattern } from '../http';
import { readContent, readSegment } from '../newsletter';

// «confirmed» receives campaigns; «pending» never confirmed (double opt-in, SHCWS-124),
// including every subscriber from before it existed; «unsubscribed» left (any reason).
export const NEWSLETTER_FILTERS = ['confirmed', 'pending', 'unsubscribed', 'all'] as const;
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
        SELECT n.email, n.consent_version, n.profile, n.role, n.locale, n.created_at, n.confirmed_at,
          n.confirm_sent_at, n.unsubscribed_at, n.unsubscribe_reason,
          a.id AS account_id, count(*) OVER () AS total
        FROM newsletter_subscribers n LEFT JOIN auth_accounts a ON a.email = n.email
        WHERE CASE ${options.filter}
            WHEN 'confirmed' THEN n.confirmed_at IS NOT NULL AND n.unsubscribed_at IS NULL
            WHEN 'pending' THEN n.confirmed_at IS NULL AND n.unsubscribed_at IS NULL
            WHEN 'unsubscribed' THEN n.unsubscribed_at IS NOT NULL ELSE true END
          AND (${like}::text IS NULL OR lower(n.email) LIKE ${like})
        ORDER BY n.created_at DESC
        LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}
      `,
      sql`
        SELECT count(*) FILTER (WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL)::int AS confirmed,
          count(*) FILTER (WHERE confirmed_at IS NULL AND unsubscribed_at IS NULL)::int AS pending,
          count(*) FILTER (WHERE confirmed_at IS NULL AND unsubscribed_at IS NULL AND confirm_sent_at IS NULL)::int AS never_asked,
          count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int AS unsubscribed,
          count(*) FILTER (WHERE unsubscribe_reason = 'bounce')::int AS bounced,
          count(*) FILTER (WHERE unsubscribe_reason = 'complaint')::int AS complained,
          count(*)::int AS all,
          count(*) FILTER (WHERE confirmed_at > now() - interval '30 days' AND unsubscribed_at IS NULL)::int AS new_30d,
          count(*) FILTER (WHERE unsubscribed_at > now() - interval '30 days')::int AS left_30d
        FROM newsletter_subscribers
      `,
      sql`SELECT COALESCE(profile, 'sin dato') AS key, count(*)::int AS n FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
      sql`SELECT COALESCE(role, 'sin dato') AS key, count(*)::int AS n FROM newsletter_subscribers WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL GROUP BY 1 ORDER BY 2 DESC`,
      sql`
        WITH days AS (SELECT generate_series(current_date - 89, current_date, interval '1 day')::date AS day)
        SELECT d.day::text AS day,
          (SELECT count(*)::int FROM newsletter_subscribers n
            WHERE n.confirmed_at::date <= d.day AND (n.unsubscribed_at IS NULL OR n.unsubscribed_at::date > d.day)) AS active
        FROM days d ORDER BY d.day
      `,
    ],
    { readOnly: true },
  );
  const t = totals[0] ?? {};
  const n = (key: string) => Number(t[key] ?? 0);
  return {
    page,
    pageSize,
    hasMore: rows.length > pageSize,
    total: rows.length ? Number(rows[0].total) : 0,
    totals: {
      confirmed: n('confirmed'),
      pending: n('pending'),
      neverAsked: n('never_asked'),
      unsubscribed: n('unsubscribed'),
      bounced: n('bounced'),
      complained: n('complained'),
      all: n('all'),
      new30d: n('new_30d'),
      left30d: n('left_30d'),
    },
    profiles: profiles.map(r => ({ key: String(r.key), n: Number(r.n) })),
    roles: roles.map(r => ({ key: String(r.key), n: Number(r.n) })),
    growth: growth.map(r => ({ day: String(r.day), active: Number(r.active) })),
    items: rows.slice(0, pageSize).map(r => ({
      email: String(r.email),
      consentVersion: String(r.consent_version),
      profile: r.profile ? String(r.profile) : null,
      role: r.role ? String(r.role) : null,
      locale: r.locale ? String(r.locale) : null,
      createdAt: iso(r.created_at),
      confirmedAt: iso(r.confirmed_at),
      confirmSentAt: iso(r.confirm_sent_at),
      unsubscribedAt: iso(r.unsubscribed_at),
      unsubscribeReason: r.unsubscribe_reason ? String(r.unsubscribe_reason) : null,
      accountId: r.account_id ? String(r.account_id) : null,
    })),
  };
}

function campaignSummary(r: Record<string, unknown>) {
  const content = readContent(r.content);
  return {
    id: String(r.id),
    kind: String(r.kind),
    week: r.week_text ? String(r.week_text) : null,
    status: String(r.status),
    subject: content.es.subject,
    version: Number(r.version),
    testedVersion: r.tested_version == null ? null : Number(r.tested_version),
    testedAt: iso(r.tested_at),
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    queuedAt: iso(r.queued_at),
    startedAt: iso(r.started_at),
    finishedAt: iso(r.finished_at),
    cancelledAt: iso(r.cancelled_at),
    recipients: Number(r.recipients ?? 0),
    sent: Number(r.sent ?? 0),
    failed: Number(r.failed ?? 0),
    delivered: Number(r.delivered ?? 0),
    bounced: Number(r.bounced ?? 0),
    complained: Number(r.complained ?? 0),
    unsubscribed: Number(r.unsubscribed ?? 0),
    clicks: Number(r.clicks ?? 0),
  };
}

/** Campaigns, newest first, with their aggregate results. Null when the migration is missing. */
export async function campaignList() {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT c.*, c.week::text AS week_text, COALESCE((SELECT sum(clicks) FROM newsletter_link_clicks l WHERE l.campaign_id = c.id), 0)::int AS clicks
      FROM newsletter_campaigns c ORDER BY c.created_at DESC LIMIT 100
    `;
    return rows.map(campaignSummary);
  } catch {
    return null;
  }
}

export async function campaignDetail(id: string) {
  const sql = getDb();
  const [rows, links, deliveries, creator] = await sql.transaction(
    [
      sql`SELECT c.*, c.week::text AS week_text, COALESCE((SELECT sum(clicks) FROM newsletter_link_clicks l WHERE l.campaign_id = c.id), 0)::int AS clicks
        FROM newsletter_campaigns c WHERE c.id = ${id}`,
      sql`SELECT link, url, clicks FROM newsletter_link_clicks WHERE campaign_id = ${id} ORDER BY clicks DESC, link`,
      sql`SELECT state, count(*)::int AS n FROM newsletter_deliveries WHERE campaign_id = ${id} GROUP BY state`,
      sql`SELECT
          (SELECT email FROM auth_accounts WHERE id = c.created_by) AS created_by,
          (SELECT email FROM auth_accounts WHERE id = c.tested_by) AS tested_by,
          (SELECT email FROM auth_accounts WHERE id = c.queued_by) AS queued_by
        FROM newsletter_campaigns c WHERE c.id = ${id}`,
    ],
    { readOnly: true },
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...campaignSummary(row),
    content: readContent(row.content),
    segment: readSegment(row.segment),
    links: links.map(l => ({ link: Number(l.link), url: String(l.url), clicks: Number(l.clicks) })),
    states: Object.fromEntries(deliveries.map(d => [String(d.state), Number(d.n)])) as Record<
      string,
      number
    >,
    people: {
      createdBy: creator[0]?.created_by ? String(creator[0].created_by) : null,
      testedBy: creator[0]?.tested_by ? String(creator[0].tested_by) : null,
      queuedBy: creator[0]?.queued_by ? String(creator[0].queued_by) : null,
    },
  };
}

/** Confirmed subscribers a segment reaches now (same SQL function the product's worker uses). */
export async function segmentReach(segment: { profiles: string[]; roles: string[] }) {
  const [row] = await getDb()`
    SELECT count(*)::int AS n FROM newsletter_subscribers
    WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL
      AND newsletter_in_segment(profile, role, ${JSON.stringify(segment)}::jsonb)
  `;
  return Number(row?.n ?? 0);
}
