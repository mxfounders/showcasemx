'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, LinkIcon, RefreshIcon } from '@/components/icons/gota';
import Link from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * The founder's invitation link (SHCWS-132). Created only when they ask for it, copied in
 * one tap and replaceable. The card says up front what the link does to a review — label
 * and half weight — and the rules against picking only happy customers or paying for
 * praise, the same ones Términos › Reseñas states.
 */
export function ReviewInviteCard({
  solutionId,
  initialToken,
  locale,
  dict,
}: {
  solutionId: string;
  initialToken: string | null;
  locale: string;
  dict: Dictionary['reviews'];
}) {
  const text = dict.invite.card;
  const ids = useId();
  const busy = useRef(false);
  const [token, setToken] = useState(initialToken);
  const [origin, setOrigin] = useState('');
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  // The page is served from whichever host the founder is on (production, a preview, local).
  useEffect(() => setOrigin(window.location.origin), []);
  const link = token ? `${origin}/${locale}/resenar/${token}` : '';

  const request = async (action: 'create' | 'rotate') => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/api/solutions/${solutionId}/review-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
      if (!response.ok || !body.token) throw Error(body.error || text.failed);
      setToken(body.token);
      setConfirming(false);
      setCopied(false);
    } catch (failure) {
      setError(failure instanceof Error && failure.message ? failure.message : text.failed);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      document.getElementById(`${ids}-link`)?.focus();
    }
  };

  return (
    <div id="invitar-resenas" className="scroll-mt-24">
      <h3 className="flex items-center gap-2 text-base font-medium text-stone-900">
        <LinkIcon className="size-4 text-[#365DC4]" aria-hidden="true" />
        {text.title}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">{text.body}</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{text.weight}</p>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-stone-500">
        {text.rules}{' '}
        <Link href="/terminos#resenas" className="text-[#365DC4] underline underline-offset-4">
          {text.rulesLink}
        </Link>
      </p>

      {token ? (
        <div className="mt-4">
          <label htmlFor={`${ids}-link`} className="text-sm font-medium text-stone-700">
            {text.label}
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id={`${ids}-link`}
              readOnly
              value={link}
              onFocus={event => event.currentTarget.select()}
              className="min-w-0 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 py-2.5 font-mono text-xs text-stone-700 outline-none focus:border-[#365DC4]"
            />
            <button
              type="button"
              onClick={() => void copy()}
              disabled={!origin}
              style={actionButtonStyle}
              className="action-button inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
            >
              {copied ? (
                <CheckIcon className="size-4" aria-hidden="true" />
              ) : (
                <CopyIcon className="size-4" aria-hidden="true" />
              )}
              {copied ? text.copied : text.copy}
            </button>
          </div>
          <p role="status" className="sr-only">
            {copied ? text.copied : ''}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {confirming ? (
              <>
                <span className="text-stone-600">{text.rotateConfirm}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void request('rotate')}
                  className="rounded-full px-3 py-1.5 text-[#A94E35] hover:bg-[#F6E5DD]"
                >
                  {pending ? text.creating : text.rotateYes}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-full px-3 py-1.5 text-stone-500 hover:bg-stone-100"
                >
                  {text.cancel}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
              >
                <RefreshIcon className="size-3.5" aria-hidden="true" />
                {text.rotate}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => void request('create')}
          style={actionButtonStyle}
          className="action-button mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
        >
          <LinkIcon className="size-4" aria-hidden="true" />
          {pending ? text.creating : text.create}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
