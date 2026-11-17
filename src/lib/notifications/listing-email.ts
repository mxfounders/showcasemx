import { escapeHtml } from './email-template';

/**
 * Emails about a founder's own listing (SHCWS-18/20): what happened and a button to it.
 * The approval carries the launch kit: the public link, share links with a suggested
 * text, the badge for their site and the link where clients can review. Everything
 * people wrote is escaped (the template takes paragraphs as HTML). Spanish until
 * accounts store a language (SHCWS-25).
 */
export type ListingEvent =
  | { kind: 'decision'; status: string; message: string }
  | { kind: 'comment'; author: string; body: string }
  | { kind: 'report'; reason: string }
  | { kind: 'review'; rating: number; headline: string }
  | { kind: 'question'; author: string; body: string }
  | { kind: 'listed'; listName: string; listUrl: string }
  | { kind: 'other' };

const reportReasons: Record<string, string> = {
  misleading: 'información engañosa',
  broken: 'enlace o producto que no funciona',
  ownership: 'quién está detrás de la ficha',
  abuse: 'contenido abusivo',
};

export function listingNotificationEmail({
  title,
  solutionId,
  solutionName,
  origin,
  event,
}: {
  title: string;
  solutionId: string;
  solutionName: string;
  origin: string;
  event: ListingEvent;
}) {
  const name = escapeHtml(solutionName);
  const account = `${origin}/es/account/solutions/${solutionId}`;
  const listing = `${origin}/es/soluciones/${solutionId}`;
  const link = (href: string, label: string) =>
    `<a href="${escapeHtml(href)}" style="color:#365DC4;">${escapeHtml(label)}</a>`;

  if (event.kind === 'decision' && event.status === 'published') {
    const share = `Ya puedes encontrar ${solutionName} en shwcs: ${listing}`;
    return {
      subject: `${solutionName} ya está publicado en shwcs`,
      heading: `${solutionName} ya está en el catálogo`,
      paragraphs: [
        `Aprobamos la ficha de <strong>${name}</strong>. Ya aparece en el catálogo y puede recibir solicitudes de contacto.`,
        `<strong>Compártela:</strong> ${[
          link(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(listing)}`,
            'LinkedIn',
          ),
          link(`https://x.com/intent/tweet?text=${encodeURIComponent(share)}`, 'X'),
          link(`https://wa.me/?text=${encodeURIComponent(share)}`, 'WhatsApp'),
        ].join(' · ')}. Al pegar el enlace se muestra la tarjeta de tu ficha.`,
        `<strong>Ponla en tu sitio:</strong> la insignia «Publicado en shwcs» está en ${link(account, 'tu ficha')}.`,
        `<strong>Pide reseñas:</strong> crea en ${link(`${account}#invitar-resenas`, 'tu ficha')} el enlace de invitación y compártelo con tus clientes; entran con su correo y dejan su reseña en un par de minutos.`,
      ],
      button: { label: 'Ver mi ficha publicada', href: listing },
      text: [
        `${solutionName} ya está publicado en shwcs: ${listing}`,
        '',
        `Compártelo: ${share}`,
        `Insignia para tu sitio: ${account}`,
        `Pide reseñas: ${account}#invitar-resenas`,
      ].join('\n'),
    };
  }
  if (event.kind === 'listed') {
    // A curator put the project on a public list: worth sharing. Who curated it is on the
    // public list itself; the email adds nothing about them.
    const share = `${solutionName} aparece en la lista «${event.listName}» de shwcs: ${event.listUrl}`;
    return {
      subject: title,
      heading: title,
      paragraphs: [
        `Alguien de la comunidad incluyó <strong>${name}</strong> en su lista pública <strong>${escapeHtml(event.listName)}</strong>.`,
        `<strong>Compártela:</strong> ${[
          link(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(event.listUrl)}`,
            'LinkedIn',
          ),
          link(`https://x.com/intent/tweet?text=${encodeURIComponent(share)}`, 'X'),
          link(`https://wa.me/?text=${encodeURIComponent(share)}`, 'WhatsApp'),
        ].join(' · ')}.`,
      ],
      button: { label: 'Ver la lista', href: event.listUrl },
      text: [title, '', `Ver la lista: ${event.listUrl}`, `Compártela: ${share}`].join('\n'),
    };
  }
  const raw =
    event.kind === 'decision' && event.message.trim()
      ? { label: 'Comentario del equipo editorial', text: event.message.trim() }
      : event.kind === 'comment'
        ? { label: event.author, text: `«${event.body.trim()}»` }
        : event.kind === 'report'
          ? {
              label: 'Motivo',
              text: `${reportReasons[event.reason] ?? 'otro'}. El equipo de shwcs lo revisa; no compartimos quién lo envió.`,
            }
          : event.kind === 'review'
            ? { label: `${event.rating} de 5`, text: `«${event.headline}»` }
            : event.kind === 'question'
              ? { label: event.author, text: `«${event.body.trim()}»` }
              : null;
  const detail = raw
    ? `<strong>${escapeHtml(raw.label)}:</strong> ${escapeHtml(raw.text).replace(/\n/g, '<br>')}`
    : '';
  return {
    subject: title,
    heading: title,
    paragraphs: [`Sobre <strong>${name}</strong>.`, ...(detail ? [detail] : [])],
    button: {
      label:
        event.kind === 'question'
          ? 'Responder en tu ficha'
          : event.kind === 'comment' || event.kind === 'review'
            ? 'Verlo en tu ficha'
            : 'Abrir mi ficha',
      href:
        event.kind === 'comment' || event.kind === 'review' || event.kind === 'question'
          ? `${listing}${event.kind === 'review' ? '#resenas' : event.kind === 'question' ? '#preguntas' : ''}`
          : account,
    },
    text: [title, solutionName, raw ? `${raw.label}: ${raw.text}` : ''].filter(Boolean).join('\n'),
  };
}
