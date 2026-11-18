import { escapeHtml, renderEmailHtml } from '@/lib/notifications/email-template';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { newsletterProfiles, newsletterRoles } from '@/lib/newsletter';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * A newsletter campaign (SHCWS-124): what ops writes, what the worker renders. Content is
 * plain text with a small, safe subset of Markdown — paragraphs, `## headings`, `- lists`,
 * `**bold**` and `[links](https://…)` — so an operator never writes HTML and nothing a
 * campaign says can inject markup. Every link goes through /api/newsletter/click, which
 * counts it per campaign and link (never per person) and redirects to the URL stored here,
 * never to one taken from the query.
 */
export type CampaignLocale = 'es' | 'en';

export type CampaignCopy = {
  subject: string;
  preheader: string;
  heading: string;
  body: string;
};

/** A listing card, copied from the published listing when the draft was made. */
export type CampaignListing = {
  solutionId: string;
  name: string;
  summary: string;
  /** Site path without the locale, e.g. /soluciones/cord. */
  path: string;
  category: string | null;
};

export type CampaignContent = {
  es: CampaignCopy;
  /** Optional: subscribers who chose English get the Spanish version when it is null. */
  en: CampaignCopy | null;
  listings: CampaignListing[];
};

export type CampaignSegment = { profiles: string[]; roles: string[] };

export const campaignLimits = {
  subject: 150,
  preheader: 200,
  heading: 150,
  body: 6000,
  listings: 30,
  listingName: 120,
  listingSummary: 400,
  links: 60,
} as const;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pathPattern = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/?#]*$/;
const LINK = /\[([^\]\n]{1,200})\]\(([^()\s]{1,500})\)/g;

/** An http(s) URL without credentials, or a path on this site. Null for anything else. */
export function safeCampaignHref(raw: string): string | null {
  const value = raw.trim();
  if (value.startsWith('/'))
    return !value.startsWith('//') && pathPattern.test(value) ? value : null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function text(value: unknown, max: number) {
  return typeof value === 'string' && value.length <= max ? value.replace(/\r\n?/g, '\n') : null;
}

function readCopy(value: unknown): CampaignCopy | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const subject = text(input.subject, campaignLimits.subject)?.trim();
  const heading = text(input.heading, campaignLimits.heading)?.trim();
  const preheader = text(input.preheader ?? '', campaignLimits.preheader)?.trim();
  const body = text(input.body ?? '', campaignLimits.body);
  if (subject === undefined || heading === undefined || preheader === undefined || body === null)
    return null;
  return { subject, preheader, heading, body };
}

function readListing(value: unknown): CampaignListing | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const name = text(input.name, campaignLimits.listingName)?.trim();
  const summary = text(input.summary ?? '', campaignLimits.listingSummary)?.trim();
  const path = typeof input.path === 'string' ? input.path : '';
  if (typeof input.solutionId !== 'string' || !uuid.test(input.solutionId)) return null;
  if (!name || summary === undefined || !/^\/soluciones\/[A-Za-z0-9-]{1,80}$/.test(path))
    return null;
  const category =
    typeof input.category === 'string' && input.category.length <= 60 ? input.category : null;
  return { solutionId: input.solutionId, name, summary, path, category };
}

/** The stored content, or null when its shape is wrong. Completeness is checked by campaignProblems. */
export function readCampaignContent(value: unknown): CampaignContent | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const es = readCopy(input.es);
  const en = input.en == null ? null : readCopy(input.en);
  if (!es || (input.en != null && !en)) return null;
  const rawListings = Array.isArray(input.listings) ? input.listings : [];
  if (rawListings.length > campaignLimits.listings) return null;
  const listings = rawListings.map(readListing);
  if (listings.some(item => !item)) return null;
  return { es, en, listings: listings as CampaignListing[] };
}

