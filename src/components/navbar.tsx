"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import {
  Search, ChevronDown,
  CreditCard, FileText, Users, BarChart3, Package,
  Target, HeadphonesIcon, Building2, ShoppingBag, Factory,
  Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen,
  Send, LayoutDashboard, UserCircle, Rocket,
  Globe, Calendar, Mail,
  ClipboardCheck, HelpCircle, Settings, Award,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type NavItem = {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  href: string;
};

type MenuColumn = {
  heading: string;
  links: NavItem[];
};

type FeaturedCard = {
  tag: string;
  label: string;
  desc: string;
  href: string;
  cta: string;
  // Mockup visual — filas de barras CSS
  mockupType: "dashboard" | "catalog" | "drops";
};

type MenuData = {
  columns: MenuColumn[];
  featured: FeaturedCard;
};

// ─── Datos ────────────────────────────────────────────────────────────────────

const megaMenus: Record<string, MenuData> = {
  compradores: {
    columns: [
      {
        heading: "Por problema operativo",
        links: [
          { icon: CreditCard,      iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Cobros y cuentas por cobrar",  href: "/explorar/cobros" },
          { icon: FileText,        iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Contratos y firma digital",    href: "/explorar/contratos" },
          { icon: Users,           iconBg: "bg-green-50",  iconColor: "text-green-500",  label: "Nómina y compliance",          href: "/explorar/nomina" },
          { icon: BarChart3,       iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Visibilidad financiera",       href: "/explorar/finanzas" },
          { icon: Package,         iconBg: "bg-pink-50",   iconColor: "text-pink-500",   label: "Inventario y supply chain",    href: "/explorar/inventario" },
          { icon: Target,          iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Ventas y CRM",                 href: "/explorar/ventas" },
          { icon: HeadphonesIcon,  iconBg: "bg-teal-50",   iconColor: "text-teal-500",   label: "Atención al cliente",         href: "/explorar/soporte" },
        ],
      },
      {
        heading: "Por industria",
        links: [
          { icon: Building2,    iconBg: "bg-indigo-50",  iconColor: "text-indigo-500",  label: "Agencias y consultoras",      href: "/industria/agencias" },
          { icon: ShoppingBag,  iconBg: "bg-pink-50",    iconColor: "text-pink-500",    label: "Retail y e-commerce",         href: "/industria/retail" },
          { icon: Factory,      iconBg: "bg-stone-100",  iconColor: "text-stone-600",   label: "Manufactura",                 href: "/industria/manufactura" },
          { icon: Scale,        iconBg: "bg-amber-50",   iconColor: "text-amber-600",   label: "Despachos legales",           href: "/industria/legal" },
          { icon: HardHat,      iconBg: "bg-orange-50",  iconColor: "text-orange-500",  label: "Construcción y real estate",  href: "/industria/construccion" },
          { icon: Heart,        iconBg: "bg-red-50",     iconColor: "text-red-500",     label: "Salud y clínicas",            href: "/industria/salud" },
          { icon: GraduationCap, iconBg: "bg-blue-50",  iconColor: "text-blue-500",    label: "Educación y EdTech",          href: "/industria/educacion" },
        ],
      },
      {
        heading: "Colecciones curadas",
        links: [
          { icon: Layers,    iconBg: "bg-stone-100", iconColor: "text-stone-700", label: "Essential Stack MX",    href: "/colecciones/essential" },
          { icon: Briefcase, iconBg: "bg-blue-50",   iconColor: "text-blue-600",  label: "CFO Toolkit",           href: "/colecciones/cfo" },
          { icon: TrendingUp,iconBg: "bg-green-50",  iconColor: "text-green-600", label: "Agencia en 30 días",    href: "/colecciones/agencia" },
          { icon: BookOpen,  iconBg: "bg-violet-50", iconColor: "text-violet-600",label: "Stack legal moderno",   href: "/colecciones/legal" },
        ],
      },
    ],
    featured: {
      tag: "Nuevo",
      label: "Weekly Drop",
      desc: "Cada martes, 5 herramientas B2B curadas. Solo software con tracción real.",
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
          { icon: Send,           iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Cómo aplicar",           href: "/aplicar" },
          { icon: ClipboardCheck, iconBg: "bg-green-50",  iconColor: "text-green-500",  label: "Criterios de admisión",  href: "/criterios" },
          { icon: Settings,       iconBg: "bg-stone-100", iconColor: "text-stone-600",  label: "Proceso de revisión",    href: "/proceso" },
          { icon: HelpCircle,     iconBg: "bg-amber-50",  iconColor: "text-amber-500",  label: "Preguntas frecuentes",   href: "/faq" },
        ],
      },
      {
        heading: "Tu presencia",
        links: [
          { icon: LayoutDashboard, iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Dashboard de métricas", href: "/dashboard/founder" },
          { icon: Target,          iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Leads corporativos",    href: "/leads" },
          { icon: UserCircle,      iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Tu perfil de producto", href: "/perfil" },
          { icon: Rocket,          iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Weekly Drops",          href: "/drops" },
        ],
      },
      {
        heading: "Comunidad",
        links: [
          { icon: Globe,    iconBg: "bg-teal-50",  iconColor: "text-teal-500",  label: "Directorio de founders",   href: "/fundadores" },
          { icon: Calendar, iconBg: "bg-pink-50",  iconColor: "text-pink-500",  label: "Eventos y networking",     href: "/eventos" },
          { icon: Mail,     iconBg: "bg-indigo-50",iconColor: "text-indigo-500",label: "Newsletter de operadores", href: "/newsletter" },
          { icon: Award,    iconBg: "bg-amber-50", iconColor: "text-amber-500", label: "Founders destacados",      href: "/destacados" },
        ],
      },
    ],
    featured: {
      tag: "Léelo",
      label: "El Manifiesto",
      desc: "Por qué construimos ShowcaseMX y cómo funciona la curaduría.",
      href: "/manifiesto",
      cta: "Leer manifiesto →",
      mockupType: "catalog",
    },
  },
};

// ─── Mockup visual en la featured card ───────────────────────────────────────

function MockupVisual({ type }: { type: FeaturedCard["mockupType"] }) {
  if (type === "drops") {
    return (
      <div className="w-full rounded-xl bg-stone-900 p-3 mb-4 overflow-hidden">
        {/* Barra top del "browser" */}
        <div className="flex items-center gap-1.5 mb-3">
          <div className="size-2 rounded-full bg-stone-700" />
          <div className="size-2 rounded-full bg-stone-700" />
          <div className="size-2 rounded-full bg-stone-700" />
        </div>
        {/* Filas de producto */}
        {["bg-blue-400", "bg-violet-400", "bg-green-400", "bg-orange-400", "bg-pink-400"].map((c, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <div className={`size-5 rounded-md ${c} opacity-80 shrink-0`} />
            <div className="flex-1 space-y-1">
              <div className={`h-1.5 rounded-full bg-stone-600 ${i % 2 === 0 ? "w-3/4" : "w-1/2"}`} />
              <div className="h-1 rounded-full bg-stone-700 w-1/3" />
            </div>
            <div className="h-4 w-8 rounded-full bg-stone-700 text-[7px] flex items-center justify-center text-stone-400">new</div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "catalog") {
    return (
      <div className="w-full rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 p-3 mb-4 overflow-hidden">
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

  return (
    <div className="w-full rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 p-3 mb-4">
      <div className="space-y-2">
        {[80, 55, 70, 40].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="size-4 rounded bg-indigo-300 opacity-60 shrink-0" />
            <div className={`h-2 rounded-full bg-indigo-200`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NavLink con slide-up ─────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="group relative px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors overflow-hidden inline-flex">
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

function MegaMenuTrigger({ label, menu }: { label: string; menu: MenuData }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); setOpen(true); };
  const handleLeave = () => { timeoutRef.current = setTimeout(() => setOpen(false), 150); };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        aria-expanded={open}
        className="group flex items-center gap-0.5 px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors"
      >
        <span className="relative overflow-hidden inline-flex h-[1em] text-[13.5px] font-medium">
          <span className="block text-stone-600 group-hover:text-stone-900 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0 whitespace-nowrap">
            {label}
          </span>
          <span aria-hidden="true" className="absolute top-0 left-0 text-stone-900 translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100 whitespace-nowrap">
            {label}
          </span>
        </span>
        <ChevronDown className={`size-3.5 text-stone-400 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Panel */}
      <div className={`absolute left-0 top-[calc(100%+10px)] z-50 transition-all duration-200 ease-[cubic-bezier(0.33,1,0.68,1)] ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        {/* Flecha */}
        <div className="ml-6 w-3 h-1.5 overflow-hidden mb-px">
          <div className="w-3 h-3 bg-white border-l border-t border-stone-200/70 rotate-45 -translate-y-1.5 ml-0.5" />
        </div>

        {/* Panel principal */}
        <div className="bg-white rounded-2xl border border-stone-200/60 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.15)] p-5 flex gap-5" style={{ minWidth: "820px" }}>

          {/* Columnas */}
          <div className="flex gap-6 flex-1">
            {menu.columns.map((col) => (
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
                          className="group/item flex items-center gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
                        >
                          {/* Icono */}
                          <div className={`size-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                            <Icon className={`size-3.5 ${item.iconColor}`} />
                          </div>
                          {/* Label */}
                          <span className="text-[13px] font-medium text-stone-700 group-hover/item:text-stone-950 leading-tight transition-colors">
                            {item.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Featured card */}
          <div className="w-[190px] shrink-0 border-l border-stone-100 pl-5">
            <MockupVisual type={menu.featured.mockupType} />
            <span className="inline-block text-[9.5px] font-bold uppercase tracking-widest bg-stone-900 text-white px-2 py-0.5 rounded-full mb-2">
              {menu.featured.tag}
            </span>
            <p className="text-[14px] font-semibold text-stone-900 leading-snug mb-1.5">
              {menu.featured.label}
            </p>
            <p className="text-[11.5px] text-stone-400 leading-relaxed mb-3">
              {menu.featured.desc}
            </p>
            <Link href={menu.featured.href} className="text-[12px] font-medium text-stone-700 hover:text-stone-900 transition-colors">
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
            <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">showcasemx</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5">
            <MegaMenuTrigger label="Para compradores" menu={megaMenus.compradores} />
            <MegaMenuTrigger label="Para fundadores"  menu={megaMenus.fundadores} />
            <NavLink href="/manifiesto">Manifiesto</NavLink>
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
            className="group inline-flex items-center bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-medium px-4 py-1.5 rounded-full transition-colors overflow-hidden relative"
          >
            <span className="relative overflow-hidden inline-flex h-[1em]">
              <span className="block transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0 whitespace-nowrap">
                Suscribirse →
              </span>
              <span aria-hidden="true" className="absolute top-0 left-0 translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100 whitespace-nowrap">
                Suscribirse →
              </span>
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}
