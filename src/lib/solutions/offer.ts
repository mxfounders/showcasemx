import { commonText } from '@/i18n/common';
import { formatMoney } from '@/lib/currencies';
import {
  localizedDeveloperToolOptions,
  localizedExitTermOptions,
  localizedOnboardingOptions,
  localizedPriceUnitSuffix,
  localizedResourceKinds,
  localizedSupportChannelOptions,
  localizedSupportResponseOptions,
  localizedTryOptions,
} from '@/lib/taxonomy';
import {
  safeSolutionUrl,
  solutionResourceKinds,
  type SolutionData,
  type SolutionPlan,
  type SolutionResourceKind,
} from './model';

/**
 * The three SHCWS-180 sections as readable values: plans and how to try it, what a
 * technical team can build with, and how support and leaving work. Shared by the public
 * listing, the comparator and the Markdown view, so the three say the same thing. Only
 * what the project declared comes out; nothing is filled in or converted.
 */
export type OfferFacts = Pick<
  SolutionData,
  | 'plans'
  | 'tryOptions'
  | 'trialDays'
  | 'developerTools'
  | 'resources'
  | 'supportChannels'
  | 'supportResponse'
  | 'slaUptime'
  | 'onboarding'
  | 'exitTerms'
>;

const labels = (options: { value: string; label: string }[], values: readonly string[] = []) =>
  options.filter(option => values.includes(option.value)).map(option => option.label);

/** «$12/mes», «Gratis» or «A la medida»; a price without its currency reads as quoted. */
export function planPrice(plan: SolutionPlan, locale = 'es') {
  const text = commonText(locale);
  if (plan.price === 0) return text.planFree;
  if (plan.price === undefined || !plan.currency) return text.planCustom;
  const unit = plan.unit ? localizedPriceUnitSuffix(plan.unit, locale) : '';
  return formatMoney(plan.price, plan.currency, locale) + unit;
}

/** The ways to try it, with the trial length folded into «Prueba gratis» when declared. */
export function tryLabels(data: OfferFacts, locale = 'es') {
  return localizedTryOptions(locale)
    .filter(option => data.tryOptions?.includes(option.value))
    .map(option =>
      option.value === 'prueba-gratis' && data.trialDays
        ? commonText(locale).trialDays.replace('{days}', String(data.trialDays))
        : option.label,
    );
}

/** Declared public resources in the closed order, with their label; unsafe URLs drop out. */
export function resourceLinks(
  data: OfferFacts,
  locale = 'es',
  kinds: readonly SolutionResourceKind[] = solutionResourceKinds,
) {
  const names = Object.fromEntries(
    localizedResourceKinds(locale).map(option => [option.value, option.label]),
  );
  return kinds.flatMap(kind => {
    const href = safeSolutionUrl(data.resources?.[kind]);
    return href ? [{ kind, label: names[kind] ?? kind, href }] : [];
  });
}

/** Resources a technical team reads; the help center and community belong to support. */
export const technicalResources = ['docs', 'api', 'changelog', 'status', 'roadmap'] as const;
export const supportResources = ['help', 'community'] as const;

export function offerValues(data: OfferFacts, locale = 'es') {
  const text = commonText(locale);
  return {
    plans: (data.plans ?? []).filter(plan => plan.name.trim()),
    tryOptions: tryLabels(data, locale),
    developerTools: labels(localizedDeveloperToolOptions(locale), data.developerTools),
    supportChannels: labels(localizedSupportChannelOptions(locale), data.supportChannels),
    supportResponse: data.supportResponse
      ? (labels(localizedSupportResponseOptions(locale), [data.supportResponse])[0] ?? null)
      : null,
    sla:
      data.slaUptime !== undefined
        ? text.slaUptime.replace(
            '{value}',
            data.slaUptime.toLocaleString(locale === 'en' ? 'en-US' : 'es-MX', {
              maximumFractionDigits: 3,
            }),
          )
        : null,
    onboarding: labels(localizedOnboardingOptions(locale), data.onboarding),
    exitTerms: labels(localizedExitTermOptions(locale), data.exitTerms),
  };
}

/** Whether each public section has anything to show. */
export function offerSections(data: OfferFacts) {
  return {
    plans: !!(data.plans?.some(plan => plan.name.trim()) || data.tryOptions?.length),
    technical: !!(
      data.developerTools?.length ||
      technicalResources.some(kind => safeSolutionUrl(data.resources?.[kind]))
    ),
    service: !!(
      data.supportChannels?.length ||
      data.supportResponse ||
      data.slaUptime !== undefined ||
      data.onboarding?.length ||
      data.exitTerms?.length ||
      supportResources.some(kind => safeSolutionUrl(data.resources?.[kind]))
    ),
  };
}
