import Link from '@/i18n/navigation';
import { PlusIcon } from '@/components/icons/gota';
import { requireBuyer } from '@/lib/library/server';
import { listBuyerBriefs } from '@/lib/briefs/server';
import { briefState } from '@/lib/briefs/model';
import { needPreview } from '@/lib/contacts/model';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = (await getDictionary((await params).locale)).briefs;
  return { title: `${t.meta.list} | shwcs`, robots: { index: false, follow: false } };
}

/** The buyer's briefs (SHCWS-58), newest first, with how far each one got. */
export default async function BriefsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const account = await requireBuyer('/account/briefs');
  const t = (await getDictionary(locale)).briefs;
  const briefs = await listBuyerBriefs(account.id);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  return (
    <section className="account-page">
      <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.list.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{t.list.subtitle}</p>
        </div>
        <Link
          href="/account/briefs/new"
          style={actionButtonStyle}
          className="action-button inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm"
        >
          {t.list.new}
          <PlusIcon className="size-4" aria-hidden="true" />
        </Link>
      </header>
      {briefs.length ? (
        <ul className="grid gap-5">
          {briefs.map(brief => {
            const state = briefState(brief);
            const proposals =
              brief.proposals === 0
                ? t.list.proposalsNone
                : brief.proposals === 1
                  ? t.list.proposalsOne
                  : t.list.proposals.replace('{count}', String(brief.proposals));
            return (
              <li key={brief.id} className="rounded-2xl border border-stone-200 bg-white p-6">
                <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
                  {t.states[state]} · {t.facts.published.replace('{date}', date(brief.created_at))}
                </p>
                <h2 className="mt-2 break-words text-lg font-medium">
                  {needPreview(brief.problem, 160)}
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  {brief.categories
                    .map(value => localizedCategoryDisplayLabel(value, locale))
                    .join(', ')}
                </p>
                <div className="mt-5 flex flex-col gap-3 border-t border-stone-100 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-stone-600">
                    <span className="font-medium text-stone-900">{proposals}</span>
                    {' · '}
                    {brief.matches
                      ? t.list.matches.replace('{count}', String(brief.matches))
                      : t.list.matchesNone}
                    {brief.shortlisted && ` · ${t.list.shortlist}`}
                  </p>
                  <Link
                    href={`/account/briefs/${brief.id}`}
                    className="text-[#365DC4] underline-offset-4 hover:underline"
                  >
                    {t.list.open}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="max-w-xl rounded-2xl border border-dashed border-stone-300 p-6 text-sm leading-relaxed text-stone-500">
          {t.list.empty}
        </p>
      )}
    </section>
  );
}
