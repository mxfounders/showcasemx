import { getDictionary } from '@/i18n/get-dictionary';
import { PasswordForm } from '@/components/settings/password-form';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.auth.resetTitle} | shwcs`,
    robots: { index: false, follow: false },
    referrer: 'no-referrer' as const,
  };
}
export default async function ResetPasswordPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).auth;
  return (
    <section className="mx-auto max-w-lg px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.resetHeading}</h1>
      <p className="mb-9 mt-4 leading-relaxed text-stone-500">{dict.resetDesc}</p>
      <PasswordForm mode="reset" dict={dict} />
    </section>
  );
}
