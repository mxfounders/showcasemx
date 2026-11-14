import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type { Award } from './model';

type AwardWords = { weeklyAll: string; weeklyIn: string; editorial: string };

const intlLocale = (locale: string) => (locale === 'en' ? 'en-US' : 'es-MX');
const utc = (date: string) => new Date(`${date}T12:00:00Z`);

/** «#1 de la semana en Ventas», «#2 de la semana», «Selección shwcs». */
export function awardTitle(award: Award, words: AwardWords, locale: string) {
  if (award.kind === 'editorial') return words.editorial;
  const template = award.scope === 'all' ? words.weeklyAll : words.weeklyIn;
  return template
    .replace('{rank}', String(award.rank ?? 1))
    .replace('{category}', localizedCategoryDisplayLabel(award.scope, locale));
}

/** «10–16 nov 2026» for a week, «noviembre de 2026» for a month. Always dated. */
export function awardPeriod(award: Award, locale: string) {
  if (award.kind === 'editorial')
    return new Intl.DateTimeFormat(intlLocale(locale), {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(utc(award.periodStart));
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).formatRange(utc(award.periodStart), utc(award.periodEnd));
}

export function recognitionDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

type PillWords = AwardWords & {
  verified: string;
  verifiedOn: string;
  verifiedExplainer: string;
  weeklyExplainer: string;
  editorialExplainer: string;
};

/** The public pills under a listing's name: verification first, then the awards. */
export function recognitionPills(
  recognition: { verifiedAt: string | null; awards: Award[] },
  words: PillWords,
  locale: string,
) {
  const pills: {
    key: string;
    kind: 'verified' | 'weekly' | 'editorial';
    label: string;
    detail: string;
  }[] = [];
  if (recognition.verifiedAt)
    pills.push({
      key: 'verified',
      kind: 'verified',
      label: words.verified,
      detail: `${words.verifiedOn.replace('{date}', recognitionDate(recognition.verifiedAt, locale))}. ${words.verifiedExplainer}`,
    });
  for (const award of recognition.awards.slice(0, 4))
    pills.push({
      key: award.id,
      kind: award.kind,
      label: `${awardTitle(award, words, locale)} · ${awardPeriod(award, locale)}`,
      detail:
        award.kind === 'editorial'
          ? `${words.editorialExplainer} ${award.note ?? ''}`.trim()
          : words.weeklyExplainer,
    });
  return pills;
}

/** «2–8 nov 2026», «30 oct – 5 nov 2026», «nov 2026»: compact, for the badges themselves. */
export function compactPeriod(start: string, end: string | null, locale: string) {
  const month = (date: string) =>
    new Intl.DateTimeFormat(intlLocale(locale), { month: 'short', timeZone: 'UTC' })
      .format(utc(date))
      .replace('.', '');
  const [y1, , d1] = start.split('-').map(Number);
  if (!end) return `${month(start)} ${y1}`;
  const [y2, , d2] = end.split('-').map(Number);
  if (month(start) === month(end) && y1 === y2) return `${d1}–${d2} ${month(start)} ${y1}`;
  return `${d1} ${month(start)} – ${d2} ${month(end)} ${y2}`;
}
