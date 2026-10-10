import { getDictionary } from '@/i18n/get-dictionary';
import { googleConfig } from '@/lib/auth/google';
import { authReturnTo } from '@/lib/auth/return-to';
import { cookies } from 'next/headers';
import { localeRedirect } from '@/i18n/redirect';
import { getSession, sessionCookie } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.auth.signUpTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function SignUpPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; google?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).auth;
  const returnTo = authReturnTo(searchParams.next);
  let signedIn = false;
  try {
    signedIn = Boolean(await getSession((await cookies()).get(sessionCookie)?.value));
  } catch {
    /* The form reports unavailable storage when submitted. */
  }
  if (signedIn) return localeRedirect(returnTo);
  return (
    <section className="mx-auto max-w-[568px] px-6 pb-20 pt-8 sm:pt-14">
      <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-900 sm:text-5xl">
        <span dangerouslySetInnerHTML={{ __html: dict.welcomeTitle }} />
      </h1>
      <p className="mb-9 mt-4 text-base leading-relaxed text-stone-500">{dict.signUpDesc}</p>
      {searchParams.google === 'error' && (
        <p role="alert" className="mb-5 text-sm text-[#A94E35]">
          {dict.googleError}
        </p>
      )}
      <AuthForm
        dict={dict}
        googleAvailable={!!googleConfig()}
        returnTo={returnTo}
        mode="register"
      />
    </section>
  );
}
