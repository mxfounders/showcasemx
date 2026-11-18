import { maxCompared } from '@/lib/library/comparison';

/**
 * The listings a visitor marked with «Comparar» (SHCWS-53), kept in this browser only so
 * the selection survives moving between catalog pages and listings. It is a convenience:
 * nothing reaches the server until the visitor opens the comparison, whose URL carries
 * the keys and is validated there. Storage can be missing or throw (private windows,
 * blocked site data); the selection then lives only in memory for this page.
 */
export type CompareItem = { key: string; name: string };
type Notice = { kind: 'added' | 'removed' | 'full'; name: string; count: number };

const storageKey = 'shwcs-compare';
const empty: CompareItem[] = [];
let items: CompareItem[] = empty;
let notice: Notice | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CompareItem[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
    if (!Array.isArray(value)) return empty;
    return value
      .filter(
        (item): item is CompareItem =>
          !!item && typeof item.key === 'string' && typeof item.name === 'string',
      )
      .slice(0, maxCompared);
  } catch {
    return empty;
  }
}
function write(next: CompareItem[], change: Notice | null) {
  items = next;
  notice = change;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* in-memory only */
  }
  listeners.forEach(listener => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the selection.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey) return;
    items = read();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
export function getItems() {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true;
    items = read();
  }
  return items;
}
export const getServerItems = () => empty;
export const getNotice = () => notice;
export const getServerNotice = () => null;

export function toggleItem(item: CompareItem) {
  const current = getItems();
  if (current.some(entry => entry.key === item.key))
    return write(
      current.filter(entry => entry.key !== item.key),
      { kind: 'removed', name: item.name, count: current.length - 1 },
    );
  if (current.length >= maxCompared)
    return write(current, { kind: 'full', name: item.name, count: current.length });
  write([...current, item], { kind: 'added', name: item.name, count: current.length + 1 });
}
export function removeItem(key: string) {
  const current = getItems();
  const item = current.find(entry => entry.key === key);
  if (item)
    write(
      current.filter(entry => entry.key !== key),
      { kind: 'removed', name: item.name, count: current.length - 1 },
    );
}
export function clearItems() {
  write(empty, null);
}
/** The selection a comparison page opened with (CompareSync); announces nothing. */
export function replaceItems(next: CompareItem[]) {
  write(next.slice(0, maxCompared), null);
}
