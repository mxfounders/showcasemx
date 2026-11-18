import { notFound } from 'next/navigation';
import Link from '@/i18n/navigation';
import { requireFounder } from '@/lib/solutions/server';
import { isSolutionId } from '@/lib/solutions/model';
import { getFounderNeed } from '@/lib/briefs/server';
import { briefState, maxProposalsPerBrief } from '@/lib/briefs/model';
import { actionButtonStyle } from '@/lib/brand-colors';
import { BriefFacts } from '@/components/briefs/brief-facts';
import { ProposalForm } from '@/components/briefs/brief-actions';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = (await getDictionary((await params).locale)).briefs;
  return { title: `${t.meta.need} | shwcs`, robots: { index: false, follow: false } };
}

/**
 * One brief a founder's listing fits (SHCWS-58): what the buyer described and the
 * founder's one proposal. A brief none of the founder's current published listings
 * matched, or one ops hid, is a 404 like any foreign id. The buyer's identity only ever
 * arrives with the contact request, once they choose this proposal.
 */
export default async function NeedPage(props: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await props.params;
  if (!isSolutionId(id)) notFound();
  const account = await requireFounder();
  const dictionary = await getDictionary(locale);
  const t = dictionary.briefs;
  const need = await getFounderNeed(id, account.id);
  if (!need) notFound();
  const { brief, listings, proposal } = need;
  const state = briefState(brief);
  const full = brief.proposals >= maxProposalsPerBrief;
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  return (
    <section className="account-page">
      <Link href="/account/needs" className="text-sm text-[#365DC4]">
        {t.needs.back}
      </Link>
      <p className="mt-7 text-xs uppercase tracking-[0.15em] text-stone-400">
        {t.states[state]} · {t.facts.published.replace('{date}', date(brief.created_at))}
      </p>
      <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
        {t.needs.detailTitle.replace('{listings}', listings.map(item => item.name).join(', '))}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{t.needs.privacy}</p>
      <div className="mt-8 max-w-3xl rounded-2xl border border-stone-200 bg-white p-6">
        <BriefFacts
          brief={brief}
          locale={locale}
          dict={t.facts}
          timelines={dictionary.contacts.timelines}
        />
      </div>
      <section aria-labelledby="proposal-title" className="mt-12 max-w-3xl">
        {proposal ? (
          <>
            <h2 id="proposal-title" className="text-2xl font-semibold tracking-tight">
              {t.needs.yourProposal}
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              {t.needs.sentOn.replace('{date}', date(proposal.created_at))}
              {proposal.name ? ` · ${proposal.name}` : ''}
            </p>
            <dl className="mt-5 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-stone-500">{t.proposalForm.price}</dt>
                <dd className="mt-2 break-words">{proposal.price}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">{t.proposalForm.timeline}</dt>
                <dd className="mt-2 break-words">{proposal.timeline}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-stone-500">{t.proposalForm.message}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">{proposal.message}</dd>
              </div>
            </dl>
            {proposal.contact_request_id && (
              <div className="mt-6">
                <p className="text-sm text-stone-600">{t.needs.chosenNote}</p>
                <Link
                  href={`/account/opportunities/${proposal.contact_request_id}`}
                  style={actionButtonStyle}
                  className="action-button mt-4 inline-flex rounded-full px-5 py-2.5 text-sm"
                >
                  {t.needs.openOpportunity}
                </Link>
              </div>
            )}
          </>
        ) : state !== 'open' ? (
          <p className="text-sm text-stone-500">{t.needs.closedNote}</p>
        ) : full ? (
          <p className="text-sm text-stone-500">{t.needs.fullNote}</p>
        ) : (
          <>
            <h2 id="proposal-title" className="text-2xl font-semibold tracking-tight">
              {t.proposalForm.title}
            </h2>
            <p className="mb-6 mt-2 text-sm text-stone-500">{t.proposalForm.intro}</p>
            <ProposalForm briefId={brief.id} listings={listings} dict={t} />
          </>
        )}
      </section>
    </section>
  );
}
