import Link from '@/i18n/navigation';
import { resolveProjects } from '@/lib/library/server';
import { solutionsSql } from '@/lib/solutions/server';
import { contactTarget, findContact } from '@/lib/contacts/server';
import { BatchContactForm, type BatchRow } from '@/components/contacts/batch-form';
import type { Dictionary } from '@/i18n/dictionary';

type Excluded = { key: string; name: string; reason: 'own' | 'unavailable' | 'external' };

/**
 * «Pedir propuesta a estos 3» (SHCWS-62): one form for 2–3 projects, from a buyer's list
 * or, since SHCWS-53, straight from a temporary comparison (`listId` null). Projects that
 * cannot receive a new request are listed with the reason; ones the buyer already wrote
 * to keep their conversation and join the group without a second request. The keys come
 * already validated by the page; every recipient is checked again here and on sending.
 */
export async function ProposalView({
  account,
  keys,
  listId,
  back,
  dictionary,
}: {
  account: { id: string; email: string };
  keys: string[];
  listId: string | null;
  back: { href: string; label: string };
  dictionary: Dictionary;
}) {
  const t = dictionary.contactBatch;
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
      <Link href={back.href} className="text-sm text-[#365DC4]">
        {back.label}
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
            {t.form.recipientsLabel}
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
          listId={listId}
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
        <Link href={back.href} className="inline-block text-[#365DC4]">
          {back.label}
        </Link>
      )}
    </section>
  );
}
