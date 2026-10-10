'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Bookmark, MessageCircle } from 'lucide-react';
import { brandColors } from '@/lib/brand-colors';
import { conceptCategories } from '@/lib/search/vocabulary';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { Dictionary } from '@/i18n/dictionary';
import { ProjectMark } from '@/components/project-mark';

type FeatureTabId = keyof Dictionary['landing']['features']['tabs'];

// Non-text tab data; each label lives in `landing.features.tabs[id]`. The ids are
// the concept keys of `conceptCategories`, which map them to real categories.
const featureTabs: readonly { id: FeatureTabId; color: { solid: string; soft: string } }[] = [
  { id: 'crm', color: brandColors.blue },
  { id: 'marketing', color: brandColors.terracotta },
  { id: 'rh', color: brandColors.lavender },
  { id: 'finanzas', color: brandColors.sage },
  { id: 'operaciones', color: brandColors.amber },
  { id: 'legal', color: brandColors.lavender },
  { id: 'datos', color: brandColors.blue },
  { id: 'ti', color: brandColors.sage },
  { id: 'soporte', color: brandColors.terracotta },
  { id: 'ecommerce', color: brandColors.sage },
  { id: 'proyectos', color: brandColors.amber },
  { id: 'diseno', color: brandColors.lavender },
  { id: 'automatizacion', color: brandColors.blue },
  { id: 'comunicacion', color: brandColors.terracotta },
  { id: 'desarrollo', color: brandColors.blue },
];

