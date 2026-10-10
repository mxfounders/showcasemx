import Link from '@/i18n/navigation';
import { Bookmark, LockKeyhole } from 'lucide-react';
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
      <header className="mb-9">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-4 flex items-center gap-2 text-xs text-stone-400">
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          {t.onlyYou}
        </p>
      </header>
      {resume && (
        <section className="mb-10 border-y border-stone-200 py-7">
          <p className="mb-4 text-sm font-medium">{t.resume}</p>
          <ProjectSummary project={projects[resume]} dict={library} locale={locale} />
          {projects[resume] && (
            <div className="mt-5">
              <SaveProjectButton projectKey={resume} initialSaved={false} dict={dict} />
            </div>
          )}
        </section>
      )}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-stone-500">
          {(saved.length === 1 ? t.countSingular : t.countPlural).replace(
            '{count}',
            String(saved.length),
          )}
        </p>
        <Link
          href="/account/lists"
          style={actionButtonStyle}
          className="action-button rounded-full px-5 py-3 text-sm font-medium"
        >
          {t.myLists}
        </Link>
      </div>
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
          <div className="border-y border-stone-200 py-14">
            <Bookmark className="mb-5 size-8 text-stone-300" aria-hidden="true" />
            <h2 className="text-2xl font-medium">{t.emptyTitle}</h2>
            <Link
              href="/#catalogo"
              style={actionButtonStyle}
              className="action-button mt-6 inline-flex rounded-full px-5 py-3 text-sm"
            >
              {t.explore}
            </Link>
          </div>
        )
      )}
    </section>
  );
}
