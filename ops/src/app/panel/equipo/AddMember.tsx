'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { api, errorMessage } from '@/lib/client';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Alert, Field } from '@/components/ui/Field';

export function AddMember() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()) && reason.trim().length >= 10;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const data = await api<{ message?: string }>('/api/team', {
        body: { action: 'add', email: email.trim(), reason: reason.trim() },
      });
      toast('Acceso otorgado', 'success', data.message);
      setOpen(false);
      setEmail('');
      setReason('');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button tone="solid" icon={UserPlus} onClick={() => setOpen(true)}>
        Agregar miembro
      </Button>
      <Dialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Dar acceso a ops"
        description="La persona necesita una cuenta de shwcs. Entra como revisor y tiene 3 días para configurar su autenticador; puedes subirla a administrador después."
        footer={
          <>
            <Button tone="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button tone="solid" loading={busy} disabled={!valid} onClick={submit}>
              Dar acceso
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
          <Field label="Correo de su cuenta de shwcs" htmlFor="member-email">
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="control h-10"
            />
          </Field>
          <Field label="Motivo" htmlFor="member-reason" hint="Queda en la bitácora.">
            <textarea
              id="member-reason"
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
