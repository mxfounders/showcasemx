import Image from 'next/image';
import Link from '@/i18n/navigation';
import { ArrowUpRightIcon, StarIcon } from '@/components/icons/gota';
import { ProductVisual } from '@/components/product-visual';
import { ProjectMark } from '@/components/project-mark';
import { VerifiedMark } from '@/components/recognition/verified-mark';
import { localizedOfferingOptions } from '@/lib/taxonomy';
import type { PreviewProduct } from '@/lib/catalog-preview';
import type { Dictionary } from '@/i18n/dictionary';
import { ResponseSignalNote } from './response-signal';
import { DomainVerifiedChip } from './domain-verified';

/**
 * One listing card of the catalogue pages (/explorar, /industria, /colecciones) and of
 * /nuevo. No hooks, so it renders on the server or inside the filtered client layout.
 */
export function CatalogCard({
  product,
  index,
  palette,
  locale,
  dict,
}: {
  product: PreviewProduct;
  index: number;
  palette: { backgroundColor: string; color: string };
  locale: string;
  dict: Pick<Dictionary['catalog'], 'ratingLabel' | 'viewSolution'>;
}) {
  return (
    <Link
      href={product.detailUrl || '#'}
      className="group flex flex-col justify-between rounded-[24px] border border-stone-200 bg-white p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-200/50"
    >
      <div>
        {product.website ? (
          <div
            className="relative flex h-36 shrink-0 flex-col items-center justify-center gap-3 overflow-hidden rounded-[16px]"
            style={{ backgroundColor: palette.backgroundColor, color: palette.color }}
          >
            {product.ogImage ? (
              <Image
                src={product.ogImage}
                alt={product.name}
                fill
                sizes="(min-width: 640px) 30vw, 90vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              <>
                <span className="text-[28px] font-semibold tracking-[-0.04em]">{product.name}</span>
                <span className="text-[10px] opacity-80">{new URL(product.website).hostname}</span>
              </>
            )}
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[9px] font-medium uppercase tracking-widest text-stone-800 backdrop-blur-md">
              {localizedOfferingOptions(locale).find(item => item.value === product.offering)
                ?.label ?? product.offering}
            </span>
            <DomainVerifiedChip
              at={product.domainVerifiedAt}
              locale={locale}
              className="absolute left-3 top-3"
            />
          </div>
        ) : (
          <ProductVisual variant={index % 4} color={palette.backgroundColor} />
        )}

        <div className="flex items-center gap-3 pt-5">
          <ProjectMark
            name={product.name}
            favicon={product.favicon}
            size={32}
            className="size-8 shrink-0 rounded-[8px]"
            fallbackClassName="flex items-center justify-center text-xs font-semibold text-white"
            fallbackStyle={{ backgroundColor: palette.color }}
          />
          <span className="text-lg font-semibold tracking-tight text-stone-900">
            {product.name}
          </span>
          {product.verified && <VerifiedMark locale={locale} />}
          <ArrowUpRightIcon
            aria-hidden="true"
            className="ml-auto size-4 text-stone-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>

        <p className="line-clamp-2 pt-3 text-[13px] leading-relaxed text-stone-500">
          {product.description}
        </p>
        <ResponseSignalNote
          signal={product.response}
          locale={locale}
          className="pt-2 text-[11px] text-stone-500"
        />
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-[11px] font-medium text-stone-400">
        {product.rating != null && product.reviews ? (
          <span
            className="inline-flex items-center gap-1 pr-4 text-stone-600"
            aria-label={dict.ratingLabel
              .replace('{rating}', product.rating.toFixed(1))
              .replace('{count}', String(product.reviews))}
          >
            <StarIcon variant="fill" className="size-3.5 text-[#88631B]" aria-hidden="true" />
            <span aria-hidden="true">
              {product.rating.toFixed(1)}
              <span className="text-stone-400"> ({product.reviews})</span>
            </span>
          </span>
        ) : (
          <span className="truncate pr-4">{product.provider || product.name}</span>
        )}
        <span className="inline-flex shrink-0 items-center text-[#365DC4]">
          {dict.viewSolution}
        </span>
      </div>
    </Link>
  );
}
