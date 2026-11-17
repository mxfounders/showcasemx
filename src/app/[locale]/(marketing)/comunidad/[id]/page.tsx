import type { Metadata } from 'next';
import Link from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeftIcon } from '@/components/icons/gota';
import { isSolutionId } from '@/lib/solutions/model';
import {
  getPublicCollections,
  getPublicComments,
  indexableCollections,
} from '@/lib/library/community';
import { JsonLd } from '@/components/json-ld';
import { localeAlternates, siteOrigin } from '@/lib/seo';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { ProjectPin } from '@/components/library/project-pin';
import { SaveProjectButton } from '@/components/library/save-project-button';
import { ShareCollection } from '@/components/library/share-collection';
import { CommunityActions } from '@/components/library/community-actions';
import { brandColors, solutionCategoryTones } from '@/lib/brand-colors';
import { localizedCategoryDisplayLabel } from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';
export const dynamic = 'force-dynamic';
// Public does not mean permanent: never cache a list or embed private data in metadata.
// Only the list's public copy goes here (name and public description), never its purpose.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const { meta } = await getDictionary(locale);
  const fallback: Metadata = {
    title: meta.communityList.title,
    robots: { index: false, follow: true },
  };
  if (!isSolutionId(id)) return fallback;
  try {
    const [{ collections }, indexable] = await Promise.all([
      getPublicCollections({ id }),
      indexableCollections(id),
    ]);
    const collection = collections[0];
    if (!collection) return fallback;
    const title = `${collection.name} | shwcs`;
    const description = collection.description ? collection.description.slice(0, 160) : undefined;
    return {
      title,
      description,
      // Indexed only when it meets the minimum (SHCWS-119); the rest stay findable by link.
      robots: indexable.length ? undefined : { index: false, follow: true },
      alternates: localeAlternates(locale, `/comunidad/${id}`),
      openGraph: {
        title,
        description,
        url: `${siteOrigin}/${locale}/comunidad/${id}`,
        siteName: 'shwcs',
        locale: meta.site.ogLocale,
        type: 'website',
      },
    };
  } catch {
    return fallback;
  }
}
export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  if (!isSolutionId(id)) notFound();
  const fullDict = await getDictionary(locale);
  const dict = fullDict.community;
  let viewer = '';
  try {
    viewer = (await getSession((await cookies()).get(sessionCookie)?.value))?.id ?? '';
  } catch {
    /* The public page still works when account storage is unavailable. */
  }
  const [{ collections }, comments] = await Promise.all([
    getPublicCollections({ id, viewer }),
    getPublicComments(id, viewer),
  ]);
  const collection = collections[0];
  if (!collection) notFound();
  return (
    <section className="mx-auto w-full max-w-[1500px] px-5 pb-24 pt-14 sm:px-10 sm:pt-20 lg:px-16">
      <JsonLd
        data={{
          '@type': 'ItemList',
          name: collection.name,
          ...(collection.description ? { description: collection.description } : {}),
          url: `${siteOrigin}/${locale}/comunidad/${id}`,
          numberOfItems: collection.projects.length,
          itemListElement: collection.projects.map((project, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: project.name,
            url: project.external ? project.href : `${siteOrigin}/${locale}${project.href}`,
          })),
        }}
      />
      <Link
        href="/comunidad"
        className="mb-9 inline-flex items-center gap-2 text-sm text-stone-500"
      >
        <ArrowLeftIcon className="size-4" />
        {dict.detail.back}
      </Link>
      <header className="mb-10 border-b border-stone-200 pb-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="min-w-0 w-full sm:flex-1">
            <h1 className="break-words text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-5 max-w-2xl whitespace-pre-wrap break-words leading-relaxed text-stone-500">
                {collection.description}
              </p>
            )}
            <p className="mt-5 text-sm text-stone-500">
              {dict.byPrefix} {collection.curator} <span aria-hidden="true">·</span>{' '}
              {collection.count}{' '}
              {collection.count === 1 ? dict.projectSingular : dict.projectPlural}
            </p>
          </div>
          <ShareCollection id={id} dict={dict} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {collection.categories.map(category => {
            const tone = brandColors[solutionCategoryTones[category] ?? 'blue'];
            return (
              <Link
                key={category}
                href={`/comunidad?category=${encodeURIComponent(category)}`}
                rel="nofollow"
                prefetch={false}
                style={{ color: tone.solid, backgroundColor: tone.soft }}
                className="rounded-full px-3 py-2 text-xs"
              >
                {localizedCategoryDisplayLabel(category, locale)}
              </Link>
            );
          })}
        </div>
      </header>
      {collection.projects.length ? (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collection.projects.map(project => (
            <ProjectPin
              key={project.key}
              project={project}
              unavailableLabel={dict.projectUnavailable}
              externalLabel={dict.projectExternal}
              locale={locale}
            >
              <SaveProjectButton projectKey={project.key} dict={fullDict.solutionUi} />
            </ProjectPin>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-stone-500">{dict.detail.noProjects}</p>
      )}
      <CommunityActions
        id={id}
        initialLikes={collection.likes}
        initialSaves={collection.saves}
        initialCommentsCount={collection.comments}
        liked={collection.liked}
        saved={collection.saved}
        following={collection.following}
        followingCurator={collection.followingCurator}
        curator={collection.curator}
        own={collection.own}
        comments={comments}
        dict={dict}
        followDict={fullDict.follows.actions}
        locale={locale}
      />
      <p className="mt-14 border-t border-stone-200 pt-5 text-xs text-stone-400">
        {dict.detail.footerNote}
      </p>
    </section>
  );
}
