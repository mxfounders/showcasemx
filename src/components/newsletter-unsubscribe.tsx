'use client';

import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { Check, LoaderCircle } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

export function NewsletterUnsubscribe({
  token,
  dict,
}: {
  token: string;
  dict: Dictionary['newsletter']['unsubscribe'];
}) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function unsubscribe() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || dict.error);
      setDone(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : dict.genericError);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (done)
    return (
      <div role="status">
        <Check className="mb-5 size-8 text-[#365DC4]" aria-hidden="true" />
        <h1 className="text-4xl font-semibold tracking-tight">{dict.doneTitle}</h1>
        <p className="mt-4 max-w-lg leading-relaxed text-stone-500">{dict.doneDesc}</p>
        <Link href="/" className="mt-8 inline-block text-sm text-[#365DC4]">
          {dict.back}
        </Link>
      </div>
    );

  return (
    <div>
      <h1 className="text-4xl font-semibold tracking-tight">{dict.title}</h1>
      <p className="mt-4 max-w-lg leading-relaxed text-stone-500">{dict.desc}</p>
      <button
        type="button"
        disabled={pending || !token}
        onClick={() => void unsubscribe()}
        style={actionButtonStyle}
        className="action-button mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {pending ? dict.pending : dict.submit}
      </button>
      {!token && (
        <p role="alert" className="mt-5 text-sm text-[#A94E35]">
          {dict.missingToken}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-5 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
