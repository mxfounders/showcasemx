'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EditIcon, EyeIcon, EyeOffIcon } from '@/components/icons/gota';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { HANDLE_ERROR, HANDLE_MAX, checkHandle } from '@/lib/profiles';
import { ActionButton } from '@/components/actions/ActionButton';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';

/**
 * Hiding a public profile (any ops member) and forcing a new handle (admins) — SHCWS-120.
 * The owner reads the hiding reason in Settings; a forced handle blocks the old one.
 */
export function ProfileModeration({
  accountId,
  handle,
  hidden,
  admin,
}: {
  accountId: string;
  handle: string;
  hidden: boolean;
  admin: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const check = checkHandle(next);
  const nextError = next.trim() && !check.ok ? HANDLE_ERROR[check.error] : '';
  const valid = check.ok && check.handle !== handle && reason.trim().length >= 10;

  async function submit() {
    if (!valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<{ message?: string }>('/api/profiles', {
        body: { action: 'force_handle', accountId, handle: next, reason: reason.trim() },
      });
      toast('Enlace cambiado', 'success', data.message);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {hidden ? (
        <ActionButton
          label="Volver a mostrar"
          icon={<EyeIcon />}
          endpoint="/api/profiles"
          payload={{ action: 'unhide', accountId }}
          success="Perfil visible otra vez"
          confirm={{
            title: 'Volver a mostrar el perfil',
            description:
              'Se ve de nuevo solo si su dueño lo tiene activado. El dueño recibe un aviso.',
            confirmLabel: 'Mostrar',
          }}
        />
      ) : (
        <ActionButton
          label="Ocultar perfil"
          icon={<EyeOffIcon />}
          tone="danger"
          endpoint="/api/profiles"
          payload={{ action: 'hide', accountId }}
          success="Perfil oculto"
          confirm={{
            title: 'Ocultar el perfil público',
            description:
              'Deja de verse de inmediato (el enlace responde 404 en menos de un minuto). Sus fichas y listas siguen publicadas. El dueño recibe un aviso y ve este motivo en Ajustes.',
            destructive: true,
            confirmLabel: 'Ocultar',
            placeholder: 'Por ejemplo: el nombre suplanta a otra persona.',
          }}
        />
      )}
      {admin && (
        <>
          <Button
            tone="ghost"
            size="sm"
            icon={EditIcon}
            onClick={() => {
              setNext('');
              setReason('');
              setError('');
              setOpen(true);
            }}
          >
            Cambiar enlace
          </Button>
          <Dialog
            open={open}
            onClose={() => !busy && setOpen(false)}
            title={`Cambiar el enlace de /c/${handle}`}
            description="El enlace anterior queda bloqueado: no redirige y nadie puede volver a usarlo. El dueño recibe un aviso con el enlace nuevo; el motivo queda en la bitácora."
            footer={
              <>
                <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
                  Cancelar
                </Button>
                <Button tone="solid" loading={busy} disabled={!valid} onClick={submit}>
                  Cambiar enlace
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
                label="Enlace nuevo"
                htmlFor={`handle-${accountId}`}
                error={nextError || null}
                hint={`shwcs.site/c/${check.ok ? check.handle : '…'} · 3 a ${HANDLE_MAX} caracteres.`}
              >
                <input
                  id={`handle-${accountId}`}
                  value={next}
                  onChange={event => setNext(event.target.value)}
                  maxLength={60}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="control h-10"
                />
              </Field>
              <Field
                label="Motivo"
                htmlFor={`handle-reason-${accountId}`}
                hint="Mínimo 10 caracteres. Queda en la bitácora."
              >
                <textarea
                  id={`handle-reason-${accountId}`}
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Por ejemplo: el enlace usa el nombre de una marca que no representa."
                  className="control py-2.5"
                />
              </Field>
              {error && <Alert>{error}</Alert>}
            </form>
          </Dialog>
        </>
      )}
    </div>
  );
}
