import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { localeRedirect } from '@/i18n/redirect';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { getContact, contactEvents } from '@/lib/contacts/server';
import {
  companySizeOptions,
  contactSystemMessages,
  storedOptionLabel,
  timelineOptions,
  type ContactEvent,
} from '@/lib/contacts/model';
import { ContactActions, RefreshContacts } from '@/components/contacts/forms';
import type { Dictionary } from '@/i18n/dictionary';
/**
 * A buyer's own events carry one of the fixed messages stored in Spanish; show those through
 * the dictionary. Messages written by the project are its own words and are never translated.
 */
function eventMessage(
  event: ContactEvent,
  buyerId: string,
  messages: Dictionary['contacts']['detail']['systemMessages'],
) {
  if (event.actor_id !== buyerId) return event.message;
  if (event.status === 'new' && event.message === contactSystemMessages.created)
    return messages.created;
  if (event.status === 'withdrawn' && event.message === contactSystemMessages.withdrawn)
    return messages.withdrawn;
  return event.message;
}
export async function ContactDetail({
  id,
  incoming = false,
  dict: t,
}: {
  id: string;
  incoming?: boolean;
  dict: Dictionary['contacts'];
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
    d = request.details;
  return (
    <section className="account-page">
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
        <p className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm">
          {t.statuses[request.status]}
        </p>
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
              ['size', t.fields.size, storedOptionLabel(d.size, companySizeOptions, t.teamSizes)],
              [
                'timeline',
                t.fields.timeline,
                storedOptionLabel(d.timeline, timelineOptions, t.timelines),
              ],
              ['budget', t.fields.budget, d.budget || t.fields.notSpecified],
              ['need', t.fields.need, d.need],
            ].map(([key, label, value]) => (
              <div key={key} className={key === 'need' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-stone-400">{t.detail.disclaimer}</p>
          <section className="mt-10">
            <h2 className="text-xl font-medium">{t.detail.history}</h2>
            <ol className="mt-5 divide-y divide-stone-200">
              {events.map(event => (
                <li key={event.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span>
                      {event.actor_id === request.buyer_id ? t.detail.buyer : t.detail.project} ·{' '}
                      {t.statuses[event.status]}
                    </span>
                    <time dateTime={new Date(event.created_at).toISOString()}>
                      {new Date(event.created_at).toLocaleString(t.dateLocale, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'America/Mexico_City',
                      })}
                    </time>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {eventMessage(event, request.buyer_id, t.detail.systemMessages)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
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
        </section>
      </div>
    </section>
  );
}
