import { solutionsSql } from '@/lib/solutions/server';
import { needPreview } from '@/lib/contacts/model';
import { contactAlternatives } from '@/lib/contacts/alternatives';
import { daysWaiting, readContactReminderKey } from '@/lib/contacts/reminder-model';
import { contactBriefHref } from '@/lib/contact-inquiry';
import type { PublishedProduct } from '@/lib/solutions/public';
import { escapeHtml } from './email-template';

/**
 * The emails of the reminder pass (SHCWS-61, src/lib/contacts/reminders.ts). Spanish,
 * like every notice until accounts store a language (CLAUDE.md §63). Everything the
 * buyer or a listing wrote is escaped, because the template takes paragraphs as HTML.
 */
type Built = {
  subject: string;
  heading: string;
  paragraphs: string[];
  text: string;
  button: { label: string; href: string };
};

const link = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="color:#365DC4;">${escapeHtml(label)}</a>`;

/** To the recipient, 48 hours and 5 days after a request nobody answered. */
export function contactReminderEmail({
  title,
  step,
  projectName,
  company,
  need,
  days,
  href,
}: {
  title: string;
  step: 'first' | 'second';
  projectName: string;
  company: string;
  need: string;
  days: number;
  href: string;
}): Built {
  const who = company.trim() || 'Un comprador';
  const since = `${who} te escribió hace ${days} ${days === 1 ? 'día' : 'días'} y todavía no tiene respuesta.`;
  const next =
    step === 'first'
      ? 'Basta una respuesta corta con el siguiente paso. Si no es para ti, ciérrala con un motivo: también cuenta como respuesta. Cómo respondes se ve en tu ficha («Suele responder en…»).'
      : 'Si llega a los 7 días sin respuesta, la marcaremos como «sin respuesta», le sugeriremos al comprador soluciones parecidas y contará en la señal de respuesta de tu ficha. Todavía puedes responder o cerrarla con un motivo.';
  const preview = needPreview(need, 280);
  return {
    subject: title,
    heading: title,
    paragraphs: [
      `<strong>${escapeHtml(projectName)}</strong> · ${escapeHtml(since)}`,
      ...(preview ? [`«${escapeHtml(preview)}»`] : []),
      escapeHtml(next),
    ],
    text: [`${title}.`, '', since, ...(preview ? ['', `«${preview}»`] : []), '', next].join('\n'),
    button: { label: 'Responder en shwcs', href },
  };
}

/** To the buyer, 7 days after a request nobody answered: alternatives or shwcs's help. */
export function unansweredContactEmail({
  title,
  projectName,
  days,
  alternatives,
  requestHref,
  briefHref,
}: {
  title: string;
  projectName: string;
  days: number;
  alternatives: ReadonlyArray<{ name: string; description: string; href: string }>;
  requestHref: string;
  briefHref: string;
}): Built {
  const intro = `Enviaste tu solicitud a ${projectName} hace ${days} días y todavía no tiene respuesta, así que la marcamos como «sin respuesta». Si responde más adelante, verás su mensaje en tu bandeja; también puedes retirarla cuando quieras.`;
  const introHtml = `Enviaste tu solicitud a <strong>${escapeHtml(projectName)}</strong> hace ${days} días y todavía no tiene respuesta, así que la marcamos como «sin respuesta». Si responde más adelante, verás su mensaje en tu bandeja; también puedes retirarla cuando quieras.`;
  if (!alternatives.length) {
    const help =
      'Todavía no hay soluciones publicadas parecidas. Cuéntanos qué buscas: lo lee una persona del equipo de shwcs y te ayuda a encontrar opciones.';
    return {
      subject: title,
      heading: title,
      paragraphs: [introHtml, escapeHtml(help)],
      text: [`${title}.`, '', intro, '', help].join('\n'),
      button: { label: 'Cuéntanos qué buscas', href: briefHref },
    };
  }
  const describe = (item: { description: string }) => needPreview(item.description, 140);
  return {
    subject: title,
    heading: title,
    paragraphs: [
      introHtml,
      'Estas soluciones publicadas resuelven algo parecido:',
      ...alternatives.map(item =>
        [link(item.href, item.name), describe(item) ? escapeHtml(describe(item)) : '']
          .filter(Boolean)
          .join(' · '),
      ),
      `¿Ninguna encaja? ${link(briefHref, 'Cuéntanos qué buscas')}: lo lee una persona del equipo de shwcs.`,
    ],
    text: [
      `${title}.`,
      '',
      intro,
      '',
      'Estas soluciones publicadas resuelven algo parecido:',
      ...alternatives.map(item =>
        [`- ${item.name}`, describe(item), item.href].filter(Boolean).join(' · '),
      ),
      '',
      `¿Ninguna encaja? Cuéntanos qué buscas: ${briefHref}`,
    ].join('\n'),
    button: { label: 'Ver mi solicitud', href: requestHref },
  };
}

/**
 * Builds the email for a reminder notice at delivery time. Returns `skip` when it no
 * longer applies: the recipient answered after the notice was written (a retry the
 * next day), the notice is not the right person's, or the request is gone. `extraTo` is
 * the listing's private contact address, where the original request also went
 * (CLAUDE.md §7: never shown publicly), for the recipient's reminders only.
 */
export async function loadContactReminderEmail({
  title,
  sourceKey,
  owner,
  origin,
  catalog,
  now = new Date(),
}: {
  title: string;
  sourceKey: string;
  owner: string;
  origin: string;
  catalog: () => Promise<PublishedProduct[]>;
  now?: Date;
}): Promise<{ skip: true } | (Built & { skip: false; extraTo: string[] })> {
  const parsed = readContactReminderKey(sourceKey);
  if (!parsed) return { skip: true };
  const sql = solutionsSql();
  const [request] =
    await sql`SELECT r.id,r.buyer_id,r.recipient_id,r.solution_id,r.project_name,r.status,
      r.created_at,r.details->>'company' AS company,left(coalesce(r.details->>'need',''),600) AS need,
      s.data->>'contactEmail' AS listing_email,
      EXISTS(SELECT 1 FROM contact_events e WHERE e.request_id=r.id AND e.actor_id=r.recipient_id) AS replied
    FROM contact_requests r LEFT JOIN founder_solutions s ON s.id=r.solution_id
    WHERE r.id=${parsed.requestId}`;
  if (!request || request.replied) return { skip: true };
  const days = daysWaiting(String(request.created_at), now);
  const projectName = String(request.project_name);
  if (parsed.step === 'unanswered') {
    if (String(request.buyer_id) !== owner) return { skip: true };
    const items = await contactAlternatives(
      { solutionId: String(request.solution_id), buyerId: owner },
      await catalog().catch(() => []),
    ).catch(() => []);
    // The brief carries the project's public name, never what the buyer wrote: a URL
    // ends up in logs and browser history.
    const briefHref = `${origin}/es${contactBriefHref(`Busco algo parecido a ${projectName}`)}`;
    return {
      skip: false,
      extraTo: [],
      ...unansweredContactEmail({
        title,
        projectName,
        days,
        alternatives: items.map(({ product }) => ({
          name: product.name,
          description: product.description,
          href: `${origin}/es${product.detailUrl}`,
        })),
        requestHref: `${origin}/es/account/contacts/${request.id}`,
        briefHref,
      }),
    };
  }
  if (String(request.recipient_id) !== owner || request.status !== 'new') return { skip: true };
  const listing = String(request.listing_email ?? '')
    .trim()
    .toLowerCase();
  return {
    skip: false,
    extraTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(listing) ? [listing] : [],
    ...contactReminderEmail({
      title,
      step: parsed.step,
      projectName,
      company: String(request.company ?? ''),
      need: String(request.need ?? ''),
      days,
      href: `${origin}/es/account/opportunities/${request.id}`,
    }),
  };
}
