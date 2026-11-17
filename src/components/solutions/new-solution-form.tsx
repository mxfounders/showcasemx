'use client';
import { useId, useRef, useState } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { ArrowRightIcon, LinkIcon, SparklesIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { safeSolutionUrl } from '@/lib/solutions/model';
import { SiteDraftProgress, useSiteDraft } from './use-site-draft';
import type { Dictionary } from '@/i18n/dictionary';

type EditorDict = Dictionary['solutionEditor'];

/** «cordhq.app» → «https://cordhq.app»: nobody should have to type the scheme. */
function withScheme(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/**
 * The first screen of a new listing: just the link. With AI available (docs/site-draft.md)
 * «Empezar» reads the site and drafts the whole listing, showing the real progress, and
 * filling it by hand stays one click away. Without it, the draft is created with the link
 * and the editor reads the site's own name, description and cover straight away.
 */
export function NewSolutionForm({
  dict,
  siteDraft,
  ai,
}: {
  dict: EditorDict['newPage'];
  siteDraft: EditorDict['siteDraft'];
  /** Whether the AI draft is configured on this deployment. */
  ai: boolean;
}) {
  const router = useRouter();
  const ids = useId();
  const field = useRef<HTMLInputElement>(null);
  const draft = useSiteDraft(siteDraft);
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const working = pending || draft.working || draft.stage === 'done';
  const shownError = error || draft.error;

  function validUrl() {
    const url = safeSolutionUrl(withScheme(website));
    if (!url) {
      setError(dict.invalid);
      field.current?.focus();
    }
    return url;
  }

  /** Creates the draft with its link and opens the editor (the same draft on a retry). */
  async function startByHand() {
    if (working) return;
    const url = validUrl();
    if (!url) return;
    setPending(true);
    setError('');
    draft.setError('');
    const id = await draft.ensureDraft(url, {
      quiet: true,
      failure: ai ? siteDraft.errors.failed : dict.error,
    });
    if (id) router.push(`/account/solutions/${id}`);
    else setPending(false);
  }

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (!ai) {
      void startByHand();
      return;
    }
    if (working) return;
    const url = validUrl();
    if (!url) return;
    setError('');
    await draft.start(url);
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={start} noValidate>
        <label htmlFor={`${ids}-url`} className="text-sm font-medium text-stone-800">
          {dict.websiteLabel}
        </label>
        <div className="mt-2 flex flex-col gap-2 rounded-[22px] border border-stone-300 bg-white p-2 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.25)] focus-within:border-[#365DC4] focus-within:ring-1 focus-within:ring-[#365DC4] sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 items-center gap-2 pl-3">
            <LinkIcon aria-hidden="true" className="size-4 shrink-0 text-stone-400" />
            <input
              ref={field}
              id={`${ids}-url`}
              type="url"
              inputMode="url"
              autoComplete="url"
              autoFocus
              required
              value={website}
              maxLength={480}
              disabled={working}
              placeholder={dict.placeholder}
              aria-invalid={!!shownError}
              aria-describedby={`${ids}-hint ${shownError ? `${ids}-error` : ''}`}
              onChange={event => {
                setWebsite(event.target.value);
                setError('');
                draft.setError('');
              }}
              className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none placeholder:text-stone-400 disabled:text-stone-500"
            />
          </span>
          <button
            type="submit"
            disabled={working}
            style={actionButtonStyle}
            className="action-button inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium disabled:opacity-60"
          >
            {pending ? dict.creating : draft.working ? siteDraft.working : dict.cta}
            <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
          </button>
        </div>
        <p id={`${ids}-hint`} className="mt-3 text-xs text-stone-500">
          {dict.noWebsite}
        </p>
      </form>
      {ai && (
        <p className="mt-5 flex gap-2 text-sm leading-relaxed text-stone-600">
          <SparklesIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#365DC4]" />
          <span>
            {siteDraft.aiNote}{' '}
            <button
              type="button"
              disabled={working}
              onClick={() => void startByHand()}
              className="font-medium text-[#365DC4] underline-offset-2 hover:underline disabled:opacity-50"
            >
              {siteDraft.manualTitle}
            </button>
          </span>
        </p>
      )}
      <SiteDraftProgress dict={siteDraft} stage={draft.stage} pages={draft.pages} />
      {shownError && (
        <div className="mt-4">
          <p id={`${ids}-error`} role="alert" className="text-sm text-[#A94E35]">
            {shownError}
          </p>
          {ai && !error && draft.serverError && !pending && (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void draft.start(withScheme(website))}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50"
              >
                {siteDraft.retry}
              </button>
              {draft.hasDraft && (
                <Link
                  href={`/account/solutions/${draft.draftId()}`}
                  className="rounded-full px-4 py-2 text-sm text-[#365DC4] hover:underline"
                >
                  {siteDraft.continueManual}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
      {ai && (
        <p className="mt-6 text-xs leading-relaxed text-stone-400">
          {siteDraft.privacy}{' '}
          <Link href="/privacidad#subprocesadores" className="underline underline-offset-2">
            {siteDraft.privacyLink}
          </Link>
        </p>
      )}
    </div>
  );
}
