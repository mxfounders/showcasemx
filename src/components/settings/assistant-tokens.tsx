'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { CheckIcon, CopyIcon, PlusIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

export type AssistantTokenView = {
  id: string;
  name: string;
  hint: string;
  status: 'active' | 'revoked' | 'expired' | 'passwordChanged';
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
};

const LIFETIMES = [7, 30, 90, 365] as const;
const field =
  'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
const secondary =
  'inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50';

/**
 * Personal tokens for the founder's AI assistant (SHCWS-152). Creating and revoking ask
 * for the password again (and a second-factor code to create, when the account has one).
 * A new token's secret is shown once, here, and never again.
 */
export function AssistantTokens({
  tokens,
  twoStep,
  mcpUrl,
  dict,
  dateLocale,
}: {
  tokens: AssistantTokenView[];
  twoStep: boolean;
  mcpUrl: string;
  dict: Dictionary['assistant']['card'];
  dateLocale: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [creating, setCreating] = useState(false);
  const [days, setDays] = useState<number>(90);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState('');
  const date = (value: string) =>
    new Date(value).toLocaleDateString(dateLocale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  async function send(payload: Record<string, unknown>) {
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/account/assistant-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true)
        throw new Error(result.error || dict.errors.unavailable);
      router.refresh();
      return result as { ok: true; token?: string };
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message ? failure.message : dict.errors.unavailable,
      );
      return null;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  async function copy(value: string, marker: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(marker);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* the text stays selectable */
    }
  }

  const command = `claude mcp add --transport http shwcs ${mcpUrl} --header "Authorization: Bearer ${secret}"`;

  return (
    <div className="space-y-5">
      {secret && (
        <div
          role="status"
          className="space-y-4 rounded-2xl border border-[#E8D9A8] bg-[#FBF6E7] p-5"
        >
          <div>
            <p className="font-medium text-[#6B4E15]">{dict.created.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[#88631B]">{dict.created.body}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#88631B]">{dict.created.label}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-[#E8D9A8] bg-white px-3 py-2.5 font-mono text-xs text-stone-800">
                {secret}
              </code>
              <button
                type="button"
                onClick={() => copy(secret, 'token')}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#E8D9A8] bg-white px-4 py-2 text-xs font-medium text-[#88631B] transition-colors hover:bg-[#FBF6E7]"
              >
                {copied === 'token' ? (
                  <CheckIcon aria-hidden="true" className="size-3.5" />
                ) : (
                  <CopyIcon aria-hidden="true" className="size-3.5" />
                )}
                {copied === 'token' ? dict.created.copied : dict.created.copy}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#88631B]">{dict.created.next}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 break-all rounded-xl border border-[#E8D9A8] bg-white px-3 py-2.5 font-mono text-xs text-stone-700">
                {command}
              </code>
              <button
                type="button"
                onClick={() => copy(command, 'command')}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#E8D9A8] bg-white px-4 py-2 text-xs font-medium text-[#88631B] transition-colors hover:bg-[#FBF6E7]"
              >
                {copied === 'command' ? (
                  <CheckIcon aria-hidden="true" className="size-3.5" />
                ) : (
                  <CopyIcon aria-hidden="true" className="size-3.5" />
                )}
                {copied === 'command' ? dict.created.copied : dict.created.copy}
              </button>
            </div>
          </div>
          <button type="button" onClick={() => setSecret('')} className={secondary}>
            {dict.created.done}
          </button>
        </div>
      )}

      {tokens.length ? (
        <ul className="divide-y divide-stone-100 rounded-2xl border border-stone-200">
          {tokens.map(token => (
            <li key={token.id} className="space-y-3 px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-stone-900">
                    <span className="break-words">{token.name}</span>
                    <span className="font-mono text-xs font-normal text-stone-400">
                      shwcs_mcp_{token.hint}…
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    <span
                      className={
                        token.status === 'active' ? 'font-medium text-[#416B50]' : 'text-stone-500'
                      }
                    >
                      {dict.token.status[token.status]}
                    </span>
                    {' · '}
                    {dict.token.scope}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {dict.token.created.replace('{date}', date(token.createdAt))}
                    {' · '}
                    {(token.status === 'expired' ? dict.token.expired : dict.token.expires).replace(
                      '{date}',
                      date(token.expiresAt),
                    )}
                    {' · '}
                    {token.lastUsedAt
                      ? dict.token.lastUsed.replace('{date}', date(token.lastUsedAt))
                      : dict.token.neverUsed}
                  </p>
                </div>
                {token.status === 'active' && revoking !== token.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setRevoking(token.id);
                      setCreating(false);
                      setError('');
                    }}
                    className="inline-flex shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50/60 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-50"
                  >
                    {dict.token.revoke}
                  </button>
                )}
              </div>
              {revoking === token.id && (
                <form
                  noValidate
                  className="space-y-3 rounded-xl bg-stone-50 p-4"
                  onSubmit={async event => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const result = await send({
                      action: 'revoke',
                      id: token.id,
                      password: String(form.get('password') ?? ''),
                    });
                    if (result) setRevoking(null);
                  }}
                >
                  <p className="text-sm font-medium text-stone-900">
                    {dict.token.revokeTitle.replace('{name}', token.name)}
                  </p>
                  <p className="text-sm text-stone-500">{dict.token.revokeBody}</p>
                  <label className="block text-sm font-medium text-stone-700">
                    {dict.form.password}
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      maxLength={4096}
                      autoFocus
                      className={`mt-2 ${field}`}
                    />
                  </label>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setRevoking(null);
                        setError('');
                      }}
                      className={secondary}
                    >
                      {dict.token.cancel}
                    </button>
                    <button
                      disabled={pending}
                      className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                    >
                      {pending ? dict.token.revokePending : dict.token.revokeConfirm}
                    </button>
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-[#A94E35]">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-500">{dict.empty}</p>
      )}

      {creating ? (
        <form
          noValidate
          className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/50 p-5"
          onSubmit={async event => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const result = await send({
              action: 'create',
              name: String(form.get('name') ?? ''),
              days,
              password: String(form.get('password') ?? ''),
              code: twoStep ? String(form.get('code') ?? '') : undefined,
            });
            if (result?.token) {
              setSecret(result.token);
              setCreating(false);
            }
          }}
        >
          <p className="font-medium text-stone-900">{dict.form.title}</p>
          <label className="block text-sm font-medium text-stone-700">
            {dict.form.name}
            <input
              name="name"
              required
              maxLength={60}
              autoFocus
              placeholder={dict.form.namePlaceholder}
              aria-describedby="assistant-token-name-hint"
              className={`mt-2 ${field}`}
            />
          </label>
          <p id="assistant-token-name-hint" className="-mt-2 text-xs text-stone-500">
            {dict.form.nameHint}
          </p>
          <div>
            <p id="assistant-token-lifetime" className="text-sm font-medium text-stone-700">
              {dict.form.lifetime}
            </p>
            <div
              role="group"
              aria-labelledby="assistant-token-lifetime"
              className="selector-tabs mt-2"
            >
              {LIFETIMES.map(value => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={days === value}
                  onClick={() => setDays(value)}
                  className="selector-tab"
                >
                  {value === 365 ? dict.form.year : dict.form.days.replace('{days}', String(value))}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-stone-700">{dict.form.scope}</p>
            <p className="mt-1 text-sm text-stone-500">{dict.form.scopeValue}</p>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            {dict.form.password}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={4096}
              className={`mt-2 ${field}`}
            />
          </label>
          {twoStep && (
            <label className="block text-sm font-medium text-stone-700">
              {dict.form.code}
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={12}
                aria-describedby="assistant-token-code-hint"
                className={`mt-2 block ${field} max-w-[220px] tracking-[0.2em]`}
              />
              <span
                id="assistant-token-code-hint"
                className="mt-2 block text-xs font-normal text-stone-500"
              >
                {dict.form.codeHint}
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-[#A94E35]">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError('');
              }}
              className={secondary}
            >
              {dict.form.cancel}
            </button>
            <button
              disabled={pending}
              style={actionButtonStyle}
              className="action-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {pending ? dict.form.pending : dict.form.submit}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setRevoking(null);
            setError('');
          }}
          style={actionButtonStyle}
          className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
        >
          {dict.create}
          <PlusIcon aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
