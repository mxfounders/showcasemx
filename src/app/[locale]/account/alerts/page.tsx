import Link from '@/i18n/navigation';
import { BellIcon } from '@/components/icons/gota';
import { requireBuyer } from '@/lib/library/server';
import { listAlerts } from '@/lib/alerts/server';
import { alertHref, alertLabel, maxAlertsPerAccount } from '@/lib/alerts/model';
import { notificationPreferences } from '@/lib/notifications/server';
import { DeleteAlertButton, PendingAlert } from '@/components/alerts/alert-controls';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.alerts.page.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}

/** Saved-search alerts (SHCWS-47): what each one watches and what it found. Owner only. */
export default async function AlertsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const account = await requireBuyer('/account/alerts');
  const dictionary = await getDictionary(locale);
  const t = dictionary.alerts.page;
  const fastResponse = dictionary.catalog.filters.fastResponse;
  const [alerts, prefs] = await Promise.all([
    listAlerts(account.id),
    notificationPreferences(account.id),
  ]);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  const withLink = (text: string, href: string, label: string) => {
    const [before, after] = text.split('{link}');
    return (
      <>
        {before}
        <Link href={href} className="text-[#365DC4] underline underline-offset-4">
          {label}
        </Link>
        {after}
      </>
    );
  };
  return (
    <section className="account-page">
      <header className="mb-9">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-500">{t.subtitle}</p>
      </header>
      <PendingAlert dict={t} locale={locale} fastResponse={fastResponse} />
      {alerts.length > 0 && (!prefs.alertEmail || !prefs.verified) && (
        <p className="mb-6 text-sm text-stone-500">
          {!prefs.alertEmail
            ? withLink(t.emailOff, '/account/settings/notifications', t.preferences)
            : withLink(t.emailUnverified, '/account/settings/security', t.security)}
        </p>
      )}
      {alerts.length ? (
        <>
          <ul className="grid gap-5">
            {alerts.map(alert => (
              <li key={alert.id} className="rounded-2xl border border-stone-200 bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.15em] text-stone-400">
                      {dictionary.alerts.scope[alert.criteria.scope]}
                    </p>
                    <h2 className="mt-1 break-words text-lg font-medium">
                      {alertLabel(alert.criteria, locale, { fastResponse })}
                    </h2>
                    <p className="mt-1 text-xs text-stone-400">
                      {t.created.replace('{date}', date(alert.createdAt))}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={alertHref(alert.criteria)}
                      style={actionButtonStyle}
                      className="action-button rounded-full px-4 py-2 text-sm"
                    >
                      {t.open}
                    </Link>
                    <DeleteAlertButton id={alert.id} dict={t} />
                  </div>
                </div>
                {alert.matches.length ? (
                  <div className="mt-5 border-t border-stone-100 pt-4">
                    <h3 className="text-sm font-medium text-stone-700">{t.matchesTitle}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {alert.matches.map(match => (
                        <li key={match.id} className="text-sm">
                          <Link
                            href={`/soluciones/${match.id}`}
                            className="text-[#365DC4] underline-offset-4 hover:underline"
                          >
                            {match.name}
                          </Link>{' '}
                          <span className="text-xs text-stone-400">{date(match.matchedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-5 border-t border-stone-100 pt-4 text-sm text-stone-500">
                    {t.noMatches}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-stone-400">
            {t.count
              .replace('{count}', String(alerts.length))
              .replace('{max}', String(maxAlertsPerAccount))}
          </p>
        </>
      ) : (
        <div className="border-y border-stone-200 py-14">
          <BellIcon className="mb-5 size-8 text-stone-300" aria-hidden="true" />
          <h2 className="text-2xl font-medium">{t.emptyTitle}</h2>
          <p className="mt-3 max-w-lg text-sm text-stone-500">{t.emptyBody}</p>
          <Link
            href="/buscar"
            style={actionButtonStyle}
            className="action-button mt-6 inline-flex rounded-full px-5 py-3 text-sm"
          >
            {t.explore}
          </Link>
        </div>
      )}
    </section>
  );
}
