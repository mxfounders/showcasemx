'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button, type ButtonSize, type ButtonTone, type IconProp } from '../ui/Button';
import { ReasonDialog } from './ReasonDialog';

export interface ConfirmSpec {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Body key the typed text is sent under; null = no text field. */
  field?: 'reason' | 'message' | null;
  fieldLabel?: string;
  minLength?: number;
  placeholder?: string;
  templates?: string[];
  typeToConfirm?: string;
}

/**
 * One button = one audited mutation: optional confirmation with a reason, the
 * request (step-up handled by api()), a toast, then a server refresh so every
 * count on the page and in the sidebar is re-read from the database.
 */
export function ActionButton({
  label,
  icon,
  tone = 'secondary',
  size = 'sm',
  endpoint,
  method = 'POST',
  payload,
  confirm,
  success,
  redirectTo,
  disabled,
  className,
}: {
  label: string;
  icon?: IconProp;
  tone?: ButtonTone;
  size?: ButtonSize;
  endpoint: string;
  method?: 'POST' | 'DELETE';
  payload: Record<string, unknown>;
  confirm?: ConfirmSpec;
  success: string;
  redirectTo?: string;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(text?: string): Promise<string | null> {
    const field = confirm?.field === undefined ? 'reason' : confirm.field;
    try {
      const data = await api<{ message?: string }>(endpoint, {
        method,
        body: field && text !== undefined ? { ...payload, [field]: text } : payload,
      });
      setOpen(false);
      toast(success, 'success', typeof data.message === 'string' ? data.message : undefined);
      if (redirectTo) router.push(redirectTo);
      router.refresh();
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  return (
    <>
      <Button
        tone={tone}
        size={size}
        icon={icon}
        disabled={disabled}
        loading={busy}
        className={className}
        onClick={async () => {
          if (confirm) {
            setOpen(true);
            return;
          }
          setBusy(true);
          const error = await run();
          setBusy(false);
          if (error) toast(error, 'error');
        }}
      >
        {label}
      </Button>
      {confirm && (
        <ReasonDialog
          open={open}
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel ?? label}
          destructive={confirm.destructive}
          fieldLabel={confirm.field === null ? null : (confirm.fieldLabel ?? 'Motivo')}
          minLength={confirm.minLength}
          placeholder={confirm.placeholder}
          templates={confirm.templates}
          typeToConfirm={confirm.typeToConfirm}
          onCancel={() => setOpen(false)}
          onConfirm={text => run(text)}
        />
      )}
    </>
  );
}
