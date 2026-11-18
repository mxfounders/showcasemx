import type { Metadata } from 'next';
import Link from '@/i18n/navigation';
import { ArrowLeftIcon, ArrowRightIcon } from '@/components/icons/gota';
import { ProjectMark } from '@/components/project-mark';
import { profileDirectory, type DirectoryEntry } from '@/lib/profiles/server';
import { actionButtonStyle, getAccentStyle } from '@/lib/brand-colors';
import { localeAlternates, pageOpenGraph } from '@/lib/seo';
import { getDictionary } from '@/i18n/get-dictionary';

// The founders directory (SHCWS-120): people who turned on their public profile and show
// at least one published listing. Nothing about who isn't here; an outage shows the empty
// state rather than an error page.
export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

const pageNumber = (value: string | undefined) =>
  Math.max(1, Math.min(1000, Number.parseInt(String(value ?? '1'), 10) || 1));

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = pageNumber((await searchParams).page);
  const { profiles, meta } = await getDictionary(locale);
  const title = `${profiles.directory.metaTitle} | shwcs`;
  return {
    title,
    description: profiles.directory.metaDescription,
    alternates: localeAlternates(locale, '/fundadores'),
    openGraph: pageOpenGraph({
      locale,
      path: '/fundadores',
      title,
      description: profiles.directory.metaDescription,
      ogLocale: meta.site.ogLocale,
    }),
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FoundersDirectoryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const page = pageNumber((await searchParams).page);
  const [dictionary, directory] = await Promise.all([
    getDictionary(locale),
    profileDirectory(page).catch(() => ({
      entries: [] as DirectoryEntry[],
      total: 0,
      hasMore: false,
    })),
  ]);
  const dict = dictionary.profiles.directory;
  const palette = getAccentStyle('/fundadores');
  const count = (one: string, many: string, value: number) =>
    value === 1 ? one : many.replace('{count}', String(value));
  const href = (value: number) => (value > 1 ? `/fundadores?page=${value}` : '/fundadores');
  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12 lg:pt-16">
      <div className="mb-10 flex flex-col gap-5 md:mb-14 md:flex-row md:items-start md:justify-between md:gap-12">
        <h1 className="shrink-0 text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl md:max-w-md md:text-[42px]">
          {dict.title}
        </h1>
        <div className="max-w-lg md:pt-2">
          <p className="text-[17px] leading-relaxed text-stone-500">{dict.subtitle}</p>
          {directory.total > 0 && (
            <p className="mt-3 text-sm text-stone-400">
              {count(dict.countOne, dict.countMany, directory.total)}
            </p>
          )}
        </div>
      </div>

      {directory.entries.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {directory.entries.map(entry => (
            <li key={entry.handle}>
              <Link
                href={`/c/${entry.handle}`}
                className="group flex h-full flex-col rounded-[24px] border border-stone-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-200/50 motion-reduce:transform-none"
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    style={palette}
                    className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
                  >
                    {Array.from(entry.displayName)[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-medium tracking-tight text-stone-900">
                      {entry.displayName}
                    </span>
                    <span className="block truncate text-sm text-stone-500">@{entry.handle}</span>
                  </span>
                </div>
                {entry.bio && (
                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-stone-600">
                    {entry.bio}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between gap-3 pt-6">
                  <span className="flex items-center gap-2">
                    {entry.projects.slice(0, 4).map(project => (
                      <ProjectMark
                        key={project.detailUrl ?? project.name}
                        name={project.name}
                        favicon={project.favicon}
                        size={24}
                        className="size-6 shrink-0 rounded-[6px]"
                        fallbackClassName="flex items-center justify-center bg-stone-100 text-[10px] font-semibold text-stone-500"
                      />
                    ))}
                    <span className="text-xs text-stone-500">
                      {count(dict.projectsOne, dict.projectsMany, entry.projects.length)}
                    </span>
                  </span>
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="size-4 text-[#365DC4] transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-[24px] border border-dashed border-stone-300 px-6 py-16 text-center sm:py-24">
          <p className="mx-auto max-w-md text-sm leading-relaxed text-stone-500">{dict.empty}</p>
          <Link
            href="/account/settings/profile#perfil-publico"
            style={actionButtonStyle}
            className="action-button mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
          >
            {dict.emptyCta}
            <ArrowRightIcon className="button-arrow size-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {(page > 1 || directory.hasMore) && (
        <nav
          aria-label={dict.page.replace('{page}', String(page))}
          className="mt-12 flex items-center justify-between gap-4"
        >
          {page > 1 ? (
            <Link
              href={href(page - 1)}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              {dict.previous}
            </Link>
          ) : (
            <span />
          )}
          {directory.hasMore && (
            <Link
              href={href(page + 1)}
              style={actionButtonStyle}
              className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm"
            >
              {dict.next}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
