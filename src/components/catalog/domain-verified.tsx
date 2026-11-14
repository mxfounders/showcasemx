import { commonText } from '@/i18n/common';

/**
 * «Dominio verificado · nov 2026» on a catalogue card (SHCWS-134): the listing proved, with
 * a TXT record, that it controls its site's domain. Control of a domain, not a legal
 * identity or a review of the product; the hint says so to screen readers and on hover.
 * Renders nothing without a current proof.
 */
export function DomainVerifiedChip({
  at,
  locale,
  className = '',
}: {
  at?: string | null;
  locale: string;
  className?: string;
}) {
  if (!at) return null;
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  const text = commonText(locale);
  const label = text.domainVerified.replace(
    '{date}',
    // Engines disagree on «nov» vs «nov.»; without the dot, server and browser match.
    date
      .toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Mexico_City',
      })
      .replace('.', ''),
  );
  return (
    <span
      title={text.domainVerifiedHint}
      className={`rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-stone-700 ${className}`}
    >
      {label}
      <span className="sr-only"> ({text.domainVerifiedHint})</span>
    </span>
  );
}
