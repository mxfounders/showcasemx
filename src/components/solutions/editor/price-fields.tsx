'use client';
import { useId, useState } from 'react';
import { Chips, Suggestions } from './chips';
import { solutionInput as input } from '../profile-editor';
import type { CurrencyOptions } from '@/lib/currencies';
import {
  maxPriceFrom,
  monthlyPriceBands,
  projectPriceBands,
  solutionPriceUnits,
  type SolutionData,
} from '@/lib/solutions/model';
import {
  derivePriceBand,
  formatPriceFrom,
  priceBandFamilies,
  priceBandFamily,
  type PriceBandFamily,
} from '@/lib/solutions/pricing';
import { localizedPriceBandOptions, localizedPricingModelOptions } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';

type PriceDict = Dictionary['solutionEditor']['editor']['price'];
const isUnit = (value: string) => (solutionPriceUnits as readonly string[]).includes(value);

/**
 * The «Precio» section of the editor (SHCWS-51): pricing models, the «Desde» amount in the
 * founder's own currency, and a band in US dollars whose set follows the declared models
 * (monthly for subscriptions, per project for agencies and services). Nothing is filled on
 * its own except what the founder's own choices imply: one priced model names the unit,
 * and a unit chosen for the price is a model they offer.
 */
export function PriceFields({
  data,
  locale,
  currencies,
  modelLegend,
  dict,
  update,
}: {
  data: SolutionData;
  locale: string;
  /** From the server (currencyOptions), so the list matches what the API accepts. */
  currencies: CurrencyOptions;
  modelLegend: string;
  dict: PriceDict;
  update: (patch: Partial<SolutionData>) => void;
}) {
  const id = useId();
  const [amount, setAmount] = useState(data.priceFrom === undefined ? '' : String(data.priceFrom));
  const [invalid, setInvalid] = useState(false);
  const models = localizedPricingModelOptions(locale);
  const units = models.filter(option => isUnit(option.value));
  const bandOptions = localizedPriceBandOptions(locale);
  const preview = formatPriceFrom(data, locale);
  const suggested = derivePriceBand(data);

  function changeAmount(raw: string) {
    setAmount(raw);
    if (!raw.trim()) {
      setInvalid(false);
      update({ priceFrom: undefined });
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > maxPriceFrom) {
      setInvalid(true);
      update({ priceFrom: undefined });
      return;
    }
    setInvalid(false);
    const patch: Partial<SolutionData> = { priceFrom: value };
    // One priced model declared: that is what the amount pays for.
    const priced = (data.pricingModel ?? []).filter(isUnit);
    if (!data.priceUnit && priced.length === 1) patch.priceUnit = priced[0];
    update(patch);
  }

  function toggleModel(value: string) {
    const current = data.pricingModel ?? [];
    const removing = current.includes(value);
    update({
      pricingModel: removing ? current.filter(item => item !== value) : [...current, value],
      // The price can't pay for a model the project no longer offers.
      ...(removing && data.priceUnit === value ? { priceUnit: undefined } : {}),
    });
  }

  // Band groups for the declared models; «Depende del alcance» closes the last one, and a
  // band chosen earlier stays visible (to be cleared) even if its family no longer fits.
  const families = priceBandFamilies(data.pricingModel);
  const chosenFamily = priceBandFamily(data.priceBand);
  if (chosenFamily && !families.includes(chosenFamily)) families.push(chosenFamily);
  const familyBands: Record<PriceBandFamily, readonly string[]> = {
    monthly: monthlyPriceBands,
    project: projectPriceBands,
  };
  const groups = families.map((family, index) => ({
    family,
    options: bandOptions.filter(
      option =>
        familyBands[family].includes(option.value) ||
        (index === families.length - 1 && option.value === 'depende-alcance'),
    ),
  }));

  return (
    <>
      <Chips
        name="pricing-model"
        legend={modelLegend}
        options={models}
        selected={data.pricingModel ?? []}
        onToggle={toggleModel}
      />
      <fieldset>
        <legend className="text-sm font-medium text-stone-800">{dict.fromLegend}</legend>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">{dict.fromHint}</p>
        <div className="mt-1 grid gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          <label className="block text-xs font-medium text-stone-600" htmlFor={`${id}-amount`}>
            {dict.amountLabel}
            <input
              id={`${id}-amount`}
              type="number"
              inputMode="decimal"
              min={0}
              max={maxPriceFrom}
              step="any"
              value={amount}
              placeholder="0"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${id}-amount-error` : undefined}
              className={`${input} font-normal`}
              onChange={event => changeAmount(event.target.value)}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600" htmlFor={`${id}-currency`}>
            {dict.currencyLabel}
            <select
              id={`${id}-currency`}
              value={data.priceCurrency ?? ''}
              className={`${input} font-normal`}
              onChange={event => update({ priceCurrency: event.target.value || undefined })}
            >
              <option value="">{dict.currencyPlaceholder}</option>
              <optgroup label={dict.currencyFrequent}>
                {currencies.frequent.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label={dict.currencyAll}>
                {currencies.all.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="block text-xs font-medium text-stone-600" htmlFor={`${id}-unit`}>
            {dict.unitLabel}
            <select
              id={`${id}-unit`}
              value={data.priceUnit ?? ''}
              className={`${input} font-normal`}
              onChange={event => {
                const unit = event.target.value || undefined;
                const current = data.pricingModel ?? [];
                update({
                  priceUnit: unit,
                  ...(unit && !current.includes(unit) ? { pricingModel: [...current, unit] } : {}),
                });
              }}
            >
              <option value="">{dict.unitPlaceholder}</option>
              {units.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {invalid && (
          <p id={`${id}-amount-error`} className="mt-2 text-xs text-[#A94E35]">
            {dict.amountInvalid}
          </p>
        )}
        <p className="mt-3 text-xs text-stone-500" aria-live="polite">
          {preview ? (
            <>
              {dict.previewLabel} <span className="font-medium text-stone-800">{preview}</span>
            </>
          ) : (
            dict.previewEmpty
          )}
        </p>
        <p className="mt-1 text-xs text-stone-400">{dict.noConversion}</p>
      </fieldset>
      {suggested && suggested !== data.priceBand && (
        <Suggestions
          title={dict.bandSuggestion}
          items={bandOptions.filter(option => option.value === suggested)}
          onAdd={value => update({ priceBand: value })}
        />
      )}
      {groups.map(group => (
        <Chips
          key={group.family}
          name={`price-band-${group.family}`}
          legend={group.family === 'monthly' ? dict.monthlyBands : dict.projectBands}
          multi={false}
          tone="sage"
          options={group.options}
          selected={data.priceBand ? [data.priceBand] : []}
          onToggle={value => update({ priceBand: data.priceBand === value ? undefined : value })}
        />
      ))}
    </>
  );
}
