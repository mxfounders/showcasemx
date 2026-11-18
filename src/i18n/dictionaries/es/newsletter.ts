export const newsletter = {
  metaTitle: 'Novedades y avisos',
  metaDescription: 'Suscríbete para conocer nuevas soluciones, actualizaciones y avisos de shwcs.',
  hero: 'Suscríbete al newsletter.<br />Mantente al día.',
  formAria: 'Suscripción al newsletter',
  progressAria: 'Progreso del formulario',
  titles: {
    profile: '¿Qué te trae por aquí?',
    role: '¿Cuál es tu rol?',
    email: '¿A qué correo te escribimos?',
  },
  errors: {
    submit: 'No pudimos registrar tu suscripción. Inténtalo de nuevo.',
    submitCatch: 'No pudimos confirmar la suscripción. Reintenta; no duplicaremos tu registro.',
  },
  profiles: {
    founder: { label: 'Soy fundador', detail: 'Construyo o vendo una solución.' },
    buyer: { label: 'Soy comprador', detail: 'Busco soluciones para mi empresa.' },
    both: { label: 'Un poco de ambos', detail: 'Construyo y también busco soluciones.' },
    exploring: { label: 'Estoy explorando', detail: 'Quiero conocer lo que se está creando.' },
  },
  roles: {
    leadership: 'Fundador / Dirección',
    product_tech: 'Producto / Tecnología',
    sales_marketing: 'Ventas / Marketing',
    operations: 'Operaciones',
    finance_procurement: 'Finanzas / Compras',
    other: 'Otro rol',
  },
  labels: {
    email: 'Tu correo electrónico',
    purpose:
      'Te escribiremos para confirmar tu dirección: solo recibirás el newsletter después de confirmar. Usaremos tu correo, perfil y rol para enviarte novedades de shwcs; los clics se cuentan como totales, nunca por persona.',
    consent: 'Quiero recibir novedades y avisos de shwcs por correo.',
    honeypot: 'Deja este campo vacío',
  },
  placeholders: { email: 'tu@correo.com' },
  step: 'Paso',
  of: 'de',
  registering: 'Registrando…',
  subscribeBtn: 'Suscribirme',
  continueBtn: 'Continuar',
  backBtn: 'Anterior',
  successTitle: 'Revisa tu correo',
  successDesc:
    'Te enviamos un enlace para confirmar tu suscripción; vence en 7 días. Hasta que lo abras no te enviaremos el newsletter. Si ya estabas suscrito, no duplicaremos tu registro.',
  successBtn: 'Explorar soluciones',
  /** The page reached from the unsubscribe link at the foot of each newsletter email. */
  unsubscribe: {
    metaTitle: 'Cancelar newsletter',
    doneTitle: 'Tu baja quedó registrada.',
    doneDesc:
      'No volveremos a enviarte campañas del newsletter. Los avisos de una cuenta, si los activaste, se administran por separado.',
    back: 'Volver a shwcs →',
    title: 'Dejar de recibir el newsletter.',
    desc: 'Confirma la baja. No eliminaremos tu cuenta ni cambiaremos los avisos transaccionales que hayas solicitado.',
    pending: 'Registrando…',
    submit: 'Confirmar baja',
    missingToken: 'Este enlace no contiene una solicitud de baja válida.',
    error: 'No pudimos registrar la baja.',
    genericError: 'No pudimos registrar la baja. Inténtalo de nuevo.',
  },
  /** The page reached from the confirmation email (double opt-in, SHCWS-124). */
  confirm: {
    metaTitle: 'Confirmar suscripción',
    title: 'Confirma tu suscripción',
    desc: 'Un clic y empezarás a recibir el newsletter de shwcs. Puedes darte de baja desde cualquier correo.',
    submit: 'Confirmar suscripción',
    pending: 'Confirmando…',
    openLink: 'Abre el enlace completo que te enviamos por correo.',
    doneTitle: 'Suscripción confirmada',
    doneDesc: 'Ya estás en la lista. Cada correo trae un enlace para darte de baja con un clic.',
    back: 'Explorar soluciones →',
    error: 'No pudimos confirmar la suscripción.',
    genericError: 'No pudimos confirmar la suscripción. Inténtalo de nuevo.',
  },
  /**
   * Copy of the newsletter's own emails (confirmation and campaigns). Server-side only;
   * {placeholders} are replaced in src/lib/newsletter/.
   */
  mail: {
    confirm: {
      subject: 'Confirma tu suscripción a shwcs',
      heading: 'Confirma tu suscripción',
      paragraphs: [
        'Recibimos una solicitud para suscribir esta dirección al newsletter de shwcs.',
        'Confírmala con el botón. Si no fuiste tú, ignora este correo: no te enviaremos campañas.',
      ],
      button: 'Confirmar suscripción',
      footer: 'El enlace vence en 7 días y solo funciona una vez.',
    },
    reconfirm: {
      subject: '¿Sigues queriendo recibir el newsletter de shwcs?',
      heading: '¿Seguimos escribiéndote?',
      paragraphs: [
        'Te suscribiste al newsletter de shwcs. Ahora pedimos confirmar cada dirección antes de enviarle campañas.',
        'Si quieres seguir recibiéndolo, confírmalo con el botón. Si no, ignora este correo: no te enviaremos campañas.',
      ],
      button: 'Sí, quiero recibirlo',
      footer: 'El enlace vence en 7 días y solo funciona una vez.',
    },
    campaign: {
      footer: 'Recibes este correo porque confirmaste tu suscripción al newsletter de shwcs.',
      unsubscribe: 'Darte de baja',
      unsubscribeText: 'Darte de baja: {url}',
      testSubject: '[Prueba v{version}] {subject}',
      testBanner:
        'Envío de prueba de la versión {version}. Los clics de esta prueba no se cuentan y la baja no tiene efecto.',
    },
    weekly: {
      subjectOne: 'Nuevo esta semana en shwcs: {name}',
      subjectMany: 'Nuevo esta semana en shwcs: {count} soluciones',
      heading: 'Nuevo esta semana',
      intro:
        'Estas son las fichas que el equipo aprobó en los últimos siete días, de la más reciente a la más antigua. No están ordenadas por votos.',
      cta: '[Ver todas en Nuevo esta semana](/es/nuevo)',
    },
  },
  /** Messages returned by /api/newsletter and /api/newsletter/unsubscribe. */
  api: {
    useForm: 'Suscríbete desde el formulario de shwcs.',
    invalidFormat: 'Formato no válido.',
    missingEmail: 'Falta tu correo.',
    formTooLong: 'El formulario es demasiado largo.',
    unreadableForm: 'No pudimos leer el formulario. Inténtalo de nuevo.',
    invalidSubscription: 'Revisa tu perfil, rol y correo, y acepta recibir novedades.',
    subscriptionsDisabled:
      'Las suscripciones todavía no están habilitadas. Tu correo no se ha guardado; inténtalo más tarde.',
    subscribeTooMany: 'Recibimos varios intentos. Espera antes de volver a suscribirte.',
    subscribeUnavailable:
      'No pudimos registrar tu suscripción. Conservamos el correo en el formulario para que puedas reintentar.',
    openFromShwcs: 'Abre el enlace desde shwcs.',
    requestTooLong: 'Solicitud demasiado larga.',
    unreadableRequest: 'No pudimos leer la solicitud.',
    unsubscribeLinkInvalid: 'El enlace de baja no es válido.',
    unsubscribeDisabled: 'La baja no está disponible en este momento.',
    unsubscribeTooMany: 'Demasiados intentos. Espera un momento.',
    unsubscribeUnavailable: 'No pudimos registrar la baja. Inténtalo de nuevo.',
    confirmationUnavailable:
      'No pudimos enviarte el correo de confirmación. Tu solicitud no se perdió: inténtalo de nuevo en unos minutos.',
    confirmLinkInvalid: 'Este enlace ya se usó o venció. Suscríbete de nuevo para recibir otro.',
    confirmUnavailable: 'No pudimos confirmar la suscripción. Inténtalo de nuevo.',
    confirmTooMany: 'Demasiados intentos. Espera un momento.',
  },
} as const;
