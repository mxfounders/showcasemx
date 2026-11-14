/**
 * Links from a listing to the project's own site, demo, evidence and social profiles
 * (SHCWS-19). They carry `utm_source=shwcs` so the founder's analytics attribute the
 * visit to shwcs instead of «direct», and the anchors drop `noreferrer` (keeping
 * `noopener`) so the browser also sends shwcs as the origin. With the site-wide
 * `Referrer-Policy: strict-origin-when-cross-origin` that is only `https://shwcs.site/`,
 * never the listing path or anything about the visitor.
 *
 * `ref=` is deliberately not added: many sites read it as an affiliate code.
 */
export type OutboundMedium = 'listing' | 'sponsored';

/** `rel` for every outbound link that should show shwcs as the referrer. */
export const outboundRel = 'noopener';

/** Our own query flag on a listing URL when the visit came from a sponsored slot. */
export const sponsoredVisitParam = 'from';
export const sponsoredVisitValue = 'sponsored';

export function outboundMedium(from: unknown): OutboundMedium {
  return from === sponsoredVisitValue ? 'sponsored' : 'listing';
}

/**
 * Adds `utm_source=shwcs&utm_medium=<medium>` to an http(s) URL that the listing already
 * validated (safeSolutionUrl). A URL the founder tagged with their own `utm_*` keeps
 * theirs untouched: they chose how to read that traffic. Anything unparsable is returned
 * as is.
 */
export function outboundUrl(href: string, medium: OutboundMedium = 'listing'): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return href;
  if ([...url.searchParams.keys()].some(key => key.toLowerCase().startsWith('utm_'))) return href;
  url.searchParams.set('utm_source', 'shwcs');
  url.searchParams.set('utm_medium', medium);
  return url.href;
}