export function LandingFeatures({
  products = [],
  dict,
  explorerDict,
}: {
  products?: PublishedProduct[];
  dict: Dictionary['landing'];
  explorerDict: Dictionary['categoryExplorer'];
}) {
  const [activeTab, setActiveTab] = useState(featureTabs[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Center the active tab on mount
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(
        '[aria-selected="true"]',
      ) as HTMLElement;
      if (activeElement) {
        const containerCenter = scrollRef.current.offsetWidth / 2;
        const elementCenter = activeElement.offsetLeft + activeElement.offsetWidth / 2;
        scrollRef.current.scrollTo({ left: elementCenter - containerCenter, behavior: 'instant' });
      }
    }
  }, []);

  const handleTabClick = (
    feature: (typeof featureTabs)[number],
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    setActiveTab(feature);
    if (scrollRef.current) {
      const container = scrollRef.current;
      const button = event.currentTarget;
      const containerCenter = container.offsetWidth / 2;
      const buttonCenter = button.offsetLeft + button.offsetWidth / 2;
      container.scrollTo({
        left: buttonCenter - containerCenter,
        behavior: 'smooth',
      });
    }
  };

  // Ranked by real interaction (comments > saves > likes > views), not a fabricated
  // number. See src/lib/solutions/ranking.ts and src/lib/solutions/public.ts.
  const rankedProducts = [...products].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // The 15 marketing tabs map to the 7 real categories via `conceptCategories`
  // in src/lib/search/vocabulary.ts — the same mapping the catalog search now
  // uses to expand a query, instead of a copy that only lived here.
  const categoryProducts = rankedProducts
    .filter(p =>
      conceptCategories[activeTab.id]?.some(category => p.categories?.includes(category)),
    )
    .slice(0, 16);

  return (
    <section className="py-24 sm:py-32 overflow-hidden bg-transparent">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 px-4">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-stone-900 mb-6">
            {dict.features.titleLine1}
            <br />
            {dict.features.titleLine2}
          </h2>
          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
            {dict.features.description}
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl mb-12">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto hide-scrollbar pb-6 pt-2 px-6 sm:px-12 items-center justify-start gap-2"
            style={{
              maskImage:
                'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            }}
          >
            {featureTabs.map(feature => {
              const isActive = activeTab.id === feature.id;
              return (
                <button
                  key={feature.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={e => handleTabClick(feature, e)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'shadow-sm ring-1 ring-inset'
                      : 'bg-[#E5E5E4] text-stone-600 hover:bg-[#D5D5D4] ring-1 ring-inset ring-transparent'
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor: feature.color.soft,
                          color: feature.color.solid,
                          boxShadow: `inset 0 0 0 1px ${feature.color.solid}30`,
                        }
                      : {}
                  }
                >
                  {dict.features.tabs[feature.id]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl mt-8 pt-4 px-4 sm:px-6 lg:px-8">
          <div
            className="absolute top-16 bottom-0 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 rounded-[2.5rem] transition-colors duration-700 shadow-xl"
            style={{ backgroundColor: activeTab.color.soft }}
          />

          <div
            className="relative z-10 h-[600px] sm:h-[750px] w-full pointer-events-auto"
            style={{
              maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 px-4 sm:px-12 pb-24"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const product = categoryProducts[i];
                    if (product) {
                      return (
                        <Link
                          key={`prod-${i}`}
                          href={product.detailUrl || '#'}
                          className={`relative overflow-hidden rounded-3xl p-6 flex flex-col h-48 sm:h-52 ${product.ogImage ? 'border-none' : 'bg-white/95 border border-stone-200/60'} shadow-lg transition-all hover:shadow-xl group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800`}
                        >
                          {product.ogImage && (
                            <>
                              <Image
                                src={product.ogImage}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 90vw, 400px"
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                            </>
                          )}
                          <div className="relative z-10 flex justify-between items-center mb-auto">
                            <span
                              className={`text-[10px] font-bold tracking-widest uppercase ${product.ogImage ? 'text-white/80' : 'text-stone-500'}`}
                            >
                              {product.category || 'Software'}
                            </span>
                            <div
                              className={`flex items-center gap-2 px-2 py-1 rounded-full text-[11px] font-semibold ${product.ogImage ? 'bg-black/30 backdrop-blur-md text-white/90 border border-white/10' : 'bg-stone-100 text-stone-700'}`}
                            >
                              <span className="inline-flex items-center gap-0.5">
                                <Heart className="size-3 text-red-500" aria-hidden="true" />
                                {product.likes ?? 0}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <Bookmark
                                  className={`size-3 ${product.ogImage ? 'text-white/70' : 'text-stone-500'}`}
                                  aria-hidden="true"
                                />
                                {product.saves ?? 0}
                              </span>
                              <span className="inline-flex items-center gap-0.5">
                                <MessageCircle
                                  className={`size-3 ${product.ogImage ? 'text-white/70' : 'text-stone-500'}`}
                                  aria-hidden="true"
                                />
                                {product.comments ?? 0}
                              </span>
                            </div>
                          </div>
                          <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                              <ProjectMark
                                name={product.name}
                                favicon={product.favicon}
                                size={24}
                                className="w-6 h-6 rounded-md"
                                imageClassName="object-contain bg-white shadow-sm"
                                fallbackClassName="bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold"
                              />
                              <h4
                                className={`text-lg font-bold truncate ${product.ogImage ? 'text-white' : 'text-stone-900'}`}
                              >
                                {product.name}
                              </h4>
                            </div>
                            <p
                              className={`text-[13px] line-clamp-2 leading-relaxed ${product.ogImage ? 'text-white/80' : 'text-stone-600'}`}
                            >
                              {product.description || product.feature}
                            </p>
                          </div>
                        </Link>
                      );
                    }
                    return (
                      <Link
                        key={`empty-${i}`}
                        href="/account/solutions/new"
                        className="rounded-3xl p-6 flex flex-col h-48 sm:h-52 bg-white/60 border border-dashed border-stone-300 backdrop-blur-md transition-all hover:bg-white hover:shadow-sm group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
                      >
                        <div className="flex justify-between text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-auto">
                          <span>{explorerDict.availableSpace}</span>
                          <span>{(i + 1).toString().padStart(2, '0')}</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-stone-600 mb-4 leading-tight group-hover:text-stone-900 transition-colors">
                            {explorerDict.applySpaceTitle}
                          </h4>
                          <div
                            className="text-[11px] font-bold flex items-center gap-1.5 transition-colors opacity-80 group-hover:opacity-100 uppercase tracking-wide"
                            style={{ color: activeTab.color.solid }}
                          >
                            {explorerDict.applySpaceBtn}{' '}
                            {dict.features.tabs[activeTab.id].split(' ')[0]}{' '}
                            <span className="text-base font-medium leading-none mb-0.5">+</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
