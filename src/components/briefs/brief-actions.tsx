'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { libraryButton, libraryField } from '@/components/library/client';
import type { Dictionary } from '@/i18n/dictionary';
import { readProposal } from '@/lib/briefs/model';

type BriefsDict = Dictionary['briefs'];

async function post(body: Record<string, unknown>, t: BriefsDict['errors']) {
  try {
    const response = await fetch('/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return { error: String(result.error || t.unavailable) };
    return { result: result as Record<string, unknown> };
  } catch {
    return { error: t.network };
  }
}

/** The buyer stops new proposals; what already arrived stays. Confirmed first. */
export function CloseBrief({ id, dict: t }: { id: string; dict: BriefsDict }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  if (!confirm)
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="text-sm text-stone-500 underline-offset-4 hover:underline"
      >
        {t.detail.close}
      </button>
    );
  return (
    <div role="group" aria-label={t.detail.close} className="max-w-md text-sm">
      <p className="leading-relaxed text-stone-600">{t.detail.closeConfirm}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const { error: failure } = await post({ action: 'close', id }, t.errors);
            setPending(false);
            if (failure) return setError(failure);
            router.refresh();
          }}
          className="font-medium text-[#A94E35]"
        >
          {pending ? t.detail.closing : t.detail.closeYes}
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="text-stone-500">
          {t.detail.cancel}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Choosing a founder the buyer already talks to: mark it and open that conversation. */
export function ChooseExisting({
  briefId,
  proposalId,
  dict: t,
}: {
  briefId: string;
  proposalId: string;
  dict: BriefsDict;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        style={actionButtonStyle}
        className={libraryButton}
        onClick={async () => {
          setPending(true);
          const { result, error: failure } = await post(
            { action: 'choose-existing', id: briefId, proposalId },
            t.errors,
          );
          setPending(false);
          if (failure || typeof result?.contactId !== 'string')
            return setError(failure ?? t.errors.unavailable);
          router.push(`/account/contacts/${result.contactId}`);
        }}
      >
        {pending ? t.choose.existingWorking : t.choose.existingButton}
        <ArrowRightIcon className="size-4" aria-hidden="true" />
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}

/** A founder's one proposal to a brief, from one of their listings that matched it. */
export function ProposalForm({
  briefId,
  listings,
  dict: t,
}: {
  briefId: string;
  listings: { id: string; name: string }[];
  dict: BriefsDict;
}) {
  const router = useRouter();
  const [values, setValues] = useState({
      solutionId: listings[0]?.id ?? '',
      message: '',
      price: '',
      timeline: '',
    }),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const id = useRef<string | null>(null),
    busy = useRef(false);
  const set = (key: keyof typeof values, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setError('');
  };
  const f = t.proposalForm;
  return (
    <form
      noValidate
      aria-label={f.aria}
      aria-busy={pending}
      className="space-y-6"
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        const proposal = readProposal(values);
        if (!proposal) return setError(f.incomplete);
        busy.current = true;
        setPending(true);
        id.current ??= crypto.randomUUID();
        const { error: failure } = await post(
          { ...proposal, action: 'propose', id: id.current, briefId },
          t.errors,
        );
        busy.current = false;
        setPending(false);
        if (failure) return setError(failure);
        router.refresh();
      }}
    >
      <fieldset disabled={pending} className="space-y-6">
        {listings.length > 1 && (
          <label className="block text-sm">
            {f.listing}
            <select
              value={values.solutionId}
              onChange={event => set('solutionId', event.target.value)}
              className={libraryField}
            >
              {listings.map(listing => (
                <option key={listing.id} value={listing.id}>
                  {listing.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block text-sm">
          {f.message}
          <textarea
            value={values.message}
            onChange={event => set('message', event.target.value)}
            minLength={20}
            maxLength={2000}
            rows={6}
            placeholder={f.messagePlaceholder}
            className={libraryField}
          />
        </label>
        <div className="grid gap-6 sm:grid-cols-2">
          <label className="text-sm">
            {f.price}
            <input
              value={values.price}
              onChange={event => set('price', event.target.value)}
              maxLength={200}
              placeholder={f.pricePlaceholder}
              className={libraryField}
            />
          </label>
          <label className="text-sm">
            {f.timeline}
            <input
              value={values.timeline}
              onChange={event => set('timeline', event.target.value)}
              maxLength={200}
              placeholder={f.timelinePlaceholder}
              className={libraryField}
            />
          </label>
        </div>
        <button style={actionButtonStyle} className={libraryButton}>
          {pending ? f.sending : f.send}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
