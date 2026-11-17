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

export const OUTCOME_VALUES = ['under_1k', '1k_5k', '5k_25k', '25k_100k', 'over_100k'] as const;

/**
 * What founders recorded when closing opportunities (SHCWS-22), as totals only. The
 * outcome of one request is the founder's private record: no query here returns it per
 * request, and nothing is ever joined to a buyer or a project. Returns null when the
 * columns don't exist yet (db/contact-outcomes.sql not applied), so the page still loads.
 */
export async function contactOutcomeTotals() {
  const sql = getDb();
  try {
    const rows = await sql`
      SELECT outcome, outcome_value, count(*)::int AS n FROM contact_requests
      WHERE status = 'closed' GROUP BY outcome, outcome_value
    `;
    const totals = {
      won: 0,
      lost: 0,
      notFit: 0,
      unrecorded: 0,
      values: Object.fromEntries(OUTCOME_VALUES.map(key => [key, 0])) as Record<
        (typeof OUTCOME_VALUES)[number],
        number
      >,
    };
    for (const row of rows) {
      const n = Number(row.n);
      if (row.outcome === 'won') {
        totals.won += n;
        const value = String(row.outcome_value) as (typeof OUTCOME_VALUES)[number];
        if (OUTCOME_VALUES.includes(value)) totals.values[value] += n;
      } else if (row.outcome === 'lost') totals.lost += n;
      else if (row.outcome === 'not_fit') totals.notFit += n;
      else totals.unrecorded += n;
    }
    return totals;
  } catch {
    return null;
  }
}

export type ReplyStage = 'waiting' | 'reminded48h' | 'reminded5d' | 'unanswered';

/**
 * Requests the founder has not answered (SHCWS-61), as metadata only: project, founder,
 * status, dates, days without reply and which reminders the daily pass sent. «No reply»
 * means the recipient never wrote anything in the request (no message, no status
 * change). Lists open requests older than 48 hours and those marked «sin respuesta»
 * (contact_requests.unanswered_at, which stay listed after a withdrawal), longest wait
 * first. Never details, messages or the buyer. Returns null when
 * db/contact-reminders.sql is not applied yet, so the page still loads.
 */
export async function awaitingReply(limit = 50) {
  const sql = getDb();
  try {
    const [rows, totals] = await sql.transaction(
      [
        sql`
          SELECT cr.id, cr.project_name, cr.solution_id, cr.status, cr.created_at, cr.unanswered_at,
            cr.recipient_id, recipient.email AS recipient_email,
            EXISTS (SELECT 1 FROM account_notifications n WHERE n.source_key = 'contact-reminder:' || cr.id || ':48h') AS reminded_48h,
            EXISTS (SELECT 1 FROM account_notifications n WHERE n.source_key = 'contact-reminder:' || cr.id || ':5d') AS reminded_5d,
            floor(extract(epoch FROM now() - cr.created_at) / 86400)::int AS days,
            count(*) OVER () AS total
          FROM contact_requests cr
          LEFT JOIN auth_accounts recipient ON recipient.id = cr.recipient_id
          WHERE NOT EXISTS (SELECT 1 FROM contact_events ce WHERE ce.request_id = cr.id AND ce.actor_id = cr.recipient_id)
            AND (cr.unanswered_at IS NOT NULL OR (cr.status = 'new' AND cr.created_at < now() - interval '48 hours'))
          ORDER BY cr.created_at ASC
          LIMIT ${limit}
        `,
        sql`
          SELECT
            count(*) FILTER (WHERE cr.unanswered_at IS NOT NULL AND NOT r.replied)::int AS ignored,
            count(*) FILTER (WHERE cr.unanswered_at > now() - interval '30 days')::int AS marked_30d,
            count(*) FILTER (WHERE cr.unanswered_at IS NOT NULL AND r.replied)::int AS answered_late
          FROM contact_requests cr
          CROSS JOIN LATERAL (SELECT EXISTS (SELECT 1 FROM contact_events ce
            WHERE ce.request_id = cr.id AND ce.actor_id = cr.recipient_id) AS replied) r
          WHERE cr.unanswered_at IS NOT NULL
        `,
      ],
      { readOnly: true },
    );
    const stage = (r: Record<string, unknown>): ReplyStage =>
      r.unanswered_at
        ? 'unanswered'
        : r.reminded_5d
          ? 'reminded5d'
          : r.reminded_48h
            ? 'reminded48h'
            : 'waiting';
    return {
      total: rows.length ? Number(rows[0].total) : 0,
      totals: {
        ignored: Number(totals[0]?.ignored ?? 0),
        marked30d: Number(totals[0]?.marked_30d ?? 0),
        answeredLate: Number(totals[0]?.answered_late ?? 0),
      },
      items: rows.map(r => ({
        id: String(r.id),
        projectName: String(r.project_name),
        solutionId: String(r.solution_id),
        status: String(r.status),
        createdAt: iso(r.created_at),
        unansweredAt: iso(r.unanswered_at),
        recipientId: r.recipient_id ? String(r.recipient_id) : null,
        recipientEmail: r.recipient_email ? String(r.recipient_email) : null,
        days: Number(r.days),
        stage: stage(r),
      })),
    };
  } catch {
    return null;
  }
}
