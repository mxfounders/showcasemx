'use client';
import { useId, useState } from 'react';
import { PlusIcon } from '@/components/icons/gota';
import { solutionInput as input } from '../profile-editor';
import { Chips } from './chips';
import type { CurrencyOptions } from '@/lib/currencies';
import {
  maxPriceFrom,
  maxSolutionPlans,
  maxTrialDays,
  minSlaUptime,
  planLimits,
  solutionPriceUnits,
  type SolutionData,
  type SolutionPlan,
  type SolutionResourceKind,
} from '@/lib/solutions/model';
import { planPrice, supportResources, technicalResources } from '@/lib/solutions/offer';
import {
  localizedDeveloperToolOptions,
  localizedExitTermOptions,
  localizedOnboardingOptions,
  localizedPricingModelOptions,
  localizedResourceKinds,
  localizedSupportChannelOptions,
  localizedSupportResponseOptions,
  localizedTryOptions,
} from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';

type OfferDict = Dictionary['solutionEditor']['editor']['offer'];
type Update = (patch: Partial<SolutionData>) => void;

function toggled(list: readonly string[] | undefined, value: string) {
  const current = list ?? [];
  const next = current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value];
  return next.length ? next : undefined;
}

/** A whole number in range, or undefined while the field is empty or still being typed. */
function wholeNumber(raw: string, min: number, max: number) {
  const value = Number(raw);
  return raw.trim() && Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

/**
 * «Cómo se puede probar» and the plan list (SHCWS-180), under the price fields. A new plan
 * starts with the currency and unit of the one before it (or of the «Desde» price), so a
 * price list of five plans is five names, five amounts and a line each.
 */
export function PlanFields({
  data,
  update,
  locale,
  currencies,
  dict,
}: {
  data: SolutionData;
  update: Update;
  locale: string;
  currencies: CurrencyOptions;
  dict: OfferDict;
}) {
  const id = useId();
  const plans = data.plans ?? [];
  const units = localizedPricingModelOptions(locale).filter(option =>
    (solutionPriceUnits as readonly string[]).includes(option.value),
  );
  const [trial, setTrial] = useState(data.trialDays?.toString() ?? '');
  const setPlan = (index: number, patch: Partial<SolutionPlan>) => {
    const next = plans.map((plan, i) => (i === index ? { ...plan, ...patch } : plan));
    // A plan that costs 0 is a free plan: say so where buyers filter for it.
    const free = next.some(plan => plan.price === 0);
    update({
      plans: next,
      ...(free && !data.tryOptions?.includes('plan-gratis')
        ? { tryOptions: [...(data.tryOptions ?? []), 'plan-gratis'] }
        : {}),
    });
  };
  const addPlan = () => {
    const last = plans.at(-1);
    update({
      plans: [
        ...plans,
        {
          name: '',
          currency: last?.currency ?? data.priceCurrency,
          unit: last?.unit ?? data.priceUnit,
        },
      ],
    });
  };
  return (
    <>
      <Chips
        name="try-options"
        legend={dict.tryLegend}
        tone="sage"
        options={localizedTryOptions(locale)}
        selected={data.tryOptions ?? []}
        onToggle={value => {
          const tryOptions = toggled(data.tryOptions, value);
          update({
            tryOptions,
            ...(tryOptions?.includes('prueba-gratis') ? {} : { trialDays: undefined }),
          });
        }}
      />
      {data.tryOptions?.includes('prueba-gratis') && (
        <label className="block text-sm font-medium text-stone-800" htmlFor={`${id}-trial`}>
          {dict.trialDaysLabel}
          <input
            id={`${id}-trial`}
            type="number"
            inputMode="numeric"
            min={1}
            max={maxTrialDays}
            step={1}
            value={trial}
            placeholder="14"
            onChange={event => {
              setTrial(event.target.value);
              update({ trialDays: wholeNumber(event.target.value, 1, maxTrialDays) });
            }}
            className={`${input} max-w-32 font-normal`}
          />
        </label>
      )}
      <fieldset className="border-t border-stone-200 pt-6">
        <legend className="text-sm font-medium text-stone-800">{dict.plansTitle}</legend>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{dict.plansNote}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {plans.map((plan, index) => (
            <PlanCard
              key={index}
              index={index}
              plan={plan}
              units={units}
              currencies={currencies}
              locale={locale}
              dict={dict}
              onChange={patch => setPlan(index, patch)}
              onRemove={() => {
                const next = plans.filter((_, i) => i !== index);
                update({ plans: next.length ? next : undefined });
              }}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {plans.length < maxSolutionPlans && (
            <button
              type="button"
              onClick={addPlan}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-400"
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
              {dict.addPlan}
            </button>
          )}
          <span className="text-xs tabular-nums text-stone-400">
            {dict.plansCount
              .replace('{count}', String(plans.length))
              .replace('{limit}', String(maxSolutionPlans))}
          </span>
        </div>
      </fieldset>
    </>
  );
}

function PlanCard({
  index,
  plan,
  units,
  currencies,
  locale,
  dict,
  onChange,
  onRemove,
}: {
  index: number;
  plan: SolutionPlan;
  units: { value: string; label: string }[];
  currencies: CurrencyOptions;
  locale: string;
  dict: OfferDict;
  onChange: (patch: Partial<SolutionPlan>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const [amount, setAmount] = useState(plan.price === undefined ? '' : String(plan.price));
  const [invalid, setInvalid] = useState(false);
  const title = dict.planLabel.replace('{index}', String(index + 1));
  return (
    <div
      role="group"
      aria-label={title}
      className="rounded-2xl border border-stone-200 bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-800">{title}</p>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-3 py-1.5 text-xs font-medium text-[#A94E35] hover:bg-[#F6E3DC]"
        >
          {dict.removePlan}
        </button>
      </div>
      <label className="mt-3 block text-xs font-medium text-stone-600" htmlFor={`${id}-name`}>
        {dict.planName}
        <input
          id={`${id}-name`}
          value={plan.name}
          maxLength={planLimits.name}
          placeholder={dict.planNamePlaceholder}
          onChange={event => onChange({ name: event.target.value })}
          className={`${input} font-normal`}
        />
      </label>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-2">
        <label className="block text-xs font-medium text-stone-600" htmlFor={`${id}-price`}>
          {dict.planPrice}
          <input
            id={`${id}-price`}
            inputMode="decimal"
            value={amount}
            placeholder={dict.planPricePlaceholder}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-price-error` : undefined}
            onChange={event => {
              const raw = event.target.value;
              setAmount(raw);
              if (!raw.trim()) {
                setInvalid(false);
                onChange({ price: undefined });
                return;
              }
              const value = Number(raw);
              const ok = Number.isFinite(value) && value >= 0 && value <= maxPriceFrom;
              setInvalid(!ok);
              onChange({ price: ok ? value : undefined });
            }}
            className={`${input} font-normal`}
          />
        </label>
        <label className="block text-xs font-medium text-stone-600" htmlFor={`${id}-currency`}>
          {dict.planCurrency}
          <select
            id={`${id}-currency`}
            value={plan.currency ?? ''}
            onChange={event => onChange({ currency: event.target.value || undefined })}
            className={`${input} font-normal`}
          >
            <option value="">—</option>
            <optgroup label={dict.frequent}>
              {currencies.frequent.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
            <optgroup label={dict.all}>
              {currencies.all.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      </div>
      {invalid && (
        <p id={`${id}-price-error`} className="mt-1.5 text-xs text-[#A94E35]">
          {dict.planPriceInvalid}
        </p>
      )}
      <label className="mt-3 block text-xs font-medium text-stone-600" htmlFor={`${id}-unit`}>
        {dict.planUnit}
        <select
          id={`${id}-unit`}
          value={plan.unit ?? ''}
          onChange={event => onChange({ unit: event.target.value || undefined })}
          className={`${input} font-normal`}
        >
          <option value="">—</option>
          {units.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 block text-xs font-medium text-stone-600" htmlFor={`${id}-includes`}>
        {dict.planIncludes}
        <textarea
          id={`${id}-includes`}
          value={plan.includes ?? ''}
          maxLength={planLimits.includes}
          rows={3}
          placeholder={dict.planIncludesPlaceholder}
          onChange={event => onChange({ includes: event.target.value || undefined })}
          className={`${input} font-normal`}
        />
      </label>
      <p className="mt-3 text-xs text-stone-500">
        {dict.planPreview}{' '}
        <span className="font-medium text-stone-800">{planPrice(plan, locale)}</span>
      </p>
    </div>
  );
}

function ResourceInputs({
  kinds,
  data,
  update,
  locale,
}: {
  kinds: readonly SolutionResourceKind[];
  data: SolutionData;
  update: Update;
  locale: string;
}) {
  const id = useId();
  const names = Object.fromEntries(
    localizedResourceKinds(locale).map(option => [option.value, option.label]),
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {kinds.map(kind => (
        <label
          key={kind}
          htmlFor={`${id}-${kind}`}
          className="block text-xs font-medium text-stone-600"
        >
          {names[kind]}
          <input
            id={`${id}-${kind}`}
            type="url"
            inputMode="url"
            value={data.resources?.[kind] ?? ''}
            maxLength={500}
            placeholder="https://"
            onChange={event => {
              const value = event.target.value.trim();
              const next = { ...(data.resources ?? {}) };
              if (value) next[kind] = event.target.value;
              else delete next[kind];
              update({ resources: Object.keys(next).length ? next : undefined });
            }}
            className={`${input} font-normal`}
          />
        </label>
      ))}
    </div>
  );
}

/** «Soporte y contrato»: channels, first response, onboarding, exit terms and an SLA. */
export function ServiceFields({
  data,
  update,
  locale,
  dict,
}: {
  data: SolutionData;
  update: Update;
  locale: string;
  dict: OfferDict;
}) {
  const id = useId();
  const [sla, setSla] = useState(data.slaUptime?.toString() ?? '');
  return (
    <>
      <Chips
        name="support-channels"
        legend={dict.channelsLegend}
        options={localizedSupportChannelOptions(locale)}
        selected={data.supportChannels ?? []}
        onToggle={value => update({ supportChannels: toggled(data.supportChannels, value) })}
      />
      <Chips
        name="support-response"
        legend={dict.responseLegend}
        multi={false}
        tone="amber"
        options={localizedSupportResponseOptions(locale)}
        selected={data.supportResponse ? [data.supportResponse] : []}
        onToggle={value =>
          update({ supportResponse: data.supportResponse === value ? undefined : value })
        }
      />
      <Chips
        name="onboarding"
        legend={dict.onboardingLegend}
        tone="lavender"
        options={localizedOnboardingOptions(locale)}
        selected={data.onboarding ?? []}
        onToggle={value => update({ onboarding: toggled(data.onboarding, value) })}
      />
      <Chips
        name="exit-terms"
        legend={dict.exitLegend}
        tone="sage"
        options={localizedExitTermOptions(locale)}
        selected={data.exitTerms ?? []}
        onToggle={value => update({ exitTerms: toggled(data.exitTerms, value) })}
      />
      <label className="block text-sm font-medium text-stone-800" htmlFor={`${id}-sla`}>
        {dict.slaLabel}
        <input
          id={`${id}-sla`}
          inputMode="decimal"
          value={sla}
          placeholder="99.9"
          onChange={event => {
            setSla(event.target.value);
            const value = Number(event.target.value);
            update({
              slaUptime:
                event.target.value.trim() &&
                Number.isFinite(value) &&
                value >= minSlaUptime &&
                value <= 100
                  ? value
                  : undefined,
            });
          }}
          aria-describedby={`${id}-sla-note`}
          className={`${input} max-w-32 font-normal`}
        />
        <span id={`${id}-sla-note`} className="mt-1.5 block text-xs font-normal text-stone-500">
          {dict.slaNote}
        </span>
      </label>
      <fieldset className="border-t border-stone-200 pt-6">
        <legend className="text-sm font-medium text-stone-800">{dict.helpLinksTitle}</legend>
        <div className="mt-3">
          <ResourceInputs kinds={supportResources} data={data} update={update} locale={locale} />
        </div>
      </fieldset>
    </>
  );
}

/** «Para equipos técnicos»: what they can build with, and the pages they read first. */
export function DeveloperFields({
  data,
  update,
  locale,
  dict,
}: {
  data: SolutionData;
  update: Update;
  locale: string;
  dict: OfferDict;
}) {
  return (
    <>
      <Chips
        name="developer-tools"
        legend={dict.toolsLegend}
        tone="lavender"
        options={localizedDeveloperToolOptions(locale)}
        selected={data.developerTools ?? []}
        onToggle={value => update({ developerTools: toggled(data.developerTools, value) })}
      />
      <fieldset className="border-t border-stone-200 pt-6">
        <legend className="text-sm font-medium text-stone-800">{dict.resourcesTitle}</legend>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{dict.resourcesNote}</p>
        <div className="mt-3">
          <ResourceInputs kinds={technicalResources} data={data} update={update} locale={locale} />
        </div>
      </fieldset>
    </>
  );
}
