import type { SolutionStatus } from '@/lib/solutions/model';
import { brandColors } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
export function StatusBadge({
  status,
  dict,
}: {
  status: SolutionStatus;
  dict: Dictionary['solutionEditor']['statuses'];
}) {
  const tone =
    status === 'published'
      ? 'sage'
      : status === 'changes_requested'
        ? 'amber'
        : status === 'rejected'
          ? 'terracotta'
          : status === 'pending'
            ? 'blue'
            : 'lavender';
  return (
    <span
      style={{ backgroundColor: brandColors[tone].soft, color: brandColors[tone].solid }}
      className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
    >
      {dict[status].label}
    </span>
  );
}
