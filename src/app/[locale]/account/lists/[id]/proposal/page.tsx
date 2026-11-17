import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireBuyer, getLists, getMemberships, resolveProjects } from '@/lib/library/server';
import { comparisonKeys } from '@/lib/library/model';
import { isSolutionId } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { contactTarget, findContact } from '@/lib/contacts/server';
import { BatchContactForm, type BatchRow } from '@/components/contacts/batch-form';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.contactBatch.meta.proposal} | shwcs`,
    robots: { index: false, follow: false },
  };
}

type Excluded = { key: string; name: string; reason: 'own' | 'unavailable' | 'external' };

/**
 * «Pedir propuesta a estos 3» (SHCWS-62): the 2–3 projects chosen from one of the
 * buyer's lists, the same way the comparator takes them. Projects that cannot receive a
 * new request are listed with the reason; ones the buyer already wrote to keep their
 * conversation and join the group without a second request.
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
  const projects = await resolveProjects(keys);
  const checked = await Promise.all(
    keys.map(async (key): Promise<BatchRow | Excluded> => {
      const project = projects[key];
      if (!project) return { key, name: t.page.unavailableName, reason: 'unavailable' };
      if (!project.solutionId) return { key, name: project.name, reason: 'external' };
      const [target, existing] = await Promise.all([
        contactTarget(project.solutionId),
        findContact(account.id, project.solutionId),
      ]);
      if (!target) return { key, name: project.name, reason: 'unavailable' };
      if (target.owner_id === account.id) return { key, name: project.name, reason: 'own' };
      return existing
        ? { solutionId: target.id, name: target.name, existingRequestId: existing }
        : {
            solutionId: target.id,
            name: target.name,
            recipientId: target.owner_id,
            listingSizes: Array.isArray(target.company_sizes)
              ? (target.company_sizes as string[])
              : undefined,
          };
    }),
  );
  const rows = checked.filter((row): row is BatchRow => 'solutionId' in row);
  const excluded = checked.filter((row): row is Excluded => 'reason' in row);
  const asked = rows.filter(row => !row.existingRequestId).length;
  const sql = solutionsSql();
  const [profile] = await sql`SELECT name,organization FROM auth_accounts WHERE id=${account.id}`;
  return (
    <section className="account-page">
      <Link href={back} className="text-sm text-[#365DC4]">
        {t.page.backTo.replace('{name}', () => list.name)}
      </Link>
      <h1 className="mt-7 break-words text-4xl font-semibold tracking-tight sm:text-5xl">
        {asked
          ? asked === 1
            ? t.page.titleOne
            : t.page.titleMany.replace('{count}', String(asked))
          : t.page.noneTitle}
      </h1>
      <p className="mb-10 mt-4 max-w-xl leading-relaxed text-stone-500">
        {asked ? t.page.intro : t.page.noneBody}
      </p>
      {rows.length > 0 && (
        <section aria-labelledby="proposal-recipients" className="mb-10">
          <h2 id="proposal-recipients" className="text-xs text-stone-500">
            {dictionary.contactBatch.form.recipientsLabel}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {rows.map(row => (
              <li key={row.solutionId} className="text-sm">
                <span className="font-medium">{row.name}</span>
                {row.existingRequestId && (
                  <span className="mt-1 block text-stone-500">
                    {t.page.existing}{' '}
                    <Link
                      href={'/account/contacts/' + row.existingRequestId}
                      className="text-[#365DC4]"
                    >
                      {t.page.viewThread}
                    </Link>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {excluded.length > 0 && (
        <section aria-labelledby="proposal-excluded" className="mb-10">
          <h2 id="proposal-excluded" className="text-xs text-stone-500">
            {t.page.excludedTitle}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {excluded.map(row => (
              <li key={row.key} className="text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="mt-1 block text-stone-500">{t.page.reasons[row.reason]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {asked > 0 ? (
        <BatchContactForm
          listId={list.id}
          rows={rows}
          email={account.email}
          defaults={{
            name: String(profile?.name ?? ''),
            company: String(profile?.organization ?? ''),
          }}
          contactsDict={dictionary.contacts}
          dict={t}
        />
      ) : (
        <Link href={back} className="inline-block text-[#365DC4]">
          {t.page.backToList}
        </Link>
      )}
    </section>
  );
}
