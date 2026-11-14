import type { SolutionStatus } from '@/lib/solutions/model';
import { brandColors } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';
export function StatusBadge({
  status,
  dict,
  live,
}: {
  status: SolutionStatus;
  dict: Dictionary['solutionEditor']['statuses'];
  /**
   * Labels for a listing that stays published while a newer version is prepared
   * (SHCWS-31). Pass them only when it has a public version: «Publicada · cambios en
   * revisión» instead of a plain «Borrador» or «En revisión».
   */
  live?: Dictionary['solutionEditor']['liveStatuses'];
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
      {live && status !== 'published' ? live[status] : dict[status].label}
    </span>
  );
}
