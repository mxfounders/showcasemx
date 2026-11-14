import Link from '@/i18n/navigation';
import { ArrowRightIcon, ArrowUpRightIcon } from '@/components/icons/gota';
import { ProjectMark } from '@/components/project-mark';
import { actionButtonStyle } from '@/lib/brand-colors';
import type { BlogPost } from '@/lib/blog';
import { publicProducts } from '@/lib/solutions/public';
import { categories, localizedCategories } from '@/lib/taxonomy';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * Where an article sends its readers (SHCWS-103): the catalog category it is about,
 * up to three published listings (only real, published ones; none if there are none)
 * and the newsletter. Never sponsored placements.
 */
export async function ArticleCatalog({
  post,
  locale,
  dict,
}: {
  post: BlogPost;
  locale: string;
  dict: Dictionary['blog']['article'];
}) {
  const category = post.catalogCategory
    ? categories.find(item => item.slug === post.catalogCategory)
    : undefined;
  const title = category
    ? localizedCategories(locale).find(item => item.slug === category.slug)?.title
    : undefined;
  let projects: Awaited<ReturnType<typeof publicProducts>> = [];
  try {
    const catalog = await publicProducts();
    // Already ordered by real interaction; a category article narrows to its category.
    projects = (
      category ? catalog.filter(product => product.categories.includes(category.label)) : catalog
    ).slice(0, 3);
  } catch {
    /* The article still renders without listings. */
  }
  return (
    <section
      aria-labelledby="del-catalogo"
      className="mt-16 rounded-[28px] border border-stone-200 bg-white p-6 sm:mt-24 sm:p-9"
    >
      <p
        id="del-catalogo"
        className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400"
      >
        {dict.catalogTitle}
      </p>
      {projects.length > 0 && (
        <ul className="mt-6 divide-y divide-stone-100">
          {projects.map(product => (
            <li key={product.detailUrl ?? product.name}>
              <Link
                href={product.detailUrl ?? '/#catalogo'}
                className="group flex items-center gap-4 py-4"
              >
                <ProjectMark
                  name={product.name}
                  favicon={product.favicon}
                  size={40}
                  className="size-10 shrink-0 overflow-hidden rounded-xl border border-stone-200"
                  imageClassName="object-contain bg-white"
                  fallbackClassName="flex items-center justify-center bg-stone-100 text-sm font-semibold text-stone-700"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-stone-900">{product.name}</span>
                  <span className="mt-0.5 line-clamp-1 block text-sm text-stone-500">
                    {product.description}
                  </span>
                </span>
                <ArrowUpRightIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-stone-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={category ? `/explorar/${category.slug}` : '/#catalogo'}
          style={actionButtonStyle}
          className="action-button inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
        >
          {title ? dict.catalogCategory.replace('{category}', title) : dict.catalogExplore}
          <ArrowRightIcon aria-hidden="true" className="size-4 button-arrow" />
        </Link>
        {post.category === 'building' && (
          <Link
            href="/aplicar"
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400"
          >
            {dict.applyCta}
          </Link>
        )}
      </div>
      <div className="mt-8 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-stone-900">{dict.newsletterTitle}</p>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-stone-500">
            {dict.newsletterDesc}
          </p>
        </div>
        <Link
          href="/newsletter"
          className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-stone-400"
        >
          {dict.newsletterCta}
        </Link>
      </div>
    </section>
  );
}
