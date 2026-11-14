import { REVIEW_LEVEL_LABEL, REVIEW_LEVEL_TONE } from '@/lib/reviews';
import type { ReviewSignal } from '@/lib/data/reviews';
import { Badge } from '../ui/Badge';

/**
 * A review's verification level and whether it came through the founder's invitation
 * link, the same marks the public ficha shows. Nothing when the signals are unknown.
 */
export function ReviewSignalBadges({ signal }: { signal: ReviewSignal | null }) {
  if (!signal) return null;
  return (
    <>
      <Badge tone={REVIEW_LEVEL_TONE[signal.level]}>{REVIEW_LEVEL_LABEL[signal.level]}</Badge>
      {signal.invited && (
        <Badge
          tone="amber"
          title="Llegó por el enlace de invitación del proyecto: cuenta la mitad en el orden."
        >
          Invitada por el proyecto
        </Badge>
      )}
    </>
  );
}
