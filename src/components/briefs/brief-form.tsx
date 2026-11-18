'use client';
import { useEffect, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import { actionButtonStyle, solutionCategoryTones } from '@/lib/brand-colors';
import { libraryButton, libraryField } from '@/components/library/client';
import { Chips, Suggestions } from '@/components/solutions/editor/chips';
import { useLocale } from '@/i18n/use-locale';
import type { Dictionary } from '@/i18n/dictionary';
import {
  localizedCapabilityLabel,
  localizedCategoryDisplayLabel,
  localizedCompanySizes,
  localizedIndustries,
} from '@/lib/taxonomy';
import { solutionCapabilities, solutionCategories } from '@/lib/solutions/model';
import { timelineOptions, type TimelineKey } from '@/lib/contacts/model';
import { countryOptions } from '@/lib/countries';
import { suggestCapabilityIds, suggestCategories, suggestIndustries } from '@/lib/search/suggest';
import {
  briefConsentVersion,
  maxBriefCapabilities,
  maxBriefCategories,
  readBrief,
  type BriefInput,
} from '@/lib/briefs/model';
import { BriefFacts } from './brief-facts';

type Draft = Omit<BriefInput, 'industry' | 'country'> & { industry: string; country: string };

/**
 * The buyer's brief (SHCWS-58): what they need, where it belongs and for whom, then a
 * review of exactly what founders will read and the brief-v1 consent. Suggestions come
 * from the buyer's own words and are only ever added with a click.
 */
export function BriefForm({
  prefill,
  dict: t,
  contactsDict,
}: {
  prefill: { problem: string; categories: string[] };
  dict: Dictionary['briefs'];
  contactsDict: Pick<Dictionary['contacts'], 'timelines'>;
}) {
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({
      problem: prefill.problem,
      budget: '',
      timeline: '',
      companySize: '',
      industry: '',
      country: '',
      categories: prefill.categories,
      capabilities: [],
    }),
    [review, setReview] = useState(false),
    [consent, setConsent] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const id = useRef<string | null>(null),
    busy = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (review) heading.current?.focus();
  }, [review]);
  const update = (patch: Partial<Draft>) => {
    setDraft(current => ({ ...current, ...patch }));
    setError('');
  };
  const categoryLabel = (value: string) => localizedCategoryDisplayLabel(value, locale);
  const subject = { problem: draft.problem };
  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter(item => item !== value) : [...list, value];
  const setCategories = (next: string[]) => {
    if (next.length > maxBriefCategories) return setError(t.form.tooManyCategories);
    // Dropping a category drops its capabilities, so nothing invalid stays selected.
    update({
      categories: next,
      capabilities: draft.capabilities.filter(capability =>
        next.includes(solutionCapabilities.find(item => item.id === capability)?.category ?? ''),
      ),
    });
  };
  const setCapabilities = (next: string[]) => {
    if (next.length > maxBriefCapabilities) return setError(t.form.tooManyCapabilities);
    update({ capabilities: next });
  };
  const industries = localizedIndustries(locale);
  const validated = () =>
    readBrief({ ...draft, industry: draft.industry || null, country: draft.country || null });

  return (
    <form
      noValidate
      aria-label={t.form.aria}
      aria-busy={pending}
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        const brief = validated();
        if (!brief) return setError(t.form.incomplete);
        if (!review) return setReview(true);
        if (!consent) return setError(t.form.consentRequired);
        busy.current = true;
        setPending(true);
        id.current ??= crypto.randomUUID();
        try {
          const response = await fetch('/api/briefs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...brief,
              action: 'create',
              id: id.current,
              consent: true,
              consentVersion: briefConsentVersion,
            }),
            signal: AbortSignal.timeout(20000),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || t.errors.unavailable);
          router.push(`/account/briefs/${id.current}`);
          router.refresh();
        } catch (failure) {
          setError(
            failure instanceof Error && !['TypeError', 'TimeoutError'].includes(failure.name)
              ? failure.message
              : t.errors.network,
          );
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      {!review ? (
        <fieldset disabled={pending} className="space-y-8">
          <label className="block text-sm font-medium text-stone-800">
            {t.form.problem}
            <textarea
              value={draft.problem}
              onChange={event => update({ problem: event.target.value })}
              minLength={20}
              maxLength={2000}
              rows={5}
              placeholder={t.form.problemPlaceholder}
              aria-describedby="brief-problem-hint"
              className={`${libraryField} font-normal`}
            />
            <span id="brief-problem-hint" className="mt-2 block text-xs font-normal text-stone-500">
              {t.form.problemHint}
            </span>
          </label>
          <div className="space-y-5">
            <Suggestions
              title={t.form.suggestedCategories}
              items={
                draft.categories.length >= maxBriefCategories
                  ? []
                  : suggestCategories(subject, draft.categories).map(value => ({
                      value,
                      label: categoryLabel(value),
                    }))
              }
              onAdd={value => setCategories([...draft.categories, value])}
            />
            <Chips
              name="brief-categories"
              legend={t.form.categories}
              options={solutionCategories.map(category => ({
                value: category,
                label: categoryLabel(category),
                tone: solutionCategoryTones[category],
              }))}
              selected={draft.categories}
              onToggle={value => setCategories(toggle(draft.categories, value))}
            />
          </div>
          {draft.categories.length > 0 && (
            <div className="space-y-5 border-t border-stone-200 pt-6">
              <p className="text-sm text-stone-500">{t.form.capabilitiesIntro}</p>
              <Suggestions
                title={t.form.suggestedCapabilities}
                items={suggestCapabilityIds(subject, draft.categories, draft.capabilities).map(
                  value => ({ value, label: localizedCapabilityLabel(value, locale) }),
                )}
                onAdd={value => setCapabilities([...draft.capabilities, value])}
              />
              {draft.categories.map(category => (
                <Chips
                  key={category}
                  name={`brief-capabilities-${category}`}
                  legend={t.form.capabilitiesLegend.replace('{category}', categoryLabel(category))}
                  tone={solutionCategoryTones[category]}
                  options={solutionCapabilities
                    .filter(item => item.category === category)
                    .map(item => ({
                      value: item.id,
                      label: localizedCapabilityLabel(item.id, locale),
                    }))}
                  selected={draft.capabilities}
                  onToggle={value => setCapabilities(toggle(draft.capabilities, value))}
                />
              ))}
            </div>
          )}
          <div className="space-y-5 border-t border-stone-200 pt-6">
            <Suggestions
              title={t.form.suggestedIndustries}
              items={
                draft.industry
                  ? []
                  : suggestIndustries(subject).map(value => ({
                      value,
                      label: industries.find(item => item.value === value)?.label ?? value,
                    }))
              }
              onAdd={value => update({ industry: value })}
            />
            <Chips
              name="brief-industry"
              legend={`${t.form.industry} ${t.form.optional}`}
              multi={false}
              options={industries.map(item => ({
                value: item.value,
                label: item.label,
                tone: item.tone,
              }))}
              selected={draft.industry ? [draft.industry] : []}
              onToggle={value => update({ industry: draft.industry === value ? '' : value })}
            />
            <Chips
              name="brief-size"
              legend={t.form.size}
              multi={false}
              options={localizedCompanySizes(locale).map(size => ({
                value: size.value,
                label: size.label,
                detail: size.range,
              }))}
              selected={draft.companySize ? [draft.companySize] : []}
              onToggle={value => update({ companySize: draft.companySize === value ? '' : value })}
            />
          </div>
          <div className="grid gap-6 border-t border-stone-200 pt-6 sm:grid-cols-2">
            <label className="text-sm">
              {t.form.timeline}
              <select
                value={draft.timeline}
                onChange={event => update({ timeline: event.target.value })}
                className={libraryField}
              >
                <option value="">{t.form.selectOption}</option>
                {(Object.keys(timelineOptions) as TimelineKey[]).map(key => (
                  <option key={key} value={timelineOptions[key]}>
                    {contactsDict.timelines[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              {t.form.budget} <span className="text-stone-400">{t.form.optional}</span>
              <input
                value={draft.budget}
                onChange={event => update({ budget: event.target.value })}
                maxLength={200}
                placeholder={t.form.budgetPlaceholder}
                className={libraryField}
              />
            </label>
            <label className="text-sm">
              {t.form.country} <span className="text-stone-400">{t.form.optional}</span>
              <select
                value={draft.country}
                onChange={event => update({ country: event.target.value })}
                className={libraryField}
              >
                <option value="">{t.form.selectOption}</option>
                {countryOptions(locale).map(country => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className={libraryButton} style={actionButtonStyle}>
            {t.form.review}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </button>
        </fieldset>
      ) : (
        <div>
          <h2 tabIndex={-1} ref={heading} className="text-xl font-medium outline-none">
            {t.form.reviewTitle}
          </h2>
          <div className="mt-6 border-y border-stone-200 py-6">
            <BriefFacts
              brief={{
                problem: draft.problem.trim(),
                categories: draft.categories,
                capabilities: draft.capabilities,
                industry: draft.industry || null,
                company_size: draft.companySize,
                timeline: draft.timeline,
                budget: draft.budget.trim(),
                country: draft.country || null,
              }}
              locale={locale}
              dict={t.facts}
              timelines={contactsDict.timelines}
            />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-stone-500">{t.form.reviewNote}</p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              checked={consent}
              disabled={pending}
              onChange={event => {
                setConsent(event.target.checked);
                setError('');
              }}
              className="mt-1 size-4 shrink-0 accent-[#365DC4]"
            />
            <span>{t.form.consent}</span>
          </label>
          <div className="mt-7 flex flex-wrap gap-5">
            <button disabled={pending} style={actionButtonStyle} className={libraryButton}>
              {pending ? t.form.publishing : t.form.publish}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setReview(false);
                setConsent(false);
                setError('');
              }}
              className="text-sm text-stone-500"
            >
              {t.form.edit}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      <Link href="/account/briefs" className="mt-7 inline-block text-sm text-stone-500">
        {t.form.myBriefs}
      </Link>
    </form>
  );
}
