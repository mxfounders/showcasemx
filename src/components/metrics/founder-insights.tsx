import Link from '@/i18n/navigation';
import type { Dictionary } from '@/i18n/dictionary';
import { brandColors } from '@/lib/brand-colors';
import { outcomeValues } from '@/lib/contacts/model';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type {
  CategoryPosition,
  IntentTotals,
  MonthMetric,
  OutcomeTotals,
  PeerComparison,
} from '@/lib/metrics/founder';

type Text = Dictionary['metrics'];
/** A section that could not be read shows that, never invented zeros. */
type Loaded<T> = T | null;

function Unavailable({ text }: { text: string }) {
  return <p className="mt-4 text-sm text-stone-500">{text}</p>;
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="border-t border-stone-200 py-10">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-stone-400">{note}</p>
      {children}
    </section>
  );
}

/**
 * Interest, outcomes, catalog position, peers and a year of history for the founder
 * (SHCWS-23, SHCWS-22). Only counted signals; each block says what it is not.
 */
export function FounderInsights({
  intent,
  outcomes,
  positions,
  peers,
  months,
  locale,
  dict,
  valueLabels,
}: {
  intent: Loaded<IntentTotals>;
  outcomes: Loaded<OutcomeTotals>;
  positions: Loaded<CategoryPosition[]>;
  peers: Loaded<PeerComparison[]>;
  months: Loaded<MonthMetric[]>;
  locale: string;
  dict: Text;
  valueLabels: Dictionary['contacts']['actions']['values'];
}) {
  const t = dict.insights,
    number = new Intl.NumberFormat(dict.numberLocale),
    count = (value: number) => number.format(value),
    last30 = (value: number) => t.last30.replace('{count}', count(value));
  const totalValues = outcomes
    ? outcomeValues.reduce((sum, key) => sum + outcomes.values[key], 0)
    : 0;
  return (
    <div className="mt-2">
      <Section id="insights-intent" title={t.intentTitle} note={t.intentNote}>
        {intent ? (
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
            {[
              {
                label: t.saves,
                value: intent.saves,
                detail: last30(intent.saves30),
                tone: 'lavender',
              },
              {
                label: t.publicLists,
                value: intent.publicLists,
                detail: t.publicListsDetail,
                tone: 'amber',
              },
              {
                label: t.likes,
                value: intent.likes,
                detail: last30(intent.likes30),
                tone: 'terracotta',
              },
              {
                label: t.reviews,
                value: intent.reviews,
                detail:
                  intent.rating != null
                    ? t.rating.replace(
                        '{rating}',
                        intent.rating.toLocaleString(dict.numberLocale, {
                          maximumFractionDigits: 1,
                        }),
                      )
                    : last30(intent.reviews30),
                tone: 'sage',
              },
            ].map(item => (
              <div key={item.label} className="min-w-0">
                <dt className="flex items-center gap-2 text-xs text-stone-500">
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor: brandColors[item.tone as keyof typeof brandColors].solid,
                    }}
                  />
                  {item.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
                  {count(item.value)}
                </dd>
                <dd className="mt-1 text-xs leading-relaxed text-stone-400">{item.detail}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Unavailable text={t.unavailable} />
        )}
      </Section>
      <Section id="insights-outcomes" title={t.outcomesTitle} note={t.outcomesNote}>
        {!outcomes ? (
          <Unavailable text={t.unavailable} />
        ) : outcomes.won + outcomes.lost + outcomes.notFit + outcomes.unrecorded === 0 ? (
          <p className="mt-4 max-w-xl text-sm text-stone-500">{t.outcomesEmpty}</p>
        ) : (
          <div className="mt-6 grid gap-10 lg:grid-cols-2">
            <dl className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
              {[
                [t.won, outcomes.won],
                [t.lost, outcomes.lost],
                [t.notFit, outcomes.notFit],
                [t.unrecorded, outcomes.unrecorded],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 py-3">
                  <dt className="text-stone-600">{label}</dt>
                  <dd className="font-medium tabular-nums">{count(Number(value))}</dd>
                </div>
              ))}
            </dl>
            {totalValues > 0 && (
              <div>
                <h3 className="text-sm font-medium">{t.valuesTitle}</h3>
                <ul className="mt-4 space-y-3">
                  {outcomeValues.map(key => (
                    <li key={key}>
                      <div className="flex items-baseline justify-between gap-3 text-xs">
                        <span className="text-stone-600">{valueLabels[key]}</span>
                        <span className="tabular-nums">{count(outcomes.values[key])}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200">
                        <span
                          className="block h-full rounded-full bg-[#416B50]"
                          style={{ width: `${(outcomes.values[key] / totalValues) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>
      {(positions === null || positions.length > 0 || peers === null || peers.length > 0) && (
        <div className="grid gap-x-10 lg:grid-cols-2">
          <Section id="insights-position" title={t.positionTitle} note={t.positionNote}>
            {positions ? (
              <ul className="mt-6 divide-y divide-stone-200 border-y border-stone-200 text-sm">
                {positions.map(item => (
                  <li
                    key={item.id + item.category}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <Link href={`/account/solutions/${item.id}`} className="min-w-0 truncate">
                      {item.name}
                      <span className="text-stone-400">
                        {' · '}
                        {localizedCategoryDisplayLabel(item.category, locale)}
                      </span>
                    </Link>
                    <span className="shrink-0 font-medium tabular-nums">
                      {t.position
                        .replace('{position}', count(item.position))
                        .replace('{total}', count(item.total))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Unavailable text={t.unavailable} />
            )}
          </Section>
          <Section id="insights-peers" title={t.peersTitle} note={t.peersNote}>
            {peers ? (
              <ul className="mt-6 space-y-5 text-sm">
                {peers.map(item => (
                  <li key={item.id}>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {t.peersYours.replace('{views}', count(item.views))}
                      {' · '}
                      {item.median == null
                        ? t.peersFew.replace(
                            '{category}',
                            localizedCategoryDisplayLabel(item.category, locale),
                          )
                        : t.peersMedian
                            .replace('{peers}', count(item.peers))
                            .replace('{median}', count(Math.round(item.median)))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Unavailable text={t.unavailable} />
            )}
          </Section>
        </div>
      )}
      <Section id="insights-months" title={t.monthsTitle} note={t.monthsNote}>
        {months ? (
          <div
            className="mt-6 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-labelledby="insights-months"
          >
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-stone-400">
                <tr>
                  <th className="pb-3 font-normal">{t.month}</th>
                  {[dict.views, dict.clicks, t.requests, t.saves, t.likes, t.reviews, t.won].map(
                    label => (
                      <th key={label} className="pb-3 text-right font-normal">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {[...months].reverse().map(row => (
                  <tr key={row.month}>
                    <th className="py-3 font-normal text-stone-500">
                      {new Date(`${row.month}-15T12:00:00Z`).toLocaleDateString(dict.numberLocale, {
                        month: 'short',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </th>
                    {[
                      row.views,
                      row.clicks,
                      row.requests,
                      row.saves,
                      row.likes,
                      row.reviews,
                      row.won,
                    ].map((value, index) => (
                      <td key={index} className="py-3 text-right tabular-nums">
                        {count(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Unavailable text={t.unavailable} />
        )}
      </Section>
      <p className="max-w-3xl text-xs leading-relaxed text-stone-400">{t.notMeasured}</p>
    </div>
  );
}
