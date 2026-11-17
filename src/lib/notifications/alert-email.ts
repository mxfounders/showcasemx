import { authSql } from '@/lib/auth/security';
import { alertHref, readAlertCriteria } from '@/lib/alerts/model';
import { escapeHtml } from './email-template';

/**
 * The email of a saved-search alert (SHCWS-47): the listings that matched since the last
 * one, with a link to the same search and to manage alerts. One email per notice, and
 * record_search_alert_matches (db/search-alerts.sql) spaces notices at least 7 days apart
 * per alert. Spanish until accounts store a language (SHCWS-25).
 */
export type AlertListing = { id: string; name: string; problem: string };

const shown = 5;

export function searchAlertEmail({
  title,
  label,
  listings,
  total,
  resultsUrl,
  manageUrl,
  origin,
}: {
  title: string;
  label: string;
  listings: AlertListing[];
  total: number;
  resultsUrl: string;
  manageUrl: string;
  origin: string;
}) {
  const link = (href: string, text: string) =>
    `<a href="${escapeHtml(href)}" style="color:#365DC4;">${escapeHtml(text)}</a>`;
  const visible = listings.slice(0, shown);
  const items = visible.map(item => {
    const problem = item.problem.length > 140 ? `${item.problem.slice(0, 139)}…` : item.problem;
    return {
      html: `${link(`${origin}/es/soluciones/${item.id}`, item.name)}${problem ? ` — ${escapeHtml(problem)}` : ''}`,
      text: `- ${item.name}${problem ? `: ${problem}` : ''} (${origin}/es/soluciones/${item.id})`,
    };
  });
  const more = total - visible.length;
  const intro =
    total === 1
      ? 'Se publicó en shwcs un proyecto que coincide con tu alerta:'
      : `Se publicaron en shwcs ${total} proyectos que coinciden con tu alerta:`;
  return {
    subject: title,
    heading: `Hay algo nuevo para «${label}»`,
    paragraphs: [
      escapeHtml(intro),
      items.map(item => item.html).join('<br>'),
      ...(more > 0 ? [escapeHtml(more === 1 ? 'Y uno más.' : `Y ${more} más.`)] : []),
      `${link(resultsUrl, 'Ver la búsqueda completa')} · ${link(manageUrl, 'Administrar mis alertas')}`,
    ],
    text: [
      title,
      '',
      intro,
      ...items.map(item => item.text),
      ...(more > 0 ? [more === 1 ? 'Y uno más.' : `Y ${more} más.`] : []),
      '',
      `Administrar mis alertas: ${manageUrl}`,
    ].join('\n'),
    button: { label: 'Ver resultados', href: resultsUrl },
    footerNote:
      'Recibes esto porque creaste una alerta en shwcs. Te escribimos como máximo una vez por semana por alerta; puedes borrarla en Mis alertas o apagar estos correos en Preferencias de avisos.',
  };
}

/** Reads the alert and the listings of one notice (`alert:<id>:<slot>`), or null. */
export async function loadSearchAlertEmail({
  title,
  sourceKey,
  origin,
}: {
  title: string;
  sourceKey: string;
  origin: string;
}) {
  const id = /^alert:([0-9a-f-]{36}):/.exec(sourceKey)?.[1];
  if (!id) return null;
  const sql = authSql();
  const [[alert], listings, [{ total }]] = await Promise.all([
    sql`SELECT scope, topic, query, filters, label FROM search_alerts WHERE id = ${id}`,
    sql`SELECT s.id::text, s.published_data->>'name' AS name, COALESCE(s.published_data->>'problem', '') AS problem
      FROM search_alert_matches m JOIN founder_solutions s ON s.id = m.solution_id AND s.published_data IS NOT NULL
      WHERE m.notice_key = ${sourceKey} ORDER BY m.matched_at LIMIT ${shown}`,
    sql`SELECT count(*)::int AS total FROM search_alert_matches m
      JOIN founder_solutions s ON s.id = m.solution_id AND s.published_data IS NOT NULL
      WHERE m.notice_key = ${sourceKey}`,
  ]);
  const criteria = alert
    ? readAlertCriteria({
        scope: alert.scope,
        topic: alert.topic ?? undefined,
        query: alert.query,
        filters: alert.filters,
      })
    : null;
  if (!alert || !criteria || !listings.length) return null;
  return searchAlertEmail({
    title,
    label: String(alert.label),
    listings: listings.map(row => ({
      id: String(row.id),
      name: String(row.name),
      problem: String(row.problem),
    })),
    total: Number(total),
    resultsUrl: `${origin}/es${alertHref(criteria)}`,
    manageUrl: `${origin}/es/account/alerts`,
    origin,
  });
}
