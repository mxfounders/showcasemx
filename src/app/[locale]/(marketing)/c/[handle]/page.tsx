import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from '@/i18n/navigation';
import { ArrowUpRightIcon, EditIcon } from '@/components/icons/gota';
import { SocialIcon } from '@/components/icons/social-icons';
import { JsonLd } from '@/components/json-ld';
import { CatalogCard } from '@/components/catalog/catalog-card';
import { BoardCard } from '@/components/library/board-card';
import { ProfileFollowButton } from '@/components/profiles/profile-follow-button';
import { getSession, sessionCookie } from '@/lib/auth/session';
import { isHandleShape } from '@/lib/profiles/handle-shape';
import { getPublicProfile, type PublicProfile } from '@/lib/profiles/server';
import { getAccentStyle } from '@/lib/brand-colors';
import { localeAlternates, pageOpenGraph, siteOrigin } from '@/lib/seo';
import { localizedLinkKind } from '@/lib/taxonomy';
import { getDictionary } from '@/i18n/get-dictionary';

// A public creator or curator profile (SHCWS-120): only what the person wrote on it and
// what they already published. The middleware answers 404 for a handle that is unknown,
// off or hidden, and 301 for a previous one (src/lib/profiles/routing.ts); the page reads
// the database again, so a profile switched off a moment ago still shows «not found».
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ locale: string; handle: string }> };

async function load(handle: string, viewer = ''): Promise<PublicProfile | null> {
  if (!isHandleShape(handle)) return null;
  try {
    return await getPublicProfile(handle, viewer);
  } catch {
    return null;
  }
}

const hasContent = (profile: PublicProfile) => profile.projects.length + profile.lists.length > 0;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, handle } = await params;
  const { profiles, meta } = await getDictionary(locale);
  const profile = await load(handle);
  if (!profile) return { title: 'shwcs', robots: { index: false, follow: false } };
  const title = `${profiles.page.metaTitle.replace('{name}', profile.displayName)} | shwcs`;
  const description = (
    profile.bio || profiles.page.metaDescription.replace('{name}', profile.displayName)
  ).slice(0, 160);
  const path = `/c/${profile.handle}`;
  return {
    title,
    description,
    // A profile that shows nothing yet stays out of search results (and the sitemap).
    robots: hasContent(profile) ? undefined : { index: false, follow: true },
    alternates: localeAlternates(locale, path),
    openGraph: pageOpenGraph({ locale, path, title, description, ogLocale: meta.site.ogLocale }),
  };
}

export default async function PublicProfilePage({ params }: Params) {
  const { locale, handle } = await params;
  let viewer = '';
  try {
    viewer = (await getSession((await cookies()).get(sessionCookie)?.value))?.id ?? '';
  } catch {
    /* The public page still works when account storage is unavailable. */
  }
  const [profile, dictionary] = await Promise.all([load(handle, viewer), getDictionary(locale)]);
  if (!profile) notFound();
  const dict = dictionary.profiles.page;
  const url = `${siteOrigin}/${locale}/c/${profile.handle}`;
  const palette = getAccentStyle('/fundadores');
  const since = profile.since
    ? dict.since.replace(
        '{date}',
        new Date(profile.since).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
          month: 'long',
          year: 'numeric',
          timeZone: 'America/Mexico_City',
        }),
      )
    : null;
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 pb-24 pt-12 sm:px-8 sm:pt-16 lg:px-12">
      {/* Only what the page shows: the name, bio and links the person wrote, never an
          account id or email. */}
      <JsonLd
        data={{
          '@type': 'ProfilePage',
          url,
          dateModified: profile.updatedAt,
          ...(profile.since ? { dateCreated: profile.since } : {}),
          mainEntity: {
            '@type': 'Person',
            name: profile.displayName,
            alternateName: `@${profile.handle}`,
            identifier: profile.handle,
            url,
            ...(profile.bio ? { description: profile.bio } : {}),
            ...(profile.links.length ? { sameAs: profile.links.map(link => link.url) } : {}),
          },
        }}
      />
      <header className="mb-14 flex flex-col gap-8 border-b border-stone-200 pb-10 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-5">
          <span
            aria-hidden="true"
            style={palette}
            className="flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold sm:size-20 sm:text-3xl"
          >
            {Array.from(profile.displayName)[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-stone-500">{dict.kicker}</p>
            <h1 className="mt-1 break-words text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {profile.displayName}
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              @{profile.handle}
              {since && (
                <>
                  {' '}
                  <span aria-hidden="true">·</span> {since}
                </>
              )}
            </p>
            {profile.bio && (
              <p className="mt-5 max-w-2xl whitespace-pre-wrap break-words leading-relaxed text-stone-600">
                {profile.bio}
              </p>
            )}
            {!!profile.links.length && (
              <ul
                aria-label={dict.linksLabel.replace('{name}', profile.displayName)}
                className="mt-5 flex flex-wrap gap-x-5 gap-y-2"
              >
                {profile.links.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 text-sm text-[#365DC4] underline-offset-4 hover:underline"
                    >
                      <SocialIcon label={link.label} className="size-4 shrink-0" />
                      {localizedLinkKind(link.label, locale)}
                      <ArrowUpRightIcon className="size-3" aria-hidden="true" />
                      <span className="sr-only"> {dict.otherTab}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {profile.own ? (
            <div className="flex flex-col items-start gap-2">
              <p className="max-w-xs text-sm text-stone-500">{dict.own}</p>
              <Link
                href="/account/settings/profile#perfil-publico"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <EditIcon className="size-4" aria-hidden="true" />
                {dict.edit}
              </Link>
            </div>
          ) : (
            <ProfileFollowButton
              handle={profile.handle}
              following={profile.following}
              signedIn={!!viewer}
              dict={dict}
            />
          )}
        </div>
      </header>

      {hasContent(profile) ? (
        <>
          <section aria-labelledby="profile-projects">
            <h2 id="profile-projects" className="text-2xl font-semibold tracking-tight">
              {dict.projectsTitle}
            </h2>
            {profile.projects.length ? (
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {profile.projects.map((product, index) => (
                  <CatalogCard
                    key={product.solutionId ?? product.name}
                    product={product}
                    index={index}
                    palette={palette}
                    locale={locale}
                    dict={dictionary.catalog}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-500">{dict.projectsEmpty}</p>
            )}
          </section>
          <section className="mt-16" aria-labelledby="profile-lists">
            <h2 id="profile-lists" className="text-2xl font-semibold tracking-tight">
              {dict.listsTitle}
            </h2>
            {profile.lists.length ? (
              <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {profile.lists.map(list => (
                  <BoardCard
                    key={list.id}
                    board={{
                      id: list.id,
                      name: list.name,
                      count: list.count,
                      covers: list.covers,
                      visibility: list.visibility,
                    }}
                    href={`/comunidad/${list.id}`}
                    byline={list.curator}
                    stats={{ likes: list.likes, saves: list.saves, comments: list.comments }}
                    dict={dictionary.community}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-stone-500">{dict.listsEmpty}</p>
            )}
          </section>
        </>
      ) : (
        <p className="py-16 text-center text-stone-500">{dict.emptyBoth}</p>
      )}

      <p className="mt-16 border-t border-stone-200 pt-5 text-xs leading-relaxed text-stone-400">
        {dict.note}
      </p>
    </section>
  );
}
