'use client';
import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { BellIcon, CheckIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * «Seguir» on a public profile (SHCWS-120). The profile is named by its handle; the
 * answer is only the viewer's own state. The person never learns who follows them.
 */
export function ProfileFollowButton({
  handle,
  following: initial,
  signedIn,
  dict,
}: {
  handle: string;
  following: boolean;
  signedIn: boolean;
  dict: Dictionary['profiles']['page'];
}) {
  const [following, setFollowing] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);

  if (!signedIn)
    return (
      <p className="text-sm text-stone-500">
        <Link
          href={`/sign-in?next=${encodeURIComponent(`/c/${handle}`)}`}
          className="font-medium text-[#365DC4] hover:underline"
        >
          {dict.signIn}
        </Link>{' '}
        {dict.signInSuffix}
      </p>
    );

  async function toggle() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'profile', handle }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        active?: boolean;
        error?: string;
      };
      if (!response.ok) throw Error(body.error ?? '');
      setFollowing(!!body.active);
    } catch (failure) {
      setError((failure instanceof Error && failure.message) || dict.followError);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        style={following ? undefined : actionButtonStyle}
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 ${
          following
            ? 'border border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            : 'action-button'
        }`}
      >
        {following ? (
          <CheckIcon aria-hidden="true" className="size-4" />
        ) : (
          <BellIcon aria-hidden="true" className="size-4" />
        )}
        {following ? dict.following : dict.follow}
      </button>
      <p className="max-w-sm text-xs text-stone-400">{dict.followHint}</p>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
