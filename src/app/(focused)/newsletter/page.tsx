import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/newsletter-form';
export const metadata: Metadata = {
  title: 'Novedades y avisos | shwcs',
  description: 'Suscríbete para conocer nuevas soluciones, actualizaciones y avisos de shwcs.',
};
export default function NewsletterPage() {
  return <section className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-14">
    <h1 className="mb-12 text-3xl font-semibold leading-tight tracking-[-0.04em] text-stone-900 sm:mb-16 sm:text-[42px]">Suscríbete al newsletter.<br />Mantente al día.</h1>
    <NewsletterForm />
  </section>;
}
