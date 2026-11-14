import sharp, { type Sharp } from 'sharp';
import { guardedFetch, readCapped } from '@/lib/net/guarded-fetch';
import { metadataScopes } from './page-scopes';

/**
 * Reads the logo a project's own website declares (its favicon, apple-touch-icon or
 * SVG icon), so every listing shows its mark instead of an initial (SHCWS-177).
 *
 * As with the cover, the bytes are downloaded and re-encoded here and served from
 * shwcs: pointing an <img> at the founder's site would make every visitor's browser
 * call another server (src/components/project-mark.tsx, CLAUDE.md §62).
 */

const ICON_FILE_LIMIT = 1024 * 1024;
const ICON_TIMEOUT = 6000;
/** At most this many candidates are downloaded per read, so one page cannot fan out. */
const MAX_ATTEMPTS = 3;
const OUTPUT_SIZE = 128;
/** Below this the browser would blow the icon up into a blur; the initial reads better. */
const MIN_SIZE = 32;
export const ICON_BYTE_LIMIT = 64 * 1024;

export type SiteIcon = { iconUrl: string; buffer: Buffer; size: number };

type Kind = 'raster' | 'svg' | 'ico';

function attribute(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i'),
  );
  return match ? (match[1] ?? match[2] ?? match[3] ?? '').trim() : '';
}

function kindOf(type: string, url: URL): Kind {
  const path = url.pathname.toLowerCase();
  if (type.includes('svg') || path.endsWith('.svg')) return 'svg';
  if (type.includes('icon') || path.endsWith('.ico')) return 'ico';
  return 'raster';
}

/** The largest square size a `sizes` attribute declares, or null when it says nothing. */
function declaredSize(sizes: string): number | null {
  const values = [...sizes.matchAll(/(\d+)x(\d+)/gi)].map(match =>
    Math.min(Number(match[1]), Number(match[2])),
  );
  return values.length ? Math.max(...values) : null;
}

/**
 * Where a crisp mark is most likely to be: a declared raster near 192 px first (an
 * apple-touch-icon counts as 180), then an SVG, then smaller rasters, and a
 * favicon.ico last, since it usually holds only 16–32 px. Rated, not filtered: the
 * reader walks down this list until one candidate decodes.
 */
function rank(kind: Kind, size: number | null): number {
  if (kind === 'ico') return 100;
  if (kind === 'svg') return 700;
  if (size === null) return 500;
  if (size >= 96) return 1000 - Math.min(Math.abs(size - 192), 200);
  return 300 + size;
}

/**
 * Icon links the page declares, best first, resolved against the page.
 * `mask-icon` is skipped: it is a one-colour silhouette for Safari's pinned tabs.
 * The two paths sites serve without declaring them are appended as a fallback.
 */
