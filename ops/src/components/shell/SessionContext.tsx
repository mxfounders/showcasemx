'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { OpsLevel } from '@/lib/auth';

export interface ClientSession {
  email: string;
  name: string | null;
  level: OpsLevel;
  elevatedUntil: string | null;
  idleExpiresAt: string;
  expiresAt: string;
}

interface SessionContextValue extends ClientSession {
  /** Server clock minus client clock, so countdowns survive a skewed laptop. */
  skewMs: number;
  update: (patch: Partial<ClientSession> & { serverNow?: string }) => void;
}

const Context = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  initial,
  children,
}: {
  initial: ClientSession & { serverNow: string };
  children: ReactNode;
}) {
  const [state, setState] = useState<ClientSession>(initial);
  const [skewMs, setSkew] = useState(() => new Date(initial.serverNow).getTime() - Date.now());

  const update = useCallback((patch: Partial<ClientSession> & { serverNow?: string }) => {
    const { serverNow, ...rest } = patch;
    if (serverNow) setSkew(new Date(serverNow).getTime() - Date.now());
    setState(current => ({ ...current, ...rest }));
  }, []);

  const value = useMemo(() => ({ ...state, skewMs, update }), [state, skewMs, update]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}

/** Milliseconds left until `iso` on the server's clock (never negative). */
export function remaining(iso: string | null, skewMs: number, now = Date.now()) {
  if (!iso) return 0;
  return Math.max(0, new Date(iso).getTime() - (now + skewMs));
}

export function mmss(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
