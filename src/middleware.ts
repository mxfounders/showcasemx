import { NextResponse, type NextRequest } from 'next/server';
import { isLocale, localeHeader, type Locale } from './i18n/config';
import { requestLocale } from './i18n/negotiate';
import { isPagePath } from './lib/routes';
import { notFoundResponse } from './lib/not-found-response';

/**
 * Every page lives under `/[locale]`. An unprefixed path — an internal `href="/account"`
 * or an old external link — redirects to the locale of the page it came from, else the
 * browser preference, so following a link never silently switches language.
 *
 * A path that cannot be a page (`/wp-login.php`, `/.env`, `/es/admin`) gets a small 404
 * here instead of reaching `[locale]`, which used to render the whole home page for any
 * unknown first segment (CLAUDE.md §79).
 */
export function middleware(request: NextRequest) {
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
    if (trimmed === pathname) return withLocaleHeader(request, first);
    // A plain URL keeps the query; a NextURL clone would put back the trailing slash.
    const url = new URL(request.nextUrl.href);
    url.pathname = trimmed;
    return NextResponse.redirect(url, 308);
  }

  const locale = requestLocale(request);
  if (!isPagePath(segments)) return notFoundResponse(locale);
  // A plain URL keeps the query (e.g. /sign-in?next=/account/saved).
  const url = new URL(request.nextUrl.href);
  url.pathname = `/${locale}${trimmed === '/' ? '' : trimmed}`;
  return NextResponse.redirect(url);
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
