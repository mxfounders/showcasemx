/**
 * The founder's AI assistant over MCP (SHCWS-152, docs/assistant-mcp.md): the tokens card in
 * Ajustes → Conexiones, the «Conecta shwcs a tu asistente» guide and the words the MCP
 * server gives the assistant (tool descriptions and results), in the token's language.
 */
export const assistant = {
  card: {
    title: 'Asistentes de IA',
    description:
      'Conecta Claude, Cursor u otro asistente compatible con MCP para que cree y complete tus fichas desde la conversación. Solo puede tocar tus fichas, y nada se publica sin la revisión del equipo de shwcs.',
    guide: 'Cómo conectarlo',
    empty: 'Aún no has creado ningún token.',
    create: 'Crear token',
    loadError: 'No pudimos leer tus tokens ahora mismo. Inténtalo de nuevo en un momento.',
    form: {
      title: 'Nuevo token',
      name: 'Nombre',
      namePlaceholder: 'Claude en mi laptop',
      nameHint: 'Para reconocerlo después. Solo lo ves tú.',
      lifetime: 'Caduca en',
      days: '{days} días',
      year: '1 año',
      scope: 'Qué puede hacer',
      scopeValue:
        'Solo tus fichas: crear borradores, completarlos, subir capturas y enviarlos a revisión.',
      password: 'Tu contraseña',
      code: 'Código de verificación en dos pasos',
      codeHint: 'De tu app autenticadora o uno de tus códigos de respaldo.',
      submit: 'Crear token',
      pending: 'Creando…',
      cancel: 'Cancelar',
    },
    created: {
      title: 'Copia tu token ahora',
      body: 'Es la única vez que lo verás. Trátalo como una contraseña: quien lo tenga puede editar tus fichas hasta que caduque o lo revoques.',
      label: 'Tu token',
      copy: 'Copiar',
      copied: 'Copiado',
      next: 'Siguiente paso: pégalo en tu asistente.',
      done: 'Ya lo guardé',
    },
    token: {
      scope: 'Mis fichas',
      created: 'Creado el {date}',
      expires: 'Caduca el {date}',
      expired: 'Caducó el {date}',
      lastUsed: 'Último uso: {date}',
      neverUsed: 'Sin usar todavía',
      status: {
        active: 'Activo',
        revoked: 'Revocado',
        expired: 'Caducado',
        passwordChanged: 'Dejó de funcionar al cambiar tu contraseña',
      },
      revoke: 'Revocar',
      revokeTitle: 'Revocar «{name}»',
      revokeBody:
        'El asistente que lo use deja de poder entrar en su siguiente llamada. No se puede deshacer.',
      revokeConfirm: 'Revocar token',
      revokePending: 'Revocando…',
      cancel: 'Cancelar',
    },
    activity: {
      title: 'Lo que hicieron tus tokens',
      description:
        'Las últimas 40 acciones. Guardamos qué herramienta se usó, sobre qué ficha y cómo terminó; nunca lo que escribió el asistente.',
      empty: 'Ningún asistente ha usado tus tokens todavía.',
      when: 'Cuándo',
      token: 'Token',
      action: 'Acción',
      solution: 'Ficha',
      result: 'Resultado',
      ok: 'Hecho',
      error: 'No se pudo',
      noSolution: 'Sin ficha',
      unnamed: 'Borrador sin nombre',
      tools: {
        estado_de_mis_fichas: 'Consultó tus fichas',
        crear_borrador: 'Creó un borrador',
        ver_lo_que_falta: 'Revisó lo que falta',
        actualizar_borrador: 'Actualizó un borrador',
        subir_captura: 'Subió una captura',
        enviar_a_revision: 'Envió a revisión',
      },
    },
    errors: {
      useAccount: 'Gestiona tus tokens desde tu cuenta de shwcs.',
      signIn: 'Tu sesión terminó. Vuelve a entrar.',
      name: 'Ponle un nombre de hasta 60 caracteres.',
      lifetime: 'Elige cuándo caduca.',
      password: 'Escribe tu contraseña.',
      passwordWrong: 'La contraseña no es correcta.',
      code: 'Escribe el código de tu app autenticadora o uno de tus códigos de respaldo.',
      codeWrong: 'Ese código no es válido o ya se usó.',
      tooMany: 'Hiciste demasiados intentos. Espera un momento.',
      limit: 'Ya tienes 10 tokens activos. Revoca uno antes de crear otro.',
      changed: 'Tu contraseña cambió mientras tanto. Recarga la página.',
      notFound: 'Ese token ya no está activo.',
      unavailable: 'No pudimos guardar el cambio. Inténtalo de nuevo.',
    },
  },
  guide: {
    metaTitle: 'Conecta shwcs a tu asistente',
    back: 'Volver a Conexiones',
    title: 'Conecta shwcs a tu asistente',
    intro:
      'Con un token personal, tu asistente de IA crea tu ficha, te dice qué le falta, la completa y la envía a revisión cuando tú se lo confirmas. Funciona con el protocolo MCP, que entienden Claude, Cursor y otros asistentes.',
    stepsTitle: 'En tres pasos',
    steps: [
      'Crea un token en Ajustes → Conexiones y cópialo. Solo se muestra una vez.',
      'Agrega shwcs a tu asistente con la dirección de abajo y el encabezado Authorization: Bearer seguido de tu token.',
      'Pídele, por ejemplo: «Publica mi producto en shwcs; el sitio es tuproyecto.com».',
    ],
    createToken: 'Crear un token',
    urlLabel: 'Dirección del servidor',
    tokenPlaceholder: 'TU_TOKEN',
    clientsTitle: 'Según tu asistente',
    clients: {
      claudeCode: {
        title: 'Claude Code',
        body: 'En la terminal, una sola vez:',
      },
      claudeApp: {
        title: 'Claude.ai y Claude Desktop',
        body: 'En Configuración → Conectores → Agregar conector personalizado, escribe la dirección. Si tu cuenta muestra la sección «Request headers» (en beta), agrega el encabezado authorization con el valor Bearer, un espacio y tu token. Si no aparece, en Claude Desktop usa el puente mcp-remote en tu archivo de configuración:',
      },
      cursor: {
        title: 'Cursor y otros clientes MCP',
        body: 'En .cursor/mcp.json, o el archivo equivalente de tu cliente:',
      },
      chatgpt: {
        title: 'ChatGPT',
        body: 'Los conectores de ChatGPT solo aceptan acceso con OAuth o sin acceso, y shwcs todavía no ofrece OAuth. Cuando lo tenga, lo explicaremos aquí. Mientras tanto, usa Claude o Cursor.',
      },
    },
    toolsTitle: 'Lo que puede hacer',
    tools: {
      estado_de_mis_fichas: 'Lista tus fichas con su estado y lo que les falta.',
      crear_borrador:
        'Crea un borrador. Si le das tu sitio, shwcs lo lee y redacta un primer borrador con IA, con el mismo límite diario que en la web.',
      ver_lo_que_falta:
        'Muestra lo que ya tiene la ficha, lo que falta para enviarla y los comentarios del equipo.',
      actualizar_borrador: 'Cambia los campos que le pidas, con las mismas reglas que el editor.',
      subir_captura: 'Sube una imagen pública (JPG, PNG o WebP de hasta 2 MB) a tu ficha.',
      enviar_a_revision: 'La envía a revisión, solo cuando tú lo confirmas en la conversación.',
    },
    safetyTitle: 'Lo que conviene saber',
    safety: [
      'Solo toca tus fichas: no ve tus guardados, listas, conversaciones ni datos de pago.',
      'Nada se publica sin revisión. El equipo de shwcs revisa cada envío, como si lo hubieras hecho desde el editor.',
      'Revocar un token lo apaga en la siguiente llamada del asistente. Cambiar tu contraseña apaga todos.',
      'En Conexiones ves qué hizo cada token: qué herramienta, sobre qué ficha y cómo terminó.',
      'Tu asistente recibe los datos de las fichas que le pidas leer o escribir, incluido tu correo de contacto privado. Ese servicio lo eliges tú y se rige por sus propias condiciones.',
    ],
  },
  server: {
    instructions:
      'Ayudas a un fundador a publicar sus proyectos en shwcs, un catálogo B2B que conecta empresas con software, agencias y servicios. Con estas herramientas creas y completas SUS fichas; no puedes tocar las de nadie más. Flujo recomendado: 1) estado_de_mis_fichas; 2) crear_borrador, con el sitio del proyecto para que shwcs lo lea; 3) ver_lo_que_falta; 4) actualizar_borrador con la versión que te devolvió la llamada anterior; 5) subir_captura si el fundador te da imágenes; 6) muestra el resumen al fundador y solo con su confirmación explícita llama a enviar_a_revision. Nunca inventes datos: usa lo que diga el fundador o su sitio, y deja vacío lo que no sepas. Nada se publica sin la revisión del equipo de shwcs.',
    tools: {
      estado_de_mis_fichas: {
        title: 'Estado de mis fichas',
        description:
          'Lista las fichas del fundador: id, nombre, estado, versión, si ya se puede enviar a revisión, los bloques que faltan y los enlaces para abrirlas en shwcs.',
      },
      crear_borrador: {
        title: 'Crear borrador',
        description:
          'Crea un borrador de ficha nuevo. Con sitio_web, shwcs lee el sitio y redacta un primer borrador con IA (solo llena lo que el sitio dice; tiene un límite diario por cuenta). Devuelve el id y la versión para seguir.',
        website: 'Dirección del sitio del proyecto, por ejemplo tuproyecto.com.',
        useAi:
          'false para no leer el sitio con IA y crear el borrador solo con la dirección. Por defecto se lee si hay sitio.',
      },
      ver_lo_que_falta: {
        title: 'Ver lo que falta',
        description:
          'Devuelve los datos actuales de una ficha, su versión, los campos que impiden enviarla a revisión, la guía de bloques completados, las capacidades válidas para sus categorías, las capturas subidas y el último comentario del equipo de revisión.',
        solution: 'El id de la ficha.',
      },
      actualizar_borrador: {
        title: 'Actualizar borrador',
        description:
          'Cambia campos de una ficha propia con las mismas reglas que el editor de shwcs. Solo envía los campos que cambian; null quita un campo opcional. Las listas reemplazan la lista completa. Necesita la versión actual (de ver_lo_que_falta o de la última llamada) y devuelve la nueva. Si la ficha ya estaba publicada, la versión pública no cambia hasta que se apruebe la nueva.',
        solution: 'El id de la ficha.',
        version: 'La versión actual de la ficha.',
        changes: 'Los campos que cambian.',
        fields: {
          name: 'Nombre del proyecto.',
          kind: 'Qué es: Software, Agencia o Servicio.',
          categories: 'Categorías del catálogo; la primera es la principal.',
          problem: 'Qué resuelve, en un párrafo (mínimo 20 caracteres para enviar).',
          audience: 'Para quién es (mínimo 10 caracteres para enviar).',
          website: 'Sitio oficial, http o https.',
          contactEmail: 'Correo privado donde el fundador recibe solicitudes. No se publica.',
          capabilities:
            'Lo que hace en concreto. Cada capacidad pertenece a una categoría elegida; ver_lo_que_falta lista las válidas.',
          industries: 'Industrias donde encaja. [] significa que sirve a cualquiera.',
          companySizes: 'Tamaños de empresa donde encaja. [] significa que sirve a cualquiera.',
          scope: 'Qué incluye y qué no.',
          notFor: 'Cuándo no encaja.',
          pricing: 'Condiciones de precio en texto libre.',
          pricingModel: 'Modelos de cobro.',
          priceFrom: 'Precio de entrada; 0 es un plan gratis. Necesita moneda y unidad.',
          priceCurrency: 'Moneda ISO 4217 del precio, por ejemplo USD o MXN.',
          priceUnit: 'Qué paga el precio.',
          priceBand: 'Rango de precio aproximado.',
          setupTime: 'Cuánto tarda en empezar a funcionar.',
          implementation: 'Cómo se implementa.',
          integrationKeys: 'Herramientas con las que se conecta. [] significa ninguna.',
          integrations: 'Integraciones en texto libre.',
          support: 'Soporte que ofrece.',
          compliance: 'Normas o certificaciones que cumple, solo si el fundador lo confirma.',
          evidence: 'Experiencia o casos que la respaldan.',
          evidenceUrl: 'Enlace a un caso o evidencia.',
          demoUrl: 'Enlace a una demo.',
          screenshots:
            'Capturas que muestra la ficha, en orden (máximo 4): el id de cada imagen subida y qué muestra (mínimo 3 caracteres).',
          founders:
            'Hasta 3 personas del equipo, con su consentimiento: nombre, rol, bio y enlaces.',
          projectLinks: 'Enlaces oficiales del proyecto (máximo 6).',
          hideSiteImage: 'true para no mostrar la imagen que publica el sitio como portada.',
          coverSource:
            "'site' (predeterminado): la imagen del sitio va primero. 'screenshot': la primera imagen de la galería va primero.",
          otherCategory: 'Una categoría que no está en la lista, en palabras del fundador.',
        },
      },
      subir_captura: {
        title: 'Subir captura',
        description:
          'Descarga una imagen pública (JPG, PNG o WebP, hasta 2 MB) y la guarda en la ficha con el mismo proceso que la subida desde shwcs. Con descripción, la agrega a la ficha si tiene menos de 8 imágenes.',
        solution: 'El id de la ficha.',
        url: 'Dirección pública http o https de la imagen.',
        caption: 'Qué muestra la captura, para agregarla a la ficha (3 a 180 caracteres).',
      },
      enviar_a_revision: {
        title: 'Enviar a revisión',
        description:
          'Envía la ficha al equipo de revisión de shwcs. Llámala solo después de mostrar el resumen al fundador y de que confirme el envío en la conversación. Mientras está en revisión no se puede editar. No publica nada: la decisión es del equipo.',
        solution: 'El id de la ficha.',
        version: 'La versión actual de la ficha.',
        confirm: 'true solo si el fundador confirmó el envío explícitamente.',
      },
    },
    messages: {
      list: 'Estas son tus fichas.',
      empty: 'Todavía no hay fichas. Crea una con crear_borrador.',
      created: 'Borrador creado. Revisa lo que falta con ver_lo_que_falta.',
      createdFromSite:
        'Borrador creado y preparado con IA a partir del sitio ({filled} campos). Revisa lo que falta con ver_lo_que_falta.',
      createdPartial:
        'Borrador creado. La IA no pudo redactarlo; se tomaron solo el nombre y los enlaces del sitio.',
      siteNotRead: 'Borrador creado, pero no se leyó el sitio: {reason}',
      ready: 'Tiene todo lo necesario para enviarse a revisión.',
      missing: 'Le falta información para enviarse a revisión.',
      updated: 'Cambios guardados. Nueva versión: {version}.',
      uploaded: 'Captura subida y agregada a la ficha. Nueva versión: {version}.',
      uploadedOnly:
        'Captura subida a la biblioteca de la ficha. Agrégala con actualizar_borrador (campo screenshots) cuando quieras.',
      uploadedFull:
        'Captura subida a la biblioteca de la ficha, pero la ficha ya muestra 8 imágenes: no se agregó.',
      uploadedNotAttached:
        'Captura subida, pero la ficha cambió mientras tanto y no se agregó. Agrégala con actualizar_borrador.',
      submitted:
        'Enviada a revisión. El equipo de shwcs la revisa y el fundador recibe un aviso con la decisión. Mientras tanto no se puede editar.',
      notFound: 'No encontramos esa ficha entre las tuyas.',
      pending:
        'La ficha está en revisión y no se puede cambiar ahora. El fundador puede retirarla de la revisión desde shwcs si necesita editarla.',
      conflict:
        'La ficha cambió desde que la leíste; su versión actual es {version}. Vuelve a leerla con ver_lo_que_falta y aplica los cambios sobre esa versión.',
      invalidFields:
        'Estos campos no son válidos: {fields}. Revisa el tipo, que el valor esté en la lista permitida y la longitud máxima.',
      incomplete:
        'Todavía falta información para enviarla a revisión. Complétala con actualizar_borrador.',
      rateLimited: 'Demasiadas acciones en poco tiempo. Espera unos minutos antes de seguir.',
      invalidWebsite: 'Esa no es una dirección web válida. Usa algo como tuproyecto.com.',
      storageUnavailable: 'Las capturas no están disponibles en este momento.',
      fileLimit: 'Esta ficha ya tiene 12 archivos. El fundador puede quitar alguno desde shwcs.',
      imageUnreachable:
        'No pudimos descargar la imagen. La dirección debe ser pública (http o https), responder en menos de 8 segundos y pesar hasta 2 MB.',
      staticImageOnly: 'La imagen debe ser JPG, PNG o WebP, sin animación.',
      imageTooDetailed: 'La imagen tiene demasiado detalle. Recórtala o usa una más sencilla.',
      unreadable: 'No pudimos leer esa imagen.',
      uploadConflict:
        'La ficha cambió o llegó al límite de archivos mientras se subía la imagen. No se guardó.',
      uploadUnconfirmed:
        'No pudimos confirmar la subida. Revisa la ficha con ver_lo_que_falta antes de repetirla.',
      failed: 'No pudimos completar la acción. Inténtalo de nuevo en un momento.',
    },
  },
} as const;
