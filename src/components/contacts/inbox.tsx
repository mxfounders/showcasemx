import Link from '@/i18n/navigation';
import { Inbox, Send } from 'lucide-react';
import { requireBuyer } from '@/lib/library/server';
import { listContacts } from '@/lib/contacts/server';
import { contactStatuses, isContactStatus } from '@/lib/contacts/model';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { RefreshContacts } from './forms';
export async function ContactsInbox({
  incoming,
  searchParams,
  dict: t,
}: {
  incoming: boolean;
  searchParams: { status?: string; page?: string };
  dict: Dictionary['contacts'];
}) {
  const base = incoming ? '/account/opportunities' : '/account/contacts';
  const account = await requireBuyer(base),
    status = isContactStatus(searchParams.status) ? searchParams.status : '',
    parsed = Number(searchParams.page),
    page = Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1;
  const rows = await listContacts(account.id, incoming, status, page),
    visible = rows.slice(0, 20),
    Icon = incoming ? Inbox : Send;
  const href = (nextPage: number, nextStatus = status) =>
    base +
    '?' +
    new URLSearchParams({ ...(nextStatus ? { status: nextStatus } : {}), page: String(nextPage) });
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
        {[['', t.inbox.all], ...contactStatuses.map(key => [key, t.statuses[key]])].map(
          ([key, label]) => (
            <Link
              key={key}
              href={href(1, key)}
              aria-current={status === key ? 'page' : undefined}
              className="selector-tab"
            >
              {label}
            </Link>
          ),
        )}
      </nav>
      {visible.length ? (
        <div className="divide-y divide-stone-200 border-y border-stone-200">
          {visible.map(row => (
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
                  {new Date(row.updated_at).toLocaleDateString(t.dateLocale, {
                    day: 'numeric',
                    month: 'short',
                    timeZone: 'America/Mexico_City',
                  })}
                </p>
              </div>
              <span className="rounded-full bg-white px-4 py-2 text-xs text-stone-600">
                {t.statuses[row.status]}{' '}
                <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                  →
                </span>
              </span>
            </Link>
          ))}
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
