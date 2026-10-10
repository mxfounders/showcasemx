'use client';

import Link from '@/i18n/navigation';
import { ArrowRight, Plus } from 'lucide-react';
import { useState } from 'react';
import type { Dictionary } from '@/i18n/dictionary';

type FaqGroupId = keyof Dictionary['faq']['groups'];

const groupStyles: readonly { id: FaqGroupId; color: string; text: string }[] = [
  { id: 'account', color: '#E4EBFC', text: '#264DAE' },
  { id: 'contact', color: '#F4E4DA', text: '#A94E35' },
  { id: 'publishing', color: '#EEE5F5', text: '#5E3A8A' },
  { id: 'review', color: '#E4EDE2', text: '#416B50' },
];

function Item({
  q,
  a,
  isOpen,
  onToggle,
}: {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-black/5 last:border-0">
      <button
        onClick={onToggle}
        className="group flex w-full items-start justify-between gap-6 py-6 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-medium leading-snug tracking-[-0.02em] transition-opacity duration-200 group-hover:opacity-75">
          {q}
        </span>
        <span
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 group-hover:scale-110 group-active:scale-95 ${
            isOpen
              ? 'border-black/20 bg-black/10 rotate-45'
              : 'border-black/10 bg-transparent rotate-0 group-hover:bg-black/5'
          }`}
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </span>
      </button>
      <div
        className="overflow-hidden text-black/60 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
        style={{
          maxHeight: isOpen ? '400px' : '0px',
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0)' : 'translateY(-12px)',
        }}
      >
        <p className="pb-6 text-base leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export function FaqStory({ dict }: { dict: Dictionary['faq'] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <article className="overflow-hidden pb-24 sm:pb-32">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          <h1
            className="text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl"
            dangerouslySetInnerHTML={{ __html: dict.title }}
          />

          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
              {dict.intro}
            </p>
            <Link
              href="/el-proyecto"
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

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {groupStyles.map(({ id, color, text }) => {
            const group = dict.groups[id];
            return (
              <div
                key={id}
                className="rounded-[24px] px-8 py-8 sm:px-10 sm:py-10"
                style={{ backgroundColor: color, color: text }}
              >
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] opacity-80">
                  {group.title}
                </p>
                <div>
                  {group.items.map(item => (
                    <Item
                      key={item.question}
                      q={item.question}
                      a={item.answer}
                      isOpen={activeId === item.question}
                      onToggle={() =>
                        setActiveId(activeId === item.question ? null : item.question)
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}
