import Link from '@/i18n/navigation';
import { PlusIcon } from '@/components/icons/gota';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * Every new listing starts on /account/solutions/new, which asks for the project's link
 * first so the editor can read the site. This button only takes the founder there.
 */
export function NewSolutionButton({ dict }: { dict: Dictionary['solutionEditor']['newSolution'] }) {
  return (
    <Link
      href="/account/solutions/new"
      style={actionButtonStyle}
      className="action-button inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-medium"
    >
      <PlusIcon aria-hidden="true" className="size-4" />
      {dict.cta}
    </Link>
  );
}