export function readIconLinks(html: string, pageUrl: string): string[] {
  const ordered: string[] = [];
  // The head's icons before any streamed after it; each part best first.
  for (const scope of metadataScopes(html)) {
    const found: { url: string; score: number }[] = [];
    for (const [tag] of scope.matchAll(/<link\b[^>]*>/gi)) {
      const rel = attribute(tag, 'rel').toLowerCase().split(/\s+/);
      const apple = rel.some(value => value.startsWith('apple-touch-icon'));
      if (!apple && !rel.includes('icon')) continue;
      const href = attribute(tag, 'href');
      if (!href || href.startsWith('data:')) continue;
      let url: URL;
      try {
        url = new URL(href, pageUrl);
      } catch {
        continue;
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      const kind = kindOf(attribute(tag, 'type').toLowerCase(), url);
      const size = declaredSize(attribute(tag, 'sizes')) ?? (apple ? 180 : null);
      found.push({ url: url.toString(), score: rank(kind, size) });
    }
    found.sort((a, b) => b.score - a.score);
    ordered.push(...found.map(candidate => candidate.url).filter(url => url.length <= 1000));
  }
  try {
    const origin = new URL(pageUrl).origin;
    ordered.push(`${origin}/apple-touch-icon.png`, `${origin}/favicon.ico`);
  } catch {
    // An unparsable page URL has no origin to fall back on.
  }
  return [...new Set(ordered)];
}

const isPng = (bytes: Buffer) =>
  bytes.length > 8 && bytes.readUInt32BE(0) === 0x89504e47 && bytes.readUInt32BE(4) === 0x0d0a1a0a;
const isIco = (bytes: Buffer) =>
  bytes.length > 6 && bytes.readUInt16LE(0) === 0 && bytes.readUInt16LE(2) === 1;

type Decoded = { png: Buffer } | { raw: Buffer; width: number; height: number };

/**
 * The largest image inside a .ico file. Sharp has no ICO reader, so the container is
 * opened here: a PNG entry is handed over as is, and the common uncompressed 32- and
 * 24-bit bitmaps are turned into RGBA. Palette bitmaps (old 16-colour icons) return
 * null and the next candidate is tried.
 */
export function decodeIco(bytes: Buffer): Decoded | null {
  if (!isIco(bytes)) return null;
  const count = bytes.readUInt16LE(4);
  let best: { offset: number; length: number; area: number; bits: number } | null = null;
  for (let index = 0; index < Math.min(count, 64); index++) {
    const at = 6 + index * 16;
    if (at + 16 > bytes.length) return null;
    const width = bytes[at] || 256;
    const height = bytes[at + 1] || 256;
    const bits = bytes.readUInt16LE(at + 6);
    const length = bytes.readUInt32LE(at + 8);
    const offset = bytes.readUInt32LE(at + 12);
    if (offset + length > bytes.length) continue;
    const area = width * height;
    if (!best || area > best.area || (area === best.area && bits > best.bits))
      best = { offset, length, area, bits };
  }
  if (!best) return null;
  const data = bytes.subarray(best.offset, best.offset + best.length);
  if (isPng(data)) return { png: Buffer.from(data) };
  if (data.length < 40) return null;
  const headerSize = data.readUInt32LE(0);
  const width = data.readInt32LE(4);
  const height = Math.abs(data.readInt32LE(8)) / 2; // the AND mask doubles the height
  const bits = data.readUInt16LE(14);
  const compression = data.readUInt32LE(16);
  if (compression !== 0 || (bits !== 32 && bits !== 24)) return null;
  if (width <= 0 || width > 256 || height <= 0 || height > 256) return null;
  const stride = Math.ceil((width * bits) / 32) * 4;
  const maskStride = Math.ceil(width / 32) * 4;
  const maskStart = headerSize + stride * height;
  if (maskStart > data.length) return null;
  const hasMask = maskStart + maskStride * height <= data.length;
  const raw = Buffer.alloc(width * height * 4);
  let anyAlpha = false;
  // Rows are stored bottom-up, pixels as BGR(A).
  for (let y = 0; y < height; y++) {
    const row = headerSize + (height - 1 - y) * stride;
    for (let x = 0; x < width; x++) {
      const source = row + x * (bits / 8);
      const target = (y * width + x) * 4;
      raw[target] = data[source + 2];
      raw[target + 1] = data[source + 1];
      raw[target + 2] = data[source];
      const alpha = bits === 32 ? data[source + 3] : 255;
      raw[target + 3] = alpha;
      if (alpha) anyAlpha = true;
    }
  }
  // 24-bit icons (and 32-bit ones with an empty alpha channel) carry transparency in
  // the 1-bit AND mask instead: a set bit is a transparent pixel.
  if ((bits === 24 || !anyAlpha) && hasMask) {
    for (let y = 0; y < height; y++) {
      const row = maskStart + (height - 1 - y) * maskStride;
      for (let x = 0; x < width; x++) {
        const transparent = (data[row + (x >> 3)] >> (7 - (x & 7))) & 1;
        raw[(y * width + x) * 4 + 3] = transparent ? 0 : 255;
      }
    }
  } else if (!anyAlpha) {
    for (let index = 3; index < raw.length; index += 4) raw[index] = 255;
  }
  return { raw, width, height };
}

const formats = ['png', 'jpeg', 'webp', 'gif', 'avif', 'svg'];

/**
 * Any icon file turned into a square WebP of at most 128 px on a transparent
 * background. SVG is rasterised here and never served as SVG; animation is dropped
 * (only the first frame is read). Null when the file is not an image we accept or
 * too small to look sharp.
 */
export async function normalizeIcon(
  bytes: Buffer,
): Promise<{ buffer: Buffer; size: number } | null> {
  const limits = { limitInputPixels: 16_000_000, failOn: 'warning' as const };
  let input: Sharp;
  // The source's own size: a 16 px favicon must not be padded into a 128 px square.
  let longest: number;
  let shortest: number;
  if (isIco(bytes)) {
    const decoded = decodeIco(bytes);
    if (!decoded) return null;
    if ('png' in decoded) {
      input = sharp(decoded.png, limits);
      const meta = await input.metadata();
      longest = Math.max(meta.width ?? 0, meta.height ?? 0);
      shortest = Math.min(meta.width ?? 0, meta.height ?? 0);
    } else {
      input = sharp(decoded.raw, {
        raw: { width: decoded.width, height: decoded.height, channels: 4 },
      });
      longest = Math.max(decoded.width, decoded.height);
      shortest = Math.min(decoded.width, decoded.height);
    }
  } else {
    const probe = sharp(bytes, limits);
    const meta = await probe.metadata();
    if (!formats.includes(meta.format ?? '')) return null;
    if (meta.format === 'svg') {
      // Vectors are drawn large enough for a 128 px result instead of their nominal 16–32.
      const nominal = Math.max(meta.width ?? 0, meta.height ?? 0) || 32;
      const density = Math.min(Math.max((72 * OUTPUT_SIZE * 2) / nominal, 72), 2400);
      input = sharp(bytes, { ...limits, density });
      longest = shortest = OUTPUT_SIZE;
    } else {
      input = probe;
      longest = Math.max(meta.width ?? 0, meta.height ?? 0);
      shortest = Math.min(meta.width ?? 0, meta.height ?? 0);
    }
  }
  if (shortest < MIN_SIZE) return null;
  const target = Math.min(OUTPUT_SIZE, longest);
  const { data, info } = await input
    .resize(target, target, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer({ resolveWithObject: true });
  if (data.length > ICON_BYTE_LIMIT) return null;
  return { buffer: data, size: info.width };
}

/** The best icon the page declares, downloaded through the SSRF-guarded fetch. */
export async function fetchSiteIcon(
  html: string,
  pageUrl: string,
  agent: string,
): Promise<SiteIcon | null> {
  for (const iconUrl of readIconLinks(html, pageUrl).slice(0, MAX_ATTEMPTS)) {
    const file = await guardedFetch(iconUrl, 'image/*', ICON_TIMEOUT, agent);
    if (!file) continue;
    const bytes = await readCapped(file.response, ICON_FILE_LIMIT);
    if (!bytes) continue;
    try {
      const icon = await normalizeIcon(bytes);
      if (icon) return { iconUrl, ...icon };
    } catch {
      // Not decodable: try the next candidate.
    }
  }
  return null;
}
