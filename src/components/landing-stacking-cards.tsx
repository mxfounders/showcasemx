"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { brandColors } from "@/lib/brand-colors";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stackData = [
  {
    id: "data",
    badge: "CATÁLOGO",
    title: "Obtén datos del marketplace más completo",
    description: "Un solo lugar para comparar más de 2,000 herramientas B2B. Crea señales de intención y toma decisiones basadas en datos reales de uso y presupuesto en Latinoamérica.",
    color: { soft: brandColors.blue.soft, solid: brandColors.blue.solid },
    button: "Explorar catálogo",
  },
  {
    id: "agents",
    badge: "RECOMENDACIONES",
    title: "Encuentra la aguja en el pajar al instante",
    description: "Nuestra IA analiza tu industria, tamaño y presupuesto para recomendarte el stack tecnológico exacto que usan las empresas más exitosas de tu sector.",
    color: { soft: brandColors.terracotta.soft, solid: brandColors.terracotta.solid },
    button: "Ver recomendaciones",
  },
  {
    id: "enrichment",
    badge: "GESTIÓN",
    title: "Centraliza el control de tus suscripciones",
    description: "Deja de pagar por licencias que nadie usa. Conecta tu stack y recibe alertas automáticas sobre gastos duplicados y renovaciones próximas.",
    color: { soft: brandColors.sage.soft, solid: brandColors.sage.solid },
    button: "Optimizar gastos",
  },
  {
    id: "outbound",
    badge: "IMPLEMENTACIÓN",
    title: "Conecta con expertos certificados",
    description: "No te quedes a la mitad. Te conectamos directamente con agencias y consultores verificados que configurarán tu software nuevo en tiempo récord.",
    color: { soft: brandColors.lavender.soft, solid: brandColors.lavender.solid },
    button: "Contactar expertos",
  }
];

export function LandingStackingCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    // Media query to avoid pinning on very small mobile if it feels bad, 
    // but GSAP ScrollTrigger works fine if we design it right.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: `+=${stackData.length * 100}%`,
        scrub: 1,
        pin: true,
      }
    });

    cardsRef.current.forEach((card, index) => {
      if (index === 0) return; // Skip first card, it's already there

      // Animate all previous cards to scale down and fade slightly
      const prevCards = cardsRef.current.slice(0, index);
      tl.to(prevCards, {
        scale: (i) => 1 - (0.04 * (index - i)),
        y: (i) => `-${(index - i) * 2}vh`,
        opacity: (i) => 1 - (0.15 * (index - i)),
        duration: 1,
        ease: "power2.inOut",
      }, `step${index}`);

      // Animate current card coming up
      tl.fromTo(card,
        { y: "150vh", scale: 0.9, opacity: 0 },
        { y: "0vh", scale: 1, opacity: 1, duration: 1, ease: "power2.out" },
        `step${index}`
      );
    });

  }, { scope: containerRef });

  return (
    <section ref={containerRef} className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#f5f5f4]">
      {stackData.map((item, index) => (
        <div
          key={item.id}
          ref={(el) => { cardsRef.current[index] = el; }}
          className="absolute w-[90%] max-w-6xl h-[80vh] min-h-[500px] max-h-[800px] rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-stone-200/50"
          style={{ backgroundColor: item.color.soft, zIndex: index + 10 }}
        >
          {/* Left Content */}
          <div className="flex-1 p-8 sm:p-12 md:p-16 flex flex-col justify-center relative z-10">
            <div className="mb-6 inline-flex items-center gap-3">
              <span 
                className="px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-sm"
                style={{ backgroundColor: item.color.solid }}
              >
                {item.badge}
              </span>
            </div>
            
            <h2 
              className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight mb-6 leading-[1.1]"
              style={{ color: item.color.solid }}
            >
              {item.title}
            </h2>
            
            <p className="text-lg sm:text-xl text-stone-700 leading-relaxed mb-10 max-w-lg">
              {item.description}
            </p>
            
            <div className="mt-auto md:mt-0 flex flex-wrap gap-4 items-center">
              <button 
                className="px-6 py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                style={{ backgroundColor: item.color.solid }}
              >
                {item.button}
              </button>
              <button className="px-6 py-3 rounded-xl bg-white text-stone-700 font-medium shadow-sm border border-stone-200 hover:bg-stone-50 transition-all">
                Conocer más
              </button>
            </div>
          </div>

          {/* Right Content (Visuals) */}
          <div className="flex-1 relative hidden md:block opacity-90 overflow-hidden">
            {/* Just a cool decorative abstract graphic based on the category color to mimic the 3D clay look */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-96 h-96 rounded-full blur-3xl opacity-30 mix-blend-multiply"
                style={{ backgroundColor: item.color.solid }}
              />
              <div 
                className="absolute w-64 h-64 rounded-[3rem] rotate-12 shadow-2xl border-8 border-white/20 backdrop-blur-sm flex items-center justify-center text-[10rem] font-bold text-white/50"
                style={{ backgroundColor: item.color.solid }}
              >
                {item.badge.charAt(0)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
