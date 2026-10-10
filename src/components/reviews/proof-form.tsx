'use client';
import { useId, useRef, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { reviewRequest } from './request';

type Field = 'uuid' | 'issuer' | 'receiver' | 'total';

const input =
  'mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-[#365DC4]';

/**
 * Backs the viewer's own review with a CFDI the SAT reports as vigente. The receipt's
 * details go to the SAT once and are not stored (docs/compliance.md).
 */
export function ProofForm({
  solutionId,
  reviewId,
  dict,
}: {
  solutionId: string;
  reviewId: string;
  dict: Dictionary['reviews'];
}) {
  const router = useRouter();
  const ids = useId();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<Field, string>>({
    uuid: '',
    issuer: '',
    receiver: '',
    total: '',
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<{ field?: Field; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const text = dict.proof;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-700 hover:border-stone-300"
      >
        <ReceiptText className="size-4 text-[#416B50]" aria-hidden="true" />
        {text.action}
      </button>
    );

  const field = (
    name: Field,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <label className="block text-sm font-medium text-stone-700" htmlFor={`${ids}-${name}`}>
      {label}
      <input
        id={`${ids}-${name}`}
        value={values[name]}
        onChange={event => {
          setValues(current => ({ ...current, [name]: event.target.value }));
          setError(null);
        }}
        aria-invalid={error?.field === name}
        aria-describedby={error?.field === name ? `${ids}-error` : undefined}
        className={input}
        {...props}
      />
    </label>
  );

  return (
    <form
      noValidate
      className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6"
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setError(null);
        try {
          await reviewRequest(solutionId, {
            action: 'prove',
            reviewId,
            consent,
            ...values,
          });
          setOpen(false);
          router.refresh();
        } catch (failure) {
          const fieldName = (failure as { field?: Field }).field;
          setError({
            field: fieldName,
            message:
              failure instanceof Error && failure.message
                ? failure.message
                : dict.errors.saveFailed,
          });
          if (fieldName) document.getElementById(`${ids}-${fieldName}`)?.focus();
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      <div>
        <p className="flex items-center gap-2 text-base font-semibold text-stone-900">
          <ReceiptText className="size-5 text-[#416B50]" aria-hidden="true" />
          {text.title}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{text.intro}</p>
      </div>
      {field('uuid', text.uuid, {
        autoComplete: 'off',
        spellCheck: false,
        placeholder: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
      })}
      <div className="grid gap-5 sm:grid-cols-3">
        {field('issuer', text.issuer, { autoComplete: 'off', spellCheck: false, maxLength: 13 })}
        {field('receiver', text.receiver, {
          autoComplete: 'off',
          spellCheck: false,
          maxLength: 13,
        })}
        {field('total', text.total, { inputMode: 'decimal', autoComplete: 'off' })}
      </div>
      <label className="flex items-start gap-3 text-sm text-stone-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={event => setConsent(event.target.checked)}
          className="mt-0.5"
        />
        {text.consent}
      </label>
      {error && (
        <p id={`${ids}-error`} role="alert" className="text-sm text-[#A94E35]">
          {error.message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
        >
          {text.cancel}
        </button>
        <button
          disabled={pending}
          style={actionButtonStyle}
          className="action-button rounded-full px-5 py-3 text-sm font-medium"
        >
          {pending ? text.checking : text.submit}
        </button>
      </div>
    </form>
  );
}