export function readCampaignSegment(value: unknown): CampaignSegment {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const pick = (list: unknown, allowed: readonly { value: string }[]) =>
    Array.isArray(list) ? allowed.map(item => item.value).filter(item => list.includes(item)) : [];
  return {
    profiles: pick(input.profiles, newsletterProfiles),
    roles: pick(input.roles, newsletterRoles),
  };
}

function linksIn(body: string) {
  return [...body.matchAll(LINK)].map(match => match[2]);
}

/**
 * Every link of the campaign, in a fixed order (Spanish body, Spanish listings, then the
 * English ones). The click URL carries the position in this list, so the same campaign
 * always maps a position to the same destination.
 */
export function campaignLinks(content: CampaignContent): string[] {
  const all: string[] = [];
  const add = (href: string | null) => {
    if (href && !all.includes(href)) all.push(href);
  };
  for (const locale of ['es', 'en'] as const) {
    const copy = content[locale];
    if (!copy) continue;
    linksIn(copy.body).forEach(raw => add(safeCampaignHref(raw)));
    content.listings.forEach(listing => add(`/${locale}${listing.path}`));
  }
  return all;
}

/** Why a campaign can't be tested or sent yet; empty when it can. Codes for ops' wording. */
export function campaignProblems(content: CampaignContent): string[] {
  const problems: string[] = [];
  for (const locale of ['es', 'en'] as const) {
    const copy = content[locale];
    if (!copy) continue;
    if (!copy.subject) problems.push(`${locale}:subject`);
    if (!copy.heading) problems.push(`${locale}:heading`);
    if (!copy.body.trim() && !content.listings.length) problems.push(`${locale}:body`);
    if (linksIn(copy.body).some(raw => !safeCampaignHref(raw))) problems.push(`${locale}:link`);
  }
  if (campaignLinks(content).length > campaignLimits.links) problems.push('links');
  return problems;
}

export function clickUrl(origin: string, campaignId: string, link: number, preview: boolean) {
  return `${origin}/api/newsletter/click?c=${campaignId}&l=${link}${preview ? '&p=1' : ''}`;
}

const TEXT = '#1c1917';
const MUTED = '#78716c';
const BLUE = '#365DC4';
const BORDER = '#e7e5e4';

function inline(raw: string, href: (value: string) => string | null) {
  let html = '';
  let plain = '';
  let last = 0;
  const bold = (value: string) =>
    escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const unbold = (value: string) => value.replace(/\*\*(.+?)\*\*/g, '$1');
  for (const match of raw.matchAll(LINK)) {
    const before = raw.slice(last, match.index);
    html += bold(before);
    plain += unbold(before);
    const target = href(match[2]);
    if (target) {
      html += `<a href="${escapeHtml(target)}" style="color:${BLUE};">${bold(match[1])}</a>`;
      plain += `${unbold(match[1])} (${target})`;
    } else {
      html += bold(match[0]);
      plain += unbold(match[0]);
    }
    last = (match.index ?? 0) + match[0].length;
  }
  html += bold(raw.slice(last));
  plain += unbold(raw.slice(last));
  return { html, plain };
}

/** Markdown-lite body → email HTML blocks and the plain-text version. */
export function renderBody(body: string, href: (value: string) => string | null) {
  const html: string[] = [];
  const plain: string[] = [];
  const blocks = body
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean);
  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim());
    if (lines.length === 1 && lines[0].startsWith('## ')) {
      const heading = inline(lines[0].slice(3), href);
      html.push(
        `<h2 style="margin:24px 0 8px;font-size:17px;line-height:1.35;font-weight:600;color:${TEXT};">${heading.html}</h2>`,
      );
      plain.push(heading.plain.toUpperCase());
    } else if (lines.every(line => line.startsWith('- '))) {
      const items = lines.map(line => inline(line.slice(2), href));
      html.push(
        `<ul style="margin:0 0 16px;padding-left:20px;">${items.map(item => `<li style="margin:0 0 6px;font-size:15px;line-height:1.6;color:${TEXT};">${item.html}</li>`).join('')}</ul>`,
      );
      plain.push(items.map(item => `• ${item.plain}`).join('\n'));
    } else {
      const parts = lines.map(line => inline(line, href));
      html.push(
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${TEXT};">${parts.map(part => part.html).join('<br>')}</p>`,
      );
      plain.push(parts.map(part => part.plain).join('\n'));
    }
  }
  return { html: html.join(''), text: plain.join('\n\n') };
}

