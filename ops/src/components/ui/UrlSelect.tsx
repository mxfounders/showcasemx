'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from './cn';

/** Native select (keyboard + screen-reader friendly) bound to one URL param. */
export function UrlSelect({
  name,
  options,
  label,
  className,
}: {
  name: string;
  options: Array<{ value: string; label: string }>;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = params.get(name) ?? options[0]?.value ?? '';

  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={current}
        onChange={event => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value && event.target.value !== options[0]?.value)
            next.set(name, event.target.value);
          else next.delete(name);
          next.delete('page');
          const query = next.toString();
          startTransition(() =>
            router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }),
          );
        }}
        className={cn(
          'control h-9 appearance-none pr-8 text-[13px] font-medium',
          pending && 'opacity-70',
        )}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 size-4 text-subtle"
      />
    </label>
  );
}
