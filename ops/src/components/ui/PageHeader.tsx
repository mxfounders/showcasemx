import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
  title,
  description,
  actions,
  back,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 pb-6 pt-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link
            href={back.href}
            className="group mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-muted transition hover:text-fg"
          >
            <ChevronLeft aria-hidden className="size-4 transition group-hover:-translate-x-0.5" />
            {back.label}
          </Link>
        )}
        <h1 className="text-balance text-[24px] font-semibold leading-tight tracking-[-0.02em] text-fg">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-pretty text-sm text-muted">{description}</p>
        )}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
