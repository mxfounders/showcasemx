import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';
import { i18n, isLocale, type Locale } from './config';

/** The best supported locale for an `Accept-Language` header, or the default locale. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  const languages = new Negotiator({
    headers: { 'accept-language': acceptLanguage ?? '' },
  }).languages();
  try {
    const locale = match(languages, [...i18n.locales], i18n.defaultLocale);
    return isLocale(locale) ? locale : i18n.defaultLocale;
  } catch {
    // match() throws on tags it cannot canonicalize, such as the "*" wildcard.
    return i18n.defaultLocale;
  }
}

/**
 * The locale an API response should be written in: the `[locale]` segment of the page
 * that issued the request, else the browser preference, else the default locale.
 *
 * Same-origin `fetch` calls carry the full page URL in `Referer` because the site sends
 * `Referrer-Policy: strict-origin-when-cross-origin` (next.config.mjs).
 */
export function requestLocale(request: Request): Locale {
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const segment = new URL(referer).pathname.split('/')[1] ?? '';
      if (isLocale(segment)) return segment;
    } catch {
      // A malformed Referer is ignored; the browser preference decides instead.
    }
  }
  return negotiateLocale(request.headers.get('accept-language'));
}
