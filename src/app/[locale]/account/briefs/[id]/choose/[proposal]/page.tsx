import { notFound } from 'next/navigation';
import Link from '@/i18n/navigation';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { solutionsSql } from '@/lib/solutions/server';
import { contactTarget } from '@/lib/contacts/server';
import { proposalForChoice } from '@/lib/briefs/server';
import { ContactForm } from '@/components/contacts/forms';
import { ChooseExisting } from '@/components/briefs/brief-actions';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = (await getDictionary((await params).locale)).briefs;
  return { title: `${t.meta.choose} | shwcs`, robots: { index: false, follow: false } };
}

/**
 * Choosing a proposal (SHCWS-58) is sending that founder an ordinary contact request:
 * the same form, review and contact-v1 consent as anywhere else, pre-filled from the
 * brief. A founder the buyer already talks to gets no second request (one per buyer and
 * listing, §9): the proposal is marked and the existing conversation opens.
 */
export default async function ChooseProposalPage(props: {
  params: Promise<{ locale: string; id: string; proposal: string }>;
}) {
  const { locale, id, proposal: proposalId } = await props.params;
  if (!isSolutionId(id) || !isSolutionId(proposalId)) notFound();
  const account = await requireBuyer(`/account/briefs/${id}`);
  const dictionary = await getDictionary(locale);
  const t = dictionary.briefs;
  const proposal = await proposalForChoice(id, proposalId, account.id);
  if (!proposal) notFound();
  const target = await contactTarget(proposal.solution_id);
  if (!target) notFound();
  const [profile] =
    await solutionsSql()`SELECT name,organization FROM auth_accounts WHERE id=${account.id}`;
  return (
    <section className="account-page">
      <Link href={`/account/briefs/${id}`} className="text-sm text-[#365DC4]">
        {t.choose.back}
      </Link>
      {proposal.contact_id ? (
        <div className="mt-7 max-w-2xl">
          <h1 className="break-words text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.choose.existingTitle.replace('{project}', () => target.name)}
          </h1>
          <p className="mb-8 mt-4 leading-relaxed text-stone-500">{t.choose.existingBody}</p>
          <ChooseExisting briefId={id} proposalId={proposalId} dict={t} />
        </div>
      ) : (
        <>
          <h1 className="mt-7 break-words text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.choose.title.replace('{project}', () => target.name)}
          </h1>
          <p className="mb-10 mt-4 max-w-2xl leading-relaxed text-stone-500">
            {t.choose.intro.replace('{project}', () => target.name)}
          </p>
          <ContactForm
            solutionId={proposal.solution_id}
            recipientId={target.owner_id}
            projectName={target.name}
            listingSizes={
              Array.isArray(target.company_sizes) ? (target.company_sizes as string[]) : undefined
            }
            email={account.email}
            defaults={{
              name: String(profile?.name ?? ''),
              company: String(profile?.organization ?? ''),
              size: proposal.company_size,
              timeline: proposal.timeline,
              budget: proposal.budget,
              need: proposal.problem,
            }}
            briefId={id}
            dict={dictionary.contacts}
          />
        </>
      )}
    </section>
  );
}
