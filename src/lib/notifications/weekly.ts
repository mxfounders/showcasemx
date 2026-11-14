import { authSql } from '@/lib/auth/security';
import { recoveryConfig } from '@/lib/auth/recovery';
import { escapeHtml, renderEmailHtml } from '@/lib/notifications/email-template';
import { sendEmail } from '@/lib/notifications/server';
import { createWeeklyUnsubscribeToken } from '@/lib/notifications/weekly-token';
import { solutionChecklist } from '@/lib/solutions/completeness';
import type { SolutionData } from '@/lib/solutions/model';
import { publicProducts, type PublishedProduct } from '@/lib/solutions/public';

/**
 * «Tu semana en shwcs» (SHCWS-21): what the last seven days brought each founder with a
 * published listing. Counts only, never who: saves show only from three accounts up, so a
 * single buyer can't be singled out. Not sent when everything was zero. Spanish until
 * accounts store a language (SHCWS-25).
 */
export type WeeklyListing = {
  id: string;
  name: string;
  views: number;
  viewsBefore: number;
  clicks: number;
  clicksBefore: number;
  saves: number;
  reviews: number;
  comments: number;
  task: { label: string; hint: string } | null;
  position: { rank: number; of: number; category: string } | null;
};

/** Saves are shown from this many different accounts up (never fewer, never names). */
export const weeklyMinimumSaves = 3;

