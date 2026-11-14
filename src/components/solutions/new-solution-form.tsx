'use client';
import { useId, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon, LinkIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { safeSolutionUrl } from '@/lib/solutions/model';
import type { Dictionary } from '@/i18n/dictionary';

/** «cordhq.app» → «https://cordhq.app»: nobody should have to type the scheme. */
function withScheme(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/**
 * The first screen of a new listing: just the link. The draft is created with it and the
 * editor reads the site straight away, so the founder lands on a form already half done.
 */
export function NewSolutionForm({ dict }: { dict: Dictionary['solutionEditor']['newPage'] }) {
  const router = useRouter();
  const ids = useId();
  const id = useRef<string | null>(null);
  const busy = useRef(false);
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    const url = safeSolutionUrl(withScheme(website));
    if (!url) {
      setError(dict.invalid);
      return;
    }
    busy.current = true;
    setPending(true);
    setError('');
    // One id per attempt on this page: a retry after a timeout reuses the same draft.
    id.current ??= crypto.randomUUID();
    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.current, website: withScheme(website) }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.push(`/account/solutions/${result.id}`);
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message && failure.name === 'Error'
          ? failure.message
          : dict.error,
      );
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={start} noValidate className="max-w-xl">
      <label htmlFor={`${ids}-url`} className="text-sm font-medium text-stone-800">
        {dict.websiteLabel}
      </label>
      <div className="mt-2 flex flex-col gap-2 rounded-[22px] border border-stone-300 bg-white p-2 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.25)] focus-within:border-[#365DC4] focus-within:ring-1 focus-within:ring-[#365DC4] sm:flex-row sm:items-center">
        <span className="flex min-w-0 flex-1 items-center gap-2 pl-3">
          <LinkIcon aria-hidden="true" className="size-4 shrink-0 text-stone-400" />
          <input
            id={`${ids}-url`}
            type="url"
            inputMode="url"
            autoComplete="url"
            autoFocus
            required
            value={website}
            maxLength={500}
            placeholder={dict.placeholder}
            aria-invalid={!!error}
            aria-describedby={`${ids}-hint ${error ? `${ids}-error` : ''}`}
            onChange={event => {
              setWebsite(event.target.value);
              setError('');
            }}
            className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-stone-400"
          />
        </span>
        <button
          type="submit"
          disabled={pending}
          style={actionButtonStyle}
          className="action-button inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
        >
          {pending ? dict.creating : dict.cta}
          <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
        </button>
      </div>
      <p id={`${ids}-hint`} className="mt-3 text-xs text-stone-500">
        {dict.noWebsite}
      </p>
      {error && (
        <p id={`${ids}-error`} role="alert" className="mt-2 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
