'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Download, TriangleAlert } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

const field =
  'w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none transition-colors placeholder:text-stone-400 hover:border-stone-400 focus:border-[#365DC4] focus:ring-1 focus:ring-[#365DC4]';
// The word the server checks (api/account/delete). Deliberately the same in every
// language: the interface asks for it by name, it is not a translatable label.
export function ExportData({ dict }: { dict: Dictionary['settings']['data']['export'] }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-500">{dict.desc}</p>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError('');
          try {
            // Fetched rather than linked so a failure surfaces as a message instead of
            // navigating the person to a raw error page.
            const response = await fetch('/api/account/export', {
              signal: AbortSignal.timeout(30000),
            });
            if (!response.ok)
              throw new Error(
                ((await response.json().catch(() => ({}))) as { error?: string }).error ||
                  dict.error,
              );
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${dict.fileName}-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
          } catch (failure) {
            setError(
              failure instanceof Error &&
                !['TimeoutError', 'TypeError', 'SyntaxError'].includes(failure.name)
                ? failure.message
                : dict.genericError,
            );
          } finally {
            setPending(false);
          }
        }}
        style={actionButtonStyle}
        className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        <Download aria-hidden="true" className="size-4" />
        {pending ? dict.preparing : dict.download}
      </button>
    </div>
  );
}

/**
 * Deletion is irreversible and reaches other people: every publication, list and
 * contact conversation of this account goes with it, including the copy the other
 * participant keeps. The consequences are spelled out before the form appears.
 */
export function DeleteAccount({
  publications,
  conversations,
  dict,
}: {
  publications: number;
  conversations: number;
  dict: Dictionary['settings']['data']['delete'];
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const consequences = [
    publications > 0 &&
      (publications === 1
        ? dict.publicationOne
        : dict.publicationMany.replace('{count}', String(publications))),
    conversations > 0 &&
      (conversations === 1
        ? dict.conversationOne
        : dict.conversationMany.replace('{count}', String(conversations))),
    dict.library,
    dict.noRecovery,
  ].filter(Boolean) as string[];

  if (!open)
    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-red-800/80">{dict.intro}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-50"
        >
          <TriangleAlert aria-hidden="true" className="size-4" />
          {dict.open}
        </button>
      </div>
    );

  return (
    <form
      className="space-y-5"
      onSubmit={event => {
        event.preventDefault();
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setError('');
        (async () => {
          try {
            const response = await fetch('/api/account/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password, confirm }),
              signal: AbortSignal.timeout(30000),
            });
            const result = await response.json();
            if (!response.ok || result.ok !== true) throw new Error(result.error || dict.error);
            router.replace('/');
            router.refresh();
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
        })();
      }}
    >
      <div>
        <p className="text-sm font-medium text-red-900">{dict.consequencesTitle}</p>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-red-800/90">
          {consequences.map(item => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
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
      <label className="block text-sm font-medium text-stone-700">
        {dict.confirmLabel.replace('{word}', dict.confirmWord)}
        <input
          required
          value={confirm}
          onChange={event => {
            setConfirm(event.target.value);
            setError('');
          }}
          placeholder={dict.confirmWord}
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
          onClick={() => {
            setOpen(false);
            setPassword('');
            setConfirm('');
            setError('');
          }}
          className="inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
        >
          {dict.cancel}
        </button>
        <button
          type="submit"
          disabled={pending || confirm !== dict.confirmWord}
          className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? dict.deleting : dict.submit}
        </button>
      </div>
    </form>
  );
}
