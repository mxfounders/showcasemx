'use client';

import { useState } from 'react';

const steps = [
  {
    id: '01',
    title: 'Prepara tu ficha',
    description: 'Empieza con un borrador privado. Tómate el tiempo de redactar el problema que resuelves, definir a tu cliente ideal y agregar capturas o demos. No hay límite de tiempo para enviar.',
    bg: '#EDF4FF',
    text: '#2F4F9E',
    num: '#A3C1FA',
  },
  {
    id: '02',
    title: 'Revisión editorial',
    description: 'Una vez que envías la postulación, nuestro equipo evalúa la claridad de la información. Si falta contexto o encontramos detalles confusos, te enviaremos sugerencias exactas de lo que debes corregir. Nada se rechaza sin una explicación.',
    bg: '#EAF4E9',
    text: '#3A6349',
    num: '#A0CCAE',
  },
  {
    id: '03',
    title: 'Publicación',
    description: 'Al aprobarse, tu ficha se vuelve pública y visible en el directorio. Cualquier actualización futura (cambios de precio, rediseños) se guardará como un borrador nuevo y pasará por revisión rápida.',
    bg: '#F5EDFA',
    text: '#64478C',
    num: '#CBAFEA',
  },
  {
    id: '04',
    title: 'Distribución',
    description: 'Si tu solución resuelve un problema complejo de manera excepcional, nuestro equipo editorial podría destacarla en análisis profundos, newsletters y casos de uso para operadores clave.',
    bg: '#FFF6E5',
    text: '#8A6013',
    num: '#EDC67E',
  },
  {
    id: '05',
    title: 'Conexión real',
    description: 'Quienes descubren tu ficha no son mirones casuales; son operadores buscando herramientas. Recibe interés calificado de personas que ya entienden tu propuesta de valor y tus restricciones.',
    bg: '#FAEDEA',
    text: '#9C4C34',
    num: '#E8A593',
  }
];

export function StepsAccordion() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col lg:flex-row w-full h-[700px] lg:h-[450px] gap-3 sm:gap-4">
      {steps.map((step, idx) => {
        const isActive = active === idx;
        
        return (
          <div
            key={step.id}
            onClick={() => setActive(idx)}
            className="group relative overflow-hidden rounded-[28px] lg:rounded-[36px] cursor-pointer transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ 
              backgroundColor: step.bg, 
              flexBasis: 0,
              flexGrow: isActive ? 5 : 1 
            }}
          >
            {/* Active Content */}
            <div className={`absolute inset-0 p-6 sm:p-10 flex flex-col justify-between min-w-[320px] transition-opacity duration-700 delay-100 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
              <div>
                <span className="text-5xl lg:text-6xl font-light tracking-tighter" style={{ color: step.num }}>
                  {step.id}
                </span>
                <div className={`mt-8 transform transition-all duration-700 delay-150 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight whitespace-normal" style={{ color: step.text }}>
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-sm text-sm sm:text-base leading-relaxed whitespace-normal opacity-90" style={{ color: step.text }}>
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Inactive Content - Horizontal (Mobile) */}
            <div className={`lg:hidden absolute inset-0 p-6 flex items-center gap-4 transition-opacity duration-300 ${!isActive ? 'opacity-100 delay-300' : 'opacity-0'}`}>
              <span className="text-2xl font-light tracking-tighter" style={{ color: step.num }}>{step.id}</span>
              <span className="text-lg font-medium tracking-wide whitespace-nowrap" style={{ color: step.text }}>{step.title}</span>
            </div>

            {/* Inactive Content - Vertical (Desktop) */}
            <div className={`hidden lg:flex absolute inset-0 py-10 flex-col items-center justify-between transition-opacity duration-300 ${!isActive ? 'opacity-100 delay-300' : 'opacity-0'}`}>
              <span className="text-3xl font-light tracking-tighter" style={{ color: step.num }}>{step.id}</span>
              <span className="text-xl font-medium tracking-wide" style={{ color: step.text, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                {step.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
