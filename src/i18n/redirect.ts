import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { i18n, isLocale, localeHeader } from './config';
import { localePath } from './paths';

/**
 * `redirect()` that keeps the request's locale (set by the middleware), for server code
 * that has no `params` at hand — auth guards and shared helpers. A bare redirect would
 * bounce through the middleware and could land in the browser's language instead.
 */
export async function localeRedirect(path: string): Promise<never> {
  const locale = (await headers()).get(localeHeader) ?? '';
  redirect(localePath(path, isLocale(locale) ? locale : i18n.defaultLocale));
}
