import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { localeRedirect } from '@/i18n/redirect';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { getContact, contactEvents } from '@/lib/contacts/server';
import {
  buyerSignal,
  contactSizeLabel,
  storedOptionLabel,
  timelineOptions,
} from '@/lib/contacts/model';
import { buildThread, whoseTurn } from '@/lib/contacts/thread';
import { ContactThread } from '@/components/contacts/thread';
import {
  ContactActions,
  MarkContactRead,
  OutcomeForm,
  RefreshContacts,
} from '@/components/contacts/forms';
import { actionButtonStyle, brandColors } from '@/lib/brand-colors';
import { contactAlternatives } from '@/lib/contacts/alternatives';
import { publicProducts } from '@/lib/solutions/public';
import { SimilarSolutions, type SimilarSection } from '@/components/solutions/similar-solutions';
import type { Dictionary } from '@/i18n/dictionary';
export async function ContactDetail({
  id,
  incoming = false,
  locale,
  dict: t,
  threadDict,
  similarDict,
}: {
  id: string;
  incoming?: boolean;
  locale: string;
  dict: Dictionary['contacts'];
  threadDict: Dictionary['contactThread'];
  /** «Otras soluciones» from the listing page, reused for a request with no reply. */
  similarDict: Dictionary['solution'];
}) {
  if (!isSolutionId(id)) notFound();
  const base = incoming ? '/account/opportunities' : '/account/contacts';
  const account = await requireBuyer(base + '/' + id),
    request = await getContact(id, account.id);
  if (!request) notFound();
  if (incoming && request.recipient_id !== account.id) notFound();
  if (!incoming && request.recipient_id === account.id)
    return localeRedirect('/account/opportunities/' + id);
  const actor = request.buyer_id === account.id ? 'buyer' : 'recipient',
    events = await contactEvents(id, account.id),
    d = request.details,
    signal = buyerSignal(request),
    emailVerified = signal !== 'unverified';
  // The buyer agreed to share this address so the project could answer the request.
  const mailto =
    'mailto:' +
    request.buyer_email +
    '?subject=' +
    encodeURIComponent(t.detail.emailSubject.replace('{project}', () => request.project_name));
  // Seven days without a reply (SHCWS-61): the buyer sees similar listings from the
  // organic catalogue, never this one, a draft or one already contacted, and the brief
  // to ask shwcs for help when there are fewer than three.
  let alternatives: SimilarSection | null = null;
  if (actor === 'buyer' && request.unanswered) {
    try {
      const items = await contactAlternatives(
        { solutionId: request.solution_id, buyerId: account.id },
        await publicProducts(),
      );
      alternatives = { items, exits: items.length < 3 ? [{ kind: 'brief' }] : [] };
    } catch {
      alternatives = { items: [], exits: [{ kind: 'brief' }] };
    }
  }
  return (
    <section className="account-page">
      {actor === 'recipient' && request.unread && <MarkContactRead id={request.id} />}
      <Link
        href={actor === 'buyer' ? '/account/contacts' : '/account/opportunities'}
        className="text-sm text-[#365DC4]"
      >
        ← {actor === 'buyer' ? t.detail.backBuyer : t.detail.backRecipient}
      </Link>
      <header className="my-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="break-words text-4xl font-semibold tracking-tight">
            {request.project_name}
          </h1>
          <RefreshContacts dict={t} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="inline-block rounded-full bg-white px-4 py-2 text-sm">
            {t.statuses[request.status]}
          </p>
          {request.unanswered && (
            <p
              style={{
                backgroundColor: brandColors.terracotta.soft,
                color: brandColors.terracotta.solid,
              }}
              className="inline-block rounded-full px-4 py-2 text-sm font-medium"
            >
              {t.unanswered.label}
            </p>
          )}
        </div>
        {request.unanswered && (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            {actor === 'buyer'
              ? t.unanswered.buyerNote.replace('{project}', () => request.project_name)
              : t.unanswered.recipientNote}
          </p>
        )}
        <p className="mt-4 text-sm text-stone-500">
          {actor === 'buyer' ? t.detail.deliveredBuyer : t.detail.deliveredRecipient}{' '}
          {t.detail.onlyParticipants}
        </p>
      </header>
      <div className="grid items-start gap-12 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <h2 className="text-xl font-medium">{t.detail.sharedContext}</h2>
          <dl className="mt-6 grid gap-6 border-y border-stone-200 py-6 text-sm sm:grid-cols-2">
            {[
              ['name', t.fields.name, d.name],
              ['email', t.fields.accountEmail, request.buyer_email],
              ['company', t.fields.company, d.company],
              ['size', t.fields.size, contactSizeLabel(d.size, locale, t.teamSizes)],
              [
                'timeline',
                t.fields.timeline,
                storedOptionLabel(d.timeline, timelineOptions, t.timelines),
              ],
              ['budget', t.fields.budget, d.budget || t.fields.notSpecified],
            ].map(([key, label, value]) => (
              <div key={key}>
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">
                  {value}
                  {key === 'email' && (
                    <span
                      className={`ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-xs ${emailVerified ? 'bg-[#E4EDE2] text-[#416B50]' : 'bg-stone-100 text-stone-500'}`}
                    >
                      {signal === 'work'
                        ? t.detail.emailWork
                        : emailVerified
                          ? t.detail.emailVerified
                          : t.detail.emailUnverified}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-stone-400">
            {emailVerified ? t.detail.disclaimerVerified : t.detail.disclaimerUnverified}
          </p>
          <div className="mt-10">
            <ContactThread
              requestId={request.id}
              role={actor}
              status={request.status}
              items={buildThread(events, account.id)}
              opening={{ text: d.need, at: request.created_at }}
              counterpart={actor === 'buyer' ? request.project_name : d.company || d.name}
              {...whoseTurn(events, request.status, account.id)}
              locale={locale}
              dict={threadDict}
            />
          </div>
        </div>
        <section className="min-w-0 border-t border-stone-200 pt-6 xl:border-t-0 xl:pt-0">
          <h2 className="mb-5 text-xl font-medium">
            {actor === 'buyer' ? t.detail.yourRequest : t.detail.replyTitle}
          </h2>
          <ContactActions
            key={request.version}
            id={request.id}
            version={request.version}
            status={request.status}
            actor={actor}
            dict={t}
          />
          {actor === 'recipient' && request.status !== 'withdrawn' && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <a
                href={mailto}
                style={actionButtonStyle}
                className="action-button inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium"
              >
                {t.detail.writeEmail}
              </a>
              <p className="mt-3 text-xs leading-relaxed text-stone-500">
                {t.detail.writeEmailNote}
              </p>
            </div>
          )}
          {actor === 'recipient' && request.status === 'closed' && (
            <OutcomeForm
              key={request.version}
              id={request.id}
              version={request.version}
              outcome={request.outcome}
              value={request.outcome_value}
              dict={t}
            />
          )}
        </section>
      </div>
      {alternatives && (
        <SimilarSolutions
          similar={alternatives}
          solutionName={request.project_name}
          dict={{ ...similarDict, similarTitle: t.unanswered.alternativesTitle }}
          locale={locale}
        />
      )}
    </section>
  );
}
