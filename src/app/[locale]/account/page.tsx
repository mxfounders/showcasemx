import { getDictionary } from '@/i18n/get-dictionary';
import Link from '@/i18n/navigation';
import { localeRedirect } from '@/i18n/redirect';
import { ArrowRight, Plus } from 'lucide-react';
import { requireFounder, getOwnedSolutions } from '@/lib/solutions/server';
import { dashboardData } from '@/lib/dashboard/server';
import { resolveDashboardMode } from '@/lib/dashboard/model';
import { NextActions, ExploreNeeds } from '@/components/dashboard/next-actions';
import { DashboardModeSwitch } from '@/components/dashboard/mode-switch';
import { solutionChecklist } from '@/lib/solutions/completeness';
import { StatusBadge } from '@/components/solutions/status-badge';
import { getBoards, getSaved, getMemberships, resolveProjects } from '@/lib/library/server';
import { BoardCard, CreateBoard } from '@/components/library/board-gallery';
import { ProjectCover } from '@/components/library/project-cover';
import { ProjectPin } from '@/components/library/project-pin';
import { previewCategories } from '@/lib/catalog-preview';
import { solutionCover } from '@/lib/solutions/gallery';
import { isSolutionId } from '@/lib/solutions/model';
import { actionButtonStyle } from '@/lib/brand-colors';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.dashboard.title} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export const dynamic = 'force-dynamic';
export default async function AccountPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const dictionary = await getDictionary(locale);
  const dict = dictionary.dashboard;
  const account = await requireFounder(),
    [dashboard, solutions] = await Promise.all([
      dashboardData(account.id),
      getOwnedSolutions(account.id),
    ]);
  if (!dashboard.profile.name?.trim()) return localeRedirect('/onboarding');
  const mode = resolveDashboardMode(
      dashboard.profile.dashboard_mode,
      dashboard.profile.profile,
      solutions.length > 0,
    ),
    buyer = mode !== 'founder',
    founder = mode !== 'buyer';
  const [boards, saved, memberships] = buyer
    ? await Promise.all([getBoards(account.id), getSaved(account.id), getMemberships(account.id)])
    : [[], [], []];
  const organized = new Set(memberships.map(item => item.project_key));
  const unorganized = saved.filter(item => !organized.has(item.project_key)).length;
  const recent = buyer
    ? await resolveProjects(saved.slice(0, 3).map(item => item.project_key))
    : {};
  const first = dashboard.profile.name?.trim().split(/\s+/)[0];
  const requests = dashboard.requests
    .filter(item => mode === 'both' || (buyer ? item.outgoing : !item.outgoing))
    .slice(0, 4);
  return (
    <section className="account-page">
      <header className="mb-12 flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
        <h1 className="break-words text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          {first ? `${dict.hello} ${first}.` : dict.yourSpace}
        </h1>
        <DashboardModeSwitch mode={mode} dict={dict} />
      </header>
      <div className="space-y-12">
        {founder && (
          <section aria-label={dict.yourProjects}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">{dict.yourProjects}</h2>
              <Link href="/account/solutions" className="text-sm text-[#365DC4]">
                {dict.seeAll}
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {solutions.slice(0, 5).map(solution => {
                const missing = solutionChecklist(solution.data, locale).find(item => !item.done);
                const catalog = previewCategories
                  .flatMap(category => category.products)
                  .find(
                    product => !!solution.catalog_key && product.catalogId === solution.catalog_key,
                  );
                const coverId = solution.data.screenshots?.[0]?.id;
                const image = solutionCover(solution.id, {
                  coverScreenshotId: coverId && isSolutionId(coverId) ? coverId : undefined,
                  hasSiteImage: solution.has_site_image,
                  staticArt: catalog?.ogImage,
                });
                return (
                  <Link
                    key={solution.id}
                    href={'/account/solutions/' + solution.id}
                    className="group min-w-0 rounded-3xl"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[24px]">
                      <ProjectCover
                        name={solution.data.name || dict.yourProjectFallback}
                        image={image}
                      />
                      <span className="absolute left-3 top-3">
                        <StatusBadge
                          status={solution.status}
                          dict={dictionary.solutionEditor.statuses}
                        />
                      </span>
                    </div>
                    <div className="px-1 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="truncate text-xl font-medium tracking-tight">
                          {solution.data.name || dict.unnamed}
                        </h3>
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                        />
                      </div>
                      <p className="mt-2 truncate text-xs text-stone-500">
                        {solution.status === 'pending'
                          ? dict.statusPending
                          : solution.status === 'changes_requested'
                            ? dict.statusChanges
                            : missing
                              ? `${dict.statusComplete} ${missing.label.toLowerCase()}`
                              : dict.statusEdit}
                      </p>
                    </div>
                  </Link>
                );
              })}
              <Link
                href="/account/solutions/new"
                className="group flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-stone-300 text-sm text-stone-500 transition-colors hover:border-[#365DC4] hover:bg-[#E4EBFC]/40 hover:text-[#365DC4]"
              >
                <Plus className="size-7" />
                {dict.postSolution}
              </Link>
            </div>
          </section>
        )}
        {buyer && (
          <section aria-label={dict.yourLists}>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">{dict.yourLists}</h2>
              <Link href="/account/lists" className="text-sm text-[#365DC4]">
                {dict.seeAllLists}
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {boards.slice(0, 2).map(board => (
                <BoardCard key={board.id} board={board} dict={dictionary.community} />
              ))}
              <CreateBoard tile dict={dictionary.library} locale={locale} />
            </div>
          </section>
        )}
        {buyer && Object.keys(recent).length > 0 && (
          <section>
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">{dict.latestSaved}</h2>
              <Link href="/account/saved" className="text-sm text-[#365DC4]">
                {dict.seeAll}
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Object.values(recent).map(project => (
                <ProjectPin
                  key={project.key}
                  project={project}
                  unavailableLabel={dictionary.library.pin.unavailable}
                  externalLabel={dictionary.library.pin.external}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        )}
        <NextActions
          founder={founder}
          buyer={buyer}
          solutions={solutions}
          boards={boards}
          unorganized={unorganized}
          dict={dict}
          locale={locale}
        />
        {buyer && !saved.length && (
          <Link
            href="/#catalogo"
            style={actionButtonStyle}
            className="action-button inline-flex items-center gap-3 rounded-full px-5 py-3 text-sm"
          >
            {dict.exploreProjects}
            <ArrowRight className="size-4" />
          </Link>
        )}
        {requests.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-semibold tracking-tight">{dict.recentActivity}</h2>
            <ul className="divide-y divide-stone-200 border-y border-stone-200">
              {requests.map(request => (
                <li key={request.id}>
                  <Link
                    href={`/account/${request.outgoing ? 'contacts' : 'opportunities'}/${request.id}`}
                    className="group flex items-center justify-between gap-4 py-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{request.project_name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {request.outgoing ? dict.sent : dict.received} ·{' '}
                        {dict.contactStatuses[request.status]}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-stone-400 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ExploreNeeds dict={dict} locale={locale} />
      </div>
    </section>
  );
}
