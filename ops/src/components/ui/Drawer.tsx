'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

/** Side panel on a native modal <dialog> (focus containment + Escape for free). */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  actions,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      opener.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-none bg-transparent p-0 text-fg backdrop:bg-black/35 backdrop:backdrop-blur-[2px] open:animate-slide-in sm:p-3',
        width === 'lg' ? 'sm:w-[760px]' : 'sm:w-[560px]',
      )}
    >
      {open && (
        <div className="flex h-full flex-col overflow-hidden border-line bg-surface shadow-pop sm:rounded-2xl sm:border">
          <header className="flex items-start gap-3 border-b border-line px-6 py-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
              {subtitle && <div className="mt-0.5 text-[13px] text-muted">{subtitle}</div>}
            </div>
            {actions}
            <button
              type="button"
              aria-label="Cerrar panel"
              onClick={onClose}
              className="-mr-2 rounded-lg p-1.5 text-subtle transition hover:bg-surface-3 hover:text-fg"
            >
              <X aria-hidden className="size-[18px]" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <footer className="border-t border-line bg-surface-2 px-6 py-4">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}
