'use client';

import { useEffect, useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { useLocale } from '@/i18n/use-locale';
import { commonText } from '@/i18n/common';
import { CloseIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { analyticsConfigured, setConsent, storedConsent } from '@/lib/analytics/client';
import { consentPreferencesEvent, type Consent } from '@/lib/analytics/consent';
import type { Dictionary } from '@/i18n/dictionary';

const focusStyle =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]';

type BannerState = { open: boolean; current: Consent | null };

/**
 * Asks once whether PostHog may run, with accepting and declining equally easy.
 * Rendered only in the browser: the answer lives in a cookie, and reading it on the
 * server would make every static page dynamic.
 */
export function ConsentBanner({ dict }: { dict: Dictionary['consent'] }) {
  const [state, setState] = useState<BannerState>({ open: false, current: null });
  const heading = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!analyticsConfigured) return;
    if (!storedConsent()) setState({ open: true, current: null });
    const reopen = () => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setState({ open: true, current: storedConsent() });
      requestAnimationFrame(() => heading.current?.focus());
    };
    window.addEventListener(consentPreferencesEvent, reopen);
    return () => window.removeEventListener(consentPreferencesEvent, reopen);
  }, []);

  if (!state.open) return null;

  const close = () => {
    setState(previous => ({ ...previous, open: false }));
    opener.current?.focus();
    opener.current = null;
  };
  const decide = (consent: Consent) => {
    close();
    setConsent(consent);
  };

  return (
    <section
      aria-labelledby="consent-title"
      onKeyDown={event => {
        // Without a decision yet there is nothing to fall back to, so Escape keeps it open.
        if (event.key === 'Escape' && state.current) close();
      }}
      className="consent-banner fixed inset-x-4 bottom-4 z-[60] rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_12px_40px_-12px_rgba(28,25,23,0.25)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
    >
      <div className="flex items-start justify-between gap-4">
        <h2
          id="consent-title"
          ref={heading}
          tabIndex={-1}
          className="text-sm font-semibold text-stone-900 outline-none"
        >
          {dict.title}
        </h2>
        {state.current && (
          <button
            type="button"
            onClick={close}
            aria-label={dict.close}
            className={`-m-2 rounded-full p-2 text-stone-400 transition-colors hover:text-stone-900 ${focusStyle}`}
          >
            <CloseIcon className="size-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-stone-500">
        {dict.body}{' '}
        <Link
          href="/cookies#analitica"
          className={`rounded font-medium text-[#365DC4] hover:underline ${focusStyle}`}
        >
          {dict.learnMore}
        </Link>
      </p>
      {state.current && (
        <p className="mt-2 text-[13px] font-medium text-stone-700">{dict.current[state.current]}</p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => decide('denied')}
          className={`rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 active:translate-y-px ${focusStyle}`}
        >
          {dict.reject}
        </button>
        <button
          type="button"
          onClick={() => decide('granted')}
          style={actionButtonStyle}
          className={`action-button rounded-full px-4 py-2.5 text-sm font-medium ${focusStyle}`}
        >
          {dict.accept}
        </button>
      </div>
    </section>
  );
}

/** Reopens the banner so a visitor can change their answer. Hidden when analytics is off. */
export function ConsentPreferencesButton({ className }: { className?: string }) {
  const locale = useLocale();
  if (!analyticsConfigured) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(consentPreferencesEvent))}
      className={className}
    >
      {commonText(locale).cookiePreferences}
    </button>
  );
}
