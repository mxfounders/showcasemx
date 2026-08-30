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
  ClipboardCheck, HelpCircle, Settings, Zap,
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
      <span className="relative overflow-hidden inline-flex h-[1.1em]">
        <span ref={topRef} className="block text-[13px] text-stone-500 leading-none whitespace-nowrap">{label}</span>
        <span ref={botRef} className="absolute top-0 left-0 text-[13px] text-stone-900 font-medium leading-none whitespace-nowrap" aria-hidden>{label}</span>
      </span>
    </Link>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="px-4 pb-4 mt-24">
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
            © {new Date().getFullYear()} ShowcaseMX · Hecho en México 🇲🇽
          </p>
          <div className="flex items-center gap-5">
            {[
              { label: "X / Twitter", href: "https://x.com/showcasemx" },
              { label: "LinkedIn",    href: "https://linkedin.com/company/showcasemx" },
              { label: "GitHub",      href: "https://github.com/mxfounders" },
            ].map((s) => (
              <Link
                key={s.href}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-stone-400 hover:text-stone-700 transition-colors"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
