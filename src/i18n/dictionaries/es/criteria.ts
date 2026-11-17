export const criteria = {
  metaTitle: 'Qué revisamos',
  titleLine1: 'Qué revisamos',
  titleLine2: 'antes de publicar',
  desc: 'Antes de publicar, una persona del equipo editorial revisa cada ficha con estos 8 criterios. Revisamos la información que declaras; la revisión no certifica la calidad, la seguridad ni los resultados del proyecto.',
  link: 'Ver proceso de publicación',
  criterionPrefix: 'Criterio',
  items: {
    clarity: {
      title: 'Claridad del problema',
      desc: 'Un catálogo útil necesita contexto real. Revisamos que la ficha explique con claridad qué problema operativo resuelve y quién es su cliente ideal, sin jerga genérica de marketing.',
    },
    architecture: {
      title: 'Coherencia técnica',
      desc: 'No auditamos el código ni probamos el producto a fondo. Sí revisamos que lo que declaras sea coherente: si mencionas integraciones con otras herramientas, buscamos documentación o una página pública que las muestre.',
    },
    design: {
      title: 'Capturas y demo',
      desc: 'Son opcionales, pero ayudan a decidir. Si agregas capturas o una demo, revisamos que muestren el producto real y no imágenes genéricas.',
    },
    businessModel: {
      title: 'Modelo de negocio',
      desc: 'Precio, implementación y costos adicionales son opcionales, pero si los declaras deben entenderse. Si no los publicas, la ficha lo muestra como información faltante en lugar de inventarla.',
    },
    domain: {
      title: 'Control del dominio',
      desc: 'Después de publicar puedes demostrar, con un registro TXT, que controlas el dominio de tu sitio; la ficha lo indica mientras siga vigente. Es opcional y prueba control del dominio, no identidad legal.',
    },
    evidence: {
      title: 'Evidencia y casos de uso',
      desc: 'Si la ficha promete resultados, como horas ahorradas, retorno o casos de éxito, pedimos el contexto o una fuente que los respalde. No verificamos esos resultados por nuestra cuenta.',
    },
    security: {
      title: 'Datos y normativas',
      desc: 'Revisamos que el sitio enlazado sea el oficial del proyecto. Las normativas que declares, como protección de datos o facturación local, aparecen como declaradas por el proyecto, no como certificadas por shwcs.',
    },
    ethics: {
      title: 'Ética comercial',
      desc: 'Cero tolerancia a spam agresivo, afirmaciones falsas sobre competidores o uso de propiedad intelectual ajena. Cualquier persona con cuenta puede reportar una ficha publicada.',
    },
  },
  orderTitle: 'Cómo se ordena el catálogo',
  orderDesc:
    'Dentro de cada categoría, el orden refleja interacción real de compradores — reseñar, comentar, guardar, dar like — no una puntuación de calidad ni un aval editorial. Todo empieza en cero. Solo cuenta la actividad de cuentas con correo verificado, y pesa menos con el tiempo: un empujón antiguo no fija el orden para siempre. Es una señal auxiliar, no una certificación.',
  communityOrder:
    'Las listas de Comunidad ordenadas por «Populares» siguen las mismas reglas: cuentan los likes, guardados y comentarios de cuentas con correo verificado, nunca los de quien hizo la lista, y pierden peso con el tiempo.',
  /** SHCWS-52: the response signal (src/lib/solutions/response-model.ts). */
  responseNote:
    'Cuando un proyecto recibió al menos 3 solicitudes de contacto de cuentas con correo verificado en los últimos 90 días, su ficha y sus tarjetas dicen cuánto suele tardar en responder (la mediana hasta la primera respuesta) y cuántas respondió. «Responde rápido» marca a quien responde al menos 8 de cada 10 con esa mediana en 48 h o menos. No cuentan las solicitudes de las últimas 72 horas que aún esperan respuesta ni las que el comprador retiró antes de recibirla, salvo que ya llevaran 7 días sin respuesta: a esas las marcamos «sin respuesta» y cuentan siempre.',
  weights: {
    review: {
      label: 'Reseña',
      desc: 'La señal más fuerte: suma sus estrellas multiplicadas según su verificación: ×1 con correo verificado, ×1.5 con correo de empresa, ×2 si su autor contactó al proyecto vía shwcs y la conversación avanzó, ×3 con compra comprobada. Las que llegan por el enlace de invitación del propio proyecto cuentan la mitad, porque el proyecto elige a quién invitar. Una reseña baja nunca resta. Nadie puede reseñar su propia solución ni escribir desde el dominio del proveedor.',
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
    response: {
      label: 'Respuesta',
      desc: 'Suma hasta 2 puntos —lo que un guardado— según la parte de las solicitudes que responde: completo si la mediana de respuesta es de 48 h o menos, la mitad si es de una semana o menos.',
    },
    view: {
      label: 'Vista',
      desc: 'Tráfico real, con rendimientos decrecientes: miles de vistas no ahogan unos pocos comentarios.',
    },
  },
} as const;
