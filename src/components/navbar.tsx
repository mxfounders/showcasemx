"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { Search, ChevronDown, ArrowUpRight } from "lucide-react";

// ─── Datos del Megamenu ───────────────────────────────────────────────────────

const megaMenus = {
  compradores: {
    columns: [
      {
        heading: "Por problema operativo",
        links: [
          { label: "Cobros y cuentas por cobrar",   desc: "Acorta tu ciclo de facturación",              href: "/explorar/cobros" },
          { label: "Contratos y firma digital",      desc: "Cierra deals sin papel ni ida y vuelta",      href: "/explorar/contratos" },
          { label: "Nómina y compliance",            desc: "RRHH, IMSS y SAT sin fricción",               href: "/explorar/nomina" },
          { label: "Visibilidad financiera",         desc: "Tesorería y flujo de caja en tiempo real",    href: "/explorar/finanzas" },
          { label: "Inventario y supply chain",      desc: "Control de stock y proveedores",              href: "/explorar/inventario" },
          { label: "Ventas y CRM",                   desc: "Pipeline y seguimiento de clientes B2B",      href: "/explorar/ventas" },
          { label: "Atención al cliente",            desc: "Mesa de ayuda y soporte multicanal",          href: "/explorar/soporte" },
        ],
      },
      {
        heading: "Por industria",
        links: [
          { label: "Agencias y consultoras",         desc: "Gestión de proyectos y clientes",             href: "/industria/agencias" },
          { label: "Retail y e-commerce",            desc: "Infraestructura para vender en línea",        href: "/industria/retail" },
          { label: "Manufactura",                    desc: "Producción, calidad y logística",             href: "/industria/manufactura" },
          { label: "Despachos legales",              desc: "Expedientes, clientes y facturación",         href: "/industria/legal" },
          { label: "Construcción y real estate",     desc: "Proyectos, contratos y obra",                 href: "/industria/construccion" },
          { label: "Salud y clínicas",               desc: "Agendas, expedientes y pagos",                href: "/industria/salud" },
          { label: "Educación y EdTech",             desc: "Plataformas y administración escolar",        href: "/industria/educacion" },
        ],
      },
      {
        heading: "Colecciones curadas",
        links: [
          { label: "Essential Stack MX",             desc: "El stack mínimo para operar una empresa",     href: "/colecciones/essential" },
          { label: "CFO Toolkit",                    desc: "Finanzas, tesorería y reportes para directores", href: "/colecciones/cfo" },
          { label: "Agencia en 30 días",             desc: "Lanza tu operación de servicios rápido",      href: "/colecciones/agencia" },
          { label: "Stack legal moderno",            desc: "De contratos a cobranza sin papel",           href: "/colecciones/legal" },
        ],
      },
    ],
    featured: {
      tag: "Nuevo en el catálogo",
      label: "Weekly Drop",
      desc: "Cada martes revelamos 5 herramientas B2B curadas por el equipo. Solo software validado con tracción real.",
      href: "/drops",
      cta: "Ver último drop →",
    },
  },

  fundadores: {
    columns: [
      {
        heading: "Entrar al catálogo",
        links: [
          { label: "Cómo aplicar",                  desc: "El proceso de curaduría en 3 pasos",          href: "/aplicar" },
          { label: "Criterios de admisión",          desc: "Qué evalúa el equipo de ShowcaseMX",         href: "/criterios" },
          { label: "Proceso de revisión",            desc: "De draft a aprobado, sin sorpresas",          href: "/proceso" },
          { label: "Preguntas frecuentes",           desc: "Todo lo que necesitas saber antes de aplicar", href: "/faq" },
        ],
      },
      {
        heading: "Tu presencia",
        links: [
          { label: "Dashboard de métricas",         desc: "Visitas, matches de IA y leads generados",    href: "/dashboard/founder" },
          { label: "Leads corporativos",             desc: "Conecta con CFOs y directores de ops",        href: "/leads" },
          { label: "Tu perfil de producto",          desc: "Cómo te ven los compradores",                 href: "/perfil" },
          { label: "Weekly Drops",                   desc: "Lanzamientos curados cada martes",            href: "/drops" },
        ],
      },
      {
        heading: "Comunidad",
        links: [
          { label: "Directorio de founders",         desc: "Conoce a quién construye el catálogo",        href: "/fundadores" },
          { label: "Eventos y networking",           desc: "Encuentros B2B presenciales y virtuales",     href: "/eventos" },
          { label: "Newsletter de operadores",       desc: "Inteligencia de mercado cada semana",         href: "/newsletter" },
        ],
      },
    ],
    featured: {
      tag: "Léelo primero",
      label: "El Manifiesto",
      desc: "Por qué construimos ShowcaseMX, qué significa ser parte del catálogo y cómo funciona la curaduría.",
      href: "/manifiesto",
      cta: "Leer manifiesto →",
    },
  },
};

