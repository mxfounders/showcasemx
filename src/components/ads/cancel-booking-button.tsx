'use client';

import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * Cancels a paid booking (or releases an unpaid hold) after an inline confirmation that
 * states what is refunded. Refreshes the server-rendered list on success.
 */
export function CancelBookingButton({
  bookingId,
  version,
  hold,
  dict,
  errors,
}: {
  bookingId: string;
  version: number;
  /** An unpaid Checkout hold: releasing it needs no refund explanation. */
  hold: boolean;
  dict: Dictionary['ads']['bookings'];
  errors: Dictionary['ads']['errors'];
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function cancel() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/ads/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, version }),
        signal: AbortSignal.timeout(20_000),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) throw new Error(result.error || errors.network);
      setConfirming(false);
      if (!hold) setMessage(dict.canceled);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : errors.network);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const label = hold ? dict.release : dict.cancel;
  return (
    <div className="mt-3 text-sm">
      {confirming && !hold ? (
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-stone-700">{dict.cancelConfirm}</p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-full bg-[#A94E35] px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending ? dict.canceling : label}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full px-4 py-2 text-xs text-stone-600 hover:bg-white"
            >
              {dict.keep}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (hold ? cancel() : setConfirming(true))}
          disabled={pending}
          className="text-[#A94E35] underline-offset-4 hover:underline disabled:opacity-60"
        >
          {pending ? dict.canceling : label}
        </button>
      )}
      {message && (
        <p role="status" className="mt-2 text-stone-600">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
