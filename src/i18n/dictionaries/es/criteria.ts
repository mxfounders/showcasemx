export const criteria = {
  metaTitle: 'Qué revisamos',
  titleLine1: 'Qué revisamos',
  titleLine2: 'antes de publicar',
  desc: 'Evaluamos exhaustivamente cada proyecto en 8 dimensiones clave operativas para garantizar la calidad del directorio.',
  link: 'Ver proceso de publicación',
  criterionPrefix: 'Criterio',
  items: {
    clarity: {
      title: 'Claridad del problema',
      desc: 'Un directorio útil requiere contexto real. Evaluamos que la ficha explique de forma cristalina qué problema operativo resuelve, quién es el cliente ideal y por qué es mejor que usar una hoja de cálculo. Cero jerga genérica de marketing.',
    },
    architecture: {
      title: 'Arquitectura y técnica',
      desc: 'No auditamos el código fuente, pero revisamos la coherencia de la arquitectura. Si prometes integraciones nativas con SAP o Salesforce, buscamos la documentación técnica. Evaluamos los tiempos de carga, las dependencias de infraestructura (como SSO, APIs abiertas y webhooks) y nos aseguramos de que el producto no sea simplemente una capa gráfica inestable montada sobre ChatGPT. Queremos software corporativo real.',
    },
    design: {
      title: 'Diseño y UX',
      desc: 'La consumerización del B2B es real. Revisamos que las capturas de la plataforma muestren una interfaz moderna, limpia y que respete los estándares actuales de usabilidad.',
    },
    businessModel: {
      title: 'Modelo de negocio',
      desc: 'Transparencia absoluta. Exigimos que la estructura de precios, las tarifas de implementación y los módulos adicionales ocultos se expliquen claramente.',
    },
    domain: {
      title: 'Identidad del dominio',
      desc: 'Para evitar fraudes o suplantación, verificamos exhaustivamente que el correo del fundador coincida directamente con el dominio del sitio web postulado.',
    },
    evidence: {
      title: 'Evidencia y casos de uso',
      desc: 'Las promesas gigantes necesitan resultados verificables. Pedimos que el ROI prometido, las horas ahorradas y los casos de éxito se presenten con fuentes. No aceptamos muros llenos de logotipos de "clientes confiables" sin un desglose detallado de qué problema exacto les resolviste.',
    },
    security: {
      title: 'Seguridad base',
      desc: 'Buscamos certificados SSL activos, políticas de privacidad transparentes, soporte de roles (RBAC) y, para planes Enterprise, normativas como SOC2 o GDPR.',
    },
    ethics: {
      title: 'Ética comercial',
      desc: 'Nuestra regla fundamental: cero tolerancia a tácticas de spam agresivas, afirmaciones falsas sobre competidores o robo de propiedad intelectual.',
    },
  },
  orderTitle: 'Cómo se ordena el catálogo',
  orderDesc:
    'Dentro de cada categoría, el orden refleja interacción real de compradores — reseñar, comentar, guardar, dar like — no una puntuación de calidad ni un aval editorial. Todo empieza en cero. Solo cuenta la actividad de cuentas con correo verificado, y pesa menos con el tiempo: un empujón antiguo no fija el orden para siempre. Es una señal auxiliar, no una certificación.',
  weights: {
    review: {
      label: 'Reseña',
      desc: 'La señal más fuerte: suma sus estrellas, y vale 1.5 veces si quien la escribe usa un correo de empresa. Una reseña baja nunca resta. Nadie puede reseñar su propia solución ni escribir desde el dominio del proveedor.',
    },
    comment: {
      label: 'Comentario',
      desc: 'La señal más costosa de dar: alguien se tomó el tiempo de escribir. Un fundador no puede comentar su propia ficha.',
    },
    save: {
      label: 'Guardado',
      desc: 'Expresa intención de volver o comparar más adelante.',
    },
    like: {
      label: 'Like',
      desc: 'La interacción más fácil de dar. Un fundador tampoco puede dársela a su propia ficha.',
    },
    view: {
      label: 'Vista',
      desc: 'Tráfico real, con rendimientos decrecientes: miles de vistas no ahogan unos pocos comentarios.',
    },
  },
} as const;
