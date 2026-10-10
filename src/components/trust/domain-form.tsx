'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
export function DomainForm({
  id,
  initial,
  dict,
}: {
  id: string;
  initial?: { domain: string; token: string; verified: boolean };
  dict: Dictionary['solutionEditor']['domain'];
}) {
  const [record, setRecord] = useState(
      initial
        ? {
            name: `_showcasemx.${initial.domain}`,
            value: `showcasemx-verification=${initial.token}`,
          }
        : null,
    ),
    [verified, setVerified] = useState(initial?.verified ?? false),
    [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false),
    router = useRouter();
  async function change(action: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError('');
    try {
      const r = await fetch(`/api/solutions/${id}/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      if (body.verified) setVerified(true);
      else {
        setRecord(body);
        setVerified(false);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : dict.error);
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div className="max-w-xl space-y-5">
      {verified ? (
        <p className="text-sm text-[#416B50]">{dict.verified}</p>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-stone-500">{dict.instructions}</p>
          {record && (
            <dl className="space-y-3 rounded-2xl border border-stone-200 p-5 text-sm">
              <dt>{dict.recordName}</dt>
              <dd className="break-all font-mono">{record.name}</dd>
              <dt>{dict.recordValue}</dt>
              <dd className="break-all font-mono">{record.value}</dd>
            </dl>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={pending}
              onClick={() => void change('issue')}
              className="action-button rounded-full px-5 py-3 text-sm"
              style={actionButtonStyle}
            >
              {record ? dict.regenerate : dict.generate}
            </button>
            {record && (
              <button
                disabled={pending}
                onClick={() => void change('verify')}
                className="action-button rounded-full px-5 py-3 text-sm"
                style={actionButtonStyle}
              >
                {dict.check}
              </button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