// ─── NavLink con slide-up ─────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group relative px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors overflow-hidden inline-flex"
    >
      <span className="flex flex-col items-start text-[13.5px] font-medium leading-none">
        <span className="block text-stone-600 group-hover:text-stone-900 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0">
          {children}
        </span>
        <span aria-hidden="true" className="absolute inset-x-3 text-stone-900 translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100">
          {children}
        </span>
      </span>
    </Link>
  );
}

// ─── MegaMenu Trigger ─────────────────────────────────────────────────────────

function MegaMenuTrigger({
  label,
  menu,
}: {
  label: string;
  menu: (typeof megaMenus)[keyof typeof megaMenus];
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        className="group flex items-center gap-0.5 px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors overflow-hidden"
        aria-expanded={open}
      >
        <span className="relative flex flex-col items-start text-[13.5px] font-medium leading-none overflow-hidden h-[1em]">
          <span className="block text-stone-600 group-hover:text-stone-900 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0">
            {label}
          </span>
          <span aria-hidden="true" className="absolute top-0 left-0 text-stone-900 translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100 whitespace-nowrap">
            {label}
          </span>
        </span>
        <ChevronDown className={`size-3.5 text-stone-400 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Panel */}
      <div
        className={`absolute left-0 top-[calc(100%+10px)] z-50 transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        {/* Flecha */}
        <div className="ml-6 w-3 h-1.5 overflow-hidden mb-px">
          <div className="w-3 h-3 bg-white border-l border-t border-stone-200/70 rotate-45 -translate-y-1.5 ml-0.5" />
        </div>

        {/* Panel grande */}
        <div className="bg-white rounded-2xl border border-stone-200/70 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.14)] p-6 flex gap-6" style={{ minWidth: "780px" }}>
          {/* Columnas */}
          <div className="flex gap-6 flex-1">
            {menu.columns.map((col) => (
              <div key={col.heading} className="flex-1 min-w-0">
                <p className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-widest mb-3 px-2">
                  {col.heading}
                </p>
                <ul className="space-y-0.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group/item flex flex-col px-2 py-2 rounded-lg hover:bg-stone-50 transition-colors"
                      >
                        <span className="flex items-center gap-1 text-[13px] font-medium text-stone-800 group-hover/item:text-stone-950">
                          {link.label}
                          <ArrowUpRight className="size-3 opacity-0 -translate-x-1 transition-all duration-150 group-hover/item:opacity-100 group-hover/item:translate-x-0 text-stone-400" />
                        </span>
                        <span className="text-[11.5px] text-stone-400 leading-snug mt-0.5">
                          {link.desc}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Featured */}
          <div className="w-[200px] shrink-0 border-l border-stone-100 pl-6 flex flex-col justify-between">
            <div>
              <span className="inline-block text-[10px] font-semibold uppercase tracking-widest bg-stone-900 text-white px-2 py-0.5 rounded-full mb-3">
                {menu.featured.tag}
              </span>
              <p className="text-[14.5px] font-semibold text-stone-900 mb-2 leading-snug">
                {menu.featured.label}
              </p>
              <p className="text-[12px] text-stone-400 leading-relaxed">
                {menu.featured.desc}
              </p>
            </div>
            <Link
              href={menu.featured.href}
              className="mt-4 inline-flex items-center text-[12.5px] font-medium text-stone-700 hover:text-stone-900 transition-colors"
            >
              {menu.featured.cta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4">
      <div className="max-w-7xl mx-auto bg-white rounded-b-2xl border border-t-0 border-stone-200/70 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] px-6 h-[52px] flex items-center justify-between gap-8">

        {/* LEFT */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="size-[22px] rounded-[5px] bg-stone-900 flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
              <div className="size-2.5 rounded-[2px] bg-white/90" />
            </div>
            <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">
              showcasemx
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            <MegaMenuTrigger label="Para compradores" menu={megaMenus.compradores} />
            <MegaMenuTrigger label="Para fundadores"  menu={megaMenus.fundadores} />
            <NavLink href="/manifiesto">Manifiesto</NavLink>
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          {/* Lupa sola */}
          <button className="p-2 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100/80 transition-colors">
            <Search className="size-[15px]" />
          </button>

          <NavLink href="/sign-in">Acceso</NavLink>

          {/* Único CTA */}
          <Link
            href="/newsletter"
            className="group inline-flex items-center bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-medium px-4 py-1.5 rounded-full transition-colors overflow-hidden relative"
          >
            <span className="relative flex flex-col items-center leading-none h-[1em]">
              <span className="block transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0">
                Suscribirse →
              </span>
              <span aria-hidden="true" className="absolute top-0 left-0 whitespace-nowrap translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100">
                Suscribirse →
              </span>
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}
