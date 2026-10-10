'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { OtpInput } from '../ui/OtpInput';
import { Alert } from '../ui/Field';
import { toast } from '@/lib/toast';
import { useSession } from './SessionContext';

type Resolver = (granted: boolean) => void;

/**
 * Step-up prompt. Any api() call that hits `elevation_required` (or any button
 * that calls requestElevation) lands here; every waiting caller resumes once the
 * code is accepted, or gets `false` on cancel.
 */
export function ElevationDialog() {
  const { update } = useSession();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const waiting = useRef<Resolver[]>([]);

  const settle = useCallback((granted: boolean) => {
    const resolvers = waiting.current;
    waiting.current = [];
    resolvers.forEach(resolve => resolve(granted));
    setOpen(false);
    setCode('');
    setError('');
  }, []);

  useEffect(() => {
    function onRequest(event: Event) {
      const detail = (event as CustomEvent<{ resolve: Resolver; reason?: string }>).detail;
      waiting.current.push(detail.resolve);
      setReason(detail.reason);
      setOpen(true);
    }
    window.addEventListener('ops:elevate', onRequest);
    return () => window.removeEventListener('ops:elevate', onRequest);
  }, []);

  async function submit(value: string) {
    if (!/^\d{6}$/.test(value) || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/elevate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        window.location.assign(
          '/login?reason=' + (data.code === 'session_revoked' ? 'revoked' : 'expired'),
        );
        return;
      }
      if (!response.ok) {
        setError(data.error ?? 'No pudimos verificar el código.');
        setCode('');
        return;
      }
      update({ elevatedUntil: data.elevatedUntil });
      toast(
        'Modo seguro activo',
        'success',
        'Las acciones críticas quedan desbloqueadas por 10 minutos.',
      );
      settle(true);
    } catch {
      setError('No se pudo conectar. Revisa tu conexión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => settle(false)}
      size="sm"
      icon={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-fg">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
      }
      title="Confirma que eres tú"
      description={
        reason ??
        'Esta acción requiere modo seguro. Escribe el código de tu app autenticadora; quedará activo 10 minutos en esta sesión.'
      }
      footer={
        <>
          <Button tone="ghost" onClick={() => settle(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            tone="solid"
            loading={busy}
            disabled={code.length !== 6}
            onClick={() => submit(code)}
          >
            Verificar
          </Button>
        </>
      }
    >
      <form
        onSubmit={event => {
          event.preventDefault();
          submit(code);
        }}
        className="space-y-3"
      >
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          disabled={busy}
          autoFocus
          invalid={Boolean(error)}
        />
        {error && <Alert>{error}</Alert>}
      </form>
    </Dialog>
  );
}
