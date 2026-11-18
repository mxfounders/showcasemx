'use client';
import { useEffect, useRef, useState } from 'react';
import {
  browserSupportsWebAuthn,
  sendSignal,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser';
import Link, { useRouter } from '@/i18n/navigation';
import { CheckIcon, FingerprintIcon, PlusIcon, TrashIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

export type PasskeyRow = {
  id: string;
  name: string;
  synced: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

const field =
  'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';

const when = (value: string, locale: string) =>
  new Date(value).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** An error the browser raised during the ceremony, as opposed to one our server sent back. */
class CeremonyError extends Error {
  constructor(readonly code: string | undefined) {
    super('ceremony');
  }
}

/**
 * The account's passkeys (SHCWS-158). Adding one re-asks for the password (and a code when
 * two-step verification is on), then lets the device create it; the server keeps only its
 * public key. Removing one asks for the password and closes the sessions opened with it.
 */
export function Passkeys({
  passkeys,
  available,
  emailVerified,
  twoStep,
  max,
  dict,
  dateLocale,
}: {
  passkeys: PasskeyRow[];
  /** False where the page isn't served from shwcs's own address (previews, other hosts). */
  available: boolean;
  /** Adding one needs a confirmed email, like two-step verification (SHCWS-173). */
  emailVerified: boolean;
  /** Two-step verification is on: adding a passkey also asks for a code. */
  twoStep: boolean;
  max: number;
  dict: Dictionary['settings']['security']['passkeys'];
  dateLocale: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [supported, setSupported] = useState(true);
  const [stage, setStage] = useState<'idle' | 'add' | 'remove'>('idle');
  const [target, setTarget] = useState<PasskeyRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  useEffect(() => setSupported(browserSupportsWebAuthn()), []);

  function reset() {
    setStage('idle');
    setTarget(null);
    setPassword('');
    setCode('');
    setName('');
    setError('');
  }

  async function call(payload: Record<string, unknown>) {
    const response = await fetch('/api/account/passkeys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) throw new Error(result.error || dict.callError);
    return result;
  }

  async function run(work: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (failure) {
      if (failure instanceof CeremonyError)
        setError(
          failure.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED'
            ? dict.alreadyOnDevice
            : dict.cancelled,
        );
      else
        setError(
          failure instanceof Error &&
            !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name)
            ? failure.message
            : dict.genericError,
        );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  const add = () =>
    run(async () => {
      const { options } = (await call({ action: 'options', password, code })) as {
        options: PublicKeyCredentialCreationOptionsJSON;
      };
      let credential: unknown;
      try {
        credential = await startRegistration({ optionsJSON: options });
      } catch (failure) {
        throw new CeremonyError((failure as { code?: string } | null)?.code);
      }
      const result = await call({ action: 'register', credential, name });
      reset();
      setNotice(dict.added.replace('{name}', String(result.passkey?.name ?? '')));
      router.refresh();
    });

  const remove = (passkey: PasskeyRow) =>
    run(async () => {
      const result = await call({ action: 'delete', id: passkey.id, password });
      // Best-effort: a password manager that supports it stops offering the removed passkey.
      if (result.signal)
        sendSignal({ signalName: 'allAcceptedCredentials', ...result.signal }).catch(
          () => undefined,
        );
      reset();
      setNotice(dict.removed.replace('{name}', passkey.name));
      router.refresh();
    });

  const passwordField = (
    <label className="block text-sm font-medium text-stone-700">
      {dict.currentPassword}
      <input
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={event => {
          setPassword(event.target.value);
          setError('');
        }}
        className={`mt-2 ${field}`}
      />
    </label>
  );
  const errorLine = error && (
    <p role="alert" className="text-sm text-[#A94E35]">
      {error}
    </p>
  );
  const cancelButton = (
    <button
      type="button"
      onClick={reset}
      className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
    >
      {dict.cancel}
    </button>
  );

  return (
    <div className="space-y-5">
      {passkeys.length ? (
        <ul className="divide-y divide-stone-200 border-y border-stone-200">
          {passkeys.map(passkey => (
            <li key={passkey.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E4EBFC] text-[#365DC4]">
                  <FingerprintIcon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 break-all text-sm font-medium text-stone-900">
                    {passkey.name}
                    {passkey.synced && (
                      <span
                        title={dict.syncedHint}
                        className="rounded-full bg-[#E7F0E9] px-2.5 py-0.5 text-[11px] font-medium text-[#416B50]"
                      >
                        {dict.synced}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {dict.created.replace('{date}', when(passkey.createdAt, dateLocale))}
                    {' · '}
                    {passkey.lastUsedAt
                      ? dict.lastUsed.replace('{date}', when(passkey.lastUsedAt, dateLocale))
                      : dict.neverUsed}
                  </p>
                </div>
              </div>
              {!(stage === 'remove' && target?.id === passkey.id) && (
                <button
                  type="button"
                  disabled={pending}
                  aria-label={dict.removeLabel.replace('{name}', passkey.name)}
                  onClick={() => {
                    reset();
                    setNotice('');
                    setTarget(passkey);
                    setStage('remove');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
                >
                  <TrashIcon aria-hidden="true" className="size-3.5" />
                  {dict.remove}
                </button>
              )}
              {stage === 'remove' && target?.id === passkey.id && (
                <form
                  className="w-full space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4"
                  onSubmit={event => {
                    event.preventDefault();
                    remove(passkey);
                  }}
                >
                  <p className="text-sm leading-relaxed text-stone-600">
                    {dict.removeDesc.replace('{name}', passkey.name)}
                  </p>
                  {passwordField}
                  {errorLine}
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    {cancelButton}
                    <button
                      type="submit"
                      disabled={pending}
                      className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {pending ? dict.removing : dict.removeSubmit}
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-stone-500">{dict.empty}</p>
      )}

      {notice && (
        <p role="status" className="inline-flex items-center gap-2 text-sm text-[#416B50]">
          <CheckIcon aria-hidden="true" className="size-4" />
          {notice}
        </p>
      )}

      {!available ? (
        <p className="text-sm leading-relaxed text-stone-500">{dict.unavailable}</p>
      ) : !supported ? (
        <p className="text-sm leading-relaxed text-stone-500">{dict.unsupported}</p>
      ) : !emailVerified ? (
        <p className="text-sm leading-relaxed text-stone-500">{dict.verifyEmailFirst}</p>
      ) : passkeys.length >= max ? (
        <p className="text-sm text-stone-500">{dict.limit.replace('{count}', String(max))}</p>
      ) : stage === 'add' ? (
        <form
          className="space-y-4"
          aria-busy={pending}
          onSubmit={event => {
            event.preventDefault();
            add();
          }}
        >
          <p className="text-sm leading-relaxed text-stone-600">
            {twoStep ? dict.addPromptCode : dict.addPrompt}
          </p>
          <label className="block text-sm font-medium text-stone-700">
            {dict.nameLabel}
            <input
              maxLength={60}
              autoComplete="off"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder={dict.namePlaceholder}
              aria-describedby="passkey-name-hint"
              className={`mt-2 ${field}`}
            />
          </label>
          <p id="passkey-name-hint" className="-mt-2 text-xs text-stone-500">
            {dict.nameHint}
          </p>
          {passwordField}
          {twoStep && (
            <label className="block text-sm font-medium text-stone-700">
              {dict.codeLabel}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={event => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 8));
                  setError('');
                }}
                placeholder="123456"
                className={`mt-2 block ${field} max-w-[220px] tracking-[0.2em]`}
              />
            </label>
          )}
          <Link
            href="/forgot-password"
            className="inline-block text-xs font-medium text-[#365DC4] hover:underline"
          >
            {dict.noPassword}
          </Link>
          {errorLine}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            {cancelButton}
            <button
              type="submit"
              disabled={pending}
              style={actionButtonStyle}
              className="action-button inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium disabled:cursor-wait disabled:opacity-60"
            >
              <FingerprintIcon aria-hidden="true" className="size-4" />
              {pending ? dict.creating : dict.createSubmit}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            reset();
            setNotice('');
            setStage('add');
          }}
          style={actionButtonStyle}
          className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          {dict.add}
        </button>
      )}
    </div>
  );
}
