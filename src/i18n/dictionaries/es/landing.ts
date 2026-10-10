export const landing = {
  loadingCatalog: 'Cargando catálogo',
  founderTitle: '¿Construyes algo que una empresa necesita?',
  founderSubtitle:
    'Postula tu software, agencia o servicio y cuéntanos qué resuelves y para quién.',
  founderButton: 'Postular mi solución',
  founderDisclaimer: 'La postulación no garantiza la publicación.',
  heroLine1: 'Encuentra soluciones.',
  heroLine2: 'Conoce a sus creadores.',
  heroDescription:
    'Descubre herramientas creadas para resolver los retos de tu empresa. En shwcs seleccionamos productos, te ayudamos a entender qué resuelven y te acercamos a quienes los construyen.',
  heroSearchPlaceholder: '¿Qué necesitas resolver en tu empresa?',
  heroSearchButton: 'Encontrar soluciones',
  heroSearchButtonMobile: 'Buscar',
  heroSearchExample: 'Prueba con “quiero cobrar a tiempo” o “necesito organizar mi nómina”.',
  heroExplore: 'Explora:',
  heroExploreFinance: 'Finanzas',
  heroExplorePayroll: 'Nómina',
  heroExploreSales: 'CRM',
  features: {
    titleLine1: 'Encuentra la tecnología',
    titleLine2: 'exacta para tu industria',
    description:
      'Explora herramientas y servicios diseñados para resolver cada uno de tus retos operativos, todo en un solo lugar.',
    /** Tab labels, keyed by the concept ids of `conceptCategories` (src/lib/search/vocabulary.ts). */
    tabs: {
      crm: 'CRM & Ventas',
      marketing: 'Marketing Automatizado',
      rh: 'Nómina y RRHH',
      finanzas: 'Finanzas & Cobros',
      operaciones: 'Logística y Operaciones',
      legal: 'Legal y Contratos',
      datos: 'Datos y Analítica',
      ti: 'Seguridad y TI',
      soporte: 'Soporte al Cliente',
      ecommerce: 'E-commerce',
      proyectos: 'Gestión de Proyectos',
      diseno: 'Diseño & UX',
      automatizacion: 'IA & Automatización',
      comunicacion: 'Comunicación B2B',
      desarrollo: 'Desarrollo & Nube',
    },
  },
  stackingCards: {
    secondaryAction: 'Conocer más',
    slotLabel: 'Espacio',
    slotTitleLine1: 'Tu solución',
    slotTitleLine2: 'puede estar aquí.',
    cards: {
      data: {
        badge: 'CATÁLOGO',
        title: 'Obtén datos del marketplace más completo',
        description:
          'Un solo lugar para comparar más de 2,000 herramientas B2B. Crea señales de intención y toma decisiones basadas en datos reales de uso y presupuesto en Latinoamérica.',
        button: 'Explorar catálogo',
      },
      agents: {
        badge: 'RECOMENDACIONES',
        title: 'Encuentra la aguja en el pajar al instante',
        description:
          'Nuestra IA analiza tu industria, tamaño y presupuesto para recomendarte el stack tecnológico exacto que usan las empresas más exitosas de tu sector.',
        button: 'Ver recomendaciones',
      },
      enrichment: {
        badge: 'GESTIÓN',
        title: 'Centraliza el control de tus suscripciones',
        description:
          'Deja de pagar por licencias que nadie usa. Conecta tu stack y recibe alertas automáticas sobre gastos duplicados y renovaciones próximas.',
        button: 'Optimizar gastos',
      },
      outbound: {
        badge: 'IMPLEMENTACIÓN',
        title: 'Conecta con expertos certificados',
        description:
          'No te quedes a la mitad. Te conectamos directamente con agencias y consultores verificados que configurarán tu software nuevo en tiempo récord.',
        button: 'Contactar expertos',
      },
    },
  },
} as const;
