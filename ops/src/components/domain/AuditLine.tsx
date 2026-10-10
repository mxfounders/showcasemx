import Link from 'next/link';
import { auditAction } from '@/lib/labels';
import { isUuidLike } from './links';
import { RelativeTime } from '../ui/RelativeTime';
import { cn } from '../ui/cn';

export function subjectHref(
  subjectType: string,
  subjectId: string,
  metadata?: Record<string, unknown>,
): string | null {
  if (subjectType === 'solution' && isUuidLike(subjectId))
    return `/panel/postulaciones/${subjectId}`;
  if (subjectType === 'account' && isUuidLike(subjectId)) return `/panel/cuentas/${subjectId}`;
  if (subjectType === 'report' && typeof metadata?.solutionId === 'string')
    return `/panel/postulaciones/${metadata.solutionId}?tab=reportes`;
  if (subjectType === 'report' || subjectType === 'list' || subjectType === 'comment')
    return subjectType === 'report' ? '/panel/reportes' : '/panel/comunidad';
  if (subjectType === 'inquiry') return `/panel/mensajes?id=${subjectId}&filtro=all`;
  if (subjectType === 'notification') return '/panel/correo?filtro=all';
  return null;
}

const DOT: Record<string, string> = {
  neutral: 'bg-subtle',
  blue: 'bg-accent',
  sage: 'bg-sage',
  lavender: 'bg-lavender',
  terracotta: 'bg-terracotta',
  amber: 'bg-amber',
};

export function AuditLine({
  entry,
  showActor = true,
  compact,
}: {
  entry: {
    actorEmail: string;
    action: string;
    subjectType: string;
    subjectId: string;
    reason?: string;
    createdAt: string | null;
    metadata?: Record<string, unknown>;
    ip?: string | null;
  };
  showActor?: boolean;
  compact?: boolean;
}) {
  const label = auditAction(entry.action);
  const href = subjectHref(entry.subjectType, entry.subjectId, entry.metadata);
  const device = typeof entry.metadata?.device === 'string' ? entry.metadata.device : null;
  return (
    <div className={cn('flex gap-3', compact ? 'py-2' : 'py-3')}>
      <span
        aria-hidden
        className={cn('mt-[7px] size-2 shrink-0 rounded-full ring-4 ring-surface', DOT[label.tone])}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-snug text-fg-2">
          {showActor && <span className="font-medium text-fg">{entry.actorEmail}</span>}
          {showActor && ' · '}
          {href ? (
            <Link href={href} className="hover:text-accent-fg hover:underline">
              {label.label}
            </Link>
          ) : (
            label.label
          )}
        </p>
        {entry.reason && !compact && (
          <p className="mt-0.5 line-clamp-2 text-[12.5px] text-muted">«{entry.reason}»</p>
        )}
        {(device || entry.ip) && !compact && (
          <p className="mt-0.5 font-mono text-[11.5px] text-subtle">
            {[device, entry.ip].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <RelativeTime
        value={entry.createdAt}
        className="shrink-0 whitespace-nowrap text-[12px] text-muted"
      />
    </div>
  );
}
