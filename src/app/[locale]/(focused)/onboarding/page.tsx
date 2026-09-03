import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { authSql } from '@/lib/auth/security';
import { OnboardingForm } from '@/components/onboarding/onboarding-form';
export const metadata: Metadata = { title: 'Cuéntanos de ti | shwcs', robots: { index: false, follow: false } };
export default async function OnboardingPage() {
  const account = await getSession((await cookies()).get(sessionCookie)?.value);
  if (!account) redirect('/sign-in?next=/onboarding');
  // If storage is briefly unavailable, show the form rather than crash the page —
  // submitting it is what actually needs the database, and it reports that clearly.
  let alreadyNamed = false;
  try {
    const sql = authSql();
    const [row] = await sql`SELECT name FROM auth_accounts WHERE id = ${account.id}`;
    alreadyNamed = !!row?.name?.trim();
  } catch { /* form still renders; PATCH /api/account reports storage errors on submit */ }
  if (alreadyNamed) redirect('/account');
  return <section className="mx-auto max-w-[640px] px-6 pb-20 pt-8 sm:pt-14">
    <OnboardingForm />
  </section>;
}
