import Link from "next/link";
import { brandColors } from "@/lib/brand-colors";
import { blogPosts, extraPosts } from "@/lib/blog";

const getToneColors = (tone?: string) => {
  if (tone === 'green') return brandColors.sage;
  if (tone && brandColors[tone as keyof typeof brandColors]) {
    return brandColors[tone as keyof typeof brandColors];
  }
  return brandColors.blue;
};

export function LandingBentoBlogs() {
  const postA = blogPosts[0];
  const postB = blogPosts[1];
  const postD = blogPosts[2];
  const postE = extraPosts[0];

  const colorA = getToneColors(postA.tone);
  const colorB = getToneColors(postB.tone);
  const colorD = getToneColors(postD.tone);
  const colorE = getToneColors(postE.tone);

  return (
    <section className="w-full bg-white py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-center mb-16 text-stone-900">
          Aprende más sobre<br />tecnología B2B
        </h2>
        
        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:auto-rows-[300px]">
          
          {/* Card A: Tall Left */}
          <Link href={`/blog/${postA.slug}`} className="col-span-1 md:col-span-4 md:row-span-2 bg-white rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <div className="h-48 md:h-[45%] w-full p-8" style={{ backgroundColor: colorA.solid }}>
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/90">{postA.category}</span>
            </div>
            <div className="p-8 flex flex-col flex-1">
              <h3 className="text-2xl sm:text-3xl font-medium text-stone-800 leading-tight mb-4">{postA.title}</h3>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-stone-800 group-hover:text-stone-500 transition-colors">
                Leer artículo <ArrowIcon />
              </div>
            </div>
          </Link>

          {/* Card B: Wide Top Right */}
          <Link href={`/blog/${postB.slug}`} className="col-span-1 md:col-span-8 md:row-span-1 bg-white rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col md:flex-row group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <div className="p-8 md:p-10 flex flex-col flex-1 justify-center w-full md:w-3/5">
              <span className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: colorB.solid }}>{postB.category}</span>
              <h3 className="text-2xl sm:text-3xl font-medium text-stone-800 leading-tight mb-4">{postB.title}</h3>
              <p className="text-stone-600 leading-relaxed max-w-md mb-6 text-sm sm:text-base">
                {postB.excerpt}
              </p>
              <div className="mt-auto flex items-center text-sm font-medium text-stone-800 transition-colors group-hover:opacity-70">
                Leer artículo <ArrowIcon />
              </div>
            </div>
            <div className="h-48 md:h-full w-full md:w-2/5" style={{ backgroundColor: colorB.solid }} />
          </Link>

          {/* Card C: Middle Center (Dark) - External CordHQ */}
          <a href="https://cordhq.app" target="_blank" rel="noopener noreferrer" className="col-span-1 md:col-span-4 md:row-span-1 bg-stone-900 rounded-[2.5rem] overflow-hidden flex flex-col group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-all duration-300 relative min-h-[250px] md:min-h-0">
            {/* CordHQ og:image Background */}
            <div className="absolute inset-0 bg-[url('https://cordhq.app/og-cord.jpg')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105" />
            {/* Gradient overlay for readability without darkening the whole image */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
            
            <div className="relative z-10 p-8 flex flex-col flex-1 h-full">
              <span className="text-[11px] font-bold tracking-widest text-white/90 uppercase mb-4 drop-shadow-md">Recomendación</span>
              <h3 className="text-2xl font-medium text-white leading-tight mb-4 drop-shadow-md">Cómo cobrar más rápido tus cotizaciones</h3>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-white transition-colors group-hover:text-white/80 drop-shadow-md">
                Ir a cordhq.app <ArrowIcon />
              </div>
            </div>
          </a>

          {/* Card D: Tall Right */}
          <Link href={`/blog/${postD.slug}`} className="col-span-1 md:col-span-4 md:row-span-2 bg-white rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <div className="h-48 md:h-[45%] w-full p-8" style={{ backgroundColor: colorD.solid }}>
              <span className="text-[11px] font-bold tracking-widest uppercase text-white/90">{postD.category}</span>
            </div>
            <div className="p-8 flex flex-col flex-1">
              <h3 className="text-2xl sm:text-3xl font-medium text-stone-800 leading-tight mb-4">{postD.title}</h3>
              <div className="mt-auto pt-4 flex items-center text-sm font-medium text-stone-800 transition-colors group-hover:opacity-70">
                Leer artículo <ArrowIcon />
              </div>
            </div>
          </Link>

          {/* Card E: Wide Bottom Left */}
          <Link href={`/blog/${postE.slug}`} className="col-span-1 md:col-span-8 md:row-span-1 bg-white rounded-[2.5rem] border border-stone-200/60 overflow-hidden flex flex-col sm:flex-row group cursor-pointer hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <div className="h-48 sm:h-full w-full sm:w-2/5" style={{ backgroundColor: colorE.solid }} />
            <div className="p-8 md:p-10 flex flex-col flex-1 justify-center">
              <span className="text-[11px] font-bold tracking-widest uppercase mb-4" style={{ color: colorE.solid }}>{postE.category}</span>
              <h3 className="text-2xl font-medium text-stone-800 leading-tight mb-4">{postE.title}</h3>
              <p className="text-stone-600 leading-relaxed max-w-md mb-6 text-sm sm:text-base">
                {postE.excerpt}
              </p>
              <div className="mt-auto pt-2 flex items-center text-sm font-medium text-stone-800 transition-colors group-hover:opacity-70">
                Leer artículo <ArrowIcon />
              </div>
            </div>
          </Link>

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
