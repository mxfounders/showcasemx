import { fmtNumber, fmtPercent } from '@/lib/format';

export interface BarItem {
  label: string;
  value: number;
  href?: string;
}

/** Ranked horizontal bars, one color (identity is the label, not the hue). */
export function BarList({
  items,
  total,
  emptyLabel = 'Sin datos todavía.',
}: {
  items: BarItem[];
  total?: number;
  emptyLabel?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-[13px] text-muted">{emptyLabel}</p>;
  const max = Math.max(...items.map(item => item.value), 1);
  const sum = total ?? items.reduce((acc, item) => acc + item.value, 0);
  return (
    <ul className="space-y-3">
      {items.map(item => (
        <li key={item.label} title={`${item.label}: ${fmtNumber(item.value)}`}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-fg-2">{item.label}</span>
            <span className="num shrink-0 text-fg">
              {fmtNumber(item.value)}{' '}
              <span className="text-muted">· {fmtPercent(item.value, sum)}</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-series-1"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
