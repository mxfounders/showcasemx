import Link from '@/i18n/navigation';
import { requireBuyer, resolveProjects } from '@/lib/library/server';
import { comparisonHref, publishedSelection, selectionKeys } from '@/lib/library/comparison';
import { ProposalView } from '@/components/contacts/proposal-view';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.contactBatch.meta.proposal} | shwcs`,
    robots: { index: false, follow: false },
  };
}

/**
 * «Pedir propuesta a todos» from a temporary comparison (SHCWS-53): the same form as from
 * a list (SHCWS-62), without asking the buyer to make a list first. The selection must be
 * 2–3 distinct listings published right now.
 */
export default async function ComparisonProposalPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  const dictionary = await getDictionary(params.locale);
  const t = dictionary.contactBatch;
  const candidates = selectionKeys(searchParams.project);
  const account = await requireBuyer(
    candidates
      ? `/account/contacts/proposal?${new URLSearchParams(candidates.map(key => ['project', key]))}`
      : '/account/contacts',
  );
  const keys =
    candidates && publishedSelection(candidates, Object.keys(await resolveProjects(candidates)));
  if (!keys)
    return (
      <section className="account-page">
        <h1 className="text-3xl font-semibold">{t.page.invalidComparisonTitle}</h1>
        <p className="mt-4 text-stone-500">{t.page.invalidComparisonBody}</p>
        <Link href="/#catalogo" className="mt-6 inline-block text-[#365DC4]">
          {t.page.backToCatalog}
        </Link>
      </section>
    );
  return (
    <ProposalView
      account={account}
      keys={keys}
      listId={null}
      back={{ href: comparisonHref(keys), label: t.page.backToComparison }}
      dictionary={dictionary}
    />
  );
}
