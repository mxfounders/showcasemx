'use client';
import { useSyncExternalStore } from 'react';
import Link, { usePathname } from '@/i18n/navigation';
import { ArrowRightIcon, CloseIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import { comparisonHref, minCompared } from '@/lib/library/comparison';
import {
  clearItems,
  getItems,
  getNotice,
  getServerItems,
  getServerNotice,
  removeItem,
  subscribe,
} from './compare-store';
import type { Dictionary } from '@/i18n/dictionary';

type CompareDict = Dictionary['catalog']['compare'];

/**
 * The listings marked with «Comparar», pinned to the bottom of the public pages
 * (SHCWS-53). Mark two or three, then one click opens the comparison: no list needed.
 * Hidden while empty and on the comparison itself. A polite live region says what each
 * click did, including «you already chose three».
 */
export function CompareTray({ dict }: { dict: CompareDict }) {
  const items = useSyncExternalStore(subscribe, getItems, getServerItems);
  const notice = useSyncExternalStore(subscribe, getNotice, getServerNotice);
  const pathname = usePathname();
  const announcement = !notice
    ? ''
    : notice.kind === 'full'
      ? dict.full
      : (notice.kind === 'added' ? dict.addedNotice : dict.removedNotice)
          .replace('{name}', notice.name)
          .replace('{count}', String(notice.count));
  const hidden = !items.length || pathname.startsWith('/comparar');
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {!hidden && (
        <aside
          aria-label={dict.trayLabel}
          className="fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-[22px] border border-stone-200 bg-white/95 p-2.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] backdrop-blur-md sm:flex-nowrap"
        >
          <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {items.map(item => (
              <li
                key={item.key}
                className="inline-flex max-w-[12rem] items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-xs text-stone-700"
              >
                <span className="truncate">{item.name}</span>
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label={dict.removeLabel.replace('{name}', item.name)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-white"
                >
                  <CloseIcon aria-hidden="true" className="size-3" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={clearItems}
              className="rounded-full px-3 py-2 text-xs text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            >
              {dict.clear}
            </button>
            {items.length >= minCompared ? (
              <Link
                href={comparisonHref(items.map(item => item.key))}
                style={actionButtonStyle}
                className="action-button inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium"
              >
                {dict.open.replace('{count}', String(items.length))}
                <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
              </Link>
            ) : (
              <span className="px-2 text-xs text-stone-500">{dict.needMore}</span>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
