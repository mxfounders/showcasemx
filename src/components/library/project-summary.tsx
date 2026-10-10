import Link from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { BuyerProject } from '@/lib/library/model';
import { localizedOfferingOptions, localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';
export function ProjectSummary({
  project,
  dict,
  locale,
}: {
  project?: BuyerProject;
  dict: Dictionary['library'];
  locale: string;
}) {
  const t = dict.summary;
  if (!project)
    return (
      <div>
        <h2 className="text-xl font-medium">{t.unavailableTitle}</h2>
        <p className="mt-2 text-sm text-stone-500">{t.unavailableBody}</p>
      </div>
    );
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 break-words text-xl font-semibold tracking-tight">{project.name}</h2>
        <Link
          href={project.href}
          target={project.external ? '_blank' : undefined}
          rel={project.external ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1 text-sm text-[#365DC4]"
        >
          {project.external ? t.visitSite : t.viewProfile}
          <ArrowUpRight className="size-4" aria-hidden="true" />
          {project.external && <span className="sr-only"> {t.newTab}</span>}
        </Link>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        {localizedOfferingOptions(locale).find(option => option.value === project.kind)?.label ??
          project.kind}{' '}
        ·{' '}
        {project.categories
          .map(category => localizedCategoryDisplayLabel(category, locale))
          .join(' · ')}
      </p>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-stone-600">
        {project.description}
      </p>
      {project.solutionId && (
        <Link
          href={`/account/contacts/new?solution=${project.solutionId}`}
          className="mt-4 inline-flex text-sm text-[#365DC4]"
        >
          {t.requestContact}
        </Link>
      )}
    </div>
  );
}
