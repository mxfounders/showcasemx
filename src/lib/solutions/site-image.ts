import sharp from 'sharp';
import { guardedFetch, readCapped } from '@/lib/net/guarded-fetch';
export { isPrivateAddress } from '@/lib/net/guarded-fetch';

/**
 * Reads the og:image of a project's own website so a ficha has a cover from the
 * moment its author types a URL, without waiting for screenshots.
 *
 * The bytes are downloaded and re-encoded here on purpose. Pointing the catalogue
 * at a remote `<img>` would make every visitor request a file from a third-party
 * server, which is exactly the kind of external pixel the privacy notice says the
 * site does not embed. Every request goes through guardedFetch (SSRF checks).
 */

const HTML_LIMIT = 512 * 1024; // enough for any reasonable <head>
const IMAGE_LIMIT = 5 * 1024 * 1024;
const HTML_TIMEOUT = 6000;
const IMAGE_TIMEOUT = 8000;
const AGENT = 'shwcs/1.0 (+https://shwcs.site; lee og:image del sitio declarado)';

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
export type SiteImageResult =
  { ok: true; image: SiteImage } | { ok: false; failure: SiteImageFailure };

/** og:image first, then Twitter's equivalent; both are what sites already publish. */
export function readImageMeta(html: string, pageUrl: string): string | null {
  const head = html.slice(0, html.toLowerCase().indexOf('</head>') + 1 || html.length);
  const properties = [
    'og:image:secure_url',
    'og:image:url',
    'og:image',
    'twitter:image:src',
    'twitter:image',
  ];
  for (const property of properties) {
    const pattern = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`,
      'i',
    );
    const tag = head.match(pattern)?.[0];
    const content = tag?.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try {
      return new URL(content.trim(), pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export async function fetchSiteImage(website: string): Promise<SiteImageResult> {
  const page = await guardedFetch(website, 'text/html,application/xhtml+xml', HTML_TIMEOUT, AGENT);
  if (!page) return { ok: false, failure: 'unreachable' };
  if (!(page.response.headers.get('content-type') ?? '').includes('html'))
    return { ok: false, failure: 'notHtml' };
  const html = await readCapped(page.response, HTML_LIMIT);
  if (!html) return { ok: false, failure: 'pageTooLarge' };

  const imageUrl = readImageMeta(html.toString('utf8'), page.url);
  if (!imageUrl) return { ok: false, failure: 'noImageMeta' };
  if (imageUrl.length > 1000) return { ok: false, failure: 'imageUrlTooLong' };

  const file = await guardedFetch(imageUrl, 'image/*', IMAGE_TIMEOUT, AGENT);
  if (!file) return { ok: false, failure: 'imageUnreachable' };
  const bytes = await readCapped(file.response, IMAGE_LIMIT);
  if (!bytes) return { ok: false, failure: 'imageTooLarge' };

  try {
    const input = sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' });
    const meta = await input.metadata();
    if (!['png', 'jpeg', 'webp', 'gif', 'avif'].includes(meta.format ?? ''))
      return { ok: false, failure: 'unsupportedFormat' };
    const result = await input
      .rotate()
      .resize({ width: 1200, height: 900, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });
    if (result.data.length > 400 * 1024) return { ok: false, failure: 'imageTooDetailed' };
    return {
      ok: true,
      image: {
        imageUrl,
        buffer: result.data,
        width: result.info.width,
        height: result.info.height,
      },
    };
  } catch {
    return { ok: false, failure: 'processingFailed' };
  }
}
