import Link from "next/link";
import { Search } from "lucide-react";

export function Navbar() {
  return (
    <header className="w-full bg-white border-b border-stone-200/60">
      <div className="max-w-7xl mx-auto px-6 h-[52px] flex items-center justify-between gap-8">

        {/* LEFT: Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            {/* Logo mark: simple geometric square rotated */}
            <div className="size-[22px] rounded-[5px] bg-stone-900 flex items-center justify-center">
              <div className="size-2.5 rounded-[2px] bg-white/90" />
            </div>
            <span className="text-[15px] font-bold tracking-[-0.3px] text-stone-900">
              showcasemx
            </span>
          </Link>

          {/* Nav links — sin dropdowns, texto limpio */}
          <nav className="hidden md:flex items-center gap-0.5">
            {[
              { label: "Explorar",    href: "/explorar" },
              { label: "Soluciones",  href: "/soluciones" },
              { label: "Fundadores",  href: "/fundadores" },
              { label: "Manifiesto",  href: "/manifiesto" },
              { label: "Precios",     href: "/precios" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-[13.5px] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* RIGHT: ⌘K + Acceso + Ghost CTA + Solid CTA */}
        <div className="flex items-center gap-1">
          {/* ⌘K search shortcut */}
          <button className="hidden lg:flex items-center gap-2 text-stone-400 hover:text-stone-600 px-2 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors mr-2">
            <kbd className="font-sans text-[12px] font-medium text-stone-400">⌘</kbd>
            <kbd className="font-sans text-[12px] font-medium text-stone-400">K</kbd>
            <Search className="size-[13px]" />
          </button>

          {/* Acceso */}
          <Link
            href="/sign-in"
            className="text-[13.5px] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100/80 transition-colors"
          >
            Acceso
          </Link>

          {/* Ghost CTA */}
          <Link
            href="/demo"
            className="text-[13.5px] font-medium text-stone-700 hover:text-stone-900 border border-stone-300 hover:border-stone-400 px-4 py-1.5 rounded-full transition-colors"
          >
            Ver demo
          </Link>

          {/* Solid CTA */}
          <Link
            href="/aplicar"
            className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 active:bg-stone-950 text-white text-[13.5px] font-medium px-4 py-1.5 rounded-full transition-colors"
          >
            Aplicar al catálogo →
          </Link>
        </div>

      </div>
    </header>
  );
}
