"use client";

import Link from "next/link";
import { CommunityIcon } from "./library/community-icon";
import { navigationHref,availableNavigation } from "@/lib/navigation-destinations";
import { navbarBar, navbarPosition } from "./navigation/navbar-style";
import { NavbarSearch } from "./navbar-search";
import { BrandLink } from "./navigation/brand-link";
import { useState, useRef, useEffect, useCallback } from "react";
import gsap from "gsap";
import { actionButtonStyle, brandColors, getAccentStyle } from "@/lib/brand-colors";
import {
  ChevronDown,
  CreditCard, FileText, Users, BarChart3, Package,
  Target, HeadphonesIcon, Building2, ShoppingBag, Factory,
  Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen,
  Send, LayoutDashboard, UserCircle, Rocket,
  Globe, Calendar, Mail, Award,
  ClipboardCheck, HelpCircle, Settings, Menu, X, Zap
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type NavItem = {
  icon: React.ElementType;
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
          { icon: CreditCard,     label: "Cobros y cuentas por cobrar", desc: "Reduce tu ciclo de cobranza de semanas a días",         href: "/explorar/cobros" },
          { icon: FileText,       label: "Contratos y firma digital",   desc: "Cierra acuerdos sin imprimir una sola hoja",            href: "/explorar/contratos" },
          { icon: Users,          label: "Nómina y compliance",         desc: "IMSS, SAT y dispersión en un solo lugar",               href: "/explorar/nomina" },
          { icon: BarChart3,      label: "Visibilidad financiera",      desc: "Sabe exactamente qué entra, qué sale y cuándo",         href: "/explorar/finanzas" },
          { icon: Package,        label: "Inventario y supply chain",   desc: "Control de stock en tiempo real, sin hojas de Excel",  href: "/explorar/inventario" },
          { icon: Target,         label: "Ventas y CRM",                desc: "Pipeline claro para cerrar más y perder menos",         href: "/explorar/ventas" },
          { icon: HeadphonesIcon, label: "Atención al cliente",         desc: "Mesa de ayuda multicanal sin caos operativo",           href: "/explorar/soporte" },
        ],
      },
      {
        heading: "Por industria",
        links: [
          { icon: Building2,    label: "Agencias y consultoras",     desc: "Factura, gestiona proyectos y cobra a tiempo",           href: "/industria/agencias" },
          { icon: ShoppingBag,  label: "Retail y e-commerce",        desc: "Inventario, pagos y logística integrados",               href: "/industria/retail" },
          { icon: Factory,      label: "Manufactura",                desc: "Digitaliza planta, proveedores y calidad",                href: "/industria/manufactura" },
          { icon: Scale,        label: "Despachos legales",          desc: "Expedientes, clientes y honorarios sin papel",            href: "/industria/legal" },
          { icon: HardHat,      label: "Construcción y real estate", desc: "Contratos de obra, estimaciones y avance en obra",       href: "/industria/construccion" },
          { icon: Heart,        label: "Salud y clínicas",           desc: "Agenda, expediente clínico y cobros en un sistema",      href: "/industria/salud" },
          { icon: GraduationCap,label: "Educación y EdTech",         desc: "Inscripciones, cobranza y comunicación con padres",      href: "/industria/educacion" },
        ],
      },
      {
        heading: "Tu selección",
        links: [
          { icon: Layers,     label: "Essential Stack MX",  desc: "Las herramientas mínimas para operar sin caos",         href: "/colecciones/essential" },
          { icon: Briefcase,  label: "CFO Toolkit",         desc: "Control financiero para directores de finanzas",         href: "/colecciones/cfo" },
          { icon: TrendingUp, label: "Agencia en 30 días",  desc: "Lanza tu operación de servicios desde cero",             href: "/colecciones/agencia" },
          { icon: BookOpen,   label: "Stack legal moderno", desc: "De firma de contratos a cobranza, sin impresoras",       href: "/colecciones/legal" },
        ],
      },
    ],
    featured: {
      tag: "Nuevo",
      label: "Descubre proyectos",
      desc: "Conoce qué resuelven, guarda opciones y compara antes de contactar.",
      href: "/#catalogo",
      cta: "Explorar catálogo →",
      mockupType: "catalog",
    },
  },
  fundadores: {
    columns: [
      {
        heading: "Entrar al catálogo",
        links: [
          { icon: Send,           label: "Cómo aplicar",         desc: "El proceso de entrada en 3 pasos, sin burocracia",        href: "/aplicar" },
          { icon: ClipboardCheck, label: "Criterios de entrada",  desc: "Qué evalúa el equipo: tracción, modelo y ejecución",      href: "/criterios" },
          { icon: Settings,       label: "Proceso de revisión",   desc: "De draft a publicado: tiempos y comunicación directa",    href: "/proceso" },
          { icon: HelpCircle,     label: "Preguntas frecuentes",  desc: "Todo lo que debes saber antes de enviar tu aplicación",   href: "/faq" },
        ],
      },
      {
        heading: "Tu presencia",
        links: [
          { icon: LayoutDashboard, label: "Mis soluciones", desc: "Postula, consulta avances y administra tus soluciones",    href: "/account/solutions" },
          { icon: Target,          label: "Oportunidades",    desc: "Empresas que vieron tu solución y quieren hablar",        href: "/leads" },
          { icon: UserCircle,      label: "Tu cuenta", desc: "Actualiza tus datos y preferencias",         href: "/account/settings" },
          { icon: Rocket,          label: "Weekly Drops",          desc: "Sé parte del lanzamiento semanal más visto del ecosistema", href: "/drops" },
        ],
      },
      {
        heading: "Novedades",
        links: [
          { icon: Globe,    label: "Directorio de founders",   desc: "Conoce quién más está construyendo en el catálogo",      href: "/fundadores" },
          { icon: Calendar, label: "Eventos y networking",     desc: "Encuentros B2B presenciales en CDMX y Monterrey",        href: "/eventos" },
          { icon: Mail,     label: "Newsletter",       desc: "Inteligencia de mercado: qué buscan las empresas hoy",   href: "/newsletter" },
          { icon: Award,    label: "Founders destacados",      desc: "Los operadores más traccionados del catálogo este mes",   href: "/destacados" },
        ],
      },
    ],
    featured: {
      tag: "Léelo",
      label: "El Proyecto",
      desc: "Por qué construimos shwcs, cómo funciona el proceso de selección y qué significa estar en el catálogo.",
      href: "/el-proyecto",
      cta: "Leer más →",
      mockupType: "catalog",
    },
  },
  recursos: {
    columns: [
      {
        heading: "Conoce shwcs",
        links: [
          { icon: Target, label: "El Proyecto", desc: "Por qué existe shwcs y cómo elegimos qué presentar", href: "/el-proyecto" },
          { icon: BookOpen, label: "Blog", desc: "Ideas para elegir, construir y operar mejores proyectos", href: "/blog" },
        ],
      },
      {
        heading: "Mantente cerca",
        links: [
          { icon: Rocket, label: "Changelog", desc: "Qué cambia en el catálogo y en la experiencia", href: "/changelog" },
          { icon: Mail, label: "Contacto", desc: "Cuéntanos qué buscas, construyes o quieres proponer", href: "/contacto" },
        ],
      },
    ],
    featured: {
      tag: "shwcs",
      label: "Proyectos con contexto",
      desc: "Una selección para entender qué resuelve cada proyecto y quién está detrás.",
      href: "/el-proyecto",
      cta: "Conocer el proyecto →",
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
          {[0,1,2].map(i => <div key={i} className="size-2 rounded-full bg-stone-700" />)}
        </div>
        {Object.values(brandColors).map((c, i) => (
          <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
            <div style={{ backgroundColor: c.solid }} className="size-5 rounded-md opacity-80 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className={`h-1.5 rounded-full bg-stone-600 ${i%2===0?"w-3/4":"w-1/2"}`} />
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
        {Object.values(brandColors).slice(0, 4).map((c,i) => (
          <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
            <div style={{ backgroundColor: c.solid }} className="size-5 rounded-md opacity-70 mb-1.5" />
            <div className="h-1.5 rounded-full bg-stone-200 w-3/4 mb-1" />
            <div className="h-1 rounded-full bg-stone-100 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── GSAP NavLink — slide-up text on hover ────────────────────────────────────

function NavLink({ href, children }: { href: string; children: string }) {
  const topRef  = useRef<HTMLSpanElement>(null);
  const botRef  = useRef<HTMLSpanElement>(null);
  const tlRef   = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { if (botRef.current) botRef.current.style.visibility = "hidden"; return; }
    tlRef.current = gsap.timeline({ paused: true })
      .to(topRef.current, { y: "-100%", opacity: 0, duration: 0.28, ease: "power2.inOut" }, 0)
      .fromTo(botRef.current, { y: "100%", opacity: 0 }, { y: "0%", opacity: 1, duration: 0.28, ease: "power2.inOut" }, 0);
    return () => { tlRef.current?.kill(); };
  }, []);

  return (
    <Link
      href={navigationHref(href)}
      className="relative inline-flex overflow-hidden px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors"
      onMouseEnter={() => tlRef.current?.play()}
      onMouseLeave={() => tlRef.current?.reverse()}
    >
      <span ref={topRef}  className="block text-[13.5px] font-medium text-stone-600 leading-none">{children}</span>
      <span ref={botRef}  className="absolute inset-x-3 text-[13.5px] font-medium text-stone-900 leading-none" aria-hidden>{children}</span>
    </Link>
  );
}

// ─── GSAP Trigger button — slide-up text on hover ────────────────────────────

function TriggerButton({
  label,
  active,
  onEnter,
  onActivate,
}: {
  label: string;
  active: boolean;
  onEnter: () => void;
  onActivate: () => void;
}) {
  const topRef = useRef<HTMLSpanElement>(null);
  const botRef = useRef<HTMLSpanElement>(null);
  const tlRef  = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { if (botRef.current) botRef.current.style.visibility = "hidden"; return; }
    tlRef.current = gsap.timeline({ paused: true })
      .to(topRef.current,  { y: "-100%", opacity: 0, duration: 0.28, ease: "power2.inOut" }, 0)
      .fromTo(botRef.current, { y: "100%", opacity: 0 }, { y: "0%", opacity: 1, duration: 0.28, ease: "power2.inOut" }, 0);
    return () => { tlRef.current?.kill(); };
  }, []);

  return (
    <button
      type="button"
      onClick={onActivate}
      onMouseEnter={() => { tlRef.current?.play(); onEnter(); }}
      onMouseLeave={() => { if (!active) tlRef.current?.reverse(); }}
      className={`relative inline-flex items-center gap-0.5 overflow-hidden px-3 py-1.5 rounded-md transition-colors text-[13.5px] font-medium ${active ? "bg-stone-100/80" : "hover:bg-stone-100/80"}`}
      aria-expanded={active}
      aria-controls="navigation-panel"
    >
      <span ref={topRef}  className="block text-stone-600 leading-none">{label}</span>
      <span ref={botRef}  className="absolute left-3 text-stone-900 leading-none" aria-hidden>{label}</span>
      <ChevronDown
        className={`size-3.5 text-stone-400 ml-0.5 transition-transform duration-300 ease-out ${active ? "rotate-180" : ""}`}
      />
    </button>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  CreditCard, FileText, Users, BarChart3, Package, Target, HeadphonesIcon,
  Building2, ShoppingBag, Factory, Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen, Send, ClipboardCheck, Settings,
  HelpCircle, LayoutDashboard, UserCircle, Rocket, Globe, Calendar, Mail, Award, Zap
};

export function Navbar({ authenticated = false, dict }: { authenticated?: boolean, dict?: any }) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mobileMenuOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [mobileMenuOpen]);

  // Animar el panel con GSAP cuando cambia activeMenu
  const rawMenus = dict?.menus || menus;
  const currentMenu = activeMenu ? rawMenus[activeMenu] : null;

  const animatePanel = useCallback((show: boolean) => {
    if (!panelRef.current) return;
    gsap.killTweensOf(panelRef.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { gsap.set(panelRef.current, { display: show ? "block" : "none", opacity: show ? 1 : 0, y: 0 }); return; }
    if (show) {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: -8, display: "block" },
        { opacity: 1, y: 0, duration: 0.22, ease: "power3.out" }
      );
    } else {
      gsap.to(panelRef.current, {
        opacity: 0,
        y: -6,
        duration: 0.18,
        ease: "power2.in",
        onComplete: () => {
          if (panelRef.current) panelRef.current.style.display = "none";
        },
      });
    }
  }, []);

  // Sincronizar animación con estado
  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeMenu && !prevActiveRef.current) {
      // Abrir
      animatePanel(true);
    } else if (!activeMenu && prevActiveRef.current) {
      // Cerrar
      animatePanel(false);
    }
    prevActiveRef.current = activeMenu;
  }, [activeMenu, animatePanel]);

  // Inicializar panel como oculto
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.style.display = "none";
    return () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      if (panel) gsap.killTweensOf(panel);
    };
  }, []);

  const handleEnter = (key: string) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setActiveMenu(key);
  };

  const handleLeave = () => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    if (navigationRef.current?.contains(document.activeElement)) return;
    hideTimeout.current = setTimeout(() => setActiveMenu(null), 120);
  };

  return (
    <div
      ref={navigationRef}
      className={navbarPosition}
      onMouseLeave={handleLeave}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setActiveMenu(null);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        const trigger = navigationRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        setActiveMenu(null);
        trigger?.focus();
      }}
    >
      {/* Barra */}
      <div className={`${navbarBar} ${(activeMenu || mobileMenuOpen) ? "rounded-b-none" : "rounded-b-2xl"}`}>

        {/* LEFT */}
        <div className="flex items-center gap-6">
          <BrandLink variant="navbar" />

          <nav className="hidden md:flex items-center gap-0.5">
            {(["compradores","fundadores", "recursos"] as const).map((key) => (
              <TriggerButton
                key={key}
                label={rawMenus[key]?.heading || (key === "compradores" ? "Para compradores" : key === "fundadores" ? "Para fundadores" : "Recursos")}
                active={activeMenu === key}
                onEnter={() => handleEnter(key)}
                onActivate={() => handleEnter(key)}
              />
            ))}
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          <Link href="/comunidad" aria-label="Listas de la comunidad" title="Comunidad" onClick={()=>{setActiveMenu(null);setMobileMenuOpen(false);}} className="group flex size-10 shrink-0 items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-[#EEE5F5] hover:text-[#7753A5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7753A5]"><CommunityIcon className="size-[23px]"/></Link>
          <NavbarSearch onOpen={()=>{setActiveMenu(null);setMobileMenuOpen(false);}} />
          
          <div className="hidden md:flex items-center gap-2">
            <NavLink href={authenticated ? "/account" : "/sign-in"}>{authenticated ? (dict?.dashboard || "Ir a mi panel") : (dict?.login || "Entrar")}</NavLink>
            <Link
              href="/newsletter"
              style={actionButtonStyle} className="inline-flex items-center action-button text-[13.5px] font-medium px-4 py-1.5 rounded-full transition-colors duration-200"
            >
              {dict?.subscribe || "Suscribirse"} <span className="button-arrow" aria-hidden="true">→</span>
            </Link>
          </div>

          <button 
            type="button" 
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="md:hidden p-2 rounded-md text-stone-600 hover:bg-stone-100/80 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Panel megamenu — controlado por GSAP (Desktop) */}
      <div
        id="navigation-panel"
        ref={panelRef}
        onClick={(event) => {
          if (event.target instanceof Element && event.target.closest("a")) setActiveMenu(null);
        }}
        className="hidden md:block max-w-7xl mx-auto bg-white border border-t-0 border-stone-200/70 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.14)] rounded-b-2xl overflow-hidden"
        onMouseEnter={() => { if (hideTimeout.current) clearTimeout(hideTimeout.current); }}
      >
        {currentMenu && (
          <div className="flex gap-0 p-6">
            {/* Columnas */}
            <div className="flex gap-8 flex-1">
              {currentMenu.columns.filter((col: any)=>col.links.some((link: any)=>availableNavigation(link.href))).map((col: any) => (
                <div key={col.heading} className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3 px-1">
                    {col.heading}
                  </p>
                  <ul className="space-y-0.5">
                    {col.links.filter((link: any)=>availableNavigation(link.href)).map((item: any) => {
                      const Icon = typeof item.icon === "string" ? iconMap[item.icon] : item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={navigationHref(item.href)}
                            className="group/item flex items-start gap-2.5 px-1.5 py-2 rounded-lg hover:bg-stone-50 transition-colors"
                          >
                            <div style={getAccentStyle(item.href)} className="size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="size-3.5" />
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

            {/* Featured */}
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

      {/* Mobile Menu Panel */}
      <div id="mobile-navigation" inert={!mobileMenuOpen}
        className={`md:hidden absolute top-[52px] inset-x-4 bg-white border border-t-0 border-stone-200/70 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.14)] rounded-b-2xl overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? "max-h-[85vh] opacity-100" : "max-h-0 opacity-0 border-transparent"}`}
      >
        <div className="overflow-y-auto max-h-[85vh] px-6 py-4 flex flex-col gap-6">
          {/* Cuenta & Suscribirse (Mobile) */}
          <div className="flex flex-col gap-3 pb-4 border-b border-stone-100">
            <Link href={authenticated ? "/account" : "/sign-in"} className="action-button inline-flex items-center justify-center rounded-lg bg-stone-100 px-4 py-2.5 text-[15px] font-medium text-stone-700 hover:bg-stone-200" onClick={() => setMobileMenuOpen(false)}>{authenticated ? (dict?.dashboard || "Ir a mi panel") : (dict?.login || "Entrar")}</Link>
            <Link href="/newsletter" style={actionButtonStyle} className="action-button inline-flex items-center justify-center text-[15px] font-medium px-4 py-2.5 rounded-lg" onClick={() => setMobileMenuOpen(false)}>{dict?.subscribe || "Suscribirse"} <span className="button-arrow" aria-hidden="true">→</span></Link>
          </div>

          {/* Accordions */}
          {(["compradores", "fundadores", "recursos"] as const).map(key => {
            const menu = rawMenus[key];
            const isOpen = mobileAccordion === key;
            return (
              <div key={key} className="border-b border-stone-100 pb-4 last:border-0">
                <button 
                  onClick={() => setMobileAccordion(isOpen ? null : key)}
                  className="flex items-center justify-between w-full text-[16px] font-semibold text-stone-900 mb-2"
                >
                  {rawMenus[key]?.heading || (key === "compradores" ? "Para compradores" : key === "fundadores" ? "Para fundadores" : "Recursos")}
                  <ChevronDown className={`size-4 text-stone-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                
                {/* Expanded Content */}
                <div inert={!isOpen} className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[1500px] mt-5" : "max-h-0"}`}>
                  <div className="flex flex-col gap-6">
                    {menu.columns.filter((col: any)=>col.links.some((link: any)=>availableNavigation(link.href))).map((col: any) => (
                      <div key={col.heading}>
                        <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-3">{col.heading}</p>
                        <div className="flex flex-col gap-4">
                          {col.links.filter((link: any)=>availableNavigation(link.href)).map((link: any) => {
                            const Icon = typeof link.icon === "string" ? iconMap[link.icon] : link.icon;
                            return (
                              <Link key={link.href} href={navigationHref(link.href)} className="flex items-start gap-3" onClick={() => setMobileMenuOpen(false)}>
                                <div style={getAccentStyle(link.href)} className="size-7 rounded-lg flex items-center justify-center shrink-0">
                                  <Icon className="size-3.5" />
                                </div>
                                <div>
                                  <p className="text-[14px] font-medium text-stone-800 leading-none mb-1">{link.label}</p>
                                  <p className="text-[12px] text-stone-500 leading-tight">{link.desc}</p>
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          
        </div>
      </div>

    </div>
  );
}
