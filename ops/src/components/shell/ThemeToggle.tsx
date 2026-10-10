'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_COOKIE, type ThemePreference } from '@/lib/theme';
import { cn } from '../ui/cn';

const OPTIONS: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
  { value: 'system', label: 'Sistema', Icon: Monitor },
];

function apply(theme: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
}

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemePreference>('system');

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark' || current === 'system') setTheme(current);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => document.documentElement.dataset.theme === 'system' && apply('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function choose(next: ThemePreference) {
    setTheme(next);
    apply(next);
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn('flex items-center gap-0.5 rounded-xl bg-surface-3 p-0.5', compact && 'w-full')}
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            'flex h-7 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 text-[12px] font-medium transition',
            theme === value ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg',
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          <span className={compact ? 'sr-only' : undefined}>{label}</span>
        </button>
      ))}
    </div>
  );
}

/** Dispatchable from the command palette. */
export function setThemeFromCommand(next: ThemePreference) {
  apply(next);
  document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
}

const CYCLE: ThemePreference[] = ['light', 'dark', 'system'];

/** One compact button that cycles claro → oscuro → sistema. */
export function ThemeCycleButton() {
  const [theme, setTheme] = useState<ThemePreference>('system');
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark' || current === 'system') setTheme(current);
  }, []);
  const option = OPTIONS.find(item => item.value === theme) ?? OPTIONS[2];
  const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next);
        setThemeFromCommand(next);
      }}
      aria-label={`Tema: ${option.label}. Cambiar a ${OPTIONS.find(item => item.value === next)?.label}`}
      title={`Tema: ${option.label}`}
      className="rounded-lg p-1.5 text-subtle transition hover:bg-surface-3 hover:text-fg"
    >
      <option.Icon aria-hidden className="size-4" />
    </button>
  );
}
