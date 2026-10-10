'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import { AlertTriangle, PenLine } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Field';

export interface ReasonDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  /** Label of the text field; null skips it (plain confirmation). */
  fieldLabel?: string | null;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  /** One-click starting points for the text, editable afterwards. */
  templates?: string[];
  /** Extra friction for irreversible actions: the operator must type this exactly. */
  typeToConfirm?: string;
  onCancel: () => void;
  /** Returns an error message to show, or null on success. */
  onConfirm: (text: string) => Promise<string | null>;
}

export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  fieldLabel = 'Motivo',
  minLength = 10,
  maxLength = 1000,
  placeholder = 'Explica por qué realizas esta acción. Queda en la bitácora.',
  templates,
  typeToConfirm,
  onCancel,
  onConfirm,
}: ReasonDialogProps) {
  const [text, setText] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fieldId = useId();
  const confirmId = useId();

  useEffect(() => {
    if (open) {
      setText('');
      setTyped('');
      setError('');
    }
  }, [open]);

  const trimmed = text.trim();
  const textOk =
    fieldLabel === null || (trimmed.length >= minLength && trimmed.length <= maxLength);
  const typedOk = !typeToConfirm || typed.trim() === typeToConfirm;

  async function submit() {
    if (!textOk || !typedOk || busy) return;
    setBusy(true);
    setError('');
    const result = await onConfirm(trimmed);
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onCancel()}
      title={title}
      description={description}
      icon={
        <span
          className={
            destructive
              ? 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta'
              : 'flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-fg'
          }
        >
          {destructive ? (
            <AlertTriangle aria-hidden className="size-5" />
          ) : (
            <PenLine aria-hidden className="size-5" />
          )}
        </span>
      }
      footer={
        <>
          <Button tone="ghost" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            tone={destructive ? 'danger' : 'solid'}
            loading={busy}
            disabled={!textOk || !typedOk}
            onClick={submit}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={event => {
          event.preventDefault();
          void submit();
        }}
      >
        {fieldLabel !== null && (
          <div className="space-y-1.5">
            <label htmlFor={fieldId} className="text-[13px] font-medium text-fg-2">
              {fieldLabel}
            </label>
            {templates && templates.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {templates.map(template => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => setText(template)}
                    className="rounded-full border border-line px-2.5 py-1 text-[12px] text-muted transition hover:border-accent/40 hover:text-accent-fg"
                  >
                    {template.length > 48 ? template.slice(0, 46) + '…' : template}
                  </button>
                ))}
              </div>
            )}
            <textarea
              id={fieldId}
              value={text}
              onChange={event => setText(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit();
              }}
              rows={4}
              maxLength={maxLength}
              autoFocus
              placeholder={placeholder}
              className="control py-2.5 leading-relaxed"
            />
            <p className="num flex justify-between text-[12px] text-muted">
              <span>Mínimo {minLength} caracteres · ⌘↵ para confirmar</span>
              <span
                className={
                  trimmed.length > 0 && trimmed.length < minLength ? 'text-amber' : undefined
                }
              >
                {trimmed.length}/{maxLength}
              </span>
            </p>
          </div>
        )}
        {typeToConfirm && (
          <div className="space-y-1.5">
            <label htmlFor={confirmId} className="text-[13px] font-medium text-fg-2">
              Escribe{' '}
              <span className="rounded bg-surface-3 px-1 font-mono text-[12px] text-fg">
                {typeToConfirm}
              </span>{' '}
              para confirmar
            </label>
            <input
              id={confirmId}
              value={typed}
              onChange={event => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="control h-10 font-mono text-[13px]"
            />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
}
