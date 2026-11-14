import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Fetching a URL a person supplied is server-side request forgery territory, so
 * every hop is checked: only http(s), no credentials, no private or loopback
 * address, a hard redirect limit, short timeouts and byte caps. The DNS check
 * happens before the request and a name could in theory change between the check
 * and the connection; that residual race is documented in docs/listings.md rather
 * than papered over.
 *
 * Shared by everything that reads the website a founder declared: the cover
 * (og:image), the logo (src/lib/solutions/site-icon.ts) and the page itself.
 */

const MAX_REDIRECTS = 3;

/** Blocks loopback, private, link-local, carrier-grade NAT and unique-local ranges. */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local, covers cloud metadata
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
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  try {
    const addresses = isIP(host)
      ? [{ address: host }]
      : await lookup(host, { all: true, verbatim: true });
    if (!addresses.length) return null;
    if (addresses.some(entry => isPrivateAddress(entry.address))) return null;
  } catch {
    return null;
  }
  return url;
}

/**
 * Follows redirects by hand so every intermediate host is validated too. Returns
 * the final response together with the URL it came from, since `Response.url` is
 * empty for a manually followed chain.
 */
export async function guardedFetch(
  raw: string,
  accept: string,
  timeout: number,
  agent: string,
): Promise<{ response: Response; url: string } | null> {
  let target = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await safeUrl(target);
    if (!url) return null;
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeout),
        headers: { accept, 'user-agent': agent },
      });
    } catch {
      return null;
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return null;
      try {
        target = new URL(location, url).toString();
      } catch {
        return null;
      }
      continue;
    }
    return response.ok ? { response, url: url.toString() } : null;
  }
  return null;
}

/**
 * The body, at most `limit` bytes. Past the limit it returns null, or, with `truncate`,
 * the first `limit` bytes: enough for a page's <head> when the whole page is huge.
 */
export async function readCapped(
  response: Response,
  limit: number,
  { truncate = false }: { truncate?: boolean } = {},
): Promise<Buffer | null> {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > limit && !truncate) return null;
  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => {});
      if (!truncate) return null;
      chunks.push(value);
      return Buffer.concat(chunks).subarray(0, limit);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
