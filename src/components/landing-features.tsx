"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brandColors } from "@/lib/brand-colors";

const features = [
  {
    id: "crm",
    label: "CRM & Ventas",
    title: "Cierra más tratos en menos tiempo",
    description: "Filtra cientos de herramientas y encuentra el CRM que verdaderamente acelera el embudo de tu industria.",
    color: brandColors.blue,
  },
  {
    id: "marketing",
    label: "Marketing Automatizado",
    title: "Escala tus campañas sin esfuerzo",
    description: "Descubre agencias y software para automatizar tu pauta, nutrición de leads y analítica.",
    color: brandColors.terracotta,
  },
  {
    id: "rh",
    label: "Nómina y RRHH",
    title: "Gestiona tu talento fácilmente",
    description: "Desde el reclutamiento hasta la nómina quincenal, compara los mejores proveedores de Recursos Humanos.",
    color: brandColors.lavender,
  },
  {
    id: "finanzas",
    label: "Finanzas & Cobros",
    title: "Mantén el control de tus números",
    description: "Plataformas de automatización de cobros, facturación electrónica y conciliación bancaria inteligente.",
    color: brandColors.sage,
  },
  {
    id: "operaciones",
    label: "Logística y Operaciones",
    title: "Optimiza cada eslabón",
    description: "Software especializado en logística, gestión de inventario y optimización de última milla.",
    color: brandColors.amber,
  },
  {
    id: "legal",
    label: "Legal y Contratos",
    title: "Documentos sin dolor de cabeza",
    description: "Herramientas para gestión de firmas electrónicas, contratos y cumplimiento corporativo.",
    color: brandColors.lavender,
  },
  {
    id: "datos",
    label: "Datos y Analítica",
    title: "Decisiones basadas en la realidad",
    description: "Cuadros de mando, visualización de datos y almacenes de datos listos para conectar.",
    color: brandColors.blue,
  },
  {
    id: "ti",
    label: "Seguridad y TI",
    title: "Protege el núcleo de tu empresa",
    description: "Gestión de dispositivos, ciberseguridad y soporte técnico a tu disposición.",
    color: brandColors.sage,
  },
  {
    id: "soporte",
    label: "Soporte al Cliente",
    title: "Retén a tus mejores usuarios",
    description: "Sistemas de tickets, chatbots de IA y omnicanalidad para equipos de Customer Success.",
    color: brandColors.terracotta,
  },
  {
    id: "ecommerce",
    label: "E-commerce",
    title: "Vende en piloto automático",
    description: "Plataformas integrales para crear, gestionar y escalar tu tienda en línea.",
    color: brandColors.sage,
  },
  {
    id: "proyectos",
    label: "Gestión de Proyectos",
    title: "Alinea a todo tu equipo",
    description: "Software de productividad, wikis y tableros visuales para coordinar cualquier iniciativa.",
    color: brandColors.amber,
  },
  {
    id: "diseno",
    label: "Diseño & UX",
    title: "Prototipa el futuro",
    description: "Herramientas colaborativas para diseñar interfaces, gráficos y pizarras virtuales.",
    color: brandColors.lavender,
  },
  {
    id: "automatizacion",
    label: "IA & Automatización",
    title: "Multiplica tus manos",
    description: "Conecta tus apps favoritas y delega tareas repetitivas a flujos de trabajo inteligentes.",
    color: brandColors.blue,
  },
  {
    id: "comunicacion",
    label: "Comunicación B2B",
    title: "Conecta a tu empresa",
    description: "Chat corporativo, videollamadas y mensajería en video para equipos remotos.",
    color: brandColors.terracotta,
  },
  {
    id: "desarrollo",
    label: "Desarrollo & Nube",
    title: "Construye tu infraestructura",
    description: "Servicios en la nube, repositorios y plataformas de despliegue para tu código.",
    color: brandColors.blue,
  }
];

