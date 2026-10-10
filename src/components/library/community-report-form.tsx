'use client';
import { useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
// Opening a report is the only thing a visitor does here. Resolving, dismissing and
// taking content down live in the ops backoffice, never in the product — mirrors
// src/components/trust/report-form.tsx for solution fichas.
export function CommunityReportForm({
  listId,
  commentId,
  onDone,
  dict,
}: {
  listId: string;
  commentId?: string;
  onDone?: () => void;
  dict: Dictionary['community'];
}) {
  const [error, setError] = useState(''),
    [done, setDone] = useState(false),
    [pending, setPending] = useState(false),
    [login, setLogin] = useState(false);
  const busy = useRef(false);
  if (done)
    return (
      <p role="status" className="text-sm text-[#416B50]">
        {dict.report.done}
      </p>
    );
  if (login)
    return (
      <p className="text-sm text-stone-500">
        <Link
          href={`/sign-in?next=${encodeURIComponent('/comunidad/' + listId)}`}
          className="text-[#365DC4] underline underline-offset-4"
        >
          {dict.actions.loginPrompt}
        </Link>{' '}
        {dict.report.loginSuffixReport}
      </p>
    );
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={async e => {
        e.preventDefault();
        if (busy.current) return;
        const values = Object.fromEntries(new FormData(e.currentTarget));
        busy.current = true;
        setPending(true);
        setError('');
        try {
          const r = await fetch('/api/community', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, action: 'report', listId, commentId }),
          });
          const data = await r.json();
          if (r.status === 401) {
            setLogin(true);
            return;
          }
          if (!r.ok) throw Error(data.error);
          setDone(true);
          onDone?.();
        } catch (e) {
          setError(e instanceof Error ? e.message : dict.report.genericError);
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      <label className="block text-sm">
        {dict.report.reasonLabel}
        <select
          name="reason"
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-transparent p-3"
        >
          <option value="spam">{dict.report.reasonSpam}</option>
          <option value="abuse">{dict.report.reasonAbuse}</option>
          <option value="impersonation">{dict.report.reasonImpersonation}</option>
          <option value="other">{dict.report.reasonOther}</option>
        </select>
      </label>
      <label className="block text-sm">
        {dict.report.detailsLabel}
        <textarea
          name="details"
          minLength={10}
          maxLength={2000}
          required
          disabled={pending}
          rows={3}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-transparent p-3"
        />
      </label>
      <button
        disabled={pending}
        style={actionButtonStyle}
        className="action-button rounded-full px-5 py-3 text-sm"
      >
        {pending ? dict.report.saving : dict.report.submit}
      </button>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
