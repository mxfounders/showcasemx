'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from '@/i18n/navigation';
import { ArrowUpRightIcon } from '@/components/icons/gota';
import { ProjectMark } from '@/components/project-mark';
import { sponsoredBookingParam } from '@/lib/ads/model';
import { sponsoredVisitParam, sponsoredVisitValue } from '@/lib/solutions/outbound';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { Dictionary } from '@/i18n/dictionary';

export type SponsoredItem = { bookingId: string; product: PublishedProduct };

/** What a sponsored card shows of a listing: its approved name, text, cover and mark. */
export type SponsoredCardContent = Pick<
  PublishedProduct,
  'name' | 'description' | 'favicon' | 'ogImage'
>;

/**
 * Paid placements, always labelled and kept apart from the organic results they sit
 * above. Delivery is counted first-party (/api/ads/events): one impression when a card
 * is half visible, one click when it is followed. No third-party pixels.
 */
export function SponsoredSlots({
  items,
  locale,
  dict,
}: {
  items: SponsoredItem[];
  locale: string;
  dict: Dictionary['ads']['slot'];
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={dict.label} className="mb-12">
      <SponsoredSlotHeader dict={dict} />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <SponsoredCard key={item.bookingId} item={item} locale={locale} cta={dict.cta} />
        ))}
      </div>
    </section>
  );
}

/** The «Sponsored» label and its disclosure, shared by the slot and its preview. */
export function SponsoredSlotHeader({ dict }: { dict: Dictionary['ads']['slot'] }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white">
        {dict.label}
      </span>
      <p className="text-xs text-stone-500">{dict.disclosure}</p>
    </div>
  );
}

export const sponsoredCardClass =
  'group flex items-start gap-4 rounded-[20px] border border-stone-200 bg-white p-5 transition-colors hover:border-stone-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#365DC4]';

/**
 * The inside of a sponsored card. The promote page renders the very same body as its
 * live preview (SHCWS-150), so what a founder sees before paying is what runs.
 */
export function SponsoredCardBody({
  product,
  cta,
}: {
  product: SponsoredCardContent;
  cta: string;
}) {
  return (
    <>
      {product.ogImage ? (
        <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-[12px] bg-stone-100">
          <Image src={product.ogImage} alt="" fill sizes="96px" className="object-cover" />
        </span>
      ) : (
        <ProjectMark
          name={product.name}
          favicon={product.favicon}
          size={40}
          className="size-10 shrink-0 rounded-[10px]"
          fallbackClassName="flex items-center justify-center bg-stone-100 text-sm font-semibold text-stone-600"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-base font-semibold tracking-tight text-stone-900">
          <span className="truncate">{product.name}</span>
          <ArrowUpRightIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-stone-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
          />
        </p>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-stone-500">
          {product.description}
        </p>
        <p className="mt-3 text-xs font-medium text-[#365DC4]">{cta}</p>
      </div>
    </>
  );
}

function SponsoredCard({
  item: { bookingId, product },
  locale,
  cta,
}: {
  item: SponsoredItem;
  locale: string;
  cta: string;
}) {
  const card = useRef<HTMLAnchorElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      entries => {
        if (seen.current || !entries.some(entry => entry.isIntersecting)) return;
        seen.current = true;
        track(bookingId, 'impression');
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [bookingId]);

  return (
    <Link
      ref={card}
      // `from=sponsored` makes the listing tag the project's links `utm_medium=sponsored`
      // (src/lib/solutions/outbound.ts), so the founder can tell paid visits apart; `ad`
      // names the booking, so the listing can count the visit for it (SHCWS-70).
      href={`/${locale}${product.detailUrl ?? ''}?${sponsoredVisitParam}=${sponsoredVisitValue}&${sponsoredBookingParam}=${bookingId}`}
      onClick={() => track(bookingId, 'click')}
      className={sponsoredCardClass}
    >
      <SponsoredCardBody product={product} cta={cta} />
    </Link>
  );
}

function track(bookingId: string, kind: 'impression' | 'click') {
  // keepalive lets a click be counted even though the page is navigating away.
  fetch('/api/ads/events', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookingId, kind }),
  }).catch(() => undefined);
}
