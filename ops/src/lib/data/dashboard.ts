import { getDb } from '../db';
import { iso } from '../http';

export interface DayPoint {
  day: string;
  signups: number;
  contacts: number;
  publishes: number;
  views: number;
  clicks: number;
  [key: string]: string | number;
}

export async function dashboardData(user: { id: string; email: string }) {
  const sql = getDb();
  const started = Date.now();
  const [kpis, series, reviews, reports, inquiries, activity, logins] = await sql.transaction(
    [
      sql`
        SELECT
          (SELECT count(*) FROM auth_accounts)::int AS accounts,
          (SELECT count(*) FROM auth_accounts WHERE created_at >= now() - interval '7 days')::int AS accounts_7d,
          (SELECT count(*) FROM founder_solutions WHERE published_data IS NOT NULL)::int AS published,
          (SELECT count(*) FROM founder_solutions WHERE status = 'pending')::int AS pending,
          (SELECT min(updated_at) FROM founder_solutions WHERE status = 'pending') AS oldest_pending,
          (SELECT count(*) FROM contact_requests)::int AS contacts,
          (SELECT count(*) FROM contact_requests WHERE created_at >= now() - interval '7 days')::int AS contacts_7d,
          ((SELECT count(*) FROM solution_reports WHERE status = 'open')
            + (SELECT count(*) FROM community_reports WHERE status = 'open')
            + (SELECT count(*) FROM solution_review_reports WHERE status = 'open'))::int AS open_reports,
          (SELECT count(*) FROM contact_inquiries WHERE handled_at IS NULL)::int AS inquiries,
          (SELECT count(*) FROM account_notifications WHERE email_state = 'failed')::int AS mail_failed,
          (SELECT count(*) FROM account_notifications WHERE email_state IN ('pending', 'sending'))::int AS mail_queued,
          (SELECT count(*) FROM newsletter_subscribers WHERE unsubscribed_at IS NULL)::int AS subscribers,
          (SELECT count(*) FROM buyer_lists WHERE visibility = 'public')::int AS public_lists,
          (SELECT count(*) FROM storage_orphans WHERE attempts >= 5)::int AS dead_letters
      `,
      sql`
        WITH days AS (
          SELECT generate_series(current_date - 29, current_date, interval '1 day')::date AS day
        ), s AS (
          SELECT created_at::date AS day, count(*)::int AS n FROM auth_accounts
          WHERE created_at >= current_date - 29 GROUP BY 1
        ), c AS (
          SELECT created_at::date AS day, count(*)::int AS n FROM contact_requests
          WHERE created_at >= current_date - 29 GROUP BY 1
        ), p AS (
          SELECT created_at::date AS day, count(*)::int AS n FROM solution_events
          WHERE status = 'published' AND created_at >= current_date - 29 GROUP BY 1
        ), m AS (
          SELECT day, sum(views)::int AS views, sum(clicks)::int AS clicks FROM solution_daily_metrics
          WHERE day >= current_date - 29 GROUP BY day
        )
        SELECT d.day::text AS day, COALESCE(s.n, 0) AS signups, COALESCE(c.n, 0) AS contacts,
          COALESCE(p.n, 0) AS publishes, COALESCE(m.views, 0) AS views, COALESCE(m.clicks, 0) AS clicks
        FROM days d
        LEFT JOIN s ON s.day = d.day LEFT JOIN c ON c.day = d.day
        LEFT JOIN p ON p.day = d.day LEFT JOIN m ON m.day = d.day
        ORDER BY d.day
      `,
      sql`
        SELECT fs.id, COALESCE(fs.data->>'name', '(sin nombre)') AS name, fs.updated_at,
          a.email AS owner_email, (fs.published_data IS NOT NULL) AS has_published
        FROM founder_solutions fs JOIN auth_accounts a ON a.id = fs.owner_id
        WHERE fs.status = 'pending'
        ORDER BY fs.updated_at ASC LIMIT 5
      `,
      sql`
        SELECT * FROM (
          SELECT r.id, 'solution' AS kind, r.reason, r.created_at,
            COALESCE(s.published_data->>'name', s.data->>'name') AS subject
          FROM solution_reports r JOIN founder_solutions s ON s.id = r.solution_id
          WHERE r.status = 'open'
          UNION ALL
          SELECT r.id, 'community' AS kind, r.reason, r.created_at, l.name AS subject
          FROM community_reports r JOIN buyer_lists l ON l.id = r.list_id
          WHERE r.status = 'open'
          UNION ALL
          SELECT r.id, 'review' AS kind, r.reason, r.created_at,
            COALESCE(s.published_data->>'name', s.data->>'name') AS subject
          FROM solution_review_reports r JOIN founder_solutions s ON s.id = r.solution_id
          WHERE r.status = 'open'
        ) open_reports
        ORDER BY created_at ASC LIMIT 5
      `,
      sql`
        SELECT id, name, reason, urgency, created_at FROM contact_inquiries
        WHERE handled_at IS NULL ORDER BY created_at ASC LIMIT 5
      `,
      sql`
        SELECT id, actor_email, action, subject_type, subject_id, reason, created_at
        FROM ops_audit_log ORDER BY chain_seq DESC NULLS LAST, id DESC LIMIT 12
      `,
      sql`
        SELECT created_at, ip, metadata->>'device' AS device
        FROM ops_audit_log
        WHERE actor_id = ${user.id} AND action = 'login_success'
        ORDER BY chain_seq DESC NULLS LAST, id DESC LIMIT 2
      `,
    ],
    { readOnly: true },
  );

  const previous = logins[1] ?? null;
  let failedSincePrevious = 0;
  if (previous) {
    const [row] = await sql`
      SELECT count(*)::int AS n FROM ops_audit_log
      WHERE action IN ('login_failed', 'login_totp_failed')
        AND (subject_id = ${user.email} OR subject_id = ${user.id})
        AND created_at > ${previous.created_at as string}
    `;
    failedSincePrevious = Number(row?.n ?? 0);
  }

  const k = kpis[0] ?? {};
  return {
    elapsedMs: Date.now() - started,
    kpis: {
      accounts: Number(k.accounts ?? 0),
      accounts7d: Number(k.accounts_7d ?? 0),
      published: Number(k.published ?? 0),
      pending: Number(k.pending ?? 0),
      oldestPending: iso(k.oldest_pending),
      contacts: Number(k.contacts ?? 0),
      contacts7d: Number(k.contacts_7d ?? 0),
      openReports: Number(k.open_reports ?? 0),
      inquiries: Number(k.inquiries ?? 0),
      mailFailed: Number(k.mail_failed ?? 0),
      mailQueued: Number(k.mail_queued ?? 0),
      subscribers: Number(k.subscribers ?? 0),
      publicLists: Number(k.public_lists ?? 0),
      deadLetters: Number(k.dead_letters ?? 0),
    },
    series: series.map(r => ({
      day: String(r.day),
      signups: Number(r.signups),
      contacts: Number(r.contacts),
      publishes: Number(r.publishes),
      views: Number(r.views),
      clicks: Number(r.clicks),
    })) as DayPoint[],
    reviews: reviews.map(r => ({
      id: String(r.id),
      name: String(r.name),
      updatedAt: iso(r.updated_at),
      ownerEmail: String(r.owner_email),
      hasPublished: Boolean(r.has_published),
    })),
    reports: reports.map(r => ({
      id: String(r.id),
      kind: String(r.kind) as 'solution' | 'community' | 'review',
      reason: String(r.reason),
      createdAt: iso(r.created_at),
      subject: r.subject ? String(r.subject) : '(sin nombre)',
    })),
    inquiries: inquiries.map(r => ({
      id: String(r.id),
      name: String(r.name),
      reason: String(r.reason),
      urgency: String(r.urgency),
      createdAt: iso(r.created_at),
    })),
    activity: activity.map(r => ({
      id: String(r.id),
      actorEmail: String(r.actor_email),
      action: String(r.action),
      subjectType: String(r.subject_type),
      subjectId: String(r.subject_id),
      reason: String(r.reason ?? ''),
      createdAt: iso(r.created_at),
    })),
    previousLogin: previous
      ? {
          at: iso(previous.created_at),
          ip: previous.ip ? String(previous.ip) : null,
          device: previous.device ? String(previous.device) : null,
        }
      : null,
    failedSincePrevious,
  };
}