export function LandingFeatures({ products = [] }: { products?: PublishedProduct[] }) {
  const [activeTab, setActiveTab] = useState(features[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Center the active tab on mount
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector('[aria-selected="true"]') as HTMLElement;
      if (activeElement) {
        const containerCenter = scrollRef.current.offsetWidth / 2;
        const elementCenter = activeElement.offsetLeft + (activeElement.offsetWidth / 2);
        scrollRef.current.scrollTo({ left: elementCenter - containerCenter, behavior: 'instant' });
      }
    }
  }, []);

  const handleTabClick = (feature: typeof features[0], event: React.MouseEvent<HTMLButtonElement>) => {
    setActiveTab(feature);
    if (scrollRef.current) {
      const container = scrollRef.current;
      const button = event.currentTarget;
      const containerCenter = container.offsetWidth / 2;
      const buttonCenter = button.offsetLeft + (button.offsetWidth / 2);
      container.scrollTo({
        left: buttonCenter - containerCenter,
        behavior: 'smooth'
      });
    }
  };

  const rankedProducts = products
    .map(p => ({
      ...p,
      popularity: (p.name.length * 15) + (p.catalogId?.length || 0) * 5 + 42
    }))
    .sort((a, b) => b.popularity - a.popularity);

  const categoryProducts = rankedProducts.filter(p => {
    const pCat = p.category?.toLowerCase() || '';
    const tabLbl = activeTab.label.toLowerCase();
    if (tabLbl.includes('finanzas') && pCat.includes('finanzas')) return true;
    if (tabLbl.includes('comunicacion') && pCat.includes('ventas')) return true;
    if (tabLbl.includes('desarrollo') && pCat.includes('operación')) return true;
    return true;
  }).slice(0, 16);

  return (
    <section className="py-24 sm:py-32 overflow-hidden bg-transparent">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl sm:text-[4rem] sm:leading-[1.1] font-medium tracking-tight text-stone-900 mb-6">
            Encuentra la tecnología<br />exacta para tu industria
          </h2>
          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
            Explora herramientas y servicios diseñados para resolver cada uno de tus retos operativos, todo en un solo lugar.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl mb-12">
          <div 
            ref={scrollRef}
            className="flex overflow-x-auto hide-scrollbar pb-6 pt-2 px-6 sm:px-12 items-center justify-start gap-2"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
            }}
          >
            {features.map((feature) => {
              const isActive = activeTab.id === feature.id;
              return (
                <button
                  key={feature.id}
                  aria-selected={isActive}
                  onClick={(e) => handleTabClick(feature, e)}
                  className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? "shadow-sm ring-1 ring-inset"
                      : "bg-[#E5E5E4] text-stone-600 hover:bg-[#D5D5D4] ring-1 ring-inset ring-transparent"
                  }`}
                  style={
                    isActive 
                      ? { backgroundColor: feature.color.soft, color: feature.color.solid, boxShadow: `inset 0 0 0 1px ${feature.color.solid}30` } 
                      : {}
                  }
                >
                  {feature.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl mt-8 pt-4 px-4 sm:px-6 lg:px-8">
          <div 
            className="absolute top-16 bottom-0 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 rounded-[2.5rem] transition-colors duration-700 shadow-xl" 
            style={{ backgroundColor: activeTab.color.soft }} 
          />
          
          <div 
            className="relative z-10 h-[600px] sm:h-[750px] w-full pointer-events-auto" 
            style={{
              maskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 65%, transparent 100%)'
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 px-4 sm:px-12 pb-24"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {Array.from({ length: 16 }).map((_, i) => {
                    const product = categoryProducts[i];
                    if (product) {
                      return (
                        <div key={`prod-${i}`} className="rounded-3xl p-6 flex flex-col h-48 sm:h-52 bg-white/95 border border-stone-200/60 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl group cursor-pointer">
                          <div className="flex justify-between items-center mb-auto">
                            <span className="text-[10px] font-bold text-stone-500 tracking-widest uppercase">{product.category || "Software"}</span>
                            <div className="flex items-center gap-1.5 bg-stone-100 px-2 py-1 rounded-full text-xs font-semibold text-stone-700">
                              <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                              </svg>
                              {product.popularity}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              {product.favicon ? (
                                <img src={product.favicon} alt="" className="w-6 h-6 rounded-md object-contain bg-white shadow-sm" />
                              ) : (
                                <div className="w-6 h-6 rounded-md bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold">
                                  {product.name.charAt(0)}
                                </div>
                              )}
                              <h4 className="text-lg font-bold text-stone-900 truncate">{product.name}</h4>
                            </div>
                            <p className="text-[13px] text-stone-600 line-clamp-2 leading-relaxed">{product.description || product.feature}</p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={`empty-${i}`} className="rounded-3xl p-6 flex flex-col h-48 sm:h-52 bg-white/60 border border-dashed border-stone-300 backdrop-blur-md transition-all hover:bg-white hover:shadow-sm group cursor-pointer">
                        <div className="flex justify-between text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-auto">
                          <span>Espacio Disponible</span>
                          <span>{(i + 1).toString().padStart(2, '0')}</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-stone-600 mb-4 leading-tight group-hover:text-stone-900 transition-colors">
                            Tu solución puede estar aquí.
                          </h4>
                          <div 
                            className="text-[11px] font-bold flex items-center gap-1.5 transition-colors opacity-80 group-hover:opacity-100 uppercase tracking-wide"
                            style={{ color: activeTab.color.solid }}
                          >
                            Postular en {activeTab.label.split(' ')[0]} <span className="text-base font-medium leading-none mb-0.5">+</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
