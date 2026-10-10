'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** j = siguiente en la cola, k = anterior, while not typing. */
export function ReviewKeys({
  prevHref,
  nextHref,
}: {
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (
        (event.target as HTMLElement | null)?.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return;
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'j' && nextHref) router.push(nextHref);
      else if (event.key === 'k' && prevHref) router.push(prevHref);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [router, prevHref, nextHref]);
  return null;
}
