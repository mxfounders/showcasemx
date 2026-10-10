import Link from '@/i18n/navigation';
import { ArrowUpRight, CalendarDays, Eye, MousePointerClick, Send, TrendingUp } from 'lucide-react';
import { brandColors } from '@/lib/brand-colors';
import { InteractiveActivityChart } from './interactive-activity-chart';
import type { Dictionary } from '@/i18n/dictionary';

export type ProjectMetric = {
  id: string;
  name: string;
  views: number;
  clicks: number;
  requests: number;
};
export type DailyMetric = { day: string; views: number; clicks: number; requests: number };

function percent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}
function percentLabel(value: number, total: number, locale: string) {
  return `${percent(value, total).toLocaleString(locale, { maximumFractionDigits: 1 })}%`;
}
function Metric({
  label,
  value,
  Icon,
  tone,
  detail,
}: {
  label: string;
  value: string;
  Icon: typeof Eye;
  tone: keyof typeof brandColors;
  detail: string;
}) {
  const palette = brandColors[tone];
  return (
    <div className="min-w-0 px-1 py-6 sm:px-6 first:pl-0 last:pr-0">
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <span
          className="flex size-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.soft, color: palette.solid }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {label}
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-stone-400">{detail}</p>
    </div>
  );
}

export function MetricsDashboard({
  projects,
  days,
  dict,
}: {
  projects: ProjectMetric[];
  days: DailyMetric[];
  dict: Dictionary['metrics'];
}) {
  const locale = dict.numberLocale;
  const number = new Intl.NumberFormat(locale);
  const ofViews = (value: number, total: number) =>
    dict.ofViews.replace('{percent}', percentLabel(value, total, locale));
  const totals = projects.reduce(
    (sum, item) => ({
      views: sum.views + item.views,
      clicks: sum.clicks + item.clicks,
      requests: sum.requests + item.requests,
    }),
    { views: 0, clicks: 0, requests: 0 },
  );
  const maxViews = Math.max(1, ...projects.map(item => item.views));
  return (
    <section className="account-page">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{dict.title}</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-500">{dict.intro}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs text-stone-500">
          <CalendarDays className="size-4" aria-hidden="true" />
          {dict.period}
        </span>
      </header>
      <section
        aria-label={dict.summaryAria}
        className="grid grid-cols-2 divide-x divide-y divide-stone-200 border-y border-stone-200 sm:grid-cols-4 sm:divide-y-0"
      >
        <Metric
          label={dict.views}
          value={number.format(totals.views)}
          Icon={Eye}
          tone="blue"
          detail={dict.viewsDetail}
        />
        <Metric
          label={dict.siteClicks}
          value={number.format(totals.clicks)}
          Icon={MousePointerClick}
          tone="sage"
          detail={ofViews(totals.clicks, totals.views)}
        />
        <Metric
          label={dict.requests}
          value={number.format(totals.requests)}
          Icon={Send}
          tone="terracotta"
          detail={dict.requestsDetail}
        />
        <Metric
          label={dict.conversion}
          value={percentLabel(totals.requests, totals.views, locale)}
          Icon={TrendingUp}
          tone="amber"
          detail={dict.conversionDetail}
        />
      </section>
      {projects.length ? (
        <>
          <section className="grid gap-10 border-b border-stone-200 py-10 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.75fr)]">
            <div className="min-w-0">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{dict.dailyTitle}</h2>
                  <p className="mt-2 text-xs text-stone-400">{dict.dailyNote}</p>
                </div>
                <div className="flex items-center gap-5 text-xs text-stone-500">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#365DC4]" />
                    {dict.views}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-0 w-4 border-t-2 border-dashed border-[#416B50]" />
                    {dict.clicks}
                  </span>
                </div>
              </div>
              <InteractiveActivityChart days={days} dict={dict.chart} locale={locale} />
            </div>
            <aside className="border-t border-stone-200 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <h2 className="text-xl font-semibold tracking-tight">{dict.funnelTitle}</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-400">{dict.funnelNote}</p>
              <ol className="mt-8 space-y-7">
                {[
                  {
                    label: dict.funnelViews,
                    value: totals.views,
                    total: totals.views,
                    tone: 'blue' as const,
                  },
                  {
                    label: dict.siteClicks,
                    value: totals.clicks,
                    total: totals.views,
                    tone: 'sage' as const,
                  },
                  {
                    label: dict.requests,
                    value: totals.requests,
                    total: totals.views,
                    tone: 'terracotta' as const,
                  },
                ].map((step, index) => {
                  const palette = brandColors[step.tone],
                    size =
                      index === 0 && step.total
                        ? 100
                        : Math.max(step.value ? 5 : 0, percent(step.value, step.total));
                  return (
                    <li key={step.label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-stone-600">{step.label}</span>
                        <strong className="text-sm">{number.format(step.value)}</strong>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200">
                        <span
                          className="block h-full rounded-full"
                          style={{ width: `${size}%`, backgroundColor: palette.solid }}
                        />
                      </div>
                      {index > 0 && (
                        <p className="mt-2 text-xs" style={{ color: palette.solid }}>
                          {ofViews(step.value, step.total)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </aside>
          </section>
          <section className="py-10">
            <div className="mb-7 flex items-end justify-between gap-5">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">{dict.byProjectTitle}</h2>
                <p className="mt-2 text-xs text-stone-400">{dict.byProjectNote}</p>
              </div>
              <span className="text-xs text-stone-400">
                {(projects.length === 1 ? dict.projectsOne : dict.projectsOther).replace(
                  '{count}',
                  String(projects.length),
                )}
              </span>
            </div>
            <div className="divide-y divide-stone-200 border-y border-stone-200">
              {projects.map((project, index) => (
                <article
                  key={project.id}
                  className="grid gap-5 py-6 lg:grid-cols-[minmax(180px,0.8fr)_minmax(280px,1.4fr)_auto] lg:items-center"
                >
                  <Link href={`/account/solutions/${project.id}`} className="group min-w-0">
                    <span className="text-xs tabular-nums text-stone-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className="truncate font-medium">{project.name}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" />
                    </span>
                  </Link>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                      <span
                        className="block h-full rounded-full bg-[#365DC4]"
                        style={{ width: `${(project.views / maxViews) * 100}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-stone-400">
                      {project.views
                        ? dict.toSite.replace(
                            '{percent}',
                            percentLabel(project.clicks, project.views, locale),
                          )
                        : dict.noViews}
                    </p>
                  </div>
                  <dl className="flex gap-6 text-right">
                    <div>
                      <dt className="text-[11px] text-stone-400">{dict.views}</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums">
                        {number.format(project.views)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-stone-400">{dict.clicks}</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums">
                        {number.format(project.clicks)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-stone-400">{dict.requests}</dt>
                      <dd className="mt-1 text-sm font-medium tabular-nums">
                        {number.format(project.requests)}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
          <details className="border-t border-stone-200 pt-5">
            <summary className="text-sm text-stone-500">{dict.dailyDetail}</summary>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-stone-400">
                  <tr>
                    <th className="pb-3 font-normal">{dict.date}</th>
                    <th className="pb-3 text-right font-normal">{dict.views}</th>
                    <th className="pb-3 text-right font-normal">{dict.clicks}</th>
                    <th className="pb-3 text-right font-normal">{dict.requests}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {[...days].reverse().map(day => (
                    <tr key={day.day}>
                      <th className="py-3 font-normal text-stone-500">
                        {new Date(`${day.day}T12:00:00Z`).toLocaleDateString(locale, {
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'UTC',
                        })}
                      </th>
                      <td className="py-3 text-right tabular-nums">{day.views}</td>
                      <td className="py-3 text-right tabular-nums">{day.clicks}</td>
                      <td className="py-3 text-right tabular-nums">{day.requests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <div className="border-y border-stone-200 py-16">
          <Eye className="size-7 text-stone-300" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-medium tracking-tight">{dict.emptyTitle}</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-500">{dict.emptyDesc}</p>
          <Link
            href="/account/solutions"
            className="mt-6 inline-flex items-center gap-2 text-sm text-[#365DC4]"
          >
            {dict.emptyCta}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      )}
      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-stone-400">{dict.footnote}</p>
    </section>
  );
}
