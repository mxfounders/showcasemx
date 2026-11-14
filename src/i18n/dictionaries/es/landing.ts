export const landing = {
  loadingCatalog: 'Cargando catálogo',
  /** The home's only call to founders (SHCWS-38): the buyer flow above shows real projects only. */
  founderTitle: '¿Construyes software para empresas?',
  founderSubtitle:
    'Publica gratis tu software, agencia o servicio: cuéntanos qué resuelves y para quién. El equipo revisa cada ficha antes de publicarla.',
  founderButton: 'Publicar gratis',
  founderDisclaimer: 'La postulación no garantiza la publicación.',
  heroLine1: 'Encuentra soluciones.',
  heroLine2: 'Conoce a sus creadores.',
  heroDescription:
    'Descubre herramientas creadas para resolver los retos de tu empresa. En shwcs seleccionamos productos, te ayudamos a entender qué resuelven y te acercamos a quienes los construyen.',
  heroSearchPlaceholder: '¿Qué necesitas resolver en tu empresa?',
  heroSearchButton: 'Encontrar soluciones',
  heroSearchButtonMobile: 'Buscar',
  heroSearchTry: 'Prueba con',
  heroSearchOr: 'o',
  /** Candidates only: the hero shows the first ones that return results today. */
  heroSearchExamples: [
    'quiero cobrar a tiempo',
    'cotizaciones para mayoreo',
    'una tienda en línea',
    'necesito organizar mi nómina',
    'controlar mis finanzas',
    'contratos digitales',
    'automatizar mi operación',
  ],
  heroExplore: 'Explora:',
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
    cards: {
      catalog: {
        badge: 'CATÁLOGO',
        title: 'Fichas que responden lo mismo',
        description:
          'Cada proyecto contesta las mismas preguntas: qué problema resuelve, para quién, qué puede hacer, cuánto cuesta y cómo se implementa. Lo que no declaró aparece como faltante; no lo inventamos.',
        button: 'Explorar catálogo',
      },
      lists: {
        badge: 'LISTAS Y COMPARADOR',
        title: 'Guarda opciones y compáralas',
        description:
          'Guarda proyectos, organízalos en listas privadas con tus propias notas y compara dos o tres lado a lado con lo que cada uno publicó. Sin puntajes ni recomendaciones inventadas.',
        button: 'Crear una lista',
      },
      contact: {
        badge: 'CONTACTO',
        title: 'Contacta con contexto',
        description:
          'Envía una solicitud al equipo del proyecto con tu necesidad, plazo y tamaño de equipo. Antes de enviarla ves exactamente qué compartes, y das seguimiento a la respuesta desde tu cuenta.',
        button: 'Buscar un proyecto',
      },
      reviews: {
        badge: 'RESEÑAS',
        title: 'Reseñas con nivel de verificación',
        description:
          'Cada reseña muestra qué se comprobó de quien la escribió: correo verificado, correo de empresa o compra comprobada. El proyecto puede responder en público, pero no borrarlas.',
        button: 'Cómo revisamos',
      },
    },
  },
} as const;
