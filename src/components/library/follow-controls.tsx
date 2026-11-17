'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * Stops following, from the account page (SHCWS-121). A curator is unfollowed by the
 * follower's own follow id, a list by its id; both work after a list went private.
 */
export function UnfollowButton({
  action,
  id,
  dict,
}: {
  action: 'unfollow-list' | 'unfollow-curator';
  id: string;
  dict: Dictionary['follows'];
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const router = useRouter(),
    lock = useRef(false);
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError('');
          try {
            const response = await fetch('/api/follows', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, id }),
            });
            if (!response.ok) {
              const body = (await response.json().catch(() => ({}))) as { error?: string };
              throw Error(body.error ?? '');
            }
            router.refresh();
          } catch (e) {
            setError((e instanceof Error && e.message) || dict.actions.error);
            setBusy(false);
          } finally {
            lock.current = false;
          }
        }}
        className="rounded-full px-4 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 hover:text-[#A94E35] disabled:opacity-60"
      >
        {busy ? dict.page.unfollowing : dict.page.unfollow}
      </button>
      {error && (
        <span role="alert" className="mt-1 text-xs text-[#A94E35]">
          {error}
        </span>
      )}
    </span>
  );
}
