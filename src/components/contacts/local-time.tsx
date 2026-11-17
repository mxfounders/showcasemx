'use client';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * A date in the reader's own time zone (SHCWS-14). The server cannot know it, so the
 * first render shows UTC (labelled when it includes a time) and the browser replaces it
 * on hydration. Without JavaScript the UTC text stays, which is still correct.
 */
export function LocalTime({
  value,
  locale,
  options,
}: {
  value: string;
  locale: string;
  options: Intl.DateTimeFormatOptions;
}) {
  const browser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const withTime = 'timeStyle' in options || 'hour' in options;
  const text = date.toLocaleString(locale, browser ? options : { ...options, timeZone: 'UTC' });
  return (
    <time dateTime={date.toISOString()}>
      {text}
      {!browser && withTime ? ' UTC' : ''}
    </time>
  );
}
