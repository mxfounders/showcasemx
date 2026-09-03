import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import sharp from 'sharp';

/**
 * Reads the og:image of a project's own website so a ficha has a cover from the
 * moment its author types a URL, without waiting for screenshots.
 *
 * The bytes are downloaded and re-encoded here on purpose. Pointing the catalogue
 * at a remote `<img>` would make every visitor request a file from a third-party
 * server, which is exactly the kind of external pixel the privacy notice says the
 * site does not embed.
 *
 * Fetching a URL a person supplied is server-side request forgery territory, so
 * every hop is checked: only http(s), no credentials, no private or loopback
 * address, a hard redirect limit, short timeouts and byte caps. The DNS check
 * happens before the request and a name could in theory change between the check
 * and the connection; that residual race is documented in docs/listings.md rather
 * than papered over.
 */

const HTML_LIMIT = 512 * 1024;   // enough for any reasonable <head>
const IMAGE_LIMIT = 5 * 1024 * 1024;
const HTML_TIMEOUT = 6000;
const IMAGE_TIMEOUT = 8000;
const MAX_REDIRECTS = 3;
const AGENT = 'shwcs/1.0 (+https://shwcs.site; lee og:image del sitio declarado)';

export type SiteImage = { imageUrl: string; buffer: Buffer; width: number; height: number };
export type SiteImageResult = { ok: true; image: SiteImage } | { ok: false; failure: string };

/** Blocks loopback, private, link-local, carrier-grade NAT and unique-local ranges. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;         // link-local, covers cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (family === 6) {
    const value = address.toLowerCase();
    if (value === '::1' || value === '::') return true;
    if (value.startsWith('fe80') || value.startsWith('fc') || value.startsWith('fd')) return true;
    // IPv4-mapped addresses reach the same networks through a different notation.
    const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true;
}

async function safeUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
    if (!addresses.length) return null;
    if (addresses.some(entry => isPrivateAddress(entry.address))) return null;
  } catch { return null; }
  return url;
}

/** Follows redirects by hand so every intermediate host is validated too. */
async function guardedFetch(raw: string, accept: string, timeout: number): Promise<Response | null> {
  let target = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await safeUrl(target);
    if (!url) return null;
    let response: Response;
    try {
      response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(timeout), headers: { accept, 'user-agent': AGENT } });
    } catch { return null; }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return null;
      try { target = new URL(location, url).toString(); } catch { return null; }
      continue;
    }
    return response.ok ? response : null;
  }
  return null;
}

async function readCapped(response: Response, limit: number): Promise<Buffer | null> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > limit) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** og:image first, then Twitter's equivalent; both are what sites already publish. */
export function readImageMeta(html: string, pageUrl: string): string | null {
  const head = html.slice(0, html.toLowerCase().indexOf('</head>') + 1 || html.length);
  const properties = ['og:image:secure_url', 'og:image:url', 'og:image', 'twitter:image:src', 'twitter:image'];
  for (const property of properties) {
    const pattern = new RegExp(`<meta[^>]+(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`, 'i');
    const tag = head.match(pattern)?.[0];
    const content = tag?.match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!content) continue;
    try { return new URL(content.trim(), pageUrl).toString(); } catch { continue; }
  }
  return null;
}

export async function fetchSiteImage(website: string): Promise<SiteImageResult> {
  const page = await guardedFetch(website, 'text/html,application/xhtml+xml', HTML_TIMEOUT);
  if (!page) return { ok: false, failure: 'No pudimos abrir el sitio. Revisa que responda públicamente por HTTPS.' };
  if (!(page.headers.get('content-type') ?? '').includes('html')) return { ok: false, failure: 'La dirección no devolvió una página web.' };
  const html = await readCapped(page, HTML_LIMIT);
  if (!html) return { ok: false, failure: 'La página es demasiado pesada para leer su portada.' };

  const imageUrl = readImageMeta(html.toString('utf8'), page.url || website);
  if (!imageUrl) return { ok: false, failure: 'El sitio no declara una imagen og:image. Añádela en su <head> o sube una captura.' };
  if (imageUrl.length > 1000) return { ok: false, failure: 'La imagen declarada tiene una dirección demasiado larga.' };

  const file = await guardedFetch(imageUrl, 'image/*', IMAGE_TIMEOUT);
  if (!file) return { ok: false, failure: 'No pudimos descargar la imagen que declara el sitio.' };
  const bytes = await readCapped(file, IMAGE_LIMIT);
  if (!bytes) return { ok: false, failure: 'La imagen del sitio pesa más de 5 MB.' };

  try {
    const input = sharp(bytes, { limitInputPixels: 40000000, failOn: 'warning' });
    const meta = await input.metadata();
    if (!['png', 'jpeg', 'webp', 'gif', 'avif'].includes(meta.format ?? '')) return { ok: false, failure: 'El sitio declara un formato de imagen que no podemos usar.' };
    const result = await input.rotate().resize({ width: 1200, height: 900, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    if (result.data.length > 400 * 1024) return { ok: false, failure: 'La imagen del sitio tiene demasiado detalle para guardarla.' };
    return { ok: true, image: { imageUrl, buffer: result.data, width: result.info.width, height: result.info.height } };
  } catch {
    return { ok: false, failure: 'No pudimos procesar la imagen del sitio.' };
  }
}
