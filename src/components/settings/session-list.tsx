'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Monitor, LogOut } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionary';

export type ActiveSession = {
  tokenHash: string;
  device: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
};

const when = (value: string, locale: string) =>
  new Date(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/**
 * Sessions the account has open. The current one cannot be closed from here —
 * that is what the sign-out button does — so a person never ends up logged out
 * mid-action wondering whether the click worked.
 */
export function SessionList({
  sessions,
  dict,
  dateLocale,
}: {
  sessions: ActiveSession[];
  dict: Dictionary['settings']['security']['sessions'];
  dateLocale: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const others = sessions.filter(session => !session.current).length;

  async function revoke(payload: Record<string, unknown>, marker: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(marker);
    setError('');
    try {
      const response = await fetch('/api/account/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || dict.revokeError);
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error &&
          !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name)
          ? failure.message
          : dict.genericError,
      );
    } finally {
      busy.current = false;
      setPending('');
    }
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {sessions.map(session => (
          <li
            key={session.tokenHash}
            className="flex flex-wrap items-center justify-between gap-4 py-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
                <Monitor aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900">
                  {session.device}
                  {session.current && (
                    <span className="rounded-full bg-[#E7F0E9] px-2.5 py-0.5 text-[11px] font-medium text-[#416B50]">
                      {dict.current}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {dict.started
                    .replace('{created}', when(session.createdAt, dateLocale))
                    .replace('{expires}', when(session.expiresAt, dateLocale))}
                </p>
              </div>
            </div>
            {!session.current && (
              <button
                type="button"
                disabled={Boolean(pending)}
                onClick={() =>
                  revoke({ action: 'revoke', tokenHash: session.tokenHash }, session.tokenHash)
                }
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
              >
                {pending === session.tokenHash ? dict.closing : dict.close}
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      {others > 0 ? (
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => revoke({ action: 'revoke-others' }, 'all')}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
        >
          <LogOut aria-hidden="true" className="size-4" />
          {pending === 'all'
            ? dict.closing
            : others === 1
              ? dict.closeOthersOne
              : dict.closeOthersMany.replace('{count}', String(others))}
        </button>
      ) : (
        <p className="text-sm text-stone-500">{dict.noOthers}</p>
      )}
    </div>
  );
}
