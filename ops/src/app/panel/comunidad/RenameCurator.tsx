'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { CURATOR_ERROR, CURATOR_MAX, checkCuratorName } from '@/lib/community';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';

/**
 * Admin-only correction of a misleading public signature (SHCWS-162). The product
 * already refuses signatures that read as shwcs; this covers the rest (another
 * brand's name, a person's name used without consent…).
 */
export function RenameCurator({
  listId,
  listName,
  current,
}: {
  listId: string;
  listName: string;
  current: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const check = checkCuratorName(name);
  const sameAsNow = check.ok && check.name === current;
  // The field opens with the current signature: that is not an error, only not a change.
  const nameError = name.trim() && !check.ok ? CURATOR_ERROR[check.error] : '';
  const valid = check.ok && !sameAsNow && reason.trim().length >= 10;

  function start() {
    setName(current);
    setReason('');
    setError('');
    setOpen(true);
  }

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/community', {
        body: { action: 'rename_curator', listId, curatorName: name, reason: reason.trim() },
      });
      toast('Firma cambiada', 'success', 'El dueño recibe un aviso en su cuenta.');
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
      <Button tone="ghost" size="xs" icon={EditIcon} onClick={start}>
        Renombrar firma
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title={`Renombrar la firma de «${listName}»`}
        description="La lista pública muestra la firma nueva de inmediato. El dueño recibe un aviso en su cuenta y la bitácora guarda la firma anterior. Si después la edita, puede volver a cambiarla."
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button tone="solid" loading={busy} disabled={!valid} onClick={submit}>
              Cambiar firma
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
          <Field
            label="Firma nueva"
            htmlFor={`curator-${listId}`}
            error={nameError || null}
            hint={`Hasta ${CURATOR_MAX} caracteres. Actual: «${current || 'sin firma'}».`}
          >
            <input
              id={`curator-${listId}`}
              value={name}
              onChange={event => setName(event.target.value)}
              maxLength={CURATOR_MAX}
              autoFocus
              autoComplete="off"
              className="control h-10"
            />
          </Field>
          <Field
            label="Motivo"
            htmlFor={`curator-reason-${listId}`}
            hint="Mínimo 10 caracteres. Queda en la bitácora; el dueño no lo ve."
          >
            <textarea
              id={`curator-reason-${listId}`}
              value={reason}
              onChange={event => setReason(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Por ejemplo: la firma usa el nombre de una marca que no representa."
              className="control py-2.5"
            />
          </Field>
          {error && <Alert>{error}</Alert>}
        </form>
      </Dialog>
    </>
  );
}
