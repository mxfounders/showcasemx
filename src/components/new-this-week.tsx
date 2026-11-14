import Link from '@/i18n/navigation';
import { splitNewListings } from '@/lib/solutions/new-this-week';
import { getAccentStyle } from '@/lib/brand-colors';
import { CatalogCard } from '@/components/catalog/catalog-card';
import type { PreviewProduct } from '@/lib/catalog-preview';
import type { Dictionary } from '@/i18n/dictionary';

/**
 * The home's «Nuevo esta semana» block (SHCWS-125): up to four listings approved in the
 * last seven days, newest first. Renders nothing when there are none: no empty block.
 */
export function NewThisWeekStrip({
  products,
  locale,
  dict,
}: {
  products: readonly PreviewProduct[];
  locale: string;
  dict: Dictionary['catalog'];
}) {
  const { current } = splitNewListings(products);
  if (!current.length) return null;
  const palette = getAccentStyle('/nuevo');
  return (
    <section
      aria-labelledby="new-this-week"
      className="mx-auto max-w-[1440px] px-5 pb-8 pt-12 sm:px-8 lg:px-12"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="new-this-week" className="text-2xl font-semibold tracking-tight text-stone-900">
            {dict.newThisWeek.homeTitle}
          </h2>
          <p className="mt-1.5 text-sm text-stone-500">{dict.newThisWeek.homeDesc}</p>
        </div>
        <Link
          href="/nuevo"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#365DC4]"
        >
          {dict.newThisWeek.homeCta}
          <span className="button-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {current.slice(0, 4).map((product, index) => (
          <CatalogCard
            key={product.detailUrl ?? product.name}
            product={product}
            index={index}
            palette={palette}
            locale={locale}
            dict={dict}
          />
        ))}
      </div>
    </section>
  );
}
