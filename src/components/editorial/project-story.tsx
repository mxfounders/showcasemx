import Link from 'next/link';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { actionButtonStyle } from '@/lib/brand-colors';

const principles = [
  { number: '01', title: 'Empieza por el problema', text: 'La búsqueda tiene más sentido cuando primero entiendes qué quieres cambiar, para quién y con qué resultado.' },
  { number: '02', title: 'Pide contexto', text: 'Una categoría no basta. Alcance, límites, evidencia y personas detrás ayudan a distinguir una opción útil de una promesa atractiva.' },
  { number: '03', title: 'Conecta con criterio', text: 'Guardar, comparar y conversar debe acercarte a una decisión mejor, no convertir tu búsqueda en otra bandeja llena de ruido.' },
];

const signals = [
  ['Claridad', 'Qué resuelve, para quién y en qué escenario sí encaja.'],
  ['Evidencia', 'Casos, resultados y enlaces que ayudan a comprobar lo declarado.'],
  ['Honestidad', 'Límites visibles y contexto suficiente para decidir sin falsas certezas.'],
] as const;

export function ProjectStory() {
  return <article className="overflow-hidden pb-24 sm:pb-32">
    <section className="mx-auto max-w-[1500px] px-5 pt-8 sm:px-10 sm:pt-14 lg:px-16">
      <div className="grid min-h-[610px] overflow-hidden rounded-[30px] bg-[#365DC4] text-white lg:grid-cols-[1.25fr_0.75fr] lg:rounded-[40px]">
        <div className="flex flex-col justify-between px-7 py-9 sm:px-12 sm:py-12 lg:px-16 lg:py-16">
          <div className="flex items-center justify-between gap-5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/60"><span>El Proyecto</span><span>shwcs · México</span></div>
          <div className="my-20 max-w-4xl lg:my-24">
            <h1 className="text-balance text-[clamp(3.15rem,5.6vw,6rem)] font-semibold leading-[0.9] tracking-[-0.07em]">Encontrar es fácil.<br/>Elegir bien cambia todo.</h1>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/68 sm:text-xl">shwcs presenta software, agencias y servicios con el contexto que una empresa necesita para entenderlos, compararlos y comenzar una conversación útil.</p>
          </div>
          <Link href="/#catalogo" className="group flex w-fit items-center gap-3 text-sm font-medium text-white">Explorar proyectos <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#365DC4]"><ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" /></span></Link>
        </div>
        <div className="relative hidden border-l border-white/15 lg:block">
          <div className="absolute inset-x-10 top-10 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45"><span>Una selección con contexto</span><span>01—03</span></div>
          <div className="absolute inset-x-10 bottom-10 space-y-3">
            {principles.map((principle, index) => <div key={principle.number} className={`flex items-center justify-between rounded-2xl border px-5 py-4 transition-transform ${index === 0 ? 'border-white/80 bg-white text-[#365DC4]' : 'border-white/20 text-white/72'}`}><span className="text-sm font-medium">{principle.title}</span><span className="text-xs tabular-nums opacity-60">{principle.number}</span></div>)}
          </div>
          <div className="absolute left-1/2 top-1/2 flex size-40 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20"><div className="flex size-24 items-center justify-center rounded-full border border-white/30"><Search className="size-9 text-white/85" strokeWidth={1.4} aria-hidden="true" /></div></div>
        </div>
      </div>
    </section>

    <section className="mx-auto grid max-w-[1500px] gap-10 px-5 py-24 sm:px-10 lg:grid-cols-[0.72fr_1.28fr] lg:px-16 lg:py-32">
      <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-[#365DC4]">Por qué existe</p><h2 className="mt-5 max-w-md text-4xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-5xl">Más opciones no siempre significan mejores decisiones.</h2></div>
      <div className="max-w-3xl lg:pt-10"><p className="text-2xl leading-[1.35] tracking-[-0.025em] text-stone-700 sm:text-3xl">Cuando todo se presenta como “la solución”, elegir se vuelve una mezcla de pestañas abiertas, demos genéricas y promesas difíciles de comparar.</p><p className="mt-8 max-w-2xl text-base leading-relaxed text-stone-500 sm:text-lg">Construimos shwcs para ordenar esa búsqueda alrededor de preguntas concretas: qué resuelve, para quién funciona, qué límites tiene y quién está detrás. El catálogo es el punto de partida; la decisión sigue siendo tuya.</p></div>
    </section>

    <section className="border-y border-stone-200 bg-[#F6F5F2]">
      <div className="mx-auto max-w-[1500px] px-5 py-20 sm:px-10 lg:px-16 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Nuestro método</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Tres movimientos. Menos ruido.</h2></div><span className="text-sm text-stone-400">Del problema a una conversación útil.</span></div>
        <div className="mt-14 grid border-t border-stone-300 lg:grid-cols-3">{principles.map((item, index) => <section key={item.number} className={`py-8 lg:min-h-[340px] lg:px-8 lg:py-10 ${index ? 'border-t border-stone-300 lg:border-l lg:border-t-0' : ''}`}><span className="text-xs tabular-nums text-[#365DC4]">{item.number}</span><h3 className="mt-20 text-2xl font-semibold tracking-[-0.035em]">{item.title}</h3><p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-500">{item.text}</p></section>)}</div>
      </div>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 py-24 sm:px-10 lg:px-16 lg:py-32">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="flex min-h-[460px] flex-col rounded-[30px] bg-[#E4EBFC] p-7 text-[#264DAE] sm:p-11"><span className="flex size-11 items-center justify-center rounded-full bg-white/70"><Search className="size-5" aria-hidden="true" /></span><div className="mt-auto"><p className="text-xs font-medium uppercase tracking-[0.18em] opacity-65">Para quien busca</p><h2 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-5xl">Entiende antes de contactar.</h2><p className="mt-6 max-w-lg leading-relaxed opacity-75">Explora por necesidad, guarda opciones, crea listas y compara el contexto de cada proyecto antes de abrir una conversación.</p><Link href="/#catalogo" className="mt-8 inline-flex items-center gap-2 text-sm font-medium">Descubrir proyectos <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section>
        <section className="flex min-h-[460px] flex-col rounded-[30px] bg-[#F4E4DA] p-7 text-[#A94E35] sm:p-11"><span className="flex size-11 items-center justify-center rounded-full bg-white/70"><Sparkles className="size-5" aria-hidden="true" /></span><div className="mt-auto"><p className="text-xs font-medium uppercase tracking-[0.18em] opacity-65">Para quien construye</p><h2 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-5xl">Presenta algo que se entienda.</h2><p className="mt-6 max-w-lg leading-relaxed opacity-75">Explica el problema, el alcance y las personas detrás. Mantén la información al día y responde con contexto a quien quiere conocerte.</p><Link href="/aplicar" className="mt-8 inline-flex items-center gap-2 text-sm font-medium">Postular un proyecto <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section>
      </div>
    </section>

    <section className="mx-auto grid max-w-[1500px] gap-12 px-5 pb-24 sm:px-10 lg:grid-cols-[0.75fr_1.25fr] lg:px-16 lg:pb-32">
      <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">Qué cuidamos</p><h2 className="mt-4 text-4xl font-semibold leading-none tracking-[-0.05em]">Contexto visible.<br/>Certeza sin inventar.</h2></div>
      <div className="divide-y divide-stone-200 border-y border-stone-200">{signals.map(([title, text], index) => <div key={title} className="grid gap-4 py-7 sm:grid-cols-[48px_150px_1fr] sm:items-start"><span className="text-xs tabular-nums text-stone-400">0{index + 1}</span><h3 className="font-medium">{title}</h3><p className="max-w-xl text-sm leading-relaxed text-stone-500">{text}</p></div>)}</div>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 sm:px-10 lg:px-16"><div className="flex flex-col items-start justify-between gap-8 rounded-[30px] bg-stone-900 px-7 py-10 text-white sm:px-11 sm:py-12 lg:flex-row lg:items-end"><div><p className="text-xs uppercase tracking-[0.18em] text-white/45">El siguiente paso</p><h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl">Ve qué merece una segunda mirada.</h2></div><Link href="/#catalogo" style={actionButtonStyle} className="action-button inline-flex shrink-0 items-center gap-3 rounded-full px-6 py-3.5 text-sm font-medium">Explorar shwcs <ArrowRight className="size-4" aria-hidden="true" /></Link></div></section>
  </article>;
}
