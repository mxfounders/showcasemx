import Link from '@/i18n/navigation';
import { ArrowRightIcon, BellIcon, BookmarkIcon, LockIcon } from '@/components/icons/gota';
import {
  requireBuyer,
  getSaved,
  getLists,
  getMemberships,
  resolveProjects,
} from '@/lib/library/server';
import { validProjectKey } from '@/lib/library/model';
import { SaveProjectButton } from '@/components/library/save-project-button';
import { ProjectSummary } from '@/components/library/project-summary';
import { SavedGallery } from '@/components/library/saved-gallery';
import { LibraryEmpty } from '@/components/library/library-empty';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.library.savedPage.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export default async function SavedPage(props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string; list?: string }>;
}) {
  const searchParams = await props.searchParams;
  const { locale } = await props.params;
  const dictionary = await getDictionary(locale);
  const dict = dictionary.solutionUi;
  const library = dictionary.library;
  const t = library.savedPage;
  const requested = validProjectKey(searchParams.project) ? searchParams.project : null;
  const account = await requireBuyer(
    requested ? `/account/saved?project=${encodeURIComponent(requested)}` : '/account/saved',
  );
  const [saved, lists, memberships] = await Promise.all([
    getSaved(account.id),
    getLists(account.id),
    getMemberships(account.id),
  ]);
  const projects = await resolveProjects([
    ...saved.map(item => item.project_key),
    ...(requested ? [requested] : []),
  ]);
  const initialList =
    searchParams.list === 'none' || lists.some(list => list.id === searchParams.list)
      ? searchParams.list
      : undefined;
  const resume =
    requested && !saved.some(item => item.project_key === requested) ? requested : null;
  return (
    <section className="account-page">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
          {saved.length > 0 && (
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-500">
              <LockIcon aria-hidden="true" className="size-3.5 shrink-0 text-stone-400" />
              {(saved.length === 1 ? t.summarySingular : t.summaryPlural).replace(
                '{count}',
                String(saved.length),
              )}
            </p>
          )}
        </div>
        {/* Saved-search alerts (SHCWS-47) live next to what the buyer keeps. Mis listas
            is one click away in the sidebar, so it is not repeated here (§27). */}
        <Link
          href="/account/alerts"
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-5 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]"
        >
          <BellIcon aria-hidden="true" className="size-4 text-[#365DC4]" />
          {dictionary.alerts.page.title}
        </Link>
      </header>
      {resume && (
        <section className="mb-10 rounded-[28px] border border-stone-200 bg-white p-6 sm:p-7">
          <p className="mb-4 text-sm font-medium">{t.resume}</p>
          <ProjectSummary project={projects[resume]} dict={library} locale={locale} />
          {projects[resume] && (
            <div className="mt-5">
              <SaveProjectButton projectKey={resume} initialSaved={false} dict={dict} />
            </div>
          )}
        </section>
      )}
      {saved.length ? (
        <SavedGallery
          key={initialList ?? 'all'}
          initialList={initialList}
          entries={saved.map(item => ({
            key: item.project_key,
            project: projects[item.project_key],
            memberships: memberships
              .filter(member => member.project_key === item.project_key)
              .map(member => member.list_id),
          }))}
          lists={lists}
          dict={dict}
          libraryDict={library}
          locale={locale}
        />
      ) : (
        !resume && (
          <LibraryEmpty icon={<BookmarkIcon />} title={t.emptyTitle} text={t.emptyText}>
            <Link
              href="/#catalogo"
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium"
            >
              {t.explore}
              <ArrowRightIcon aria-hidden="true" className="button-arrow size-4" />
            </Link>
          </LibraryEmpty>
        )
      )}
    </section>
  );
}
