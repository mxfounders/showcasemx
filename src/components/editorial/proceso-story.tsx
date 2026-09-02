'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StepsAccordion } from '@/components/ui/steps-accordion';

export function ProcesoStory() {
  return (
    <article className="overflow-hidden pb-24 sm:pb-32">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            De idea a<br />publicación
          </h1>
          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
              Conoce cómo funciona el flujo desde que creas una cuenta hasta que tu proyecto está disponible para recibir solicitudes.
            </p>
            <Link href="/aplicar" className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]">
              Postular un proyecto
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── STEPS ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <StepsAccordion />
      </section>
    </article>
  );
}
