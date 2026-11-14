import { NextResponse, type NextRequest } from 'next/server';
import { i18n, localeHeader, type Locale } from './i18n/config';
import { requestLocale } from './i18n/negotiate';

/**
 * Every page lives under `/[locale]`. An unprefixed path — an internal `href="/account"`
 * or an old external link — redirects to the locale of the page it came from, else the
 * browser preference, so following a link never silently switches language.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // next.config.mjs turns off Next's own trailing-slash redirect for the analytics
  // relay, so pages keep a single URL here instead.
  const path = pathname.replace(/(.)\/+$/, '$1');
  const locale = i18n.locales.find(
    candidate => path === `/${candidate}` || path.startsWith(`/${candidate}/`),
  );
  if (locale && path === pathname) return withLocaleHeader(request, locale);

  // A plain URL keeps the query (e.g. /sign-in?next=/account/saved); a NextURL clone
  // would also put back the trailing slash being removed.
  const url = new URL(request.nextUrl.href);
  if (locale) {
    url.pathname = path;
    return NextResponse.redirect(url, 308);
  }
  url.pathname = `/${requestLocale(request)}${path === '/' ? '' : path}`;
  return NextResponse.redirect(url);
}

function withLocaleHeader(request: NextRequest, locale: Locale) {
  const headers = new Headers(request.headers);
  headers.set(localeHeader, locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!api|relay/|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
