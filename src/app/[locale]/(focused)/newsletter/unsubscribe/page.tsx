import type { Metadata } from 'next';
import { NewsletterUnsubscribe } from '@/components/newsletter-unsubscribe';
import { getDictionary } from '@/i18n/get-dictionary';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.newsletter.unsubscribe.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function NewsletterUnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  const dict = (await getDictionary(locale)).newsletter.unsubscribe;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <NewsletterUnsubscribe token={typeof token === 'string' ? token : ''} dict={dict} />
    </section>
  );
}
