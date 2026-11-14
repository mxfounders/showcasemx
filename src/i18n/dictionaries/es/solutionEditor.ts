/**
 * The founder's side of a solution: the guided editor, its media and cover tools,
 * domain verification, the /account/solutions pages and every message the
 * /api/solutions/* routes return.
 */
export const solutionEditor = {
  dateLocale: 'es-MX',
  /** Keyed by `SolutionStatus` (src/lib/solutions/model.ts). */
  statuses: {
    draft: { label: 'Borrador', next: 'Completa los datos y envía tu solución.' },
    pending: {
      label: 'En revisión',
      next: 'El equipo está revisando tu postulación. Puedes consultar lo que enviaste.',
    },
    changes_requested: {
      label: 'Necesita cambios',
      next: 'Revisa los comentarios, corrige y vuelve a enviar.',
    },
    published: {
      label: 'Publicada',
      next: 'Tu ficha está disponible. Las modificaciones necesitan una nueva revisión.',
    },
    rejected: {
      label: 'No aceptada',
      next: 'Consulta el motivo. Puedes preparar una versión corregida.',
    },
  },
  /**
   * The status of a listing that is published while a newer version is being prepared
   * (SHCWS-31): the public version stays live, so it never reads as a plain draft.
   */
  liveStatuses: {
    draft: 'Publicada · cambios sin enviar',
    pending: 'Publicada · cambios en revisión',
    changes_requested: 'Publicada · cambios pedidos',
    rejected: 'Publicada · cambios no aceptados',
  },
  /** /account/solutions/[id]: where the listing stands, at the top (SHCWS-31). */
  reviewBand: {
    pendingTitle: 'En revisión desde el {date}',
    pendingUpdateTitle: 'Tus cambios están en revisión desde el {date}',
    pendingText:
      'El equipo revisa que la información sea clara y verificable; no certifica resultados. Te avisamos en Avisos cuando haya una decisión.',
    pendingUpdateText:
      'Mientras tanto, la versión aprobada sigue publicada. Te avisamos en Avisos cuando haya una decisión.',
    expected: 'Normalmente revisamos en {hours} horas hábiles.',
    withdraw: 'Retirar envío y volver a editar',
    withdrawConfirm:
      'El envío sale de la cola de revisión y vuelve a borrador. Podrás editarlo y enviarlo otra vez cuando quieras.',
    withdrawConfirmButton: 'Retirar envío',
    withdrawing: 'Retirando…',
    cancel: 'Cancelar',
    changesTitle: 'El equipo pidió cambios el {date}',
    rejectedTitle: 'Tu postulación no se aceptó el {date}',
    comment: 'Comentario del equipo',
    fixLink: 'Ir a corregir',
    resubmitNote: 'Corrige lo que te piden y vuelve a enviar desde el último paso del formulario.',
    liveDraftTitle: 'Tu ficha sigue publicada',
    liveDraftText:
      'Lo que cambies aquí no es público hasta que lo envíes a revisión y el equipo lo apruebe.',
    unpublishedTitle: 'Ficha despublicada',
    unpublishedText:
      'Ya no aparece en el catálogo. Conservas el borrador, las reseñas y las conversaciones. Para volver a publicarla, envíala a revisión.',
  },
  /** Taking an approved listing off the catalog (SHCWS-32). */
  unpublish: {
    title: 'Despublicar ficha',
    intro:
      'Retírala del catálogo cuando quieras, por ejemplo si cerraste el producto o no quieres recibir más solicitudes. Para volver a publicarla, pasa otra vez por revisión.',
    button: 'Despublicar',
    confirmTitle: '¿Despublicar {name}?',
    consequences: [
      'Deja de aparecer en el catálogo, en las búsquedas y en las listas desde este momento.',
      'Conservas el borrador, las reseñas y las conversaciones. Cada comprador sigue viendo las suyas, pero nadie puede enviar solicitudes nuevas.',
      'Si tenías cambios en revisión, el envío también se retira.',
    ],
    bookingsOne:
      'Se cancela tu espacio patrocinado activo. Reembolsamos cada día que empiece al menos 24 horas después; los días ya iniciados no se reembolsan.',
    bookingsOther:
      'Se cancelan tus {count} espacios patrocinados activos. Reembolsamos cada día que empiece al menos 24 horas después; los días ya iniciados no se reembolsan.',
    confirm: 'Confirmar despublicación',
    working: 'Despublicando…',
    cancel: 'Cancelar',
  },
  /** Fixed messages of the founder's own actions in the history (`solutionSystemMessages`). */
  historyMessages: {
    submitted: 'Postulación enviada a revisión.',
    unpublished: 'Despublicaste la ficha.',
    submissionWithdrawn: 'Retiraste el envío de la revisión.',
  },
  /** Keyed by `solutionEvaluationFields[].key` (src/lib/solutions/model.ts). */
  evaluationFields: {
    scope: {
      label: 'Qué incluye',
      prompt: '¿Qué recibe quien te contrata?',
      placeholder: 'Funciones, entregables o alcance concreto. Aclara también qué no incluye.',
    },
    pricing: {
      label: 'Precios y contratación',
      prompt: '¿Cómo se contrata y cuánto cuesta?',
      placeholder:
        'Indica moneda, periodicidad y qué incluye. Si cotizas a medida, explica de qué depende.',
    },
    implementation: {
      label: 'Implementación',
      prompt: '¿Qué se necesita para empezar?',
      placeholder: 'Tiempo orientativo de puesta en marcha, requisitos y acompañamiento.',
    },
    integrations: {
      label: 'Integraciones',
      prompt: '¿Con qué herramientas se conecta?',
      placeholder:
        'Integraciones disponibles hoy. Distingue las que necesitan desarrollo adicional.',
    },
    support: {
      label: 'Soporte',
      prompt: '¿Qué acompañamiento ofreces?',
      placeholder: 'Canales, horarios e idioma. Evita prometer tiempos que no puedas cumplir.',
    },
    evidence: {
      label: 'Experiencia y evidencia',
      prompt: '¿Qué puedes mostrar de tu trabajo?',
      placeholder:
        'Un caso, una demo o un resultado con contexto. Comparte solo información que puedas hacer pública.',
    },
  },
  toComplete: 'Por completar',
  /** Keyed by `SolutionErrorCode` (src/lib/solutions/model.ts). */
  validation: {
    nameRequired: 'Dale un nombre a tu solución.',
    kindRequired: 'Selecciona qué ofreces.',
    categoryRequired: 'Selecciona al menos una categoría.',
    problemTooShort: 'Cuéntanos qué resuelves en al menos 20 caracteres.',
    audienceTooShort: 'Describe para quién es tu solución.',
    industriesRequired: 'Elige las industrias donde encaja, o marca que sirve a cualquiera.',
    companySizesRequired:
      'Elige los tamaños de empresa donde encaja, o marca que sirve a cualquiera.',
    capabilitiesRequired: 'Marca al menos una capacidad: qué hace tu solución en concreto.',
    capabilitiesOrphaned: 'Quitaste una categoría; revisa las capacidades que ya no aplican.',
    websiteInvalid: 'Escribe un enlace válido, por ejemplo tuproyecto.com.',
    contactEmailInvalid: 'Escribe un correo de contacto válido.',
    evidenceUrlInvalid:
      'El enlace de evidencia debe empezar por https:// y no contener credenciales.',
    demoUrlInvalid: 'Escribe un enlace HTTP(S) válido para la demo, sin credenciales.',
    screenshotCaptionsTooShort: 'Describe qué muestra cada captura en al menos 3 caracteres.',
    foundersInvalid:
      'Añade el nombre de cada persona y enlaces HTTP(S) válidos, o elimina los campos que no usarás.',
    projectLinksInvalid:
      'Completa los enlaces del proyecto con URLs HTTP(S) sin credenciales, o elimina los vacíos.',
  },
  /** Keyed by `solutionQuestions[].id` (src/lib/solutions/questions.ts). */
  questions: {
    basics: {
      title: '¿Qué es tu proyecto?',
      hint: 'Lo que verá una empresa en el catálogo. Si leímos tu sitio, ajústalo con tus palabras.',
    },
    fit: {
      title: '¿Dónde encaja?',
      hint: 'Elige sus categorías y marca lo que hace en concreto. Es lo que te hace encontrable.',
    },
    audience: {
      title: '¿Para quién es?',
      hint: 'Quién lo usa y en qué empresas encaja. «Cualquiera» también es una respuesta válida.',
    },
    review: {
      title: 'Revisa y envía',
      hint: 'Con esto ya puedes enviarla. Lo de abajo es opcional y ayuda a que una empresa decida.',
    },
    screenshots: {
      title: 'Capturas',
      hint: 'Hasta cuatro capturas reales del producto o del trabajo entregado, con una línea de contexto y sin datos de tus clientes.',
    },
    demo: {
      title: 'Demo',
      hint: 'Un recorrido en video, una demo interactiva o una presentación pública.',
    },
    pricing: {
      title: 'Precio',
      hint: 'Cómo se contrata y cuánto cuesta. Si cotizas a medida, explica de qué depende.',
    },
    delivery: {
      title: 'Arranque y soporte',
      hint: 'Cuánto tarda en estar listo y qué acompañamiento ofreces.',
    },
    integrations: {
      title: 'Integraciones',
      hint: 'Con qué herramientas se conecta hoy. Si no se conecta con nada, dilo: también ayuda a decidir.',
    },
    compliance: {
      title: 'Cumplimiento',
      hint: 'Normas y certificaciones que puedes sostener. Marca solo lo que sea cierto.',
    },
    scope: {
      title: 'Alcance',
      hint: 'Qué incluye y cuándo no es la opción adecuada.',
    },
    founders: {
      title: 'Equipo',
      hint: 'Quién está detrás. Será público al aprobarse; comparte solo lo que cada persona autorice.',
    },
    links: {
      title: 'Redes',
      hint: 'Redes oficiales y enlaces útiles del proyecto.',
    },
    evidence: {
      title: 'Casos y evidencia',
      hint: 'Un caso, un portafolio o un resultado con contexto. Nada que no puedas respaldar.',
    },
  },
  /** One line under each optional section's card on the review screen. */
  sections: {
    screenshots: 'Muestra cómo se ve por dentro.',
    demo: 'Deja que lo vean en acción.',
    pricing: 'Modelo, rango y condiciones.',
    delivery: 'Tiempo de arranque y acompañamiento.',
    integrations: 'Con qué se conecta.',
    compliance: 'Normas que puedes sostener.',
    scope: 'Qué incluye y cuándo no encaja.',
    founders: 'Quién está detrás del proyecto.',
    links: 'Redes y enlaces oficiales.',
    evidence: 'Un caso o portafolio con contexto.',
  },
  editor: {
    any: 'Cualquiera',
    submitted: 'Enviada a revisión.',
    saved: 'Avance guardado.',
    saveUnconfirmed:
      'No pudimos confirmar el guardado. Conservamos tus cambios; comprueba el borrador antes de repetir.',
    pendingNotice:
      'Tu ficha está en revisión. Podrás editarla cuando termine; mientras tanto puedes ver la vista previa de lo que enviaste.',
    formAria: 'Registrar mi proyecto',
    progressAria: 'Pasos del registro',
    /** Keyed by the required question ids. */
    stepLabels: {
      basics: 'Lo básico',
      fit: 'Dónde encaja',
      audience: 'Para quién',
      review: 'Enviar',
    },
    statusSaving: 'Guardando…',
    statusProcessingScreenshot: 'Procesando captura…',
    statusUnsaved: 'Cambios sin guardar',
    statusSaved: 'Avance guardado',
    saveAndExit: 'Guardar y salir',
    websiteLabel: 'Enlace del proyecto',
    websitePlaceholder: 'tuproyecto.com',
    websiteHint: 'Tu sitio o un perfil público del proyecto. Aparece en la ficha.',
    readSite: 'Leer mi sitio',
    reread: 'Volver a leer',
    readingSite: 'Leyendo tu sitio…',
    readingSiteFrom: 'Leyendo {host}…',
    readDone: 'Listo: tomamos lo que tu sitio dice de sí mismo. Revísalo y ajústalo.',
    readPartial: 'Tomamos el nombre y la descripción, pero no la portada:',
    fromSite: 'Tomado de tu sitio.',
    fromSiteDescription:
      'Tomada de tu sitio. Ajústala para que diga qué problema resuelve y para quién.',
    useFromSite: 'Usar «{value}», como dice tu sitio',
    useDescriptionFromSite: 'Usar la descripción de tu sitio',
    nameLabel: 'Nombre',
    namePlaceholder: 'Por ejemplo: Cord',
    kindLegend: '¿Qué es?',
    /** Keyed by offering value (src/lib/taxonomy.ts offerings). */
    kindHints: {
      Software: 'un producto',
      Agencia: 'un equipo que lo hace por ti',
      Servicio: 'un servicio profesional',
    },
    problemLabel: 'Descripción',
    problemPlaceholder:
      'Qué problema resuelve y qué cambia para una empresa que lo usa. Sin frases vacías.',
    problemCounter: '{count}/1500 · mínimo 20',
    suggestedCategories: 'Por lo que escribiste, encaja en',
    categoriesLegend: 'Categorías · elige todas las que apliquen',
    otherCategoryToggle: '¿No ves tu categoría?',
    otherCategoryLabel: '¿Cuál sería?',
    otherCategoryPlaceholder: 'Por ejemplo: reservas para restaurantes',
    otherCategoryNote:
      'No se publica. Lo lee el equipo para saber qué categorías faltan; elige también la más cercana.',
    capabilitiesIntro: 'Ahora marca lo que hace en concreto. Es lo que una empresa busca.',
    capabilitiesLegend: '¿Qué hace en {category}?',
    capabilitiesEmpty: 'Elige al menos una categoría y aquí verás lo que puede hacer en cada una.',
    suggestionsTitle: 'Detectamos esto en lo que escribiste',
    audienceLabel: 'Quién lo usa',
    audiencePlaceholder: 'Por ejemplo: equipos de finanzas de distribuidoras de 20 a 200 personas.',
    suggestedIndustries: 'Mencionas estas industrias',
    industriesLegend: 'Industrias',
    anyIndustry: 'Cualquier industria',
    companySizeLegend: 'Tamaño de empresa',
    anyCompanySize: 'Cualquier tamaño',
    toReview: 'Revisar y enviar',
    continue: 'Continuar',
    previous: 'Anterior',
    keyboardHint: 'Enter para continuar · ⌘/Ctrl + Enter en textos largos',
    review: {
      essentials: 'Lo esencial',
      edit: 'Editar',
      project: 'Proyecto',
      problem: 'Descripción',
      kindAndCategories: 'Categorías',
      capabilities: 'Qué hace',
      audience: 'Quién lo usa',
      market: 'Industrias y tamaño',
    },
    contactEmailLabel: 'Correo para la revisión · privado',
    contactEmailNote: 'No aparece en la ficha. Las solicitudes de compradores llegan a tu cuenta.',
    submit: 'Enviar a revisión',
    submitUpdate: 'Enviar actualización a revisión',
    reviewNote:
      'Publicar es gratis. El equipo revisa la ficha y sus enlaces antes de publicarla; si falta algo, te lo decimos. Si ya tienes una versión aprobada, sigue visible mientras revisamos.',
    noChanges:
      'Tu ficha está publicada y no tiene cambios pendientes. Edita una sección para preparar una actualización.',
    reviewPublishedTitle: 'Tu ficha',
    reviewPublishedHint:
      'Está publicada. Cada cambio se guarda como borrador y pasa por revisión antes de verse en público.',
    optionalTitle: 'Hazla más fuerte',
    optionalHint:
      'Todo es opcional. Cada sección responde una pregunta que una empresa se hace antes de contactarte.',
    optionalCount: '{done} de {total}',
    added: 'Listo',
    add: 'Agregar',
    backToReview: 'Volver a revisar',
    saveSection: 'Guardar',
    discardSection: 'Descartar cambios',
    previewTitle: 'Así se verá en el catálogo',
    previewNamePlaceholder: 'Tu proyecto',
    previewDescriptionPlaceholder: 'Aquí aparecerá la descripción.',
    useSiteCover: 'Usar la imagen de mi sitio como portada',
    openPreview: 'Ver la ficha completa',
    autosaveNote:
      'Guardamos cada vez que avanzas. Nada se publica hasta que lo envías y el equipo lo aprueba.',
    notForLabel: '¿Cuándo no es la opción adecuada?',
    notForPlaceholder: 'Necesidades que no cubres o condiciones que necesitas.',
    projectLinksLabel: 'Redes y enlaces del proyecto',
    demoLabel: 'Enlace a la demo o recorrido',
    pricingModelLegend: 'Modelo de contratación · puedes elegir varios',
    priceBandLegend: 'Rango de precio',
    setupTimeLegend: 'Tiempo de arranque',
    integrationsLegend: 'Herramientas',
    noIntegrations: 'No se conecta con otras herramientas',
    complianceLegend: 'Normas y certificaciones',
    evidenceUrlLabel: 'Enlace al caso, portafolio o evidencia',
  },
  profile: {
    linkType: 'Tipo de enlace {index}',
    linkUrl: 'URL {index}',
    removeLink: 'Eliminar enlace {index}',
    addLink: 'Añadir enlace',
    linksCount: '{count}/{limit} enlaces · Se publicarán al aprobar la ficha.',
    foundersNote:
      'Comparte solo información que estas personas autoricen a hacer pública. No copiamos los datos privados de tu cuenta.',
    person: 'Persona {index}',
    publicName: 'Nombre público',
    publicNamePlaceholder: 'Nombre o nombre profesional',
    role: 'Rol en el proyecto',
    rolePlaceholder: 'Fundador, cofundadora, responsable…',
    bio: 'Una breve presentación',
    bioPlaceholder: 'Experiencia y relación con el proyecto.',
    personLinks: 'Redes de la persona {index}',
    removePerson: 'Quitar esta persona',
    addPerson: 'Añadir persona',
  },
  media: {
    tooLarge: 'Cada imagen admite hasta 2 MB.',
    networkError: 'No pudimos confirmar el cambio. Recarga para comprobarlo antes de repetir.',
    title: 'Muestra cómo funciona',
    description:
      'Hasta 4 capturas reales. JPG, PNG o WebP, máximo 2 MB cada una. Oculta datos personales de clientes antes de subirlas.',
    uploadNote:
      'Subir no publica: guarda el borrador y envíalo a revisión. Se conserva la ficha aprobada anterior.',
    captionPendingAlt: 'Captura pendiente de descripción',
    captionLabel: '¿Qué muestra la captura {index}?',
    captionPlaceholder: 'Por ejemplo: seguimiento de cuentas por cobrar',
    moveBefore: 'Mover captura {index} antes',
    moveAfter: 'Mover captura {index} después',
    removeFromListing: 'Quitar de la ficha',
    processing: 'Procesando…',
    upload: 'Subir captura',
    inListing: '{count}/4 en esta ficha',
    filesSummary: 'Archivos de esta solución ({count}/12)',
    filesNote:
      'Reutiliza capturas o elimina archivos que ya no estén guardados ni publicados. Quitar de la ficha no borra el archivo.',
    loading: 'Cargando…',
    refreshFiles: 'Actualizar archivos',
    fileAlt: 'Archivo de captura',
    inUse: 'Guardada o publicada',
    addFile: 'Añadir archivo a la ficha',
    deleteUnused: 'Eliminar archivo sin uso',
    deleteConfirm:
      'Eliminarás este archivo. Si está seleccionado sin guardar en otra pestaña, tendrás que subirlo de nuevo.',
    deleteFile: 'Eliminar archivo',
    cancel: 'Cancelar',
  },
  siteImage: {
    readError: 'No pudimos leer la portada.',
    readNetworkError: 'No pudimos leer la portada del sitio. Intenta de nuevo.',
    imageAlt: 'Portada tomada de tu sitio',
    /** Keyed by `SiteImageFailure` (src/lib/solutions/site-image.ts). */
    failures: {
      unreachable: 'No pudimos abrir el sitio. Revisa que responda públicamente por HTTPS.',
      notHtml: 'La dirección no devolvió una página web.',
      pageTooLarge: 'La página es demasiado pesada para leer su portada.',
      noImageMeta:
        'El sitio no declara una imagen og:image. Añádela en su <head> o sube una captura.',
      imageUrlTooLong: 'La imagen declarada tiene una dirección demasiado larga.',
      imageUnreachable: 'No pudimos descargar la imagen que declara el sitio.',
      imageTooLarge: 'La imagen del sitio pesa más de 5 MB.',
      unsupportedFormat: 'El sitio declara un formato de imagen que no podemos usar.',
      imageTooDetailed: 'La imagen del sitio tiene demasiado detalle para guardarla.',
      processingFailed: 'No pudimos procesar la imagen del sitio.',
    },
  },

  deleteDraft: {
    error: 'No pudimos eliminar el borrador.',
    trigger: 'Eliminar',
    close: 'Cerrar',
    title: '¿Eliminar este borrador?',
    body: '{name} y su información se eliminarán definitivamente. Esta acción no se puede deshacer.',
    keep: 'Conservar borrador',
    deleting: 'Eliminando…',
    confirm: 'Sí, eliminar',
  },
  newSolution: {
    cta: 'Postular mi solución',
  },
  domain: {
    error: 'No pudimos completar la operación.',
    verified: 'Control del dominio comprobado. No certifica identidad legal ni resultados.',
    instructions:
      'Añade este registro TXT al DNS del dominio publicado. No cambia tu sitio ni requiere compartir contraseñas.',
    recordName: 'Nombre',
    recordValue: 'Valor TXT',
    regenerate: 'Generar otro registro',
    generate: 'Generar registro TXT',
    check: 'Comprobar DNS',
  },
  /** /account/solutions */
  list: {
    metaTitle: 'Mis soluciones',
    eyebrow: 'Tu portafolio',
    title: 'Mis soluciones',
    description:
      'Postula lo que construyes, consulta su revisión y mantén cada ficha lista para quien la descubre.',
    emptyTitle: 'Dale un lugar a lo que estás construyendo.',
    emptyDescription:
      'Software, agencia o servicio: prepara tu información a tu ritmo. Nada se publica sin pasar antes por revisión.',
    emptyNote: 'Puedes guardar el borrador y volver cuando quieras.',
    overviewAria: 'Estado de las soluciones',
    overviewPublished: 'Publicadas',
    overviewPending: 'En revisión',
    overviewDrafts: 'Borradores',
    overviewItemAria: '{label}: {value} de {total}',
    listTitle: 'Tus fichas',
    listSubtitle: 'Ordenadas por la actualización más reciente',
    countSingular: 'solución',
    countPlural: 'soluciones',
    unnamed: 'Solución sin nombre',
    actionPending: 'Ver seguimiento',
    actionPublished: 'Gestionar ficha',
    actionChanges: 'Revisar cambios',
    actionRejected: 'Revisar postulación',
    actionDraft: 'Continuar borrador',
    updated: 'Actualizada',
    kindPending: 'Tipo por definir',
    infoLabel: 'Información de la ficha',
    blocks: '{done}/{total} bloques',
    progressAria: 'Información completada de {name}',
    viewPublicAria: 'Ver ficha pública de {name}',
  },
  /** /account/solutions/new */
  newPage: {
    title: 'Publica tu proyecto',
    description:
      'Empieza con el enlace. Leemos lo que tu sitio ya dice para llenar lo básico; tú lo revisas y lo envías.',
    websiteLabel: 'Enlace de tu proyecto',
    placeholder: 'tuproyecto.com',
    noWebsite: '¿Sin sitio? Usa un perfil público del proyecto: LinkedIn, Instagram, Product Hunt…',
    cta: 'Empezar',
    creating: 'Creando borrador…',
    invalid: 'Escribe un enlace válido, por ejemplo tuproyecto.com.',
    error: 'No pudimos crear el borrador. Inténtalo de nuevo.',
    steps: ['Lo básico', 'Dónde encaja', 'Para quién'],
    stepsNote: 'Tres pasos cortos y lo envías. Capturas, precio, equipo y lo demás son opcionales.',
    freeNote: 'Publicar es gratis. Nada se publica sin revisión.',
  },
  /** /account/solutions/[id] */
  detail: {
    metaTitle: 'Mi postulación',
    back: 'Mis soluciones',
    verifyDomain: 'Verificación →',
    previewMetaTitle: 'Vista previa privada',
    promote: 'Promocionar →',
    viewPublished: 'Ver ficha publicada',
    otherTab: '(otra pestaña)',
    untitled: 'Tu nueva solución',
    approvedStillPublic:
      'La versión aprobada sigue publicada mientras preparas esta actualización.',
    applicationInfo: 'Información de la postulación',
    kind: 'Tipo',
    problem: 'Problema',
    audience: 'Para quién',
    notFor: 'Cuándo no encaja',
    demo: 'Demo',
    website: 'Sitio',
    contactEmail: 'Contacto privado',
    founders: 'Creadores',
    projectLinks: 'Redes del proyecto',
    evidenceUrl: 'Enlace de evidencia',
    history: 'Seguimiento de la postulación',
    eventFallback: 'Actualización editorial',
    noEvents: 'Todavía no la has enviado. Aquí aparecerán los avances y comentarios del equipo.',
  },
  /** /account/solutions/[id]/trust */
  trust: {
    back: '← Volver a mi ficha',
    title: 'Verificación',
    intro:
      'La palomita «Verificado por shwcs» la decide el equipo después de revisar tu proyecto. No tienes que llenar nada ni enviar documentos.',
    whatTitle: 'Qué revisamos',
    /** Keyed by `verificationChecks` (src/lib/recognition/model.ts). */
    checks: {
      site: 'Que el sitio funciona y es del proyecto.',
      product: 'Que el producto o servicio existe y hace lo que dice tu ficha.',
      team: 'Que quien la registró representa al proyecto.',
      registries: 'Los registros públicos que apliquen en tu país.',
    },
    verifiedOn: 'Verificada el {date}.',
    pending:
      'Todavía no está verificada. La revisamos después de publicarla; si necesitamos algo, te escribimos.',
    moved:
      'Tu ficha cambió de sitio, así que la palomita dejó de mostrarse hasta que la revisemos otra vez.',
    domainTitle: 'Acelera la verificación (opcional)',
    domainIntro:
      'Un registro TXT en tu dominio demuestra que lo controlas y nos ahorra un paso. No cambia tu sitio.',
  },
  /** Messages returned by the /api/solutions/* routes and the retired /api/applications. */
  errors: {
    useShwcsForm: 'Usa el formulario de shwcs.',
    useShwcsAccount: 'Usa tu cuenta de shwcs.',
    useAccount: 'Usa tu cuenta.',
    useAccountToUpload: 'Usa tu cuenta para subir capturas.',
    useShwcs: 'Usa shwcs.',
    signIn: 'Inicia sesión.',
    signInToApply: 'Inicia sesión para postular.',
    sessionEnded: 'Tu sesión terminó. Inicia sesión y vuelve a intentar.',
    invalidRequest: 'Solicitud no válida.',
    invalidAction: 'Acción no válida.',
    actionInvalid: 'Acción inválida.',
    requestUnavailable: 'Solicitud no disponible.',
    tooManyDrafts: 'Demasiados borradores. Intenta más tarde.',
    tooManyChanges: 'Demasiados cambios. Intenta más tarde.',
    createFailed: 'No pudimos crear el borrador. Vuelve a intentarlo.',
    draftNotFound: 'Borrador no encontrado.',
    deleteOnlyNeverApproved: 'Solo puedes eliminar borradores que nunca hayan sido aprobados.',
    deleteFailed: 'No pudimos eliminar el borrador. Inténtalo de nuevo.',
    applicationNotFound: 'Postulación no encontrada.',
    invalidQuestion: 'Pregunta no válida.',
    checkFields: 'Revisa los campos y su longitud.',
    completeBeforeSubmit: 'Completa los datos antes de enviar a revisión.',
    stepMismatch: 'El paso no corresponde a la pregunta.',
    conflict: 'La postulación cambió o no admite esta acción. Recarga antes de continuar.',
    saveFailed: 'No pudimos guardar. Tus cambios siguen en el formulario.',
    notPending: 'Este envío ya no está en revisión. Recarga para ver en qué va.',
    unconfirmed: 'No pudimos confirmar el cambio. Recarga para comprobarlo antes de repetir.',
    notPublished: 'Esta ficha no está publicada.',
    unpublishBookingsPending:
      'No pudimos cancelar tus espacios patrocinados, así que la ficha sigue publicada. Inténtalo de nuevo en unos minutos o escríbenos a hola@shwcs.site.',
    solutionUnavailable: 'Solución no disponible.',
    mediaListFailed: 'No pudimos consultar las capturas.',
    waitForReview: 'Espera la revisión antes de subir nuevas capturas.',
    tooManyUploads: 'Demasiadas subidas. Intenta más tarde.',
    unsupportedType: 'Usa JPG, PNG o WebP.',
    storageUnavailable: 'El almacenamiento de imágenes no está disponible ahora.',
    fileLimit: 'Ya tienes 12 archivos. Elimina archivos sin uso antes de subir más.',
    selectScreenshot: 'Selecciona una captura.',
    screenshotTooLarge: 'La captura admite hasta 2 MB.',
    staticImageOnly: 'Usa una imagen estática; no SVG ni animaciones.',
    imageTooDetailed: 'La imagen tiene demasiado detalle. Reduce su tamaño e intenta otra vez.',
    unreadableImage: 'No pudimos leer la captura. Usa una imagen de hasta 16 megapíxeles.',
    uploadUnconfirmed: 'No pudimos confirmar la subida. Revisa los archivos antes de repetir.',
    uploadConflict:
      'La solución cambió o tiene 12 archivos. Elimina archivos sin uso antes de subir más.',
    screenshotUnavailable: 'Captura no disponible.',
    screenshotLoadFailed: 'No pudimos cargar la captura.',
    screenshotInUse:
      'No se puede eliminar: aún está guardada, publicada, en revisión o no pertenece a tu solución.',
    screenshotDeleteFailed: 'No pudimos eliminar la captura.',
    coverUnavailable: 'Portada no disponible.',
    coverLoadFailed: 'No pudimos cargar la portada.',
    tooManyCoverLookups: 'Demasiadas búsquedas de portada. Intenta más tarde.',
    addWebsiteFirst: 'Añade primero el sitio de tu proyecto.',
    invalidWebsite: 'Escribe un enlace válido, por ejemplo tuproyecto.com.',
    coverSaveFailed: 'No pudimos guardar la portada del sitio.',
    coverReadFailed: 'No pudimos leer la portada del sitio.',
    unavailable: 'No disponible.',
    domainOwnOnly: 'Solo puedes verificar una publicación propia.',
    domainNeedsHttps: 'Publica primero un sitio HTTPS con dominio válido.',
    tooManyAttempts: 'Demasiados intentos. Intenta más tarde.',
    domainRecordExpired: 'Genera un registro nuevo; el anterior caducó o cambió el dominio.',
    domainTxtMissing: 'Todavía no encontramos el registro TXT. Revisa el DNS y vuelve a intentar.',
    domainTxtMismatch: 'El TXT no coincide con el registro solicitado.',
    domainChanged: 'La ficha cambió durante la verificación. Recarga.',
    domainCheckFailed: 'No pudimos comprobar el dominio.',
    applicationsRetired: 'Ahora puedes postular y dar seguimiento desde tu cuenta.',
  },
} as const;
