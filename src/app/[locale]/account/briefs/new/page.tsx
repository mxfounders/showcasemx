import Link from '@/i18n/navigation';
import { requireBuyer } from '@/lib/library/server';
import { authSql } from '@/lib/auth/security';
import { readBriefPrefill } from '@/lib/briefs/links';
import { BriefForm } from '@/components/briefs/brief-form';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = (await getDictionary((await params).locale)).briefs;
  return { title: `${t.meta.new} | shwcs`, robots: { index: false, follow: false } };
}

/**
 * Publica tu necesidad (SHCWS-58). Reached from the home page, searches and categories
 * that found nothing, and listings; what the link carried (the search, a category) is
 * kept through sign-in and only pre-fills the form.
 */
export default async function NewBriefPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ necesidad?: string; categoria?: string }>;
}) {
  const [{ locale }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const prefill = readBriefPrefill(searchParams);
  const query = new URLSearchParams();
  if (prefill.problem) query.set('necesidad', prefill.problem);
  if (prefill.categories[0]) query.set('categoria', prefill.categories[0]);
  const account = await requireBuyer(`/account/briefs/new${query.size ? `?${query}` : ''}`);
  const dictionary = await getDictionary(locale);
  const t = dictionary.briefs;
  const [row] = await authSql()`SELECT email_verified_at FROM auth_accounts WHERE id=${account.id}`;
  const [beforeLink, afterLink] = t.form.verifyBody.split('{link}');
  return (
    <section className="account-page">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.form.title}</h1>
      <p className="mb-10 mt-4 max-w-2xl leading-relaxed text-stone-500">{t.form.intro}</p>
      {!row?.email_verified_at && (
        <div className="mb-8 max-w-2xl rounded-2xl border border-[#E8C9A8] bg-[#FBF1E6] p-5 text-sm">
          <h2 className="font-medium text-stone-900">{t.form.verifyTitle}</h2>
          <p className="mt-2 leading-relaxed text-stone-600">
            {beforeLink}
            <Link
              href="/account/settings/security"
              className="text-[#365DC4] underline underline-offset-4"
            >
              {t.form.verifyLink}
            </Link>
            {afterLink}
          </p>
        </div>
      )}
      <div className="max-w-3xl">
        <BriefForm
          prefill={prefill}
          dict={t}
          contactsDict={{ timelines: dictionary.contacts.timelines }}
        />
      </div>
    </section>
  );
}
