'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { mmss, remaining, useSession } from './SessionContext';

const WARN_MS = 2 * 60 * 1000;
const POLL_MS = 60 * 1000;

/**
 * Keeps the client's view of the inactivity window honest. Polling uses GET,
 * which the server deliberately does not count as activity — an open tab must
 * not keep a session alive by itself. Two minutes before the end it asks; at
 * zero it sends the operator to the login.
 */
export function SessionGuard() {
  const { idleExpiresAt, expiresAt, skewMs, update } = useSession();
  const [now, setNow] = useState(() => Date.now());
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (response.status === 401) {
          window.location.assign('/login?reason=idle');
          return;
        }
        const data = await response.json();
        if (!cancelled && data.session) update(data.session);
      } catch {
        /* offline: keep the last known state */
      }
    }
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && poll();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [update]);

  const idleLeft = remaining(idleExpiresAt, skewMs, now);
  const absoluteLeft = remaining(expiresAt, skewMs, now);
  const left = Math.min(idleLeft, absoluteLeft);
  const absoluteEnding = absoluteLeft <= idleLeft;

  useEffect(() => {
    if (left === 0)
      window.location.assign('/login?reason=' + (absoluteEnding ? 'expired' : 'idle'));
  }, [left, absoluteEnding]);

  async function keepAlive() {
    setExtending(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (response.status === 401) {
        window.location.assign('/login?reason=idle');
        return;
      }
      const data = await response.json();
      if (data.session) update(data.session);
    } finally {
      setExtending(false);
    }
  }

  const warn = left > 0 && left <= WARN_MS;

  return (
    <Dialog
      open={warn}
      onClose={absoluteEnding ? () => undefined : keepAlive}
      dismissible={!absoluteEnding}
      size="sm"
      icon={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber">
          <Clock aria-hidden className="size-5" />
        </span>
      }
      title={absoluteEnding ? 'Tu sesión está por terminar' : '¿Sigues ahí?'}
      description={
        absoluteEnding
          ? `Las sesiones de ops duran 8 horas como máximo. Se cerrará en ${mmss(left)}; guarda lo que estés haciendo.`
          : `Por seguridad cerraremos la sesión por inactividad en ${mmss(left)}.`
      }
      footer={
        absoluteEnding ? (
          <Button tone="solid" onClick={() => window.location.assign('/login')}>
            Volver a entrar
          </Button>
        ) : (
          <Button tone="solid" loading={extending} onClick={keepAlive}>
            Seguir conectado
          </Button>
        )
      }
    />
  );
}
