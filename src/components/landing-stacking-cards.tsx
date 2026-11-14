'use client';

import { useRef } from 'react';
import Link from '@/i18n/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { brandColors } from '@/lib/brand-colors';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { Dictionary } from '@/i18n/dictionary';
import { ProjectMark } from '@/components/project-mark';
import { ArrowRightIcon, HeartIcon, PlusIcon } from '@/components/icons/gota';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type StackCardId = keyof Dictionary['landing']['stackingCards']['cards'];

// Non-text card data; each card's copy lives in `landing.stackingCards.cards[id]`.
// Every card describes something that exists today and links to where it lives
// (CLAUDE.md §46, SHCWS-37): update the copy together with the feature.
const stackCards: readonly {
  id: StackCardId;
  href: string;
  color: { soft: string; solid: string };
}[] = [
  {
    id: 'catalog',
    href: '#catalogo',
    color: { soft: brandColors.blue.soft, solid: brandColors.blue.solid },
  },
  {
    id: 'lists',
    href: '/account/lists',
    color: { soft: brandColors.terracotta.soft, solid: brandColors.terracotta.solid },
  },
  {
    id: 'contact',
    href: '#catalogo',
    color: { soft: brandColors.sage.soft, solid: brandColors.sage.solid },
  },
  {
    id: 'reviews',
    href: '/criterios',
    color: { soft: brandColors.lavender.soft, solid: brandColors.lavender.solid },
  },
];

export function LandingStackingCards({
  products = [],
  dict,
}: {
  products?: PublishedProduct[];
  dict: Dictionary['landing'];
}) {
  const copy = dict.stackingCards;
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: `+=${stackCards.length * 100}%`,
          scrub: 1,
          pin: true,
        },
      });

      cardsRef.current.forEach((card, index) => {
        if (index === 0) return;

        const prevCards = cardsRef.current.slice(0, index);
        tl.to(
          prevCards,
          {
            scale: i => 1 - 0.04 * (index - i),
            y: i => `-${(index - i) * 2}vh`,
            opacity: i => 1 - 0.15 * (index - i),
            duration: 1,
            ease: 'power2.inOut',
          },
          `step${index}`,
        );

        tl.fromTo(
          card,
          { y: '150vh', scale: 0.9, opacity: 0 },
          { y: '0vh', scale: 1, opacity: 1, duration: 1, ease: 'power2.out' },
          `step${index}`,
        );
      });
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#f5f5f4]"
    >
      {stackCards.map((item, index) => (
        <div
          key={item.id}
          ref={el => {
            cardsRef.current[index] = el;
          }}
          className="absolute w-[90%] max-w-6xl h-[80vh] min-h-[500px] max-h-[800px] rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-stone-200/50"
          style={{ backgroundColor: item.color.soft, zIndex: index + 10 }}
        >
          <div className="flex-1 p-8 sm:p-12 md:p-16 flex flex-col relative z-10">
            <div>
              <div className="mb-4 inline-flex items-center gap-3">
                <span
                  className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm"
                  style={{ backgroundColor: item.color.solid }}
                >
                  {copy.cards[item.id].badge}
                </span>
              </div>

              <h2
                className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight mb-4 leading-[1.15]"
                style={{ color: item.color.solid }}
              >
                {copy.cards[item.id].title}
              </h2>

              <p className="text-base sm:text-lg text-stone-700/90 leading-relaxed max-w-md">
                {copy.cards[item.id].description}
              </p>
            </div>

            <div className="mt-auto pt-10">
              <MarkStack products={products} color={item.color.solid} copy={copy} />

              <div className="mb-8 flex flex-wrap gap-4 items-center">
                <Link
                  href={item.href}
                  className="px-7 py-3 rounded-full text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 group text-sm sm:text-base"
                  style={{ backgroundColor: item.color.solid }}
                >
                  {copy.cards[item.id].button}
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
                {item.href !== '/criterios' && (
                  <Link
                    href="/criterios"
                    className="px-7 py-3 rounded-full bg-white text-stone-800 font-medium shadow-sm transition-all hover:bg-stone-50 hover:shadow-md text-sm sm:text-base"
                  >
                    {copy.secondaryAction}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 relative hidden md:block overflow-hidden">
            <RightVisual color={item.color.solid} products={products} copy={copy} />
          </div>
        </div>
      ))}
    </section>
  );
}

type StackCopy = Dictionary['landing']['stackingCards'];

