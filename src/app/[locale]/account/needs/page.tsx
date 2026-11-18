import Link from '@/i18n/navigation';
import { requireFounder, getOwnedSolutions } from '@/lib/solutions/server';
import { listFounderNeeds } from '@/lib/briefs/server';
import { briefState } from '@/lib/briefs/model';
import { needPreview } from '@/lib/contacts/model';
import { localizedCategoryDisplayLabel, localizedCompanySizes } from '@/lib/taxonomy';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = (await getDictionary((await params).locale)).briefs;
  return { title: `${t.meta.needs} | shwcs`, robots: { index: false, follow: false } };
}

/**
 * Necesidades (SHCWS-58): briefs one of the founder's published listings fits. What the
 * buyer needs, never who they are; whether the founder proposed and was chosen.
 */
export default async function NeedsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const account = await requireFounder();
  const dictionary = await getDictionary(locale);
  const t = dictionary.briefs;
  const [needs, solutions] = await Promise.all([
    listFounderNeeds(account.id),
    getOwnedSolutions(account.id),
  ]);
  const published = solutions.some(solution => solution.published_data);
  const sizes = localizedCompanySizes(locale);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  return (
    <section className="account-page">
      <header className="mb-9">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.needs.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{t.needs.subtitle}</p>
      </header>
      {needs.length ? (
        <ul className="grid gap-5">
          {needs.map(need => {
            const state = briefState({ ...need, hidden_at: null });
            const status = need.chosen_at
              ? t.needs.chosen
              : need.proposed_at
                ? t.needs.proposed
                : t.needs.notProposed;
            return (
              <li key={need.id} className="rounded-2xl border border-stone-200 bg-white p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
                  {t.states[state]} · {t.facts.published.replace('{date}', date(need.created_at))}
                </p>
                <h2 className="mt-2 break-words text-lg font-medium">
                  {needPreview(need.problem, 180)}
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  {need.categories
                    .map(value => localizedCategoryDisplayLabel(value, locale))
                    .join(', ')}
                  {' · '}
                  {sizes.find(size => size.value === need.company_size)?.label ?? need.company_size}
                </p>
                <div className="mt-5 flex flex-col gap-3 border-t border-stone-100 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-stone-600">
                    <span className="font-medium text-stone-900">{status}</span>
                    {' · '}
                    {t.needs.matchedWith.replace('{listings}', need.listings.join(', '))}
                  </p>
                  <Link
                    href={`/account/needs/${need.id}`}
                    className="text-[#365DC4] underline-offset-4 hover:underline"
                  >
                    {t.needs.view}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="max-w-xl rounded-2xl border border-dashed border-stone-300 p-6 text-sm leading-relaxed text-stone-500">
          <p>{published ? t.needs.empty : t.needs.noListings}</p>
          {!published && (
            <Link
              href="/account/solutions/new"
              style={actionButtonStyle}
              className="action-button mt-4 inline-flex rounded-full px-5 py-2.5 text-sm"
            >
              {t.needs.publish}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
