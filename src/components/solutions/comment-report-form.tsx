'use client';
import { useEffect, useRef, useState } from 'react';
import Link from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * Reporting someone else's comment on a listing (SHCWS-140). Opening the report is the
 * only thing a visitor does; resolving, dismissing and hiding live in ops. Mirrors
 * src/components/library/community-report-form.tsx for comments on lists.
 */
export function CommentReportForm({
  solutionId,
  commentId,
  onDone,
  onCancel,
  dict,
}: {
  solutionId: string;
  commentId: string;
  onDone: () => void;
  onCancel: () => void;
  dict: Dictionary['solutionUi'];
}) {
  const [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [login, setLogin] = useState(false);
  const busy = useRef(false),
    reason = useRef<HTMLSelectElement>(null);
  const t = dict.commentReport;
  useEffect(() => reason.current?.focus(), []);
  if (login)
    return (
      <p className="text-sm text-stone-500">
        <Link
          href={`/sign-in?next=${encodeURIComponent('/soluciones/' + solutionId)}`}
          className="text-[#365DC4] underline underline-offset-4"
        >
          {dict.social.loginPrompt}
        </Link>{' '}
        {t.loginSuffix}
      </p>
    );
  return (
    <form
      noValidate
      className="space-y-3"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onCancel();
        }
      }}
      onSubmit={async event => {
        event.preventDefault();
        if (busy.current) return;
        const values = Object.fromEntries(new FormData(event.currentTarget));
        busy.current = true;
        setPending(true);
        setError('');
        try {
          const response = await fetch('/api/solutions/social', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, action: 'report-comment', solutionId, commentId }),
          });
          const data = await response.json();
          if (response.status === 401) {
            setLogin(true);
            return;
          }
          if (!response.ok) throw Error(data.error);
          onDone();
        } catch (e) {
          setError(
            e instanceof Error && !['TypeError', 'SyntaxError'].includes(e.name)
              ? e.message
              : t.genericError,
          );
        } finally {
          busy.current = false;
          setPending(false);
        }
      }}
    >
      <label className="block text-sm">
        {t.reasonLabel}
        <select
          ref={reason}
          name="reason"
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-stone-300 bg-transparent p-3"
        >
          <option value="spam">{t.reasonSpam}</option>
          <option value="abuse">{t.reasonAbuse}</option>
          <option value="impersonation">{t.reasonImpersonation}</option>
          <option value="other">{t.reasonOther}</option>
        </select>
      </label>
      <label className="block text-sm">
        {t.detailsLabel}
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
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={pending}
          style={actionButtonStyle}
          className="action-button rounded-full px-5 py-3 text-sm"
        >
          {pending ? t.saving : t.submit}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-3 text-sm text-stone-500 hover:bg-stone-100 hover:text-stone-900"
        >
          {t.cancel}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </form>
  );
}
