'use client';

import { useState } from 'react';
import Link from '@/i18n/navigation';
import {
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Layers3,
  ShieldCheck,
  Tags,
  Search,
  MessageCircle,
  GalleryHorizontal,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Dictionary } from '@/i18n/dictionary';

type ChangelogDict = Dictionary['changelog'];
type ReleaseId = keyof ChangelogDict['releases'];
type CategoryId = keyof ChangelogDict['categories'];
type ReleaseCategory = Exclude<CategoryId, 'all'>;
type ReleaseMonth = keyof ChangelogDict['months'];

type Release = {
  id: ReleaseId;
  month: ReleaseMonth;
  category: ReleaseCategory;
  accent: string;
  icon: LucideIcon;
};

const releases: readonly Release[] = [
  { id: 'capabilities', month: 'september', category: 'product', accent: '#88631B', icon: Tags },
  { id: 'conceptSearch', month: 'september', category: 'product', accent: '#365DC4', icon: Search },
  {
    id: 'listingSocial',
    month: 'september',
    category: 'community',
    accent: '#7753A5',
    icon: MessageCircle,
  },
  {
    id: 'listingCover',
    month: 'september',
    category: 'product',
    accent: '#B15C3F',
    icon: GalleryHorizontal,
  },
  { id: 'welcome', month: 'september', category: 'account', accent: '#416B50', icon: UserRound },
  { id: 'identity', month: 'september', category: 'product', accent: '#365DC4', icon: BookOpen },
  { id: 'publicLists', month: 'august', category: 'community', accent: '#7753A5', icon: Layers3 },
  {
    id: 'founderSignals',
    month: 'august',
    category: 'panel',
    accent: '#416B50',
    icon: ChartNoAxesCombined,
  },
  { id: 'oneAccount', month: 'august', category: 'account', accent: '#B15C3F', icon: ShieldCheck },
];

const releaseCategories: readonly CategoryId[] = [
  'all',
  'product',
  'community',
  'panel',
  'account',
];

export function ChangelogStory({ dict }: { dict: ChangelogDict }) {
  const [category, setCategory] = useState<CategoryId>('all');

  const visibleReleases =
    category === 'all' ? releases : releases.filter(release => release.category === category);
  const septemberReleases = visibleReleases.filter(release => release.month === 'september');
  const augustReleases = visibleReleases.filter(release => release.month === 'august');

  return (
    <article className="pb-24 sm:pb-32">
      <header className="mx-auto max-w-[1500px] px-5 pt-12 sm:px-10 sm:pt-16 lg:px-16">
        <div className="grid gap-10 border-b border-stone-200 pb-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:pb-16">
          <h1 className="text-5xl font-semibold tracking-[-0.05em] sm:text-7xl lg:text-8xl">
            {dict.heroTitle}
          </h1>
          <div className="max-w-md lg:justify-self-end">
            <p className="text-xl leading-relaxed tracking-[-0.02em] text-stone-600">
              {dict.heroDesc1}
            </p>
            <p className="mt-5 text-sm leading-relaxed text-stone-400">{dict.heroDesc2}</p>
            <Link
              href="/contacto"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#365DC4] transition-colors hover:text-[#264DAE]"
            >
              {dict.feedbackBtn} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-12 px-5 pt-16 sm:px-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20 lg:px-16 lg:pt-24">
        {/* SIDEBAR FILTERS WITH MAGNETIC EFFECT */}
        <aside className="h-fit lg:sticky lg:top-28">
          <p className="border-b border-stone-200 pb-4 text-sm font-medium">{dict.filterTitle}</p>
          <p className="mt-5 text-xs uppercase tracking-[0.16em] text-stone-400">
            {dict.categoryLabel}
          </p>
          <nav
            aria-label={dict.filterAria}
            className="selector-tabs mt-3 lg:flex-col lg:items-stretch"
          >
            {releaseCategories.map(value => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
                className="selector-tab text-left lg:w-full"
              >
                {dict.categories[value]}
              </button>
            ))}
          </nav>
          <p role="status" className="mt-5 text-xs text-stone-400">
            {visibleReleases.length}{' '}
            {visibleReleases.length === 1 ? dict.releaseLabel : dict.releasesLabel}
          </p>
        </aside>

        {/* FLUID LAYOUT GRID */}
        <div>
          <AnimatePresence mode="popLayout">
            {septemberReleases.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.4 }}
                key="septiembre-group"
                id="septiembre"
                className="scroll-mt-28 mb-16"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <h2 className="text-sm font-medium">{dict.months.september}</h2>
                  <span className="text-xs text-stone-400">
                    {septemberReleases.length}{' '}
                    {septemberReleases.length === 1 ? dict.updateLabel : dict.updatesLabel}
                  </span>
                </div>
                <motion.div layout className="mt-8 grid gap-5">
                  <AnimatePresence mode="popLayout">
                    {septemberReleases.map(release => (
                      <ReleaseCard
                        key={release.id}
                        release={release}
                        copy={dict.releases[release.id]}
                        featured
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}

            {augustReleases.length > 0 && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.4 }}
                key="agosto-group"
                id="agosto"
                className="scroll-mt-28"
              >
                <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                  <h2 className="text-sm font-medium">{dict.months.august}</h2>
                  <span className="text-xs text-stone-400">
                    {augustReleases.length}{' '}
                    {augustReleases.length === 1 ? dict.updateLabel : dict.updatesLabel}
                  </span>
                </div>
                <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {augustReleases.map(release => (
                      <ReleaseCard
                        key={release.id}
                        release={release}
                        copy={dict.releases[release.id]}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-5 pt-20 sm:px-10 lg:px-16 lg:pt-24">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-stone-200 py-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-medium tracking-[-0.025em]">{dict.footerTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">
              {dict.footerDesc}
            </p>
          </div>
          <Link
            href="/contacto"
            className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#365DC4]"
          >
            {dict.footerBtn}{' '}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </article>
  );
}

function ReleaseCard({
  release,
  copy,
  featured = false,
}: {
  release: Release;
  copy: ChangelogDict['releases'][ReleaseId];
  featured?: boolean;
}) {
  const Icon = release.icon;
  return (
    <motion.section
      layout
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(8px)' }}
      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      className={`flex flex-col overflow-hidden rounded-[28px] p-7 sm:p-10 ${
        featured ? 'min-h-[420px]' : 'min-h-[320px]'
      }`}
      style={{ backgroundColor: `${release.accent}12` }}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className="flex size-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: `${release.accent}22`,
            color: release.accent,
          }}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex items-center gap-3">
          <span
            className="rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.13em]"
            style={{ backgroundColor: `${release.accent}20`, color: release.accent }}
          >
            {copy.label}
          </span>
          <time className="text-xs text-stone-400">{copy.date}</time>
        </div>
      </div>

      <div className="mt-auto pt-12">
        <h3
          className={`font-semibold leading-[1.02] tracking-[-0.045em] ${
            featured ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {copy.title}
        </h3>
        <p className="mt-4 leading-relaxed text-stone-500">{copy.summary}</p>
        <ul className="mt-6 grid gap-2.5">
          {copy.items.map(item => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm leading-relaxed text-stone-600"
            >
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: release.accent }}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}
