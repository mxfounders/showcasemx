import { Landmark } from 'lucide-react';
import type { ComplianceResult } from '@/lib/compliance/server';
import type { Dictionary } from '@/i18n/dictionary';

const tones = {
  definitivo: 'text-[#A94E35]',
  presunto: 'text-[#88631B]',
  pending: 'text-stone-500',
  neutral: 'text-[#416B50]',
} as const;

/**
 * What public registries say about a vendor, without its tax ID. Lives under the ficha's
 * title next to the domain check; a vendor that declared nothing shows nothing.
 */
export function ComplianceNote({
  result,
  locale,
  dict,
}: {
  result: ComplianceResult | null;
  locale: string;
  dict: Dictionary['compliance']['public'];
}) {
  if (!result) return null;
  const date = (value: string) =>
    new Date(value.length === 10 ? `${value}T12:00:00Z` : value).toLocaleDateString(
      locale === 'en' ? 'en-US' : 'es-MX',
      { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' },
    );

  if (result.registry === null) {
    const country = new Intl.DisplayNames([locale], { type: 'region' }).of(result.country);
    return (
      <p className="mt-3 flex items-start gap-2 text-xs text-stone-500">
        <Landmark className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        {dict.declaredOnly.replace('{country}', country ?? result.country)}
      </p>
    );
  }

  const tone =
    result.situation === 'definitivo'
      ? tones.definitivo
      : result.situation === 'presunto'
        ? tones.presunto
        : result.situation === 'pending'
          ? tones.pending
          : tones.neutral;
  return (
    <div className="mt-3 text-xs">
      <p className={`flex items-start gap-2 ${tone}`}>
        <Landmark className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span>{dict[result.situation]}</span>
      </p>
      {result.situation !== 'pending' && (
        <p className="mt-1 pl-5 text-stone-400">
          {result.sourceDate && result.checkedAt
            ? dict.source
                .replace('{date}', date(result.sourceDate))
                .replace('{checked}', date(result.checkedAt))
            : dict.sourceNoDate}
        </p>
      )}
    </div>
  );
}
