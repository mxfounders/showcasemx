'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from './cn';

/** Debounced search box bound to a URL param; the server page does the filtering. */
export function SearchField({
  placeholder = 'Buscar…',
  name = 'q',
  className,
  autoFocus,
}: {
  placeholder?: string;
  name?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(name) ?? '');
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set(name, value.trim());
      else next.delete(name);
      next.delete('page');
      const query = next.toString();
      startTransition(() =>
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }),
      );
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle',
          pending && 'animate-pulse',
        )}
      />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={event => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={200}
        className="control h-9 pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar búsqueda"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle transition hover:text-fg"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}
