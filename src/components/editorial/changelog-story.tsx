'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChartNoAxesCombined, Layers3, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const releases = [
  {
    date: '1 de septiembre de 2026',
    label: 'Ahora',
    category: 'Producto',
    title: 'shwcs ya tiene una voz y un lugar propios',
    summary: 'La experiencia pública ahora reúne una identidad más clara, páginas editoriales y mejores caminos para descubrir qué estamos construyendo.',
    items: ['Nueva identidad visual en navegación, cuenta y páginas públicas.', 'Blog editorial con búsqueda, categorías y lectura optimizada.', 'Contacto guiado que adapta las preguntas al motivo de cada conversación.'],
    accent: '#365DC4', icon: BookOpen,
  },
  {
    date: '31 de agosto de 2026',
    label: 'Comunidad',
    category: 'Comunidad',
    title: 'Las listas dejaron de ser solo carpetas privadas',
    summary: 'Ahora una selección puede organizar una compra, compartirse con otras personas y convertirse en un punto de conversación.',
    items: ['Listas privadas y públicas con categorías.', 'Exploración por popularidad o fecha.', 'Me gusta, guardados y comentarios en listas públicas.'],
    accent: '#7753A5', icon: Layers3,
  },
  {
    date: '31 de agosto de 2026',
    label: 'Operación',
    category: 'Panel',
    title: 'Más señales para quienes presentan un proyecto',
    summary: 'El panel concentra el estado de las fichas, las conversaciones y la actividad que ayuda a entender qué despierta interés.',
    items: ['Métricas de vistas y clics con actividad por día.', 'Centro de notificaciones dentro de la cuenta.', 'Seguimiento de oportunidades y solicitudes de contacto.'],
    accent: '#416B50', icon: ChartNoAxesCombined,
  },
  {
    date: '30 de agosto de 2026',
    label: 'Base',
    category: 'Cuenta',
    title: 'Una cuenta para descubrir y para construir',
    summary: 'El acceso, los guardados y la publicación de proyectos comparten una misma cuenta, con controles claros para cada espacio.',
    items: ['Acceso seguro y recuperación de cuenta.', 'Guardados, notas privadas y comparación de proyectos.', 'Borradores, revisión editorial y control verificado de dominio.'],
    accent: '#B15C3F', icon: ShieldCheck,
  },
] as const;

const releaseCategories = ['Todos', 'Producto', 'Comunidad', 'Panel', 'Cuenta'] as const;
type ReleaseCategory = (typeof releaseCategories)[number];

export function ChangelogStory({ dict }: { dict?: any }) {
  const [category, setCategory] = useState<ReleaseCategory>('Todos');

  const visibleReleases = category === 'Todos' ? releases : releases.filter(release => release.category === category);
  const septemberReleases = visibleReleases.filter(release => release.date.includes('septiembre'));
  const augustReleases = visibleReleases.filter(release => release.date.includes('agosto'));

  return (
    <article className="pb-24 sm:pb-32">
      <header className="mx-auto max-w-[1500px] px-5 pt-12 sm:px-10 sm:pt-16 lg:px-16">
        <div className="grid gap-10 border-b border-stone-200 pb-14 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:pb-16">
          <div><h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">{dict?.heroTitle || "Lo nuevo en shwcs"}</h1></div>
          <div className="max-w-md lg:justify-self-end">
            <p className="text-xl leading-relaxed tracking-[-0.02em] text-stone-600">{dict?.heroDesc1 || "Un registro de los cambios que ya puedes usar en shwcs."}</p>
            <p className="mt-5 text-sm leading-relaxed text-stone-400">{dict?.heroDesc2 || "Publicamos funciones cuando están disponibles. Las ideas que siguen en desarrollo se quedan fuera hasta convertirse en algo real."}</p>
            <Link href="/contacto" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#365DC4] transition-colors hover:text-[#264DAE]">
              {dict?.feedbackBtn || "Cuéntanos qué mejorarías"} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1500px] gap-12 px-5 pt-16 sm:px-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-20 lg:px-16 lg:pt-24">
        
        {/* SIDEBAR FILTERS WITH MAGNETIC EFFECT */}
        <aside className="h-fit lg:sticky lg:top-28">
          <p className="border-b border-stone-200 pb-4 text-sm font-medium">{dict?.filterTitle || "Filtrar lanzamientos"}</p>
          <p className="mt-5 text-xs uppercase tracking-[0.16em] text-stone-400">{dict?.categoryLabel || "Categoría"}</p>
          <nav aria-label="Filtrar lanzamientos por categoría" className="selector-tabs mt-3 lg:flex-col lg:items-stretch">
            {releaseCategories.map(item => (
              <button 
                key={item} 
                type="button" 
                aria-pressed={category === item} 
                onClick={() => setCategory(item)} 
                className="selector-tab text-left lg:w-full"
              >
                {item}
              </button>
            ))}
          </nav>
          <p role="status" className="mt-5 text-xs text-stone-400">{visibleReleases.length} {visibleReleases.length === 1 ? (dict?.releaseLabel || 'lanzamiento') : (dict?.releasesLabel || 'lanzamientos')}</p>
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
                  <h2 className="text-sm font-medium">Septiembre de 2026</h2>
                  <span className="text-xs text-stone-400">{septemberReleases.length} {septemberReleases.length === 1 ? (dict?.updateLabel || 'actualización') : (dict?.updatesLabel || 'actualizaciones')}</span>
                </div>
                <motion.div layout className="mt-8 grid gap-5">
                  <AnimatePresence mode="popLayout">
                    {septemberReleases.map(release => (
                      <ReleaseCard key={release.title} release={release} featured />
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
                  <h2 className="text-sm font-medium">Agosto de 2026</h2>
                  <span className="text-xs text-stone-400">{augustReleases.length} {augustReleases.length === 1 ? (dict?.updateLabel || 'actualización') : (dict?.updatesLabel || 'actualizaciones')}</span>
                </div>
                <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {augustReleases.map(release => (
                      <ReleaseCard key={release.title} release={release} />
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
            <h2 className="text-xl font-medium tracking-[-0.025em]">{dict?.footerTitle || "¿Algo debería funcionar mejor?"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500">{dict?.footerDesc || "Cuéntanos qué te estorba, qué falta o qué esperabas encontrar."}</p>
          </div>
          <Link href="/contacto" className="group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-[#365DC4]">
            {dict?.footerBtn || "Abrir una conversación"} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </article>
  );
}

type ReleaseData = (typeof releases)[number];
function ReleaseCard({ release, featured = false }: { release: ReleaseData; featured?: boolean }) {
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
            {release.label}
          </span>
          <time className="text-xs text-stone-400">
            {release.date}
          </time>
        </div>
      </div>

      <div className="mt-auto pt-12">
        <h3
          className={`font-semibold leading-[1.02] tracking-[-0.045em] ${
            featured ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
          }`}
        >
          {release.title}
        </h3>
        <p className="mt-4 leading-relaxed text-stone-500">{release.summary}</p>
        <ul className="mt-6 grid gap-2.5">
          {release.items.map(item => (
            <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-stone-600">
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
