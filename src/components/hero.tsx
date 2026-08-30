"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Search, CreditCard, Users, LayoutDashboard } from "lucide-react";

import { actionButtonStyle } from "@/lib/brand-colors";

export function Hero({ onSearch, onCategory }: { onSearch: (query: string) => void; onCategory: (id: string) => void }) {
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
              <span className="block whitespace-nowrap">Encuentra soluciones.</span>{" "}
              <span className="block whitespace-nowrap">Conoce a sus creadores.</span>
            </h1>
          </div>

          {/* Right: Copy */}
          <div className="max-w-[420px]">
            <p 
              ref={textRef}
              className="text-[17.5px] text-stone-600 leading-relaxed font-medium"
            >
              Descubre herramientas creadas en México para resolver los retos de tu empresa. En ShowcaseMX seleccionamos productos, te ayudamos a entender qué resuelven y te acercamos a quienes los construyen.
            </p>
          </div>
        </div>

        {/* BOTTOM ROW: Centered Search Bar */}
        <div className="flex flex-col items-center">
          <div ref={searchRef} className="w-full max-w-3xl relative group mb-8">
            {/* Glow effect */}
            <div className="pointer-events-none absolute -inset-1.5 bg-gradient-to-r from-stone-200 to-stone-100 rounded-full blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
            
            {/* Pill Search Box */}
            <form onSubmit={event => { event.preventDefault(); onSearch(String(new FormData(event.currentTarget).get("query") ?? "")); }} role="search" className="relative bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-stone-200/80 p-1.5 md:p-2.5 flex items-center gap-2 transition-shadow duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.1)] group-hover:border-stone-300/80">
              <label htmlFor="solution-search" className="sr-only">¿Qué necesitas resolver en tu empresa?</label>
              
              <div className="pl-3 md:pl-5 shrink-0">
                <Search aria-hidden="true" className="size-4 md:size-[20px] text-stone-400" />
              </div>
              
              <input
                id="solution-search"
                name="query"
                maxLength={200}
                type="text"
                placeholder="¿Qué necesitas resolver en tu empresa?"
                aria-describedby="solution-search-example"
                className="min-w-0 flex-1 bg-transparent border-none rounded-lg outline-none focus-visible:underline decoration-stone-300 underline-offset-8 text-[14px] md:text-[16px] text-stone-900 placeholder:text-stone-400 font-medium px-1 md:px-2 py-2 md:py-3 w-full text-ellipsis"
              />
              
              <button type="submit" style={actionButtonStyle} className="action-button h-10 md:h-12 px-5 md:px-8 rounded-full text-[13px] md:text-[14.5px] font-medium transition-colors flex items-center justify-center shrink-0">
                <span className="hidden sm:inline">Encontrar soluciones</span>
                <span className="sm:hidden">Buscar</span>
              </button>
            </form>
            <p id="solution-search-example" className="relative mt-4 px-2 text-center text-[13px] leading-relaxed text-stone-500">
              Prueba con “quiero cobrar a tiempo” o “necesito organizar mi nómina”.
            </p>
          </div>

          {/* Quick tags */}
          <div ref={tagsRef} className="flex items-center gap-3 text-[13px] font-medium text-stone-400 flex-wrap justify-center">
            <span>Explora:</span>
            <button type="button" onClick={() => onCategory("finanzas")} style={actionButtonStyle} className="action-button flex items-center gap-1.5 hover:brightness-95 px-3.5 py-1.5 rounded-full text-stone-600 transition-colors">
              <CreditCard className="size-3.5"/> Finanzas
            </button>
            <button type="button" onClick={() => onCategory("nomina")} style={actionButtonStyle} className="action-button flex items-center gap-1.5 hover:brightness-95 px-3.5 py-1.5 rounded-full text-stone-600 transition-colors">
              <Users className="size-3.5"/> Nómina
            </button>
            <button type="button" onClick={() => onCategory("ventas")} style={actionButtonStyle} className="action-button flex items-center gap-1.5 hover:brightness-95 px-3.5 py-1.5 rounded-full text-stone-600 transition-colors">
              <LayoutDashboard className="size-3.5"/> CRM
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
