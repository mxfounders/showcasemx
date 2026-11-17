'use client';
import { useId, useState } from 'react';
import { CloseIcon, PlusIcon } from '@/components/icons/gota';
import { solutionInput as input } from '../profile-editor';
import { Chips } from './chips';
import {
  caseLimits,
  maxSolutionCases,
  minFoundedYear,
  supportHoursLimit,
  type SolutionCase,
  type SolutionData,
} from '@/lib/solutions/model';
import {
  localizedCustomerCountOptions,
  localizedPaymentMethodOptions,
  localizedTeamSizeOptions,
} from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';

type ProviderDict = Dictionary['solutionEditor']['editor']['provider'];
type Option = { value: string; label: string };
/** Options built on the server (countries, currencies, languages), frequent ones first. */
export type GroupedOptions = { frequent: Option[]; all: Option[] };

function toggled(list: readonly string[] | undefined, value: string) {
  const current = list ?? [];
  return current.includes(value) ? current.filter(item => item !== value) : [...current, value];
}

/**
 * A list of codes picked from a long list (countries, currencies, languages): the chosen
 * ones as removable pills and a native select to add another, so 250 countries never
 * render as chips. `any` is the tri-state «[] = any country» of SHCWS-56.
 */
function CodePicker({
  legend,
  hint,
  options,
  selected,
  onChange,
  addLabel,
  any,
  dict,
}: {
  legend: string;
  hint?: string;
  options: GroupedOptions;
  selected: readonly string[] | undefined;
  onChange: (value: string[] | undefined) => void;
  addLabel: string;
  any?: { label: string };
  dict: ProviderDict;
}) {
  const id = useId();
  const labelOf = (code: string) =>
    [...options.frequent, ...options.all].find(option => option.value === code)?.label ?? code;
  const isAny = any && selected?.length === 0;
  const chosen = selected ?? [];
  const available = (list: Option[]) => list.filter(option => !chosen.includes(option.value));
  return (
    <fieldset>
      <legend className="text-sm font-medium text-stone-800">{legend}</legend>
      {hint && <p className="mt-1 text-xs leading-relaxed text-stone-500">{hint}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {any && (
          <label className="editor-chip cursor-pointer">
            <input
              type="checkbox"
              checked={!!isAny}
              onChange={() => onChange(isAny ? undefined : [])}
              className="peer sr-only"
            />
            <span
              className={`inline-flex min-h-10 items-center rounded-full border px-3.5 py-2 text-sm transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] ${isAny ? 'border-[#365DC4] bg-[#E4EBFC] text-[#365DC4]' : 'border-stone-300 bg-white text-stone-700'}`}
            >
              {any.label}
            </span>
          </label>
        )}
        {chosen.map(code => (
          <span
            key={code}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-[#365DC4] bg-[#E4EBFC] py-1 pl-3.5 pr-1.5 text-sm text-[#365DC4]"
          >
            {labelOf(code)}
            <button
              type="button"
              onClick={() => {
                const next = chosen.filter(item => item !== code);
                onChange(next.length ? next : undefined);
              }}
              aria-label={dict.remove.replace('{name}', labelOf(code))}
              className="flex size-7 items-center justify-center rounded-full hover:bg-white/70"
            >
              <CloseIcon aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        ))}
        <label htmlFor={id} className="sr-only">
          {addLabel}
        </label>
        <select
          id={id}
          value=""
          onChange={event => {
            if (event.target.value) onChange([...chosen, event.target.value]);
          }}
          className="min-h-10 rounded-full border border-dashed border-stone-300 bg-white px-3.5 text-sm text-stone-600 outline-none focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]"
        >
          <option value="">{addLabel}</option>
          {available(options.frequent).length > 0 && (
            <optgroup label={dict.frequent}>
              {available(options.frequent).map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={dict.all}>
            {available(options.all).map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>
    </fieldset>
  );
}

/** «Dónde operas»: origin, service and billing countries, currencies, support, payment. */
export function MarketsFields({
  data,
  update,
  countries,
  currencies,
  languages,
  locale,
  dict,
}: {
  data: SolutionData;
  update: (patch: Partial<SolutionData>) => void;
  countries: GroupedOptions;
  currencies: GroupedOptions;
  languages: GroupedOptions;
  locale: string;
  dict: ProviderDict;
}) {
  const id = useId();
  return (
    <>
      <label className="block text-sm font-medium text-stone-800" htmlFor={`${id}-origin`}>
        {dict.originLabel}
        <select
          id={`${id}-origin`}
          value={data.originCountry ?? ''}
          onChange={event => update({ originCountry: event.target.value || undefined })}
          className={`${input} font-normal`}
        >
          <option value="">{dict.originPlaceholder}</option>
          <optgroup label={dict.frequent}>
            {countries.frequent.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
          <optgroup label={dict.all}>
            {countries.all.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>
      <CodePicker
        legend={dict.serviceLegend}
        options={countries}
        selected={data.serviceCountries}
        onChange={serviceCountries => update({ serviceCountries })}
        addLabel={dict.addCountry}
        any={{ label: dict.anyCountry }}
        dict={dict}
      />
      <CodePicker
        legend={dict.billingLegend}
        hint={dict.billingHint}
        options={countries}
        selected={data.billingCountries}
        onChange={billingCountries => update({ billingCountries })}
        addLabel={dict.addCountry}
        any={{ label: dict.anyCountry }}
        dict={dict}
      />
      <CodePicker
        legend={dict.currenciesLegend}
        options={currencies}
        selected={data.currencies}
        onChange={value => update({ currencies: value })}
        addLabel={dict.addCurrency}
        dict={dict}
      />
      <CodePicker
        legend={dict.languagesLegend}
        options={languages}
        selected={data.supportLanguages}
        onChange={supportLanguages => update({ supportLanguages })}
        addLabel={dict.addLanguage}
        dict={dict}
      />
      <label className="block text-sm font-medium text-stone-800" htmlFor={`${id}-hours`}>
        {dict.supportHoursLabel}
        <input
          id={`${id}-hours`}
          value={data.supportHours ?? ''}
          maxLength={supportHoursLimit}
          placeholder={dict.supportHoursPlaceholder}
          onChange={event => update({ supportHours: event.target.value || undefined })}
          className={`${input} font-normal`}
        />
      </label>
      <Chips
        name="payment-methods"
        legend={dict.paymentLegend}
        tone="sage"
        options={localizedPaymentMethodOptions(locale)}
        selected={data.paymentMethods ?? []}
        onToggle={value => {
          const next = toggled(data.paymentMethods, value);
          update({ paymentMethods: next.length ? next : undefined });
        }}
      />
    </>
  );
}

const emptyCase: SolutionCase = { client: '', problem: '', result: '' };

/** «Trayectoria y clientes»: year, team and customer bands, and customer cases. */
export function TrackFields({
  data,
  update,
  locale,
  dict,
}: {
  data: SolutionData;
  update: (patch: Partial<SolutionData>) => void;
  locale: string;
  dict: ProviderDict;
}) {
  const id = useId();
  const [year, setYear] = useState(data.foundedYear?.toString() ?? '');
  const thisYear = new Date().getFullYear();
  const cases = data.cases ?? [];
  const setCase = (index: number, patch: Partial<SolutionCase>) =>
    update({ cases: cases.map((item, i) => (i === index ? { ...item, ...patch } : item)) });
  return (
    <>
      <label className="block text-sm font-medium text-stone-800" htmlFor={`${id}-year`}>
        {dict.foundedLabel}
        <input
          id={`${id}-year`}
          type="number"
          inputMode="numeric"
          min={minFoundedYear}
          max={thisYear}
          step={1}
          value={year}
          placeholder={dict.foundedPlaceholder}
          onChange={event => {
            setYear(event.target.value);
            const value = Number(event.target.value);
            // Only a whole year inside the accepted range is stored; anything else waits.
            update({
              foundedYear:
                Number.isInteger(value) && value >= minFoundedYear && value <= 2100
                  ? value
                  : undefined,
            });
          }}
          className={`${input} max-w-40 font-normal`}
        />
      </label>
      <Chips
        name="team-size"
        legend={dict.teamLegend}
        multi={false}
        tone="lavender"
        options={localizedTeamSizeOptions(locale)}
        selected={data.teamSize ? [data.teamSize] : []}
        onToggle={value => update({ teamSize: data.teamSize === value ? undefined : value })}
      />
      <Chips
        name="customer-count"
        legend={dict.customersLegend}
        multi={false}
        tone="amber"
        options={localizedCustomerCountOptions(locale)}
        selected={data.customerCount ? [data.customerCount] : []}
        onToggle={value =>
          update({ customerCount: data.customerCount === value ? undefined : value })
        }
      />
      <p className="-mt-3 text-xs leading-relaxed text-stone-500">{dict.bandsNote}</p>
      <fieldset className="border-t border-stone-200 pt-6">
        <legend className="text-sm font-medium text-stone-800">{dict.casesTitle}</legend>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{dict.casesNote}</p>
        <div className="mt-4 space-y-5">
          {cases.map((item, index) => (
            <div
              key={index}
              role="group"
              aria-label={dict.caseLabel.replace('{index}', String(index + 1))}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-800">
                  {dict.caseLabel.replace('{index}', String(index + 1))}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const next = cases.filter((_, i) => i !== index);
                    update({ cases: next.length ? next : undefined });
                  }}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-[#A94E35] hover:bg-[#F6E3DC]"
                >
                  {dict.removeCase}
                </button>
              </div>
              <label className="mt-3 block text-xs font-medium text-stone-600">
                {dict.caseClient}
                <input
                  value={item.client}
                  maxLength={caseLimits.client}
                  placeholder={dict.caseClientPlaceholder}
                  onChange={event => setCase(index, { client: event.target.value })}
                  className={`${input} font-normal`}
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-stone-600">
                {dict.caseProblem}
                <textarea
                  value={item.problem}
                  maxLength={caseLimits.problem}
                  rows={2}
                  onChange={event => setCase(index, { problem: event.target.value })}
                  className={`${input} font-normal`}
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-stone-600">
                {dict.caseResult}
                <textarea
                  value={item.result}
                  maxLength={caseLimits.result}
                  rows={2}
                  placeholder={dict.caseResultPlaceholder}
                  onChange={event => setCase(index, { result: event.target.value })}
                  className={`${input} font-normal`}
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-stone-600">
                {dict.caseUrl}
                <input
                  type="url"
                  value={item.url ?? ''}
                  maxLength={caseLimits.url}
                  placeholder="https://"
                  onChange={event => setCase(index, { url: event.target.value || undefined })}
                  className={`${input} font-normal`}
                />
              </label>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {cases.length < maxSolutionCases && (
            <button
              type="button"
              onClick={() => update({ cases: [...cases, { ...emptyCase }] })}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:border-stone-400"
            >
              <PlusIcon aria-hidden="true" className="size-3.5" />
              {dict.addCase}
            </button>
          )}
          <span className="text-xs tabular-nums text-stone-400">
            {dict.casesCount
              .replace('{count}', String(cases.length))
              .replace('{limit}', String(maxSolutionCases))}
          </span>
        </div>
      </fieldset>
    </>
  );
}
