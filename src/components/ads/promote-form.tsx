'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { ArrowRightIcon, BellIcon, CheckIcon, PriceTagIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import {
  addDays,
  adPlacements,
  daysBetween,
  discountAmount,
  estimatedTaxRate,
  lastBookableDay,
  preferredCurrency,
  presetDays,
  type AdCurrency,
  type AdPlacement,
  type PromoDiscount,
} from '@/lib/ads/model';
import { formatDay, formatMoney } from '@/lib/ads/format';
import type { PlacementReach, PlacementStatus } from '@/lib/ads/server';
import { BillingProfileForm } from '@/components/billing/billing-profile-form';
import type { Dictionary } from '@/i18n/dictionary';
import { AvailabilityCalendar } from './availability-calendar';
import { CheckoutPayment, type CheckoutPaymentProps } from './checkout-payment';
import {
  SponsoredCardBody,
  SponsoredSlotHeader,
  sponsoredCardClass,
  type SponsoredCardContent,
} from './sponsored-slots';

type Availability = { full: string[] } | 'loading' | 'error';

type Billing = {
  /** Country of the saved billing profile; null when there is none yet. */
  country: string | null;
  complete: boolean;
  version: number;
  countries: { code: string; name: string }[];
  dict: Dictionary['billing'];
};

/**
 * Buying a sponsored slot on one screen (SHCWS-150): decisions on the left, the card as it
 * will run and a live total on the right. Price and reach show before any data is asked
 * for (SHCWS-72); billing details, when missing, are the last step before Stripe, on this
 * same page. Dates come from an availability calendar (SHCWS-77) and a promotion code is
 * checked here and applied by the server (SHCWS-75). The server validates everything again.
 */
