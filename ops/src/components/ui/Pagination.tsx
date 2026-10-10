import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtNumber } from '@/lib/format';
import { cn } from './cn';

export function Pagination({
  page,
  hasMore,
  hrefFor,
  total,
  pageSize,
}: {
  page: number;
  hasMore: boolean;
  hrefFor: (page: number) => string;
  total?: number;
  pageSize?: number;
}) {
  if (page <= 1 && !hasMore) {
    return total !== undefined ? (
      <p className="num px-1 pt-3 text-[12.5px] text-muted">{fmtNumber(total)} en total</p>
    ) : null;
  }
  const from = pageSize ? (page - 1) * pageSize + 1 : null;
  const linkClass =
    'inline-flex h-8 items-center gap-1 rounded-[10px] border border-line bg-surface px-3 text-[13px] font-medium text-fg-2 shadow-card transition hover:border-line-strong hover:text-fg';
  const disabled = 'pointer-events-none opacity-40';
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 pt-4">
      <p className="num text-[12.5px] text-muted">
        {from !== null && pageSize
          ? `${fmtNumber(from)}–${fmtNumber(from + pageSize - 1)}${total !== undefined ? ` de ${fmtNumber(total)}` : ''}`
          : `Página ${page}`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(linkClass, page <= 1 && disabled)}
          scroll={false}
        >
          <ChevronLeft aria-hidden className="size-4" /> Anterior
        </Link>
        <Link
          href={hrefFor(page + 1)}
          aria-disabled={!hasMore}
          tabIndex={!hasMore ? -1 : undefined}
          className={cn(linkClass, !hasMore && disabled)}
          scroll={false}
        >
          Siguiente <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
    </nav>
  );
}
