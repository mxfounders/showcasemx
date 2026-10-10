import { BadgeCheck, ReceiptText } from 'lucide-react';
import type { ReviewSummary as Summary } from '@/lib/reviews/server';
import type { Dictionary } from '@/i18n/dictionary';
import { Stars } from './stars';

export const formatRating = (value: number, locale: string) =>
  value.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

/** Average, distribution and how verification works. Renders nothing invented at zero. */
export function ReviewSummary({
  summary,
  locale,
  dict,
}: {
  summary: Summary;
  locale: string;
  dict: Dictionary['reviews'];
}) {
  const count = (summary.count === 1 ? dict.countOne : dict.countMany).replace(
    '{count}',
    String(summary.count),
  );
  return (
    <div className="grid gap-8 sm:grid-cols-[minmax(0,220px)_1fr]">
      {summary.average !== null && (
        <div>
          <p className="text-5xl font-semibold tracking-tight text-stone-900">
            {formatRating(summary.average, locale)}
            <span className="ml-2 text-base font-normal text-stone-400">{dict.outOfFive}</span>
          </p>
          <div className="mt-3">
            <Stars
              rating={summary.average}
              label={dict.starsLabel.replace('{rating}', formatRating(summary.average, locale))}
              size="size-5"
            />
          </div>
          <p className="mt-2 text-sm text-stone-500">{count}</p>
          <p className="mt-1 text-sm text-stone-500">
            {dict.recommendShare.replace(
              '{percent}',
              String(Math.round((summary.recommends / summary.count) * 100)),
            )}
          </p>
          {summary.customers > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
              <ReceiptText className="size-4 text-[#416B50]" aria-hidden="true" />
              {dict.customerShare.replace('{count}', String(summary.customers))}
            </p>
          )}
          {summary.work > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
              <BadgeCheck className="size-4 text-[#416B50]" aria-hidden="true" />
              {dict.workShare.replace('{count}', String(summary.work))}
            </p>
          )}
        </div>
      )}
      <div className={summary.average === null ? 'sm:col-span-2' : ''}>
        {summary.average !== null && (
          <ol className="space-y-2" aria-label={dict.title}>
            {[5, 4, 3, 2, 1].map(star => {
              const n = summary.distribution[star - 1];
              return (
                <li key={star} className="flex items-center gap-3 text-sm text-stone-500">
                  <span className="w-3 text-right tabular-nums">{star}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-200">
                    <span
                      className="block h-full rounded-full bg-[#88631B]"
                      style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }}
                    />
                  </span>
                  <span className="w-8 tabular-nums">{n}</span>
                </li>
              );
            })}
          </ol>
        )}
        <details className="mt-6">
          <summary className="text-sm">{dict.how.title}</summary>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-500">
            {dict.how.items.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
