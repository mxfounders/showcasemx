import type { ReactNode } from 'react';
import { cn } from './cn';

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-surface-2 px-1.5 font-sans text-[10.5px] font-medium text-muted shadow-[0_1px_0_rgb(var(--line))]',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
