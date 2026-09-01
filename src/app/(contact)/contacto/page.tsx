import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contacto | shwcs",
  description: "Cuéntanos qué quieres resolver, construir o proponer.",
};

export default function ContactPage() {
  return <div className="min-h-svh lg:grid lg:h-svh lg:grid-cols-[minmax(420px,44%)_minmax(0,1fr)] lg:overflow-hidden">
    <aside className="mx-3 mt-3 overflow-hidden rounded-[28px] bg-[#365DC4] px-7 py-8 text-white sm:mx-5 sm:mt-5 sm:px-10 sm:py-10 lg:mx-0 lg:my-6 lg:h-[calc(100svh-48px)] lg:rounded-l-none lg:rounded-r-[28px] lg:px-12 lg:py-12">
      <div className="flex h-full flex-col"><Link href="/" aria-label="shwcs, volver al inicio" className="w-fit rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Image src="/brand/shwcs-logo-white.png" width={961} height={298} alt="" className="h-7 w-auto sm:h-8" priority /></Link>
        <div className="my-auto py-16 lg:py-10"><h1 className="text-4xl font-semibold leading-[1.04] tracking-[-0.05em] sm:text-[42px] lg:text-[38px] xl:text-[46px]"><span className="block lg:whitespace-nowrap">Hay algo que quieres resolver.</span><span className="block lg:whitespace-nowrap">Empecemos por ahí.</span></h1><p className="mt-6 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">Ya sea que buscas una solución, construyes una o quieres colaborar, danos el contexto para llevar la conversación al lugar correcto.</p><ul className="mt-9 space-y-3 text-sm text-white/70">{['Tu mensaje llega directamente al equipo.', 'No te suscribimos al newsletter.', 'Tus datos se usan únicamente para responder.'].map(item => <li key={item} className="flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full bg-white/10"><Check className="size-3.5" aria-hidden="true" /></span>{item}</li>)}</ul></div>
        <Link href="mailto:contacto@shwcs.site" className="group flex w-fit items-center gap-3 text-sm text-white/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Mail className="size-4" aria-hidden="true" />contacto@shwcs.site<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" /></Link>
      </div>
    </aside>
    <section className="flex min-h-[720px] items-center justify-center px-5 py-16 sm:px-10 lg:h-svh lg:min-h-0 lg:overflow-y-auto lg:px-12 xl:px-20"><ContactForm /></section>
  </div>;
}