// The marks of the first published projects, then dashed «+» tiles for the ones still to
// come (a link to submit one). At least one open tile, four tiles in all.
const MarkStack = ({
  products,
  color,
  copy,
}: {
  products: PublishedProduct[];
  color: string;
  copy: StackCopy;
}) => {
  const shown = products.slice(0, 3);
  const open = Math.max(1, 4 - shown.length);
  const total = shown.length + open;
  return (
    <div className="flex items-center -space-x-3 mb-4">
      {shown.map((product, index) => (
        <div
          key={product.detailUrl ?? product.name}
          className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-[0.8rem] bg-white border border-stone-200 shadow-sm flex items-center justify-center overflow-hidden transition-transform hover:scale-110"
          style={{ zIndex: total - index }}
        >
          <ProjectMark
            name={product.name}
            favicon={product.favicon}
            label={product.name}
            size={48}
            className="w-full h-full"
            imageClassName="object-cover"
            fallbackClassName="flex items-center justify-center text-sm font-bold text-stone-800"
          />
        </div>
      ))}
      <Link
        href="/account/solutions/new"
        aria-label={copy.slotAction}
        title={copy.slotAction}
        className="group/slots flex items-center -space-x-3 rounded-[0.9rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ outlineColor: color }}
      >
        {Array.from({ length: open }, (_, index) => (
          <span
            key={index}
            className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-[0.8rem] border border-dashed bg-white shadow-sm flex items-center justify-center transition-transform duration-200 ease-out group-hover/slots:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/slots:translate-y-0"
            style={{
              zIndex: total - shown.length - index,
              borderColor: `${color}66`,
              color,
              transitionDelay: `${index * 30}ms`,
            }}
          >
            <PlusIcon aria-hidden="true" className="w-4 h-4" />
          </span>
        ))}
      </Link>
    </div>
  );
};

// Decorative: the same listings appear, readable, in the catalog below.
const RightVisual = ({
  color,
  products,
  copy,
}: {
  color: string;
  products: PublishedProduct[];
  copy: StackCopy;
}) => (
  <div
    aria-hidden="true"
    className="absolute inset-0 pointer-events-none overflow-hidden"
    style={{
      maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
    }}
  >
    <MockupGridVisual color={color} products={products} copy={copy} />
  </div>
);

// Cells per column. A column holds them twice and drifts by half its height, so one copy
// (6 × 196 px) must stay taller than the visible panel (at most 800 px, plus the tilt).
const cellsPerColumn = 6;
// Where the ranked listings go in each column: the middle first, so they are on screen
// from the start (and stay there when motion is reduced), the edges last.
const fillOrder = [1, 2, 3, 0, 4, 5];

// Real listings, ranked by real interaction (src/lib/solutions/ranking.ts), with open
// slots in every cell still free (CLAUDE.md §24): never an invented project.
const MockupGridVisual = ({
  color,
  products,
  copy,
}: {
  color: string;
  products: PublishedProduct[];
  copy: StackCopy;
}) => {
  const ranked = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const columns: (PublishedProduct | null)[][] = [
    Array<PublishedProduct | null>(cellsPerColumn).fill(null),
    Array<PublishedProduct | null>(cellsPerColumn).fill(null),
  ];
  ranked.slice(0, cellsPerColumn * 2).forEach((product, index) => {
    columns[index % 2][fillOrder[Math.floor(index / 2)]] = product;
  });

  return (
    <div className="absolute inset-x-0 -top-32 -bottom-32 flex items-start justify-center gap-5 rotate-[-6deg]">
      {columns.map((cells, column) => (
        <div
          key={column}
          className={`flex flex-col w-48 lg:w-56 shrink-0 will-change-transform ${
            column === 0 ? 'mockup-drift' : 'mockup-drift-reverse mt-16'
          }`}
        >
          {[...cells, ...cells].map((product, index) => (
            <div key={index} className="pb-5">
              {product ? (
                <ProductMockupCard product={product} color={color} />
              ) : (
                <SlotMockupCard color={color} copy={copy} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

const ProductMockupCard = ({ product, color }: { product: PublishedProduct; color: string }) => (
  <div className="bg-white/90 border border-stone-200/60 shadow-lg shadow-stone-900/5 rounded-[1.5rem] p-6 flex flex-col h-44 w-full">
    <div className="flex justify-between items-center mb-auto">
      <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase truncate pr-2">
        {product.category || 'Software'}
      </span>
      <div className="flex shrink-0 items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-stone-600">
        <HeartIcon variant="fill" aria-hidden="true" className="w-2.5 h-2.5" style={{ color }} />
        {product.likes ?? 0}
      </div>
    </div>
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <ProjectMark
          name={product.name}
          favicon={product.favicon}
          size={20}
          className="w-5 h-5 rounded shrink-0"
          imageClassName="object-contain bg-white"
          fallbackClassName="bg-stone-800 text-white flex items-center justify-center text-[9px] font-bold"
        />
        <h4 className="text-[15px] font-bold text-stone-900 truncate">{product.name}</h4>
      </div>
      <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
        {product.description || product.feature}
      </p>
    </div>
  </div>
);

// An open slot, drawn like a listing card that has not been filled in yet.
const SlotMockupCard = ({ color, copy }: { color: string; copy: StackCopy }) => (
  <div className="flex h-44 w-full flex-col rounded-[1.5rem] border border-dashed border-stone-900/15 bg-white/40 p-6">
    <div className="mb-auto flex items-center justify-between gap-2">
      <span className="truncate text-[10px] font-bold uppercase tracking-widest text-stone-500/80">
        {copy.slotLabel}
      </span>
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
        style={{ color }}
      >
        <PlusIcon aria-hidden="true" className="h-3.5 w-3.5" />
      </span>
    </div>
    <div className="mt-4">
      <p className="mb-2.5 line-clamp-2 text-balance text-[15px] font-semibold leading-snug text-stone-700/80">
        {copy.slotTitle}
      </p>
      <span className="block h-1.5 w-3/4 rounded-full bg-stone-900/[0.07]" />
    </div>
  </div>
);
