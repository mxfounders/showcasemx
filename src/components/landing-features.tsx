"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brandColors } from "@/lib/brand-colors";

const features = [
  {
    id: "crm",
    label: "CRM & Ventas",
    title: "Cierra más tratos en menos tiempo",
    description: "Filtra cientos de herramientas y encuentra el CRM que verdaderamente acelera el embudo de tu industria.",
    color: brandColors.blue
  },
  {
    id: "marketing",
    label: "Marketing Automatizado",
    title: "Escala tus campañas sin esfuerzo",
    description: "Descubre agencias y software para automatizar tu pauta, nutrición de leads y analítica.",
    color: brandColors.terracotta
  },
  {
    id: "rh",
    label: "Nómina y RRHH",
    title: "Gestiona tu talento fácilmente",
    description: "Desde el reclutamiento hasta la nómina quincenal, compara los mejores proveedores de Recursos Humanos.",
    color: brandColors.lavender
  },
  {
    id: "finanzas",
    label: "Finanzas & Cobros",
    title: "Mantén el control de tus números",
    description: "Plataformas de automatización de cobros, facturación electrónica y conciliación bancaria inteligente.",
    color: brandColors.sage
  },
  {
    id: "operaciones",
    label: "Logística y Operaciones",
    title: "Optimiza cada eslabón",
    description: "Software especializado en logística, gestión de inventario y optimización de última milla.",
    color: brandColors.amber
  },
  {
    id: "legal",
    label: "Legal y Contratos",
    title: "Documentos sin dolor de cabeza",
    description: "Herramientas para gestión de firmas electrónicas, contratos y cumplimiento corporativo.",
    color: brandColors.lavender
  },
  {
    id: "datos",
    label: "Datos y Analítica",
    title: "Decisiones basadas en la realidad",
    description: "Cuadros de mando, visualización de datos y almacenes de datos listos para conectar.",
    color: brandColors.blue
  },
  {
    id: "ti",
    label: "Seguridad y TI",
    title: "Protege el núcleo de tu empresa",
    description: "Gestión de dispositivos, ciberseguridad y soporte técnico a tu disposición.",
    color: brandColors.sage
  },
  {
    id: "soporte",
    label: "Soporte al Cliente",
    title: "Retén a tus mejores usuarios",
    description: "Sistemas de tickets, chatbots de IA y omnicanalidad para equipos de Customer Success.",
    color: brandColors.terracotta
  }
];

export function LandingFeatures() {
  const [activeTab, setActiveTab] = useState(features[0]);

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
            className="flex overflow-x-auto hide-scrollbar pb-6 pt-2 px-6 sm:px-12 items-center justify-start sm:justify-center gap-2"
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
                  onClick={() => setActiveTab(feature)}
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

        {/* Content Area */}
        <div className="relative mx-auto max-w-6xl">
          <div 
            className="rounded-[2.5rem] p-4 sm:p-8 transition-colors duration-700"
            style={{ backgroundColor: activeTab.color.soft }}
          >
            <div className="rounded-[2rem] overflow-hidden bg-white shadow-2xl ring-1 ring-stone-900/5 h-[450px] sm:h-[650px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                  
                  {/* Decorative Mockup Background */}
                  <div 
                    className="absolute inset-0 opacity-[0.03] transition-colors duration-700" 
                    style={{ backgroundColor: activeTab.color.solid }} 
                  />
                  
                  {/* Grid pattern overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                  {/* Floating Content Card (Simulating the mockup) */}
                  <div className="relative z-10 bg-white/90 backdrop-blur-xl p-8 sm:p-14 rounded-[2rem] max-w-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white w-full transform transition-transform hover:scale-[1.02] duration-500">
                    <div 
                      className="w-20 h-20 rounded-[1.25rem] mb-8 mx-auto flex items-center justify-center text-white text-3xl font-semibold shadow-lg"
                      style={{ backgroundColor: activeTab.color.solid }}
                    >
                      {activeTab.label.charAt(0)}
                    </div>
                    <h3 className="text-3xl sm:text-5xl font-medium tracking-tight mb-5 text-stone-900 leading-tight">
                      {activeTab.title}
                    </h3>
                    <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl mx-auto">
                      {activeTab.description}
                    </p>
                    
                    {/* Fake UI Elements for visual balance */}
                    <div className="mt-12 grid grid-cols-4 gap-4 opacity-70">
                      <div className="h-3 bg-stone-100 rounded-full w-full"></div>
                      <div className="h-3 bg-stone-100 rounded-full w-5/6 mx-auto col-span-2"></div>
                      <div className="h-3 bg-stone-100 rounded-full w-full ml-auto"></div>
                      <div className="h-3 bg-stone-100 rounded-full w-2/3 ml-auto col-span-4 mt-2"></div>
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
