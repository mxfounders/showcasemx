'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

type EditorDict = Dictionary['solutionEditor'];
/** Only what each control shows travels to the browser, not the whole editor dictionary. */
type Fallbacks = { network: string };

async function patchSolution(id: string, body: Record<string, unknown>, fallback: string) {
  const response = await fetch('/api/solutions/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const result = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(result.error || fallback);
}

function message(error: unknown, fallback: string) {
  return error instanceof Error &&
    !['TypeError', 'TimeoutError', 'SyntaxError'].includes(error.name)
    ? error.message
    : fallback;
}

/** Takes a pending submission back to draft so the founder can edit it (SHCWS-31). */
export function WithdrawSubmission({
  id,
  version,
  dict: t,
  errors,
}: {
  id: string;
  version: number;
  dict: EditorDict['reviewBand'];
  errors: Fallbacks;
}) {
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false);
  const router = useRouter();
  return (
    <div className="mt-5">
      {confirm && <p className="mb-4 max-w-xl text-sm leading-relaxed">{t.withdrawConfirm}</p>}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={pending}
          style={actionButtonStyle}
          className="action-button inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium"
          onClick={async () => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            if (busy.current) return;
            busy.current = true;
            setPending(true);
            setError('');
            try {
              await patchSolution(id, { action: 'withdraw-submission', version }, errors.network);
              router.refresh();
            } catch (failure) {
              setError(message(failure, errors.network));
              setPending(false);
            } finally {
              busy.current = false;
            }
          }}
        >
          {pending ? t.withdrawing : confirm ? t.withdrawConfirmButton : t.withdraw}
        </button>
        {confirm && !pending && (
          <button
            type="button"
            onClick={() => {
              setConfirm(false);
              setError('');
            }}
            className="text-sm text-stone-500"
          >
            {t.cancel}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Unpublishing an approved listing, with every consequence spelled out before the
 * founder confirms (SHCWS-32). Coming back goes through review again.
 */
export function UnpublishListing({
  id,
  version,
  name,
  bookings,
  dict: t,
  errors,
}: {
  id: string;
  version: number;
  name: string;
  /** Paid sponsored bookings still running or ahead, cancelled with the listing. */
  bookings: number;
  dict: EditorDict['unpublish'];
  errors: Fallbacks;
}) {
  const [confirm, setConfirm] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false);
  const router = useRouter();
  return (
    <section
      aria-labelledby="unpublish-title"
      className="rounded-2xl border border-stone-200 bg-white p-6"
    >
      <h2 id="unpublish-title" className="text-base font-medium">
        {t.title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{t.intro}</p>
      {confirm && (
        <div className="mt-5 max-w-2xl" role="group" aria-labelledby="unpublish-confirm-title">
          <p id="unpublish-confirm-title" className="text-sm font-medium">
            {t.confirmTitle.replace('{name}', () => name)}
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-600">
            {t.consequences.map(item => (
              <li key={item}>{item}</li>
            ))}
            {bookings > 0 && (
              <li>
                {bookings === 1
                  ? t.bookingsOne
                  : t.bookingsOther.replace('{count}', String(bookings))}
              </li>
            )}
          </ul>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-full border border-[#A94E35]/40 px-4 text-sm font-medium text-[#A94E35] transition-colors hover:bg-[#F6E5DD] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#A94E35] disabled:opacity-60"
          onClick={async () => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            if (busy.current) return;
            busy.current = true;
            setPending(true);
            setError('');
            try {
              await patchSolution(id, { action: 'unpublish', version }, errors.network);
              router.refresh();
            } catch (failure) {
              setError(message(failure, errors.network));
              setPending(false);
            } finally {
              busy.current = false;
            }
          }}
        >
          {pending ? t.working : confirm ? t.confirm : t.button}
        </button>
        {confirm && !pending && (
          <button
            type="button"
            onClick={() => {
              setConfirm(false);
              setError('');
            }}
            className="text-sm text-stone-500"
          >
            {t.cancel}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </section>
  );
}
