import type { ReactNode } from 'react';
import { cn } from './cn';

export interface DescriptionItem {
  label: string;
  value: ReactNode;
  wide?: boolean;
  mono?: boolean;
}

/** Label/value grid. Empty values render an explicit em dash, never a blank. */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: {
  items: DescriptionItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const grid = columns === 1 ? 'grid-cols-1' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', grid, className)}>
      {items.map(item => (
        <div key={item.label} className={cn('min-w-0', item.wide && 'sm:col-span-full')}>
          <dt className="label-micro">{item.label}</dt>
          <dd
            className={cn(
              'mt-1 break-words text-sm text-fg',
              item.mono && 'font-mono text-[12.5px]',
            )}
          >
            {item.value === null || item.value === undefined || item.value === '' ? (
              <span className="text-subtle">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
