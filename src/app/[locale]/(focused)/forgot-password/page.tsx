import { getDictionary } from '@/i18n/get-dictionary';
import Link from '@/i18n/navigation';
import { PasswordForm } from '@/components/settings/password-form';
import { recoveryConfig } from '@/lib/auth/recovery';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.auth.forgotTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export const dynamic = 'force-dynamic';
export default async function ForgotPasswordPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).auth;
  return (
    <section className="mx-auto max-w-lg px-6 py-16 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.forgotHeading}</h1>
      <p className="mb-9 mt-4 leading-relaxed text-stone-500">{dict.forgotDesc}</p>
      <PasswordForm mode="forgot" enabled={Boolean(recoveryConfig())} dict={dict} />
      <Link href="/sign-in" className="mt-8 inline-block text-sm text-stone-500">
        {dict.backToLogin}
      </Link>
    </section>
  );
}
