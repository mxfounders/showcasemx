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
 * unknown first segment (CLAUDE.md §73).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Next can hand the middleware a page's own transport forms (RSC payloads, prefetch
  // and per-segment variants); they are judged as the page they belong to.
  const page = pathname.replace(/(?:\.segments\/.*|\.prefetch(?:\.rsc)?|\.rsc)$/, '');
  const segments = page.split('/').filter(Boolean);
  const [first = ''] = segments;
  if (isLocale(first)) {
    return isPagePath(segments.slice(1))
      ? withLocaleHeader(request, first)
      : notFoundResponse(first);
  }

  const locale = requestLocale(request);
  if (!isPagePath(segments)) return notFoundResponse(locale);
  // Clone so the query survives the redirect (e.g. /sign-in?next=/account/saved).
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
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
    '/((?!api/|_next/|_vercel/|__nextjs|brand/|icons/|images/|favicon\\.ico$|icon\\.png$|apple-icon\\.png$|og-image\\.png$|manifest\\.webmanifest$|robots\\.txt$|sitemap\\.xml$).*)',
  ],
};
