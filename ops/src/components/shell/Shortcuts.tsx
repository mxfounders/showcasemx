'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Kbd } from '../ui/Kbd';
import { useSession } from './SessionContext';

const GO: Record<string, { href: string; label: string; admin?: boolean }> = {
  i: { href: '/panel', label: 'Inicio' },
  r: { href: '/panel/revision', label: 'Revisión' },
  p: { href: '/panel/postulaciones', label: 'Postulaciones' },
  d: { href: '/panel/reportes', label: 'Reportes' },
  c: { href: '/panel/cuentas', label: 'Cuentas' },
  o: { href: '/panel/contactos', label: 'Contactos' },
  m: { href: '/panel/mensajes', label: 'Mensajes' },
  e: { href: '/panel/correo', label: 'Correo' },
  s: { href: '/panel/seguridad', label: 'Seguridad' },
  y: { href: '/panel/sistema', label: 'Sistema', admin: true },
  b: { href: '/panel/bitacora', label: 'Bitácora', admin: true },
};

function typing(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"]'));
}

/** Gmail-style "g then letter" jumps plus "?" for the cheat sheet. */
export function Shortcuts() {
  const router = useRouter();
  const { level } = useSession();
  const [help, setHelp] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (document.querySelector('dialog[open]') && event.key !== '?') return;
      if (event.key === '?') {
        event.preventDefault();
        setHelp(value => !value);
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('ops:open-command-palette'));
        return;
      }
      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const target = GO[event.key.toLowerCase()];
        if (target && (!target.admin || level === 'admin')) {
          event.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (event.key === 'g')
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router, level]);

  const rows: Array<[React.ReactNode, string]> = [
    [
      <>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </>,
      'Buscar o saltar a cualquier lugar',
    ],
    [<Kbd key="slash">/</Kbd>, 'Abrir la búsqueda'],
    [<Kbd key="q">?</Kbd>, 'Mostrar u ocultar esta ayuda'],
    ...Object.entries(GO)
      .filter(([, target]) => !target.admin || level === 'admin')
      .map(
        ([key, target]) =>
          [
            <>
              <Kbd>g</Kbd>
              <Kbd>{key}</Kbd>
            </>,
            `Ir a ${target.label}`,
          ] as [React.ReactNode, string],
      ),
    [
      <>
        <Kbd>j</Kbd>
        <Kbd>k</Kbd>
      </>,
      'Siguiente / anterior en la cola de revisión',
    ],
  ];

  return (
    <Dialog
      open={help}
      onClose={() => setHelp(false)}
      size="md"
      icon={
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-fg-2">
          <Keyboard aria-hidden className="size-5" />
        </span>
      }
      title="Atajos de teclado"
      description="Funcionan en cualquier página del panel mientras no estés escribiendo."
    >
      <ul className="divide-y divide-line">
        {rows.map(([keys, label]) => (
          <li key={label} className="flex items-center justify-between gap-4 py-2 text-[13.5px]">
            <span className="text-fg-2">{label}</span>
            <span className="flex items-center gap-1">{keys}</span>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
