'use client';
import { useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { dashboardModes, type DashboardMode } from '@/lib/dashboard/model';
import type { Dictionary } from '@/i18n/dictionary';
export function DashboardModeSwitch({
  mode,
  dict,
}: {
  mode: DashboardMode;
  dict: Dictionary['dashboard'];
}) {
  const text = dict.modeSwitch;
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  const busy = useRef(false),
    router = useRouter();
  return (
    <div>
      <div role="group" aria-label={text.ariaView} className="selector-tabs">
        {(Object.keys(dashboardModes) as DashboardMode[]).map(value => (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={mode === value}
            className="selector-tab disabled:opacity-50"
            onClick={async () => {
              if (busy.current || mode === value) return;
              busy.current = true;
              setPending(true);
              setError('');
              try {
                const r = await fetch('/api/account/dashboard', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ mode: value }),
                  signal: AbortSignal.timeout(15000),
                });
                if (!r.ok) {
                  const body = await r.json();
                  throw new Error(body.error);
                }
                router.refresh();
              } catch {
                setError(text.changeError);
              } finally {
                busy.current = false;
                setPending(false);
              }
            }}
          >
            {text.modes[value]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-[#A94E35]">
          {error}
        </p>
      )}
    </div>
  );
}
