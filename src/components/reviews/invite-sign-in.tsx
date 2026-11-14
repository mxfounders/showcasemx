'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { MailIcon } from '@/components/icons/gota';
import Link, { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * Signing in from a review invitation (SHCWS-132): one email field, then a link that comes
 * back to this page with its token in the fragment. The page posts it once (the fragment
 * never reaches a server log or a Referer) and reloads signed in. A password stays one
 * click away for those who prefer it.
 */
export function InviteSignIn({ invite, dict }: { invite: string; dict: Dictionary['reviews'] }) {
  const text = dict.invite.page;
  const router = useRouter();
  const ids = useId();
  const busy = useRef(false);
  const fragmentRead = useRef(false);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [consuming, setConsuming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (fragmentRead.current) return;
    fragmentRead.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('acceso');
    if (!token) return;
    window.history.replaceState(null, '', window.location.pathname);
    setConsuming(true);
    void (async () => {
      try {
        const response = await fetch('/api/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'consume', token }),
          signal: AbortSignal.timeout(15000),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw Error(body.error || dict.errors.magicFailed);
        router.refresh();
      } catch (failure) {
        setError(
          failure instanceof Error && failure.message ? failure.message : dict.errors.magicFailed,
        );
        setConsuming(false);
      }
    })();
  }, [dict.errors.magicFailed, router]);

  const send = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email, invite }),
        signal: AbortSignal.timeout(20000),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw Error(body.error || dict.errors.magicFailed);
      setSentTo(email.trim());
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message ? failure.message : dict.errors.magicFailed,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const next = encodeURIComponent(`/resenar/${invite}`);
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
      {consuming ? (
        <p role="status" className="text-sm text-stone-600">
          {text.consuming}
        </p>
      ) : sentTo ? (
        <div role="status">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-stone-700">
            <MailIcon className="mt-0.5 size-4 shrink-0 text-[#365DC4]" aria-hidden="true" />
            {text.sent.replace('{email}', sentTo)}
          </p>
          <button
            type="button"
            onClick={() => setSentTo('')}
            className="mt-4 rounded-full px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            {text.resend}
          </button>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={event => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor={`${ids}-email`} className="block text-sm font-medium text-stone-700">
            {text.emailLabel}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={`${ids}-email`}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              placeholder={text.emailPlaceholder}
              aria-invalid={!!error}
              aria-describedby={`${ids}-hint${error ? ` ${ids}-error` : ''}`}
              onChange={event => {
                setEmail(event.target.value);
                setError('');
              }}
              className="min-w-0 flex-1 rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 outline-none focus:border-[#365DC4]"
            />
            <button
              disabled={pending}
              style={actionButtonStyle}
              className="action-button rounded-full px-5 py-3 text-sm font-medium"
            >
              {pending ? text.sending : text.send}
            </button>
          </div>
          <p id={`${ids}-hint`} className="mt-2 text-xs leading-relaxed text-stone-500">
            {text.emailHint}
          </p>
        </form>
      )}
      {error && (
        <p id={`${ids}-error`} role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      {!consuming && (
        <p className="mt-6 border-t border-stone-200 pt-4 text-sm text-stone-500">
          {text.orPassword}{' '}
          <Link
            href={`/sign-in?next=${next}`}
            className="text-[#365DC4] underline underline-offset-4"
          >
            {text.signIn}
          </Link>
          {' · '}
          <Link
            href={`/sign-up?next=${next}`}
            className="text-[#365DC4] underline underline-offset-4"
          >
            {text.signUp}
          </Link>
        </p>
      )}
    </div>
  );
}
