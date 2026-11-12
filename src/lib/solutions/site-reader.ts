import { guardedFetch, readCapped } from '@/lib/net/guarded-fetch';
import type { PublicLink } from './profile';

/**
 * Reads the public pages of the website a founder declared, so the AI draft
 * (site-draft.ts) has something real to work from: the home page plus up to four
 * internal pages whose link text or path looks like pricing, product, integrations
 * or "about". Everything here is plain text extraction, no model involved; the
 * pure helpers are exported for tests.
 */

const PAGE_LIMIT = 512 * 1024;
const PAGE_TIMEOUT = 6000;
const TEXT_LIMIT = 12000; // characters kept per page
const MAX_EXTRA_PAGES = 4;
const AGENT = 'shwcs/1.0 (+https://shwcs.site; lee el sitio declarado para preparar su ficha)';

export type SitePage = {
  url: string;
  title: string;
  description: string;
  text: string;
};
export type SiteAnchor = { url: string; text: string };
export type SiteReading = {
  url: string;
  siteName: string;
  pages: SitePage[];
  anchors: SiteAnchor[];
};
/** Why the site could not be read; mapped to `solutionEditor.siteDraft.errors`. */
export type SiteReadFailure = 'unreachable' | 'notHtml' | 'tooLittleText';

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  aacute: 'á',
  eacute: 'é',
  iacute: 'í',
  oacute: 'ó',
  uacute: 'ú',
  ntilde: 'ñ',
  Aacute: 'Á',
  Eacute: 'É',
  Iacute: 'Í',
  Oacute: 'Ó',
  Uacute: 'Ú',
  Ntilde: 'Ñ',
  uuml: 'ü',
  iquest: '¿',
  iexcl: '¡',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const number =
        code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(number) && number > 0 && number < 0x110000
        ? String.fromCodePoint(number)
        : match;
    }
    return entities[code] ?? match;
  });
}

const squash = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Visible text of a page: no scripts, styles, SVG or comments, one line per block. */
export function htmlToText(html: string): string {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(
      /<\/?(p|div|section|article|header|footer|main|aside|nav|li|ul|ol|h[1-6]|tr|td|th|table|br|dt|dd|blockquote|figcaption)\b[^>]*>/gi,
      '\n',
    )
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(body).split('\n').map(squash).filter(Boolean).join('\n');
}

