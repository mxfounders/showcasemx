import type { ReactNode } from 'react';
import { Fingerprint, LockKeyhole, ScrollText } from 'lucide-react';
import { cn } from '@/components/ui/cn';

const STEPS = ['Contraseña', 'Verificación'];

/** Shared frame for every pre-session screen. */
export function AuthShell({
  step,
  title,
  description,
  children,
  wide,
}: {
  step: 0 | 1;
  title: string;
  description: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,rgb(var(--accent)/0.10),transparent_70%)]"
      />
      <div className={cn('relative w-full', wide ? 'max-w-[460px]' : 'max-w-[400px]')}>
        <div className="mb-8 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shwcs-logo-blue.png" alt="shwcs" className="h-6 w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/shwcs-logo-white.png"
            alt="shwcs"
            className="hidden h-6 w-auto dark:block"
          />
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-fg">
            ops
          </span>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-7 shadow-pop sm:p-8">
          <ol aria-label="Pasos de acceso" className="mb-6 flex items-center gap-2">
            {STEPS.map((label, index) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  aria-current={index === step ? 'step' : undefined}
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold',
                    index < step
                      ? 'bg-sage text-white'
                      : index === step
                        ? 'bg-accent text-white'
                        : 'bg-surface-3 text-muted',
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'text-[12px] font-medium',
                    index === step ? 'text-fg' : 'text-muted',
                  )}
                >
                  {label}
                </span>
                {index < STEPS.length - 1 && <span aria-hidden className="h-px flex-1 bg-line" />}
              </li>
            ))}
          </ol>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-fg">{title}</h1>
          <div className="mb-6 mt-1.5 text-sm text-muted">{description}</div>
          {children}
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-muted">
          <li className="flex items-center gap-1.5">
            <Fingerprint aria-hidden className="size-3.5" /> Dos pasos obligatorios
          </li>
          <li className="flex items-center gap-1.5">
            <LockKeyhole aria-hidden className="size-3.5" /> Sesión de 8 h, 30 min sin uso
          </li>
          <li className="flex items-center gap-1.5">
            <ScrollText aria-hidden className="size-3.5" /> Cada acceso queda registrado
          </li>
        </ul>
      </div>
    </main>
  );
}
