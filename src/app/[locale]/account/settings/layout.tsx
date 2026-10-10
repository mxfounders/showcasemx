import type { Metadata } from 'next';
import { SettingsNav } from '@/components/settings/settings-nav';
import { requireFounder } from '@/lib/solutions/server';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return { title: `${dict.settings.metaTitle} | shwcs`, robots: { index: false, follow: false } };
}
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  await requireFounder();
  const dict = (await getDictionary((await params).locale)).settings;
  return (
    <section className="account-page">
      <header className="mb-8">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {dict.layout.title}
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-stone-500">{dict.layout.description}</p>
      </header>
      <SettingsNav dict={dict.nav} />
      {children}
    </section>
  );
}