/**
 * The final message for one recipient. Deterministic for the same input: a retried batch
 * renders byte-identical payloads, which the Resend Idempotency-Key relies on.
 */
export function renderCampaignEmail({
  content,
  locale,
  origin,
  campaignId,
  unsubscribeUrl,
  copy,
  test,
}: {
  content: CampaignContent;
  locale: CampaignLocale;
  origin: string;
  campaignId: string;
  /** The page that asks to confirm the unsubscribe; null only when no secret is configured. */
  unsubscribeUrl: string | null;
  copy: Dictionary['newsletter']['mail']['campaign'];
  /** A test send: «[Prueba vN]» subject, a banner, and links that are not counted. */
  test?: { version: number };
}) {
  const used: CampaignLocale = locale === 'en' && content.en ? 'en' : 'es';
  const message = content[used] ?? content.es;
  const links = campaignLinks(content);
  const track = (href: string | null) => {
    const position = href === null ? -1 : links.indexOf(href);
    return position < 0 ? null : clickUrl(origin, campaignId, position, Boolean(test));
  };
  const body = renderBody(message.body, raw => track(safeCampaignHref(raw)));
  const cards = content.listings.map(listing => {
    const target = track(`/${used}${listing.path}`) ?? `${origin}/${used}${listing.path}`;
    const category = listing.category
      ? localizedCategoryDisplayLabel(listing.category, used)
      : null;
    return {
      html: `<tr><td style="padding:14px 0;border-bottom:1px solid ${BORDER};"><a href="${escapeHtml(target)}" style="font-size:15px;font-weight:600;color:${BLUE};text-decoration:none;">${escapeHtml(listing.name)}</a>${category ? `<br><span style="font-size:12px;color:${MUTED};">${escapeHtml(category)}</span>` : ''}${listing.summary ? `<p style="margin:6px 0 0;font-size:14px;line-height:1.55;color:${TEXT};">${escapeHtml(listing.summary)}</p>` : ''}</td></tr>`,
      text: [
        listing.name,
        ...(category ? [category] : []),
        ...(listing.summary ? [listing.summary] : []),
        target,
      ].join('\n'),
    };
  });
  const banner = test
    ? `<p style="margin:0 0 16px;padding:10px 12px;border-radius:12px;background:#FBF0DC;font-size:13px;line-height:1.5;color:#8A5A14;">${escapeHtml(copy.testBanner.replace('{version}', String(test.version)))}</p>`
    : '';
  const listingHtml = cards.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-top:1px solid ${BORDER};">${cards.map(card => card.html).join('')}</table>`
    : '';
  const subject = test
    ? copy.testSubject
        .replace('{version}', String(test.version))
        .replace('{subject}', message.subject)
    : message.subject;
  const html = renderEmailHtml({
    origin,
    lang: used,
    preheader: message.preheader || message.subject,
    heading: message.heading,
    paragraphs: [],
    bodyHtml: `${banner}${body.html}${listingHtml}`,
    footerNote: copy.footer,
    footerLinks: unsubscribeUrl
      ? [{ label: copy.unsubscribe, href: escapeHtml(unsubscribeUrl) }]
      : [],
  });
  const textVersion = [
    ...(test ? [copy.testBanner.replace('{version}', String(test.version)), ''] : []),
    message.heading,
    '',
    body.text,
    ...cards.map(card => `\n${card.text}`),
    '',
    '—',
    copy.footer,
    ...(unsubscribeUrl ? [copy.unsubscribeText.replace('{url}', unsubscribeUrl)] : []),
  ].join('\n');
  return { subject, html, text: textVersion.replace(/\n{3,}/g, '\n\n'), locale: used };
}
