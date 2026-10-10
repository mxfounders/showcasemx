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
  const locale = i18n.locales.find(
    candidate => pathname === `/${candidate}` || pathname.startsWith(`/${candidate}/`),
  );
  if (locale) return withLocaleHeader(request, locale);

  // Clone so the query survives the redirect (e.g. /sign-in?next=/account/saved).
  const url = request.nextUrl.clone();
  url.pathname = `/${requestLocale(request)}${pathname}`;
  return NextResponse.redirect(url);
}

function withLocaleHeader(request: NextRequest, locale: Locale) {
  const headers = new Headers(request.headers);
  headers.set(localeHeader, locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
