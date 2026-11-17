import { VerifiedIcon } from '@/components/icons/gota';
import { commonText } from '@/i18n/common';

/**
 * The small check after a project's name on catalogue cards: «Verificado por shwcs»,
 * decided by the team (docs/recognition.md). The listing itself explains it in words.
 */
export function VerifiedMark({
  locale,
  className = 'size-4',
}: {
  locale: string;
  className?: string;
}) {
  const label = commonText(locale).verifiedBy;
  return (
    <VerifiedIcon
      aria-label={label}
      className={`inline-block shrink-0 text-[#365DC4] ${className}`}
    />
  );
}
