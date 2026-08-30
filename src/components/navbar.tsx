"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Search, ChevronDown,
  CreditCard, FileText, Users, BarChart3, Package,
  Target, HeadphonesIcon, Building2, ShoppingBag, Factory,
  Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen,
  Send, LayoutDashboard, UserCircle, Rocket,
  Globe, Calendar, Mail, Award,
  ClipboardCheck, HelpCircle, Settings,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type NavItem = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  desc: string;
  href: string;
};

type MenuColumn = { heading: string; links: NavItem[] };

type FeaturedCard = {
  tag: string;
  label: string;
  desc: string;
  href: string;
  cta: string;
  mockupType: "drops" | "catalog";
};

type MenuData = { columns: MenuColumn[]; featured: FeaturedCard };

// ─── Datos ────────────────────────────────────────────────────────────────────

const menus: Record<string, MenuData> = {
  compradores: {
    columns: [
      {
        heading: "Por problema operativo",
        links: [
          { icon: CreditCard,     iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Cobros y cuentas por cobrar", desc: "Reduce tu ciclo de cobranza de semanas a días",         href: "/explorar/cobros" },
          { icon: FileText,       iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Contratos y firma digital",   desc: "Cierra acuerdos sin imprimir una sola hoja",            href: "/explorar/contratos" },
          { icon: Users,          iconBg: "bg-green-50",  iconColor: "text-green-500",  label: "Nómina y compliance",         desc: "IMSS, SAT y dispersión en un solo lugar",               href: "/explorar/nomina" },
          { icon: BarChart3,      iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Visibilidad financiera",      desc: "Sabe exactamente qué entra, qué sale y cuándo",         href: "/explorar/finanzas" },
          { icon: Package,        iconBg: "bg-pink-50",   iconColor: "text-pink-500",   label: "Inventario y supply chain",   desc: "Control de stock en tiempo real, sin hojas de Excel",  href: "/explorar/inventario" },
          { icon: Target,         iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Ventas y CRM",                desc: "Pipeline claro para cerrar más y perder menos",         href: "/explorar/ventas" },
          { icon: HeadphonesIcon, iconBg: "bg-teal-50",   iconColor: "text-teal-500",   label: "Atención al cliente",         desc: "Mesa de ayuda multicanal sin caos operativo",           href: "/explorar/soporte" },
        ],
      },
      {
        heading: "Por industria",
        links: [
          { icon: Building2,    iconBg: "bg-indigo-50", iconColor: "text-indigo-500", label: "Agencias y consultoras",     desc: "Factura, gestiona proyectos y cobra a tiempo",           href: "/industria/agencias" },
          { icon: ShoppingBag,  iconBg: "bg-pink-50",   iconColor: "text-pink-500",   label: "Retail y e-commerce",        desc: "Inventario, pagos y logística integrados",               href: "/industria/retail" },
          { icon: Factory,      iconBg: "bg-stone-100", iconColor: "text-stone-600",  label: "Manufactura",                desc: "Digitaliza planta, proveedores y calidad",                href: "/industria/manufactura" },
          { icon: Scale,        iconBg: "bg-amber-50",  iconColor: "text-amber-600",  label: "Despachos legales",          desc: "Expedientes, clientes y honorarios sin papel",            href: "/industria/legal" },
          { icon: HardHat,      iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Construcción y real estate", desc: "Contratos de obra, estimaciones y avance en obra",       href: "/industria/construccion" },
          { icon: Heart,        iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Salud y clínicas",           desc: "Agenda, expediente clínico y cobros en un sistema",      href: "/industria/salud" },
          { icon: GraduationCap,iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Educación y EdTech",         desc: "Inscripciones, cobranza y comunicación con padres",      href: "/industria/educacion" },
        ],
      },
      {
        heading: "Colecciones",
        links: [
          { icon: Layers,     iconBg: "bg-stone-100", iconColor: "text-stone-700", label: "Essential Stack MX",  desc: "Las herramientas mínimas para operar sin caos",         href: "/colecciones/essential" },
          { icon: Briefcase,  iconBg: "bg-blue-50",   iconColor: "text-blue-600",  label: "CFO Toolkit",         desc: "Control financiero para directores de finanzas",         href: "/colecciones/cfo" },
          { icon: TrendingUp, iconBg: "bg-green-50",  iconColor: "text-green-600", label: "Agencia en 30 días",  desc: "Lanza tu operación de servicios desde cero",             href: "/colecciones/agencia" },
          { icon: BookOpen,   iconBg: "bg-violet-50", iconColor: "text-violet-600",label: "Stack legal moderno", desc: "De firma de contratos a cobranza, sin impresoras",       href: "/colecciones/legal" },
        ],
      },
    ],
    featured: {
      tag: "Nuevo",
      label: "Weekly Drop",
      desc: "Cada martes, 5 herramientas B2B seleccionadas por el equipo. Solo software con tracción real en México.",
      href: "/drops",
      cta: "Ver último drop →",
      mockupType: "drops",
    },
  },

  fundadores: {
    columns: [
      {
        heading: "Entrar al catálogo",
        links: [
          { icon: Send,           iconBg: "bg-blue-50",   iconColor: "text-blue-500",  label: "Cómo aplicar",         desc: "El proceso de entrada en 3 pasos, sin burocracia",        href: "/aplicar" },
          { icon: ClipboardCheck, iconBg: "bg-green-50",  iconColor: "text-green-500", label: "Criterios de entrada",  desc: "Qué evalúa el equipo: tracción, modelo y ejecución",      href: "/criterios" },
          { icon: Settings,       iconBg: "bg-stone-100", iconColor: "text-stone-600", label: "Proceso de revisión",   desc: "De draft a publicado: tiempos y comunicación directa",    href: "/proceso" },
          { icon: HelpCircle,     iconBg: "bg-amber-50",  iconColor: "text-amber-500", label: "Preguntas frecuentes",  desc: "Todo lo que debes saber antes de enviar tu aplicación",   href: "/faq" },
        ],
      },
      {
        heading: "Tu presencia",
        links: [
          { icon: LayoutDashboard, iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Dashboard de métricas", desc: "Visitas, leads y qué búsquedas llegan a tu producto",    href: "/dashboard/founder" },
          { icon: Target,          iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Leads corporativos",    desc: "Empresas que vieron tu solución y quieren hablar",        href: "/leads" },
          { icon: UserCircle,      iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Tu perfil de producto", desc: "Cómo te presentas ante compradores corporativos",         href: "/perfil" },
          { icon: Rocket,          iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Weekly Drops",          desc: "Sé parte del lanzamiento semanal más visto del ecosistema", href: "/drops" },
        ],
      },
      {
        heading: "Comunidad",
        links: [
          { icon: Globe,    iconBg: "bg-teal-50",   iconColor: "text-teal-500",  label: "Directorio de founders",   desc: "Conoce quién más está construyendo en el catálogo",      href: "/fundadores" },
          { icon: Calendar, iconBg: "bg-pink-50",   iconColor: "text-pink-500",  label: "Eventos y networking",     desc: "Encuentros B2B presenciales en CDMX y Monterrey",        href: "/eventos" },
          { icon: Mail,     iconBg: "bg-indigo-50", iconColor: "text-indigo-500",label: "Newsletter semanal",       desc: "Inteligencia de mercado: qué buscan las empresas hoy",   href: "/newsletter" },
          { icon: Award,    iconBg: "bg-amber-50",  iconColor: "text-amber-500", label: "Founders destacados",      desc: "Los operadores más traccionados del catálogo este mes",   href: "/destacados" },
        ],
      },
    ],
    featured: {
      tag: "Léelo",
      label: "El Proyecto",
      desc: "Por qué construimos ShowcaseMX, cómo funciona el proceso de selección y qué significa estar en el catálogo.",
      href: "/el-proyecto",
      cta: "Leer más →",
      mockupType: "catalog",
    },
  },
};

// ─── Mockup visual ────────────────────────────────────────────────────────────

function MockupVisual({ type }: { type: FeaturedCard["mockupType"] }) {
  if (type === "drops") {
    return (
      <div className="w-full rounded-xl bg-stone-900 p-3 mb-4 overflow-hidden">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="size-2 rounded-full bg-stone-700" />
          <div className="size-2 rounded-full bg-stone-700" />
          <div className="size-2 rounded-full bg-stone-700" />
        </div>
        {["bg-blue-400", "bg-violet-400", "bg-green-400", "bg-orange-400", "bg-pink-400"].map((c, i) => (
          <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
            <div className={`size-5 rounded-md ${c} opacity-80 shrink-0`} />
            <div className="flex-1 space-y-1">
              <div className={`h-1.5 rounded-full bg-stone-600 ${i % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
              <div className="h-1 rounded-full bg-stone-700 w-1/3" />
            </div>
            <div className="h-4 w-7 rounded-full bg-stone-700 flex items-center justify-center">
              <span className="text-[7px] text-stone-400 font-medium">new</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="w-full rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 p-3 mb-4">
      <div className="grid grid-cols-2 gap-1.5">
        {["bg-blue-400", "bg-violet-400", "bg-green-400", "bg-orange-400"].map((c, i) => (
          <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
            <div className={`size-5 rounded-md ${c} opacity-70 mb-1.5`} />
            <div className="h-1.5 rounded-full bg-stone-200 w-3/4 mb-1" />
            <div className="h-1 rounded-full bg-stone-100 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NavLink slide-up ─────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="px-3 py-1.5 rounded-md text-[13.5px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 transition-colors">
      {children}
    </Link>
  );
}

// ─── Navbar principal (maneja el estado del megamenu a nivel raíz) ────────────

export function Navbar() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  let hideTimeout: ReturnType<typeof setTimeout>;

  const handleEnter = (key: string) => {
    clearTimeout(hideTimeout);
    setActiveMenu(key);
  };

  const handleLeave = () => {
    hideTimeout = setTimeout(() => setActiveMenu(null), 150);
  };

  const currentMenu = activeMenu ? menus[activeMenu] : null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-50 px-4"
      onMouseLeave={handleLeave}
    >
      {/* Barra principal */}
      <div className={`max-w-7xl mx-auto bg-white border border-t-0 border-stone-200/70 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] px-6 h-[52px] flex items-center justify-between gap-8 transition-all duration-200 ${activeMenu ? "rounded-b-none border-b-transparent" : "rounded-b-2xl"}`}>

        {/* LEFT */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="size-[22px] rounded-[5px] bg-stone-900 flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
              <div className="size-2.5 rounded-[2px] bg-white/90" />
            </div>
            <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">showcasemx</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            {(["compradores", "fundadores"] as const).map((key) => (
              <button
                key={key}
                onMouseEnter={() => handleEnter(key)}
                className={`group flex items-center gap-0.5 px-3 py-1.5 rounded-md transition-colors text-[13.5px] font-medium ${activeMenu === key ? "bg-stone-100/80 text-stone-900" : "text-stone-600 hover:bg-stone-100/80 hover:text-stone-900"}`}
              >
                {key === "compradores" ? "Para compradores" : "Para fundadores"}
                <ChevronDown className={`size-3.5 text-stone-400 ml-0.5 transition-transform duration-200 ${activeMenu === key ? "rotate-180" : ""}`} />
              </button>
            ))}
            <NavLink href="/el-proyecto">El Proyecto</NavLink>
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100/80 transition-colors">
            <Search className="size-[15px]" />
          </button>
          <NavLink href="/sign-in">Acceso</NavLink>
          <Link
            href="/newsletter"
            className="inline-flex items-center bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-medium px-4 py-1.5 rounded-full transition-colors"
          >
            Suscribirse →
          </Link>
        </div>
      </div>

      {/* Panel full-width del megamenu */}
      <div
        className={`max-w-7xl mx-auto bg-white border border-t-0 border-stone-200/70 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.14)] rounded-b-2xl overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] ${currentMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}
        onMouseEnter={() => activeMenu && handleEnter(activeMenu)}
      >
        {currentMenu && (
          <div className="flex gap-0 p-6">
            {/* Columnas */}
            <div className="flex gap-8 flex-1">
              {currentMenu.columns.map((col) => (
                <div key={col.heading} className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3 px-1">
                    {col.heading}
                  </p>
                  <ul className="space-y-0.5">
                    {col.links.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="group/item flex items-start gap-2.5 px-1.5 py-2 rounded-lg hover:bg-stone-50 transition-colors"
                          >
                            <div className={`size-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                              <Icon className={`size-3.5 ${item.iconColor}`} />
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-stone-800 group-hover/item:text-stone-950 transition-colors leading-tight">
                                {item.label}
                              </p>
                              <p className="text-[11.5px] text-stone-400 leading-snug mt-0.5">
                                {item.desc}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* Featured card */}
            <div className="w-[200px] shrink-0 border-l border-stone-100 pl-6 ml-2">
              <MockupVisual type={currentMenu.featured.mockupType} />
              <span className="inline-block text-[9.5px] font-bold uppercase tracking-widest bg-stone-900 text-white px-2 py-0.5 rounded-full mb-2">
                {currentMenu.featured.tag}
              </span>
              <p className="text-[14px] font-semibold text-stone-900 leading-snug mb-1.5">
                {currentMenu.featured.label}
              </p>
              <p className="text-[11.5px] text-stone-400 leading-relaxed mb-3">
                {currentMenu.featured.desc}
              </p>
              <Link href={currentMenu.featured.href} className="text-[12px] font-medium text-stone-700 hover:text-stone-900 transition-colors">
                {currentMenu.featured.cta}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
