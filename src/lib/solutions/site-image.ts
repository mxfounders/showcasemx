import sharp from 'sharp';
import type { PublicLink } from './profile';
import { fetchSiteIcon, type SiteIcon } from './site-icon';
import { guardedFetch, readCapped } from '@/lib/net/guarded-fetch';
import { headOf, metadataScopes } from './page-scopes';

export { isPrivateAddress } from '@/lib/net/guarded-fetch';

/**
 * Reads the og:image of a project's own website so a ficha has a cover from the
 * moment its author types a URL, without waiting for screenshots.
 *
 * The bytes are downloaded and re-encoded here on purpose. Pointing the catalogue
 * at a remote `<img>` would make every visitor request a file from a third-party
 * server, which is exactly the kind of external pixel the privacy notice says the
 * site does not embed.
 *
 * Fetching a URL a person supplied is server-side request forgery territory: every
 * request goes through src/lib/net/guarded-fetch.ts, which validates each hop.
 */

// Pages that stream their metadata put the og:image and icon tags after the head,
// sometimes a megabyte in (linear.app: ~960 KB); longer pages are cut, not refused.
const HTML_LIMIT = 2 * 1024 * 1024;
const IMAGE_LIMIT = 5 * 1024 * 1024;
const HTML_TIMEOUT = 6000;
const IMAGE_TIMEOUT = 8000;
const AGENT = 'shwcs/1.0 (+https://shwcs.site; lee la portada y el logo del sitio declarado)';

export type SiteImage = { imageUrl: string; buffer: Buffer; width: number; height: number };
/**
 * Why a cover could not be taken. Stored as-is in `solution_site_images.failure` and
 * mapped to a message from the `solutionEditor.siteImage.failures` dictionary where
 * it is shown, so the founder reads it in their own language.
 */
export type SiteImageFailure =
  | 'unreachable'
  | 'notHtml'
  | 'pageTooLarge'
  | 'noImageMeta'
  | 'imageUrlTooLong'
  | 'imageUnreachable'
  | 'imageTooLarge'
  | 'unsupportedFormat'
  | 'imageTooDetailed'
  | 'processingFailed';
/**
 * What the page says about itself, read from the same request as the cover. Used only to
 * prefill an empty draft: the founder sees and edits it before anything is submitted.
 */
export type SiteMeta = { name: string; description: string; links: PublicLink[] };
/** `icon` is the site's own logo, read from the same page; independent of the cover. */
export type SiteImageResult =
  | { ok: true; image: SiteImage; meta: SiteMeta; icon: SiteIcon | null }
  | { ok: false; failure: SiteImageFailure; meta?: SiteMeta; icon?: SiteIcon | null };

