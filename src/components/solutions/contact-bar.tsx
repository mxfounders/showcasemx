'use client';
import { useEffect, useState } from 'react';
import Link from '@/i18n/navigation';
import { ArrowRightIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';

/**
 * Phones only (SHCWS-50): on a narrow screen the listing's contact button sits below all
 * of its content, so the main action stays pinned to the bottom edge. It steps aside
 * while that button or the footer is on screen, so it never covers either.
 */
export function ContactBar({
  href,
  label,
  name,
  watchId,
}: {
  href: string;
  label: string;
  name: string;
  /** id of the in-page contact button this bar stands in for. */
  watchId: string;
}) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const targets = [document.getElementById(watchId), document.querySelector('footer')].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    if (!targets.length || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setHidden(visible.size > 0);
    });
    targets.forEach(target => observer.observe(target));
    return () => observer.disconnect();
  }, [watchId]);
  return (
    <div
      inert={hidden}
      aria-hidden={hidden || undefined}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[#f5f5f4]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden ${hidden ? 'translate-y-full' : 'translate-y-0'}`}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-stone-700">{name}</p>
        <Link
          href={href}
          style={actionButtonStyle}
          className="action-button inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
        >
          {label}
          <ArrowRightIcon className="size-4 button-arrow" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
