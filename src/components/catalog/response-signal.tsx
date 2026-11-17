import { ClockIcon } from '@/components/icons/gota';
import { formatResponseSignal, type ResponseSignal } from '@/lib/solutions/response-model';

/**
 * «Suele responder en menos de 48 h · 9 de 10 respondidas» (SHCWS-52). Renders nothing
 * below the minimum of requests, so a card never shows an invented or empty signal.
 * Works in server and client components; the ficha can use it as is.
 */
export function ResponseSignalNote({
  signal,
  locale,
  className = 'text-[11px] text-stone-500',
}: {
  signal?: ResponseSignal | null;
  locale: string;
  className?: string;
}) {
  if (!signal) return null;
  const { speed, rate } = formatResponseSignal(signal, locale);
  return (
    <p className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      <ClockIcon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate">{speed ? `${speed} · ${rate}` : rate}</span>
    </p>
  );
}
