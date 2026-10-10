import type { Metadata } from 'next';
import { EmailVerification } from '@/components/notifications/verification';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.notifications.verifyPage.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
    referrer: 'no-referrer',
  };
}
export default async function VerifyEmail({ params }: { params: Promise<{ locale: string }> }) {
  const dict = (await getDictionary((await params).locale)).notifications;
  return (
    <section className="mx-auto max-w-xl px-6 py-20">
      <h1 className="mb-8 text-4xl font-semibold tracking-tight">{dict.verifyPage.title}</h1>
      <EmailVerification confirm dict={dict.verification} />
    </section>
  );
}
