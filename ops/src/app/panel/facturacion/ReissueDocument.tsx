'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { CFDI_USES, RECEPTOR_ERROR, SAT_TAX_REGIMES, readCfdiReceptor } from '@/lib/billing';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';

export interface ReceptorFields {
  legalName: string;
  taxId: string;
  taxRegime: string;
  postalCode: string;
  cfdiUse: string;
  invoiceEmail: string;
}

/**
 * Reissue an invoice with corrected receptor data (SHCWS-96). Prefilled with the
 * account's current billing profile when it exists (the buyer may already have fixed
 * it), otherwise with the receptor copy the failed document carries.
 */
export function ReissueDocument({
  documentId,
  initial,
  source,
  hasProfile,
}: {
  documentId: string;
  initial: ReceptorFields;
  source: 'profile' | 'document';
  hasProfile: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<ReceptorFields>(initial);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const check = readCfdiReceptor(fields);
  const valid = check.ok && reason.trim().length >= 10;
  const set = (key: keyof ReceptorFields) => (value: string) =>
    setFields(current => ({ ...current, [key]: value }));
  const id = (key: string) => `reissue-${documentId}-${key}`;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<{ message?: string }>('/api/billing', {
        body: { action: 'reissue', documentId, receptor: fields, reason: reason.trim() },
      });
      toast('Factura en cola de nuevo', 'success', data.message);
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
        tone="secondary"
        size="xs"
        icon={RefreshIcon}
        onClick={() => {
          setFields(initial);
          setReason('');
          setError('');
          setOpen(true);
        }}
      >
        Reemitir con datos corregidos
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        size="lg"
        title="Reemitir la factura con datos corregidos"
        description={
          hasProfile
            ? 'Vuelve a la cola con estos datos y se corrigen también los datos de facturación de la cuenta, para que Cord actualice al cliente y las siguientes facturas salgan bien. El anunciante recibe un aviso.'
            : 'Vuelve a la cola con estos datos. La cuenta no tiene datos de facturación de México que corregir.'
        }
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button tone="solid" loading={busy} disabled={!valid} onClick={submit}>
              Reemitir
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
          <p className="text-[12.5px] text-muted">
            {source === 'profile'
              ? 'Precargado con los datos de facturación actuales de la cuenta.'
              : 'Precargado con los datos que llevaba el documento.'}
          </p>
          <Field label="Razón social (como en la constancia del SAT)" htmlFor={id('name')}>
            <input
              id={id('name')}
              value={fields.legalName}
              onChange={event => set('legalName')(event.target.value)}
              className="control h-10"
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="RFC" htmlFor={id('rfc')}>
              <input
                id={id('rfc')}
                value={fields.taxId}
                onChange={event => set('taxId')(event.target.value)}
                className="control h-10 font-mono uppercase"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label="Código postal fiscal" htmlFor={id('cp')}>
              <input
                id={id('cp')}
                value={fields.postalCode}
                onChange={event => set('postalCode')(event.target.value)}
                inputMode="numeric"
                maxLength={5}
                className="control num h-10"
                autoComplete="off"
              />
            </Field>
          </div>
          <Field label="Régimen fiscal" htmlFor={id('regime')}>
            <select
              id={id('regime')}
              value={fields.taxRegime}
              onChange={event => set('taxRegime')(event.target.value)}
              className="control h-10"
            >
              <option value="">Elige un régimen</option>
              {Object.entries(SAT_TAX_REGIMES).map(([code, label]) => (
                <option key={code} value={code}>
                  {code} · {label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Uso de CFDI" htmlFor={id('use')}>
              <select
                id={id('use')}
                value={fields.cfdiUse}
                onChange={event => set('cfdiUse')(event.target.value)}
                className="control h-10"
              >
                <option value="">Elige un uso</option>
                {Object.entries(CFDI_USES).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} · {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Correo para facturas (opcional)" htmlFor={id('email')}>
              <input
                id={id('email')}
                type="email"
                value={fields.invoiceEmail}
                onChange={event => set('invoiceEmail')(event.target.value)}
                className="control h-10"
                autoComplete="off"
              />
            </Field>
          </div>
          {!check.ok && <Alert tone="amber">{RECEPTOR_ERROR[check.error]}</Alert>}
          <Field
            label="Motivo"
            htmlFor={id('reason')}
            hint="Mínimo 10 caracteres. Queda en la bitácora con los datos anteriores."
          >
            <textarea
              id={id('reason')}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Por ejemplo: el anunciante envió su constancia con la razón social correcta."
              className="control py-2.5"
            />
          </Field>
          {error && <Alert>{error}</Alert>}
        </form>
      </Dialog>
    </>
  );
}
