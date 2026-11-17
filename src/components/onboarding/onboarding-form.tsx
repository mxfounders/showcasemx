'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link, { useRouter } from '@/i18n/navigation';
import { CheckIcon } from '@/components/icons/gota';
import { SiteDraftProgress, useSiteDraft } from '@/components/solutions/use-site-draft';
import {
  newsletterProfiles,
  newsletterRoles,
  type NewsletterProfile,
  type NewsletterRole,
} from '@/lib/newsletter';
import { isDashboardMode } from '@/lib/dashboard/model';
import type { Dictionary } from '@/i18n/dictionary';

type Values = {
  name: string;
  organization: string;
  profile: NewsletterProfile | '';
  role: NewsletterRole | '';
};
const initial: Values = { name: '', organization: '', profile: '', role: '' };
const field =
  'w-full border-0 border-b-2 border-stone-200 bg-transparent px-0 py-3 text-xl text-stone-900 outline-none transition-colors placeholder:text-stone-300 focus:border-[#365DC4] sm:text-2xl';

type Product = 'ai' | 'manual' | 'later';

/**
 * Three questions for everyone; a fourth only for founders («fundador» or «ambos»):
 * add the product now, with AI from the website, by hand, or later. The profile is
 * saved first, so a failure while drafting never loses the onboarding answers.
 */