/** `content` of the first matching <meta> in one part of the page. */
function metaIn(scope: string, property: string) {
  const tag = scope.match(
    new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`, 'i'),
  )?.[0];
  const match = tag?.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return match ? (match[1] ?? match[2] ?? '').trim() : '';
}

/** `content` of the first matching <meta>, the head before the body. */
function metaContent(html: string, property: string) {
  for (const scope of metadataScopes(html)) {
    const content = metaIn(scope, property);
    if (content) return content;
  }
  return '';
}

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
};
function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const point =
        code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return point > 31 && point < 0x110000 ? String.fromCodePoint(point) : '';
    }
    return entities[code.toLowerCase()] ?? whole;
  });
}
const clean = (value: string, limit: number) =>
  decodeEntities(value)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);

/**
 * The project's name and one-line description as its own page declares them:
 * og:site_name, else the first segment of the title ("Cord — Cotiza y factura" → "Cord");
 * og:description, else the meta description. Text only — markup is stripped.
 */
export function readSiteMeta(html: string): SiteMeta {
  // <title> only from the head: in the body it is usually an inline SVG's label.
  const title = clean(headOf(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '', 300);
  const siteName = clean(
    metaContent(html, 'og:site_name') || metaContent(html, 'application-name'),
    100,
  );
  const ogTitle = clean(metaContent(html, 'og:title'), 300);
  const firstSegment = (value: string) => value.split(/\s+[|·—–:-]\s+/)[0]?.trim() ?? '';
  const name = (siteName || firstSegment(ogTitle) || firstSegment(title)).slice(0, 100);
  const description = clean(
    metaContent(html, 'og:description') ||
      metaContent(html, 'description') ||
      metaContent(html, 'twitter:description'),
    1500,
  );
  return { name, description, links: readSiteLinks(html) };
}

/**
 * Profile links a site already points at (usually in its footer), one per network, so the
 * founder does not have to paste them again. Only profile-shaped URLs count: share
 * buttons, intents, single posts and videos are skipped.
 */
const socialPatterns: { label: PublicLink['label']; host: RegExp; path: RegExp }[] = [
  {
    label: 'LinkedIn',
    host: /(^|\.)linkedin\.com$/,
    path: /^\/(company|in|school|showcase)\/[^/]+\/?$/,
  },
  {
    label: 'X',
    host: /(^|\.)(x|twitter)\.com$/,
    path: /^\/(?!intent|share|home|search|i\/)[A-Za-z0-9_]{1,15}\/?$/,
  },
  {
    label: 'Instagram',
    host: /(^|\.)instagram\.com$/,
    path: /^\/(?!p\/|reel\/|explore)[A-Za-z0-9_.]{1,30}\/?$/,
  },
  {
    label: 'YouTube',
    host: /(^|\.)youtube\.com$/,
    path: /^\/(@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)\/?$/,
  },
  {
    label: 'GitHub',
    host: /^github\.com$/,
    path: /^\/(?!sponsors|features|about)[A-Za-z0-9-]{1,39}(\/[A-Za-z0-9._-]+)?\/?$/,
  },
  { label: 'Product Hunt', host: /(^|\.)producthunt\.com$/, path: /^\/(products|posts|@)[^?#]*$/ },
  { label: 'TikTok', host: /(^|\.)tiktok\.com$/, path: /^\/@[^/]+\/?$/ },
];
export function readSiteLinks(html: string): PublicLink[] {
  const links: PublicLink[] = [];
  for (const match of html.matchAll(/href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi)) {
    const raw = decodeEntities((match[1] ?? match[2] ?? '').trim());
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
    const host = url.hostname.toLowerCase();
    const kind = socialPatterns.find(
      pattern =>
        pattern.host.test(host) &&
        pattern.path.test(url.pathname) &&
        !links.some(link => link.label === pattern.label),
    );
    if (!kind) continue;
    url.protocol = 'https:';
    url.hash = '';
    url.search = '';
    if (url.href.length <= 500) links.push({ label: kind.label, url: url.href });
    if (links.length === 6) break;
  }
  return links;
}

/** og:image first, then Twitter's equivalent; both are what sites already publish. */
export function readImageMeta(html: string, pageUrl: string): string | null {
  const properties = [
    'og:image:secure_url',
    'og:image:url',
    'og:image',
    'twitter:image:src',
    'twitter:image',
  ];
  // Every property in the head before any in the streamed rest of the page.
  for (const scope of metadataScopes(html))
    for (const property of properties) {
      const content = metaIn(scope, property);
      if (!content) continue;
      try {
        return new URL(content, pageUrl).toString();
      } catch {
        continue;
      }
    }
  return null;
}

export async function fetchSiteImage(website: string): Promise<SiteImageResult> {
  const fetched = await guardedFetch(
    website,
    'text/html,application/xhtml+xml',
    HTML_TIMEOUT,
    AGENT,
  );
  if (!fetched) return { ok: false, failure: 'unreachable' };
  const page = fetched.response;
  if (!(page.headers.get('content-type') ?? '').includes('html'))
    return { ok: false, failure: 'notHtml' };
  const html = await readCapped(page, HTML_LIMIT, { truncate: true });
  if (!html) return { ok: false, failure: 'pageTooLarge' };

  const text = html.toString('utf8');
  const pageUrl = fetched.url;
  // The logo is read from the same page, alongside the cover: one never waits on or
  // fails the other.
  const [cover, icon] = await Promise.all([
    readCover(text, pageUrl),
    fetchSiteIcon(text, pageUrl, AGENT).catch(() => null),
  ]);
  return { ...cover, icon };
}

async function readCover(
  text: string,
  pageUrl: string,
): Promise<
  | { ok: true; image: SiteImage; meta: SiteMeta }
  | { ok: false; failure: SiteImageFailure; meta: SiteMeta }
> {
  const meta = readSiteMeta(text);
  const imageUrl = readImageMeta(text, pageUrl);
  if (!imageUrl) return { ok: false, failure: 'noImageMeta', meta };
  if (imageUrl.length > 1000) return { ok: false, failure: 'imageUrlTooLong', meta };

  const file = await guardedFetch(imageUrl, 'image/*', IMAGE_TIMEOUT, AGENT);
  if (!file) return { ok: false, failure: 'imageUnreachable', meta };
  const bytes = await readCapped(file.response, IMAGE_LIMIT);
  if (!bytes) return { ok: false, failure: 'imageTooLarge', meta };

  try {
    const input = sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' });
    const info = await input.metadata();
    if (!['png', 'jpeg', 'webp', 'gif', 'avif'].includes(info.format ?? ''))
      return { ok: false, failure: 'unsupportedFormat', meta };
    const result = await input
      .rotate()
      .resize({ width: 1200, height: 900, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > 400 * 1024) return { ok: false, failure: 'imageTooDetailed', meta };
    return {
      ok: true,
      meta,
      image: {
        imageUrl,
        buffer: result.data,
        width: result.info.width,
        height: result.info.height,
      },
    };
  } catch {
    return { ok: false, failure: 'processingFailed', meta };
  }
}
