"use client";

import Link from "next/link";
import { navigationHref,availableNavigation } from "@/lib/navigation-destinations";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import { actionButtonStyle, getAccentStyle } from "@/lib/brand-colors";
import { BrandLink } from "./navigation/brand-link";
import {
  CreditCard, FileText, Users, BarChart3, Package,
  Target, HeadphonesIcon, Building2, ShoppingBag, Factory,
  Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen,
  Send, LayoutDashboard, UserCircle, Rocket,
  Globe, Calendar, Mail, Award,
  ClipboardCheck, HelpCircle, Settings, Zap
} from "lucide-react";
import { LanguageSelector } from "./language-selector";

// ─── Datos ────────────────────────────────────────────────────────────────────

const footerSections = [
  {
    heading: "Para compradores",
    cols: [
      {
        subheading: "Por problema",
        links: [
          { icon: CreditCard,     label: "Cobros y cobranza",         href: "/explorar/cobros" },
          { icon: FileText,       label: "Contratos digitales",       href: "/explorar/contratos" },
          { icon: Users,          label: "Nómina y compliance",       href: "/explorar/nomina" },
          { icon: BarChart3,      label: "Visibilidad financiera",    href: "/explorar/finanzas" },
          { icon: Package,        label: "Inventario y supply",       href: "/explorar/inventario" },
          { icon: Target,         label: "Ventas y CRM",              href: "/explorar/ventas" },
          { icon: HeadphonesIcon, label: "Atención al cliente",       href: "/explorar/soporte" },
        ],
      },
      {
        subheading: "Por industria",
        links: [
          { icon: Building2,    label: "Agencias",                  href: "/industria/agencias" },
          { icon: ShoppingBag,  label: "Retail y e-commerce",       href: "/industria/retail" },
          { icon: Factory,      label: "Manufactura",               href: "/industria/manufactura" },
          { icon: Scale,        label: "Despachos legales",         href: "/industria/legal" },
          { icon: HardHat,      label: "Construcción",              href: "/industria/construccion" },
          { icon: Heart,        label: "Salud y clínicas",          href: "/industria/salud" },
          { icon: GraduationCap,label: "Educación",                 href: "/industria/educacion" },
        ],
      },
      {
        subheading: "Tu selección",
        links: [
          { icon: Layers,     label: "Essential Stack MX",        href: "/colecciones/essential" },
          { icon: Briefcase,  label: "CFO Toolkit",               href: "/colecciones/cfo" },
          { icon: TrendingUp, label: "Agencia en 30 días",        href: "/colecciones/agencia" },
          { icon: BookOpen,   label: "Stack legal moderno",       href: "/colecciones/legal" },
        ],
      },
    ],
  },
  {
    heading: "Para fundadores",
    cols: [
      {
        subheading: "Entrar al catálogo",
        links: [
          { icon: Send,           label: "Cómo aplicar",             href: "/aplicar" },
          { icon: ClipboardCheck, label: "Criterios de entrada",     href: "/criterios" },
          { icon: Settings,       label: "Proceso de revisión",      href: "/proceso" },
          { icon: HelpCircle,     label: "Preguntas frecuentes",     href: "/faq" },
        ],
      },
      {
        subheading: "Tu presencia",
        links: [
          { icon: LayoutDashboard,label: "Mis soluciones",    href: "/account/solutions" },
          { icon: Target,         label: "Oportunidades",       href: "/leads" },
          { icon: UserCircle,     label: "Tu cuenta",    href: "/account/settings" },
          { icon: Rocket,         label: "Weekly Drops",             href: "/drops" },
        ],
      },
      {
        subheading: "Novedades",
        links: [
          { icon: Globe,    label: "Directorio de founders",    href: "/fundadores" },
          { icon: Calendar, label: "Eventos y networking",      href: "/eventos" },
          { icon: Mail,     label: "Newsletter",        href: "/newsletter" },
          { icon: Award,    label: "Founders destacados",       href: "/destacados" },
        ],
      },
    ],
  },
  {
    heading: "Plataforma",
    cols: [
      {
        subheading: "",
        links: [
          { icon: Zap,          label: "Buscar proyectos",               href: "/buscar" },
          { icon: Rocket,       label: "Weekly Drops",              href: "/drops" },
          { icon: Layers,       label: "Listas de la comunidad",    href: "/comunidad" },
          { icon: Globe,        label: "Explorar catálogo",         href: "/explorar" },
          { icon: Target,       label: "El Proyecto",               href: "/el-proyecto" },
          { icon: BookOpen,     label: "Blog",                      href: "/blog" },
          { icon: Rocket,       label: "Changelog",                 href: "/changelog" },
          { icon: Mail,         label: "Contacto",                  href: "/contacto" },
          { icon: Mail,         label: "Newsletter",                href: "/newsletter" },
          { icon: Calendar,     label: "Eventos",                   href: "/eventos" },
        ],
      },
    ],
  },
  {
    heading: "Legal",
    cols: [
      {
        subheading: "",
        links: [
          { icon: FileText,  label: "Aviso de privacidad",       href: "/privacidad" },
          { icon: BookOpen,  label: "Términos de uso",           href: "/terminos" },
          { icon: Settings,  label: "Política de cookies",       href: "/cookies" },
        ],
      },
    ],
  },
];

// ─── FooterLink con GSAP slide-up ─────────────────────────────────────────────

