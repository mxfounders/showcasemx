'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from '@/i18n/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BookmarkIcon, CommentIcon, HeartIcon } from '@/components/icons/gota';
import { brandColors } from '@/lib/brand-colors';
import { conceptCategories } from '@/lib/search/vocabulary';
import type { PublishedProduct } from '@/lib/solutions/public';
import type { Dictionary } from '@/i18n/dictionary';
import { ProjectMark } from '@/components/project-mark';
import { VerifiedMark } from '@/components/recognition/verified-mark';
import { useLocale } from '@/i18n/use-locale';
import { briefHref } from '@/lib/briefs/links';

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
  const locale = useLocale();
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

  // The 15 marketing tabs map to the real categories via `conceptCategories`
  // in src/lib/search/vocabulary.ts — the same mapping the catalog search now
  // uses to expand a query, instead of a copy that only lived here.
  const categoryProducts = rankedProducts
    .filter(p =>
      conceptCategories[activeTab.id]?.some(category => p.categories?.includes(category)),
    )
    .slice(0, 16);
  // Real projects first; a tab with few of them adds one card asking what the buyer needs
  // (SHCWS-38), and the rest of the 16 places are «Espacio disponible» cards inviting
  // founders to apply (§24, kept by the owner's decision).
  const showBrief = categoryProducts.length < 4;
  const availableSlots = Math.max(0, 16 - categoryProducts.length - (showBrief ? 1 : 0));

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
            className="relative z-10 h-[600px] sm:h-[750px] w-full overflow-hidden pointer-events-auto"
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
                  {categoryProducts.map((product, i) => (
                    <Link
                      key={`prod-${i}`}
                      href={product.detailUrl || '#'}
                      className="group relative flex h-60 flex-col overflow-hidden rounded-3xl border border-stone-200/60 bg-white shadow-lg transition-all hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800 sm:h-64"
                    >
                      {/* The cover sits above the text, never under it: a cover often carries
                          its own headline, and text laid over it became unreadable. */}
                      <div
                        className="relative h-[46%] shrink-0 overflow-hidden"
                        style={{ backgroundColor: activeTab.color.soft }}
                      >
                        {product.ogImage && (
                          <Image
                            src={product.ogImage}
                            alt=""
                            fill
                            sizes="(max-width: 640px) 90vw, 400px"
                            className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transform-none"
                          />
                        )}
                        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
                          <span className="truncate rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-700 shadow-sm backdrop-blur-md">
                            {product.category || 'Software'}
                          </span>
                          <span className="flex shrink-0 items-center gap-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm backdrop-blur-md">
                            <span className="inline-flex items-center gap-0.5">
                              <HeartIcon className="size-3 text-red-500" aria-hidden="true" />
                              {product.likes ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <BookmarkIcon className="size-3 text-stone-500" aria-hidden="true" />
                              {product.saves ?? 0}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <CommentIcon className="size-3 text-stone-500" aria-hidden="true" />
                              {product.comments ?? 0}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-4">
                        <div className="mb-1.5 flex items-center gap-2.5">
                          <ProjectMark
                            name={product.name}
                            favicon={product.favicon}
                            size={24}
                            className="h-6 w-6 shrink-0 rounded-md"
                            imageClassName="object-contain bg-white shadow-sm"
                            fallbackClassName="bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold"
                          />
                          <h4 className="truncate text-lg font-bold text-stone-900">
                            {product.name}
                          </h4>
                          {product.verified && (
                            <VerifiedMark locale={locale} className="size-4 shrink-0" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-[13px] leading-relaxed text-stone-600">
                          {product.description || product.feature}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {showBrief && (
                    <Link
                      href={briefHref('', conceptCategories[activeTab.id]?.[0])}
                      className="group rounded-3xl p-6 flex flex-col h-60 sm:h-64 bg-white/80 shadow-sm transition-all hover:bg-white hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
                    >
                      <span
                        className="text-[10px] font-bold tracking-widest uppercase mb-auto"
                        style={{ color: activeTab.color.solid }}
                      >
                        {dict.features.tabs[activeTab.id]}
                      </span>
                      <span className="text-lg font-medium text-stone-900 leading-tight">
                        {explorerDict.briefCardTitle}
                      </span>
                      <span className="mt-2 text-[13px] leading-relaxed text-stone-600 line-clamp-3">
                        {(categoryProducts.length === 0
                          ? explorerDict.briefCardEmpty
                          : explorerDict.briefCardFew
                        ).replace('{category}', dict.features.tabs[activeTab.id])}
                      </span>
                    </Link>
                  )}
                  {Array.from({ length: availableSlots }, (_, index) => {
                    const slot = categoryProducts.length + (showBrief ? 1 : 0) + index + 1;
                    return (
                      <Link
                        key={`empty-${slot}`}
                        href="/account/solutions/new"
                        aria-label={explorerDict.applySpaceLabel
                          .replace('{category}', dict.features.tabs[activeTab.id])
                          .replace('{slot}', String(slot))}
                        className="rounded-3xl p-6 flex flex-col h-60 sm:h-64 bg-white/60 border border-dashed border-stone-300 backdrop-blur-md transition-all hover:bg-white hover:shadow-sm group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
                      >
                        <div className="flex justify-between text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-auto">
                          <span>{explorerDict.availableSpace}</span>
                          <span>{String(slot).padStart(2, '0')}</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-stone-600 mb-4 leading-tight group-hover:text-stone-900 transition-colors">
                            {explorerDict.applySpaceTitle}
                          </h4>
                          <div
                            className="text-[11px] font-bold flex items-center gap-1.5 transition-colors opacity-80 group-hover:opacity-100 uppercase tracking-wide"
                            style={{ color: activeTab.color.solid }}
                          >
                            {explorerDict.applySpaceBtn} {dict.features.tabs[activeTab.id]}{' '}
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
