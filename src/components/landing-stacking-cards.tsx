'use client';

import { useRef } from 'react';
import Link from '@/i18n/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { motion } from 'framer-motion';
import { brandColors } from '@/lib/brand-colors';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { Dictionary } from '@/i18n/dictionary';
import { ProjectMark } from '@/components/project-mark';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

type StackCardId = keyof Dictionary['landing']['stackingCards']['cards'];

// Non-text card data; each card's copy lives in `landing.stackingCards.cards[id]`.
const stackCards: readonly { id: StackCardId; color: { soft: string; solid: string } }[] = [
  { id: 'data', color: { soft: brandColors.blue.soft, solid: brandColors.blue.solid } },
  {
    id: 'agents',
    color: { soft: brandColors.terracotta.soft, solid: brandColors.terracotta.solid },
  },
  { id: 'enrichment', color: { soft: brandColors.sage.soft, solid: brandColors.sage.solid } },
  {
    id: 'outbound',
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
              <div className="flex items-center -space-x-3 mb-4">
                {products.slice(0, 3).map((p, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-[0.8rem] bg-white border border-stone-200 shadow-sm flex items-center justify-center relative hover:scale-110 transition-transform overflow-hidden"
                    style={{ zIndex: 3 - i }}
                  >
                    <ProjectMark
                      name={p.name}
                      favicon={p.favicon}
                      label={p.name}
                      size={48}
                      className="w-full h-full"
                      imageClassName="object-cover"
                      fallbackClassName="flex items-center justify-center text-sm font-bold text-stone-800"
                    />
                  </div>
                ))}
              </div>

              <div className="mb-8 flex flex-wrap gap-4 items-center">
                <a
                  href="#catalogo"
                  className="px-7 py-3 rounded-full text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 group text-sm sm:text-base"
                  style={{ backgroundColor: item.color.solid }}
                >
                  {copy.cards[item.id].button}
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </a>
                <Link
                  href="/criterios"
                  className="px-7 py-3 rounded-full bg-white text-stone-800 font-medium shadow-sm transition-all hover:bg-stone-50 hover:shadow-md text-sm sm:text-base"
                >
                  {copy.secondaryAction}
                </Link>
              </div>
            </div>
          </div>

          <div className="flex-1 relative hidden md:block opacity-90 overflow-hidden">
            <RightVisual color={item.color.solid} products={products} dict={copy} />
          </div>
        </div>
      ))}
    </section>
  );
}

type StackingCardsDict = Dictionary['landing']['stackingCards'];

const RightVisual = ({
  color,
  products,
  dict,
}: {
  color: string;
  products: PublishedProduct[];
  dict: StackingCardsDict;
}) => {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
        WebkitMaskImage:
          'linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)',
      }}
    >
      <MockupGridVisual color={color} products={products} dict={dict} />
    </div>
  );
};

const MockupGridVisual = ({
  color,
  products,
  dict,
}: {
  color: string;
  products: PublishedProduct[];
  dict: StackingCardsDict;
}) => {
  // Ranked by real interaction, not a fabricated number. See src/lib/solutions/ranking.ts.
  const rankedProducts = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const col1Products = rankedProducts.slice(0, 8);
  const col2Products = rankedProducts.slice(8, 16);

  return (
    <div className="absolute inset-[-30%] flex gap-4 sm:gap-6 items-center justify-center rotate-[-6deg] scale-105">
      <motion.div
        animate={{ y: ['-25%', '0%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="flex flex-col gap-4 sm:gap-6 w-48 sm:w-56"
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const product = col1Products[i];
          return product ? (
            <ProductMockupCard key={`col1-prod-${i}`} product={product} color={color} />
          ) : (
            <MiniMockupCard key={`col1-empty-${i}`} dict={dict} />
          );
        })}
      </motion.div>

      <motion.div
        animate={{ y: ['0%', '-25%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="flex flex-col gap-4 sm:gap-6 w-48 sm:w-56 mt-12"
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const product = col2Products[i];
          return product ? (
            <ProductMockupCard key={`col2-prod-${i}`} product={product} color={color} />
          ) : (
            <MiniMockupCard key={`col2-empty-${i}`} dict={dict} />
          );
        })}
      </motion.div>
    </div>
  );
};

const ProductMockupCard = ({ product, color }: { product: PublishedProduct; color: string }) => (
  <div className="bg-white/80 backdrop-blur-md border border-stone-200/50 shadow-lg rounded-[1.5rem] p-6 flex flex-col h-44 w-full transition-transform hover:-translate-y-1">
    <div className="flex justify-between items-center mb-auto">
      <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase">
        {product.category || 'Software'}
      </span>
      <div className="flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-stone-600">
        <svg className="w-2.5 h-2.5" style={{ color }} fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
            clipRule="evenodd"
          />
        </svg>
        {product.likes ?? 0}
      </div>
    </div>
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <ProjectMark
          name={product.name}
          favicon={product.favicon}
          size={20}
          className="w-5 h-5 rounded"
          imageClassName="object-contain bg-white shadow-sm"
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

const MiniMockupCard = ({ dict }: { dict: StackingCardsDict }) => (
  <div className="bg-transparent border border-dashed border-black/10 rounded-[1.5rem] p-6 flex flex-col h-44 w-full">
    <div className="flex justify-between text-[10px] font-bold text-black/20 tracking-widest uppercase mb-auto">
      <span>{dict.slotLabel}</span>
      <span className="text-black/20 text-lg leading-none">+</span>
    </div>
    <div>
      <h4 className="text-[15px] font-medium text-black/40 leading-tight">
        {dict.slotTitleLine1}
        <br />
        {dict.slotTitleLine2}
      </h4>
    </div>
  </div>
);