function FooterLink({ href, label, icon: Icon, locale }: {
  href: string;
  label: string;
  icon: React.ElementType;
  locale: string;
}) {
  const topRef = useRef<HTMLSpanElement>(null);
  const botRef = useRef<HTMLSpanElement>(null);
  const tlRef  = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    tlRef.current = gsap.timeline({ paused: true })
      .to(topRef.current,  { y: "-100%", opacity: 0, duration: 0.26, ease: "power2.inOut" }, 0)
      .fromTo(botRef.current, { y: "100%", opacity: 0 }, { y: "0%", opacity: 1, duration: 0.26, ease: "power2.inOut" }, 0);
    return () => { tlRef.current?.kill(); };
  }, []);

  return (
    <Link
      href={navigationHref(href,locale)}
      className="group flex items-center gap-2.5 py-1.5 rounded-lg"
      onMouseEnter={() => tlRef.current?.play()}
      onMouseLeave={() => tlRef.current?.reverse()}
    >
      {/* Icono */}
      <div style={getAccentStyle(href)} className="size-6 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
        <Icon className="size-3" />
      </div>
      {/* Texto con slide-up */}
      <span className="relative overflow-hidden inline-flex h-[1.2em] pr-1">
        <span ref={topRef} className="block text-[13px] font-medium text-stone-500 leading-none whitespace-nowrap">{label}</span>
        <span ref={botRef} className="absolute top-0 left-0 text-[13px] font-medium text-stone-900 leading-none whitespace-nowrap" aria-hidden>{label}</span>
      </span>
    </Link>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────


const iconMap: Record<string, React.ElementType> = {
  CreditCard, FileText, Users, BarChart3, Package, Target, HeadphonesIcon,
  Building2, ShoppingBag, Factory, Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen, Send, ClipboardCheck, Settings,
  HelpCircle, LayoutDashboard, UserCircle, Rocket, Globe, Calendar, Mail, Award, Zap
};

export function Footer({ dict, locale = 'es' }: { dict?: any, locale?: string }) {
  return (
    <footer className="px-4 mt-24">
      <div className="max-w-7xl mx-auto bg-white rounded-t-2xl border border-b-0 border-stone-200/70 shadow-[0_-4px_32px_-4px_rgba(0,0,0,0.06)]">

        {/* Top — Logo + tagline */}
        <div className="px-6 md:px-12 pt-8 md:pt-12 pb-8 border-b border-stone-100">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div>
              <div className="mb-3"><BrandLink variant="navbar" locale={locale} /></div>
              <p className="text-[13.5px] text-stone-400 leading-relaxed max-w-xs">
                {dict?.description || "Software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con quienes los construyen."}
              </p>
              <Link href={`/${locale}/contacto`} className="group mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-stone-600 transition-colors hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#365DC4]">
                hola@shwcs.site <span className="button-arrow text-[#365DC4]" aria-hidden="true">→</span>
              </Link>
            </div>
            <Link
              href={`/${locale}/newsletter`}
              style={actionButtonStyle} className="inline-flex w-full items-center justify-center gap-2 action-button text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors duration-200 md:w-auto"
            >
              <Mail className="size-3.5" />
              {dict?.newsletter || "Suscribirse al newsletter"} <span className="button-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        {/* Mega grid de columnas */}
        <div className="px-6 md:px-12 py-8 md:py-10">
          {(dict?.sections || footerSections).map((section: any) => (
            <div key={section.heading} className="mb-10 last:mb-0">
              {/* Heading de sección */}
              <p className="text-[10.5px] font-bold text-stone-900 uppercase tracking-[0.15em] mb-5 pb-2 border-b border-stone-100">
                {section.heading}
              </p>

              {/* Sub-columnas */}
              <div className={`grid gap-8 grid-cols-1 sm:grid-cols-2 ${section.cols.length === 3 ? "md:grid-cols-3" : section.cols.length === 1 ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
                {section.cols.filter((col: any)=>col.links.some((link: any)=>availableNavigation(link.href))).map((col: any, ci: number) => (
                  <div key={ci}>
                    {col.subheading && (
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
                        {col.subheading}
                      </p>
                    )}
                    <ul className="space-y-0.5">
                      {col.links.filter((link: any)=>availableNavigation(link.href)).map((link: any) => (
                        <li key={link.href}>
                          <FooterLink
                            href={link.href}
                            label={link.label}
                            icon={typeof link.icon === "string" ? iconMap[link.icon] : link.icon}
                            locale={locale}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-stone-100 mx-6 md:mx-12" />
        <div className="px-6 md:px-12 py-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            <p className="text-[12px] text-stone-400 text-center md:text-left">
              © {new Date().getFullYear()} shwcs
            </p>
            <div className="h-3 w-px bg-stone-300 hidden sm:block" />
            <p className="text-[12px] text-stone-400 text-center md:text-left">
              Powered by <a href="https://flouvia.com" target="_blank" rel="noopener noreferrer" className="hover:text-stone-900 underline underline-offset-2 transition-colors">flouvia</a>
            </p>
            <div className="h-3 w-px bg-stone-300 hidden sm:block" />
            <LanguageSelector />
          </div>
          <div className="flex items-center justify-center gap-5">
            <Link
              href="https://x.com/shwcshq"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-900 transition-colors"
              aria-label="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
