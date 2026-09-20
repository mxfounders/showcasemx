import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/newsletter-form';
export const metadata: Metadata = {
  title: 'Novedades y avisos | shwcs',
  description: 'Suscríbete para conocer nuevas soluciones, actualizaciones y avisos de shwcs.',
};
import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export default async function NewsletterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale as Locale);
  return <section className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-14">
    <h1 className="mb-12 text-3xl font-semibold leading-tight tracking-[-0.04em] text-stone-900 sm:mb-16 sm:text-[42px]" dangerouslySetInnerHTML={{ __html: dict?.newsletterForm?.hero || "Suscríbete al newsletter.<br />Mantente al día." }} />
    <NewsletterForm dict={dict?.newsletterForm} />
  </section>;
}
