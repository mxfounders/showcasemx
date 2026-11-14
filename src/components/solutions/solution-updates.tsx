'use client';
import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { ArrowUpRightIcon, BellIcon, CheckIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { SolutionUpdate } from '@/lib/solutions/updates-model';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * A listing's dated updates and the «Seguir» button (SHCWS-24). Following is the viewer's
 * own state only: nobody sees who follows a listing, and the founder sees a count in
 * their account. The founder can't follow their own listing.
 */
export function SolutionUpdates({
  solutionId,
  updates,
  following: initialFollowing,
  signedIn,
  own,
  locale,
  dict,
}: {
  solutionId: string;
  updates: SolutionUpdate[];
  following: boolean;
  signedIn: boolean;
  own: boolean;
  locale: string;
  dict: Dictionary['follows'];
}) {
  const [following, setFollowing] = useState(initialFollowing),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const lock = useRef(false);
  const date = (value: string) =>
    new Date(value).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  async function toggle() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'solution', id: solutionId }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        active?: boolean;
        error?: string;
      };
      if (!response.ok) throw Error(body.error ?? '');
      setFollowing(!!body.active);
    } catch (failure) {
      setError((failure instanceof Error && failure.message) || dict.solution.error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="mt-14 border-t border-stone-200 pt-8" aria-labelledby="solution-updates">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="solution-updates" className="text-2xl font-semibold tracking-tight">
          {dict.updates.title}
        </h2>
        {!own &&
          (signedIn ? (
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
              {following ? dict.solution.following : dict.solution.follow}
            </button>
          ) : (
            <p className="text-sm text-stone-500">
              <Link
                href={`/sign-in?next=${encodeURIComponent(`/soluciones/${solutionId}`)}`}
                className="font-medium text-[#365DC4] hover:underline"
              >
                {dict.solution.signIn}
              </Link>{' '}
              {dict.solution.signInSuffix}
            </p>
          ))}
      </div>
      {!own && signedIn && <p className="mt-2 text-sm text-stone-500">{dict.solution.hint}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      {updates.length ? (
        <ol className="mt-6 space-y-6">
          {updates.map(update => (
            <li key={update.id} className="border-l-2 border-stone-200 pl-4">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                <span className="rounded-full bg-[#E4EBFC] px-2.5 py-0.5 font-medium text-[#365DC4]">
                  {dict.updates.kinds[update.kind]}
                </span>
                <time dateTime={update.createdAt}>{date(update.createdAt)}</time>
              </p>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-stone-800">
                {update.body}
              </p>
              {update.link && (
                <a
                  href={update.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#365DC4] hover:underline"
                >
                  {dict.updates.link}
                  <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />
                </a>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-stone-500">{dict.updates.empty}</p>
      )}
    </section>
  );
}
