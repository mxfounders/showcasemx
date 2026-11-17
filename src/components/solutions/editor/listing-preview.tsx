'use client';
import Image from 'next/image';
import { brandColors, solutionCategoryTones } from '@/lib/brand-colors';

/**
 * The catalogue card as it will look, redrawn on every keystroke. Same proportions and
 * type as the card in src/components/category-explorer.tsx, so what the founder sees
 * here is what a buyer sees there.
 */
export function ListingPreview({
  title,
  name,
  description,
  kind,
  host,
  cover,
  icon,
  categories,
  reading,
  coverAlt,
  namePlaceholder,
  descriptionPlaceholder,
}: {
  title: string;
  name: string;
  description: string;
  kind: string;
  host: string;
  /** A URL we serve (screenshot or the site's cover), or null for the lettered cover. */
  cover: string | null;
  /** The logo read from the site, served by us; null shows the initial. */
  icon: string | null;
  categories: { value: string; label: string }[];
  /** While the site is being read: the card shows a shimmer instead of stale text. */
  reading: boolean;
  coverAlt: string;
  namePlaceholder: string;
  descriptionPlaceholder: string;
}) {
  const tone = brandColors[solutionCategoryTones[categories[0]?.value ?? ''] ?? 'blue'];
  const shown = name.trim() || namePlaceholder;
  return (
    <figure aria-label={title}>
      <figcaption className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-stone-400">
        {title}
      </figcaption>
      <div
        aria-hidden="true"
        className="flex h-[340px] w-full max-w-[340px] flex-col rounded-[20px] border border-stone-200/80 bg-white p-3.5 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.16)]"
      >
        <div
          className="relative flex h-40 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl"
          style={{ backgroundColor: tone.soft, color: tone.solid }}
        >
          {reading ? (
            <span className="absolute inset-0 animate-pulse bg-white/40 motion-reduce:animate-none" />
          ) : cover ? (
            <Image
              src={cover}
              alt={coverAlt}
              fill
              unoptimized
              sizes="340px"
              className="object-cover"
            />
          ) : (
            <>
              <span className="max-w-full truncate px-4 text-[34px] font-semibold tracking-[-0.06em]">
                {shown}
              </span>
              {host && <span className="text-xs">{host}</span>}
            </>
          )}
          {kind && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-medium text-stone-700">
              {kind}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5 px-1 pt-4">
          {icon ? (
            <Image
              src={icon}
              alt=""
              width={32}
              height={32}
              unoptimized
              className="size-8 shrink-0 rounded-[9px] object-contain"
            />
          ) : (
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-sm font-semibold text-white"
              style={{ backgroundColor: tone.solid }}
            >
              {shown.slice(0, 1)}
            </span>
          )}
          <span
            className={`truncate text-[20px] font-semibold tracking-[-0.03em] ${name.trim() ? 'text-stone-900' : 'text-stone-300'}`}
          >
            {shown}
          </span>
        </div>
        {reading ? (
          <span className="mx-1 mt-3 block space-y-2">
            <span className="block h-3 w-full animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
            <span className="block h-3 w-2/3 animate-pulse rounded bg-stone-100 motion-reduce:animate-none" />
          </span>
        ) : (
          <p
            className={`line-clamp-2 px-1 pt-2 text-[13px] leading-relaxed ${description.trim() ? 'text-stone-500' : 'text-stone-300'}`}
          >
            {description.trim() || descriptionPlaceholder}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5 px-1 pt-3">
          {categories.slice(0, 3).map(category => {
            const color = brandColors[solutionCategoryTones[category.value] ?? 'blue'];
            return (
              <span
                key={category.value}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ backgroundColor: color.soft, color: color.solid }}
              >
                {category.label}
              </span>
            );
          })}
          {host && <span className="ml-auto truncate text-[11px] text-stone-400">{host}</span>}
        </div>
      </div>
    </figure>
  );
}
