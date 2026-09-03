'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<string | null>; // returns error message, or null on success
}

export default function ReasonDialog({ open, title, description, confirmLabel, destructive, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
      setReason('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      triggerRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onCancel(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= 10 && trimmed.length <= 1000;

  async function handleConfirm() {
    if (!valid) return;
    setSubmitting(true);
    setError('');
    const err = await onConfirm(trimmed);
    setSubmitting(false);
    if (err) setError(err);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onCancel} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
        <h2 className="text-base font-bold text-stone-900">{title}</h2>
        {description && <p className="mt-1.5 text-sm text-stone-500">{description}</p>}

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Motivo (obligatorio)</span>
          <textarea
            ref={inputRef}
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Explica por qué realizas esta acción…"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#3562cc] focus:ring-2 focus:ring-[#3562cc]/15"
          />
          <span className="text-[11px] text-stone-400">{trimmed.length}/1000 · mínimo 10 caracteres</span>
        </label>

        {error && (
          <div role="alert" className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full text-sm font-medium text-stone-600 hover:bg-stone-100 transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!valid || submitting}
            onClick={handleConfirm}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-[#e4ebfc] text-[#365dc4] hover:bg-[#d1dfff]'
            }`}
          >
            {submitting ? 'Aplicando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
