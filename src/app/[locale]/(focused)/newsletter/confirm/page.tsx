import type { Metadata } from 'next';
import { NewsletterConfirm } from '@/components/newsletter-confirm';
import { getDictionary } from '@/i18n/get-dictionary';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.newsletter.confirm.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

export default async function NewsletterConfirmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const dict = (await getDictionary((await params).locale)).newsletter.confirm;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <NewsletterConfirm dict={dict} />
    </section>
  );
}
