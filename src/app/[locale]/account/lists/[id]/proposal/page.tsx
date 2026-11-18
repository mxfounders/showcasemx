import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireBuyer, getLists, getMemberships } from '@/lib/library/server';
import { comparisonKeys } from '@/lib/library/model';
import { isSolutionId } from '@/lib/solutions/model';
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
 * «Pedir propuesta a estos 3» (SHCWS-62): the 2–3 projects chosen from one of the
 * buyer's lists, the same way the comparator takes them.
 */
export default async function ProposalPage(props: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const [params, searchParams] = await Promise.all([props.params, props.searchParams]);
  if (!isSolutionId(params.id)) notFound();
  const dictionary = await getDictionary(params.locale);
  const t = dictionary.contactBatch;
  const account = await requireBuyer('/account/lists');
  const [lists, memberships] = await Promise.all([
    getLists(account.id),
    getMemberships(account.id),
  ]);
  const list = lists.find(row => row.id === params.id);
  if (!list) notFound();
  const back = `/account/lists/${list.id}`;
  const keys = comparisonKeys(
    searchParams.project,
    memberships.filter(row => row.list_id === list.id).map(row => row.project_key),
  );
  if (!keys)
    return (
      <section className="account-page">
        <h1 className="text-3xl font-semibold">{t.page.invalidTitle}</h1>
        <p className="mt-4 text-stone-500">{t.page.invalidBody}</p>
        <Link href={back} className="mt-6 inline-block text-[#365DC4]">
          {t.page.backToList}
        </Link>
      </section>
    );
  return (
    <ProposalView
      account={account}
      keys={keys}
      listId={list.id}
      back={{ href: back, label: t.page.backTo.replace('{name}', () => list.name) }}
      dictionary={dictionary}
    />
  );
}
