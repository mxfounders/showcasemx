'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { cn } from '../ui/cn';
import { renderIcon, type IconProp } from '../ui/Button';
import { ReasonDialog } from './ReasonDialog';
import type { ConfirmSpec } from './ActionButton';

export interface MenuAction {
  label: string;
  icon?: IconProp;
  danger?: boolean;
  endpoint: string;
  payload: Record<string, unknown>;
  confirm: ConfirmSpec;
  success: string;
}

/** Compact "⋯" menu whose items each run one confirmed, audited mutation. */
export function ActionMenu({
  actions,
  label = 'Acciones',
}: {
  actions: MenuAction[];
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<MenuAction | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) =>
      !root.current?.contains(event.target as Node) && setOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!actions.length) return null;

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="rounded-lg p-1.5 text-muted transition hover:bg-surface-3 hover:text-fg"
      >
        <MoreHorizontal aria-hidden className="size-4" />
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute right-0 z-30 mt-1 w-60 animate-pop-in overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop"
        >
          {actions.map(action => (
            <li key={action.label} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setSelected(action);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
                  action.danger
                    ? 'text-terracotta hover:bg-terracotta-soft'
                    : 'text-fg-2 hover:bg-surface-3',
                )}
              >
                {renderIcon(action.icon, 'size-4')}
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <ReasonDialog
          open
          title={selected.confirm.title}
          description={selected.confirm.description}
          confirmLabel={selected.confirm.confirmLabel ?? selected.label}
          destructive={selected.confirm.destructive}
          fieldLabel={
            selected.confirm.field === null ? null : (selected.confirm.fieldLabel ?? 'Motivo')
          }
          minLength={selected.confirm.minLength}
          typeToConfirm={selected.confirm.typeToConfirm}
          onCancel={() => setSelected(null)}
          onConfirm={async text => {
            try {
              const field =
                selected.confirm.field === undefined ? 'reason' : selected.confirm.field;
              const data = await api<{ message?: string }>(selected.endpoint, {
                body: field ? { ...selected.payload, [field]: text } : selected.payload,
              });
              toast(selected.success, 'success', data.message);
              setSelected(null);
              router.refresh();
              return null;
            } catch (err) {
              return errorMessage(err);
            }
          }}
        />
      )}
    </div>
  );
}
