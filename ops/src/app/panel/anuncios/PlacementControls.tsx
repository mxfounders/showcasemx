'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { fmtMoney } from '@/lib/format';
import { MAX_DAILY_RATE, parseRate } from '@/lib/ads';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';
import { ActionButton } from '@/components/actions/ActionButton';

const PLACEMENT: Record<string, string> = {
  category: 'Categoría',
  home: 'Inicio',
  newsletter: 'Newsletter',
};

/**
 * Admin controls on a placement card (SHCWS-69), replacing `npm run ads:rates`:
 * change a daily rate and open or close the placement for new purchases.
 */
export function PlacementControls({
  placement,
  enabled,
  rates,
}: {
  placement: string;
  enabled: boolean;
  rates: Array<{ currency: string; dailyAmount: number }>;
}) {
  const name = PLACEMENT[placement] ?? placement;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      <RateEditor placement={placement} name={name} rates={rates} />
      {enabled ? (
        <ActionButton
          label="Cerrar"
          tone="ghost"
          size="xs"
          endpoint="/api/ads"
          payload={{ action: 'set_placement', placement, enabled: false }}
          success={`${name} cerrado`}
          confirm={{
            title: `Cerrar «${name}» a compras nuevas`,
            description: 'Las reservas ya pagadas siguen mostrándose en sus días.',
            confirmLabel: 'Cerrar',
          }}
        />
      ) : (
        <ActionButton
          label="Abrir"
          tone="ghost"
          size="xs"
          disabled={rates.length === 0}
          endpoint="/api/ads"
          payload={{
            action: 'set_placement',
            placement,
            enabled: true,
            ...(placement === 'newsletter' ? { newsletterIsSending: true } : {}),
          }}
          success={`${name} abierto`}
          confirm={{
            title: `Abrir «${name}» a compras`,
            description:
              placement === 'newsletter'
                ? 'Solo si el newsletter ya envía campañas: venderlo antes cobraría por nada.'
                : 'Los fundadores con fichas publicadas podrán comprarlo desde su cuenta.',
            confirmLabel: 'Abrir',
            typeToConfirm: placement === 'newsletter' ? 'EL NEWSLETTER YA SE ENVÍA' : undefined,
          }}
        />
      )}
    </div>
  );
}

function RateEditor({
  placement,
  name,
  rates,
}: {
  placement: string;
  name: string;
  rates: Array<{ currency: string; dailyAmount: number }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<'usd' | 'mxn'>('usd');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const amountId = useId();
  const reasonId = useId();
  const minor = parseRate(amount);
  const current = rates.find(rate => rate.currency === currency);
  const valid = minor !== null && reason.trim().length >= 10;

  function start(next: 'usd' | 'mxn') {
    const rate = rates.find(item => item.currency === next);
    setCurrency(next);
    setAmount(rate ? (rate.dailyAmount / 100).toFixed(2) : '');
    setReason('');
    setError('');
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<{ message?: string }>('/api/ads', {
        body: { action: 'set_rate', placement, currency, amount, reason: reason.trim() },
      });
      toast('Tarifa guardada', 'success', data.message);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        tone="ghost"
        size="xs"
        icon={EditIcon}
        onClick={() => {
          start('usd');
          setOpen(true);
        }}
      >
        Tarifas
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={`Tarifa diaria de «${name}»`}
        description="Antes de impuestos. Aplica solo a reservas nuevas: cada reserva pagada conserva la tarifa a la que se vendió."
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button tone="solid" loading={busy} disabled={!valid} onClick={submit}>
              Guardar tarifa
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
          <div className="flex gap-1.5" role="group" aria-label="Moneda">
            {(['usd', 'mxn'] as const).map(option => (
              <Button
                key={option}
                tone={currency === option ? 'primary' : 'secondary'}
                size="xs"
                aria-pressed={currency === option}
                onClick={() => start(option)}
              >
                {option.toUpperCase()}
              </Button>
            ))}
          </div>
          <Field
            label={`Por día, en ${currency.toUpperCase()}`}
            htmlFor={amountId}
            error={amount.trim() && minor === null ? 'Escribe un monto como 25.00.' : null}
            hint={`Actual: ${current ? fmtMoney(current.dailyAmount, currency) : 'sin tarifa'}. Máximo ${fmtMoney(MAX_DAILY_RATE, currency)}, para que 90 días quepan en un solo cobro.`}
          >
            <input
              id={amountId}
              value={amount}
              onChange={event => setAmount(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              className="control num h-10"
            />
          </Field>
          <Field
            label="Motivo"
            htmlFor={reasonId}
            hint="Mínimo 10 caracteres. Queda en la bitácora."
          >
            <textarea
              id={reasonId}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={2}
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
