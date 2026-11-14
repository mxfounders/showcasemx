import { contactSizeLabel, storedOptionLabel, timelineOptions } from '@/lib/contacts/model';
import type { Dictionary } from '@/i18n/dictionary';
import { escapeHtml } from './email-template';

/**
 * The email a contact-request notification turns into (SHCWS-13). A new request carries
 * what the buyer agreed to share (contact-v1): name, company, team size, timeline,
 * budget and need. A later update carries the other side's reply. Everything the buyer
 * or the project wrote is escaped here, because the template takes paragraphs as HTML.
 * Emails are in Spanish (CLAUDE.md §63) until accounts store a language (SHCWS-25).
 */
export function contactNotificationEmail({
  title,
  event,
  toRecipient,
  labels,
}: {
  title: string;
  event: {
    status: string;
    /** 'message' for a message in the conversation (SHCWS-168); 'status' otherwise. */
    kind?: string;
    message: string;
    projectName: string;
    details: Record<string, unknown>;
    fromOtherSide: boolean;
  };
  /** The account the email goes to owns the project (it receives the lead). */
  toRecipient: boolean;
  labels: Pick<Dictionary['contacts'], 'teamSizes' | 'timelines' | 'statuses'>;
}) {
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  // A message in the conversation carries what the other side wrote, never the original
  // request again (a buyer's follow-up on a new request is not a second lead).
  if (event.kind === 'message') {
    const body = event.fromOtherSide ? text(event.message) : '';
    return {
      subject: title,
      heading: title,
      button: 'Responder en shwcs',
      paragraphs: [
        `<strong>${escapeHtml(event.projectName)}</strong>`,
        ...(body ? [escapeHtml(body).replace(/\n/g, '<br>')] : []),
      ],
      text: [`${title}.`, '', ...(body ? [body] : [])].join('\n'),
    };
  }
  if (event.status === 'new' && toRecipient) {
    const d = event.details;
    const rows: [string, string][] = [
      ['De', [text(d.name), text(d.company)].filter(Boolean).join(' · ')],
      ['Tamaño de empresa', contactSizeLabel(text(d.size), 'es', labels.teamSizes)],
      ['Plazo', storedOptionLabel(text(d.timeline), timelineOptions, labels.timelines)],
      ['Presupuesto', text(d.budget) || 'Sin especificar'],
      ['Necesidad', text(d.need)],
    ];
    const heading = `Nueva solicitud para ${event.projectName}`;
    return {
      subject: heading,
      heading,
      button: 'Responder en shwcs',
      paragraphs: [
        'Alguien quiere hablar con tu proyecto. Esto es lo que aceptó compartir:',
        ...rows
          .filter(([, value]) => value)
          .map(
            ([label, value]) =>
              `<strong>${escapeHtml(label)}:</strong> ${escapeHtml(value).replace(/\n/g, '<br>')}`,
          ),
        'Responde desde shwcs: la otra persona ve tu respuesta en su bandeja.',
      ],
      text: [
        `${heading}.`,
        '',
        ...rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`),
      ].join('\n'),
    };
  }
  const status = labels.statuses[event.status as keyof typeof labels.statuses] ?? event.status;
  const reply = event.fromOtherSide ? text(event.message) : '';
  return {
    subject: title,
    heading: title,
    button: 'Ver la conversación',
    paragraphs: [
      `<strong>${escapeHtml(event.projectName)}</strong> · ${escapeHtml(status)}`,
      ...(reply ? [escapeHtml(reply).replace(/\n/g, '<br>')] : []),
    ],
    text: [`${title}.`, `${event.projectName} · ${status}`, ...(reply ? ['', reply] : [])].join(
      '\n',
    ),
  };
}
