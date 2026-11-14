import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import { escapeHtml, renderEmailHtml } from '@/lib/notifications/email-template';
import { sendEmail } from '@/lib/notifications/server';
import { reviewTargetHours } from '@/lib/solutions/model';

/**
 * Emails to the review team (SHCWS-139): one when a listing is submitted, and a morning
 * digest of everything waiting (listings and every kind of open report) that flags what
 * has waited longer than the promised time. Only active, unsuspended members of
 * solution_reviewers receive them; being a reviewer is the only thing that matters (§48).
 * The links open ops, which has its own session; nothing private beyond what ops shows
 * travels in the email (never the private contact email of a listing, §7).
 *
 * `only` restricts the recipients to some reviewer accounts: the integration test uses it
 * so a development database with real reviewers never emails them.
 */
/** The promised review time when ops set one (SOLUTION_REVIEW_TARGET_HOURS), else 48 h. */
export const overdueHours = () => reviewTargetHours(process.env.SOLUTION_REVIEW_TARGET_HOURS) ?? 48;

/**
 * Automatic sends (on submit and from the daily cron) run in production only, or with
 * REVIEW_ALERTS=1: a development database holds real reviewers, and every test that
 * submits a listing would otherwise email them.
 */
export const reviewAlertsEnabled = () =>
  process.env.VERCEL_ENV === 'production' || process.env.REVIEW_ALERTS === '1';

const opsOrigin = () => process.env.OPS_APP_ORIGIN?.replace(/\/$/, '') || 'https://ops.shwcs.site';

async function reviewers(only: string[]) {
  const sql = authSql();
  return sql`SELECT a.id::text AS id, a.email FROM solution_reviewers r JOIN auth_accounts a ON a.id = r.account_id
    WHERE r.disabled_at IS NULL AND a.suspended_at IS NULL
      AND (cardinality(${only}::uuid[]) = 0 OR a.id = ANY(${only}::uuid[]))`;
}

const hoursSince = (value: unknown) =>
  Math.max(0, Math.floor((Date.now() - new Date(String(value)).getTime()) / 3_600_000));
const age = (hours: number) =>
  hours < 1
    ? 'hace menos de una hora'
    : hours < 48
      ? `hace ${hours} h`
      : `hace ${Math.floor(hours / 24)} días`;

