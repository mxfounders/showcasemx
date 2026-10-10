import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { fmtCompact } from '@/lib/format';
import { Sparkline } from '../charts/Sparkline';
import { cn } from './cn';

/** KPI tile: label, proportional big number, optional context line and trend. */
export function Stat({
  label,
  value,
  hint,
  trend,
  href,
  tone = 'default',
  icon,
}: {
  label: string;
  value: number | string;
  hint?: ReactNode;
  trend?: number[];
  href?: string;
  tone?: 'default' | 'attention' | 'danger';
  icon?: ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[13px] font-medium text-muted">
          {icon}
          {label}
        </span>
        {href && (
          <ArrowUpRight
            aria-hidden
            className="size-4 text-subtle opacity-0 transition group-hover:opacity-100"
          />
        )}
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span
          className={cn(
            'text-[28px] font-semibold leading-none tracking-[-0.02em]',
            tone === 'attention' && Number(value) > 0
              ? 'text-amber'
              : tone === 'danger' && Number(value) > 0
                ? 'text-terracotta'
                : 'text-fg',
          )}
        >
          {typeof value === 'number' ? fmtCompact(value) : value}
        </span>
        {trend && trend.length > 1 && (
          <Sparkline values={trend} label={`Tendencia de ${label.toLowerCase()}`} />
        )}
      </div>
      {hint && <p className="mt-2 text-[12.5px] text-muted">{hint}</p>}
    </>
  );
  const shell = 'group block rounded-2xl border border-line bg-surface p-5 shadow-card transition';
  return href ? (
    <Link href={href} className={cn(shell, 'hover:border-line-strong hover:shadow-pop')}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
