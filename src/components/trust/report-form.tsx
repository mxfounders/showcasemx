'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
// Opening a report is the only thing a visitor does here. Resolving, dismissing and
// withdrawing a publication live in the ops backoffice, never in the product.
export function ReportForm({
  solutionId,
  dict,
}: {
  solutionId: string;
  dict: Dictionary['solutionUi'];
}) {
  const [error, setError] = useState(''),
    [done, setDone] = useState(false),
    [pending, setPending] = useState(false);
  const busy = useRef(false),
    router = useRouter();
  return done ? (
    <p role="status" className="text-sm text-[#416B50]">
      {dict.report.done}
    </p>
  ) : (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async e => {
        e.preventDefault();
        if (busy.current) return;
        const values = Object.fromEntries(new FormData(e.currentTarget));
        busy.current = true;
        setPending(true);
        setError('');
        try {
          const r = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, action: 'create', solutionId }),
          });
          const data = await r.json();
          if (!r.ok) throw Error(data.error);
          setDone(true);
          router.refresh();
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
          <option value="misleading">{dict.report.reasonMisleading}</option>
          <option value="broken">{dict.report.reasonBroken}</option>
          <option value="ownership">{dict.report.reasonOwnership}</option>
          <option value="abuse">{dict.report.reasonAbuse}</option>
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
