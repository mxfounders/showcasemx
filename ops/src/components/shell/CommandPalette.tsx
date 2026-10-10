'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CornerDownLeft,
  FileText,
  Inbox,
  List,
  LogOut,
  Monitor,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  User,
  type LucideIcon,
} from 'lucide-react';
import { requestElevation } from '@/lib/client';
import { Kbd } from '../ui/Kbd';
import { cn } from '../ui/cn';
import { NAV } from './nav';
import { useSession } from './SessionContext';
import { setThemeFromCommand } from './ThemeToggle';

interface SearchResult {
  type: 'account' | 'solution' | 'list' | 'inquiry';
  id: string;
  label: string;
  sublabel: string;
  href: string;
}

interface Command {
  id: string;
  group: string;
  label: string;
  hint?: string;
  Icon: LucideIcon;
  run: () => void;
}

const RESULT_ICON: Record<SearchResult['type'], LucideIcon> = {
  account: User,
  solution: FileText,
  list: List,
  inquiry: Inbox,
};
const RESULT_GROUP: Record<SearchResult['type'], string> = {
  account: 'Cuentas',
  solution: 'Postulaciones',
  list: 'Listas',
  inquiry: 'Mensajes',
};

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function CommandPalette() {
  const router = useRouter();
  const { level } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
    }
    const onOpen = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('ops:open-command-palette', onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('ops:open-command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setQuery('');
      setResults([]);
      setActive(0);
      element.showModal();
      window.setTimeout(() => input.current?.focus(), 0);
    } else if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await response.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      window.clearTimeout(id);
      controller.abort();
    };
  }, [query, open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const navigation: Command[] = NAV.flatMap(group =>
      group.items
        .filter(item => !item.admin || level === 'admin')
        .map(item => ({
          id: `nav:${item.href}`,
          group: 'Ir a',
          label: item.label,
          hint: `${group.section} ${item.keywords ?? ''}`,
          Icon: item.Icon,
          run: go(item.href),
        })),
    );
    const actions: Command[] = [
      {
        id: 'act:secure',
        group: 'Acciones',
        label: 'Activar modo seguro',
        hint: 'elevar totp 2fa sudo',
        Icon: ShieldCheck,
        run: () => {
          setOpen(false);
          void requestElevation(
            'Activa el modo seguro para desbloquear acciones críticas durante 10 minutos.',
          );
        },
      },
      {
        id: 'act:light',
        group: 'Acciones',
        label: 'Tema claro',
        hint: 'apariencia',
        Icon: Sun,
        run: () => setThemeFromCommand('light'),
      },
      {
        id: 'act:dark',
        group: 'Acciones',
        label: 'Tema oscuro',
        hint: 'apariencia noche',
        Icon: Moon,
        run: () => setThemeFromCommand('dark'),
      },
      {
        id: 'act:system',
        group: 'Acciones',
        label: 'Tema del sistema',
        hint: 'apariencia automático',
        Icon: Monitor,
        run: () => setThemeFromCommand('system'),
      },
      {
        id: 'act:logout',
        group: 'Acciones',
        label: 'Cerrar sesión',
        hint: 'salir logout',
        Icon: LogOut,
        run: async () => {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          }).catch(() => undefined);
          window.location.assign('/login?reason=logout');
        },
      },
    ];
    const term = normalize(query.trim());
    const matches = (command: Command) =>
      !term || normalize(`${command.label} ${command.hint ?? ''}`).includes(term);
    const found: Command[] = results.map(result => ({
      id: `${result.type}:${result.id}`,
      group: RESULT_GROUP[result.type],
      label: result.label,
      hint: result.sublabel,
      Icon: RESULT_ICON[result.type],
      run: go(result.href),
    }));
    return [...navigation.filter(matches), ...found, ...actions.filter(matches)];
  }, [query, results, level, router]);

  useEffect(() => setActive(0), [query, results.length]);
  useEffect(() => {
    list.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(index => Math.min(commands.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      commands[active]?.run();
    }
  }

  let lastGroup = '';

  return (
    <dialog
      ref={dialog}
      aria-label="Paleta de comandos"
      onCancel={event => {
        event.preventDefault();
        setOpen(false);
      }}
      onClick={event => event.target === dialog.current && setOpen(false)}
      className="mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl overflow-visible bg-transparent p-0 text-fg backdrop:bg-black/40 backdrop:backdrop-blur-[3px] open:animate-pop-in"
    >
      {open && (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-pop">
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search
              aria-hidden
              className={cn('size-[18px] shrink-0 text-subtle', loading && 'animate-pulse')}
            />
            <input
              ref={input}
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Busca cuentas, fichas, listas, mensajes o una página…"
              aria-label="Buscar"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={commands[active] ? `command-${active}` : undefined}
              maxLength={200}
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            />
            <Kbd>Esc</Kbd>
          </div>
          <ul
            ref={list}
            id="command-list"
            role="listbox"
            className="max-h-[min(60vh,440px)] overflow-y-auto p-2"
          >
            {commands.length === 0 && (
              <li className="px-3 py-10 text-center text-sm text-muted">
                {loading
                  ? 'Buscando…'
                  : query.trim().length < 2
                    ? 'Escribe para buscar.'
                    : 'Sin resultados.'}
              </li>
            )}
            {commands.map((command, index) => {
              const header = command.group !== lastGroup ? command.group : null;
              lastGroup = command.group;
              return (
                <li key={command.id} role="presentation">
                  {header && <p className="label-micro px-3 pb-1 pt-3 first:pt-1">{header}</p>}
                  <button
                    type="button"
                    id={`command-${index}`}
                    role="option"
                    aria-selected={index === active}
                    data-index={index}
                    onMouseMove={() => setActive(index)}
                    onClick={() => command.run()}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                      index === active ? 'bg-accent-soft text-accent-fg' : 'text-fg-2',
                    )}
                  >
                    <command.Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">
                        {command.label}
                      </span>
                      {command.group !== 'Ir a' && command.group !== 'Acciones' && command.hint && (
                        <span className="block truncate text-[12px] text-muted">
                          {command.hint}
                        </span>
                      )}
                    </span>
                    {index === active ? (
                      <CornerDownLeft aria-hidden className="size-3.5 opacity-70" />
                    ) : (
                      <ArrowRight aria-hidden className="size-3.5 opacity-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2 text-[11.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navegar
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> abrir
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <Kbd>?</Kbd> atajos
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}
