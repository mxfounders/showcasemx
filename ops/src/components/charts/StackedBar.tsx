import { fmtNumber } from '@/lib/format';
import { cn } from '../ui/cn';

export interface Segment {
  label: string;
  value: number;
  /** Tailwind background class from the token set (status tones carry meaning here). */
  className: string;
}

/** Part-to-whole in one bar: 2px surface gaps between segments, legend with counts. */
export function StackedBar({ segments, label }: { segments: Segment[]; label: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${segments.map(s => `${s.label} ${s.value}`).join(', ')}`}
        className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full bg-surface-3"
      >
        {total > 0 &&
          segments
            .filter(s => s.value > 0)
            .map(s => (
              <span
                key={s.label}
                className={cn('h-full first:rounded-l-full last:rounded-r-full', s.className)}
                style={{ width: `${(s.value / total) * 100}%` }}
                title={`${s.label}: ${fmtNumber(s.value)}`}
              />
            ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map(s => (
          <li key={s.label} className="flex items-center gap-2 text-[12.5px] text-muted">
            <span aria-hidden className={cn('size-2 rounded-[3px]', s.className)} />
            {s.label}
            <span className="num font-medium text-fg">{fmtNumber(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
