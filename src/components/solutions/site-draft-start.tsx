'use client';
import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { ArrowRightIcon, SparklesIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { solutionInput } from './profile-editor';
import { SiteDraftProgress, useSiteDraft } from './use-site-draft';
import type { Dictionary } from '@/i18n/dictionary';

type Dict = Dictionary['solutionEditor']['siteDraft'];

/**
 * Entry to the AI draft on «Nueva solución»: one field for the website, then the
 * real progress of `useSiteDraft` (creating → reading → drafting → done).
 */
export function SiteDraftStart({ dict }: { dict: Dict }) {
  const draft = useSiteDraft(dict);
  const field = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');

  async function start() {
    if (!(await draft.start(url))) field.current?.focus();
  }

  return (
    <section
      aria-labelledby="site-draft-title"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2
        id="site-draft-title"
        className="flex items-center gap-2 text-xl font-semibold tracking-tight"
      >
        <SparklesIcon className="size-5 text-[#365DC4]" aria-hidden="true" />
        {dict.title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-500">{dict.description}</p>
      <form
        noValidate
        className="mt-6"
        onSubmit={event => {
          event.preventDefault();
          void start();
        }}
      >
        <label className="block text-sm">
          {dict.urlLabel}
          <input
            ref={field}
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            maxLength={480}
            disabled={draft.working}
            placeholder={dict.placeholder}
            aria-invalid={Boolean(draft.error) || undefined}
            aria-describedby={draft.error ? 'site-draft-error' : 'site-draft-hint'}
            onChange={event => {
              setUrl(event.target.value);
              draft.setError('');
            }}
            className={solutionInput}
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={draft.working || draft.stage === 'done'}
            style={actionButtonStyle}
            className="action-button inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium disabled:opacity-60"
          >
            {draft.working ? dict.working : dict.cta}
            <ArrowRightIcon className="button-arrow size-4" aria-hidden="true" />
          </button>
          <span id="site-draft-hint" className="text-xs text-stone-400">
            {dict.hint}
          </span>
        </div>
      </form>
      <SiteDraftProgress dict={dict} stage={draft.stage} pages={draft.pages} />
      {draft.partial && <p className="mt-4 text-sm text-stone-600">{dict.partialNotice}</p>}
      {draft.error && (
        <div className="mt-5">
          <p id="site-draft-error" role="alert" className="text-sm text-[#A94E35]">
            {draft.error}
          </p>
          {draft.serverError && (
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void start()}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50"
              >
                {dict.retry}
              </button>
              {draft.hasDraft && (
                <Link
                  href={`/account/solutions/${draft.draftId()}`}
                  className="rounded-full px-4 py-2 text-sm text-[#365DC4] hover:underline"
                >
                  {dict.continueManual}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
      <p className="mt-6 border-t border-stone-100 pt-4 text-xs leading-relaxed text-stone-400">
        {dict.privacy}{' '}
        <Link href="/privacidad#subprocesadores" className="underline underline-offset-2">
          {dict.privacyLink}
        </Link>
      </p>
    </section>
  );
}
