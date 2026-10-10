'use client';

import Link from '@/i18n/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck, PenTool, type LucideIcon } from 'lucide-react';
import type { Dictionary } from '@/i18n/dictionary';

type StepId = keyof Dictionary['apply']['steps'];

const steps: readonly { id: StepId; icon: LucideIcon; color: string; text: string }[] = [
  { id: 'draft', icon: PenTool, color: '#E4EBFC', text: '#264DAE' },
  { id: 'domain', icon: ShieldCheck, color: '#E4EDE2', text: '#416B50' },
  { id: 'review', icon: CheckCircle2, color: '#F4E4DA', text: '#A94E35' },
];

export function AplicarStory({ dict }: { dict: Dictionary['apply'] }) {
  return (
    <article className="pb-24 sm:pb-32">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            {dict.title}
          </h1>
          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">{dict.desc}</p>
            <Link
              href="/criterios"
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

      {/* ── EL PROCESO ───────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map(step => {
            const Icon = step.icon;
            const copy = dict.steps[step.id];
            return (
              <div
                key={step.id}
                className="flex flex-col rounded-[24px] p-8 sm:p-10"
                style={{ backgroundColor: step.color, color: step.text }}
              >
                <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-white/40 shadow-sm">
                  <Icon className="size-7" />
                </div>
                <h2 className="mb-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {copy.title}
                </h2>
                <p className="text-base leading-relaxed opacity-80 sm:text-lg">{copy.desc}</p>
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}