export async function notifyReviewersOfSubmission(
  solutionId: string,
  { only = [] }: { only?: string[] } = {},
) {
  const config = recoveryConfig();
  if (!config) return 0;
  const sql = authSql();
  const [listing] =
    await sql`SELECT data->>'name' AS name, data->>'website' AS website, version, published_data IS NOT NULL AS live
      FROM founder_solutions WHERE id = ${solutionId} AND status = 'pending'`;
  if (!listing) return 0;
  const name = String(listing.name || 'Ficha sin nombre');
  const host = String(listing.website ?? '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  const href = `${opsOrigin()}/panel/postulaciones/${solutionId}`;
  const heading = listing.live
    ? `Cambios para revisar: ${name}`
    : `Ficha nueva para revisar: ${name}`;
  const lines = [
    listing.live
      ? 'El fundador envió cambios a una ficha publicada. La versión pública sigue igual hasta que se aprueben.'
      : 'Llegó una ficha nueva a la cola de revisión.',
    `Prometemos una decisión en menos de ${overdueHours()} h. Si pasa ese tiempo, aparecerá marcada en el resumen de la mañana.`,
  ];
  let sent = 0;
  for (const reviewer of await reviewers(only)) {
    await sendEmail({
      to: String(reviewer.email),
      subject: heading,
      text: [heading, host, '', ...lines, '', `Revisar en ops: ${href}`].filter(Boolean).join('\n'),
      html: renderEmailHtml({
        origin: config.origin,
        preheader: heading,
        heading,
        paragraphs: [
          ...(host ? [`<strong>${escapeHtml(name)}</strong> · ${escapeHtml(host)}`] : []),
          ...lines.map(escapeHtml),
        ],
        button: { label: 'Revisar en ops', href },
        footerNote: 'Te escribimos porque eres parte del equipo de revisión de shwcs.',
      }),
      idempotencyKey: `review-submitted:${solutionId}:${listing.version}:${reviewer.id}`,
    });
    sent++;
  }
  return sent;
}

type QueueItem = { label: string; hours: number; href: string };

/** Everything waiting for the team. Report tables a database doesn't have yet count as empty. */
async function queue(): Promise<QueueItem[]> {
  const sql = authSql();
  const ops = opsOrigin();
  const [tables] = await sql`SELECT to_regclass('solution_review_reports') IS NOT NULL AS reviews,
      to_regclass('community_reports') IS NOT NULL AS community,
      to_regclass('solution_comment_reports') IS NOT NULL AS comments`;
  const items: QueueItem[] = [];
  for (const row of await sql`SELECT id::text, COALESCE(data->>'name','Ficha sin nombre') AS name, updated_at
      FROM founder_solutions WHERE status = 'pending' ORDER BY updated_at`)
    items.push({
      label: `Ficha: ${row.name}`,
      hours: hoursSince(row.updated_at),
      href: `${ops}/panel/postulaciones/${row.id}`,
    });
  const reports = [
    sql`SELECT 'Reporte de ficha' AS kind, created_at FROM solution_reports WHERE status = 'open'`,
    ...(tables?.reviews
      ? [
          sql`SELECT 'Reporte de reseña' AS kind, created_at FROM solution_review_reports WHERE status = 'open'`,
        ]
      : []),
    ...(tables?.community
      ? [
          sql`SELECT 'Reporte de comunidad' AS kind, created_at FROM community_reports WHERE status = 'open'`,
        ]
      : []),
    ...(tables?.comments
      ? [
          sql`SELECT 'Reporte de comentario' AS kind, created_at FROM solution_comment_reports WHERE status = 'open'`,
        ]
      : []),
  ];
  for (const rows of await Promise.all(reports))
    for (const row of rows)
      items.push({
        label: String(row.kind),
        hours: hoursSince(row.created_at),
        href: `${ops}/panel/reportes`,
      });
  return items.sort((a, b) => b.hours - a.hours);
}

/** The morning summary. Nothing waiting, no email. One per reviewer and day. */
export async function reviewQueueDigest({ only = [] }: { only?: string[] } = {}) {
  const config = recoveryConfig();
  if (!config) return { waiting: 0, overdue: 0, sent: 0 };
  const items = await queue();
  const overdue = items.filter(item => item.hours >= overdueHours()).length;
  if (!items.length) return { waiting: 0, overdue: 0, sent: 0 };
  const heading = overdue
    ? `Cola de revisión: ${items.length} pendientes, ${overdue} con más de ${overdueHours()} h`
    : `Cola de revisión: ${items.length} pendientes`;
  const shown = items.slice(0, 15);
  const line = (item: QueueItem) =>
    `${item.hours >= overdueHours() ? '⚠ ' : ''}${item.label} · ${age(item.hours)}`;
  const paragraphs = [
    overdue
      ? `<strong>${overdue} ${overdue === 1 ? 'pasó' : 'pasaron'} el tiempo prometido de ${overdueHours()} h.</strong> Primero lo más antiguo:`
      : 'Primero lo más antiguo:',
    shown
      .map(
        item =>
          `<a href="${escapeHtml(item.href)}" style="color:#365DC4;">${escapeHtml(line(item))}</a>`,
      )
      .join('<br>'),
    ...(items.length > shown.length ? [`Y ${items.length - shown.length} más en ops.`] : []),
  ];
  const day = new Date().toISOString().slice(0, 10);
  let sent = 0;
  for (const reviewer of await reviewers(only)) {
    await sendEmail({
      to: String(reviewer.email),
      subject: heading,
      text: [heading, '', ...shown.map(item => `${line(item)} — ${item.href}`)].join('\n'),
      html: renderEmailHtml({
        origin: config.origin,
        preheader: heading,
        heading,
        paragraphs,
        button: { label: 'Abrir ops', href: `${opsOrigin()}/panel` },
        footerNote:
          'Resumen diario para el equipo de revisión de shwcs. Solo sale si hay algo pendiente.',
      }),
      idempotencyKey: `review-digest:${day}:${reviewer.id}`,
    });
    sent++;
  }
  return { waiting: items.length, overdue, sent };
}
