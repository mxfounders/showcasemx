'use client';

import NextLink from 'next/link';
import { usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';
import { useMemo, type ComponentProps } from 'react';
import { localePath, stripLocale } from './paths';
import { useLocale } from './use-locale';

/**
 * Locale-aware drop-ins for `next/link` and `next/navigation`. Components keep writing
 * semantic paths (`/account/saved`); these add the route's locale so navigation goes
 * straight to the page — prefetched, without a redirect hop — and stays in the
 * language the person is reading. Switching language is the only code that should
 * import the raw Next versions.
 */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const localized =
    typeof href === 'string'
      ? localePath(href, locale)
      : { ...href, pathname: href.pathname ? localePath(href.pathname, locale) : href.pathname };
  return <NextLink href={localized} {...props} />;
}

export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) =>
        router.push(localePath(href, locale), options),
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) =>
        router.replace(localePath(href, locale), options),
      prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) =>
        router.prefetch(localePath(href, locale), options),
    }),
    [router, locale],
  );
}

/** The current route without its locale, comparable with the semantic hrefs above. */
export function usePathname() {
  return stripLocale(useNextPathname() ?? '/');
}
