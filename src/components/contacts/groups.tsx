import Link from '@/i18n/navigation';
import { batchForRequest, listContactBatches } from '@/lib/contacts/batch-server';
import type { Dictionary } from '@/i18n/dictionary';
import { LocalTime } from './local-time';

/**
 * «Propuestas en grupo» at the top of «Mis contactos» (SHCWS-62): the buyer's recent
 * proposals to several projects, each opening the side-by-side view. Each request is also
 * listed below as usual. If the grouping cannot be read, the inbox still shows.
 */
export async function ContactGroups({
  account,
  dateLocale,
  dict: t,
}: {
  account: string;
  dateLocale: string;
  dict: Dictionary['contactBatch'];
}) {
  const groups = await listContactBatches(account).catch(() => []);
  if (!groups.length) return null;
  return (
    <section aria-labelledby="contact-groups-title" className="mb-10">
      <h2 id="contact-groups-title" className="text-xl font-medium">
        {t.inbox.title}
      </h2>
      <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
        {groups.map(group => (
          <li key={group.id}>
            <Link
              href={'/account/contacts/groups/' + group.id}
              className="group flex flex-wrap items-center justify-between gap-4 py-5"
            >
              <div className="min-w-0">
                <p className="break-words font-medium">
                  {group.projects.map(project => project.name).join(' · ')}
                </p>
                <p className="mt-2 text-xs text-stone-400">
                  {t.inbox.sent}{' '}
                  <LocalTime
                    value={group.created_at}
                    locale={dateLocale}
                    options={{ day: 'numeric', month: 'short' }}
                  />
                  {' · '}
                  {t.inbox.replied
                    .replace(
                      '{replied}',
                      String(group.projects.filter(project => project.replied).length),
                    )
                    .replace('{total}', String(group.projects.length))}
                </p>
              </div>
              <span className="text-sm text-[#365DC4]">{t.inbox.view}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** On a buyer's own request: a way back to the proposal it was part of, if any. */
export async function ContactGroupLink({
  requestId,
  account,
  dict: t,
}: {
  requestId: string;
  account: string;
  dict: Dictionary['contactBatch'];
}) {
  const group = await batchForRequest(requestId, account).catch(() => null);
  if (!group) return null;
  return (
    <p className="mt-3 text-sm text-stone-500">
      {t.detail.partOf}{' '}
      <Link href={'/account/contacts/groups/' + group} className="text-[#365DC4]">
        {t.detail.view}
      </Link>
    </p>
  );
}
