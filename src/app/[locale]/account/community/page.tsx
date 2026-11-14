import Link from '@/i18n/navigation';
import { ArrowLeftIcon, ArrowRightIcon, BookshelfIcon } from '@/components/icons/gota';
import { requireBuyer } from '@/lib/library/server';
import { getPublicCollections } from '@/lib/library/community';
import { followedCurators, followerCounts } from '@/lib/library/follows';
import { UnfollowButton } from '@/components/library/follow-controls';
import { BoardCard } from '@/components/library/board-card';
import { actionButtonStyle } from '@/lib/brand-colors';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const dictionary = await getDictionary((await params).locale);
  return {
    title: `${dictionary.library.communitySaved.metaTitle} | shwcs`,
    robots: { index: false, follow: false },
  };
}
export const dynamic = 'force-dynamic';
export default async function SavedCommunityListsPage({
  params: routeParams,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams,
    page = Math.max(1, Math.min(1000, Number.parseInt(String(params.page ?? '1'), 10) || 1));
  const account = await requireBuyer(`/account/community${page > 1 ? `?page=${page}` : ''}`);
  const dictionary = await getDictionary((await routeParams).locale);
  const dict = dictionary.community;
  const t = dictionary.library.communitySaved;
  const f = dictionary.follows.page;
  // Saved lists page through; what the account follows (SHCWS-121) shows on page 1 only.
  const [{ collections, hasMore }, followed, curators, followers] = await Promise.all([
    getPublicCollections({ savedBy: account.id, viewer: account.id, page }),
    page === 1
      ? getPublicCollections({ followedBy: account.id, viewer: account.id })
      : Promise.resolve(null),
    page === 1 ? followedCurators(account.id) : Promise.resolve(null),
    page === 1 ? followerCounts(account.id) : Promise.resolve(null),
  ]);
  const count = (template: string, value: number, name = '') =>
    template.replace('{count}', String(value)).replace('{name}', name);
  const [beforeLink, afterLink] = f.emailNote.split('{link}');
  const href = (value: number) =>
    value > 1 ? `/account/community?page=${value}` : '/account/community';
  return (
    <section className="account-page">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t.title}</h1>
          <p className="mt-4 text-sm text-stone-500">{t.subtitle}</p>
        </div>
        <Link
          href="/comunidad"
          style={actionButtonStyle}
          className="action-button rounded-full px-5 py-3 text-sm"
        >
          {t.explore}
        </Link>
      </header>
      {collections.length ? (
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map(collection => (
            <BoardCard
              key={collection.id}
              board={{
                id: collection.id,
                name: collection.name,
                count: collection.count,
                covers: collection.covers,
                visibility: collection.visibility,
              }}
              href={`/comunidad/${collection.id}`}
              byline={collection.curator}
              stats={{
                likes: collection.likes,
                saves: collection.saves,
                comments: collection.comments,
              }}
              dict={dict}
            />
          ))}
        </div>
      ) : (
        <div className="border-y border-stone-200 py-14">
          <BookshelfIcon className="mb-5 size-8 text-stone-300" aria-hidden="true" />
          <h2 className="text-2xl font-medium">{t.emptyTitle}</h2>
          <p className="mt-3 max-w-lg text-sm text-stone-500">{t.emptyBody}</p>
          <Link
            href="/comunidad"
            style={actionButtonStyle}
            className="action-button mt-6 inline-flex rounded-full px-5 py-3 text-sm"
          >
            {t.browse}
          </Link>
        </div>
      )}
      {(page > 1 || hasMore) && (
        <nav
          aria-label={t.paginationLabel}
          className="mt-12 flex justify-between border-t border-stone-200 pt-6"
        >
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              className="inline-flex items-center gap-2 text-sm text-[#365DC4]"
            >
              <ArrowLeftIcon className="size-4" />
              {t.previous}
            </Link>
          ) : (
            <span />
          )}
          {hasMore ? (
            <Link
              href={href(page + 1)}
              className="inline-flex items-center gap-2 text-sm text-[#365DC4]"
            >
              {t.next}
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
      {followed && (
        <section className="mt-16" aria-labelledby="followed-lists">
          <h2 id="followed-lists" className="text-2xl font-semibold tracking-tight">
            {f.listsTitle}
          </h2>
          {followed.collections.length ? (
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {followed.collections.map(collection => (
                <div key={collection.id}>
                  <BoardCard
                    board={{
                      id: collection.id,
                      name: collection.name,
                      count: collection.count,
                      covers: collection.covers,
                      visibility: collection.visibility,
                    }}
                    href={`/comunidad/${collection.id}`}
                    byline={collection.curator}
                    stats={{
                      likes: collection.likes,
                      saves: collection.saves,
                      comments: collection.comments,
                    }}
                    dict={dict}
                  />
                  <div className="mt-2">
                    <UnfollowButton
                      action="unfollow-list"
                      id={collection.id}
                      dict={dictionary.follows}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">{f.listsEmpty}</p>
          )}
        </section>
      )}
      {curators && (
        <section className="mt-14" aria-labelledby="followed-curators">
          <h2 id="followed-curators" className="text-2xl font-semibold tracking-tight">
            {f.curatorsTitle}
          </h2>
          {curators.length ? (
            <ul className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
              {curators.map(curator => (
                <li
                  key={curator.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{curator.name}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {curator.lists.length === 0
                        ? f.curatorNoLists
                        : curator.lists.length === 1
                          ? f.curatorListsSingular
                          : count(f.curatorListsPlural, curator.lists.length)}
                      {curator.lists.slice(0, 3).map(list => (
                        <span key={list.id}>
                          {' · '}
                          <Link
                            href={`/comunidad/${list.id}`}
                            className="text-[#365DC4] underline-offset-4 hover:underline"
                          >
                            {list.name}
                          </Link>
                        </span>
                      ))}
                    </p>
                  </div>
                  <UnfollowButton
                    action="unfollow-curator"
                    id={curator.id}
                    dict={dictionary.follows}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-500">{f.curatorsEmpty}</p>
          )}
          <p className="mt-6 text-xs text-stone-400">
            {beforeLink}
            <Link
              href="/account/settings/notifications"
              className="text-[#365DC4] underline underline-offset-4"
            >
              {f.preferences}
            </Link>
            {afterLink}
          </p>
        </section>
      )}
      {followers?.curator && (
        <section className="mt-14" aria-labelledby="followers">
          <h2 id="followers" className="text-2xl font-semibold tracking-tight">
            {f.followersTitle}
          </h2>
          <p className="mt-2 text-sm text-stone-500">{f.followersBody}</p>
          {followers.signatures.length || followers.lists.length ? (
            <ul className="mt-5 space-y-2 text-sm text-stone-700">
              {followers.signatures.map(item => (
                <li key={`signature:${item.name}`}>
                  {count(
                    item.count === 1 ? f.curatorFollowersSingular : f.curatorFollowersPlural,
                    item.count,
                    item.name,
                  )}
                </li>
              ))}
              {followers.lists.map(item => (
                <li key={item.id}>
                  {count(
                    item.count === 1 ? f.listFollowersSingular : f.listFollowersPlural,
                    item.count,
                    item.name,
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-stone-500">{f.noFollowers}</p>
          )}
        </section>
      )}
    </section>
  );
}
