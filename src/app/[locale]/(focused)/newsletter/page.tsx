import type { Metadata } from 'next';
import { NewsletterForm } from '@/components/newsletter-form';
import { getDictionary } from '@/i18n/get-dictionary';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { newsletter } = await getDictionary(locale);
  return { title: `${newsletter.metaTitle} | shwcs`, description: newsletter.metaDescription };
}

export default async function NewsletterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  return (
    <section className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-14">
      <h1
        className="mb-12 text-3xl font-semibold leading-tight tracking-[-0.04em] text-stone-900 sm:mb-16 sm:text-[42px]"
        dangerouslySetInnerHTML={{ __html: dict.newsletter.hero }}
      />
      <NewsletterForm dict={dict.newsletter} />
    </section>
  );
}
