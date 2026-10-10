import { ArrowUpRight, MessageSquareReply } from 'lucide-react';
import Link from '@/i18n/navigation';
import type { Dictionary } from '@/i18n/dictionary';
import { Stars } from './stars';
import { formatRating } from './review-summary';

/**
 * Reviews at a glance on the owner's listing page, where the "new review" notification
 * lands. Replying happens on the public ficha, next to the review itself.
 */
export function OwnerReviewDigest({
  solutionId,
  digest,
  locale,
  dict,
}: {
  solutionId: string;
  digest: { count: number; average: number | null; unanswered: number };
  locale: string;
  dict: Dictionary['reviews'];
}) {
  const text = dict.digest;
  return (
    <section
      aria-labelledby="owner-reviews"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="owner-reviews" className="text-lg font-medium text-stone-900">
            {text.title}
          </h2>
          {digest.average === null ? (
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">{text.empty}</p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
              <Stars
                rating={digest.average}
                label={dict.starsLabel.replace('{rating}', formatRating(digest.average, locale))}
              />
              <span>
                {text.summary
                  .replace('{rating}', formatRating(digest.average, locale))
                  .replace(
                    '{count}',
                    (digest.count === 1 ? dict.countOne : dict.countMany).replace(
                      '{count}',
                      String(digest.count),
                    ),
                  )}
              </span>
              <span
                className={`inline-flex items-center gap-1 ${digest.unanswered ? 'text-[#A94E35]' : 'text-[#416B50]'}`}
              >
                <MessageSquareReply className="size-4" aria-hidden="true" />
                {digest.unanswered === 0
                  ? text.allAnswered
                  : (digest.unanswered === 1 ? text.unansweredOne : text.unansweredMany).replace(
                      '{count}',
                      String(digest.unanswered),
                    )}
              </span>
            </div>
          )}
        </div>
        {digest.count > 0 && (
          <Link
            href={`/soluciones/${solutionId}#resenas`}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-[#365DC4] hover:bg-[#E4EBFC]"
          >
            {text.open}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
