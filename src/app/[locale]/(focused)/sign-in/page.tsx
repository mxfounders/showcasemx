import { getDictionary } from '@/i18n/get-dictionary';
import { googleConfig } from '@/lib/auth/google';
import { authReturnTo } from '@/lib/auth/return-to';
import { cookies } from 'next/headers';
import { localeRedirect } from '@/i18n/redirect';
import { challengeCookie, getSession, sessionCookie } from '@/lib/auth/session';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const dict = await getDictionary((await params).locale);
  return {
    title: `${dict.auth.signInTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function SignInPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; google?: string; step?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const dict = (await getDictionary(locale)).auth;
  const returnTo = authReturnTo(searchParams.next);
  const jar = await cookies();
  let signedIn = false;
  try {
    signedIn = Boolean(await getSession(jar.get(sessionCookie)?.value));
  } catch {
    /* The form reports unavailable storage when submitted. */
  }
  if (signedIn) return localeRedirect(returnTo);
  // Back from Google on an account with two-step verification (SHCWS-172): the code
  // step opens directly. The cookie only proves a challenge may exist; the server
  // checks it when the code is sent, and the normal form shows if it's gone.
  const awaitingCode =
    searchParams.step === 'totp' && /^[a-f0-9]{64}$/.test(jar.get(challengeCookie)?.value ?? '');
  return (
    <section className="mx-auto max-w-[568px] px-6 pb-20 pt-8 sm:pt-14">
      <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-900 sm:text-5xl">
        <span dangerouslySetInnerHTML={{ __html: dict.welcomeTitle }} />
      </h1>
      <p className="mb-9 mt-4 text-base leading-relaxed text-stone-500">{dict.signInDesc}</p>
      {searchParams.google === 'error' && (
        <p role="alert" className="mb-5 text-sm text-[#A94E35]">
          {dict.googleError}
        </p>
      )}
      <AuthForm
        dict={dict}
        googleAvailable={!!googleConfig()}
        returnTo={returnTo}
        mode="login"
        awaitingCode={awaitingCode}
      />
    </section>
  );
}
