'use client';
import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { BellIcon } from '@/components/icons/gota';
import type { Dictionary } from '@/i18n/dictionary';
import type { AlertCriteria } from '@/lib/alerts/model';

/** Where a criteria waits while its author signs in (per tab, never sent anywhere). */
export const pendingAlertKey = 'shwcs-pending-alert';

/**
 * «Avísame cuando haya algo nuevo» (SHCWS-47) on /buscar and the catalog pages, with the
 * page's current words and filters. Creating twice returns the same alert. Without a
 * session the criteria waits in this tab for the account's alerts page to offer it.
 */
export function SearchAlertButton({
  criteria,
  dict,
  className = '',
}: {
  criteria: AlertCriteria;
  dict: Dictionary['alerts']['button'];
  className?: string;
}) {
  const signature = JSON.stringify(criteria);
  const [state, setState] = useState<{
    for: string;
    status: 'idle' | 'pending' | 'created' | 'exists' | 'login' | 'error';
    message?: string;
  }>({ for: signature, status: 'idle' });
  const lock = useRef(false);
  // A filter changed since the last click: that is a different alert.
  const status = state.for === signature ? state.status : 'idle';

  async function create() {
    if (lock.current) return;
    lock.current = true;
    setState({ for: signature, status: 'pending' });
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', criteria }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        created?: boolean;
        error?: string;
      };
      if (response.status === 401) {
        try {
          window.sessionStorage.setItem(pendingAlertKey, signature);
        } catch {
          /* Storage may be blocked; the sign-in link still works. */
        }
        setState({ for: signature, status: 'login' });
      } else if (!response.ok) {
        setState({ for: signature, status: 'error', message: body.error });
      } else setState({ for: signature, status: body.created ? 'created' : 'exists' });
    } catch {
      setState({ for: signature, status: 'error' });
    } finally {
      lock.current = false;
    }
  }

  const done = status === 'created' || status === 'exists';
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => void create()}
        disabled={status === 'pending' || done}
        aria-describedby="search-alert-hint"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition-colors hover:border-stone-400 disabled:opacity-70"
      >
        <BellIcon aria-hidden="true" className="size-4 text-[#365DC4]" />
        {status === 'pending' ? dict.creating : dict.create}
      </button>
      <p id="search-alert-hint" className="mt-2 text-xs text-stone-400">
        {dict.hint}
      </p>
      <div aria-live="polite">
        {done && (
          <p className="mt-2 text-sm text-[#406A50]">
            {status === 'created' ? dict.created : dict.exists}{' '}
            <Link href="/account/alerts" className="text-[#365DC4] underline underline-offset-4">
              {dict.manage}
            </Link>
          </p>
        )}
        {status === 'login' && (
          <p className="mt-2 text-sm text-stone-500">
            <Link
              href={`/sign-in?next=${encodeURIComponent('/account/alerts')}`}
              className="text-[#365DC4] underline underline-offset-4"
            >
              {dict.signIn}
            </Link>{' '}
            {dict.signInSuffix}
          </p>
        )}
        {status === 'error' && (
          <p role="alert" className="mt-2 text-sm text-[#A94E35]">
            {state.message || dict.error}
          </p>
        )}
      </div>
    </div>
  );
}
