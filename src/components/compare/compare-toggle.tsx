'use client';
import { useSyncExternalStore } from 'react';
import { CheckIcon, ViewColumnsIcon } from '@/components/icons/gota';
import { maxCompared } from '@/lib/library/comparison';
import { getItems, getServerItems, subscribe, toggleItem } from './compare-store';
import type { Dictionary } from '@/i18n/dictionary';

type CompareDict = Dictionary['catalog']['compare'];

/**
 * «Comparar» on a catalog card or a listing (SHCWS-53): adds the listing to the
 * comparison tray, or takes it out. A toggle button (aria-pressed), never a link, so it
 * can sit beside a card's link without being nested in it. Only published listings get
 * one; sponsored slots never do.
 */
export function CompareToggle({
  projectKey,
  name,
  dict,
  className = '',
}: {
  projectKey: string;
  name: string;
  dict: CompareDict;
  className?: string;
}) {
  const items = useSyncExternalStore(subscribe, getItems, getServerItems);
  const selected = items.some(item => item.key === projectKey);
  const full = !selected && items.length >= maxCompared;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={(selected ? dict.removeLabel : dict.addLabel).replace('{name}', name)}
      title={full ? dict.full : undefined}
      onClick={() => toggleItem({ key: projectKey, name })}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-[background-color,border-color,color,transform] duration-150 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4] motion-reduce:transition-none ${
        selected
          ? 'border-[#365DC4] bg-[#E4EBFC] text-[#365DC4]'
          : full
            ? 'border-stone-200 bg-white text-stone-400'
            : 'border-stone-300 bg-white text-stone-700 hover:border-stone-400'
      } ${className}`}
    >
      {selected ? (
        <CheckIcon aria-hidden="true" className="size-3.5" />
      ) : (
        <ViewColumnsIcon aria-hidden="true" className="size-3.5" />
      )}
      {selected ? dict.added : dict.add}
    </button>
  );
}
