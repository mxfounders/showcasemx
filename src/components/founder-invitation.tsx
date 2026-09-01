import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { actionButtonStyle } from "@/lib/brand-colors";
export function FounderInvitation() {
  return <section className="mx-auto max-w-[1544px] px-7 py-14 sm:px-11 lg:py-20">
    <div className="flex flex-col gap-6 border-t border-stone-300 pt-10 xl:flex-row xl:items-center xl:justify-between xl:gap-8">
      <div className="min-w-0">
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-900 sm:text-[32px] sm:leading-tight xl:whitespace-nowrap">¿Construyes algo que una empresa necesita?</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base">Postula tu software, agencia o servicio y cuéntanos qué resuelves y para quién.</p>
      </div>
      <div className="shrink-0 xl:text-right">
        <Link href="/account/solutions/new" style={actionButtonStyle} className="inline-flex items-center gap-3 rounded-full px-6 py-4 font-medium action-button transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Postular mi solución <ArrowUpRight aria-hidden="true" className="size-5" /></Link>
        <p className="mt-3 text-xs text-stone-500">La postulación no garantiza la publicación.</p>
      </div>
    </div>
  </section>;
}
