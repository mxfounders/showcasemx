import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

export interface TabItem {
  label: string;
  href: string;
  active: boolean;
  count?: number;
  icon?: LucideIcon;
}

/** Underline tabs for sections of one page (URL-driven, so back/forward works). */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto">
      <ul className="flex min-w-max items-center gap-1 border-b border-line px-1">
        {items.map(({ label: text, href, active, count, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative -mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-[13.5px] font-medium transition',
                active
                  ? 'border-accent text-fg'
                  : 'border-transparent text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {Icon && <Icon aria-hidden className="size-4" strokeWidth={1.8} />}
              {text}
              {count !== undefined && (
                <span
                  className={cn(
                    'num rounded-full px-1.5 text-[11px] font-semibold',
                    active ? 'bg-accent-soft text-accent-fg' : 'bg-surface-3 text-muted',
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Pill filter group (mutually exclusive). */
export function Segmented({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="max-w-full overflow-x-auto">
      <ul className="inline-flex min-w-max items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5 shadow-card">
        {items.map(({ label: text, href, active, count }) => (
          <li key={href}>
            <Link
              href={href}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition',
                active
                  ? 'bg-accent-soft text-accent-fg'
                  : 'text-muted hover:bg-surface-3 hover:text-fg',
              )}
            >
              {text}
              {count !== undefined && (
                <span
                  className={cn('num text-[11.5px]', active ? 'text-accent-fg/80' : 'text-subtle')}
                >
                  {count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
