import Link from 'next/link';
import { ArrowRight, Bell, BookOpen, ChartNoAxesCombined, Layers3, ShieldCheck } from 'lucide-react';

const releases = [
  {
    date: '1 de septiembre de 2026',
    label: 'Ahora',
    title: 'shwcs ya tiene una voz y un lugar propios.',
    summary: 'La experiencia pública ahora reúne una identidad más clara, páginas editoriales y mejores caminos para descubrir qué estamos construyendo.',
    items: ['Nueva identidad visual en navegación, cuenta y páginas públicas.', 'Blog editorial con búsqueda, categorías y lectura optimizada.', 'Contacto guiado que adapta las preguntas al motivo de cada conversación.'],
    accent: '#365DC4', icon: BookOpen,
  },
  {
    date: '31 de agosto de 2026',
    label: 'Comunidad',
    title: 'Las listas dejaron de ser solo carpetas privadas.',
    summary: 'Ahora una selección puede organizar una compra, compartirse con otras personas y convertirse en un punto de conversación.',
    items: ['Listas privadas y públicas con categorías.', 'Exploración por popularidad o fecha.', 'Me gusta, guardados y comentarios en listas públicas.'],
    accent: '#7753A5', icon: Layers3,
  },
  {
    date: '31 de agosto de 2026',
    label: 'Operación',
    title: 'Más señales para quienes presentan un proyecto.',
    summary: 'El panel concentra el estado de las fichas, las conversaciones y la actividad que ayuda a entender qué despierta interés.',
    items: ['Métricas de vistas y clics con actividad por día.', 'Centro de notificaciones dentro de la cuenta.', 'Seguimiento de oportunidades y solicitudes de contacto.'],
    accent: '#416B50', icon: ChartNoAxesCombined,
  },
  {
    date: '30 de agosto de 2026',
    label: 'Base',
    title: 'Una cuenta para descubrir y para construir.',
    summary: 'El acceso, los guardados y la publicación de proyectos comparten una misma cuenta, con controles claros para cada espacio.',
    items: ['Acceso seguro y recuperación de cuenta.', 'Guardados, notas privadas y comparación de proyectos.', 'Borradores, revisión editorial y control verificado de dominio.'],
    accent: '#B15C3F', icon: ShieldCheck,
  },
] as const;

export function ChangelogStory() {
  return <article className="pb-24 sm:pb-32">
    <header className="mx-auto max-w-[1500px] px-5 pt-12 sm:px-10 sm:pt-16 lg:px-16">
      <div className="grid gap-10 border-b border-stone-200 pb-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:pb-16">
        <div><h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">Lo nuevo en shwcs.</h1></div>
        <div className="max-w-md lg:justify-self-end"><p className="text-xl leading-relaxed tracking-[-0.02em] text-stone-600">Un registro de los cambios que ya puedes usar en shwcs.</p><p className="mt-5 text-sm leading-relaxed text-stone-400">Publicamos funciones cuando están disponibles. Las ideas que siguen en desarrollo se quedan fuera hasta convertirse en algo real.</p><Link href="/contacto" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#365DC4]">Cuéntanos qué mejorarías <ArrowRight className="size-4" aria-hidden="true" /></Link></div>
      </div>
    </header>

    <section className="mx-auto grid max-w-[1500px] gap-12 px-5 pt-16 sm:px-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-16 lg:pt-24">
      <aside className="h-fit lg:sticky lg:top-28"><div className="rounded-[24px] bg-[#E4EBFC] p-6 text-[#365DC4]"><span className="flex size-10 items-center justify-center rounded-full bg-white/65"><Bell className="size-4" aria-hidden="true" /></span><p className="mt-12 text-xs font-medium uppercase tracking-[0.16em] opacity-60">Estado actual</p><p className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.035em]">Construyendo en público.</p><p className="mt-4 text-sm leading-relaxed opacity-70">El catálogo, las listas y el panel ya comparten una misma base. Seguimos afinando la experiencia con cada conversación.</p></div><nav aria-label="Atajos del changelog" className="mt-6 hidden border-t border-stone-200 pt-5 text-sm text-stone-500 lg:block"><a href="#septiembre" className="block rounded-lg px-2 py-2 hover:bg-stone-100 hover:text-stone-900">Septiembre de 2026</a><a href="#agosto" className="block rounded-lg px-2 py-2 hover:bg-stone-100 hover:text-stone-900">Agosto de 2026</a></nav></aside>

      <div>
        <div id="septiembre" className="scroll-mt-28"><div className="flex items-center justify-between border-b border-stone-200 pb-4"><h2 className="text-sm font-medium">Septiembre de 2026</h2><span className="text-xs text-stone-400">1 actualización</span></div><Release release={releases[0]} featured /></div>
        <div id="agosto" className="mt-20 scroll-mt-28"><div className="flex items-center justify-between border-b border-stone-200 pb-4"><h2 className="text-sm font-medium">Agosto de 2026</h2><span className="text-xs text-stone-400">3 actualizaciones</span></div><div className="divide-y divide-stone-200">{releases.slice(1).map(release => <Release key={release.title} release={release} />)}</div></div>
      </div>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 pt-20 sm:px-10 lg:px-16 lg:pt-24"><div className="flex flex-col items-start justify-between gap-6 border-t border-stone-200 py-8 sm:flex-row sm:items-center"><div><h2 className="text-xl font-medium tracking-[-0.025em]">¿Algo debería funcionar mejor?</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">Cuéntanos qué te estorba, qué falta o qué esperabas encontrar.</p></div><Link href="/contacto" className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#365DC4]">Abrir una conversación <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" /></Link></div></section>
  </article>;
}

type ReleaseData = (typeof releases)[number];
function Release({ release, featured = false }: { release: ReleaseData; featured?: boolean }) {
  const Icon = release.icon;
  return <section className={`grid gap-7 py-9 sm:grid-cols-[150px_minmax(0,1fr)] ${featured ? 'sm:py-12' : ''}`}>
    <div><time className="text-xs leading-relaxed text-stone-400">{release.date}</time><span className="mt-3 block w-fit rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.13em]" style={{ backgroundColor: `${release.accent}18`, color: release.accent }}>{release.label}</span></div>
    <div><span className="flex size-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${release.accent}18`, color: release.accent }}><Icon className="size-5" aria-hidden="true" /></span><h3 className={`mt-7 max-w-3xl font-semibold leading-[1.02] tracking-[-0.045em] ${featured ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}>{release.title}</h3><p className="mt-5 max-w-2xl leading-relaxed text-stone-500">{release.summary}</p><ul className="mt-7 grid gap-3">{release.items.map(item => <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-stone-600"><span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ backgroundColor: release.accent }}/>{item}</li>)}</ul></div>
  </section>;
}
