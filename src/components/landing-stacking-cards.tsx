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

          {/* Right Content (Visuals) - Premium UI Mockups */}
          <div className="flex-1 relative hidden md:block opacity-90 overflow-hidden">
            <RightVisual id={item.id} color={item.color.solid} />
          </div>
        </div>
      ))}
    </section>
  );
}

const RightVisual = ({ id, color }: { id: string; color: string }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-12">
      {/* Background glowing orb */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[28rem] h-[28rem] rounded-full blur-[100px] mix-blend-multiply"
        style={{ backgroundColor: color }}
      />
      
      {/* Dynamic UI based on feature */}
      {id === "data" && <DataVisual color={color} />}
      {id === "agents" && <AgentsVisual color={color} />}
      {id === "enrichment" && <EnrichmentVisual color={color} />}
      {id === "outbound" && <OutboundVisual color={color} />}
    </div>
  );
};

const DataVisual = ({ color }: { color: string }) => (
  <motion.div 
    animate={{ y: [0, -15, 0], rotate: [0, 1, 0] }} 
    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    className="relative w-full max-w-sm h-96 bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] rounded-[2rem] p-6 flex flex-col gap-4 overflow-hidden z-10"
  >
    <div className="w-full h-12 bg-white/80 rounded-2xl border border-white/50 flex items-center px-4 gap-3 shadow-sm">
      <div className="w-4 h-4 rounded-full bg-stone-300" />
      <div className="w-32 h-2 rounded-full bg-stone-200" />
    </div>
    <div className="grid grid-cols-2 gap-4 flex-1">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white/60 rounded-2xl border border-white/40 p-4 flex flex-col gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl opacity-80" style={{ backgroundColor: i % 2 === 0 ? color : '#d6d3d1' }} />
          <div className="w-16 h-2 rounded-full bg-stone-400" />
          <div className="w-10 h-2 rounded-full bg-stone-300" />
        </div>
      ))}
    </div>
  </motion.div>
);

const AgentsVisual = ({ color }: { color: string }) => (
  <div className="relative w-full max-w-sm h-96 flex items-center justify-center">
    <motion.div 
      animate={{ y: [0, -15, 0] }} 
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute z-20 w-56 h-72 bg-white/60 backdrop-blur-2xl border border-white/60 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] rounded-[2rem] p-6 flex flex-col items-center justify-center gap-6"
    >
      <motion.div 
        animate={{ scale: [1, 1.15, 1] }} 
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-24 h-24 rounded-full shadow-[0_0_40px_rgba(0,0,0,0.15)] flex items-center justify-center text-4xl text-white"
        style={{ backgroundColor: color }}
      >
        ✨
      </motion.div>
      <div className="flex flex-col items-center gap-2 w-full mt-2">
        <div className="w-24 h-3 rounded-full bg-stone-400" />
        <div className="w-16 h-2 rounded-full bg-stone-300" />
      </div>
      <div className="w-full h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md mt-auto" style={{ backgroundColor: color }}>
        98% Match
      </div>
    </motion.div>
    
    <motion.div 
      animate={{ y: [0, 10, 0], x: [0, -10, 0] }} 
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute top-8 left-0 w-32 h-32 bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg z-10"
    />
    <motion.div 
      animate={{ y: [0, -10, 0], x: [0, 10, 0] }} 
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      className="absolute bottom-8 right-0 w-40 h-40 bg-white/40 backdrop-blur-xl border border-white/50 rounded-2xl shadow-lg z-10"
    />
  </div>
);

const EnrichmentVisual = ({ color }: { color: string }) => (
  <motion.div 
    animate={{ y: [0, -10, 0] }} 
    transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
    className="relative w-full max-w-sm h-96 bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] rounded-[2rem] p-6 flex flex-col gap-6 z-10"
  >
    <div className="flex justify-between items-end h-32 border-b border-stone-200/60 pb-2">
      {[40, 70, 50, 90, 65, 80].map((h, i) => (
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ duration: 1.5, delay: i * 0.1, ease: "easeOut" }}
          key={i} 
          className="w-10 rounded-t-lg" 
          style={{ backgroundColor: i === 3 ? color : '#e7e5e4' }} 
        />
      ))}
    </div>
    <div className="flex flex-col gap-3 flex-1">
      {[1, 2, 3].map((_, i) => (
        <div key={i} className="flex items-center justify-between bg-white/70 rounded-xl p-3 shadow-sm border border-white/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg opacity-90" style={{ backgroundColor: i === 0 ? color : '#d6d3d1' }} />
            <div className="flex flex-col gap-1.5">
              <div className="w-16 h-2 rounded-full bg-stone-400" />
              <div className="w-10 h-1.5 rounded-full bg-stone-300" />
            </div>
          </div>
          <div className="w-12 h-3 rounded-full bg-stone-800" />
        </div>
      ))}
    </div>
  </motion.div>
);

const OutboundVisual = ({ color }: { color: string }) => (
  <div className="relative w-full max-w-sm h-96 flex items-center justify-center">
    {/* Connection line */}
    <div className="absolute w-full h-1 border-t-[3px] border-dashed border-stone-300 z-10" />

    <motion.div 
      animate={{ y: [0, -15, 0] }} 
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className="absolute left-2 z-20 w-44 h-52 bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] rounded-[2rem] p-5 flex flex-col items-center justify-center gap-4"
    >
      <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center text-3xl shadow-inner">🏢</div>
      <div className="w-24 h-3 rounded-full bg-stone-400 mt-2" />
      <div className="w-16 h-2 rounded-full bg-stone-300" />
    </motion.div>

    <motion.div 
      animate={{ y: [0, 15, 0] }} 
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      className="absolute right-2 z-20 w-44 h-52 bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] rounded-[2rem] p-5 flex flex-col items-center justify-center gap-4"
    >
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl text-white shadow-lg" style={{ backgroundColor: color }}>👨‍💻</div>
      <div className="w-24 h-3 rounded-full bg-stone-800 mt-2" />
      <div className="w-16 h-2 rounded-full bg-stone-400" />
    </motion.div>
  </div>
);
