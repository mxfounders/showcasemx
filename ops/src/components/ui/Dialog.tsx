'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn';

/**
 * Native <dialog> opened with showModal(): the browser provides the top layer,
 * focus containment, inert background and Escape. Focus returns to whatever
 * opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  icon,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  dismissible?: boolean;
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

  const width = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <dialog
      ref={ref}
      onCancel={event => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={event => {
        if (dismissible && event.target === ref.current) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] overflow-visible bg-transparent p-0 text-fg backdrop:bg-black/40 backdrop:backdrop-blur-[3px] open:animate-pop-in',
        width,
      )}
    >
      {open && (
        <div className="rounded-2xl border border-line bg-surface shadow-pop">
          <div className="flex items-start gap-3 px-6 pb-2 pt-5">
            {icon}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
              {description && <div className="mt-1 text-[13.5px] text-muted">{description}</div>}
            </div>
            {dismissible && (
              <button
                type="button"
                aria-label="Cerrar"
                onClick={onClose}
                className="-mr-2 -mt-1 rounded-lg p-1.5 text-subtle transition hover:bg-surface-3 hover:text-fg"
              >
                <X aria-hidden className="size-4" />
              </button>
            )}
          </div>
          {children && <div className="px-6 py-3">{children}</div>}
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 px-6 pb-5 pt-2">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}
