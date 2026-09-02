'use client';

import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, PenTool } from 'lucide-react';

const steps = [
  {
    icon: PenTool,
    title: '1. Redacta con claridad',
    desc: 'Empieza con un borrador en tu cuenta. Necesitarás explicar el problema central que resuelve tu proyecto, definir a tu cliente ideal y agregar capturas de pantalla reales o demos. Evita el lenguaje de marketing vacío; busca la claridad técnica.',
    color: '#E4EBFC',
    text: '#264DAE',
  },
  {
    icon: ShieldCheck,
    title: '2. Verificación de dominio',
    desc: 'Exigimos que confirmes ser el propietario o representante autorizado del proyecto. Durante el registro, validaremos tu identidad corporativa vinculando el dominio oficial de la empresa a tu cuenta de fundador en shwcs.',
    color: '#E4EDE2',
    text: '#416B50',
  },
  {
    icon: CheckCircle2,
    title: '3. Revisión editorial',
    desc: 'Nuestro equipo evaluará que la ficha cumpla con los estándares de información. Si falta contexto, te pediremos ajustes específicos. Una vez aprobada, tu ficha se publicará en el catálogo y tendrás acceso al panel de métricas.',
    color: '#F4E4DA',
    text: '#A94E35',
  }
];

export function AplicarStory() {
  return (
    <article className="pb-24 sm:pb-32">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Postula tu proyecto
          </h1>
          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
              shwcs es un directorio curado B2B. Te explicamos exactamente qué necesitas para entrar y cómo funciona nuestro proceso de revisión.
            </p>
            <Link href="/criterios" className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]">
              Ver los criterios de entrada
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── EL PROCESO ───────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex flex-col rounded-[24px] p-8 sm:p-10"
                style={{ backgroundColor: step.color, color: step.text }}
              >
                <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-white/40 shadow-sm">
                  <Icon className="size-7" />
                </div>
                <h2 className="mb-4 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                  {step.title}
                </h2>
                <p className="text-base leading-relaxed opacity-80 sm:text-lg">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA GIGANTE ──────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-16 sm:px-10 lg:px-16 lg:pt-24">
        <div className="flex flex-col items-center justify-center rounded-[32px] bg-stone-900 px-6 py-20 text-center text-white sm:px-10 sm:py-32">
          <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            Empieza tu borrador ahora
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-stone-400 sm:text-xl">
            Crea tu cuenta corporativa, diseña tu ficha sin presiones y envíala a revisión cuando estés listo para destacar.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/account/solutions/new"
              className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-stone-900 transition-transform hover:scale-105 active:scale-95"
            >
              Crear cuenta y postular
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
