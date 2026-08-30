import Link from "next/link";
import { Search } from "lucide-react";

// Componente de link con animación de texto que sube al hacer hover
function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group relative px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors overflow-hidden"
    >
      <span className="flex flex-col items-start text-[13.5px] font-medium leading-none">
        {/* Texto original — sube al hacer hover */}
        <span className="block text-stone-600 group-hover:text-stone-900 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0">
          {children}
        </span>
        {/* Copia — empieza abajo, sube al hacer hover */}
        <span
          aria-hidden="true"
          className="absolute inset-x-3 text-stone-900 translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100"
        >
          {children}
        </span>
      </span>
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4">
      <div className="max-w-7xl mx-auto bg-white rounded-b-2xl border border-t-0 border-stone-200/70 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] px-6 h-[52px] flex items-center justify-between gap-8">

        {/* LEFT: Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="size-[22px] rounded-[5px] bg-stone-900 flex items-center justify-center transition-transform duration-300 group-hover:rotate-6">
              <div className="size-2.5 rounded-[2px] bg-white/90" />
            </div>
            <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">
              showcasemx
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-0.5">
            <NavLink href="/explorar">Explorar</NavLink>
            <NavLink href="/soluciones">Soluciones</NavLink>
            <NavLink href="/fundadores">Fundadores</NavLink>
            <NavLink href="/manifiesto">Manifiesto</NavLink>
            <NavLink href="/precios">Precios</NavLink>
          </nav>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-1">
          {/* ⌘K */}
          <button className="hidden lg:flex items-center gap-1.5 text-stone-400 hover:text-stone-600 px-2 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors mr-1">
            <kbd className="font-sans text-[12px] font-medium">⌘</kbd>
            <kbd className="font-sans text-[12px] font-medium">K</kbd>
            <Search className="size-[13px]" />
          </button>

          {/* Acceso con animación también */}
          <NavLink href="/sign-in">Acceso</NavLink>

          {/* Ghost CTA */}
          <Link
            href="/demo"
            className="group text-[13.5px] font-medium text-stone-700 hover:text-stone-900 border border-stone-300 hover:border-stone-400 px-4 py-1.5 rounded-full transition-all duration-300 overflow-hidden relative"
          >
            <span className="flex flex-col items-center leading-none">
              <span className="block transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0">
                Ver demo
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-4 text-center translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100"
              >
                Ver demo
              </span>
            </span>
          </Link>

          {/* Solid CTA */}
          <Link
            href="/aplicar"
            className="group inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-medium px-4 py-1.5 rounded-full transition-colors overflow-hidden relative"
          >
            <span className="flex flex-col items-center leading-none">
              <span className="block transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:-translate-y-full group-hover:opacity-0">
                Aplicar al catálogo →
              </span>
              <span
                aria-hidden="true"
                className="absolute inset-x-4 text-center translate-y-full opacity-0 transition-all duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] group-hover:translate-y-0 group-hover:opacity-100"
              >
                Aplicar al catálogo →
              </span>
            </span>
          </Link>
        </div>

      </div>
    </header>
  );
}
