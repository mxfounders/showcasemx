import { cookies, headers } from 'next/headers';
import Link from '@/i18n/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { actionButtonStyle } from '@/lib/brand-colors';
import { i18n, isLocale, localeHeader } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Metadata } from 'next';

// Some routes with data-driven notFound() (an arbitrary /soluciones/[id] or
// /comunidad/[id] that doesn't exist) can't set a real 404 status code — a
// Next.js limitation, not something fixable here: a loading.tsx on the route
// streams a 200 shell before this boundary's own status could take effect
// (see CLAUDE.md §56, https://github.com/vercel/next.js/issues/75543). Noindex
// stops a crawler from treating that 200 as a real, indexable page regardless.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function NotFound() {
  // not-found receives no params; the middleware forwards the route's locale instead.
  const requested = (await headers()).get(localeHeader) ?? '';
  const locale = isLocale(requested) ? requested : i18n.defaultLocale;

  let authenticated = false;
  try {
    authenticated = Boolean(await getSession((await cookies()).get(sessionCookie)?.value));
  } catch {}

  const dict = await getDictionary(locale);

  return (
    <>
      <Navbar authenticated={authenticated} dict={dict.navbar} locale={locale} />
      <main
        id="main-content"
        className="pt-14 flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
      >
        <h1 className="text-9xl font-bold tracking-tighter" style={{ color: '#365DC4' }}>
          404
        </h1>
        <p className="mt-6 text-xl font-medium text-stone-900 sm:text-2xl">{dict.notFound.title}</p>
        <p className="mt-3 text-base text-stone-500 max-w-md mx-auto leading-relaxed">
          {dict.notFound.description}
        </p>
        <div className="mt-10">
          <Link
            href="/"
            style={actionButtonStyle}
            className="action-button inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-medium transition-transform hover:scale-105 active:scale-95"
          >
            {dict.notFound.backHome}
          </Link>
        </div>
      </main>
      <Footer dict={dict.footer} locale={locale} />
    </>
  );
}
