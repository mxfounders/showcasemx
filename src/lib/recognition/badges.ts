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
 * Every badge a published listing can show right now. «Publicado en shwcs» always;
 * «Verificado» only while the verification stands; one per standing award. The route and
 * the founder's card read this same list, so neither can offer what the other refuses.
 */
export function badgeOptions(
  name: string,
  recognition: Recognition,
  locale: string,
  dict: Dictionary['recognition'],
): BadgeOption[] {
  const title = (label: string) => `${dict.badge.title.replace('{name}', name)} · ${label}`;
  const seal = dict.badge.seal;
  const options: BadgeOption[] = [
    {
      key: 'featured',
      variant: 'featured',
      tone: 'featured',
      label: dict.badge.featured,
      seal: { line1: seal.featured, line2: seal.featuredBy },
      title: title(dict.badge.featured),
      pick: dict.founder.kinds.featured,
      width: badgeWidth(dict.badge.featured),
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
