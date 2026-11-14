import Link from '@/i18n/navigation';
import {
  ArrowRightIcon,
  BalanceScaleIcon,
  BellIcon,
  ShieldIcon,
  TrendUpIcon,
  BriefcaseIcon,
  CameraIcon,
  ClientsIcon,
  ClipboardCheckIcon,
  FolderPlusIcon,
  InboxIcon,
  PersonIcon,
  SendIcon,
  ViewColumnsIcon,
  WalletIcon,
  WorkflowIcon,
} from '@/components/icons/gota';
import type { FounderSolution } from '@/lib/solutions/model';
import type { BuyerBoard } from '@/lib/library/model';
import type { FounderSignals } from '@/lib/dashboard/server';
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
  signals,
  dict,
  locale,
}: {
  founder: boolean;
  buyer: boolean;
  solutions: FounderSolution[];
  boards: BuyerBoard[];
  unorganized: number;
  /** Lead-related tasks for founders (SHCWS-16); each shows only while it applies. */
  signals?: FounderSignals;
  dict: Dictionary['dashboard'];
  locale: string;
}) {
  const text = dict.nextActions;
  const guide = founder
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
            Icon: review
              ? ClipboardCheckIcon
              : missing?.key === 'visual'
                ? CameraIcon
                : ClipboardCheckIcon,
            tone: brandColors.sage,
            priority: review ? 0 : 1,
          };
        })
        .filter(task => task !== null)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3)
    : [];
  // In the issue's order: answer leads, keep alerts on, complete the guide, prove the
  // domain, then promote. «Confirm your email» is the banner above, not a task here.
  const tasks =
    founder && signals
      ? [
          // Unread first (SHCWS-14): it also covers a buyer who withdrew since your visit.
          ...(signals.unreadOpportunities > 0
            ? [
                {
                  href: '/account/opportunities?status=unread',
                  title:
                    signals.unreadOpportunities === 1
                      ? text.unreadOpportunity
                      : text.unreadOpportunities.replace(
                          '{count}',
                          String(signals.unreadOpportunities),
                        ),
                  detail: text.answerOpportunitiesDetail,
                  Icon: InboxIcon,
                  tone: brandColors.terracotta,
                },
              ]
            : signals.newOpportunities > 0
              ? [
                  {
                    href: '/account/opportunities?status=new',
                    title:
                      signals.newOpportunities === 1
                        ? text.answerOpportunity
                        : text.answerOpportunities.replace(
                            '{count}',
                            String(signals.newOpportunities),
                          ),
                    detail: text.answerOpportunitiesDetail,
                    Icon: InboxIcon,
                    tone: brandColors.terracotta,
                  },
                ]
              : []),
          ...(signals.alertsOff
            ? [
                {
                  href: '/account/settings/notifications',
                  title: text.enableAlerts,
                  detail: text.enableAlertsDetail,
                  Icon: BellIcon,
                  tone: brandColors.blue,
                },
              ]
            : []),
          ...guide,
          ...signals.domains.map(domain => ({
            href: `/account/solutions/${domain.id}/trust`,
            title: domain.expiring ? text.renewDomain : text.verifyDomain,
            detail: domain.name,
            Icon: ShieldIcon,
            tone: brandColors.lavender,
          })),
          ...(signals.promote
            ? [
                {
                  href: `/account/solutions/${signals.promote.id}/promote`,
                  title: text.promote,
                  detail: signals.promote.name,
                  Icon: TrendUpIcon,
                  tone: brandColors.amber,
                },
              ]
            : []),
        ]
      : guide;
  const ready = buyer ? boards.filter(board => board.covers.length >= 2).slice(0, 2) : [];
  const shortcuts = [
    ...(founder
      ? [
          {
            href: '/account/opportunities',
            label: text.opportunities,
            Icon: InboxIcon,
            tone: brandColors.terracotta,
          },
        ]
      : []),
    ...(buyer
      ? [
          {
            href: '/account/contacts',
            label: text.myContacts,
            Icon: SendIcon,
            tone: brandColors.blue,
          },
        ]
      : []),
    {
      href: '/account/settings/profile',
      label: text.myProfile,
      Icon: PersonIcon,
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
                Icon={FolderPlusIcon}
                tone={brandColors.amber}
              />
            )}{' '}
            {ready.map(board => (
              <ActionRow
                key={board.id}
                href={`/account/lists/${board.id}`}
                title={text.compareOptions}
                detail={board.name}
                Icon={ViewColumnsIcon}
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
              <ArrowRightIcon
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
  Icon: typeof CameraIcon;
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
      <ArrowRightIcon
        className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}
const discovery = [
  { label: 'Finanzas', Icon: WalletIcon },
  { label: 'Nómina', Icon: ClientsIcon },
  { label: 'Agencias', Icon: BriefcaseIcon },
  { label: 'Operación', Icon: WorkflowIcon },
  { label: 'Legal', Icon: BalanceScaleIcon },
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
