'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { BellIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
import { alertLabel, readAlertCriteria, type AlertCriteria } from '@/lib/alerts/model';
import { pendingAlertKey } from './search-alert-button';

type PageDict = Dictionary['alerts']['page'];

async function post(body: Record<string, unknown>) {
  const response = await fetch('/api/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw Error(data.error ?? '');
  }
}

/** Deleting asks once more inline; a failure says so instead of pretending. */
export function DeleteAlertButton({ id, dict }: { id: string; dict: PageDict }) {
  const [confirming, setConfirming] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter(),
    lock = useRef(false);
  if (!confirming)
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-full px-4 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#A94E35]"
      >
        {dict.delete}
      </button>
    );
  return (
    <div role="group" aria-label={dict.delete} className="flex flex-wrap items-center gap-2">
      <p className="text-sm text-stone-600">{dict.confirmDelete}</p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          try {
            await post({ action: 'delete', id });
            router.refresh();
          } catch (e) {
            setError((e instanceof Error && e.message) || dict.deleteError);
            setBusy(false);
          } finally {
            lock.current = false;
          }
        }}
        className="rounded-full bg-[#F6E5DD] px-4 py-2 text-sm text-[#A94E35] disabled:opacity-60"
      >
        {busy ? dict.deleting : dict.delete}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setConfirming(false)}
        className="rounded-full px-4 py-2 text-sm text-stone-500 hover:bg-stone-100"
      >
        {dict.cancel}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The alert someone started before signing in (kept in this tab by SearchAlertButton).
 * Nothing is created until they press the button: opening a page never changes anything.
 */
export function PendingAlert({
  dict,
  locale,
  fastResponse,
}: {
  dict: PageDict;
  locale: string;
  fastResponse: string;
}) {
  const [criteria, setCriteria] = useState<AlertCriteria | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter();
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(pendingAlertKey);
      // Read once, after hydration: the server never sees this tab's storage.
      if (raw) setCriteria(readAlertCriteria(JSON.parse(raw)));
    } catch {
      /* Blocked or malformed storage: nothing to offer. */
    }
  }, []);
  if (!criteria) return null;
  const forget = () => {
    try {
      window.sessionStorage.removeItem(pendingAlertKey);
    } catch {
      /* Nothing to clean. */
    }
    setCriteria(null);
  };
  return (
    <section className="mb-8 rounded-2xl border border-[#365DC4]/30 bg-white p-6">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-stone-400">
        <BellIcon aria-hidden="true" className="size-4 text-[#365DC4]" />
        {dict.pendingTitle}
      </p>
      <p className="mt-2 text-lg font-medium">{alertLabel(criteria, locale, { fastResponse })}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          style={actionButtonStyle}
          className="action-button rounded-full px-5 py-2.5 text-sm disabled:opacity-60"
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await post({ action: 'create', criteria });
              forget();
              router.refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : '');
            } finally {
              setBusy(false);
            }
          }}
        >
          {dict.pendingCreate}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={forget}
          className="rounded-full px-5 py-2.5 text-sm text-stone-500 hover:bg-stone-100"
        >
          {dict.pendingDismiss}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </section>
  );
}
