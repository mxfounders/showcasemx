'use client';

// Custom next/image loader. Only rewrites founder-screenshot URLs
// (/api/solutions/<id>/media/<assetId>) to ?w=<snapped width>; the serve route
// returns the 400/800 rendition (solution_media_files) or the full image.
//
// Everything else passes through untouched: site-image covers (already small and
// mutable behind a stable URL), avatars, and static /brand art. Because this is a
// custom loader — not Next's built-in optimizer — the browser fetches the chosen
// URL directly with cookies, so it works for a logged-in owner viewing a draft,
// not just for public published images.
const WIDTHS = [400, 800, 1600];

export default function mediaLoader({ src, width }) {
  if (typeof src !== 'string' || !/^\/api\/solutions\/[^/]+\/media\/[^/?]+/.test(src)) {
    return src;
  }
  const w = WIDTHS.find((x) => x >= width) ?? 1600;
  return `${src}${src.includes('?') ? '&' : '?'}w=${w}`;
}
