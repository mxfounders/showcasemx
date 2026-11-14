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
    november: 'Noviembre de 2026',
    october: 'Octubre de 2026',
    september: 'Septiembre de 2026',
    august: 'Agosto de 2026',
  },
  /**
   * Only what is live (SHCWS-131): each entry matches a release in the git history of
   * main, dated by the day it shipped. Work still on a branch stays out.
   */
  releases: {
    conversations: {
      date: '14 de noviembre de 2026',
      label: 'Contactos',
      title: 'Conversaciones con los proyectos',
      summary:
        'Después de pedir una propuesta, tú y el proyecto pueden escribirse dentro de shwcs sin perder el hilo.',
      items: [
        'Los dos lados escriben mensajes y arriba se ve a quién le toca responder.',
        'Cada mensaje avisa a la otra parte en su cuenta y por correo.',
        'Los proyectos ven qué oportunidades no han leído.',
      ],
    },
    listings: {
      date: '14 de noviembre de 2026',
      label: 'Fichas',
      title: 'Publica tu proyecto en minutos',
      summary:
        'Pegas el enlace de tu sitio y la ficha se llena con su nombre, descripción, portada y redes. Después son tres pasos para enviarla a revisión.',
      items: [
        '14 categorías y 15 industrias, y «¿No ves tu categoría?» para decirnos qué falta.',
        '«Verificado por shwcs»: el equipo revisa el proyecto y la ficha lo muestra, sin pedirte el RFC.',
        'Reconocimientos: Top de la semana por actividad verificada y Selección shwcs, elegida por el equipo.',
        'Insignias para poner en tu sitio, en claro u oscuro y en los dos idiomas.',
      ],
    },
    reviewInvites: {
      date: '14 de noviembre de 2026',
      label: 'Reseñas',
      title: 'Más reseñas y preguntas en cada ficha',
      summary:
        'Los proyectos pueden invitar a sus clientes a reseñar, y cualquiera puede hacer una pregunta en la ficha.',
      items: [
        'Una reseña por invitación dice «Invitada por el proyecto» y pesa la mitad en el orden del catálogo.',
        '«Contactó vía shwcs» marca la reseña de quien habló con el proyecto aquí, sin mostrar la conversación.',
        'Preguntas públicas con la respuesta del proyecto.',
      ],
    },
    alerts: {
      date: '14 de noviembre de 2026',
      label: 'Descubrimiento',
      title: 'Avisos de lo que te interesa',
      summary: 'Guarda una búsqueda y te avisamos cuando se publique algo que encaje.',
      items: [
        '«Avísame» en la búsqueda y en cada categoría; las administras en Mis alertas.',
        'Sigue listas de la comunidad y a quienes las firman.',
        'Cada lunes, los proyectos reciben «Tu semana en shwcs» con sus visitas, clics y lo que tienen pendiente.',
      ],
    },
    gota: {
      date: '23 de octubre de 2026',
      label: 'Diseño',
      title: 'Íconos nuevos en todo shwcs',
      summary:
        'Toda la interfaz se dibuja ahora con Gota, el set de íconos de Flouvia: trazos más finos y un solo estilo en el sitio, la cuenta y el panel del equipo.',
      items: [
        'Cada página carga solo los íconos que usa.',
        'Los íconos decorativos siguen ocultos para lectores de pantalla; los que significan algo conservan su nombre accesible.',
      ],
    },
    reviews: {
      date: '10 de octubre de 2026',
      label: 'Reseñas',
      title: 'Reseñas de quienes usan cada proyecto',
      summary:
        'Cualquier cuenta puede reseñar una ficha publicada: estrellas, para qué la usa, lo mejor y lo que mejoraría. Cada reseña dice qué tan comprobado está quien la escribe.',
      items: [
        'Una reseña por cuenta y ficha; se publica cuando el correo de quien la escribe está verificado.',
        'Niveles visibles: correo verificado, correo de empresa y compra comprobada con su CFDI.',
        'El dueño responde en público, pero nunca edita ni borra una reseña; nadie reseña su propia ficha.',
        'Las estrellas y el número de reseñas aparecen en las tarjetas del catálogo.',
      ],
    },
    registries: {
      date: '10 de octubre de 2026',
      label: 'Confianza',
      title: 'Registros públicos en la ficha',
      summary:
        'Cuando hay una identidad fiscal registrada, la ficha dice si el proveedor aparece en la lista 69-B del SAT y con qué fecha de corte, sin mostrar el RFC.',
      items: [
        'La lista se actualiza cada día desde la fuente oficial.',
        '«Compra comprobada»: quien reseña puede validar su CFDI ante el SAT; solo se guarda una huella del folio.',
      ],
    },
    english: {
      date: '10 de octubre de 2026',
      label: 'Idiomas',
      title: 'shwcs completo en inglés',
      summary:
        'Después de las páginas informativas en septiembre, ahora todo el sitio y la cuenta funcionan en español y en inglés.',
      items: [
        'Catálogo, fichas, comunidad, blog, cuenta y configuración en los dos idiomas.',
        'Los mensajes de error llegan en el idioma de la página desde la que actúas.',
        'Los 16 artículos del blog tienen versión en inglés.',
        'Los correos siguen en español por ahora.',
      ],
    },
    communityReports: {
      date: '5 de septiembre de 2026',
      label: 'Comunidad',
      title: 'Reporta listas y comentarios de la comunidad',
      summary:
        'Si una lista pública o un comentario rompe las reglas, cualquier cuenta puede reportarlo y el equipo lo revisa.',
      items: [
        'Motivos claros: spam, abuso, suplantación u otro.',
        'Nadie puede reportar su propia lista o comentario.',
        'La búsqueda de Comunidad encuentra coincidencias parciales en el nombre, la descripción y los proyectos de cada lista.',
      ],
    },
    security: {
      date: '3 de septiembre de 2026',
      label: 'Cuenta',
      title: 'Más control sobre tu cuenta y tus datos',
      summary:
        'Configuración ahora muestra qué falta por proteger y te deja decidir qué pasa con tu información.',
      items: [
        'Verificación en dos pasos opcional con app autenticadora y códigos de respaldo.',
        'Lista de sesiones abiertas para cerrar las que no reconozcas.',
        'Descarga una copia de tus datos o elimina tu cuenta cuando quieras.',
      ],
    },
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
