import Link from '@/i18n/navigation';
import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  Columns3,
  FolderPlus,
  Inbox,
  Send,
  UserRound,
  Wallet,
  Users,
  Briefcase,
  Workflow,
  Scale,
} from 'lucide-react';
import type { FounderSolution } from '@/lib/solutions/model';
import type { BuyerBoard } from '@/lib/library/model';
import { solutionChecklist } from '@/lib/solutions/completeness';
import { brandColors, solutionCategoryTones } from '@/lib/brand-colors';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';
export function NextActions({
  founder,
  buyer,
  solutions,
  boards,
  unorganized,
  dict,
  locale,
}: {
  founder: boolean;
  buyer: boolean;
  solutions: FounderSolution[];
  boards: BuyerBoard[];
  unorganized: number;
  dict: Dictionary['dashboard'];
  locale: string;
}) {
  const text = dict.nextActions;
  const tasks = founder
    ? solutions
        .filter(solution => solution.status !== 'pending')
        .map(solution => {
          const missing = solutionChecklist(solution.data, locale).find(item => !item.done);
          const review = solution.status === 'changes_requested' || solution.status === 'rejected';
          if (!review && !missing) return null;
          return {
            href: `/account/solutions/${solution.id}`,
            title: review
              ? text.reviewComments
              : missing?.key === 'visual'
                ? text.addScreenshots
                : `${text.complete} ${missing?.label.toLowerCase()}`,
            detail: solution.data.name || text.yourProject,
            Icon: review ? ClipboardCheck : missing?.key === 'visual' ? Camera : ClipboardCheck,
            tone: brandColors.sage,
            priority: review ? 0 : 1,
          };
        })
        .filter(task => task !== null)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3)
    : [];
  const ready = buyer ? boards.filter(board => board.covers.length >= 2).slice(0, 2) : [];
  const shortcuts = [
    ...(founder
      ? [
          {
            href: '/account/opportunities',
            label: text.opportunities,
            Icon: Inbox,
            tone: brandColors.terracotta,
          },
        ]
      : []),
    ...(buyer
      ? [
          {
            href: '/account/contacts',
            label: text.myContacts,
            Icon: Send,
            tone: brandColors.blue,
          },
        ]
      : []),
    {
      href: '/account/settings/profile',
      label: text.myProfile,
      Icon: UserRound,
      tone: brandColors.lavender,
    },
  ];
  return (
    <>
      {(tasks.length > 0 || ready.length > 0 || (buyer && unorganized > 0)) && (
        <section aria-label={text.toAdvance}>
          <h2 className="mb-5 text-xl font-semibold tracking-tight">{text.toAdvance}</h2>
          <div className="grid gap-x-8 md:grid-cols-2">
            {tasks.map(({ href, title, detail, Icon, tone }) => (
              <ActionRow
                key={href}
                href={href}
                title={title}
                detail={detail}
                Icon={Icon}
                tone={tone}
              />
            ))}
            {buyer && unorganized > 0 && (
              <ActionRow
                href="/account/saved?list=none"
                title={text.organizeSaved}
                detail={`${unorganized} ${unorganized === 1 ? text.unorganizedSingular : text.unorganizedPlural}`}
                Icon={FolderPlus}
                tone={brandColors.amber}
              />
            )}{' '}
            {ready.map(board => (
              <ActionRow
                key={board.id}
                href={`/account/lists/${board.id}`}
                title={text.compareOptions}
                detail={board.name}
                Icon={Columns3}
                tone={brandColors.lavender}
              />
            ))}
          </div>
        </section>
      )}
      <section aria-label={text.shortcuts}>
        <h2 className="mb-5 text-xl font-semibold tracking-tight">{text.shortcuts}</h2>
        <div className="flex flex-wrap gap-3">
          {shortcuts.map(({ href, label, Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group inline-flex items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3 text-sm transition-colors hover:bg-white"
            >
              <span
                className="flex size-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: tone.soft, color: tone.solid }}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {label}
              <ArrowRight
                className="ml-3 size-4 text-stone-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
function ActionRow({
  href,
  title,
  detail,
  Icon,
  tone,
}: {
  href: string;
  title: string;
  detail: string;
  Icon: typeof Camera;
  tone: { soft: string; solid: string };
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-4 border-b border-stone-200 py-5"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: tone.soft, color: tone.solid }}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="mt-1 block truncate text-xs text-stone-500">{detail}</span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}
const discovery = [
  { label: 'Finanzas', Icon: Wallet },
  { label: 'Nómina', Icon: Users },
  { label: 'Agencias', Icon: Briefcase },
  { label: 'Operación', Icon: Workflow },
  { label: 'Legal', Icon: Scale },
];
export function ExploreNeeds({ dict, locale }: { dict: Dictionary['dashboard']; locale: string }) {
  const text = dict.exploreNeeds;
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{text.exploreByNeed}</h2>
        <Link href="/#catalogo" className="shrink-0 text-sm text-[#365DC4]">
          {text.seeCatalog}
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        {discovery.map(({ label, Icon }) => {
          const tone = brandColors[solutionCategoryTones[label]];
          return (
            <Link
              key={label}
              href={`/?q=${encodeURIComponent(label)}#catalogo`}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm"
              style={{ backgroundColor: tone.soft, color: tone.solid }}
            >
              <Icon className="size-4" aria-hidden="true" />
              {localizedCategoryDisplayLabel(label, locale)}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
