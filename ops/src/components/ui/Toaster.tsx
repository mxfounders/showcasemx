'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import type { ToastPayload } from '@/lib/toast';
import { cn } from './cn';

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const tints = { success: 'text-sage', error: 'text-terracotta', info: 'text-accent-fg' };

export function Toaster() {
  const [items, setItems] = useState<ToastPayload[]>([]);

  useEffect(() => {
    function onToast(event: Event) {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      setItems(list => [...list.slice(-3), detail]);
      window.setTimeout(
        () => setItems(list => list.filter(item => item.id !== detail.id)),
        detail.tone === 'error' ? 7000 : 4200,
      );
    }
    window.addEventListener('ops:toast', onToast);
    return () => window.removeEventListener('ops:toast', onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[120] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-[380px]"
    >
      {items.map(item => {
        const Icon = icons[item.tone];
        return (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-pop"
          >
            <Icon
              aria-hidden
              className={cn('mt-0.5 size-[18px] shrink-0', tints[item.tone])}
              strokeWidth={2}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{item.title}</p>
              {item.description && (
                <p className="mt-0.5 text-[13px] text-muted">{item.description}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setItems(list => list.filter(entry => entry.id !== item.id))}
              className="-mr-1 rounded-md p-0.5 text-subtle transition hover:text-fg"
            >
              <X aria-hidden className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
