export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs font-medium text-zinc-300 mb-6 backdrop-blur-sm">
        ✨ Mapeando el ecosistema B2B en México
      </div>
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-100 max-w-3xl mb-6">
        Encuentra la infraestructura <br className="hidden md:block" />
        <span className="text-zinc-400">exacta para escalar tu empresa.</span>
      </h1>
      <p className="text-zinc-400 max-w-xl mx-auto mb-10 text-sm md:text-base leading-relaxed">
        Olvídate del ruido. ShowcaseMX es una boutique curada de herramientas B2B construidas por fundadores mexicanos. Solo software validado, para operadores reales.
      </p>
      
      {/* El input fake de la IA para dar contexto visual */}
      <div className="w-full max-w-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-2xl blur opacity-20"></div>
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-2 flex items-center shadow-2xl">
          <div className="pl-4 pr-2 text-zinc-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/></svg>
          </div>
          <input 
            type="text" 
            placeholder="Ej: Mis clientes tardan 15 días en pagarme..." 
            className="w-full bg-transparent border-none outline-none text-zinc-200 placeholder:text-zinc-600 px-2 py-3 text-sm md:text-base"
          />
          <button className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors">
            Analizar
          </button>
        </div>
      </div>
    </div>
  );
}
