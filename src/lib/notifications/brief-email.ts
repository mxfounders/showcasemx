import { authSql } from '@/lib/auth/security';
import { needPreview } from '@/lib/contacts/model';
import { companySizes } from '@/lib/taxonomy';
import { escapeHtml } from './email-template';

/**
 * Emails for «Publica tu necesidad» (SHCWS-58/60), built when they are sent so a brief
 * that closed or was hidden since gets nothing. Spanish, like every stored notice, until
 * accounts store a language (SHCWS-25). The founder's email never says who the buyer is;
 * the buyer's never carries a proposal's message, only that it arrived.
 */
export type BriefNoticeEmail = {
  subject: string;
  heading: string;
  paragraphs: string[];
  text: string;
  button: { label: string; href: string };
  footerNote: string;
};

const sizeLabel = (value: string) => {
  const size = companySizes.find(item => item.value === value);
  return size ? `${size.label} (${size.range})` : value;
};

/** The brief's facts as a founder reads them: never the buyer's account or company. */
export function briefMatchEmail({
  title,
  briefId,
  origin,
  brief,
}: {
  title: string;
  briefId: string;
  origin: string;
  brief: {
    problem: string;
    categories: string[];
    company_size: string;
    timeline: string;
    budget: string;
  };
}): BriefNoticeEmail {
  const facts = [
    ['Categorías', brief.categories.join(', ')],
    ['Tamaño de la empresa', sizeLabel(brief.company_size)],
    // Stored in Spanish, as the contact form stores it.
    ['Plazo', brief.timeline],
    ...(brief.budget ? [['Presupuesto', brief.budget]] : []),
  ];
  const preview = needPreview(brief.problem, 280);
  const intro =
    'Una empresa publicó en shwcs lo que necesita y tu ficha encaja con lo que declaraste. Puedes enviarle una propuesta: precio estimado, plazo y cómo lo resolverías. Hay una por proyecto y la empresa elige con quién hablar.';
  const privacy =
    'No verás quién es la empresa ni sus datos de contacto hasta que elija tu propuesta; entonces se abre una conversación en tu cuenta.';
  return {
    subject: title,
    heading: title,
    paragraphs: [
      escapeHtml(intro),
      `«${escapeHtml(preview)}»`,
      facts
        .map(([key, value]) => `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}`)
        .join('<br>'),
      escapeHtml(privacy),
    ],
    text: [
      title,
      '',
      intro,
      '',
      `«${preview}»`,
      '',
      ...facts.map(([key, value]) => `${key}: ${value}`),
      '',
      privacy,
    ].join('\n'),
    button: { label: 'Ver la necesidad', href: `${origin}/es/account/needs/${briefId}` },
    footerNote:
      'Recibes esto porque una de tus fichas publicadas encaja con la necesidad. Puedes apagar estos avisos en Preferencias de avisos.',
  };
}

export function briefProposalEmail({
  title,
  briefId,
  origin,
  proposal,
}: {
  title: string;
  briefId: string;
  origin: string;
  proposal: { name: string; price: string; timeline: string };
}): BriefNoticeEmail {
  const intro = `${proposal.name} respondió a la necesidad que publicaste en shwcs.`;
  const facts = `Precio estimado: ${proposal.price}\nPlazo: ${proposal.timeline}`;
  const next =
    'Compara las propuestas en la misma pantalla y elige con quién hablar. Hasta que elijas, nadie ve tu nombre, tu empresa ni tu correo.';
  return {
    subject: title,
    heading: title,
    paragraphs: [escapeHtml(intro), escapeHtml(facts).replace('\n', '<br>'), escapeHtml(next)],
    text: [title, '', intro, '', facts, '', next].join('\n'),
    button: { label: 'Comparar propuestas', href: `${origin}/es/account/briefs/${briefId}` },
    footerNote:
      'Recibes esto porque publicaste una necesidad en shwcs. Puedes apagar estos avisos en Preferencias de avisos.',
  };
}

export function briefShortlistEmail({
  title,
  briefId,
  origin,
  note,
  listings,
}: {
  title: string;
  briefId: string;
  origin: string;
  note: string;
  listings: { id: string; name: string }[];
}): BriefNoticeEmail {
  const intro =
    'El equipo de shwcs revisó la necesidad que publicaste y te sugiere estos proyectos del catálogo:';
  const link = (item: { id: string; name: string }) =>
    `<a href="${escapeHtml(`${origin}/es/soluciones/${item.id}`)}" style="color:#365DC4;">${escapeHtml(item.name)}</a>`;
  return {
    subject: title,
    heading: title,
    paragraphs: [
      escapeHtml(intro),
      listings.map(link).join('<br>'),
      escapeHtml(note).replace(/\n/g, '<br>'),
    ],
    text: [
      title,
      '',
      intro,
      ...listings.map(item => `- ${item.name} (${origin}/es/soluciones/${item.id})`),
      '',
      note,
    ].join('\n'),
    button: { label: 'Ver la lista corta', href: `${origin}/es/account/briefs/${briefId}` },
    footerNote:
      'Recibes esto porque publicaste una necesidad en shwcs. Los proyectos sugeridos no saben que te los recomendamos.',
  };
}

/**
 * The email for one `brief` notice, by its source key. Null when what it announced is
 * gone (a hidden or closed brief, a deleted proposal): the notice is then skipped.
 */
export async function loadBriefNoticeEmail({
  title,
  sourceKey,
  origin,
}: {
  title: string;
  sourceKey: string;
  origin: string;
}): Promise<BriefNoticeEmail | null> {
  const sql = authSql();
  const [kind, id] = sourceKey.split(':');
  if (kind === 'brief-match' && id) {
    const [brief] =
      await sql`SELECT problem,categories,company_size,timeline,budget FROM buyer_briefs WHERE id::text=${id} AND hidden_at IS NULL AND closed_at IS NULL AND expires_at>now()`;
    if (!brief) return null;
    return briefMatchEmail({
      title,
      briefId: id,
      origin,
      brief: {
        problem: String(brief.problem),
        categories: (brief.categories as string[]) ?? [],
        company_size: String(brief.company_size),
        timeline: String(brief.timeline),
        budget: String(brief.budget ?? ''),
      },
    });
  }
  if (kind === 'brief-proposal' && id) {
    const [row] =
      await sql`SELECT p.brief_id::text,p.price,p.timeline,s.published_data->>'name' AS name FROM buyer_brief_proposals p JOIN founder_solutions s ON s.id=p.solution_id AND s.published_data IS NOT NULL WHERE p.id::text=${id}`;
    if (!row) return null;
    return briefProposalEmail({
      title,
      briefId: String(row.brief_id),
      origin,
      proposal: {
        name: String(row.name),
        price: String(row.price),
        timeline: String(row.timeline),
      },
    });
  }
  if (kind === 'brief-shortlist' && id) {
    const [row] =
      await sql`SELECT brief_id::text,note,solution_ids::text[] AS solution_ids FROM buyer_brief_shortlists WHERE id::text=${id}`;
    if (!row) return null;
    const ids = (row.solution_ids as string[]) ?? [];
    const listings =
      await sql`SELECT id::text,published_data->>'name' AS name FROM founder_solutions WHERE id=ANY(${ids}::uuid[]) AND published_data IS NOT NULL`;
    if (!listings.length) return null;
    return briefShortlistEmail({
      title,
      briefId: String(row.brief_id),
      origin,
      note: String(row.note),
      listings: ids
        .map(item => listings.find(listing => listing.id === item))
        .filter(listing => listing !== undefined)
        .map(listing => ({ id: String(listing.id), name: String(listing.name) })),
    });
  }
  return null;
}
