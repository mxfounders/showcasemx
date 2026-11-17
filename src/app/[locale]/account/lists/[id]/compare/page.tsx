import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireBuyer, getLists, getMemberships } from '@/lib/library/server';
import { comparisonKeys } from '@/lib/library/model';
import { comparedProjects } from '@/lib/library/comparison-server';
import { ComparisonRegion, ComparisonTable } from '@/components/library/comparison-table';
import { isSolutionId } from '@/lib/solutions/model';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.library.compare.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
/**
 * Two or three projects of one of the buyer's lists, side by side (§8, SHCWS-53): their
 * published data in structured rows, plus the buyer's own notes for this list. Only the
 * list's owner reaches it; the URL is not a link to share.
 */
export default async function ComparePage(props: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isSolutionId(params.id)) notFound();
  const t = (await getDictionary(params.locale)).library.compare;
  const account = await requireBuyer('/account/lists');
  const [lists, memberships] = await Promise.all([
    getLists(account.id),
    getMemberships(account.id),
  ]);
  const list = lists.find(row => row.id === params.id);
  if (!list) notFound();
  const items = memberships.filter(row => row.list_id === list.id),
    keys = comparisonKeys(
      searchParams.project,
      items.map(row => row.project_key),
    );
  const back = `/account/lists/${list.id}`;
  if (!keys)
    return (
      <section className="account-page">
        <h1 className="text-3xl font-semibold">{t.invalidTitle}</h1>
        <p className="mt-4 text-stone-500">{t.invalidBody}</p>
        <Link href={back} className="mt-6 inline-block text-[#365DC4]">
          {t.backToList}
        </Link>
      </section>
    );
  const projects = await comparedProjects(keys);
  const notes = Object.fromEntries(
    keys.map(key => [key, items.find(item => item.project_key === key)?.note ?? '']),
  );
  const contactable = keys.filter(key => projects[key]?.solutionId);
  return (
    <section className="account-page">
      <Link href={back} className="text-sm text-[#365DC4]">
        {t.backTo.replace('{name}', () => list.name)}
      </Link>
      <h1 className="mt-7 text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
      <p className="mt-4 max-w-2xl text-stone-500">{t.intro}</p>
      <p id="compare-help" className="mt-4 text-xs text-stone-500">
        {t.help}
      </p>
      <ComparisonRegion label={t.regionLabel} describedBy="compare-help">
        <ComparisonTable
          keys={keys}
          projects={projects}
          locale={params.locale}
          t={t}
          caption={t.caption.replace('{name}', () => list.name)}
          notes={notes}
        />
      </ComparisonRegion>
      {contactable.length >= 2 && (
        // One form for all of them (SHCWS-62); the proposal page checks each recipient again.
        <section aria-labelledby="compare-propose" className="mt-10 max-w-2xl">
          <h2 id="compare-propose" className="text-xl font-medium">
            {t.proposeTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{t.proposeBody}</p>
          <Link
            href={`/account/lists/${list.id}/proposal?${new URLSearchParams(
              contactable.map(key => ['project', key]),
            )}`}
            style={actionButtonStyle}
            className="action-button mt-5 inline-flex rounded-full px-5 py-3 text-sm font-medium"
          >
            {t.propose.replace('{count}', String(contactable.length))}
          </Link>
        </section>
      )}
    </section>
  );
}
