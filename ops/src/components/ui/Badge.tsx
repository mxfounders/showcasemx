import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

export type Tone = 'neutral' | 'blue' | 'sage' | 'lavender' | 'terracotta' | 'amber';

const tones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-surface-3 text-fg-2', dot: 'bg-subtle' },
  blue: { pill: 'bg-accent-soft text-accent-fg', dot: 'bg-accent' },
  sage: { pill: 'bg-sage-soft text-sage', dot: 'bg-sage' },
  lavender: { pill: 'bg-lavender-soft text-lavender', dot: 'bg-lavender' },
  terracotta: { pill: 'bg-terracotta-soft text-terracotta', dot: 'bg-terracotta' },
  amber: { pill: 'bg-amber-soft text-amber', dot: 'bg-amber' },
};

export function Badge({
  tone = 'neutral',
  dot,
  icon: Icon,
  children,
  className,
  title,
}: {
  tone?: Tone;
  dot?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-[22px] max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium',
        tones[tone].pill,
        className,
      )}
    >
      {dot && (
        <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', tones[tone].dot)} />
      )}
      {Icon && <Icon aria-hidden className="size-3 shrink-0" strokeWidth={2.2} />}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Count({
  value,
  tone = 'blue',
}: {
  value: number;
  tone?: 'blue' | 'terracotta' | 'neutral';
}) {
  if (!value) return null;
  const style =
    tone === 'terracotta'
      ? 'bg-terracotta text-surface'
      : tone === 'neutral'
        ? 'bg-surface-3 text-fg-2'
        : 'bg-accent text-white';
  return (
    <span
      className={cn(
        'num inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-semibold',
        style,
      )}
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}
