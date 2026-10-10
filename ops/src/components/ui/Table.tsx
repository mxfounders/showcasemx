import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from './cn';

/** Semantic table with horizontal scroll contained in its card. */
export function Table({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-line bg-surface shadow-card',
        className,
      )}
    >
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={label}
        tabIndex={label ? 0 : undefined}
      >
        <table className="w-full border-collapse text-left text-[13.5px]">{children}</table>
      </div>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-2/70">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  align = 'left',
  sort,
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
  sort?: { href: string; active: boolean; direction: 'asc' | 'desc' };
}) {
  const content = sort ? (
    <Link
      href={sort.href}
      scroll={false}
      className="group inline-flex items-center gap-1 hover:text-fg"
    >
      {children}
      {sort.active ? (
        sort.direction === 'asc' ? (
          <ArrowUp aria-hidden className="size-3" />
        ) : (
          <ArrowDown aria-hidden className="size-3" />
        )
      ) : (
        <ChevronsUpDown
          aria-hidden
          className="size-3 opacity-0 transition group-hover:opacity-60"
        />
      )}
    </Link>
  ) : (
    children
  );
  return (
    <th
      scope="col"
      aria-sort={sort?.active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-[0.07em] text-muted',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {content}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  children,
  className,
  highlight,
}: {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <tr
      className={cn(
        'group relative transition-colors hover:bg-surface-2',
        highlight && 'bg-amber-soft/40',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  align = 'left',
}: {
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <td className={cn('px-4 py-3 align-middle', align === 'right' && 'num text-right', className)}>
      {children}
    </td>
  );
}

/** Makes a whole row clickable while keeping a real link for keyboard and middle-click. */
export function RowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'font-medium text-fg outline-none after:absolute after:inset-0 hover:text-accent-fg focus-visible:underline',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-2">
        {children}
      </td>
    </tr>
  );
}
