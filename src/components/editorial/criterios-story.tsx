'use client';

import Link from '@/i18n/navigation';
import {
  ArrowRight,
  TextSelect,
  Cpu,
  LayoutTemplate,
  CircleDollarSign,
  Fingerprint,
  LineChart,
  ShieldCheck,
  Scale,
  MessageCircle,
  Bookmark,
  Heart,
  Eye,
  Star,
  type LucideIcon,
} from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionary';

type WeightId = keyof Dictionary['criteria']['weights'];
type CriterionId = keyof Dictionary['criteria']['items'];

const rankingWeights: readonly { id: WeightId; Icon: LucideIcon; weight: string }[] = [
  { id: 'review', Icon: Star, weight: '★ × 1–1.5' },
  { id: 'comment', Icon: MessageCircle, weight: '× 3' },
  { id: 'save', Icon: Bookmark, weight: '× 2' },
  { id: 'like', Icon: Heart, weight: '× 1' },
  { id: 'view', Icon: Eye, weight: '× 0.1' },
];

const criterios: readonly {
  id: CriterionId;
  number: string;
  color: string;
  text: string;
  icon: LucideIcon;
  span: string;
  titleSize: string;
}[] = [
  {
    id: 'clarity',
    number: '01',
    color: '#E4EBFC',
    text: '#264DAE',
    icon: TextSelect,
    span: 'md:col-span-8',
    titleSize: 'sm:text-4xl',
  },
  {
    id: 'architecture',
    number: '02',
    color: '#E4EDE2',
    text: '#416B50',
    icon: Cpu,
    span: 'md:col-span-4 md:row-span-2',
    titleSize: 'sm:text-3xl',
  },
  {
    id: 'design',
    number: '03',
    color: '#EEE5F5',
    text: '#5E3A8A',
    icon: LayoutTemplate,
    span: 'md:col-span-4',
    titleSize: 'sm:text-3xl',
  },
  {
    id: 'businessModel',
    number: '04',
    color: '#F4ECD5',
    text: '#88631B',
    icon: CircleDollarSign,
    span: 'md:col-span-4',
    titleSize: 'sm:text-3xl',
  },
  {
    id: 'domain',
    number: '05',
    color: '#F4E4DA',
    text: '#A94E35',
    icon: Fingerprint,
    span: 'md:col-span-4',
    titleSize: 'sm:text-3xl',
  },
  {
    id: 'evidence',
    number: '06',
    color: '#E4EBFC',
    text: '#264DAE',
    icon: LineChart,
    span: 'md:col-span-8',
    titleSize: 'sm:text-4xl',
  },
  {
    id: 'security',
    number: '07',
    color: '#E4EDE2',
    text: '#416B50',
    icon: ShieldCheck,
    span: 'md:col-span-6',
    titleSize: 'sm:text-3xl',
  },
  {
    id: 'ethics',
    number: '08',
    color: '#EEE5F5',
    text: '#5E3A8A',
    icon: Scale,
    span: 'md:col-span-6',
    titleSize: 'sm:text-3xl',
  },
];

export function CriteriosStory({ dict }: { dict: Dictionary['criteria'] }) {
  return (
    <article className="pb-24 sm:pb-32">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            {dict.titleLine1}
            <br />
            {dict.titleLine2}
          </h1>
          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">{dict.desc}</p>
            <Link
              href="/proceso"
              className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]"
            >
              {dict.link}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CRITERIOS BENTO ──────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid grid-flow-row-dense gap-6 md:grid-cols-12">
          {criterios.map(crit => {
            const Icon = crit.icon;
            const copy = dict.items[crit.id];
            return (
              <div
                key={crit.id}
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] p-8 sm:p-10 lg:p-12 transition-all hover:shadow-md ${crit.span}`}
                style={{ backgroundColor: crit.color, color: crit.text }}
              >
                <div className="mb-12 flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
                    {dict.criterionPrefix} {crit.number}
                  </span>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/30 backdrop-blur-md transition-transform group-hover:scale-110">
                    <Icon className="size-5" />
                  </div>
                </div>

                <div>
                  <h2
                    className={`mb-5 text-3xl font-semibold tracking-[-0.03em] ${crit.titleSize}`}
                  >
                    {copy.title}
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
                    {copy.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── ORDEN DEL CATÁLOGO ───────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-16 sm:px-10 lg:px-16 lg:pt-24">
        <div className="grid gap-8 border-t border-stone-200 pt-10 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pt-14">
          <div>
            <h2 className="max-w-lg text-4xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-5xl">
              {dict.orderTitle}
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-stone-600 sm:text-lg">
              {dict.orderDesc}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {rankingWeights.map(({ id, Icon, weight }) => (
              <div key={id} className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <Icon className="size-5 text-stone-500" aria-hidden="true" />
                  <span className="text-sm font-semibold text-stone-400">{weight}</span>
                </div>
                <p className="text-sm font-medium text-stone-800">{dict.weights[id].label}</p>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">
                  {dict.weights[id].desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </article>
  );
}
