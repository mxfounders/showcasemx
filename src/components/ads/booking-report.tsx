import {
  CursorClickIcon,
  EyeIcon,
  MegaphoneIcon,
  SendIcon,
  TrendUpIcon,
  ArrowUpRightIcon,
} from '@/components/icons/gota';
import { InteractiveActivityChart } from '@/components/metrics/interactive-activity-chart';
import { attributionDays, clickThroughRate } from '@/lib/ads/model';
import { formatDay } from '@/lib/ads/format';
import type { BookingReport } from '@/lib/ads/server';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * One booking's results (SHCWS-70): what the card did, what happened after the click, and
 * the listing on sponsored days next to days without sponsorship. Every number is a
 * first-party daily total; nothing here identifies a visitor.
 */
export function BookingReportView({
  report,
  today,
  dict,
}: {
  report: BookingReport;
  today: string;
  dict: Dictionary['ads'];
}) {
  const t = dict.report;
  const number = new Intl.NumberFormat(dict.numberLocale);
  const percent = new Intl.NumberFormat(dict.numberLocale, {
    style: 'percent',
    maximumFractionDigits: 1,
  });
  const average = new Intl.NumberFormat(dict.numberLocale, { maximumFractionDigits: 1 });
  const { booking, after, comparison } = report;
  const served = report.days.filter(day => day.day <= today);
  const ctr = clickThroughRate(booking.clicks, booking.impressions);
  const rate = (value: number | null) => (value === null ? t.noData : percent.format(value));

  const kpis = [
    { label: t.kpis.impressions, value: number.format(booking.impressions), Icon: EyeIcon },
    { label: t.kpis.clicks, value: number.format(booking.clicks), Icon: CursorClickIcon },
    { label: t.kpis.ctr, value: rate(ctr), Icon: TrendUpIcon },
    { label: t.kpis.visits, value: number.format(booking.visits), Icon: MegaphoneIcon },
    {
      label: t.kpis.siteClicks,
      value: number.format(booking.siteClicks),
      Icon: ArrowUpRightIcon,
    },
    { label: t.kpis.contacts, value: number.format(booking.contacts), Icon: SendIcon },
  ];

  return (
    <div className="space-y-12">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-stone-200 py-7 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(({ label, value, Icon }) => (
          <div key={label} className="flex flex-col">
            <dt className="flex items-start gap-1.5 text-xs text-stone-500">
              <Icon aria-hidden="true" className="size-4 shrink-0 text-stone-400" />
              {label}
            </dt>
            <dd className="mt-auto pt-2 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="report-daily-title">
        <h2 id="report-daily-title" className="text-xl font-medium text-stone-900">
          {t.dailyTitle}
        </h2>
        {served.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">{t.notStarted}</p>
        ) : (
          <>
            {/* A curve needs two days; with one, the table below says it all. */}
            {served.length > 1 && (
              <div className="mt-5 overflow-x-auto">
                <div className="min-w-[560px]">
                  <InteractiveActivityChart
                    days={served.map(day => ({
                      day: day.day,
                      views: day.impressions,
                      clicks: day.clicks,
                    }))}
                    dict={t.chart}
                    locale={dict.numberLocale}
                  />
                </div>
              </div>
            )}
            <details className="mt-6" open={served.length === 1}>
              <summary>{t.tableToggle}</summary>
              <div className="mt-4 overflow-x-auto" tabIndex={0} aria-label={t.tableLabel}>
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">{t.tableLabel}</caption>
                  <thead className="text-xs text-stone-500">
                    <tr className="border-b border-stone-200">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        {t.columns.day}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        {t.kpis.impressions}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        {t.kpis.clicks}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        {t.kpis.ctr}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        {t.kpis.visits}
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        {t.kpis.siteClicks}
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        {t.kpis.contacts}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums text-stone-800">
                    {served.map(day => (
                      <tr key={day.day} className="border-b border-stone-100">
                        <th scope="row" className="py-2 pr-4 font-normal text-stone-600">
                          {formatDay(day.day, dict.dateLocale)}
                        </th>
                        <td className="py-2 pr-4 text-right">{number.format(day.impressions)}</td>
                        <td className="py-2 pr-4 text-right">{number.format(day.clicks)}</td>
                        <td className="py-2 pr-4 text-right">
                          {rate(clickThroughRate(day.clicks, day.impressions))}
                        </td>
                        <td className="py-2 pr-4 text-right">{number.format(day.visits)}</td>
                        <td className="py-2 pr-4 text-right">{number.format(day.siteClicks)}</td>
                        <td className="py-2 text-right">{number.format(day.contacts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
        {after.visits + after.siteClicks + after.contacts > 0 && (
          <p className="mt-4 text-sm text-stone-600">
            {t.after
              .replace('{visits}', number.format(after.visits))
              .replace('{site}', number.format(after.siteClicks))
              .replace('{contacts}', number.format(after.contacts))}
          </p>
        )}
      </section>

      <section aria-labelledby="report-compare-title">
        <h2 id="report-compare-title" className="text-xl font-medium text-stone-900">
          {t.compareTitle}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{t.compareIntro}</p>
        {!comparison ? (
          <p className="mt-4 text-sm text-stone-500">{t.compareNotYet}</p>
        ) : (
          <div className="mt-5 overflow-x-auto" tabIndex={0} aria-label={t.compareTitle}>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs text-stone-500">
                <tr className="border-b border-stone-200">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    <span className="sr-only">{t.compareColumns.period}</span>
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.compareColumns.days}
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    {t.compareColumns.views}
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    {t.compareColumns.contacts}
                  </th>
                </tr>
              </thead>
              <tbody className="tabular-nums text-stone-800">
                {(
                  [
                    [t.compareRows.sponsored, comparison.sponsored],
                    [t.compareRows.baseline, comparison.baseline],
                  ] as const
                ).map(([label, group]) => (
                  <tr key={label} className="border-b border-stone-100">
                    <th scope="row" className="py-2 pr-4 font-normal text-stone-600">
                      {label}
                    </th>
                    <td className="py-2 pr-4 text-right">{number.format(group.days)}</td>
                    <td className="py-2 pr-4 text-right">
                      {group.days > 0 ? average.format(group.views / group.days) : t.noData}
                    </td>
                    <td className="py-2 text-right">
                      {group.days > 0 ? average.format(group.contacts / group.days) : t.noData}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {comparison.baseline.days === 0 && (
              <p className="mt-3 text-xs text-stone-500">{t.compareNoBaseline}</p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="report-method-title" className="max-w-2xl">
        <h2 id="report-method-title" className="text-base font-medium text-stone-900">
          {t.methodTitle}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-500">
          {t.method.map(line => (
            <li key={line}>{line.replace('{days}', String(attributionDays))}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
