'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import { addDays, adPlacements, type AdCurrency, type AdPlacement } from '@/lib/ads/model';
import { formatDay, formatMoney } from '@/lib/ads/format';
import type { AdOffer } from '@/lib/ads/server';
import type { Dictionary } from '@/i18n/dictionary';

const field =
  'mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';

type Availability = { full: string[] } | 'loading' | null;

export function PromoteForm({
  solutionId,
  offers,
  categories,
  today,
  maxLeadDays,
  maxDays,
  locale,
  dict,
}: {
  solutionId: string;
  offers: AdOffer[];
  /** Categories the listing declares: slug for the request, label for display. */
  categories: { slug: string; label: string }[];
  today: string;
  maxLeadDays: number;
  maxDays: number;
  locale: string;
  dict: Dictionary['ads'];
}) {
  const purchasable = offers.filter(
    offer => offer.placement !== 'category' || categories.length > 0,
  );
  const [placement, setPlacement] = useState<AdPlacement>(purchasable[0]?.placement ?? 'category');
  const [scope, setScope] = useState(categories[0]?.slug ?? '');
  const offer = purchasable.find(item => item.placement === placement);
  const currencies = (Object.keys(offer?.rates ?? {}) as AdCurrency[]).sort();
  const [currency, setCurrency] = useState<AdCurrency>(currencies[0] ?? 'usd');
  const [startsOn, setStartsOn] = useState(addDays(today, 1));
  const [days, setDays] = useState(7);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [business, setBusiness] = useState(false);
  const [availability, setAvailability] = useState<Availability>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);

  const requestScope = placement === 'category' ? scope : '';
  const activeCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? 'usd');
  const rate = offer?.rates[activeCurrency] ?? 0;
  const validDays = Number.isInteger(days) && days >= 1 && days <= maxDays;

  useEffect(() => {
    const controller = new AbortController();
    setAvailability('loading');
    fetch(
      `/api/ads/availability?placement=${placement}&scope=${encodeURIComponent(requestScope)}`,
      { signal: controller.signal },
    )
      .then(response => (response.ok ? response.json() : null))
      .then((result: { full: string[] } | null) => setAvailability(result))
      .catch(() => {
        if (!controller.signal.aborted) setAvailability(null);
      });
    return () => controller.abort();
  }, [placement, requestScope]);

  const soldOutDays = useMemo(() => {
    if (!availability || availability === 'loading' || !validDays) return [];
    const end = addDays(startsOn, days);
    return availability.full.filter(day => day >= startsOn && day < end);
  }, [availability, startsOn, days, validDays]);

  const money = (minor: number) => formatMoney(minor, activeCurrency, dict.numberLocale);
  const dayWord = days === 1 ? dict.form.daySingular : dict.form.dayPlural;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    if (!acceptTerms) return setError(dict.errors.terms);
    if (!business) return setError(dict.errors.business);
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/ads/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionId,
          placement,
          scope: requestScope,
          startsOn,
          days,
          currency: activeCurrency,
          acceptTerms,
          business,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result: { url?: string; error?: string } = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || dict.errors.network);
      window.location.assign(result.url);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : dict.errors.network);
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label={dict.form.ariaLabel} className="max-w-2xl" noValidate>
      <fieldset>
        <legend className="text-sm font-medium text-stone-600">{dict.form.placement}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {adPlacements.map(id => {
            const available = purchasable.some(item => item.placement === id);
            const checked = placement === id;
            return (
              <label
                key={id}
                className={`flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 text-sm transition-colors ${
                  checked ? 'border-[#365DC4] bg-[#E4EBFC]/40' : 'border-stone-200 bg-white'
                } ${available ? '' : 'cursor-not-allowed opacity-50'}`}
              >
                <span className="flex items-center gap-2 font-medium text-stone-900">
                  <input
                    type="radio"
                    name="placement"
                    value={id}
                    checked={checked}
                    disabled={!available}
                    onChange={() => setPlacement(id)}
                  />
                  {dict.placements[id].label}
                </span>
                <span className="text-xs leading-relaxed text-stone-500">
                  {dict.placements[id].detail}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {placement === 'category' && (
          <label className="text-sm font-medium text-stone-600">
            {dict.form.category}
            <select value={scope} onChange={e => setScope(e.target.value)} className={field}>
              {categories.map(category => (
                <option key={category.slug} value={category.slug}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm font-medium text-stone-600">
          {dict.form.currency}
          <select
            value={activeCurrency}
            onChange={e => setCurrency(e.target.value as AdCurrency)}
            className={field}
          >
            {currencies.map(code => (
              <option key={code} value={code}>
                {dict.form.currencies[code]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-stone-600">
          {dict.form.startsOn}
          <input
            type="date"
            value={startsOn}
            min={today}
            max={addDays(today, maxLeadDays)}
            onChange={e => setStartsOn(e.target.value)}
            className={field}
            required
          />
        </label>
        <label className="text-sm font-medium text-stone-600">
          {dict.form.days}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={maxDays}
            value={Number.isNaN(days) ? '' : days}
            onChange={e => setDays(e.target.valueAsNumber)}
            className={field}
            required
          />
        </label>
      </div>
      <p className="mt-3 text-xs text-stone-500">{dict.form.timezoneNote}</p>

      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 text-sm">
        <p className="text-stone-500">{dict.form.rate.replace('{rate}', money(rate))}</p>
        {validDays && (
          <p className="mt-2 flex items-baseline justify-between gap-4 text-stone-900">
            <span>
              {dict.form.summary
                .replace('{days}', `${days} ${dayWord}`)
                .replace('{rate}', money(rate))}
            </span>
            <span className="text-lg font-semibold">
              {dict.form.subtotal}: {money(rate * days)}
            </span>
          </p>
        )}
        <p className="mt-2 text-xs text-stone-500">{dict.form.taxNote}</p>
        <p className="mt-3 text-xs" aria-live="polite">
          {availability === 'loading' ? (
            <span className="text-stone-500">{dict.form.checking}</span>
          ) : soldOutDays.length > 0 ? (
            <span className="text-[#A94E35]">
              {dict.form.soldOut.replace(
                '{days}',
                soldOutDays.map(day => formatDay(day, dict.dateLocale)).join(', '),
              )}
            </span>
          ) : availability ? (
            <span className="text-stone-600">{dict.form.available}</span>
          ) : null}
        </p>
      </div>

      <div className="mt-6 space-y-3 text-sm text-stone-700">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={e => setAcceptTerms(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            {dict.form.terms}.{' '}
            <Link href={`/${locale}/terminos#publicidad`} className="text-[#365DC4] underline">
              {dict.form.termsLink}
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={business}
            onChange={e => setBusiness(e.target.checked)}
            className="mt-0.5"
          />
          <span>{dict.form.business}</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending || !offer || !validDays || soldOutDays.length > 0}
        style={actionButtonStyle}
        className="action-button mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"
      >
        {pending ? dict.form.submitting : dict.form.submit}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      {error && (
        <p role="alert" className="mt-4 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
