'use client';
import { useEffect } from 'react';
import { getItems, replaceItems, type CompareItem } from './compare-store';

/**
 * Opening a comparison (or dropping a column) makes it the tray's selection too, so going
 * back to the catalog keeps exactly what is being compared.
 */
export function CompareSync({ items }: { items: CompareItem[] }) {
  useEffect(() => {
    const current = getItems();
    if (
      current.length !== items.length ||
      current.some((item, index) => item.key !== items[index]?.key)
    )
      replaceItems(items);
  }, [items]);
  return null;
}