/** The Monday (UTC) that names the week being summarised: the seven days before it. */
export function digestWeek(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function weeklyIsEmpty(listings: WeeklyListing[], unanswered: number) {
  return (
    unanswered === 0 &&
    listings.every(
      item =>
        item.views + item.clicks + item.reviews + item.comments === 0 &&
        item.saves < weeklyMinimumSaves,
    )
  );
}

function trend(now: number, before: number) {
  if (now === before) return 'igual que la semana anterior';
  if (before === 0) return 'la semana anterior: 0';
  const change = Math.round(((now - before) / before) * 100);
  return `${change > 0 ? '↑' : '↓'} ${Math.abs(change)} % frente a la semana anterior`;
}

function position({ rank, of, category }: NonNullable<WeeklyListing['position']>) {
  if (rank <= 3) return `Entre los 3 primeros de ${of} en ${category}`;
  if (rank <= 10) return `Entre los 10 primeros de ${of} en ${category}`;
  return `En la mitad ${rank <= of / 2 ? 'superior' : 'inferior'} de ${of} en ${category}`;
}

export function weeklyDigestEmail({
  listings,
  unanswered,
  link,
  unsubscribeUrl,
}: {
  listings: WeeklyListing[];
  unanswered: number;
  /** Turns a site path (/es/…) into the counted link the email uses. */
  link: (path: string) => string;
  unsubscribeUrl: string | null;
}) {
  const a = (path: string, label: string) =>
    `<a href="${escapeHtml(link(path))}" style="color:#365DC4;">${escapeHtml(label)}</a>`;
  const paragraphs: string[] = [];
  const text: string[] = [];
  if (unanswered > 0) {
    const line =
      unanswered === 1
        ? 'Tienes 1 oportunidad sin responder.'
        : `Tienes ${unanswered} oportunidades sin responder.`;
    paragraphs.push(`<strong>${line}</strong> ${a('/es/account/opportunities', 'Responder')}`);
    text.push(line, `Responder: ${link('/es/account/opportunities')}`, '');
  }
  for (const item of listings) {
    const rows = [
      `Visitas: ${item.views} (${trend(item.views, item.viewsBefore)})`,
      `Clics a tu sitio: ${item.clicks} (${trend(item.clicks, item.clicksBefore)})`,
      ...(item.saves >= weeklyMinimumSaves
        ? [`${item.saves} cuentas la guardaron esta semana`]
        : []),
      ...(item.reviews > 0
        ? [item.reviews === 1 ? '1 reseña nueva' : `${item.reviews} reseñas nuevas`]
        : []),
      ...(item.comments > 0
        ? [item.comments === 1 ? '1 comentario nuevo' : `${item.comments} comentarios nuevos`]
        : []),
      ...(item.position && item.position.of >= 3 ? [position(item.position)] : []),
    ];
    paragraphs.push(
      `<strong>${escapeHtml(item.name)}</strong><br>${rows.map(escapeHtml).join('<br>')}`,
    );
    text.push(item.name, ...rows);
    if (item.task) {
      paragraphs.push(
        `Siguiente paso para ${escapeHtml(item.name)}: <strong>${escapeHtml(item.task.label)}</strong>. ${escapeHtml(item.task.hint)} ${a(`/es/account/solutions/${item.id}`, 'Completar')}`,
      );
      text.push(`Siguiente paso: ${item.task.label}. ${item.task.hint}`);
    }
    text.push('');
  }
  if (unsubscribeUrl)
    paragraphs.push(
      `<span style="font-size:13px;color:#78716c;">¿Prefieres no recibirlo? <a href="${escapeHtml(unsubscribeUrl)}" style="color:#78716c;">Dejar de recibir este resumen</a>.</span>`,
    );
  return {
    subject: 'Tu semana en shwcs',
    heading: 'Tu semana en shwcs',
    paragraphs,
    button: { label: 'Ver mis métricas', href: link('/es/account/metrics') },
    text: [
      'Tu semana en shwcs',
      '',
      ...text,
      `Métricas: ${link('/es/account/metrics')}`,
      ...(unsubscribeUrl ? ['', `Dejar de recibir este resumen: ${unsubscribeUrl}`] : []),
    ].join('\n'),
  };
}

/** Builds and sends this week's summaries. `only` restricts recipients (tests). */
export async function sendWeeklyDigests({
  only = [],
  now = new Date(),
  products,
}: { only?: string[]; now?: Date; products?: PublishedProduct[] } = {}) {
  const config = recoveryConfig();
  if (!config) return { week: null, sent: 0, empty: 0 };
  const sql = authSql();
  const week = digestWeek(now);
  await sql`INSERT INTO weekly_digest_stats(week) VALUES (${week}) ON CONFLICT DO NOTHING`;
  const recipients = await sql`SELECT a.id::text AS id, a.email FROM auth_accounts a
    LEFT JOIN notification_preferences p ON p.owner_id = a.id
    WHERE a.email_verified_at IS NOT NULL AND a.suspended_at IS NULL AND COALESCE(p.weekly_email, true)
      AND EXISTS (SELECT 1 FROM founder_solutions s WHERE s.owner_id = a.id AND s.published_data IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM weekly_digest_sends w WHERE w.owner_id = a.id AND w.week = ${week})
      AND (cardinality(${only}::uuid[]) = 0 OR a.id = ANY(${only}::uuid[]))
    ORDER BY a.id LIMIT 100`;
  if (!recipients.length) return { week, sent: 0, empty: 0 };
  const catalog = products ?? (await publicProducts().catch(() => []));
  const link = (path: string) =>
    `${config.origin}/api/weekly/click?w=${week}&to=${encodeURIComponent(path)}`;
  let sent = 0,
    empty = 0;
  for (const recipient of recipients) {
    const owner = String(recipient.id);
    // The seven days before `week` (a Monday), and the seven before those.
    const rows = await sql`SELECT s.id::text AS id, s.published_data AS data,
        COALESCE((SELECT sum(views) FROM solution_daily_metrics m WHERE m.solution_id = s.id AND m.day >= ${week}::date - 7 AND m.day < ${week}::date), 0)::int AS views,
        COALESCE((SELECT sum(views) FROM solution_daily_metrics m WHERE m.solution_id = s.id AND m.day >= ${week}::date - 14 AND m.day < ${week}::date - 7), 0)::int AS views_before,
        COALESCE((SELECT sum(clicks) FROM solution_daily_metrics m WHERE m.solution_id = s.id AND m.day >= ${week}::date - 7 AND m.day < ${week}::date), 0)::int AS clicks,
        COALESCE((SELECT sum(clicks) FROM solution_daily_metrics m WHERE m.solution_id = s.id AND m.day >= ${week}::date - 14 AND m.day < ${week}::date - 7), 0)::int AS clicks_before,
        (SELECT count(DISTINCT b.owner_id) FROM buyer_saved_projects b
          WHERE (b.project_key = 'solution:' || s.id::text OR (s.catalog_key IS NOT NULL AND b.project_key = 'catalog:' || s.catalog_key))
            AND b.owner_id <> s.owner_id AND b.created_at >= ${week}::date - 7 AND b.created_at < ${week}::date)::int AS saves,
        (SELECT count(*) FROM solution_reviews r WHERE r.solution_id = s.id AND r.status = 'published'
            AND r.created_at >= ${week}::date - 7 AND r.created_at < ${week}::date)::int AS reviews,
        (SELECT count(*) FROM solution_comments c WHERE c.solution_id = s.id AND to_jsonb(c)->>'hidden_at' IS NULL
            AND c.created_at >= ${week}::date - 7 AND c.created_at < ${week}::date)::int AS comments
      FROM founder_solutions s WHERE s.owner_id = ${owner} AND s.published_data IS NOT NULL ORDER BY s.published_at NULLS LAST`;
    const [{ unanswered }] =
      await sql`SELECT count(*)::int AS unanswered FROM contact_requests WHERE recipient_id = ${owner} AND status = 'new'`;
    const listings: WeeklyListing[] = rows.map(row => {
      const data = row.data as SolutionData;
      const category = data.categories?.[0] ?? data.category;
      const peers = category ? catalog.filter(p => p.categories.includes(category)) : [];
      const rank = peers.findIndex(p => p.detailUrl === `/soluciones/${row.id}`) + 1;
      const task = solutionChecklist(data).find(item => !item.done) ?? null;
      return {
        id: String(row.id),
        name: String(data.name),
        views: Number(row.views),
        viewsBefore: Number(row.views_before),
        clicks: Number(row.clicks),
        clicksBefore: Number(row.clicks_before),
        saves: Number(row.saves),
        reviews: Number(row.reviews),
        comments: Number(row.comments),
        task: task ? { label: task.label, hint: task.hint } : null,
        position: rank > 0 ? { rank, of: peers.length, category } : null,
      };
    });
    if (weeklyIsEmpty(listings, Number(unanswered))) {
      empty++;
      continue;
    }
    // Claim the week first, so two cron runs never both send.
    const [claimed] =
      await sql`INSERT INTO weekly_digest_sends(owner_id, week) VALUES (${owner}, ${week}) ON CONFLICT DO NOTHING RETURNING week`;
    if (!claimed) continue;
    const token = createWeeklyUnsubscribeToken(owner);
    const unsubscribeUrl = token ? `${config.origin}/es/weekly/unsubscribe?token=${token}` : null;
    const email = weeklyDigestEmail({
      listings,
      unanswered: Number(unanswered),
      link,
      unsubscribeUrl,
    });
    try {
      await sendEmail({
        to: String(recipient.email),
        subject: email.subject,
        text: email.text,
        html: renderEmailHtml({
          origin: config.origin,
          preheader: email.subject,
          heading: email.heading,
          paragraphs: email.paragraphs,
          button: email.button,
          footerNote:
            'Te escribimos cada lunes porque tienes una ficha publicada. Puedes apagarlo en Preferencias de avisos.',
        }),
        idempotencyKey: `weekly:${owner}:${week}`,
        // One-click unsubscribe in the mail client itself (RFC 8058).
        ...(token
          ? {
              headers: {
                'List-Unsubscribe': `<${config.origin}/api/weekly/unsubscribe?token=${token}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
            }
          : {}),
      });
      await sql`UPDATE weekly_digest_stats SET sent = sent + 1 WHERE week = ${week}`;
      sent++;
    } catch {
      // Not sent: release the week so the next daily run tries again.
      await sql`DELETE FROM weekly_digest_sends WHERE owner_id = ${owner} AND week = ${week}`;
    }
  }
  return { week, sent, empty };
}
