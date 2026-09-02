"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Search, CreditCard, Users, LayoutDashboard } from "lucide-react";

import { actionButtonStyle, getAccentStyle } from "@/lib/brand-colors";

export function Hero({ onSearch, onCategory, dict }: { onSearch: (query: string) => void; onCategory: (id: string) => void; dict?: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tl = gsap.timeline();

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power4.out" }
    )
    .fromTo(
      textRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.6"
    )
    .fromTo(
      searchRef.current,
      { opacity: 0, y: 20, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
      "-=0.4"
    )
    .fromTo(
      tagsRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      "-=0.4"
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative pt-32 lg:pt-40 pb-20 px-6">
      <div className="max-w-5xl mx-auto w-full">
        
        {/* TOP ROW: Title Left, Text Right */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] items-end gap-8 lg:gap-12 mb-20">
          {/* Left: Typography */}
          <div className="min-w-0 [container-type:inline-size]">
            <h1 
              ref={titleRef}
              className="text-[clamp(1.25rem,8cqw,3.25rem)] leading-[1.05] tracking-[-0.03em] font-bold text-stone-900"
            >
              <span className="block whitespace-nowrap">{dict?.heroLine1 || "Encuentra soluciones."}</span>{" "}
              <span className="block whitespace-nowrap">{dict?.heroLine2 || "Conoce a sus creadores."}</span>
            </h1>
          </div>

          {/* Right: Copy */}
          <div className="max-w-[420px]">
            <p 
              ref={textRef}
              className="text-[17.5px] text-stone-600 leading-relaxed font-medium"
            >
              {dict?.heroDescription || "Descubre herramientas creadas en México para resolver los retos de tu empresa. En shwcs seleccionamos productos, te ayudamos a entender qué resuelven y te acercamos a quienes los construyen."}
            </p>
          </div>
        </div>

        {/* BOTTOM ROW: Centered Search Bar */}
        <div className="flex flex-col items-center">
          <div ref={searchRef} className="w-full max-w-3xl relative group mb-8">
            <div className="pointer-events-none absolute -inset-1.5 rounded-full bg-gradient-to-r from-stone-200 to-stone-100 opacity-40 blur-md transition duration-500 group-hover:opacity-70" />
            {/* Pill Search Box */}
            <form onSubmit={event => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") ?? "")); }} role="search" className="relative flex items-center gap-2 rounded-full border border-stone-200/80 bg-white p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-shadow duration-300 group-hover:border-stone-300/80 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] md:p-2.5">
              <label htmlFor="solution-search" className="sr-only">{dict?.heroSearchPlaceholder}</label>
              <div className="shrink-0 pl-3 md:pl-5"><Search aria-hidden="true" className="size-4 text-stone-400 md:size-[20px]" /></div>
              <input id="solution-search" name="query" maxLength={200} type="text" placeholder={dict?.heroSearchPlaceholder || "¿Qué necesitas resolver en tu empresa?"} aria-describedby="solution-search-example" className="min-w-0 flex-1 rounded-lg border-none bg-transparent px-1 py-2 text-[14px] font-medium text-stone-900 outline-none placeholder:text-stone-400 focus-visible:underline focus-visible:decoration-stone-300 focus-visible:underline-offset-8 md:w-full md:px-2 md:py-3 md:text-[16px]" />
              <button type="submit" style={actionButtonStyle} className="action-button flex h-10 shrink-0 items-center justify-center rounded-full px-5 text-[13px] font-medium md:h-12 md:px-8 md:text-[14.5px]"><span className="hidden sm:inline">{dict?.heroSearchButton || "Encontrar soluciones"}</span><span className="sm:hidden">{dict?.heroSearchButtonMobile || "Buscar"}</span></button>
            </form>
            <p id="solution-search-example" className="relative mt-4 px-2 text-center text-[13px] leading-relaxed text-stone-500">
              {dict?.heroSearchExample || "Prueba con “quiero cobrar a tiempo” o “necesito organizar mi nómina”."}
            </p>
          </div>

          {/* Quick tags */}
          <div ref={tagsRef} className="flex items-center gap-3 text-[13px] font-medium text-stone-400 flex-wrap justify-center">
            <span>{dict?.heroExplore || "Explora:"}</span>
            <button type="button" onClick={() => onCategory("finanzas")} style={getAccentStyle("/explorar/finanzas")} className="action-button flex items-center gap-1.5 hover:brightness-95 px-3.5 py-1.5 rounded-full text-stone-600 transition-colors">
              <CreditCard className="size-3.5"/> {dict?.heroExploreFinance || "Finanzas"}
            </button>
            <button type="button" onClick={() => onCategory("nomina")} style={getAccentStyle("/explorar/nomina")} className="action-button flex items-center gap-1.5 hover:brightness-95 px-3.5 py-1.5 rounded-full text-stone-600 transition-colors">
              <Users className="size-3.5"/> {dict?.heroExplorePayroll || "Nómina"}
            </button>
            <button type="button" onClick={() => onCategory("ventas")} style={getAccentStyle("/explorar/ventas")} className="action-button flex items-center gap-1.5 hover:brightness-95 px-3.5 py-1.5 rounded-full text-stone-600 transition-colors">
              <LayoutDashboard className="size-3.5"/> {dict?.heroExploreSales || "CRM"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
