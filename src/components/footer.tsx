"use client";

import Link from "next/link";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import {
  CreditCard, FileText, Users, BarChart3, Package,
  Target, HeadphonesIcon, Building2, ShoppingBag, Factory,
  Scale, HardHat, Heart, GraduationCap,
  Layers, Briefcase, TrendingUp, BookOpen,
  Send, LayoutDashboard, UserCircle, Rocket,
  Globe, Calendar, Mail, Award,
  ClipboardCheck, HelpCircle, Settings, Zap
} from "lucide-react";

// ─── Datos ────────────────────────────────────────────────────────────────────

const footerSections = [
  {
    heading: "Para compradores",
    cols: [
      {
        subheading: "Por problema",
        links: [
          { icon: CreditCard,     iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Cobros y cobranza",         href: "/explorar/cobros" },
          { icon: FileText,       iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Contratos digitales",       href: "/explorar/contratos" },
          { icon: Users,          iconBg: "bg-green-50",  iconColor: "text-green-500",  label: "Nómina y compliance",       href: "/explorar/nomina" },
          { icon: BarChart3,      iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Visibilidad financiera",    href: "/explorar/finanzas" },
          { icon: Package,        iconBg: "bg-pink-50",   iconColor: "text-pink-500",   label: "Inventario y supply",       href: "/explorar/inventario" },
          { icon: Target,         iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Ventas y CRM",              href: "/explorar/ventas" },
          { icon: HeadphonesIcon, iconBg: "bg-teal-50",   iconColor: "text-teal-500",   label: "Atención al cliente",       href: "/explorar/soporte" },
        ],
      },
      {
        subheading: "Por industria",
        links: [
          { icon: Building2,    iconBg: "bg-indigo-50", iconColor: "text-indigo-500", label: "Agencias",                  href: "/industria/agencias" },
          { icon: ShoppingBag,  iconBg: "bg-pink-50",   iconColor: "text-pink-500",   label: "Retail y e-commerce",       href: "/industria/retail" },
          { icon: Factory,      iconBg: "bg-stone-100", iconColor: "text-stone-600",  label: "Manufactura",               href: "/industria/manufactura" },
          { icon: Scale,        iconBg: "bg-amber-50",  iconColor: "text-amber-600",  label: "Despachos legales",         href: "/industria/legal" },
          { icon: HardHat,      iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Construcción",              href: "/industria/construccion" },
          { icon: Heart,        iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Salud y clínicas",          href: "/industria/salud" },
          { icon: GraduationCap,iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Educación",                 href: "/industria/educacion" },
        ],
      },
      {
        subheading: "Colecciones",
        links: [
          { icon: Layers,     iconBg: "bg-stone-100", iconColor: "text-stone-700", label: "Essential Stack MX",        href: "/colecciones/essential" },
          { icon: Briefcase,  iconBg: "bg-blue-50",   iconColor: "text-blue-600",  label: "CFO Toolkit",               href: "/colecciones/cfo" },
          { icon: TrendingUp, iconBg: "bg-green-50",  iconColor: "text-green-600", label: "Agencia en 30 días",        href: "/colecciones/agencia" },
          { icon: BookOpen,   iconBg: "bg-violet-50", iconColor: "text-violet-600",label: "Stack legal moderno",       href: "/colecciones/legal" },
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
          { icon: Send,           iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Cómo aplicar",             href: "/aplicar" },
          { icon: ClipboardCheck, iconBg: "bg-green-50",  iconColor: "text-green-500",  label: "Criterios de entrada",     href: "/criterios" },
          { icon: Settings,       iconBg: "bg-stone-100", iconColor: "text-stone-600",  label: "Proceso de revisión",      href: "/proceso" },
          { icon: HelpCircle,     iconBg: "bg-amber-50",  iconColor: "text-amber-500",  label: "Preguntas frecuentes",     href: "/faq" },
        ],
      },
      {
        subheading: "Tu presencia",
        links: [
          { icon: LayoutDashboard,iconBg: "bg-violet-50", iconColor: "text-violet-500", label: "Dashboard de métricas",    href: "/dashboard/founder" },
          { icon: Target,         iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "Leads corporativos",       href: "/leads" },
          { icon: UserCircle,     iconBg: "bg-blue-50",   iconColor: "text-blue-500",   label: "Tu perfil de producto",    href: "/perfil" },
          { icon: Rocket,         iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Weekly Drops",             href: "/drops" },
        ],
      },
      {
        subheading: "Comunidad",
        links: [
          { icon: Globe,    iconBg: "bg-teal-50",   iconColor: "text-teal-500",  label: "Directorio de founders",    href: "/fundadores" },
          { icon: Calendar, iconBg: "bg-pink-50",   iconColor: "text-pink-500",  label: "Eventos y networking",      href: "/eventos" },
          { icon: Mail,     iconBg: "bg-indigo-50", iconColor: "text-indigo-500",label: "Newsletter semanal",        href: "/newsletter" },
          { icon: Award,    iconBg: "bg-amber-50",  iconColor: "text-amber-500", label: "Founders destacados",       href: "/destacados" },
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
          { icon: Zap,          iconBg: "bg-yellow-50", iconColor: "text-yellow-500", label: "Buscador IA",               href: "/buscar" },
          { icon: Rocket,       iconBg: "bg-orange-50", iconColor: "text-orange-500", label: "Weekly Drops",              href: "/drops" },
          { icon: Layers,       iconBg: "bg-stone-100", iconColor: "text-stone-700",  label: "Colecciones curadas",       href: "/colecciones" },
          { icon: Globe,        iconBg: "bg-teal-50",   iconColor: "text-teal-500",   label: "Explorar catálogo",         href: "/explorar" },
          { icon: Target,       iconBg: "bg-red-50",    iconColor: "text-red-500",    label: "El Proyecto",               href: "/el-proyecto" },
          { icon: Mail,         iconBg: "bg-indigo-50", iconColor: "text-indigo-500", label: "Newsletter",                href: "/newsletter" },
          { icon: Calendar,     iconBg: "bg-pink-50",   iconColor: "text-pink-500",   label: "Eventos",                   href: "/eventos" },
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
          { icon: FileText,  iconBg: "bg-stone-100", iconColor: "text-stone-500", label: "Aviso de privacidad",       href: "/privacidad" },
          { icon: BookOpen,  iconBg: "bg-stone-100", iconColor: "text-stone-500", label: "Términos de uso",           href: "/terminos" },
          { icon: Settings,  iconBg: "bg-stone-100", iconColor: "text-stone-500", label: "Política de cookies",       href: "/cookies" },
        ],
      },
    ],
  },
];

// ─── FooterLink con GSAP slide-up ─────────────────────────────────────────────

function FooterLink({ href, label, icon: Icon, iconBg, iconColor }: {
  href: string;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
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
      href={href}
      className="group flex items-center gap-2.5 py-1.5 rounded-lg"
      onMouseEnter={() => tlRef.current?.play()}
      onMouseLeave={() => tlRef.current?.reverse()}
    >
      {/* Icono */}
      <div className={`size-6 rounded-md ${iconBg} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
        <Icon className={`size-3 ${iconColor}`} />
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

export function Footer() {
  return (
    <footer className="px-4 mt-24">
      <div className="max-w-7xl mx-auto bg-white rounded-t-2xl border border-b-0 border-stone-200/70 shadow-[0_-4px_32px_-4px_rgba(0,0,0,0.06)]">

        {/* Top — Logo + tagline */}
        <div className="px-12 pt-12 pb-8 border-b border-stone-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="size-[22px] rounded-[5px] bg-stone-900 flex items-center justify-center">
                  <div className="size-2.5 rounded-[2px] bg-white/90" />
                </div>
                <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">showcasemx</span>
              </div>
              <p className="text-[13.5px] text-stone-400 leading-relaxed max-w-xs">
                El catálogo de software B2B construido por operadores mexicanos. Solo herramientas con tracción real.
              </p>
            </div>
            <Link
              href="/newsletter"
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium px-5 py-2.5 rounded-full transition-colors duration-200"
            >
              <Mail className="size-3.5" />
              Suscribirse al newsletter →
            </Link>
          </div>
        </div>

        {/* Mega grid de columnas */}
        <div className="px-12 py-10">
          {footerSections.map((section) => (
            <div key={section.heading} className="mb-10 last:mb-0">
              {/* Heading de sección */}
              <p className="text-[10.5px] font-bold text-stone-900 uppercase tracking-[0.15em] mb-5 pb-2 border-b border-stone-100">
                {section.heading}
              </p>

              {/* Sub-columnas */}
              <div className={`grid gap-8 ${section.cols.length === 3 ? "grid-cols-3" : section.cols.length === 1 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"}`}>
                {section.cols.map((col, ci) => (
                  <div key={ci}>
                    {col.subheading && (
                      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">
                        {col.subheading}
                      </p>
                    )}
                    <ul className="space-y-0.5">
                      {col.links.map((link) => (
                        <li key={link.href}>
                          <FooterLink
                            href={link.href}
                            label={link.label}
                            icon={link.icon}
                            iconBg={link.iconBg}
                            iconColor={link.iconColor}
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
        <div className="border-t border-stone-100 mx-12" />
        <div className="px-12 py-6 flex items-center justify-between">
          <p className="text-[12px] text-stone-400">
            © {new Date().getFullYear()} ShowcaseMX · Hecho en México
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="https://x.com/showcasemx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-900 transition-colors"
              aria-label="X (Twitter)"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </Link>
            <Link
              href="https://linkedin.com/company/showcasemx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-900 transition-colors"
              aria-label="LinkedIn"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </Link>
            <Link
              href="https://github.com/mxfounders"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-stone-900 transition-colors"
              aria-label="GitHub"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
