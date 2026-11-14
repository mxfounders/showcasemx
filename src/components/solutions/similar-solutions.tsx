import Link from '@/i18n/navigation';
import { ArrowUpRightIcon } from '@/components/icons/gota';
import type { Dictionary } from '@/i18n/dictionary';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { SimilarExit, SimilarityMatch } from '@/lib/solutions/similar';
import { contactBriefHref } from '@/lib/contact-inquiry';
import {
  localizedCapabilityLabel,
  localizedCategoryDisplayLabel,
  localizedCollections,
  localizedIndustries,
} from '@/lib/taxonomy';
import { ProjectMark } from '@/components/project-mark';
import { VerifiedMark } from '@/components/recognition/verified-mark';

export type SimilarSection = {
  items: Array<{ product: PublishedProduct; match: SimilarityMatch }>;
  exits: SimilarExit[];
};

// The listing used to be a dead end: contact the project or leave. Up to three others
// that declared something in common (src/lib/solutions/similar.ts), and when there are
// fewer, an editorial collection, the category page or the brief — so every listing ends
// with somewhere useful to go. Organic catalogue only: sponsored slots never show here.
export function SimilarSolutions({
  similar: { items, exits },
  solutionName,
  dict,
  locale = 'es',
}: {
  similar: SimilarSection;
  solutionName: string;
  dict: Dictionary['solution'];
  locale?: string;
}) {
  if (!items.length && !exits.length) return null;
  const industryLabels = Object.fromEntries(
    localizedIndustries(locale).map(item => [item.value, item.label]),
  );
  const card =
    'group flex flex-col justify-between rounded-[20px] border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300';
  const cta = (label: string) => (
    <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#365DC4]">
      {label}
      <ArrowUpRightIcon
        aria-hidden="true"
        className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
      />
    </span>
  );
  return (
    <section className="mt-16 border-t border-stone-200 pt-10">
      <h2 className="text-xl font-medium">
        {items.length ? dict.similarTitle : dict.exploreTitle}
      </h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ product, match }) => {
          // What the two listings declared in common, most specific first.
          const common = [
            ...match.capabilities.map(id => localizedCapabilityLabel(id, locale)),
            ...match.categories.map(value => localizedCategoryDisplayLabel(value, locale)),
            ...match.industries.map(value => industryLabels[value] ?? value),
          ].slice(0, 2);
          return (
            <Link
              key={product.detailUrl || product.name}
              href={product.detailUrl || '#'}
              className={card}
            >
              <div>
                <div className="flex items-center gap-3">
                  <ProjectMark
                    name={product.name}
                    favicon={product.favicon}
                    size={28}
                    className="size-7 shrink-0 rounded-[7px]"
                    fallbackClassName="flex items-center justify-center bg-stone-100 text-xs font-semibold text-stone-500"
                  />
                  <span className="truncate text-base font-medium tracking-tight text-stone-900">
                    {product.name}
                  </span>
                  {product.verified && <VerifiedMark locale={locale} />}
                </div>
                <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-stone-500">
                  {product.description}
                </p>
                {!!common.length && (
                  <p className="mt-3 text-xs text-stone-400">
                    {dict.similarCommon} {common.join(', ')}
                  </p>
                )}
              </div>
              {cta(dict.similarCta)}
            </Link>
          );
        })}
        {exits.map(exit => {
          if (exit.kind === 'collection') {
            const collection = localizedCollections(locale).find(item => item.slug === exit.slug);
            if (!collection) return null;
            return (
              <Link key="collection" href={`/colecciones/${exit.slug}`} className={card}>
                <div>
                  <p className="text-xs text-stone-400">{dict.exits.collectionLabel}</p>
                  <p className="mt-1 text-base font-medium tracking-tight text-stone-900">
                    {collection.title}
                  </p>
                  <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-stone-500">
                    {collection.description}
                  </p>
                </div>
                {cta(dict.exits.collectionCta)}
              </Link>
            );
          }
          if (exit.kind === 'category')
            return (
              <Link key="category" href={`/explorar/${exit.slug}`} className={card}>
                <div>
                  <p className="text-base font-medium tracking-tight text-stone-900">
                    {dict.exits.categoryTitle.replace(
                      '{category}',
                      localizedCategoryDisplayLabel(exit.label, locale),
                    )}
                  </p>
                  <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
                    {dict.exits.categoryDesc}
                  </p>
                </div>
                {cta(dict.exits.categoryCta)}
              </Link>
            );
          return (
            <Link
              key="brief"
              href={contactBriefHref(dict.exits.briefNeed.replace('{name}', solutionName))}
              className={`${card} border-dashed`}
            >
              <div>
                <p className="text-base font-medium tracking-tight text-stone-900">
                  {dict.exits.briefTitle}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-stone-500">
                  {dict.exits.briefDesc}
                </p>
              </div>
              {cta(dict.exits.briefCta)}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
