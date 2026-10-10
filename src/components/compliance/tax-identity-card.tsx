'use client';
import { useId, useRef, useState } from 'react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { ComplianceResult, TaxIdentity } from '@/lib/compliance/server';
import type { Dictionary } from '@/i18n/dictionary';
import { ComplianceNote } from './compliance-note';

/**
 * Owner-only: declares the listing's fiscal identity and shows the public result right
 * away. The tax ID itself is never published (docs/compliance.md).
 */
export function TaxIdentityCard({
  solutionId,
  initial,
  initialResult,
  countries,
  locale,
  dict,
}: {
  solutionId: string;
  initial: TaxIdentity | null;
  initialResult: ComplianceResult | null;
  countries: { value: string; label: string }[];
  locale: string;
  dict: Dictionary['compliance'];
}) {
  const ids = useId();
  const busy = useRef(false);
  const [country, setCountry] = useState(initial?.country ?? 'MX');
  const [taxId, setTaxId] = useState(initial?.taxId ?? '');
  const [saved, setSaved] = useState(!!initial);
  const [result, setResult] = useState(initialResult);
  const [pending, setPending] = useState<'' | 'save' | 'delete'>('');
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [status, setStatus] = useState('');
  const text = dict.owner;

  const send = async (action: 'save' | 'delete') => {
    if (busy.current) return;
    busy.current = true;
    setPending(action);
    setError(null);
    setStatus('');
    try {
      const response = await fetch(`/api/solutions/${solutionId}/tax-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, country, taxId }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        field?: string;
        identity?: TaxIdentity;
        result?: ComplianceResult | null;
      };
      if (!response.ok) throw Object.assign(new Error(body.error ?? ''), { field: body.field });
      if (action === 'delete') {
        setTaxId('');
        setSaved(false);
        setResult(null);
        setStatus(text.removed);
      } else {
        if (body.identity) setTaxId(body.identity.taxId);
        setSaved(true);
        setResult(body.result ?? null);
        setStatus(text.saved);
      }
    } catch (failure) {
      setError({
        field: (failure as { field?: string }).field,
        message:
          failure instanceof Error && failure.message ? failure.message : dict.errors.saveFailed,
      });
    } finally {
      busy.current = false;
      setPending('');
    }
  };

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
    >
      <h2 id={`${ids}-title`} className="text-lg font-medium text-stone-900">
        {text.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{text.desc}</p>
      <form
        noValidate
        className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={event => {
          event.preventDefault();
          void send('save');
        }}
      >
        <label className="block text-sm font-medium text-stone-700">
          {text.country}
          <select
            value={country}
            onChange={event => setCountry(event.target.value)}
            aria-invalid={error?.field === 'country'}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#365DC4]"
          >
            {countries.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-700">
          {country === 'MX' ? text.taxIdMx : text.taxId}
          <input
            value={taxId}
            onChange={event => setTaxId(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={40}
            aria-invalid={error?.field === 'taxId'}
            aria-describedby={error ? `${ids}-error` : undefined}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm uppercase outline-none focus:border-[#365DC4]"
          />
        </label>
        <div className="flex gap-2">
          <button
            disabled={!!pending}
            style={actionButtonStyle}
            className="action-button rounded-full px-5 py-3 text-sm font-medium"
          >
            {pending === 'save' ? text.saving : text.save}
          </button>
          {saved && (
            <button
              type="button"
              disabled={!!pending}
              onClick={() => void send('delete')}
              className="rounded-full px-4 py-3 text-sm text-stone-500 hover:bg-stone-100 hover:text-[#A94E35]"
            >
              {pending === 'delete' ? text.removing : text.remove}
            </button>
          )}
        </div>
      </form>
      {error && (
        <p id={`${ids}-error`} role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error.message}
        </p>
      )}
      {status && (
        <p role="status" className="mt-3 text-sm text-[#416B50]">
          {status}
        </p>
      )}
      {result && (
        <div className="mt-5 border-t border-stone-100 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
            {text.public}
          </p>
          <ComplianceNote result={result} locale={locale} dict={dict.public} />
        </div>
      )}
    </section>
  );
}
