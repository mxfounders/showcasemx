'use client';
import { useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
import Link from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import { countryOptions } from '@/lib/countries';
import {
  filterReviews,
  noReviewFilters,
  reviewFacets,
  reviewSorts,
  type ReviewFilters,
} from '@/lib/reviews/filters';
import { FilterMenu } from '@/components/catalog/filter-menu';
import type { PublicReview, ReviewSummary as Summary } from '@/lib/reviews/server';
import type { Dictionary } from '@/i18n/dictionary';
import { ReviewSummary } from './review-summary';
import { ReviewCard } from './review-card';
import { ReviewForm } from './review-form';
import { ProofForm } from './proof-form';

type Option = { value: string; label: string };

export type ReviewViewer = {
  signedIn: boolean;
  /** Owns the solution: may reply, may not review. */
  owner: boolean;
  name: string;
};

/** The ficha's reviews: summary, the viewer's own review or the way to write one, and the list. */
export function ReviewSection({
  solutionId,
  solutionName,
  summary,
  reviews,
  viewer,
  companySizes,
  countryNames,
  proofMethod,
  locale,
  dict,
}: {
  solutionId: string;
  solutionName: string;
  summary: Summary;
  reviews: PublicReview[];
  viewer: ReviewViewer;
  companySizes: Option[];
  /** Names of the countries shown in `reviews`, resolved on the server to match on hydration. */
  countryNames: Record<string, string>;
  /** How a reviewer can prove a purchase from this vendor, if any (docs/compliance.md). */
  proofMethod: 'cfdi' | null;
  locale: string;
  dict: Dictionary['reviews'];
}) {
  const [writing, setWriting] = useState(false);
  const [filters, setFilters] = useState<ReviewFilters>(noReviewFilters);
  const [menu, setMenu] = useState<keyof ReviewFilters | null>(null);
  const mine = reviews.find(review => review.mine) ?? null;
  const sizeNames = Object.fromEntries(companySizes.map(option => [option.value, option.label]));
  const others = reviews.filter(review => !review.mine);
  const facets = reviewFacets(others);
  const visible = filterReviews(reviews, filters);
  const filtered = filters.stars !== null || filters.size !== null || filters.country !== null;
  const menuProps = (key: keyof ReviewFilters) => ({
    open: menu === key,
    onOpenChange: (open: boolean) => setMenu(open ? key : null),
  });
  const starLabel = (count: number) =>
    (count === 1 ? dict.form.star : dict.form.stars).replace('{count}', String(count));
  // Only built once the form opens, so the full list never ships in the page payload.
  const countries = useMemo(() => (writing ? countryOptions(locale) : []), [writing, locale]);

  return (
    <section
      id="resenas"
      aria-labelledby="solution-reviews"
      className="mt-14 scroll-mt-24 border-t border-stone-200 pt-8"
    >
      <div className="max-w-4xl">
        <h2 id="solution-reviews" className="text-2xl font-semibold tracking-tight">
          {dict.title}
        </h2>
        <div className="mt-6">
          <ReviewSummary summary={summary} locale={locale} dict={dict} />
        </div>

        <div className="mt-8">
          {!viewer.signedIn ? (
            <p className="text-sm text-stone-500">
              <Link
                href={`/sign-in?next=${encodeURIComponent('/soluciones/' + solutionId)}`}
                className="text-[#365DC4] underline underline-offset-4"
              >
                {dict.signIn}
              </Link>{' '}
              {dict.signInSuffix}
            </p>
          ) : viewer.owner ? (
            <p className="text-sm text-stone-500">{dict.ownNote}</p>
          ) : writing ? (
            <ReviewForm
              solutionId={solutionId}
              solutionName={solutionName}
              existing={mine}
              defaultName={viewer.name}
              companySizes={companySizes}
              countries={countries}
              dict={dict}
              onClose={() => setWriting(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setWriting(true)}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              <PenLine className="size-4" aria-hidden="true" />
              {mine ? dict.editMine : dict.write}
            </button>
          )}
        </div>

        {mine && !writing && (mine.level === 'unverified' || mine.own?.hiddenReason) && (
          <p className="mt-6 rounded-2xl bg-[#F4ECD5] p-4 text-sm leading-relaxed text-[#6b4d14]">
            {mine.own?.hiddenReason ? (
              dict.hidden.replace('{reason}', mine.own.hiddenReason)
            ) : (
              <>
                {dict.pending}{' '}
                <Link
                  href="/account/settings/security"
                  className="font-medium underline underline-offset-4"
                >
                  {dict.verifyLink}
                </Link>
              </>
            )}
          </p>
        )}

        {mine &&
          !writing &&
          proofMethod === 'cfdi' &&
          (mine.level === 'email' || mine.level === 'work') && (
            <div className="mt-6">
              <ProofForm solutionId={solutionId} reviewId={mine.id} dict={dict} />
            </div>
          )}

        {others.length >= 3 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <FilterMenu
              {...menuProps('sort')}
              label={dict.filters.sort}
              allowClear={false}
              options={reviewSorts.map(value => ({ value, label: dict.filters.sorts[value] }))}
              values={[filters.sort]}
              onChange={(value: string) =>
                setFilters(current => ({ ...current, sort: value as ReviewFilters['sort'] }))
              }
            />
            {facets.stars.length > 1 && (
              <FilterMenu
                {...menuProps('stars')}
                label={dict.filters.stars}
                clearLabel={dict.filters.any}
                options={facets.stars.map(value => ({
                  value: String(value),
                  label: starLabel(value),
                }))}
                values={filters.stars === null ? [] : [String(filters.stars)]}
                onChange={(value: string) =>
                  setFilters(current => ({ ...current, stars: value ? Number(value) : null }))
                }
              />
            )}
            {facets.sizes.length > 1 && (
              <FilterMenu
                {...menuProps('size')}
                label={dict.filters.size}
                clearLabel={dict.filters.any}
                options={facets.sizes.map(value => ({ value, label: sizeNames[value] ?? value }))}
                values={filters.size === null ? [] : [filters.size]}
                onChange={(value: string) =>
                  setFilters(current => ({ ...current, size: value || null }))
                }
              />
            )}
            {facets.countries.length > 1 && (
              <FilterMenu
                {...menuProps('country')}
                label={dict.filters.country}
                clearLabel={dict.filters.any}
                options={facets.countries.map(value => ({
                  value,
                  label: countryNames[value] ?? value,
                }))}
                values={filters.country === null ? [] : [filters.country]}
                onChange={(value: string) =>
                  setFilters(current => ({ ...current, country: value || null }))
                }
              />
            )}
            {filtered && (
              <button
                type="button"
                onClick={() => setFilters(current => ({ ...noReviewFilters, sort: current.sort }))}
                className="rounded-full px-3 py-2 text-sm text-stone-500 hover:bg-white hover:text-stone-800"
              >
                {dict.filters.clear}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 divide-y divide-stone-200">
          {filtered && visible.every(review => review.mine) && (
            <p className="py-7 text-sm text-stone-500">{dict.filters.noMatch}</p>
          )}
          {visible.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              solutionId={solutionId}
              solutionName={solutionName}
              canReply={viewer.owner && review.level !== 'unverified'}
              canReport={viewer.signedIn && !review.mine}
              sizeLabel={review.companySize ? (sizeNames[review.companySize] ?? null) : null}
              countryLabel={
                review.country ? (countryNames[review.country] ?? review.country) : null
              }
              locale={locale}
              dict={dict}
            />
          ))}
          {!reviews.length && (
            <p className="py-7 text-sm text-stone-500">
              {dict.empty.replace('{name}', solutionName)}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
