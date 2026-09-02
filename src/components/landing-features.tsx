"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { brandColors } from "@/lib/brand-colors";

const features = [
  {
    id: "crm",
    label: "CRM & Ventas",
    title: "Cierra más tratos en menos tiempo",
    color: brandColors.blue,
    mockup: [
      { name: "Salesforce", category: "Enterprise", users: "12,450", score: "98%" },
      { name: "HubSpot", category: "Inbound CRM", users: "8,230", score: "95%" },
      { name: "Pipedrive", category: "PyMEs", users: "4,100", score: "89%" },
      { name: "Zoho CRM", category: "Suite Integral", users: "3,800", score: "85%" },
    ]
  },
  {
    id: "marketing",
    label: "Marketing Automatizado",
    title: "Escala tus campañas sin esfuerzo",
    color: brandColors.terracotta,
    mockup: [
      { name: "Klaviyo", category: "Email & SMS", users: "9,100", score: "96%" },
      { name: "Mailchimp", category: "Email Marketing", users: "15,000", score: "92%" },
      { name: "ActiveCampaign", category: "Automatización", users: "6,400", score: "90%" },
      { name: "Brevo", category: "Multicanal", users: "3,200", score: "87%" },
    ]
  },
  {
    id: "rh",
    label: "Nómina y RRHH",
    title: "Gestiona tu talento fácilmente",
    color: brandColors.lavender,
    mockup: [
      { name: "Deel", category: "Nómina Global", users: "7,500", score: "97%" },
      { name: "Gusto", category: "Nómina Local", users: "5,800", score: "94%" },
      { name: "Workday", category: "Enterprise HR", users: "14,200", score: "91%" },
      { name: "Rippling", category: "IT & HR", users: "4,600", score: "88%" },
    ]
  },
  {
    id: "finanzas",
    label: "Finanzas & Cobros",
    title: "Mantén el control de tus números",
    color: brandColors.sage,
    mockup: [
      { name: "Stripe", category: "Pagos", users: "20,000", score: "99%" },
      { name: "QuickBooks", category: "Contabilidad", users: "11,300", score: "95%" },
      { name: "Xero", category: "Finanzas PyMEs", users: "6,700", score: "92%" },
      { name: "Mercury", category: "Banca B2B", users: "3,900", score: "89%" },
    ]
  },
  {
    id: "operaciones",
    label: "Logística y Operaciones",
    title: "Optimiza cada eslabón",
    color: brandColors.amber,
    mockup: [
      { name: "Flexport", category: "Logística Global", users: "4,200", score: "94%" },
      { name: "ShipStation", category: "Envíos", users: "8,900", score: "91%" },
      { name: "Samsara", category: "Flotas", users: "3,500", score: "88%" },
      { name: "Cin7", category: "Inventario", users: "2,100", score: "85%" },
    ]
  },
  {
    id: "legal",
    label: "Legal y Contratos",
    title: "Documentos sin dolor de cabeza",
    color: brandColors.lavender,
    mockup: [
      { name: "DocuSign", category: "Firmas Electrónicas", users: "18,500", score: "98%" },
      { name: "Ironclad", category: "Gestión de Contratos", users: "2,900", score: "95%" },
      { name: "PandaDoc", category: "Propuestas", users: "6,300", score: "92%" },
      { name: "Carta", category: "Gestión de Capital", users: "5,100", score: "90%" },
    ]
  },
  {
    id: "datos",
    label: "Datos y Analítica",
    title: "Decisiones basadas en la realidad",
    color: brandColors.blue,
    mockup: [
      { name: "Snowflake", category: "Data Warehouse", users: "9,800", score: "96%" },
      { name: "Looker", category: "BI & Dashboards", users: "7,400", score: "93%" },
      { name: "Fivetran", category: "Integración de Datos", users: "4,200", score: "90%" },
      { name: "Amplitude", category: "Analítica de Producto", users: "5,600", score: "89%" },
    ]
  },
  {
    id: "ti",
    label: "Seguridad y TI",
    title: "Protege el núcleo de tu empresa",
    color: brandColors.sage,
    mockup: [
      { name: "Okta", category: "Gestión de Identidad", users: "12,100", score: "97%" },
      { name: "CrowdStrike", category: "Ciberseguridad", users: "8,500", score: "94%" },
      { name: "1Password", category: "Gestor de Claves", users: "16,300", score: "98%" },
      { name: "Jamf", category: "Gestión de Dispositivos", users: "4,900", score: "91%" },
    ]
  },
  {
    id: "soporte",
    label: "Soporte al Cliente",
    title: "Retén a tus mejores usuarios",
    color: brandColors.terracotta,
    mockup: [
      { name: "Zendesk", category: "Tickets de Soporte", users: "14,700", score: "95%" },
      { name: "Intercom", category: "Chat & Engagement", users: "9,200", score: "93%" },
      { name: "Gorgias", category: "Soporte Ecommerce", users: "5,400", score: "91%" },
      { name: "Front", category: "Bandeja Compartida", users: "4,100", score: "89%" },
    ]
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

        {/* Scrolling Tabs */}
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

        {/* Complex Layered UI Content Area */}
        <div className="relative mx-auto max-w-6xl">
          <div 
            className="rounded-[2.5rem] p-4 sm:p-8 transition-colors duration-700"
            style={{ backgroundColor: activeTab.color.soft }}
          >
            <div className="rounded-[2rem] overflow-hidden bg-white shadow-2xl ring-1 ring-stone-900/5 h-[500px] sm:h-[650px] relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex"
                >
                  {/* Background Mockup (Dashboard UI) */}
                  <div className="flex w-full h-full opacity-60 sm:opacity-100">
                    {/* Sidebar */}
                    <div className="w-64 bg-stone-50 border-r border-stone-200 hidden md:block p-6">
                      <div className="font-bold text-xl mb-8 flex items-center gap-3 text-stone-900">
                        <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center text-sm shadow-sm" style={{ backgroundColor: activeTab.color.solid }}>sh</div>
                        shwcs
                      </div>
                      <div className="space-y-6">
                        <div>
                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">Descubrimiento</div>
                          <div className="flex items-center gap-3 text-stone-900 bg-white shadow-sm border border-stone-200 p-2.5 rounded-xl font-medium text-sm">
                            <span className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ backgroundColor: activeTab.color.solid }}></span>
                            {activeTab.label}
                          </div>
                          <div className="flex items-center gap-3 text-stone-500 p-2.5 text-sm font-medium hover:bg-stone-100 rounded-xl transition-colors mt-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span>
                            Recomendaciones
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">Mi Espacio</div>
                          <div className="flex items-center gap-3 text-stone-500 p-2.5 text-sm font-medium hover:bg-stone-100 rounded-xl transition-colors">
                            <span className="w-2.5 h-2.5 rounded-full bg-stone-300"></span>
                            Mi Stack Tecnológico
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Table Area */}
                    <div className="flex-1 p-6 sm:p-10 bg-white">
                      <div className="flex justify-between items-center mb-8 border-b border-stone-100 pb-6">
                        <h3 className="text-2xl font-semibold text-stone-900 tracking-tight">{activeTab.label} <span className="text-stone-400 font-normal text-lg ml-2">• 24 resultados</span></h3>
                        <div className="hidden sm:flex gap-3">
                          <div className="px-4 py-2 rounded-lg bg-stone-50 text-sm text-stone-600 font-medium border border-stone-200 shadow-sm">Filtros</div>
                          <div className="px-4 py-2 rounded-lg text-sm text-white font-medium shadow-sm" style={{ backgroundColor: activeTab.color.solid }}>Comparar</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-12 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-4 px-4">
                        <div className="col-span-8 sm:col-span-6">Software</div>
                        <div className="col-span-4 hidden sm:block">Empresas</div>
                        <div className="col-span-4 sm:col-span-2 text-right">Match</div>
                      </div>

                      <div className="space-y-3">
                        {activeTab.mockup.map((row, i) => (
                          <div key={i} className="grid grid-cols-12 items-center p-4 rounded-2xl border border-stone-100 hover:border-stone-200 hover:shadow-sm bg-white transition-all">
                            <div className="col-span-8 sm:col-span-6 flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: activeTab.color.solid }}>
                                {row.name.charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-stone-900">{row.name}</div>
                                <div className="text-xs text-stone-500 mt-0.5">{row.category}</div>
                              </div>
                            </div>
                            <div className="col-span-4 hidden sm:flex items-center gap-2 text-sm text-stone-600 font-medium">
                              {row.users}
                            </div>
                            <div className="col-span-4 sm:col-span-2 flex justify-end">
                              <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold rounded-lg shadow-sm">
                                {row.score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 hidden sm:block" aria-hidden="true">
                    <path 
                      d="M 50% 50% Q 65% 20% 80% 12%" 
                      stroke="#CBD5E1" 
                      strokeWidth="2" 
                      strokeDasharray="6 6" 
                      fill="none"
                      className="opacity-60"
                    />
                    <circle cx="50%" cy="50%" r="4" fill={activeTab.color.solid} />
                    <circle cx="80%" cy="12%" r="4" fill={activeTab.color.solid} />
                  </svg>

                  {/* Floating Center Card (Analysis Layer) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] border border-white p-8 z-20 w-[22rem] backdrop-blur-xl">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ backgroundColor: activeTab.color.solid }}>
                        {activeTab.label.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-stone-900 text-lg leading-tight">{activeTab.title}</div>
                        <div className="text-xs text-stone-500 mt-1 font-medium">Motor de compatibilidad shwcs</div>
                      </div>
                    </div>
                    
                    <div className="space-y-5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600 font-medium">Revisión de seguridad</span>
                        <div className="w-6 h-6 rounded-full bg-green-500 shadow-sm flex items-center justify-center text-white text-xs font-bold">✓</div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600 font-medium">Presupuesto validado</span>
                        <div className="w-6 h-6 rounded-full bg-green-500 shadow-sm flex items-center justify-center text-white text-xs font-bold">✓</div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-stone-600 font-medium">Capacidad técnica</span>
                        <div className="w-6 h-6 rounded-full border-2 border-stone-200 flex items-center justify-center text-stone-400 text-xs">
                          <span className="animate-spin h-3 w-3 border-2 border-stone-300 border-t-stone-600 rounded-full"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Right Floating Action Pill */}
                  <div className="absolute top-[8%] right-[8%] md:top-[10%] md:right-[15%] bg-white rounded-2xl px-5 py-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] border border-stone-100 z-20 flex items-center gap-3 text-sm font-semibold text-stone-900 hover:scale-105 transition-transform cursor-default hidden sm:flex">
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: activeTab.color.solid }}></div>
                    Añadir al Stack
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
