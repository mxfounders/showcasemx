import type { ReviewSummary } from '@/lib/reviews/server';
import type { Dictionary } from '@/i18n/dictionary';
import { Stars } from './stars';
import { formatRating } from './review-summary';

/** Average and count under the ficha's title, linking to the reviews. Nothing at zero. */
export function ReviewBadge({
  summary,
  locale,
  dict,
}: {
  summary: ReviewSummary;
  locale: string;
  dict: Dictionary['reviews'];
}) {
  if (summary.average === null) return null;
  const rating = formatRating(summary.average, locale);
  return (
    <a
      href="#resenas"
      className="mt-4 inline-flex items-center gap-2 rounded-full text-sm text-stone-600 hover:text-stone-900"
    >
      <Stars rating={summary.average} label={dict.starsLabel.replace('{rating}', rating)} />
      <span className="font-medium text-stone-900">{rating}</span>
      <span className="underline underline-offset-4">
        {(summary.count === 1 ? dict.countOne : dict.countMany).replace(
          '{count}',
          String(summary.count),
        )}
      </span>
    </a>
  );
}
