'use client';

import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import {
  cfdiUses,
  satTaxRegimes,
  type BillingProfile,
  type BillingProfileError,
} from '@/lib/billing/model';
import type { Dictionary } from '@/i18n/dictionary';

const field =
  'mt-2 w-full rounded-xl border border-stone-300 bg-transparent px-4 py-3 text-base text-stone-800 outline-none transition-colors focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4] aria-[invalid=true]:border-[#A94E35]';

type Values = Record<keyof BillingProfile, string>;

/**
 * The buyer's billing details. Mexico asks for exactly what a CFDI 4.0 needs; other
 * countries only for a legal name and an optional tax id. Errors appear next to the
 * field the server rejected.
 */
export function BillingProfileForm({
  initial,
  version: initialVersion,
  countries,
  dict,
}: {
  initial: BillingProfile | null;
  version: number;
  /** Country codes with their names, resolved on the server so markup never differs. */
  countries: { code: string; name: string }[];
  dict: Dictionary['billing'];
}) {
  const t = dict.profile;
  const router = useRouter();
  const busy = useRef(false);
  const [version, setVersion] = useState(initialVersion);
  const [values, setValues] = useState<Values>({
    countryCode: initial?.countryCode ?? 'MX',
    legalName: initial?.legalName ?? '',
    taxId: initial?.taxId ?? '',
    taxRegime: initial?.taxRegime ?? '',
    postalCode: initial?.postalCode ?? '',
    cfdiUse: initial?.cfdiUse ?? 'G03',
    invoiceEmail: initial?.invoiceEmail ?? '',
  });
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<{ message: string; field?: BillingProfileError } | null>(null);
  const mexico = values.countryCode === 'MX';

  const update = (key: keyof Values, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const invalid = (...fields: BillingProfileError[]) =>
    error?.field && fields.includes(error.field) ? true : undefined;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/account/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, version }),
        signal: AbortSignal.timeout(20_000),
      });
      const result: { version?: number; error?: string; field?: BillingProfileError } =
        await response.json();
      if (!response.ok || result.version === undefined) {
        setError({ message: result.error || dict.errors.network, field: result.field });
        return;
      }
      setVersion(result.version);
      setSaved(true);
      router.refresh();
    } catch {
      setError({ message: dict.errors.network });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 sm:grid-cols-2">
      <label className="text-sm font-medium text-stone-600">
        {t.country}
        <select
          value={values.countryCode}
          onChange={e => update('countryCode', e.target.value)}
          className={field}
          aria-invalid={invalid('country')}
        >
          {countries.map(country => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-stone-600">
        {t.legalName}
        <input
          value={values.legalName}
          onChange={e => update('legalName', e.target.value)}
          maxLength={254}
          autoComplete="organization"
          className={field}
          aria-invalid={invalid('legalName')}
          required
        />
      </label>

      {mexico ? (
        <>
          <label className="text-sm font-medium text-stone-600">
            {t.rfc}
            <input
              value={values.taxId}
              onChange={e => update('taxId', e.target.value.toUpperCase())}
              maxLength={13}
              autoCapitalize="characters"
              spellCheck={false}
              className={`${field} font-mono uppercase`}
              aria-invalid={invalid('rfc', 'genericRfc')}
              required
            />
          </label>
          <label className="text-sm font-medium text-stone-600">
            {t.postalCode}
            <input
              value={values.postalCode}
              onChange={e => update('postalCode', e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={5}
              autoComplete="postal-code"
              className={field}
              aria-invalid={invalid('postalCode')}
              required
            />
          </label>
          <label className="text-sm font-medium text-stone-600">
            {t.taxRegime}
            <select
              value={values.taxRegime}
              onChange={e => update('taxRegime', e.target.value)}
              className={field}
              aria-invalid={invalid('taxRegime')}
              required
            >
              <option value="">{t.taxRegimePlaceholder}</option>
              {Object.entries(satTaxRegimes).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-stone-600">
            {t.cfdiUse}
            <select
              value={values.cfdiUse}
              onChange={e => update('cfdiUse', e.target.value)}
              className={field}
              aria-invalid={invalid('cfdiUse')}
            >
              {Object.entries(cfdiUses).map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="text-sm font-medium text-stone-600">
            {t.taxId}
            <input
              value={values.taxId}
              onChange={e => update('taxId', e.target.value)}
              maxLength={30}
              spellCheck={false}
              className={field}
              aria-invalid={invalid('taxId')}
              aria-describedby="tax-id-hint"
            />
            <span id="tax-id-hint" className="mt-1.5 block text-xs font-normal text-stone-500">
              {t.taxIdHint}
            </span>
          </label>
          <label className="text-sm font-medium text-stone-600">
            {t.postalCodeOptional}
            <input
              value={values.postalCode}
              onChange={e => update('postalCode', e.target.value)}
              maxLength={10}
              autoComplete="postal-code"
              className={field}
              aria-invalid={invalid('postalCode')}
            />
          </label>
        </>
      )}

      <label className="text-sm font-medium text-stone-600 sm:col-span-2">
        {t.invoiceEmail}
        <input
          type="email"
          value={values.invoiceEmail}
          onChange={e => update('invoiceEmail', e.target.value)}
          maxLength={254}
          autoComplete="email"
          className={field}
          aria-invalid={invalid('invoiceEmail')}
          aria-describedby="invoice-email-hint"
        />
        <span id="invoice-email-hint" className="mt-1.5 block text-xs font-normal text-stone-500">
          {t.invoiceEmailHint}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          style={actionButtonStyle}
          className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium disabled:opacity-60"
        >
          {pending ? t.saving : t.save}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
        {saved && (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-stone-600">
            <Check aria-hidden="true" className="size-4" />
            {t.saved}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35] sm:col-span-2">
          {error.message}
        </p>
      )}
    </form>
  );
}
