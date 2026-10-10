'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, LogOut, Menu, ShieldCheck, ShieldOff, X } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Count } from '../ui/Badge';
import { Kbd } from '../ui/Kbd';
import { cn } from '../ui/cn';
import { ThemeCycleButton } from './ThemeToggle';
import { NAV, isActive, type CountKey } from './nav';
import { mmss, remaining, useSession } from './SessionContext';
import { requestElevation } from '@/lib/client';
import { toast } from '@/lib/toast';

function Logo() {
  return (
    <Link
      href="/panel"
      className="flex items-center gap-2 rounded-md"
      aria-label="shwcs ops, inicio"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/shwcs-logo-blue.png" alt="" className="h-[18px] w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/shwcs-logo-white.png" alt="" className="hidden h-[18px] w-auto dark:block" />
      <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-fg">
        ops
      </span>
    </Link>
  );
}

function SecureModeChip() {
  const { elevatedUntil, skewMs, update } = useSession();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const left = remaining(elevatedUntil, skewMs, now);

  if (left <= 0)
    return (
      <button
        type="button"
        onClick={async () => {
          await requestElevation(
            'Activa el modo seguro para desbloquear acciones críticas durante 10 minutos.',
          );
        }}
        className="flex h-9 w-full items-center gap-2.5 rounded-xl border border-dashed border-line px-3 text-left text-[12.5px] font-medium text-muted transition hover:border-accent/40 hover:text-accent-fg"
      >
        <ShieldOff aria-hidden className="size-4" />
        Modo seguro inactivo
      </button>
    );

  return (
    <div className="flex h-9 items-center gap-2.5 rounded-xl bg-accent-soft px-3 text-[12.5px] text-accent-fg">
      <ShieldCheck aria-hidden className="size-4 shrink-0" />
      <span className="flex-1 font-medium">
        Modo seguro <span className="num opacity-80">{mmss(left)}</span>
      </span>
      <button
        type="button"
        onClick={async () => {
          await fetch('/api/auth/elevate', {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
          update({ elevatedUntil: null });
          toast('Modo seguro desactivado', 'info');
        }}
        className="rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold hover:bg-surface/60"
      >
        Salir
      </button>
    </div>
  );
}

function NavLinks({
  counts,
  onNavigate,
}: {
  counts: Record<CountKey, number>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { level } = useSession();
  return (
    <div className="space-y-4">
      {NAV.map(group => {
        const items = group.items.filter(item => !item.admin || level === 'admin');
        if (!items.length) return null;
        return (
          <div key={group.section}>
            <p className="label-micro px-3 pb-1.5">{group.section}</p>
            <ul className="space-y-0.5">
              {items.map(item => {
                const active = isActive(pathname, item);
                const count = item.count ? counts[item.count] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex h-[34px] items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
                        active
                          ? 'bg-accent-soft text-accent-fg'
                          : 'text-muted hover:bg-surface-3 hover:text-fg',
                      )}
                    >
                      <item.Icon
                        aria-hidden
                        strokeWidth={1.8}
                        className="size-[17px] shrink-0 transition-transform group-hover:-translate-y-px motion-reduce:transform-none"
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count > 0 && (
                        <Count
                          value={count}
                          tone={
                            item.count === 'mail' || item.count === 'reports'
                              ? 'terracotta'
                              : 'blue'
                          }
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function Account() {
  const { email, name, level } = useSession();
  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).catch(() => undefined);
    window.location.assign('/login?reason=logout');
  }
  return (
    <div className="space-y-2">
      <SecureModeChip />
      <div className="flex items-center gap-2 rounded-xl px-1 py-0.5">
        <Avatar name={name} email={email} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-fg">
            {name ?? email.split('@')[0]}
          </p>
          <p className="truncate text-[11.5px] text-muted">
            {level === 'admin' ? 'Administrador' : 'Revisor'} · {email}
          </p>
        </div>
        <ThemeCycleButton />
        <button
          type="button"
          onClick={logout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="rounded-lg p-1.5 text-subtle transition hover:bg-surface-3 hover:text-terracotta"
        >
          <LogOut aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('ops:open-command-palette'))}
      className="flex h-9 w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 text-[13px] text-muted transition hover:border-line-strong hover:text-fg"
    >
      <Command aria-hidden className="size-4" />
      <span className="flex-1 text-left">Buscar o saltar a…</span>
      <Kbd>⌘K</Kbd>
    </button>
  );
}

export function Sidebar({ counts }: { counts: Record<CountKey, number> }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop rail: flush left, square left corners, rounded right (product sidebar). */}
      <aside
        aria-label="Navegación de operaciones"
        className="fixed inset-y-6 left-0 z-40 hidden w-[248px] lg:block"
      >
        <div className="flex h-full flex-col rounded-r-2xl border border-l-0 border-line bg-surface shadow-rail">
          <div className="flex items-center justify-between px-5 pb-4 pt-5">
            <Logo />
          </div>
          <div className="px-3 pb-3">
            <SearchTrigger />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <NavLinks counts={counts} />
          </nav>
          <div className="border-t border-line p-3">
            <Account />
          </div>
        </div>
      </aside>

      {/* Mobile top bar + sheet. */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-canvas/85 px-4 backdrop-blur-md lg:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Buscar"
            onClick={() => window.dispatchEvent(new CustomEvent('ops:open-command-palette'))}
            className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-fg"
          >
            <Command aria-hidden className="size-[18px]" />
          </button>
          <button
            type="button"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-fg"
          >
            <Menu aria-hidden className="size-5" />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 animate-fade-in bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(86vw,320px)] animate-slide-in-left flex-col bg-surface shadow-pop">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo />
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-subtle hover:bg-surface-3"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 pb-4">
              <NavLinks counts={counts} onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="border-t border-line p-3">
              <Account />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
