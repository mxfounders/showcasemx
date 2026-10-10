import type { PublicReview } from './server';

export const reviewSorts = ['recent', 'highest', 'lowest'] as const;
export type ReviewSort = (typeof reviewSorts)[number];

export type ReviewFilters = {
  stars: number | null;
  size: string | null;
  country: string | null;
  sort: ReviewSort;
};

export const noReviewFilters: ReviewFilters = {
  stars: null,
  size: null,
  country: null,
  sort: 'recent',
};

/**
 * Filters and orders a ficha's reviews in the browser (a ficha shows up to 100). The
 * viewer's own review stays first and is never filtered out: it is theirs to find.
 */
export function filterReviews(reviews: readonly PublicReview[], filters: ReviewFilters) {
  const mine = reviews.filter(review => review.mine);
  const rest = reviews.filter(
    review =>
      !review.mine &&
      (filters.stars === null || review.rating === filters.stars) &&
      (filters.size === null || review.companySize === filters.size) &&
      (filters.country === null || review.country === filters.country),
  );
  const recent = (a: PublicReview, b: PublicReview) => b.createdAt.localeCompare(a.createdAt);
  rest.sort((a, b) =>
    filters.sort === 'highest'
      ? b.rating - a.rating || recent(a, b)
      : filters.sort === 'lowest'
        ? a.rating - b.rating || recent(a, b)
        : recent(a, b),
  );
  return [...mine, ...rest];
}

/** Only values some review actually has, so no option leads to an empty list. */
export function reviewFacets(reviews: readonly PublicReview[]) {
  const present = <T>(values: (T | null)[]) => [
    ...new Set(values.filter((value): value is T => value !== null)),
  ];
  return {
    stars: present(reviews.map(review => review.rating)).sort((a, b) => b - a),
    sizes: present(reviews.map(review => review.companySize)),
    countries: present(reviews.map(review => review.country)),
  };
}
