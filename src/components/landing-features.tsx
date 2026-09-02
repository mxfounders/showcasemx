"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const features = [
  {
    id: "crm",
    label: "CRM & Ventas",
    title: "Encuentra el CRM perfecto",
    description: "Filtra cientos de soluciones y encuentra la herramienta que realmente se adapta al ciclo de vida de tus clientes.",
    color: "bg-[#E4EBFC]", // using brand tones
    imgBg: "#365DC4"
  },
  {
    id: "marketing",
    label: "Marketing Automatizado",
    title: "Escala tus campañas sin esfuerzo",
    description: "Descubre agencias y software para automatizar tu pauta, nutrición de leads y analítica.",
    color: "bg-[#FEF1EC]",
    imgBg: "#C45B36"
  },
  {
    id: "rh",
    label: "Nómina y RRHH",
    title: "Gestiona tu talento",
    description: "Desde reclutamiento hasta pago de nómina, compara los mejores proveedores locales.",
    color: "bg-[#F3E8FF]",
    imgBg: "#7C3AED"
  },
  {
    id: "operaciones",
    label: "Logística y Operaciones",
    title: "Optimiza cada eslabón",
    description: "Software especializado en logística, inventario y facturación electrónica.",
    color: "bg-[#E0F2FE]",
    imgBg: "#0284C7"
  }
];

export function LandingFeatures() {
  const [activeTab, setActiveTab] = useState(features[0]);

  return (
    <section className="py-24 sm:py-32 overflow-hidden bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <h2 className="text-4xl sm:text-6xl font-medium tracking-[-0.04em] text-stone-900 mb-6">
            Líderes de industria<br />eligen shwcs
          </h2>
          <p className="text-lg sm:text-xl text-stone-500 leading-relaxed">
            Encuentra exactamente la tecnología que necesitas, sin perder meses evaluando opciones que no se ajustan a tu negocio.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 justify-start sm:justify-center gap-3 mb-10">
          {features.map((feature) => {
            const isActive = activeTab.id === feature.id;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature)}
                className={`whitespace-nowrap px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-[#365DC4] text-white shadow-md shadow-[#365DC4]/20"
                    : "bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200/60"
                }`}
              >
                {feature.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="relative mx-auto max-w-5xl">
          <div className={`rounded-[2rem] p-3 sm:p-5 transition-colors duration-700 ${activeTab.color}`}>
            <div className="rounded-[1.5rem] overflow-hidden bg-white shadow-xl ring-1 ring-stone-900/5 h-[400px] sm:h-[600px] relative">
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
                    className="absolute inset-0 opacity-10 transition-colors duration-700" 
                    style={{ backgroundColor: activeTab.imgBg }} 
                  />
                  
                  {/* Grid pattern overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                  {/* Floating Content Card (Simulating the mockup) */}
                  <div className="relative z-10 bg-white/95 backdrop-blur-md p-8 sm:p-12 rounded-3xl max-w-2xl shadow-2xl border border-white/50 w-full">
                    <div 
                      className="w-16 h-16 rounded-2xl mb-6 mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                      style={{ backgroundColor: activeTab.imgBg }}
                    >
                      {activeTab.label.charAt(0)}
                    </div>
                    <h3 className="text-3xl font-medium tracking-tight mb-4 text-stone-900">{activeTab.title}</h3>
                    <p className="text-lg text-stone-600 leading-relaxed">{activeTab.description}</p>
                    
                    {/* Fake UI Elements */}
                    <div className="mt-10 grid grid-cols-3 gap-4">
                      <div className="h-3 bg-stone-100 rounded-full w-full"></div>
                      <div className="h-3 bg-stone-100 rounded-full w-3/4 mx-auto"></div>
                      <div className="h-3 bg-stone-100 rounded-full w-5/6 ml-auto"></div>
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
