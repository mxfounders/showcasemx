import { getDictionary } from '@/i18n/get-dictionary';
import { cookies } from 'next/headers';
import { localeRedirect } from '@/i18n/redirect';
import type { Metadata } from 'next';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql } from '@/lib/auth/security';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.onboarding.title} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function OnboardingPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).onboarding;
  const account = await getSession((await cookies()).get(sessionCookie)?.value);
  if (!account) return localeRedirect('/sign-in?next=/onboarding');
  // If storage is briefly unavailable, show the form rather than crash the page —
  // submitting it is what actually needs the database, and it reports that clearly.
  let alreadyNamed = false;
  try {
    const sql = authSql();
    const [row] = await sql`SELECT name FROM auth_accounts WHERE id = ${account.id}`;
    alreadyNamed = !!row?.name?.trim();
  } catch {
    /* form still renders; PATCH /api/account reports storage errors on submit */
  }
  if (alreadyNamed) return localeRedirect('/account');
  return (
    <section className="mx-auto max-w-[640px] px-6 pb-20 pt-8 sm:pt-14">
      <OnboardingForm dict={dict} />
    </section>
  );
}
