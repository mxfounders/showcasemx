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
    title: `${dict.notifications.weeklyUnsubscribe.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}

/** Turning off «Tu semana en shwcs» from the email's link (SHCWS-21). */
export default async function WeeklyUnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, { token }] = await Promise.all([params, searchParams]);
  const dict = (await getDictionary(locale)).notifications.weeklyUnsubscribe;
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <NewsletterUnsubscribe
        token={typeof token === 'string' ? token : ''}
        dict={dict}
        endpoint="/api/weekly/unsubscribe"
      />
    </section>
  );
}
