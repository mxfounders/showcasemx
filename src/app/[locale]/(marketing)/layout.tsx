import { cookies } from 'next/headers';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { getDictionary } from '@/i18n/get-dictionary';
import { CompareTray } from '@/components/compare/compare-tray';

export default async function MarketingLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const { children } = props;
  const { locale } = params;

  let authenticated = false;
  try {
    authenticated = Boolean(await getSession((await cookies()).get(sessionCookie)?.value));
  } catch {
    /* Public navigation remains available if account storage is unavailable. */
  }

  const dict = await getDictionary(locale);

  return (
    <>
      <Navbar authenticated={authenticated} dict={dict.navbar} locale={locale} />
      <main id="main-content" className="pt-14">
        {children}
      </main>
      <Footer dict={dict.footer} locale={locale} />
      {/* «Comparar» selection from cards and listings (SHCWS-53). */}
      <CompareTray dict={dict.catalog.compare} />
    </>
  );
}
