import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLink } from '@/components/navigation/brand-link';
export default function FocusedLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-col">
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10 sm:py-8">
      <BrandLink />
      <Link href="/#catalogo" className="group inline-flex items-center gap-2 rounded-full py-2 text-xs text-stone-500 transition-colors hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:text-sm"><ArrowLeft aria-hidden="true" className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none" /><span className="sm:hidden">Catálogo</span><span className="hidden sm:inline">Volver al catálogo</span></Link>
    </header>
    <main id="main-content" className="flex-1">{children}</main>
  </div>;
}
