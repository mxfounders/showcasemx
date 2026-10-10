'use client';

import { useEffect } from 'react';

/**
 * j / k move focus through `[data-queue-item]` links on the page, Enter opens
 * the focused one (native link behaviour). Ignored while typing or in a dialog.
 */
export function QueueKeys() {
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
      if (event.key !== 'j' && event.key !== 'k') return;
      const items = Array.from(document.querySelectorAll<HTMLElement>('[data-queue-item]'));
      if (!items.length) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === 'j'
          ? Math.min(items.length - 1, index + 1)
          : Math.max(0, index === -1 ? 0 : index - 1);
      items[next]?.focus();
      items[next]?.scrollIntoView({ block: 'nearest' });
      event.preventDefault();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
