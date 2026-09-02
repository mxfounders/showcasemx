import Link from 'next/link';
import { ArrowRight } from 'lucide-react';



export function ProjectStory({ dict }: { dict?: any }) {
  return (
    <article className="overflow-hidden pb-24 sm:pb-32">

      {/* ── PRIMERA PANTALLA: hero + tarjetas ─────────────────── */}
      <div className="flex min-h-dvh flex-col justify-between px-5 sm:px-10 lg:px-16">

        {/* Hero */}
        {/* eslint-disable-next-line react/no-danger */}
        <div className="mx-auto w-full max-w-[1500px] pt-20 sm:pt-28 lg:pt-32">
          <div className="grid gap-8 border-b border-stone-200 pb-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-10">

            <div>
              <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl" dangerouslySetInnerHTML={{ __html: dict?.heroLine1 || "Encontrar es fácil<br />Elegir bien cambia todo" }} />
            </div>

            <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
              <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
                {dict?.heroDesc || "shwcs presenta software, agencias y servicios con el contexto que una empresa necesita para entenderlos, compararlos y comenzar una conversación útil."}
              </p>
              <Link href="/#catalogo" className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]">
                {dict?.exploreBtn || "Explorar proyectos"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
              </Link>
            </div>

          </div>
        </div>

        {/* Tarjetas */}
        <div className="mx-auto w-full max-w-[1500px] pb-12 sm:pb-16 lg:pb-20">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="group flex flex-col rounded-[24px] bg-[#E4EBFC] p-7 text-[#264DAE] sm:p-10">
              <h2 className="text-3xl font-semibold leading-[0.97] tracking-[-0.05em] sm:text-4xl">
                {dict?.card1Title || "Entiende antes de contactar"}
              </h2>
              <p className="mt-4 text-sm leading-relaxed opacity-70">
                {dict?.card1Desc || "Explora por necesidad, guarda opciones, crea listas y compara el contexto de cada proyecto antes de abrir una conversación."}
              </p>
              <Link href="/#catalogo" className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                {dict?.card1Btn || "Descubrir proyectos"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
              </Link>
            </section>

            <section className="group flex flex-col rounded-[24px] bg-[#F4E4DA] p-7 text-[#A94E35] sm:p-10">
              <h2 className="text-3xl font-semibold leading-[0.97] tracking-[-0.05em] sm:text-4xl">
                {dict?.card2Title || "Presenta algo que se entienda"}
              </h2>
              <p className="mt-4 text-sm leading-relaxed opacity-70">
                {dict?.card2Desc || "Explica el problema, el alcance y las personas detrás. Mantén la información al día y responde con contexto a quien quiere conocerte."}
              </p>
              <Link href="/aplicar" className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                {dict?.card2Btn || "Postular un proyecto"}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
              </Link>
            </section>
          </div>
        </div>

      </div>


      {/* ── PROBLEMA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.65fr_1.35fr] lg:gap-20 lg:items-start">

          <h2 className="text-4xl font-semibold leading-[0.97] tracking-[-0.055em] sm:text-5xl">
            {dict?.problemTitle || "Más opciones no siempre significan mejores decisiones."}
          </h2>

          <p className="text-xl leading-relaxed tracking-[-0.02em] text-stone-500 lg:pt-2">
            {dict?.problemDesc || "Construimos shwcs para ordenar esa búsqueda alrededor de preguntas concretas: qué resuelve, para quién funciona, qué límites tiene y quién está detrás. El catálogo es el punto de partida; la decisión sigue siendo tuya."}
          </p>

        </div>
      </section>




    </article>
  );
}
