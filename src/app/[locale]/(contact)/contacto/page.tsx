import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Mail } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contacto | shwcs",
  description: "Cuéntanos qué quieres resolver, construir o proponer.",
};

import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/config";

export default async function ContactPage({params}:{params:Promise<{locale:string}>}) {
const {locale} = await params;
const dict = await getDictionary(locale as Locale);
const t = dict.contacto;
  return <div className="min-h-svh lg:grid lg:h-svh lg:grid-cols-[minmax(420px,44%)_minmax(0,1fr)] lg:overflow-hidden">
    <aside className="flex h-32 items-center bg-[#365DC4] px-6 text-white sm:h-36 sm:px-10 lg:mx-0 lg:my-6 lg:block lg:h-[calc(100svh-48px)] lg:overflow-hidden lg:rounded-l-none lg:rounded-r-[28px] lg:px-12 lg:py-12">
      <div className="flex h-full flex-col justify-center lg:justify-normal"><Link href="/" aria-label="shwcs, volver al inicio" className="w-fit rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Image src="/brand/shwcs-logo-white.png" width={961} height={298} alt="" className="h-7 w-auto sm:h-8" priority /></Link>
        <div className="my-auto hidden py-10 lg:block"><h1 className="text-[38px] font-semibold leading-[1.04] tracking-[-0.05em] xl:text-[46px]"><span className="block whitespace-nowrap">{t?.heroTitle1 || "Hay algo que quieres resolver."}</span><span className="block whitespace-nowrap">{t?.heroTitle2 || "Empecemos por ahí."}</span></h1><p className="mt-6 max-w-lg text-base leading-relaxed text-white/65">{t?.heroDesc || "Ya sea que buscas una solución, construyes una o quieres colaborar, danos el contexto para llevar la conversación al lugar correcto."}</p><ul className="mt-9 space-y-3 text-sm text-white/70">{(t?.bullets || ['Tu mensaje llega directamente al equipo.', 'No te suscribimos al newsletter.', 'Tus datos se usan únicamente para responder.']).map(item => <li key={item} className="flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full bg-white/10"><Check className="size-3.5" aria-hidden="true" /></span>{item}</li>)}</ul></div>
        <Link href="mailto:contacto@shwcs.site" className="group hidden w-fit items-center gap-3 text-sm text-white/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:flex"><Mail className="size-4" aria-hidden="true" />contacto@shwcs.site<ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" aria-hidden="true" /></Link>
      </div>
    </aside>
    <section className="flex min-h-[calc(100svh-8rem)] items-start justify-center px-5 py-10 sm:min-h-[calc(100svh-9rem)] sm:px-10 sm:py-12 lg:h-svh lg:min-h-0 lg:items-center lg:overflow-y-auto lg:px-12 lg:py-16 xl:px-20"><ContactForm dict={t?.form} /></section>
  </div>;
}
