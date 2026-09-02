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
    icons: ["S", "H", "P"],
    testimonial: {
      bold: "Deel",
      text: " comparó 15 plataformas de HR en minutos y eligió la mejor opción para su equipo en toda la región."
    }
  },
  {
    id: "agents",
    badge: "RECOMENDACIONES",
    title: "Encuentra la aguja en el pajar al instante",
    description: "Nuestra IA analiza tu industria, tamaño y presupuesto para recomendarte el stack tecnológico exacto que usan las empresas más exitosas de tu sector.",
    color: { soft: brandColors.terracotta.soft, solid: brandColors.terracotta.solid },
    button: "Ver recomendaciones",
    icons: ["K", "C", "M"],
    testimonial: {
      bold: "Kueski",
      text: " ahorró 40 horas de investigación usando nuestro motor de recomendaciones para escalar su stack de ciberseguridad."
    }
  },
  {
    id: "enrichment",
    badge: "GESTIÓN",
    title: "Centraliza el control de tus suscripciones",
    description: "Deja de pagar por licencias que nadie usa. Conecta tu stack y recibe alertas automáticas sobre gastos duplicados y renovaciones próximas.",
    color: { soft: brandColors.sage.soft, solid: brandColors.sage.solid },
    button: "Optimizar gastos",
    icons: ["💰", "📉", "⚡"],
    testimonial: {
      bold: "Kavak",
      text: " detectó y eliminó $12,000 USD en licencias duplicadas de software durante su primer mes de uso en la plataforma."
    }
  },
  {
    id: "outbound",
    badge: "IMPLEMENTACIÓN",
    title: "Conecta con expertos certificados",
    description: "No te quedes a la mitad. Te conectamos directamente con agencias y consultores verificados que configurarán tu software nuevo en tiempo récord.",
    color: { soft: brandColors.lavender.soft, solid: brandColors.lavender.solid },
    button: "Contactar expertos",
    icons: ["🤝", "🚀", "💡"],
    testimonial: {
      bold: "Clara",
      text: " redujo su tiempo de implementación de ERP de 3 meses a solo 2 semanas gracias a un partner certificado."
    }
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
          <div className="flex-1 p-8 sm:p-12 md:p-16 flex flex-col relative z-10">
            {/* Top Text Block */}
            <div>
              <div className="mb-4 inline-flex items-center gap-3">
                <span 
                  className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-sm"
                  style={{ backgroundColor: item.color.solid }}
                >
                  {item.badge}
                </span>
              </div>
              
              <h2 
                className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight mb-4 leading-[1.15]"
                style={{ color: item.color.solid }}
              >
                {item.title}
              </h2>
              
              <p className="text-base sm:text-lg text-stone-700/90 leading-relaxed max-w-md">
                {item.description}
              </p>
            </div>
            
            {/* Bottom Action Block */}
            <div className="mt-auto pt-10">
              {/* Overlapping Mockups & Testimonial */}
              <div className="flex items-center -space-x-3 mb-4">
                {[1, 2, 3].map((_, i) => (
                  <div 
                    key={i} 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-[0.8rem] bg-stone-200/50 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 text-lg sm:text-xl relative hover:bg-stone-200/80 transition-colors"
                    style={{ zIndex: 3 - i }}
                  >
                    +
                  </div>
                ))}
              </div>
              <p className="text-sm sm:text-base text-stone-800 max-w-md mb-8 leading-relaxed">
                <strong>{item.testimonial.bold}</strong>{item.testimonial.text}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 items-center">
                <button 
                  className="px-7 py-3 rounded-full text-white font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 group text-sm sm:text-base"
                  style={{ backgroundColor: item.color.solid }}
                >
                  {item.button}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button className="px-7 py-3 rounded-full bg-white text-stone-800 font-medium shadow-sm transition-all hover:bg-stone-50 hover:shadow-md text-sm sm:text-base">
                  Conocer más
                </button>
              </div>
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
