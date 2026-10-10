'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Plus } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
export function NewSolutionButton({ dict }: { dict: Dictionary['solutionEditor']['newSolution'] }) {
  const router = useRouter();
  const id = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return (
    <div>
      <button
        type="button"
        style={actionButtonStyle}
        disabled={pending}
        className="action-button inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium disabled:opacity-60"
        onClick={async () => {
          if (busy.current) return;
          busy.current = true;
          setPending(true);
          setError('');
          id.current ??= crypto.randomUUID();
          try {
            const response = await fetch('/api/solutions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id.current }),
              signal: AbortSignal.timeout(15000),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            router.push(`/account/solutions/${result.id}`);
          } catch {
            setError(dict.error);
          } finally {
            busy.current = false;
            setPending(false);
          }
        }}
      >
        <Plus aria-hidden="true" className="size-4" />
        {pending ? dict.creating : dict.cta}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-stone-600">
          {error}
        </p>
      )}
    </div>
  );
}
