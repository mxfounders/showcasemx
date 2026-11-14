import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, localeHeader, type Locale } from './i18n/config';
import { requestLocale } from './i18n/negotiate';
import { isPagePath } from './lib/routes';
import { notFoundResponse } from './lib/not-found-response';
import { listingRoute, type ListingRoute } from './lib/solutions/slug-routing';

/**
 * Every page lives under `/[locale]`. An unprefixed path — an internal `href="/account"`
 * or an old external link — redirects to the locale of the page it came from, else the
 * browser preference, so following a link never silently switches language.
 *
 * A path that cannot be a page (`/wp-login.php`, `/.env`, `/es/admin`) gets a small 404
 * here instead of reaching `[locale]`, which used to render the whole home page for any
 * unknown first segment (CLAUDE.md §79).
 *
 * A listing reached by its UUID or by a slug it no longer uses answers a permanent 301
 * to its current slug, and an unknown slug a 404 (SHCWS-101, slug-routing.ts).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // next.config.mjs turns off Next's own trailing-slash redirect for the analytics
  // relay, so pages keep a single URL here instead.
  const trimmed = pathname.replace(/(.)\/+$/, '$1');
  // Next can hand the middleware a page's own transport forms (RSC payloads, prefetch
  // and per-segment variants); they are judged as the page they belong to.
  const page = trimmed.replace(/(?:\.segments\/.*|\.prefetch(?:\.rsc)?|\.rsc)$/, '');
  const segments = page.split('/').filter(Boolean);
  const [first = ''] = segments;
  if (isLocale(first)) {
    if (!isPagePath(segments.slice(1))) return notFoundResponse(first);
    const listing = await listingOf(segments.slice(1));
    if (listing?.kind === 'missing') return notFoundResponse(first);
    if (listing?.kind === 'redirect') {
      // Permanent: the listing's name is its address now. Keeps the query (?from=sponsored)
      // and Next's transport suffix (.rsc), so a client navigation lands on the same form.
      const url = new URL(request.nextUrl.href);
      url.pathname = withListingSlug(trimmed, 3, segments[2], listing.slug);
      return NextResponse.redirect(url, 301);
    }
    if (trimmed === pathname) return withLocaleHeader(request, first);
    // A plain URL keeps the query; a NextURL clone would put back the trailing slash.
    const url = new URL(request.nextUrl.href);
    url.pathname = trimmed;
    return NextResponse.redirect(url, 308);
  }

  const locale = requestLocale(request);
  if (!isPagePath(segments)) return notFoundResponse(locale);
  const listing = await listingOf(segments);
  if (listing?.kind === 'missing') return notFoundResponse(locale);
  // A plain URL keeps the query (e.g. /sign-in?next=/account/saved). An old listing URL
  // goes straight to the slug, in one hop; the locale part stays a temporary choice.
  const path =
    listing?.kind === 'redirect' ? withListingSlug(trimmed, 2, segments[1], listing.slug) : trimmed;
  const url = new URL(request.nextUrl.href);
  url.pathname = `/${locale}${path === '/' ? '' : path}`;
  return NextResponse.redirect(url);
}

/** The listing behind `['soluciones', segment, …]`, or null for any other page. */
function listingOf(segments: string[]): Promise<ListingRoute> | null {
  return segments[0] === 'soluciones' && segments[1] ? listingRoute(segments[1]) : null;
}

/** `path` with its listing segment (part `index`, which starts with `ref`) renamed. */
function withListingSlug(path: string, index: number, ref: string, slug: string) {
  const parts = path.split('/');
  parts[index] = slug + parts[index].slice(ref.length);
  return parts.join('/');
}

function withLocaleHeader(request: NextRequest, locale: Locale) {
  const headers = new Headers(request.headers);
  headers.set(localeHeader, locale);
  return NextResponse.next({ request: { headers } });
}

// Runs on everything except API routes, Next internals and the files the site really
// serves (public/ and the metadata routes in src/app). Paths with a dot are no longer
// skipped wholesale: scanners probe file-like paths, and those must 404 here.
// tests/routes.test.ts checks this list against public/ and src/app.
export const config = {
  matcher: [
    '/((?!api/|relay/|_next/|_vercel/|__nextjs|brand/|icons/|images/|favicon\\.ico$|icon\\.png$|apple-icon\\.png$|og-image\\.png$|manifest\\.webmanifest$|robots\\.txt$|sitemap\\.xml$|llms\\.txt$|soluciones/[^/]+\\.md$).*)',
  ],
};
