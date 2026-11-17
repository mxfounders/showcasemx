'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BlockIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { fmtDate, fmtMoney } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';
import { cn } from '@/components/ui/cn';

export type RemovalOption =
  | { ok: true; refund: number; servedUntil: string; firstRefundable: string }
  | { ok: false; message: string };

const KINDS = [
  {
    id: 'platformRemoval',
    label: 'Decisión de shwcs',
    hint: 'Por causas que no son del anunciante. Reembolsa todo lo no servido, incluido hoy.',
  },
  {
    id: 'policyRemoval',
    label: 'Incumplimiento',
    hint: 'La ficha o su contenido incumplen los términos. Reembolsa desde mañana.',
  },
] as const;

/**
 * Withdrawing a paid booking (SHCWS-69). The refund each reason implies is computed on
 * the server for this exact version of the booking; the API recomputes it and refuses
 * if the booking changed, so what the operator reads is what Stripe receives.
 */
export function WithdrawBooking({
  bookingId,
  version,
  currency,
  options,
}: {
  bookingId: string;
  version: number;
  currency: string;
  options: Record<'platformRemoval' | 'policyRemoval', RemovalOption>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'platformRemoval' | 'policyRemoval' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reasonId = useId();
  const chosen = kind ? options[kind] : null;
  const valid = Boolean(chosen?.ok) && reason.trim().length >= 10;
  const anyAvailable = options.platformRemoval.ok || options.policyRemoval.ok;

  async function submit() {
    if (!valid || busy || !kind) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<{ message?: string }>('/api/ads', {
        body: { action: 'withdraw', bookingId, kind, version, reason: reason.trim() },
      });
      toast('Reserva retirada', 'success', data.message);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      // A refund Stripe did not confirm still left the booking withdrawn: show it.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        tone="danger"
        icon={BlockIcon}
        disabled={!anyAvailable}
        onClick={() => {
          setKind(null);
          setReason('');
          setError('');
          setOpen(true);
        }}
      >
        Retirar
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        size="lg"
        title="Retirar la reserva"
        description="Deja de mostrarse de inmediato (el producto tarda hasta 5 min en notarlo) y el reembolso se envía a Stripe ahora. No se puede deshacer."
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button tone="danger" loading={busy} disabled={!valid} onClick={submit}>
              {!chosen?.ok
                ? 'Retirar'
                : chosen.refund > 0
                  ? `Retirar y reembolsar ${fmtMoney(chosen.refund, currency)}`
                  : 'Retirar sin reembolso'}
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            void submit();
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[13px] font-medium text-fg-2">
              Por qué se retira (decide el reembolso)
            </legend>
            {KINDS.map(option => {
              const result = options[option.id];
              return (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border p-3.5 transition',
                    kind === option.id
                      ? 'border-accent/50 bg-accent-soft/40'
                      : 'border-line hover:border-line-strong',
                    !result.ok && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <input
                    type="radio"
                    name={`withdraw-${bookingId}`}
                    value={option.id}
                    checked={kind === option.id}
                    disabled={!result.ok}
                    onChange={() => setKind(option.id)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[14px] font-medium text-fg">{option.label}</span>
                      {result.ok && (
                        <span className="num text-[13.5px] font-semibold text-fg">
                          {result.refund > 0
                            ? `Reembolsa ${fmtMoney(result.refund, currency)}`
                            : 'Sin reembolso'}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-muted">{option.hint}</span>
                    <span className="mt-1 block text-[12.5px] text-fg-2">
                      {result.ok
                        ? result.refund > 0
                          ? `Se reembolsa desde el ${fmtDate(result.firstRefundable + 'T12:00:00Z')}, inclusive.`
                          : 'No queda nada por reembolsar.'
                        : result.message}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <Field
            label="Motivo"
            htmlFor={reasonId}
            hint="Mínimo 10 caracteres. Queda en la bitácora."
          >
            <textarea
              id={reasonId}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              className="control py-2.5"
            />
          </Field>
          {error && <Alert>{error}</Alert>}
        </form>
      </Dialog>
    </>
  );
}
