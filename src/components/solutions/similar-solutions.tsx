import Link from '@/i18n/navigation';
import { ArrowUpRight } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionary';
import type { PublishedProduct } from '@/lib/solutions/public';
import { ProjectMark } from '@/components/project-mark';

// The ficha used to be a dead end: contact the project or leave. Three others
// from the same catalogue and category give somewhere to go without leaving
// the site. Selection and order come from the caller (see how callers of
// this component pick `similar`) — this component only renders the list.
export function SimilarSolutions({
  products,
  dict,
}: {
  products: PublishedProduct[];
  dict: Dictionary['solution'];
}) {
  return (
    <section className="mt-16 border-t border-stone-200 pt-10">
      <h2 className="text-xl font-medium">{dict.similarTitle}</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map(product => (
          <Link
            key={product.detailUrl || product.name}
            href={product.detailUrl || '#'}
            className="group flex flex-col justify-between rounded-[20px] border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300"
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
              </div>
              <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-stone-500">
                {product.description}
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#365DC4]">
              {dict.similarCta}
              <ArrowUpRight
                aria-hidden="true"
                className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
