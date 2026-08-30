import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <div className="fixed top-6 inset-x-0 z-50 flex justify-center px-4">
      <nav className="flex items-center justify-between w-full max-w-6xl px-4 py-2.5 bg-background/60 backdrop-blur-xl border border-white/[0.08] rounded-full shadow-sm">
        {/* Logo & Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="size-6 bg-gradient-to-tr from-zinc-400 to-zinc-100 rounded-sm rotate-3 transition-transform group-hover:rotate-6" />
            <span className="font-medium tracking-tight text-foreground">ShowcaseMX</span>
          </Link>
          
          {/* Main Links - Hidden on Mobile */}
          <div className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            <Link href="/explorar" className="hover:text-zinc-100 transition-colors">Explorar</Link>
            <Link href="/categorias" className="hover:text-zinc-100 transition-colors">Categorías</Link>
            <Link href="/fundadores" className="hover:text-zinc-100 transition-colors">Fundadores</Link>
            <Link href="/manifiesto" className="hover:text-zinc-100 transition-colors">Manifiesto</Link>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-4">
          {/* Search trigger (stealth aesthetic) */}
          <button className="hidden lg:flex items-center gap-3 px-3 py-1.5 text-[13px] text-zinc-400 bg-zinc-900/50 border border-white/[0.05] rounded-full hover:bg-zinc-800 transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Buscar solución...</span>
            <kbd className="pointer-events-none inline-flex h-5 items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" className="rounded-full hidden sm:inline-flex text-[13px] text-zinc-300 hover:text-white hover:bg-zinc-800/50">
              Acceso
            </Button>
            <Button className="rounded-full bg-zinc-100 text-zinc-900 hover:bg-white font-medium text-[13px] shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              Aplicar al catálogo
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}