function metaContent(head: string, names: string[]): string {
  for (const name of names) {
    const tag = head.match(
      new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${name}["'][^>]*>`, 'i'),
    )?.[0];
    const content = tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
    if (content?.trim()) return squash(decodeEntities(content));
  }
  return '';
}

export function readPageMeta(html: string) {
  const end = html.toLowerCase().indexOf('</head>');
  const head = end >= 0 ? html.slice(0, end) : html.slice(0, 20000);
  const title = squash(decodeEntities(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''));
  return {
    title: metaContent(head, ['og:title', 'twitter:title']) || title,
    description: metaContent(head, ['description', 'og:description', 'twitter:description']),
    siteName: metaContent(head, ['og:site_name', 'application-name']),
  };
}

/** Every `<a href>` resolved against the page, with its visible text. */
export function readAnchors(html: string, pageUrl: string): SiteAnchor[] {
  const anchors: SiteAnchor[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let url: URL;
    try {
      url = new URL(decodeEntities(href.trim()), pageUrl);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    url.hash = '';
    const key = url.toString();
    if (seen.has(key) || key.length > 500) continue;
    seen.add(key);
    const label = match[1].match(/aria-label\s*=\s*["']([^"']+)["']/i)?.[1] ?? '';
    anchors.push({
      url: key,
      text: squash(decodeEntities(match[2].replace(/<[^>]+>/g, ' ')) || label).slice(0, 120),
    });
  }
  return anchors;
}

const sameSite = (a: URL, b: URL) =>
  a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '');

// What each kind of useful internal page tends to be called, in Spanish and English.
const pagePatterns = [
  /precio|pricing|plan(es|s)?\b|tarifa|cost/i,
  /funcion|feature|producto|product|soluci|servicio|service|como-funciona|how-it-works/i,
  /integra/i,
  /nosotros|about|acerca|equipo|team|empresa|company|quienes/i,
];
// Files, account pages, legal pages and single articles say nothing about the product.
const skipped =
  /\.(pdf|png|jpe?g|gif|svg|webp|zip|mp4|xml|json)$|\/(login|signin|sign-in|signup|sign-up|registro|entrar|cart|checkout|legal|privacy|privacidad|terms|terminos|cookies)\b|\/(blog|articulos?|articles?|posts?|news|noticias|recursos|resources)\/./i;

/** Up to four same-site pages, one per kind (pricing, product, integrations, about). */
export function pickInternalPages(
  anchors: SiteAnchor[],
  homeUrl: string,
  maximum = MAX_EXTRA_PAGES,
) {
  const home = new URL(homeUrl);
  const picked: string[] = [];
  for (const pattern of pagePatterns) {
    const found = anchors.find(anchor => {
      const url = new URL(anchor.url);
      if (!sameSite(url, home) || url.pathname === '/' || skipped.test(url.pathname)) return false;
      if (picked.includes(anchor.url) || anchor.url === home.toString()) return false;
      return pattern.test(url.pathname) || pattern.test(anchor.text);
    });
    if (found) picked.push(found.url);
    if (picked.length >= maximum) break;
  }
  return picked;
}

const socialHosts: [RegExp, PublicLink['label']][] = [
  [/(^|\.)linkedin\.com$/, 'LinkedIn'],
  [/(^|\.)(x|twitter)\.com$/, 'X'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube'],
  [/(^|\.)github\.com$/, 'GitHub'],
  [/(^|\.)producthunt\.com$/, 'Product Hunt'],
  [/(^|\.)tiktok\.com$/, 'TikTok'],
];

/**
 * The project's own public links, read straight from its pages (never from the
 * model): official social profiles, plus its pricing and documentation pages when
 * the site links to them. Share/intent links are not profiles and are skipped.
 */
export function readProjectLinks(anchors: SiteAnchor[], homeUrl: string): PublicLink[] {
  const home = new URL(homeUrl);
  const links: PublicLink[] = [];
  const add = (label: PublicLink['label'], url: string) => {
    if (links.length < 6 && !links.some(link => link.label === label)) links.push({ label, url });
  };
  for (const anchor of anchors) {
    const url = new URL(anchor.url);
    if (/\/(share|intent|sharer)/i.test(url.pathname) || url.pathname === '/') continue;
    const social = socialHosts.find(([pattern]) => pattern.test(url.hostname));
    if (social) add(social[1], anchor.url);
  }
  for (const anchor of anchors) {
    const url = new URL(anchor.url);
    if (sameSite(url, home) && /precio|pricing|tarifa/i.test(url.pathname))
      add('Precios', anchor.url);
    if (/^docs\./.test(url.hostname) || (sameSite(url, home) && /^\/docs?\b/i.test(url.pathname)))
      add('Documentación', anchor.url);
  }
  return links;
}

type PageResult =
  | { ok: true; html: string; siteName: string; page: SitePage }
  | { ok: false; failure: 'unreachable' | 'notHtml' };

async function readPage(url: string): Promise<PageResult> {
  const fetched = await guardedFetch(url, 'text/html,application/xhtml+xml', PAGE_TIMEOUT, AGENT);
  if (!fetched) return { ok: false, failure: 'unreachable' };
  if (!(fetched.response.headers.get('content-type') ?? '').includes('html'))
    return { ok: false, failure: 'notHtml' };
  const bytes = await readCapped(fetched.response, PAGE_LIMIT);
  if (!bytes) return { ok: false, failure: 'unreachable' };
  const html = bytes.toString('utf8');
  const meta = readPageMeta(html);
  return {
    ok: true,
    html,
    siteName: meta.siteName,
    page: {
      url: fetched.url,
      title: meta.title,
      description: meta.description,
      text: htmlToText(html).slice(0, TEXT_LIMIT),
    },
  };
}

/** Reads the home page and up to four internal pages. Same SSRF rules as the cover. */
export async function readSite(
  website: string,
): Promise<{ ok: true; site: SiteReading } | { ok: false; failure: SiteReadFailure }> {
  const home = await readPage(website);
  if (!home.ok) return { ok: false, failure: home.failure };
  const anchors = readAnchors(home.html, home.page.url);
  const extra = await Promise.all(pickInternalPages(anchors, home.page.url).map(readPage));
  const pages = [home.page];
  for (const result of extra) {
    if (result.ok && result.page.text.length > 80) {
      pages.push(result.page);
      for (const anchor of readAnchors(result.html, result.page.url))
        if (!anchors.some(item => item.url === anchor.url)) anchors.push(anchor);
    }
  }
  const words = pages.reduce(
    (total, page) => total + `${page.description} ${page.text}`.split(/\s+/).length,
    0,
  );
  // A site that renders everything in the browser leaves almost no text in its HTML.
  if (words < 40) return { ok: false, failure: 'tooLittleText' };
  return {
    ok: true,
    site: {
      url: home.page.url,
      siteName: home.siteName,
      pages,
      anchors: anchors.slice(0, 300),
    },
  };
}
