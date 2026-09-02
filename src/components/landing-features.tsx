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

export function LandingFeatures() {
  const [activeTab, setActiveTab] = useState(features[7]);
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

  return (
    <section className="py-24 sm:py-32 overflow-hidden bg-white">
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl sm:text-[4rem] sm:leading-[1.1] font-medium tracking-tight text-stone-900 mb-6">
            Encuentra la tecnología<br />exacta para tu industria
          </h2>
          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
            Explora herramientas y servicios diseñados para resolver cada uno de tus retos operativos, todo en un solo lugar.
          </p>
        </div>

        {/* Scrolling Tabs with Gradient Mask */}
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
                      : "bg-[#F5F5F4] text-stone-600 hover:bg-[#E5E5E4] ring-1 ring-inset ring-transparent"
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

        {/* Content Area - Clean Colored Rectangle */}
        <div className="relative mx-auto max-w-6xl">
          <div className="rounded-[2.5rem] p-4 sm:p-8 bg-white">
            <div className="rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-stone-900/5 h-[400px] sm:h-[500px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 sm:p-16 text-center"
                  style={{ backgroundColor: activeTab.color.soft }}
                >
                  <div 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.5rem] mb-8 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-xl"
                    style={{ backgroundColor: activeTab.color.solid }}
                  >
                    {activeTab.label.charAt(0)}
                  </div>
                  <h3 
                    className="text-3xl sm:text-5xl font-semibold tracking-tight mb-6" 
                    style={{ color: activeTab.color.solid }}
                  >
                    {activeTab.title}
                  </h3>
                  <p 
                    className="text-lg sm:text-2xl font-medium opacity-80 max-w-3xl leading-relaxed" 
                    style={{ color: activeTab.color.solid }}
                  >
                    {activeTab.description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
