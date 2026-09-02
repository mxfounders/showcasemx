'use client';

import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  {
    group: 'Cuenta y privacidad',
    color: '#E4EBFC',
    text: '#264DAE',
    items: [
      {
        q: '¿Quién puede usar una cuenta?',
        a: 'Una persona puede explorar soluciones y publicar sus propios proyectos. Comprador y fundador son vistas de trabajo dentro de una misma cuenta; no son permisos separados.',
      },
      {
        q: '¿Mis listas y notas son públicas?',
        a: 'Tus guardados y notas son siempre privados. Las listas solo se comparten si decides publicarlas. Guardar un proyecto no envía ninguna notificación a su equipo ni crea solicitudes de contacto.',
      },
      {
        q: '¿Qué información se comparte al contactar?',
        a: 'Solo al enviar explícitamente una solicitud autorizas compartir la información y el contexto de uso que hayas escrito con el destinatario.',
      },
    ],
  },
  {
    group: 'Contacto y decisiones',
    color: '#F4E4DA',
    text: '#A94E35',
    items: [
      {
        q: '¿Cómo contacto a un proyecto?',
        a: 'Desde su ficha puedes enviar una solicitud con contexto sobre tu problema y escenario. Las respuestas del equipo se consultan directamente dentro de tu cuenta en shwcs.',
      },
      {
        q: '¿shwcs recomienda contratar las soluciones publicadas?',
        a: 'Publicar facilita evaluar y contactar con un equipo, pero no es una recomendación de compra ni garantiza resultados. Debes confirmar las condiciones y alcances directamente con el proyecto.',
      },
      {
        q: '¿Intervienen en la contratación o pagos?',
        a: 'No. shwcs es un espacio para descubrir y presentar proyectos con claridad. No procesa la contratación, facturación ni los acuerdos entre empresas y proveedores.',
      },
    ],
  },
  {
    group: 'Publicación de proyectos',
    color: '#EEE5F5',
    text: '#5E3A8A',
    items: [
      {
        q: '¿Qué se necesita para postular?',
        a: 'Cualquier fundador con una cuenta activa puede enviar un borrador. Necesitas aportar contexto real: el problema que resuelves, para quién funciona, el alcance, limitaciones, precios y evidencia que respalde lo que ofreces.',
      },
      {
        q: '¿Puedo actualizar un proyecto ya publicado?',
        a: 'Sí. Tus cambios se guardan como un nuevo borrador y pasan por revisión editorial. Mientras tanto, tu versión pública actual seguirá mostrándose sin interrupciones hasta que se aprueben los cambios.',
      },
      {
        q: '¿Cuánto tiempo tarda la revisión?',
        a: 'No hay un plazo de respuesta prometido. Revisa las notificaciones de tu cuenta para consultar decisiones, cambios solicitados o aprobaciones.',
      },
    ],
  },
  {
    group: 'Revisión editorial',
    color: '#E4EDE2',
    text: '#416B50',
    items: [
      {
        q: '¿Estar publicado es una certificación de calidad?',
        a: 'No. Una ficha aprobada significa que el proyecto explicó su contexto claramente. No equivale a una auditoría de seguridad, revisión de solvencia, ni asegura que cumplirán sus resultados.',
      },
      {
        q: '¿Qué pasa si mi proyecto es rechazado?',
        a: 'El equipo editorial debe explicar el motivo de cada decisión. Una solicitud de cambios o un rechazo siempre incluye un comentario del revisor, dándote la oportunidad de corregir la información y volver a enviarla.',
      },
      {
        q: '¿Cómo reporto información falsa o problemas?',
        a: 'No aceptamos suplantación de identidad, afirmaciones engañosas ni contenido ilícito. Puedes reportar cualquier ficha directamente desde su página para que sea evaluada y, si procede, retirada.',
      },
    ],
  },
];

function Item({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
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
          transform: isOpen ? 'translateY(0)' : 'translateY(-12px)'
        }}
      >
        <p className="pb-6 text-base leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export function FaqStory() {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <article className="overflow-hidden pb-24 sm:pb-32">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">

          <h1 className="text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Preguntas<br />frecuentes
          </h1>

          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
              Lo esencial para descubrir proyectos, gestionar tu cuenta y publicar en el directorio.
            </p>
            <Link href="/el-proyecto" className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]">
              Conocer el proyecto
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>

        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {faqs.map(group => (
            <div
              key={group.group}
              className="rounded-[24px] px-8 py-8 sm:px-10 sm:py-10"
              style={{ backgroundColor: group.color, color: group.text }}
            >
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.22em] opacity-80">
                {group.group}
              </p>
              <div>
                {group.items.map(item => (
                  <Item
                    key={item.q}
                    q={item.q}
                    a={item.a}
                    isOpen={activeId === item.q}
                    onToggle={() => setActiveId(activeId === item.q ? null : item.q)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

    </article>
  );
}
