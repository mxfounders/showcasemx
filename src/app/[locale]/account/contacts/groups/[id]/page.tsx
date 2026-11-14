import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { requireBuyer } from '@/lib/library/server';
import { isSolutionId } from '@/lib/solutions/model';
import { getContactBatch } from '@/lib/contacts/batch-server';
import { whoseTurn } from '@/lib/contacts/thread';
import {
  contactSizeLabel,
  needPreview,
  storedOptionLabel,
  timelineOptions,
} from '@/lib/contacts/model';
import { LocalTime } from '@/components/contacts/local-time';
import { RefreshContacts } from '@/components/contacts/forms';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.contactBatch.meta.group} | shwcs`,
    robots: { index: false, follow: false },
  };
}

/**
 * The answers to a proposal sent to several projects, side by side (SHCWS-62). Only the
 * buyer who sent it can open it; each project's conversation stays on its own page.
 */
export default async function ContactGroupPage(props: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const params = await props.params;
  if (!isSolutionId(params.id)) notFound();
  const dictionary = await getDictionary(params.locale);
  const t = dictionary.contactBatch.group,
    c = dictionary.contacts;
  const account = await requireBuyer('/account/contacts');
  const batch = await getContactBatch(params.id, account.id);
  if (!batch) notFound();
  // What everyone received: the details of a request this batch created.
  const shared = batch.items.find(item => item.created)?.details;
  return (
    <section className="account-page">
      <Link href="/account/contacts" className="text-sm text-[#365DC4]">
        {t.back}
      </Link>
      <header className="my-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="break-words text-4xl font-semibold tracking-tight">{t.title}</h1>
          <RefreshContacts dict={c} />
        </div>
        <p className="mt-4 text-sm text-stone-500">
          {t.sentOn}{' '}
          <LocalTime
            value={batch.created_at}
            locale={c.dateLocale}
            options={{ day: 'numeric', month: 'long', year: 'numeric' }}
          />
          {batch.list_id && batch.list_name && (
            <>
              {' '}
              {t.fromList}{' '}
              <Link href={'/account/lists/' + batch.list_id} className="text-[#365DC4]">
                {batch.list_name}
              </Link>
            </>
          )}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-500">{t.privacy}</p>
      </header>
      <ul className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {batch.items.map(item => {
          const turn = whoseTurn(
            item.last_id && item.last_actor && item.last_at
              ? [
                  {
                    id: item.last_id,
                    actor_id: item.last_actor,
                    status: item.status,
                    message: '',
                    created_at: item.last_at,
                  },
                ]
              : [],
            item.status,
            account.id,
          ).turn;
          return (
            <li
              key={item.id}
              className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-6"
            >
              <h2 className="break-words text-xl font-medium">{item.project_name}</h2>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-600">
                  {c.statuses[item.status]}
                </span>
                {turn !== 'none' && (
                  <span
                    className={
                      turn === 'mine'
                        ? 'rounded-full bg-[#E4EBFC] px-3 py-1 font-medium text-[#365DC4]'
                        : 'text-stone-500'
                    }
                  >
                    {turn === 'mine' ? t.turnMine : t.turnTheirs}
                  </span>
                )}
              </p>
              {!item.created && <p className="mt-3 text-xs text-stone-500">{t.earlier}</p>}
              <div className="mt-5 flex-1 border-t border-stone-200 pt-5 text-sm">
                <p className="text-xs text-stone-500">
                  {t.lastReply}
                  {item.reply_at && (
                    <>
                      {' · '}
                      <LocalTime
                        value={item.reply_at}
                        locale={c.dateLocale}
                        options={{ day: 'numeric', month: 'short' }}
                      />
                    </>
                  )}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-stone-700">
                  {item.reply ? needPreview(item.reply, 400) : t.noReply}
                </p>
              </div>
              <Link
                href={'/account/contacts/' + item.id}
                className="mt-6 inline-block text-sm text-[#365DC4]"
              >
                {t.open}
              </Link>
            </li>
          );
        })}
      </ul>
      {shared && (
        <section aria-labelledby="group-shared" className="mt-14">
          <h2 id="group-shared" className="text-xl font-medium">
            {t.sharedTitle}
          </h2>
          <dl className="mt-6 grid gap-5 border-y border-stone-200 py-6 text-sm sm:grid-cols-2">
            {[
              ['name', c.fields.name, shared.name],
              ['company', c.fields.company, shared.company],
              ['size', c.fields.size, contactSizeLabel(shared.size, params.locale, c.teamSizes)],
              [
                'timeline',
                c.fields.timeline,
                storedOptionLabel(shared.timeline, timelineOptions, c.timelines),
              ],
              ['budget', c.fields.budget, shared.budget || c.fields.notSpecified],
              ['need', c.fields.need, shared.need],
            ].map(([key, label, value]) => (
              <div key={key} className={key === 'need' ? 'sm:col-span-2' : ''}>
                <dt className="text-xs text-stone-500">{label}</dt>
                <dd className="mt-2 whitespace-pre-wrap break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}
