import type { ReactNode } from 'react';
import { cn } from './cn';

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg-2">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] text-terracotta">
          {error}
        </p>
      ) : (
        hint && <p className="text-[12.5px] text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Alert({
  tone = 'terracotta',
  children,
  title,
  className,
}: {
  tone?: 'terracotta' | 'amber' | 'sage' | 'blue';
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  const map = {
    terracotta: 'border-terracotta/25 bg-terracotta-soft text-terracotta',
    amber: 'border-amber/25 bg-amber-soft text-amber',
    sage: 'border-sage/25 bg-sage-soft text-sage',
    blue: 'border-accent/25 bg-accent-soft text-accent-fg',
  } as const;
  return (
    <div
      role={tone === 'terracotta' ? 'alert' : 'status'}
      className={cn('rounded-xl border px-3.5 py-2.5 text-[13px]', map[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-0.5 opacity-90' : undefined}>{children}</div>
    </div>
  );
}
