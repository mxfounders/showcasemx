import { Badge } from '../ui/Badge';
import { contactStatus, emailState, reportStatus, solutionStatus } from '@/lib/labels';

export function SolutionStatusBadge({ status }: { status: string }) {
  const s = solutionStatus(status);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  const s = reportStatus(status);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function ContactStatusBadge({ status }: { status: string }) {
  const s = contactStatus(status);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

export function EmailStateBadge({ state }: { state: string }) {
  const s = emailState(state);
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}

/** Days a pending item has waited; amber after 3 days, terracotta after 7. */
export function AgeBadge({ days }: { days: number }) {
  const tone = days >= 7 ? 'terracotta' : days >= 3 ? 'amber' : 'neutral';
  return (
    <Badge tone={tone} title="Tiempo esperando">
      {days === 0 ? 'Hoy' : days === 1 ? '1 día' : `${days} días`}
    </Badge>
  );
}
