import type { ReactNode } from 'react';
import { RelativeTime } from '../ui/RelativeTime';
import { cn } from '../ui/cn';

export interface TimelineItem {
  id: string;
  title: ReactNode;
  body?: ReactNode;
  meta?: ReactNode;
  at: string | null;
  tone?: 'neutral' | 'blue' | 'sage' | 'lavender' | 'terracotta' | 'amber';
}

const DOT = {
  neutral: 'bg-subtle',
  blue: 'bg-accent',
  sage: 'bg-sage',
  lavender: 'bg-lavender',
  terracotta: 'bg-terracotta',
  amber: 'bg-amber',
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4 pb-5 last:pb-0">
          {index < items.length - 1 && (
            <span
              aria-hidden
              className="absolute left-[4px] top-4 h-[calc(100%-8px)] w-px bg-line"
            />
          )}
          <span
            aria-hidden
            className={cn(
              'relative mt-[6px] size-[9px] shrink-0 rounded-full ring-4 ring-surface',
              DOT[item.tone ?? 'neutral'],
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="text-[13.5px] font-medium text-fg">{item.title}</div>
              <RelativeTime value={item.at} className="text-[12px] text-muted" />
            </div>
            {item.body && (
              <div className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-fg-2">
                {item.body}
              </div>
            )}
            {item.meta && <div className="mt-1 text-[12px] text-muted">{item.meta}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
