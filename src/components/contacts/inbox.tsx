import Link from '@/i18n/navigation';
import { InboxIcon, SendIcon } from '@/components/icons/gota';
import { requireBuyer } from '@/lib/library/server';
import { listContacts, type ContactRow } from '@/lib/contacts/server';
import {
  buyerSignal,
  contactSizeLabel,
  contactStatuses,
  isContactStatus,
  needPreview,
  storedOptionLabel,
  timelineOptions,
  type BuyerSignal,
} from '@/lib/contacts/model';
import { actionButtonStyle, brandColors } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { RefreshContacts } from './forms';
import { LocalTime } from './local-time';

const signalTone: Record<BuyerSignal, { backgroundColor: string; color: string }> = {
  work: { backgroundColor: brandColors.sage.soft, color: brandColors.sage.solid },
  email: { backgroundColor: brandColors.blue.soft, color: brandColors.blue.solid },
  unverified: { backgroundColor: '#f5f5f4', color: '#78716c' },
};

/**
 * An incoming opportunity as a card the founder can triage from the list (SHCWS-14):
 * read state, who is asking, how big, how soon, the budget if any, the first lines of
 * the need and how far the address can be trusted.
 */
function OpportunityCard({
  row,
  locale,
  dict: t,
}: {
  row: ContactRow;
  locale: string;
  dict: Dictionary['contacts'];
}) {
  const signal = buyerSignal(row);
  const facts = [
    row.company,
    row.size ? contactSizeLabel(row.size, locale, t.teamSizes) : '',
    row.timeline ? storedOptionLabel(row.timeline, timelineOptions, t.timelines) : '',
    row.budget ? `${t.fields.budget}: ${row.budget}` : '',
  ].filter(Boolean);
  return (
    <Link
      href={'/account/opportunities/' + row.id}
      className="group grid gap-4 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          {row.unread && (
            <span
              className="size-2 shrink-0 rounded-full bg-[#365DC4]"
              role="img"
              aria-label={t.inbox.unreadDot}
            />
          )}
          <h2
            className={`break-words text-xl ${row.unread ? 'font-semibold text-stone-950' : 'font-medium'}`}
          >
            {row.project_name}
          </h2>
        </div>
        <p className="mt-2 break-words text-sm text-stone-600">{facts.join(' · ')}</p>
        {row.need && (
          <p className="mt-3 line-clamp-2 max-w-3xl break-words text-sm leading-relaxed text-stone-500">
            {needPreview(row.need)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-stone-400">
          <span style={signalTone[signal]} className="rounded-full px-2.5 py-1 font-medium">
            {t.inbox.signals[signal]}
          </span>
          <span>
            {t.inbox.received}{' '}
            <LocalTime
              value={row.created_at}
              locale={t.dateLocale}
              options={{ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }}
            />
          </span>
          {row.updated_at !== row.created_at && (
            <span>
              {t.inbox.updated}{' '}
              <LocalTime
                value={row.updated_at}
                locale={t.dateLocale}
                options={{ day: 'numeric', month: 'short' }}
              />
            </span>
          )}
        </div>
      </div>
      <span className="justify-self-start rounded-full bg-white px-4 py-2 text-xs text-stone-600 sm:justify-self-end">
        {t.statuses[row.status]}{' '}
        <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
          →
        </span>
      </span>
    </Link>
  );
}

export async function ContactsInbox({
  incoming,
  searchParams,
  locale,
  dict: t,
}: {
  incoming: boolean;
  searchParams: { status?: string; page?: string };
  locale: string;
  dict: Dictionary['contacts'];
}) {
  const base = incoming ? '/account/opportunities' : '/account/contacts';
  const account = await requireBuyer(base),
    status =
      isContactStatus(searchParams.status) || (incoming && searchParams.status === 'unread')
        ? searchParams.status
        : '',
    parsed = Number(searchParams.page),
    page = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1;
  const rows = await listContacts(account.id, incoming, status, page),
    visible = rows.slice(0, 20),
    Icon = incoming ? InboxIcon : SendIcon;
  const href = (nextPage: number, nextStatus = status) =>
    base +
    '?' +
    new URLSearchParams({ ...(nextStatus ? { status: nextStatus } : {}), page: String(nextPage) });
  const tabs: [string, string][] = [
    ['', t.inbox.all],
    ...(incoming ? [['unread', t.inbox.unread] as [string, string]] : []),
    ...contactStatuses.map(key => [key, t.statuses[key]] as [string, string]),
  ];
  return (
    <section className="account-page">
      <header className="mb-9">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {incoming ? t.inbox.titleIncoming : t.inbox.titleOutgoing}
          </h1>
          <RefreshContacts dict={t} />
        </div>
        <p className="mt-4 max-w-2xl leading-relaxed text-stone-500">
          {incoming ? t.inbox.introIncoming : t.inbox.introOutgoing}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-stone-400">
          {incoming ? t.inbox.noteIncoming : t.inbox.noteOutgoing}
        </p>
      </header>
      <nav aria-label={t.inbox.filterAria} className="selector-tabs mb-8">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            href={href(1, key)}
            aria-current={status === key ? 'page' : undefined}
            className="selector-tab"
          >
            {label}
          </Link>
        ))}
      </nav>
      {visible.length ? (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {visible.map(row =>
            incoming ? (
              <OpportunityCard key={row.id} row={row} locale={locale} dict={t} />
            ) : (
              <Link
                key={row.id}
                href={base + '/' + row.id}
                className="group flex flex-wrap items-center justify-between gap-4 py-7"
              >
                <div className="min-w-0">
                  <h2 className="break-words text-xl font-medium">{row.project_name}</h2>
                  <p className="mt-2 break-words text-sm text-stone-500">{row.company}</p>
                  <p className="mt-3 text-xs text-stone-400">
                    {t.inbox.updated}{' '}
                    <LocalTime
                      value={row.updated_at}
                      locale={t.dateLocale}
                      options={{ day: 'numeric', month: 'short' }}
                    />
                  </p>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-xs text-stone-600">
                  {t.statuses[row.status]}{' '}
                  <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                    →
                  </span>
                </span>
              </Link>
            ),
          )}
        </div>
      ) : (
        <div className="border-y border-stone-200 py-14">
          <Icon className="mb-5 size-8 text-stone-300" aria-hidden="true" />
          <h2 className="text-2xl font-medium">
            {status
              ? t.inbox.emptyStatus
              : incoming
                ? t.inbox.emptyIncomingTitle
                : t.inbox.emptyOutgoingTitle}
          </h2>
          <p className="mt-4 max-w-xl text-stone-500">
            {incoming ? t.inbox.emptyIncomingText : t.inbox.emptyOutgoingText}
          </p>
          <Link
            href={incoming ? '/account/solutions' : '/#catalogo'}
            style={actionButtonStyle}
            className="action-button mt-6 inline-flex rounded-full px-5 py-3 text-sm"
          >
            {incoming ? t.inbox.emptyIncomingCta : t.inbox.emptyOutgoingCta} →
          </Link>
        </div>
      )}
      {(page > 1 || rows.length > 20) && (
        <nav
          aria-label={t.inbox.pagesAria}
          className="mt-7 flex justify-between gap-4 text-sm text-[#365DC4]"
        >
          {page > 1 && <Link href={href(page - 1)}>{t.inbox.previous}</Link>}
          {rows.length > 20 && <Link href={href(page + 1)}>{t.inbox.next}</Link>}
        </nav>
      )}
    </section>
  );
}
