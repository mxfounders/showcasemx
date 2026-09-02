import { brandColors } from "@/lib/brand-colors";

export function LandingBentoBlogs() {
  return (
    <section className="w-full bg-white py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-center mb-16 text-stone-900">
          Aprende más sobre<br />tecnología B2B
        </h2>
        
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[280px]">
          
          {/* Card A: Tall Left */}
          <div className="col-span-1 md:col-span-4 md:row-span-2 bg-stone-50 rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
            <div className="h-48 md:h-[45%] w-full relative overflow-hidden flex items-center justify-center p-8" style={{ backgroundColor: brandColors.blue.soft }}>
              {/* Fake 3D Graphic */}
              <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full blur-3xl opacity-60 mix-blend-multiply transition-transform duration-700 group-hover:scale-125" style={{ backgroundColor: brandColors.blue.solid }} />
              <div className="relative z-10 w-full h-full border-[6px] border-white/40 rounded-3xl backdrop-blur-sm shadow-xl rotate-[-12deg] group-hover:rotate-[-6deg] transition-transform duration-500 flex items-center justify-center bg-white/20">
                <span className="text-4xl sm:text-5xl font-black text-white/80 tracking-tighter">shwcs</span>
              </div>
            </div>
            <div className="p-8 flex flex-col flex-1">
              <span className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: brandColors.blue.solid }}>Reporte</span>
              <h3 className="text-2xl sm:text-3xl font-medium text-stone-800 leading-tight mb-4">El estado del SaaS en Latinoamérica 2026</h3>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-stone-800 group-hover:text-blue-600 transition-colors">
                Descargar reporte <ArrowIcon />
              </div>
            </div>
          </div>

          {/* Card B: Wide Top Right */}
          <div className="col-span-1 md:col-span-8 md:row-span-1 bg-stone-50 rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col md:flex-row group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
            <div className="p-8 md:p-10 flex flex-col flex-1 justify-center w-full md:w-3/5">
              <h3 className="text-2xl sm:text-3xl font-medium text-stone-800 leading-tight mb-4">Comienza con shwcs</h3>
              <p className="text-stone-600 leading-relaxed max-w-md mb-6 text-sm sm:text-base">
                Encuentra el contenido que te ayuda a escalar tu stack tecnológico y construir operaciones sólidas con confianza.
              </p>
              <div className="mt-auto flex items-center text-sm font-medium text-stone-800 transition-colors group-hover:opacity-70">
                Ir a la universidad <ArrowIcon />
              </div>
            </div>
            <div className="h-48 md:h-full w-full md:w-2/5 relative overflow-hidden p-6 flex items-center justify-center" style={{ backgroundColor: brandColors.sage.soft }}>
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-50 mix-blend-multiply transition-transform duration-700 group-hover:scale-110" style={{ backgroundColor: brandColors.sage.solid }} />
              <div className="relative z-10 w-full h-full bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg group-hover:scale-105 transition-transform duration-500 flex flex-col gap-3 p-4">
                 <div className="w-1/2 h-3 rounded-full bg-white/80" />
                 <div className="w-full h-3 rounded-full bg-white/60" />
                 <div className="w-3/4 h-3 rounded-full bg-white/60" />
              </div>
            </div>
          </div>

          {/* Card C: Middle Center (Dark) */}
          <div className="col-span-1 md:col-span-4 md:row-span-1 bg-stone-900 rounded-[2.5rem] overflow-hidden flex flex-col group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 relative min-h-[250px] md:min-h-0">
            {/* Dark abstract bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-950" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-stone-700 rounded-full blur-[60px] opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
            
            <div className="relative z-10 p-8 flex flex-col flex-1 h-full">
              <span className="text-[11px] font-bold tracking-widest text-stone-400 uppercase mb-4">Livestream</span>
              <h3 className="text-2xl font-medium text-white leading-tight mb-4">Cómo optimizar gastos en licencias B2B</h3>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-white transition-colors group-hover:text-stone-300">
                Ver grabación <ArrowIcon />
              </div>
            </div>
          </div>

          {/* Card D: Tall Right */}
          <div className="col-span-1 md:col-span-4 md:row-span-2 bg-stone-50 rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
            <div className="h-48 md:h-[45%] w-full relative overflow-hidden" style={{ backgroundColor: brandColors.terracotta.soft }}>
              <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-40 mix-blend-multiply transition-transform duration-700 group-hover:translate-x-10" style={{ backgroundColor: brandColors.terracotta.solid }} />
              <div className="absolute bottom-[-10%] right-[-10%] w-48 h-48 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-2xl rotate-12 group-hover:rotate-6 transition-transform duration-500" />
            </div>
            <div className="p-8 flex flex-col flex-1">
              <span className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: brandColors.terracotta.solid }}>Caso de éxito</span>
              <h3 className="text-2xl sm:text-3xl font-medium text-stone-800 leading-tight mb-4">Cómo Kavak ahorró 40% en su stack tecnológico</h3>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-stone-800 transition-colors group-hover:opacity-70">
                Leer historia <ArrowIcon />
              </div>
            </div>
          </div>

          {/* Card E: Wide Bottom Left */}
          <div className="col-span-1 md:col-span-8 md:row-span-1 bg-stone-50 rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col sm:flex-row group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-300">
            <div className="h-48 sm:h-full w-full sm:w-2/5 relative overflow-hidden p-6 flex items-center justify-center" style={{ backgroundColor: brandColors.lavender.soft }}>
               <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-full shadow-lg border border-white/50 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                 🤝
               </div>
            </div>
            <div className="p-8 md:p-10 flex flex-col flex-1 justify-center">
              <span className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: brandColors.lavender.solid }}>Comunidad</span>
              <h3 className="text-2xl font-medium text-stone-800 leading-tight mb-4">Conoce a los expertos certificados para implementar tu software</h3>
              <div className="mt-auto pt-2 flex items-center text-sm font-medium text-stone-800 transition-colors group-hover:opacity-70">
                Ver directorio <ArrowIcon />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

const ArrowIcon = () => (
  <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);
