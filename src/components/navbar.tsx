import Link from "next/link";
import { ChevronDown } from "lucide-react";

export function Navbar() {
  return (
    <header className="w-full bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-[15px] font-bold tracking-tight text-stone-900">
              showcasemx
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/explorar"
              className="flex items-center gap-0.5 text-[13.5px] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              Para compradores
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 mt-px" />
            </Link>
            <Link
              href="/aplicar"
              className="flex items-center gap-0.5 text-[13.5px] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
            >
              Para fundadores
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 mt-px" />
            </Link>
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Link
            href="/manifiesto"
            className="text-[13.5px] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            Manifiesto
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center gap-0.5 text-[13.5px] font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-stone-100 transition-colors"
          >
            Acceso
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 mt-px" />
          </Link>
          <Link
            href="/aplicar"
            className="ml-2 inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Aplicar al catálogo
            <span className="text-stone-400">→</span>
          </Link>
        </div>

      </div>
    </header>
  );
}
