import { cookies } from 'next/headers';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getSession,sessionCookie } from '@/lib/auth/session';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export default async function NotFound() {
  // Since this is not-found, we might not get the locale from params directly in some Next.js versions.
  // But we can fallback to 'es'
  const locale = 'es';
  
  let authenticated=false;
  try{authenticated=Boolean(await getSession((await cookies()).get(sessionCookie)?.value));}catch{}
  
  const dict = await getDictionary(locale as Locale);

  return (
    <>
      <Navbar authenticated={authenticated} dict={dict.navbar} locale={locale}/>
      <main id="main-content" className="pt-14 flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h1 className="text-9xl font-bold tracking-tighter" style={{ color: '#365DC4' }}>404</h1>
        <p className="mt-6 text-xl font-medium text-stone-900 sm:text-2xl">
          Página no encontrada
        </p>
        <p className="mt-3 text-base text-stone-500 max-w-md mx-auto leading-relaxed">
          Lo sentimos, no pudimos encontrar la página que estás buscando. Puede que haya sido movida o ya no exista.
        </p>
        <div className="mt-10">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-stone-900 px-8 text-sm font-medium text-white transition-transform hover:scale-105 active:scale-95"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
      <Footer dict={dict.footer} locale={locale}/>
    </>
  );
}
