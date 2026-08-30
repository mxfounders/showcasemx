"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Sparkles, CreditCard, Users, LayoutDashboard, ArrowRight } from "lucide-react";
import Link from "next/link";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power4.out" }
    )
    .fromTo(
      textRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      "-=0.5"
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
    <div ref={containerRef} className="relative min-h-[82vh] flex flex-col justify-end pb-20 pt-32 px-6">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end">
        
        {/* Left: Huge Typography */}
        <div className="lg:col-span-7">
          <h1 
            ref={titleRef}
            className="text-[4.5rem] md:text-[6rem] lg:text-[6.5rem] leading-[0.9] tracking-[-0.04em] font-bold text-stone-900"
          >
            Software B2B<br />
            de grado<br />
            institucional.
          </h1>
        </div>

        {/* Right: Copy & Search */}
        <div className="lg:col-span-5 flex flex-col gap-8 lg:pb-3">
          <p 
            ref={textRef}
            className="text-[17px] text-stone-600 leading-relaxed font-medium max-w-md"
          >
            ShowcaseMX no es un directorio más. Es la boutique curada con la infraestructura operativa exacta que tu empresa necesita, seleccionada por operadores.
          </p>

          <div ref={searchRef} className="w-full relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-stone-200 to-stone-100 rounded-[1.25rem] blur-md opacity-40 group-hover:opacity-70 transition duration-500"></div>
            
            {/* Search Input Box */}
            <div className="relative bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-200/80 p-2 flex items-center gap-3 transition-shadow duration-300 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] group-hover:border-stone-300/80">
              <div className="size-11 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shrink-0">
                <Sparkles className="size-5 text-stone-400" />
              </div>
              <input
                type="text"
                placeholder="Ej: Necesito automatizar mis cobros..."
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-stone-900 placeholder:text-stone-400 font-medium px-1 w-full"
              />
              <button className="bg-stone-900 hover:bg-stone-800 text-white h-11 px-6 rounded-xl text-[14px] font-medium transition-colors flex items-center gap-2 shrink-0">
                Buscar
              </button>
            </div>
          </div>

          {/* Quick tags */}
          <div ref={tagsRef} className="flex items-center gap-4 text-[12.5px] font-medium text-stone-400">
            <span>Explora:</span>
            <div className="flex gap-2">
              <Link href="/explorar/finanzas" className="flex items-center gap-1.5 bg-stone-200/50 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg text-stone-600 transition-colors">
                <CreditCard className="size-3.5"/> Finanzas
              </Link>
              <Link href="/explorar/nomina" className="flex items-center gap-1.5 bg-stone-200/50 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg text-stone-600 transition-colors">
                <Users className="size-3.5"/> Nómina
              </Link>
              <Link href="/explorar/ventas" className="flex items-center gap-1.5 bg-stone-200/50 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg text-stone-600 transition-colors">
                <LayoutDashboard className="size-3.5"/> CRM
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
