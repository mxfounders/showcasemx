import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import Link from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import { requireBuyer } from '@/lib/library/server';
import { getBuyerBrief, type BuyerProposal } from '@/lib/briefs/server';
import { briefState, maxProposalsPerBrief } from '@/lib/briefs/model';
import { isSolutionId } from '@/lib/solutions/model';
import { sizeFit } from '@/lib/contacts/model';
import { actionButtonStyle } from '@/lib/brand-colors';
import { BriefFacts } from '@/components/briefs/brief-facts';
import { CloseBrief } from '@/components/briefs/brief-actions';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = (await getDictionary((await params).locale)).briefs;
  return { title: `${t.meta.detail} | shwcs`, robots: { index: false, follow: false } };
}

/**
 * The buyer's brief (SHCWS-58): the proposals side by side, in one table, and the team's
 * short list (SHCWS-60). Choosing a proposal opens the contact form; a founder the buyer
 * already talks to leads to that conversation. Only the brief's buyer: anyone else 404s.
 */
export default async function BriefPage(props: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await props.params;
  if (!isSolutionId(id)) notFound();
  const account = await requireBuyer(`/account/briefs/${id}`);
  const dictionary = await getDictionary(locale);
  const t = dictionary.briefs;
  const data = await getBuyerBrief(id, account.id);
  if (!data) notFound();
  const { brief, proposals, shortlist } = data;
  const state = briefState(brief);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  const rows: { key: string; label: string; cell: (p: BuyerProposal) => React.ReactNode }[] = [
    { key: 'price', label: t.compare.price, cell: p => p.price },
    { key: 'timeline', label: t.compare.timeline, cell: p => p.timeline },
    {
      key: 'message',
      label: t.compare.message,
      cell: p => <span className="whitespace-pre-wrap">{p.message}</span>,
    },
    {
      key: 'size',
      label: t.compare.sizeFit,
      cell: p =>
        t.compare.sizeFitLabels[
          sizeFit(
            brief.company_size,
            Array.isArray(p.company_sizes) ? (p.company_sizes as string[]) : undefined,
          )
        ],
    },
    { key: 'sent', label: t.compare.sent, cell: p => date(p.created_at) },
  ];
  return (
    <section className="account-page">
      <Link href="/account/briefs" className="text-sm text-[#365DC4]">
        {t.detail.back}
      </Link>
      <header className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-stone-400">{t.states[state]}</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            {t.detail.title}
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            {t.facts.published.replace('{date}', date(brief.created_at))}
            {' · '}
            {(state === 'open' ? t.facts.expires : t.facts.expired).replace(
              '{date}',
              date(state === 'closed' && brief.closed_at ? brief.closed_at : brief.expires_at),
            )}
          </p>
        </div>
        {state === 'open' && <CloseBrief id={brief.id} dict={t} />}
      </header>
      {state === 'hidden' && (
        <p className="mt-6 max-w-2xl rounded-2xl border border-[#E8C9A8] bg-[#FBF1E6] p-5 text-sm leading-relaxed text-stone-700">
          {t.detail.hiddenNote.replace('{reason}', brief.hidden_reason ?? '')}
        </p>
      )}
      <div className="mt-8 max-w-3xl rounded-2xl border border-stone-200 bg-white p-6">
        <BriefFacts
          brief={brief}
          locale={locale}
          dict={t.facts}
          timelines={dictionary.contacts.timelines}
        />
        <p className="mt-6 border-t border-stone-100 pt-4 text-sm text-stone-500">
          {brief.matches === 0
            ? t.detail.matchesNone
            : brief.matches === 1
              ? t.detail.matchesOne
              : t.detail.matches.replace('{count}', String(brief.matches))}
        </p>
      </div>

      {shortlist && (
        <section aria-labelledby="shortlist-title" className="mt-12 max-w-3xl">
          <h2 id="shortlist-title" className="text-2xl font-semibold tracking-tight">
            {t.detail.shortlistTitle}
          </h2>
          <p className="mt-2 text-sm text-stone-500">{t.detail.shortlistIntro}</p>
          <p className="mt-5 whitespace-pre-wrap rounded-2xl bg-[#E4EBFC]/50 p-5 text-sm leading-relaxed text-stone-700">
            {shortlist.note}
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {shortlist.listings.map(listing => (
              <li key={listing.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                <h3 className="break-words font-medium">{listing.name}</h3>
                {listing.problem && (
                  <p className="mt-2 line-clamp-3 text-sm text-stone-500">{listing.problem}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <Link
                    href={`/soluciones/${listing.slug ?? listing.id}`}
                    className="text-[#365DC4]"
                  >
                    {t.detail.viewListing}
                  </Link>
                  <Link
                    href={`/account/contacts/new?solution=${listing.id}`}
                    className="text-[#365DC4]"
                  >
                    {t.detail.contactListing}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="proposals-title" className="mt-12">
        <h2 id="proposals-title" className="text-2xl font-semibold tracking-tight">
          {t.detail.proposalsTitle}
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          {t.detail.proposalsLimit.replace('{max}', String(maxProposalsPerBrief))}
        </p>
        {proposals.length ? (
          <>
            {proposals.length > 1 && (
              <p id="proposals-help" className="mt-2 text-xs text-stone-400 sm:hidden">
                {t.compare.scrollHint}
              </p>
            )}
            <div
              role="region"
              aria-label={t.compare.caption}
              aria-describedby={proposals.length > 1 ? 'proposals-help' : undefined}
              tabIndex={0}
              className="mt-6 max-w-full overflow-x-auto rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#365DC4]"
            >
              <table
                className="w-full table-fixed border-collapse text-left text-sm"
                style={{ minWidth: `${160 + proposals.length * 260}px` }}
              >
                <caption className="sr-only">{t.compare.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-40 border-b border-stone-200 p-4">
                      {t.compare.project}
                    </th>
                    {proposals.map(proposal => (
                      <th
                        key={proposal.id}
                        scope="col"
                        className="border-b border-stone-200 p-4 align-top"
                      >
                        <span className="block break-words text-lg">
                          {proposal.name ?? t.compare.unavailable}
                        </span>
                        {proposal.name && (
                          <Link
                            href={`/soluciones/${proposal.slug ?? proposal.solution_id}`}
                            className="mt-2 inline-block text-xs font-normal text-[#365DC4]"
                          >
                            {t.detail.viewListing}
                          </Link>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <Fragment key={row.key}>
                      <tr>
                        <th
                          scope="row"
                          className="border-b border-stone-200 p-4 align-top font-medium"
                        >
                          {row.label}
                        </th>
                        {proposals.map(proposal => (
                          <td
                            key={proposal.id}
                            className="break-words border-b border-stone-200 p-4 align-top text-stone-700"
                          >
                            {row.cell(proposal)}
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  ))}
                  <tr>
                    <th scope="row" className="p-4 align-top font-medium">
                      {t.compare.action}
                    </th>
                    {proposals.map(proposal => (
                      <td key={proposal.id} className="p-4 align-top">
                        {proposal.chosen_at && (
                          <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-[#365DC4]">
                            {t.compare.chosen}
                          </p>
                        )}
                        {proposal.chosen_at && proposal.contact_id ? (
                          <Link
                            href={`/account/contacts/${proposal.contact_id}`}
                            className="text-sm text-[#365DC4] underline-offset-4 hover:underline"
                          >
                            {t.compare.openConversation}
                          </Link>
                        ) : proposal.name ? (
                          <Link
                            href={`/account/briefs/${brief.id}/choose/${proposal.id}`}
                            style={actionButtonStyle}
                            className="action-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
                          >
                            {proposal.contact_id ? t.compare.alreadyTalking : t.compare.choose}
                            <ArrowRightIcon className="size-4" aria-hidden="true" />
                          </Link>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-6 max-w-xl rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">
            {t.detail.proposalsEmpty}
          </p>
        )}
      </section>
    </section>
  );
}
