'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

type Enrolment = { secret: string; qrDataUri: string; backupCodes: string[] };
type Stage = 'idle' | 'password' | 'scan' | 'disable' | 'regenerate';

const field =
  'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';

/**
 * Enabling asks for the password again, then shows the QR once. The factor only
 * becomes active after a code generated from that secret is accepted, so closing
 * the page halfway leaves the account exactly as it was.
 */
export function TwoFactor({
  enabled,
  available,
  dict,
}: {
  enabled: boolean;
  available: boolean;
  dict: Dictionary['settings']['security']['twoFactor'];
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function call(payload: Record<string, unknown>) {
    const response = await fetch('/api/account/totp', {
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
    try {
      await work();
    } catch (failure) {
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
  function reset() {
    setStage('idle');
    setPassword('');
    setCode('');
    setEnrolment(null);
    setCodes(null);
    setSaved(false);
    setError('');
  }

  const backupList = (list: string[]) => (
    <div className="rounded-xl border border-[#E8D9A8] bg-[#FBF6E7] p-4">
      <p className="text-xs font-semibold text-[#88631B]">{dict.backupTitle}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-xs text-[#6B4E15] sm:grid-cols-5">
        {list.map(item => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText(list.join('\n'))
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => setError(dict.copyError));
        }}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#E8D9A8] bg-white px-3 py-1.5 text-xs font-medium text-[#88631B] transition-colors hover:bg-[#FBF6E7]"
      >
        {copied ? (
          <>
            <Check aria-hidden="true" className="size-3.5" />
            {dict.copied}
          </>
        ) : (
          <>
            <Copy aria-hidden="true" className="size-3.5" />
            {dict.copy}
          </>
        )}
      </button>
    </div>
  );

  if (!available) {
    const [beforeKey, afterKey] = dict.unavailable.split('{key}');
    return (
      <p className="text-sm leading-relaxed text-stone-500">
        {beforeKey}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">AUTH_TOTP_KEY</code>
        {afterKey}
      </p>
    );
  }

  // Already protected: offer new backup codes or turning it off, both with the password.
  if (enabled && stage === 'idle')
    return (
      <div className="space-y-5">
        <p className="inline-flex items-center gap-2 rounded-full bg-[#E7F0E9] px-3 py-1.5 text-sm font-medium text-[#416B50]">
          <ShieldCheck aria-hidden="true" className="size-4" />
          {dict.active}
        </p>
        <p className="text-sm leading-relaxed text-stone-500">{dict.activeDesc}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => setStage('regenerate')}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            {dict.regenerate}
          </button>
          <button
            type="button"
            onClick={() => setStage('disable')}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50/60 px-5 py-2.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-50"
          >
            <ShieldOff aria-hidden="true" className="size-4" />
            {dict.disable}
          </button>
        </div>
        {codes && (
          <>
            {backupList(codes)}
            <p className="text-xs text-stone-500">{dict.previousInvalid}</p>
          </>
        )}
      </div>
    );

  if (stage === 'disable' || stage === 'regenerate') {
    const disabling = stage === 'disable';
    return (
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          run(async () => {
            const result = await call({ action: disabling ? 'disable' : 'regenerate', password });
            if (disabling) {
              reset();
              router.refresh();
            } else {
              setCodes(result.backupCodes as string[]);
              setStage('idle');
              setPassword('');
            }
          });
        }}
      >
        <p className="text-sm leading-relaxed text-stone-600">
          {disabling ? dict.disableDesc : dict.regenerateDesc}
        </p>
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
        {error && (
          <p role="alert" className="text-sm text-[#A94E35]">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            {dict.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            style={disabling ? undefined : actionButtonStyle}
            className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60 ${disabling ? 'bg-red-600 text-white hover:bg-red-700' : 'action-button'}`}
          >
            {pending ? dict.confirming : disabling ? dict.disableSubmit : dict.regenerateSubmit}
          </button>
        </div>
      </form>
    );
  }

  if (stage === 'password')
    return (
      <form
        className="space-y-4"
        onSubmit={event => {
          event.preventDefault();
          run(async () => {
            const result = await call({ action: 'start', password });
            setEnrolment({
              secret: result.secret,
              qrDataUri: result.qrDataUri,
              backupCodes: result.backupCodes,
            });
            setStage('scan');
            setPassword('');
          });
        }}
      >
        <p className="text-sm leading-relaxed text-stone-600">{dict.passwordPrompt}</p>
        <label className="block text-sm font-medium text-stone-700">
          {dict.currentPassword}
          <input
            type="password"
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={event => {
              setPassword(event.target.value);
              setError('');
            }}
            className={`mt-2 ${field}`}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-[#A94E35]">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            {dict.cancel}
          </button>
          <button
            type="submit"
            disabled={pending}
            style={actionButtonStyle}
            className="action-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {pending ? dict.generating : dict.continue}
          </button>
        </div>
      </form>
    );

  if (stage === 'scan' && enrolment)
    return (
      <form
        className="space-y-5"
        onSubmit={event => {
          event.preventDefault();
          run(async () => {
            await call({ action: 'confirm', code });
            reset();
            router.refresh();
          });
        }}
      >
        <ol className="space-y-5">
          <li>
            <p className="text-sm font-medium text-stone-700">{dict.scanStep}</p>
            <div className="mt-3 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enrolment.qrDataUri}
                alt={dict.qrAlt}
                width={180}
                height={180}
                className="rounded-xl border border-stone-200"
              />
              <div className="min-w-0">
                <p className="text-xs text-stone-500">{dict.manualKey}</p>
                <code className="mt-2 block break-all rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs">
                  {enrolment.secret}
                </code>
                <p className="mt-2 text-xs text-stone-400">{dict.apps}</p>
              </div>
            </div>
          </li>
          <li>
            <p className="mb-3 text-sm font-medium text-stone-700">{dict.saveStep}</p>
            {backupList(enrolment.backupCodes)}
            <label className="mt-4 flex items-start gap-2.5 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={saved}
                onChange={event => setSaved(event.target.checked)}
                className="mt-0.5"
              />
              {dict.savedConfirm}
            </label>
          </li>
          <li>
            <label className="block text-sm font-medium text-stone-700">
              {dict.codeStep}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                disabled={!saved}
                value={code}
                onChange={event => {
                  setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                  setError('');
                }}
                placeholder="123456"
                className={`mt-2 ${field} max-w-[220px] text-center text-lg tracking-[0.3em] disabled:bg-stone-50 disabled:text-stone-400`}
              />
            </label>
          </li>
        </ol>
        {error && (
          <p role="alert" className="text-sm text-[#A94E35]">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            {dict.cancel}
          </button>
          <button
            type="submit"
            disabled={pending || !saved}
            style={actionButtonStyle}
            className="action-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {pending ? dict.activating : dict.activate}
          </button>
        </div>
      </form>
    );

  return (
    <div className="space-y-5">
      <p className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-600">
        <ShieldOff aria-hidden="true" className="size-4" />
        {dict.inactive}
      </p>
      <p className="text-sm leading-relaxed text-stone-500">{dict.inactiveDesc}</p>
      <button
        type="button"
        onClick={() => setStage('password')}
        style={actionButtonStyle}
        className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
      >
        <ShieldCheck aria-hidden="true" className="size-4" />
        {dict.enable}
      </button>
    </div>
  );
}
