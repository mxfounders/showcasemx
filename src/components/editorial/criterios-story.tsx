'use client';

import Link from 'next/link';
import { ArrowRight, TextSelect, Cpu, LayoutTemplate, CircleDollarSign, Fingerprint, LineChart, ShieldCheck, Scale } from 'lucide-react';

const criterios = [
  {
    id: '01',
    title: 'Claridad del problema',
    desc: 'Un directorio útil requiere contexto real. Evaluamos que la ficha explique de forma cristalina qué problema operativo resuelve, quién es el cliente ideal y por qué es mejor que usar una hoja de cálculo. Cero jerga genérica de marketing.',
    color: '#E4EBFC',
    text: '#264DAE',
    icon: TextSelect,
    span: 'md:col-span-8',
    titleSize: 'sm:text-4xl',
  },
  {
    id: '02',
    title: 'Arquitectura y técnica',
    desc: 'No auditamos el código fuente, pero revisamos la coherencia de la arquitectura. Si prometes integraciones nativas con SAP o Salesforce, buscamos la documentación técnica. Evaluamos los tiempos de carga, las dependencias de infraestructura (como SSO, APIs abiertas y webhooks) y nos aseguramos de que el producto no sea simplemente una capa gráfica inestable montada sobre ChatGPT. Queremos software corporativo real.',
    color: '#E4EDE2',
    text: '#416B50',
    icon: Cpu,
    span: 'md:col-span-4 md:row-span-2',
    titleSize: 'sm:text-3xl',
  },
  {
    id: '03',
    title: 'Diseño y UX',
    desc: 'La consumerización del B2B es real. Revisamos que las capturas de la plataforma muestren una interfaz moderna, limpia y que respete los estándares actuales de usabilidad.',
    color: '#EEE5F5',
    text: '#5E3A8A',
    icon: LayoutTemplate,
    span: 'md:col-span-4',
    titleSize: 'sm:text-3xl',
  },
  {
    id: '04',
    title: 'Modelo de negocio',
    desc: 'Transparencia absoluta. Exigimos que la estructura de precios, las tarifas de implementación y los módulos adicionales ocultos se expliquen claramente.',
    color: '#F4ECD5',
    text: '#88631B',
    icon: CircleDollarSign,
    span: 'md:col-span-4',
    titleSize: 'sm:text-3xl',
  },
  {
    id: '05',
    title: 'Identidad del dominio',
    desc: 'Para evitar fraudes o suplantación, verificamos exhaustivamente que el correo del fundador coincida directamente con el dominio del sitio web postulado.',
    color: '#F4E4DA',
    text: '#A94E35',
    icon: Fingerprint,
    span: 'md:col-span-4',
    titleSize: 'sm:text-3xl',
  },
  {
    id: '06',
    title: 'Evidencia y casos de uso',
    desc: 'Las promesas gigantes necesitan resultados verificables. Pedimos que el ROI prometido, las horas ahorradas y los casos de éxito se presenten con fuentes. No aceptamos muros llenos de logotipos de "clientes confiables" sin un desglose detallado de qué problema exacto les resolviste.',
    color: '#E4EBFC',
    text: '#264DAE',
    icon: LineChart,
    span: 'md:col-span-8',
    titleSize: 'sm:text-4xl',
  },
  {
    id: '07',
    title: 'Seguridad base',
    desc: 'Buscamos certificados SSL activos, políticas de privacidad transparentes, soporte de roles (RBAC) y, para planes Enterprise, normativas como SOC2 o GDPR.',
    color: '#E4EDE2',
    text: '#416B50',
    icon: ShieldCheck,
    span: 'md:col-span-6',
    titleSize: 'sm:text-3xl',
  },
  {
    id: '08',
    title: 'Ética comercial',
    desc: 'Nuestra regla fundamental: cero tolerancia a tácticas de spam agresivas, afirmaciones falsas sobre competidores o robo de propiedad intelectual.',
    color: '#EEE5F5',
    text: '#5E3A8A',
    icon: Scale,
    span: 'md:col-span-6',
    titleSize: 'sm:text-3xl',
  },
];

export function CriteriosStory() {
  return (
    <article className="pb-24 sm:pb-32">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 sm:pt-12 lg:px-16 lg:pt-20">
        <div className="grid gap-8 border-b border-stone-200 pb-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20 lg:pb-14">
          <h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
            Qué revisamos<br />antes de publicar
          </h1>
          <div className="max-w-md space-y-5 lg:justify-self-end lg:pb-1">
            <p className="text-lg leading-relaxed tracking-[-0.02em] text-stone-600">
              Evaluamos exhaustivamente cada proyecto en 8 dimensiones clave operativas para garantizar la calidad del directorio.
            </p>
            <Link href="/proceso" className="group inline-flex items-center gap-2 text-sm font-medium text-[#A94E35]">
              Ver proceso de publicación
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CRITERIOS BENTO ──────────────────────────────────── */}
      <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-10 lg:px-16 lg:pt-16">
        <div className="grid grid-flow-row-dense gap-6 md:grid-cols-12">
          {criterios.map((crit) => {
            const Icon = crit.icon;
            return (
              <div
                key={crit.id}
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-[32px] p-8 sm:p-10 lg:p-12 transition-all hover:shadow-md ${crit.span}`}
                style={{ backgroundColor: crit.color, color: crit.text }}
              >
                <div className="mb-12 flex items-center justify-between">
                  <span className="text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
                    Criterio {crit.id}
                  </span>
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/30 backdrop-blur-md transition-transform group-hover:scale-110">
                    <Icon className="size-5" />
                  </div>
                </div>
                
                <div>
                  <h2 className={`mb-5 text-3xl font-semibold tracking-[-0.03em] ${crit.titleSize}`}>
                    {crit.title}
                  </h2>
                  <p className="max-w-xl text-base leading-relaxed opacity-85 sm:text-lg">
                    {crit.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </article>
  );
}
