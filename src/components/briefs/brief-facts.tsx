import type { Dictionary } from '@/i18n/dictionary';
import {
  localizedCapabilityLabel,
  localizedCategoryDisplayLabel,
  localizedCompanySizes,
  localizedIndustries,
} from '@/lib/taxonomy';
import { storedOptionLabel, timelineOptions } from '@/lib/contacts/model';

export type BriefFactsInput = {
  problem: string;
  categories: readonly string[];
  capabilities: readonly string[];
  industry: string | null;
  company_size: string;
  timeline: string;
  budget: string;
  country: string | null;
};

/**
 * A brief as everyone allowed to read it sees it: the buyer reviewing it, the founders it
 * matched and ops. Never who the buyer is. Shared by the form's review step and the pages.
 */
export function BriefFacts({
  brief,
  locale,
  dict: t,
  timelines,
  problem = true,
}: {
  brief: BriefFactsInput;
  locale: string;
  dict: Dictionary['briefs']['facts'];
  timelines: Dictionary['contacts']['timelines'];
  /** The problem text is shown elsewhere on some pages. */
  problem?: boolean;
}) {
  const size = localizedCompanySizes(locale).find(item => item.value === brief.company_size);
  const industry = localizedIndustries(locale).find(item => item.value === brief.industry);
  const country = brief.country
    ? (new Intl.DisplayNames([locale], { type: 'region' }).of(brief.country) ?? brief.country)
    : null;
  const rows: [string, string, string][] = [
    [
      'categories',
      t.categories,
      brief.categories.map(value => localizedCategoryDisplayLabel(value, locale)).join(', '),
    ],
    ...(brief.capabilities.length
      ? [
          [
            'capabilities',
            t.capabilities,
            brief.capabilities.map(id => localizedCapabilityLabel(id, locale)).join(', '),
          ] as [string, string, string],
        ]
      : []),
    ['size', t.size, size ? `${size.label} (${size.range})` : brief.company_size],
    ['industry', t.industry, industry?.label ?? t.notSpecified],
    ['timeline', t.timeline, storedOptionLabel(brief.timeline, timelineOptions, timelines)],
    ['budget', t.budget, brief.budget || t.notSpecified],
    ['country', t.country, country ?? t.notSpecified],
  ];
  return (
    <dl className="grid gap-5 text-sm sm:grid-cols-2">
      {problem && (
        <div className="sm:col-span-2">
          <dt className="text-xs text-stone-500">{t.problem}</dt>
          <dd className="mt-2 whitespace-pre-wrap break-words">{brief.problem}</dd>
        </div>
      )}
      {rows.map(([key, label, value]) => (
        <div key={key}>
          <dt className="text-xs text-stone-500">{label}</dt>
          <dd className="mt-2 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
