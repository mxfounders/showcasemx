import Link from "next/link";

const footerColumns = [
  {
    heading: "Para compradores",
    links: [
      { label: "Cobros y cobranza",          href: "/explorar/cobros" },
      { label: "Contratos y firma digital",   href: "/explorar/contratos" },
      { label: "Nómina y compliance",         href: "/explorar/nomina" },
      { label: "Visibilidad financiera",      href: "/explorar/finanzas" },
      { label: "Inventario y supply chain",   href: "/explorar/inventario" },
      { label: "Ventas y CRM",                href: "/explorar/ventas" },
      { label: "Atención al cliente",         href: "/explorar/soporte" },
    ],
  },
  {
    heading: "Por industria",
    links: [
      { label: "Agencias y consultoras",      href: "/industria/agencias" },
      { label: "Retail y e-commerce",         href: "/industria/retail" },
      { label: "Manufactura",                 href: "/industria/manufactura" },
      { label: "Despachos legales",           href: "/industria/legal" },
      { label: "Construcción",                href: "/industria/construccion" },
      { label: "Salud y clínicas",            href: "/industria/salud" },
      { label: "Educación y EdTech",          href: "/industria/educacion" },
    ],
  },
  {
    heading: "Para fundadores",
    links: [
      { label: "Cómo aplicar",               href: "/aplicar" },
      { label: "Criterios de entrada",        href: "/criterios" },
      { label: "Proceso de revisión",         href: "/proceso" },
      { label: "Dashboard de métricas",       href: "/dashboard/founder" },
      { label: "Leads corporativos",          href: "/leads" },
      { label: "Directorio de founders",      href: "/fundadores" },
      { label: "Founders destacados",         href: "/destacados" },
    ],
  },
  {
    heading: "Plataforma",
    links: [
      { label: "Explorar catálogo",           href: "/explorar" },
      { label: "Weekly Drops",                href: "/drops" },
      { label: "Colecciones curadas",         href: "/colecciones" },
      { label: "Essential Stack MX",          href: "/colecciones/essential" },
      { label: "CFO Toolkit",                 href: "/colecciones/cfo" },
      { label: "Buscador IA",                 href: "/buscar" },
      { label: "Preguntas frecuentes",        href: "/faq" },
    ],
  },
  {
    heading: "Compañía",
    links: [
      { label: "El Proyecto",                 href: "/el-proyecto" },
      { label: "Newsletter semanal",          href: "/newsletter" },
      { label: "Eventos y networking",        href: "/eventos" },
      { label: "Contacto",                    href: "/contacto" },
      { label: "Trabaja con nosotros",        href: "/careers" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Aviso de privacidad",         href: "/privacidad" },
      { label: "Términos de uso",             href: "/terminos" },
      { label: "Política de cookies",         href: "/cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="px-4 pb-4 mt-16">
      <div className="max-w-7xl mx-auto bg-white rounded-t-2xl border border-b-0 border-stone-200/70 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.04)]">

        {/* Top: Logo + columns */}
        <div className="px-10 pt-10 pb-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <div className="size-[22px] rounded-[5px] bg-stone-900 flex items-center justify-center">
              <div className="size-2.5 rounded-[2px] bg-white/90" />
            </div>
            <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">showcasemx</span>
          </div>

          {/* Columns grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {footerColumns.map((col) => (
              <div key={col.heading}>
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3">
                  {col.heading}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-[13px] text-stone-500 hover:text-stone-900 transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-stone-100 mx-10" />

        {/* Bottom: copyright + social */}
        <div className="px-10 py-5 flex items-center justify-between">
          <p className="text-[12px] text-stone-400">
            © {new Date().getFullYear()} ShowcaseMX. Hecho en México.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://x.com/showcasemx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-stone-400 hover:text-stone-700 transition-colors"
            >
              X / Twitter
            </Link>
            <Link
              href="https://linkedin.com/company/showcasemx"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12px] text-stone-400 hover:text-stone-700 transition-colors"
            >
              LinkedIn
            </Link>
            <Link
              href="/newsletter"
              className="text-[12px] text-stone-400 hover:text-stone-700 transition-colors"
            >
              Newsletter
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