export function OnboardingForm({
  dict,
  siteDraft,
  ai,
}: {
  dict: Dictionary['onboarding'];
  siteDraft: Dictionary['solutionEditor']['siteDraft'];
  /** Whether AI drafting is configured on the server (ANTHROPIC_API_KEY). */
  ai: boolean;
}) {
  const text = dict.form;
  const titles = [text.title1, text.title2, text.title3, text.title4];
  const router = useRouter();
  const draft = useSiteDraft(siteDraft);
  const [step, setStep] = useState(0),
    [values, setValues] = useState<Values>(initial),
    [product, setProduct] = useState<Product | ''>(''),
    [website, setWebsite] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false);
  const busy = useRef(false),
    saved = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    siteField = useRef<HTMLInputElement>(null),
    progress = useRef<HTMLDivElement>(null),
    form = useRef<HTMLFormElement>(null);
  const founder = values.profile === 'founder' || values.profile === 'both';
  const total = founder ? 4 : 3;
  const products: Product[] = ai ? ['ai', 'manual', 'later'] : ['manual', 'later'];
  const busyDrafting = pending || draft.working || draft.stage === 'done';
  const aiRunning = product === 'ai' && draft.stage !== null;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  // Bring the progress into view as soon as the draft starts.
  useEffect(() => {
    if (draft.stage === 'creating') progress.current?.scrollIntoView({ block: 'nearest' });
  }, [draft.stage]);
  const update = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues(current => ({ ...current, [key]: value }));

  function valid(current: number) {
    if (current === 0 && values.name.trim().length < 2) return text.errorName;
    if (current === 1 && !values.profile) return text.errorProfile;
    if (current === 2 && !values.role) return text.errorRole;
    if (current === 3 && !product) return text.errorProduct;
    return '';
  }

  async function saveProfile() {
    if (saved.current) return;
    const response = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.error || text.errorSave);
    if (isDashboardMode(values.profile)) {
      await fetch('/api/account/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: values.profile }),
        signal: AbortSignal.timeout(15000),
      }).catch(() => {});
    }
    saved.current = true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || draft.working) return;
    const validation = valid(step);
    if (validation) return setError(validation);
    setError('');
    draft.setError('');
    if (step < total - 1) return setStep(current => current + 1);
    busy.current = true;
    setPending(true);
    try {
      await saveProfile();
      if (!founder || product === 'later') {
        router.replace('/account');
        router.refresh();
      } else if (product === 'manual') {
        const id = await draft.ensureDraft();
        if (id) router.replace(`/account/solutions/${id}`);
      } else if (!(await draft.start(website))) {
        siteField.current?.focus();
      }
    } catch (submitError) {
      const name = submitError instanceof Error ? submitError.name : '';
      setError(
        submitError instanceof Error && !['TypeError', 'TimeoutError', 'SyntaxError'].includes(name)
          ? submitError.message
          : text.errorGeneric,
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  function keyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (pending || event.nativeEvent.isComposing) return;
    const target = event.target as HTMLElement;
    const typing = target instanceof HTMLInputElement;
    if (step === 1 && !typing && /^[a-d]$/i.test(event.key)) {
      const option = newsletterProfiles[event.key.toLowerCase().charCodeAt(0) - 97];
      if (option) {
        update('profile', option.value);
        setError('');
      }
      return;
    }
    if (step === 2 && !typing && /^[a-f]$/i.test(event.key)) {
      const option = newsletterRoles[event.key.toLowerCase().charCodeAt(0) - 97];
      if (option) {
        update('role', option.value);
        setError('');
      }
      return;
    }
    if (step === 3 && !typing && /^[a-c]$/i.test(event.key)) {
      const option = products[event.key.toLowerCase().charCodeAt(0) - 97];
      if (option) {
        setProduct(option);
        setError('');
      }
      return;
    }
    if (event.key !== 'Enter' || target instanceof HTMLButtonElement) return;
    event.preventDefault();
    form.current?.requestSubmit();
  }

  return (
    <form
      ref={form}
      noValidate
      aria-label={text.ariaLabel}
      aria-busy={busyDrafting}
      onSubmit={submit}
      onKeyDown={keyDown}
    >
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        className="mb-10 h-1 w-full rounded-full bg-stone-200"
      >
        <div
          className="h-1 rounded-full bg-[#365DC4] transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${(step + 1) * (100 / total)}%` }}
        />
      </div>
      <p aria-live="polite" className="mb-3 text-sm text-stone-400">
        {text.step.replace('{step}', (step + 1).toString()).replace('{total}', String(total))}
      </p>

      <div key={step} className="contact-step min-h-[380px]">
        <h1
          ref={heading}
          tabIndex={-1}
          id="onboarding-question"
          className="max-w-xl text-3xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-900 outline-none sm:text-5xl"
        >
          {titles[step]}
        </h1>

        {step === 0 && (
          <div className="mt-10 space-y-8">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-500">
                {text.nameLabel}
              </span>
              <input
                autoFocus
                value={values.name}
                onChange={event => update('name', event.target.value)}
                maxLength={100}
                placeholder={text.namePlaceholder}
                className={field}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-stone-500">
                {text.companyLabel}
              </span>
              <input
                value={values.organization}
                onChange={event => update('organization', event.target.value)}
                maxLength={120}
                placeholder={text.companyPlaceholder}
                className={field}
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <fieldset
            aria-labelledby="onboarding-question"
            className="mt-10 grid gap-3 sm:grid-cols-2"
          >
            <legend className="sr-only">{text.profileLegend}</legend>
            {newsletterProfiles.map((option, index) => {
              const selected = values.profile === option.value;
              return (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="profile"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      update('profile', option.value);
                      setError('');
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-28 gap-3 rounded-2xl border border-stone-200 bg-white/40 p-4 transition-[border-color,background-color,transform] hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-reduce:transform-none">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs ${selected ? 'border-[#365DC4] bg-[#365DC4] text-white' : 'border-current text-stone-500'}`}
                    >
                      {selected ? (
                        <CheckIcon className="size-4" aria-hidden="true" />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <span>
                      <strong className="block text-sm font-medium text-stone-800">
                        {text.profiles[option.value].label}
                      </strong>
                      <span className="mt-1.5 block text-xs leading-relaxed text-stone-500">
                        {text.profiles[option.value].detail}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {step === 2 && (
          <fieldset
            aria-labelledby="onboarding-question"
            className="mt-10 grid gap-3 sm:grid-cols-2"
          >
            <legend className="sr-only">{text.roleLegend}</legend>
            {newsletterRoles.map((option, index) => {
              const selected = values.role === option.value;
              return (
                <label key={option.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={selected}
                    onChange={() => {
                      update('role', option.value);
                      setError('');
                    }}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-16 items-center gap-3 rounded-2xl border border-stone-200 bg-white/40 p-4 transition-[border-color,background-color,transform] hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4] motion-reduce:transform-none">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs ${selected ? 'border-[#365DC4] bg-[#365DC4] text-white' : 'border-current text-stone-500'}`}
                    >
                      {selected ? (
                        <CheckIcon className="size-4" aria-hidden="true" />
                      ) : (
                        String.fromCharCode(65 + index)
                      )}
                    </span>
                    <strong className="text-sm font-medium text-stone-800">
                      {text.roles[option.value]}
                    </strong>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {step === 3 && (
          <>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-stone-500">
              {text.productHint}
            </p>
            <fieldset
              aria-labelledby="onboarding-question"
              disabled={busyDrafting}
              className="mt-6 grid gap-3"
            >
              <legend className="sr-only">{text.productLegend}</legend>
              {products.map((option, index) => {
                const selected = product === option;
                // While the draft is being prepared only the chosen card stays, so the
                // progress sits right under it instead of below the fold.
                if (aiRunning && !selected) return null;
                return (
                  <div key={option}>
                    <label className="cursor-pointer">
                      <input
                        type="radio"
                        name="product"
                        value={option}
                        checked={selected}
                        onChange={() => {
                          setProduct(option);
                          setError('');
                          draft.setError('');
                        }}
                        className="peer sr-only"
                      />
                      <span className="flex gap-3 rounded-2xl border border-stone-200 bg-white/40 px-4 py-3.5 transition-[border-color,background-color] hover:border-[#9BB0E7] peer-checked:border-[#365DC4] peer-checked:bg-[#E4EBFC] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#365DC4]">
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs ${selected ? 'border-[#365DC4] bg-[#365DC4] text-white' : 'border-current text-stone-500'}`}
                        >
                          {selected ? (
                            <CheckIcon className="size-4" aria-hidden="true" />
                          ) : (
                            String.fromCharCode(65 + index)
                          )}
                        </span>
                        <span>
                          <strong className="block text-sm font-medium text-stone-800">
                            {text.products[option].label}
                          </strong>
                          <span className="mt-1 block text-xs leading-relaxed text-stone-500">
                            {text.products[option].detail}
                          </span>
                        </span>
                      </span>
                    </label>
                    {option === 'ai' && selected && (
                      <div className="mt-2 rounded-2xl border border-[#365DC4]/20 bg-white/60 px-4 pb-4 pt-3">
                        <label className="block">
                          <span className="block text-sm font-medium text-stone-500">
                            {siteDraft.urlLabel}
                          </span>
                          <input
                            ref={siteField}
                            autoFocus
                            type="url"
                            inputMode="url"
                            autoComplete="url"
                            value={website}
                            maxLength={480}
                            placeholder={siteDraft.placeholder}
                            aria-invalid={Boolean(draft.error) || undefined}
                            onChange={event => {
                              setWebsite(event.target.value);
                              draft.setError('');
                            }}
                            className={field}
                          />
                        </label>
                        <p className="mt-3 text-xs leading-relaxed text-stone-400">
                          {siteDraft.privacy}{' '}
                          <Link
                            href="/privacidad#subprocesadores"
                            className="underline underline-offset-2"
                          >
                            {siteDraft.privacyLink}
                          </Link>
                        </p>
                        <div ref={progress}>
                          <SiteDraftProgress
                            dict={siteDraft}
                            stage={draft.stage}
                            pages={draft.pages}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>
          </>
        )}
      </div>

      {(error || draft.error) && (
        <div className="mt-6">
          <p role="alert" className="text-sm text-[#A94E35]">
            {error || draft.error}
          </p>
          {!error && draft.serverError && (
            <div className="mt-3 flex flex-wrap gap-3">
              {draft.hasDraft && (
                <Link
                  href={`/account/solutions/${draft.draftId()}`}
                  className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 shadow-sm hover:bg-stone-50"
                >
                  {siteDraft.continueManual}
                </Link>
              )}
              <Link
                href="/account"
                className="rounded-full px-4 py-2 text-sm text-[#365DC4] hover:underline"
              >
                {text.goHome}
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 flex items-center gap-4">
        <button
          type="submit"
          disabled={busyDrafting}
          style={{ backgroundColor: '#E4EBFC', color: '#365DC4' }}
          className="action-button rounded-full px-7 py-3.5 text-sm font-medium disabled:opacity-50"
        >
          {draft.working
            ? siteDraft.working
            : pending
              ? text.saving
              : step < total - 1
                ? text.continue
                : step === 3 && product === 'ai'
                  ? text.startAi
                  : step === 3 && product === 'manual'
                    ? text.startManual
                    : text.finish}
        </button>
        <span className="text-xs text-stone-400 motion-reduce:transition-none">
          {text.pressEnter}
        </span>
      </div>
    </form>
  );
}