export function PromoteForm({
  solutionId,
  placements,
  categories,
  reach,
  product,
  today,
  maxLeadDays,
  maxDays,
  locale,
  stripeReady,
  publishableKey,
  waitlisted,
  billing,
  dict,
}: {
  solutionId: string;
  placements: PlacementStatus[];
  /** Categories the listing declares: slug for the request, label for display. */
  categories: { slug: string; label: string }[];
  /** Page views per `placement:scope` (src/lib/ads/server.ts, placementReach). */
  reach: Record<string, PlacementReach>;
  product: SponsoredCardContent;
  today: string;
  maxLeadDays: number;
  maxDays: number;
  locale: string;
  stripeReady: boolean;
  /** Stripe.js key for the payment form on this page; null keeps buying closed. */
  publishableKey: string | null;
  waitlisted: AdPlacement[];
  billing: Billing;
  dict: Dictionary['ads'];
}) {
  const t = dict.form;
  const status = (id: AdPlacement) => placements.find(item => item.placement === id);
  const hasRates = (id: AdPlacement) => Object.keys(status(id)?.rates ?? {}).length > 0;
  const purchasable = (id: AdPlacement) =>
    stripeReady &&
    Boolean(publishableKey) &&
    Boolean(status(id)?.enabled) &&
    hasRates(id) &&
    (id !== 'category' || categories.length > 0);
  const open = adPlacements.filter(purchasable);

  const [placement, setPlacement] = useState<AdPlacement>(open[0] ?? 'category');
  const [scope, setScope] = useState(categories[0]?.slug ?? '');
  const [currency, setCurrency] = useState<AdCurrency>(preferredCurrency(billing.country, locale));
  const tomorrow = addDays(today, 1);
  const [start, setStart] = useState(tomorrow);
  const [end, setEnd] = useState(addDays(tomorrow, presetDays[0] - 1));
  const [touched, setTouched] = useState(false);
  const [availability, setAvailability] = useState<Availability>('loading');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoDiscount | null>(null);
  const [promoState, setPromoState] = useState<{ pending: boolean; error: string }>({
    pending: false,
    error: '',
  });
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<'choose' | 'billing' | 'pay'>('choose');
  // The open Checkout Session, paid on this page (no redirect to Stripe).
  const [payment, setPayment] = useState<{
    clientSecret: string;
    sessionId: string;
    bookingId: string;
    version: number;
    billing: CheckoutPaymentProps['billing'];
  } | null>(null);
  const paymentHeading = useRef<HTMLHeadingElement>(null);
  const [billingCountry, setBillingCountry] = useState(billing.country);
  const [waiting, setWaiting] = useState<AdPlacement[]>(waitlisted);
  const [waitError, setWaitError] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const billingHeading = useRef<HTMLHeadingElement>(null);

  const offer = status(placement);
  const currencies = (Object.keys(offer?.rates ?? {}) as AdCurrency[]).sort();
  const activeCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? currency);
  const rate = offer?.rates[activeCurrency] ?? 0;
  const requestScope = placement === 'category' ? scope : '';
  const days = daysBetween(start, end) + 1;
  const full = availability !== 'loading' && availability !== 'error' ? availability.full : null;
  const money = (minor: number, code: AdCurrency = activeCurrency) =>
    formatMoney(minor, code, dict.numberLocale);
  const number = new Intl.NumberFormat(dict.numberLocale);
  const day = (date: string) => formatDay(date, dict.dateLocale);

  const subtotal = rate * days;
  const discount = discountAmount(subtotal, promo);
  const taxRate = estimatedTaxRate(billingCountry);
  const tax = taxRate === null ? null : Math.round((subtotal - discount) * taxRate);
  const soldOutDays = useMemo(
    () => (full ?? []).filter(date => date >= start && date <= end),
    [full, start, end],
  );
  const lastStart = addDays(today, maxLeadDays);

  const placementOpen = purchasable(placement);
  useEffect(() => {
    if (!placementOpen) return;
    const controller = new AbortController();
    setAvailability('loading');
    fetch(
      `/api/ads/availability?placement=${placement}&scope=${encodeURIComponent(requestScope)}`,
      { signal: controller.signal },
    )
      .then(response => (response.ok ? response.json() : Promise.reject(new Error('status'))))
      .then((result: { full: string[] }) => setAvailability({ full: result.full }))
      .catch(() => {
        if (!controller.signal.aborted) setAvailability('error');
      });
    return () => controller.abort();
  }, [placement, requestScope, placementOpen]);

  // Until the buyer picks dates, keep the default window on days that still have room.
  useEffect(() => {
    if (touched || !full) return;
    const length = daysBetween(start, end) + 1;
    if (!full.some(date => date >= start && date <= end)) return;
    for (let first = tomorrow; first <= lastStart; first = addDays(first, 1)) {
      const last = lastBookableDay(first, full, maxDays);
      if (last && daysBetween(first, last) + 1 >= length) {
        setStart(first);
        setEnd(addDays(first, length - 1));
        return;
      }
    }
  }, [full, touched, start, end, tomorrow, lastStart, maxDays]);

  function pickRange(first: string, last: string) {
    setTouched(true);
    setStart(first);
    setEnd(last);
    setError('');
  }

  function preset(length: number) {
    const last = lastBookableDay(start, full ?? [], maxDays) ?? start;
    const wanted = addDays(start, length - 1);
    pickRange(start, wanted < last ? wanted : last);
  }

  function chooseCurrency(code: AdCurrency) {
    setCurrency(code);
    // An amount-off code is set per currency: apply it again in the new one.
    if (promo && code !== activeCurrency) {
      setPromo(null);
      setPromoInput(promo.code);
      setPromoOpen(true);
    }
  }

  async function applyPromo() {
    if (promoState.pending) return;
    setPromoState({ pending: true, error: '' });
    try {
      const response = await fetch('/api/ads/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput, placement, currency: activeCurrency, days }),
        signal: AbortSignal.timeout(15_000),
      });
      const result: Partial<PromoDiscount> & { error?: string } = await response.json();
      if (!response.ok || !result.code) {
        setPromoState({ pending: false, error: result.error || dict.errors.network });
        return;
      }
      setPromo({
        code: result.code,
        percentOff: result.percentOff ?? null,
        amountOff: result.amountOff ?? null,
      });
      setPromoState({ pending: false, error: '' });
    } catch {
      setPromoState({ pending: false, error: dict.errors.network });
    }
  }

  async function toggleWaitlist(id: AdPlacement) {
    const join = !waiting.includes(id);
    setWaitError('');
    try {
      const response = await fetch('/api/ads/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placement: id, join, solutionId }),
        signal: AbortSignal.timeout(15_000),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || dict.errors.network);
      setWaiting(current => (join ? [...current, id] : current.filter(item => item !== id)));
    } catch (failure) {
      setWaitError(
        failure instanceof Error && failure.message ? failure.message : dict.errors.network,
      );
    }
  }

  async function checkout() {
    if (busy.current) return;
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
          startsOn: start,
          days,
          currency: activeCurrency,
          promotionCode: promo?.code ?? '',
          // One statement covers both: buying as a business, under the advertising terms.
          acceptTerms: consent,
          business: consent,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const result: {
        clientSecret?: string;
        sessionId?: string;
        bookingId?: string;
        version?: number;
        billing?: CheckoutPaymentProps['billing'];
        error?: string;
      } = await response.json();
      if (
        !response.ok ||
        !result.clientSecret ||
        !result.sessionId ||
        !result.bookingId ||
        typeof result.version !== 'number' ||
        !result.billing
      )
        throw new Error(result.error || dict.errors.network);
      setPayment({
        clientSecret: result.clientSecret,
        sessionId: result.sessionId,
        bookingId: result.bookingId,
        version: result.version,
        billing: result.billing,
      });
      setStep('pay');
      busy.current = false;
      setPending(false);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : dict.errors.network);
      busy.current = false;
      setPending(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return setError(dict.errors.terms);
    if (soldOutDays.length > 0) return setError(t.soldOutRange);
    if (!billing.complete && step === 'choose') {
      setStep('billing');
      setError('');
      return;
    }
    void checkout();
  }

  useEffect(() => {
    if (step === 'billing') billingHeading.current?.focus();
    if (step === 'pay') paymentHeading.current?.focus();
  }, [step]);

  /** Back from the payment step: the held dates are released and the session closed. */
  async function leavePayment() {
    if (!payment) return true;
    try {
      const response = await fetch('/api/ads/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: payment.bookingId, version: payment.version }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return false;
    } catch {
      return false;
    }
    setPayment(null);
    setStep('choose');
    return true;
  }

  const reachText = (id: AdPlacement) => {
    if (id === 'newsletter') return null;
    const found = reach[`${id}:${id === 'category' ? scope : ''}`];
    if (!found || found.views === 0) return t.reachNone;
    return (found.since ? t.reachSince.replace('{date}', day(found.since)) : t.reach).replace(
      '{views}',
      number.format(found.views),
    );
  };
  const priceText = (id: AdPlacement) => {
    const rates = status(id)?.rates ?? {};
    const code = (rates[activeCurrency] ? activeCurrency : Object.keys(rates)[0]) as
      AdCurrency | undefined;
    return code && rates[code] ? t.perDay.replace('{rate}', money(rates[code], code)) : null;
  };
  const scopeLabel = categories.find(category => category.slug === scope)?.label ?? '';
  const ready = open.length > 0;

  return (
    <div>
      <form onSubmit={submit} aria-label={t.ariaLabel} noValidate>
        {/* While paying, the selection is fixed: it is what the open session charges. */}
        <fieldset disabled={step === 'pay'} className="m-0 min-w-0 border-0 p-0">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-9">
              <fieldset>
                <legend className="text-sm font-medium text-stone-600">{t.placement}</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {adPlacements.map(id => {
                    const available = purchasable(id);
                    const checked = available && placement === id;
                    const card = `flex h-full flex-col gap-1.5 rounded-2xl border p-4 text-sm transition-colors ${
                      checked ? 'border-[#365DC4] bg-[#E4EBFC]/40' : 'border-stone-200 bg-white'
                    }`;
                    const body = (
                      <>
                        <span className="text-xs leading-relaxed text-stone-500">
                          {dict.placements[id].detail}
                        </span>
                        {priceText(id) && (
                          <span className="mt-1 font-medium text-stone-900">{priceText(id)}</span>
                        )}
                        {reachText(id) && (
                          <span className="text-xs text-stone-500">{reachText(id)}</span>
                        )}
                      </>
                    );
                    if (available) {
                      return (
                        <label key={id} className={`${card} cursor-pointer`}>
                          <span className="flex items-center gap-2 font-medium text-stone-900">
                            <input
                              type="radio"
                              name="placement"
                              value={id}
                              checked={checked}
                              onChange={() => {
                                setPlacement(id);
                                setError('');
                              }}
                            />
                            {dict.placements[id].label}
                          </span>
                          {body}
                        </label>
                      );
                    }
                    const closed = !status(id)?.enabled;
                    const joined = waiting.includes(id);
                    return (
                      <div key={id} className={card}>
                        <span className="flex flex-wrap items-center justify-between gap-2 font-medium text-stone-900">
                          {dict.placements[id].label}
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-normal text-stone-600">
                            {closed ? t.closed : t.unavailable}
                          </span>
                        </span>
                        {body}
                        {closed && (
                          <button
                            type="button"
                            onClick={() => toggleWaitlist(id)}
                            aria-pressed={joined}
                            className="mt-2 inline-flex min-h-10 items-center gap-2 self-start rounded-full px-3 text-xs font-medium text-[#365DC4] transition-colors hover:bg-[#E4EBFC]"
                          >
                            {joined ? (
                              <CheckIcon aria-hidden="true" className="size-4" />
                            ) : (
                              <BellIcon aria-hidden="true" className="size-4" />
                            )}
                            {joined ? t.waitlistLeave : t.waitlistJoin}
                          </button>
                        )}
                        {closed && joined && (
                          <span className="text-xs text-stone-500">{t.waitlistJoined}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {waitError && (
                  <p role="alert" className="mt-3 text-sm text-[#A94E35]">
                    {waitError}
                  </p>
                )}
                {!ready && <p className="mt-4 text-sm text-stone-600">{dict.page.closed}</p>}
              </fieldset>

              {ready && placement === 'category' && categories.length > 1 && (
                <fieldset>
                  <legend className="text-sm font-medium text-stone-600">{t.category}</legend>
                  <div className="selector-tabs mt-2">
                    {categories.map(category => (
                      <button
                        key={category.slug}
                        type="button"
                        aria-pressed={scope === category.slug}
                        onClick={() => setScope(category.slug)}
                        className="selector-tab"
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {ready && (
                <fieldset>
                  <legend className="text-sm font-medium text-stone-600">{t.dates}</legend>
                  <div className="selector-tabs mt-2" role="group" aria-label={t.presetsLabel}>
                    {presetDays.map(length => (
                      <button
                        key={length}
                        type="button"
                        aria-pressed={days === length}
                        onClick={() => preset(length)}
                        className="selector-tab"
                      >
                        {t.preset.replace('{days}', String(length))}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 max-w-md">
                    <AvailabilityCalendar
                      today={today}
                      lastStart={lastStart}
                      horizon={addDays(lastStart, maxDays - 1)}
                      full={availability === 'error' ? [] : full}
                      start={start}
                      end={end}
                      maxDays={maxDays}
                      onChange={pickRange}
                      dict={t.calendar}
                      locale={dict.dateLocale}
                      weekStartsOn={locale === 'en' ? 0 : 1}
                    />
                  </div>
                  {availability === 'error' && (
                    <p className="mt-3 text-xs text-[#A94E35]">{t.calendar.error}</p>
                  )}
                  <p className="mt-3 text-xs text-stone-500">{t.timezoneNote}</p>
                </fieldset>
              )}

              {ready && currencies.length > 1 && (
                <fieldset>
                  <legend className="text-sm font-medium text-stone-600">{t.currency}</legend>
                  <div className="selector-tabs mt-2">
                    {currencies.map(code => (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={activeCurrency === code}
                        onClick={() => chooseCurrency(code)}
                        className="selector-tab"
                      >
                        {t.currencies[code]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {ready && (
                <div>
                  {promo ? (
                    <p className="inline-flex flex-wrap items-center gap-3 text-sm text-stone-700">
                      <PriceTagIcon aria-hidden="true" className="size-4 text-[#416B50]" />
                      {t.promo.applied.replace('{code}', promo.code)}
                      <button
                        type="button"
                        onClick={() => {
                          setPromo(null);
                          setPromoInput('');
                        }}
                        className="min-h-10 rounded-full px-3 text-xs font-medium text-[#365DC4] hover:bg-[#E4EBFC]"
                      >
                        {t.promo.remove}
                      </button>
                    </p>
                  ) : !promoOpen ? (
                    <button
                      type="button"
                      onClick={() => setPromoOpen(true)}
                      className="min-h-10 text-sm font-medium text-[#365DC4] underline-offset-4 hover:underline"
                    >
                      {t.promo.toggle}
                    </button>
                  ) : (
                    <div className="max-w-md">
                      <label htmlFor="promo-code" className="text-sm font-medium text-stone-600">
                        {t.promo.label}
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input
                          id="promo-code"
                          value={promoInput}
                          onChange={e => setPromoInput(e.target.value.toUpperCase())}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              void applyPromo();
                            }
                          }}
                          maxLength={60}
                          autoCapitalize="characters"
                          spellCheck={false}
                          aria-invalid={promoState.error ? true : undefined}
                          aria-describedby={promoState.error ? 'promo-error' : undefined}
                          className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-4 py-3 font-mono text-base uppercase text-stone-800 outline-none transition-colors focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]"
                        />
                        <button
                          type="button"
                          onClick={applyPromo}
                          disabled={promoState.pending || promoInput.trim() === ''}
                          className="rounded-full border border-stone-300 px-4 text-sm font-medium text-stone-700 transition-colors hover:bg-white disabled:opacity-50"
                        >
                          {promoState.pending ? t.promo.applying : t.promo.apply}
                        </button>
                      </div>
                      {promoState.error && (
                        <p id="promo-error" role="alert" className="mt-2 text-sm text-[#A94E35]">
                          {promoState.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
              <section aria-labelledby="ad-preview-title">
                <h2 id="ad-preview-title" className="text-sm font-medium text-stone-600">
                  {t.previewHeading}
                </h2>
                <div className="mt-3 rounded-[24px] border border-stone-200 bg-[#f5f5f4] p-4">
                  <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-stone-400">
                    {placement === 'category'
                      ? t.previewCategory.replace('{category}', scopeLabel)
                      : placement === 'home'
                        ? t.previewHome
                        : dict.placements.newsletter.label}
                  </p>
                  <SponsoredSlotHeader dict={dict.slot} />
                  <div className={sponsoredCardClass}>
                    <SponsoredCardBody product={product} cta={dict.slot.cta} />
                  </div>
                  <p className="mt-5 text-[11px] text-stone-400">{t.previewOrganic}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2" aria-hidden="true">
                    <span className="h-14 rounded-2xl bg-white/70" />
                    <span className="h-14 rounded-2xl bg-white/70" />
                  </div>
                </div>
              </section>

              {ready && (
                <section
                  aria-labelledby="ad-summary-title"
                  className="rounded-2xl border border-stone-200 bg-white p-5 text-sm"
                >
                  <h2 id="ad-summary-title" className="font-medium text-stone-900">
                    {t.summaryHeading}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500">
                    {t.range.replace('{from}', day(start)).replace('{to}', day(end))}
                  </p>
                  <dl className="mt-4 space-y-2" aria-live="polite">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-stone-600">
                        {t.summary
                          .replace('{days}', `${days} ${days === 1 ? t.daySingular : t.dayPlural}`)
                          .replace('{rate}', money(rate))}
                      </dt>
                      <dd className="tabular-nums text-stone-900">{money(subtotal)}</dd>
                    </div>
                    {discount > 0 && promo && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-[#416B50]">
                          {t.discount.replace('{code}', promo.code)}
                        </dt>
                        <dd className="tabular-nums text-[#416B50]">−{money(discount)}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-stone-600">
                        {taxRate === null
                          ? t.taxUnknown
                          : taxRate > 0
                            ? t.taxEstimate.replace('{rate}', `${Math.round(taxRate * 100)} %`)
                            : t.taxNone}
                      </dt>
                      {tax !== null && (
                        <dd className="tabular-nums text-stone-900">{money(tax)}</dd>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-4 border-t border-stone-200 pt-3">
                      <dt className="font-medium text-stone-900">
                        {tax === null ? t.subtotalAfterDiscount : t.total}
                      </dt>
                      <dd className="text-lg font-semibold tabular-nums text-stone-900">
                        {money(subtotal - discount + (tax ?? 0))}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-stone-500">{t.refundRule}</p>
                  {soldOutDays.length > 0 && (
                    <p className="mt-3 text-xs text-[#A94E35]" role="status">
                      {t.soldOut.replace('{days}', soldOutDays.map(day).join(', '))}
                    </p>
                  )}

                  <label className="mt-5 flex items-start gap-3 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={e => {
                        setConsent(e.target.checked);
                        setError('');
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      {t.consent}.{' '}
                      <Link
                        href={`/${locale}/terminos#publicidad`}
                        className="text-[#365DC4] underline"
                      >
                        {t.termsLink}
                      </Link>
                    </span>
                  </label>

                  {step === 'choose' && (
                    <button
                      type="submit"
                      disabled={pending || !offer || soldOutDays.length > 0}
                      style={actionButtonStyle}
                      className="action-button mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"
                    >
                      {pending ? t.submitting : billing.complete ? t.submit : t.continueBilling}
                      <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
                    </button>
                  )}
                  {step === 'billing' && (
                    <p className="mt-4 text-xs text-stone-500">{t.billingBelow}</p>
                  )}
                  {step === 'pay' && (
                    <p className="mt-4 text-xs text-stone-500">{dict.payment.below}</p>
                  )}
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-[#A94E35]">
                      {error}
                    </p>
                  )}
                </section>
              )}
            </div>
          </div>
        </fieldset>
      </form>

      {step === 'pay' && payment && publishableKey && (
        <section
          aria-labelledby="ad-payment-title"
          className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h2
            id="ad-payment-title"
            ref={paymentHeading}
            tabIndex={-1}
            className="text-lg font-medium text-stone-900 outline-none"
          >
            {dict.payment.heading}
          </h2>
          <p className="mb-6 mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            {dict.payment.intro}
          </p>
          <CheckoutPayment
            publishableKey={publishableKey}
            clientSecret={payment.clientSecret}
            returnUrl={`${window.location.origin}/${locale}/account/solutions/${solutionId}/promote?checkout=success&session_id=${encodeURIComponent(payment.sessionId)}`}
            billing={payment.billing}
            locale={locale}
            dict={dict.payment}
            onBack={leavePayment}
          />
        </section>
      )}

      {step === 'billing' && (
        <section
          aria-labelledby="ad-billing-title"
          className="mt-10 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h2
            id="ad-billing-title"
            ref={billingHeading}
            tabIndex={-1}
            className="text-lg font-medium text-stone-900 outline-none"
          >
            {t.billingHeading}
          </h2>
          <p className="mb-6 mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
            {t.billingIntro}
          </p>
          <BillingProfileForm
            initial={null}
            version={billing.version}
            countries={billing.countries}
            dict={billing.dict}
            submitLabel={pending ? t.submitting : t.billingSubmit}
            onSaved={profile => {
              setBillingCountry(profile.countryCode);
              void checkout();
            }}
          />
          {error && (
            <p role="alert" className="mt-4 text-sm text-[#A94E35]">
              {error}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
