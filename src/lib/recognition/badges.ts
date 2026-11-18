import type { Dictionary } from '@/i18n/dictionary';
import { badgeWidth, toneForRank, type BadgeTone, type BadgeVariant } from './badge';
import { awardTitle, compactPeriod } from './format';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type { Recognition } from './model';

export type BadgeOption = {
  /** `featured`, `verified` or the award id: what ?kind=/&award= select on the route. */
  key: string;
  variant: BadgeVariant;
  tone: BadgeTone;
  label: string;
  seal: { line1: string; line2?: string };
  date?: string;
  rank?: number | null;
  /** Accessible name and the snippet's alt text. */
  title: string;
  /** Short name in the founder's picker. */
  pick: string;
  width: number;
};

/**
 * Reviews needed before the «Publicado en» badge shows a rating. With one or two, a
 * friend's five stars would read as the project's standing on someone else's site.
 */
export const badgeRatingMinimum = 3;

export type BadgeReviews = { count: number; average: number | null };

/**
 * Every badge a published listing can show right now. «Publicado en shwcs» always;
 * «Verificado» only while the verification stands; one per standing award. The route and
 * the founder's card read this same list, so neither can offer what the other refuses.
 */
export function badgeOptions(
  name: string,
  recognition: Recognition,
  locale: string,
  dict: Dictionary['recognition'],
  reviews: BadgeReviews | null = null,
): BadgeOption[] {
  const title = (label: string) => `${dict.badge.title.replace('{name}', name)} · ${label}`;
  const seal = dict.badge.seal;
  const rating = badgeRating(reviews, locale, dict);
  const options: BadgeOption[] = [
    {
      key: 'featured',
      variant: 'featured',
      tone: 'featured',
      label: dict.badge.featured,
      seal: { line1: seal.featured, line2: seal.featuredBy },
      ...(rating && { date: rating.short }),
      title: title(rating ? `${dict.badge.featured} · ${rating.long}` : dict.badge.featured),
      pick: dict.founder.kinds.featured,
      width: badgeWidth(dict.badge.featured, rating?.short),
    },
  ];
  if (recognition.verifiedAt) {
    const since = seal.since.replace(
      '{date}',
      compactPeriod(recognition.verifiedAt.slice(0, 10), null, locale),
    );
    options.push({
      key: 'verified',
      variant: 'verified',
      tone: 'verified',
      label: dict.badge.verified,
      seal: { line1: seal.verified, line2: seal.verifiedBy },
      date: since,
      title: title(dict.verified),
      pick: dict.founder.kinds.verified,
      width: badgeWidth(dict.badge.verified, since),
    });
  }
  for (const award of recognition.awards.slice(0, 6)) {
    const name = awardTitle(award, dict, locale);
    const editorial = award.kind === 'editorial';
    const date = editorial
      ? compactPeriod(award.periodStart, null, locale)
      : compactPeriod(award.periodStart, award.periodEnd, locale);
    const label = editorial ? dict.badge.editorial : name;
    options.push({
      key: award.id,
      variant: 'award',
      tone: editorial ? 'editorial' : toneForRank(award.rank),
      label,
      seal: editorial
        ? { line1: seal.editorial, line2: seal.editorialBy }
        : {
            line1: seal.weekly,
            line2:
              award.scope === 'all'
                ? seal.overall
                : localizedCategoryDisplayLabel(award.scope, locale),
          },
      date,
      rank: award.rank,
      title: title(`${name} · ${date}`),
      pick: `${name} · ${date}`,
      width: badgeWidth(label, date),
    });
  }
  return options;
}

/**
 * «4.8 ★ · 12 reseñas» for the badge and its accessible name, from the listing's public
 * reviews (verified email, not the owner's), or null below {@link badgeRatingMinimum}.
 */
export function badgeRating(
  reviews: BadgeReviews | null,
  locale: string,
  dict: Dictionary['recognition'],
) {
  if (!reviews || reviews.average == null || reviews.count < badgeRatingMinimum) return null;
  const average = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'es-MX', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(reviews.average);
  const fill = (template: string) =>
    template.replace('{rating}', average).replace('{count}', String(reviews.count));
  return { short: fill(dict.badge.rating), long: fill(dict.badge.ratingTitle) };
}

export function badgeSrc(
  origin: string,
  solutionId: string,
  option: Pick<BadgeOption, 'key' | 'variant'>,
  theme: 'light' | 'dark',
  locale: string,
  layout: 'card' | 'seal' = 'card',
) {
  const params = new URLSearchParams({
    kind: option.variant,
    ...(option.variant === 'award' ? { award: option.key } : {}),
    ...(layout === 'seal' ? { layout } : {}),
    theme,
    lang: locale === 'en' ? 'en' : 'es',
  });
  return `${origin}/api/badge/${solutionId}?${params}`;
}
