'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Two native date inputs bound to ?from= and ?to= (inclusive days). */
export function DateRange() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function set(name: 'from' | 'to', value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('cursor');
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className={`flex items-center gap-1.5 ${pending ? 'opacity-70' : ''}`}>
      <label className="sr-only" htmlFor="range-from">
        Desde
      </label>
      <input
        id="range-from"
        type="date"
        defaultValue={params.get('from') ?? ''}
        onChange={event => set('from', event.target.value)}
        className="control h-9 w-[150px] text-[13px]"
      />
      <span className="text-[12px] text-muted">a</span>
      <label className="sr-only" htmlFor="range-to">
        Hasta
      </label>
      <input
        id="range-to"
        type="date"
        defaultValue={params.get('to') ?? ''}
        onChange={event => set('to', event.target.value)}
        className="control h-9 w-[150px] text-[13px]"
      />
    </div>
  );
}
