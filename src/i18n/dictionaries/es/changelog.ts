export const changelog = {
  metaTitle: 'Lo que cambia en shwcs',
  heroTitle: 'Lo nuevo en shwcs',
  heroDesc1: 'Un registro de los cambios que ya puedes usar en shwcs.',
  heroDesc2:
    'Publicamos funciones cuando están disponibles. Las ideas que siguen en desarrollo se quedan fuera hasta convertirse en algo real.',
  feedbackBtn: 'Cuéntanos qué mejorarías',
  filterTitle: 'Filtrar lanzamientos',
  categoryLabel: 'Categoría',
  releaseLabel: 'lanzamiento',
  releasesLabel: 'lanzamientos',
  updateLabel: 'actualización',
  updatesLabel: 'actualizaciones',
  filterAria: 'Filtrar lanzamientos por categoría',
  categories: {
    all: 'Todos',
    product: 'Producto',
    community: 'Comunidad',
    panel: 'Panel',
    account: 'Cuenta',
  },
  months: {
    september: 'Septiembre de 2026',
    august: 'Agosto de 2026',
  },
  releases: {
    capabilities: {
      date: '5 de septiembre de 2026',
      label: 'Nuevo',
      title: 'Filtra por lo que un proyecto hace, no solo por su categoría',
      summary:
        'Cada proyecto puede declarar sus capacidades concretas — cotizaciones, facturación CFDI, nómina, integraciones y más — para que el catálogo lo encuentre por lo que realmente resuelve.',
      items: [
        'Filtros nuevos por capacidad, integraciones, rango de precio, tiempo de arranque y cumplimiento normativo en /explorar, /industria y /colecciones.',
        'Un filtro solo aparece cuando al menos un proyecto real lo cubre — nada de opciones que no llevan a ningún lado.',
        'El formulario de postulación sugiere capacidades a partir de lo que ya escribiste; nunca las marca por ti.',
      ],
    },
    conceptSearch: {
      date: '5 de septiembre de 2026',
      label: 'Búsqueda',
      title: 'La búsqueda entiende conceptos, no solo palabras exactas',
      summary:
        'Buscar "cotizaciones de mayoreo" o "agencias que cotizan" ahora encuentra proyectos de Ventas aunque su ficha nunca use esas palabras.',
      items: [
        'Vocabulario propio por categoría, industria y capacidad declarada.',
        'Prioriza coincidencias literales; el vocabulario ampliado nunca las supera.',
        'Aplica igual en el catálogo y en tus guardados.',
      ],
    },
    listingSocial: {
      date: '3 de septiembre de 2026',
      label: 'Comunidad',
      title: 'Cada ficha ahora tiene like y comentarios',
      summary:
        'La misma capa social que ya tenían las listas de la comunidad llega a las fichas de proyecto, con un orden de catálogo basado en interacción real.',
      items: [
        'Dale like o comenta cualquier ficha con tu cuenta; un fundador no puede hacerlo en la suya.',
        'El orden del catálogo ahora refleja esa actividad, con más peso a comentarios que a guardados y a guardados que a likes.',
        'Solo cuenta la actividad de cuentas con correo verificado.',
      ],
    },
    listingCover: {
      date: '3 de septiembre de 2026',
      label: 'Producto',
      title: 'Portada automática y logos reales en cada ficha',
      summary:
        'Al escribir tu sitio, tu ficha ya tiene una portada — y las redes de cada proyecto se muestran con su logo real.',
      items: [
        'La portada se lee del propio sitio del proyecto y se guarda como copia propia, nunca como enlace externo.',
        'Logos de LinkedIn, X, Instagram, YouTube, GitHub, TikTok y Product Hunt junto a cada enlace.',
        'Un carrusel de imágenes reúne la portada y las capturas del fundador en cada ficha.',
      ],
    },
    welcome: {
      date: '3 de septiembre de 2026',
      label: 'Cuenta',
      title: 'Una bienvenida de tres pasos para conocerte mejor',
      summary:
        'Antes de entrar a tu panel, shwcs te pregunta tu nombre, tu perfil y tu rol — así el inicio se adapta a ti desde el primer momento.',
      items: [
        'Nombre y empresa, perfil (comprador, fundador, ambos o explorando) y rol.',
        'Las cuentas de Google que ya traen nombre saltan ese primer paso.',
        'No cambia permisos ni tipo de cuenta; solo tu experiencia de inicio.',
      ],
    },
    identity: {
      date: '1 de septiembre de 2026',
      label: 'Ahora',
      title: 'shwcs ya tiene una voz y un lugar propios',
      summary:
        'La experiencia pública ahora reúne una identidad más clara, páginas editoriales y mejores caminos para descubrir qué estamos construyendo.',
      items: [
        'Nueva identidad visual en navegación, cuenta y páginas públicas.',
        'Blog editorial con búsqueda, categorías y lectura optimizada.',
        'Contacto guiado que adapta las preguntas al motivo de cada conversación.',
      ],
    },
    publicLists: {
      date: '31 de agosto de 2026',
      label: 'Comunidad',
      title: 'Las listas dejaron de ser solo carpetas privadas',
      summary:
        'Ahora una selección puede organizar una compra, compartirse con otras personas y convertirse en un punto de conversación.',
      items: [
        'Listas privadas y públicas con categorías.',
        'Exploración por popularidad o fecha.',
        'Me gusta, guardados y comentarios en listas públicas.',
      ],
    },
    founderSignals: {
      date: '31 de agosto de 2026',
      label: 'Operación',
      title: 'Más señales para quienes presentan un proyecto',
      summary:
        'El panel concentra el estado de las fichas, las conversaciones y la actividad que ayuda a entender qué despierta interés.',
      items: [
        'Métricas de vistas y clics con actividad por día.',
        'Centro de notificaciones dentro de la cuenta.',
        'Seguimiento de oportunidades y solicitudes de contacto.',
      ],
    },
    oneAccount: {
      date: '30 de agosto de 2026',
      label: 'Base',
      title: 'Una cuenta para descubrir y para construir',
      summary:
        'El acceso, los guardados y la publicación de proyectos comparten una misma cuenta, con controles claros para cada espacio.',
      items: [
        'Acceso seguro y recuperación de cuenta.',
        'Guardados, notas privadas y comparación de proyectos.',
        'Borradores, revisión editorial y control verificado de dominio.',
      ],
    },
  },
  footerTitle: '¿Algo debería funcionar mejor?',
  footerDesc: 'Cuéntanos qué te estorba, qué falta o qué esperabas encontrar.',
  footerBtn: 'Abrir una conversación',
} as const;
