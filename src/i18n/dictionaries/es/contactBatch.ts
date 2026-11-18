/**
 * Propuesta a varios proyectos (SHCWS-62): un formulario desde una lista o el
 * comparador, una solicitud por proyecto y sus respuestas juntas.
 */
export const contactBatch = {
  meta: {
    proposal: 'Pedir propuesta a varios proyectos',
    group: 'Propuestas pedidas juntas',
  },
  page: {
    backTo: '← Volver a {name}',
    titleOne: 'Pide propuesta a un proyecto',
    titleMany: 'Pide propuesta a {count} proyectos',
    intro:
      'Un solo formulario. Cada proyecto recibe su propia solicitud con los mismos datos, para que puedas comparar sus respuestas.',
    invalidTitle: 'Elige de dos a tres proyectos de tu lista',
    invalidBody: 'La selección cambió o no pertenece a esta lista.',
    backToList: 'Volver a la lista →',
    /** SHCWS-53: proposals straight from a temporary comparison. */
    backToComparison: '← Volver a la comparación',
    invalidComparisonTitle: 'Elige de dos a tres fichas publicadas',
    invalidComparisonBody: 'La selección se repite o alguna ficha ya no está publicada.',
    backToCatalog: 'Volver al catálogo →',
    noneTitle: 'Ninguno de estos proyectos puede recibir una solicitud nueva',
    noneBody: 'Abajo está el motivo de cada uno.',
    excludedTitle: 'No se incluyen',
    reasons: {
      own: 'Es tu proyecto.',
      unavailable: 'Su ficha ya no está publicada.',
      external: 'Solo recibe contacto desde su sitio oficial.',
    },
    unavailableName: 'Proyecto no disponible',
    existing:
      'Ya le escribiste. No le enviaremos otra solicitud: su conversación se verá junto a las demás.',
    viewThread: 'Ver conversación →',
  },
  form: {
    aria: 'Pedir propuesta a varios proyectos',
    recipientsLabel: 'Para',
    questionsLegend: 'Pide a todos lo mismo',
    questionsHint:
      'Las preguntas que marques se añaden al final de tu necesidad, para que las respuestas se puedan comparar.',
    /** Se escribe dentro de la necesidad que recibe cada proyecto, antes de las preguntas. */
    questionsHeading: 'Para comparar opciones, me ayudaría que me compartan:',
    questions: {
      pricing: 'Precio y forma de cobro',
      implementation: 'Tiempo y pasos de implementación',
      invoicing: 'Facturación con los requisitos fiscales de mi país',
      integrations: 'Integraciones con las herramientas que ya usamos',
      support: 'Soporte y acompañamiento después de contratar',
    },
    needTooLong:
      'Tu necesidad y las preguntas suman más de 2000 caracteres. Acórtala o quita alguna pregunta.',
    review: 'Revisar solicitudes',
    reviewTitle: 'Esto recibirá cada proyecto',
    reviewNote:
      'Cada proyecto recibe solo su propia solicitud, con estos mismos datos: no sabe a quién más escribiste ni ve tus listas, guardados o notas.',
    consentLegend: 'Autoriza a cada destinatario',
    consentScope:
      'Cada autorización cubre solo esta solicitud: tu nombre, el correo de tu cuenta, tu empresa y lo que escribiste. Tus guardados, listas y notas no se comparten.',
    consentFor: 'Autorizo compartir estos datos con la cuenta propietaria de {project}.',
    consentRequired: 'Autoriza al menos un proyecto para enviar.',
    existingRow: '{project}: ya le escribiste, no se envía nada nuevo.',
    sendOne: 'Enviar a 1 proyecto',
    sendMany: 'Enviar a {count} proyectos',
    sending: 'Enviando…',
    edit: 'Editar datos',
  },
  results: {
    title: 'Resultado del envío',
    sent: 'Enviada a {project}',
    existing: 'Ya le habías escrito a {project}: no se envió otra',
    failed: 'No se envió a {project}',
    viewThread: 'Ver conversación →',
    retry: 'Reintentar lo que falló',
    retrying: 'Reintentando…',
    retryNote: 'Reintentar es seguro: lo que ya se envió no se duplica.',
    viewGroup: 'Ver respuestas juntas →',
    notGrouped:
      'Las solicitudes enviadas ya están en Mis contactos, pero no pudimos agruparlas. Reintenta para verlas juntas.',
    myContacts: 'Ver mis contactos',
  },
  group: {
    back: '← Mis contactos',
    title: 'Propuestas pedidas juntas',
    sentOn: 'Enviadas el',
    fromList: 'desde tu lista',
    privacy:
      'Cada proyecto recibió solo su propia solicitud y no sabe a quién más escribiste. Aquí ves sus respuestas lado a lado.',
    earlier: 'Ya le habías escrito antes',
    turnMine: 'Te toca responder',
    turnTheirs: 'Esperando su respuesta',
    lastReply: 'Su última respuesta',
    noReply: 'Aún no responde.',
    open: 'Abrir conversación →',
    sharedTitle: 'Lo que enviaste a todos',
  },
  inbox: {
    title: 'Propuestas en grupo',
    replied: '{replied} de {total} respondieron',
    sent: 'Enviada',
    view: 'Ver juntas →',
  },
  detail: {
    partOf: 'Esta solicitud forma parte de una propuesta a varios proyectos.',
    view: 'Ver respuestas juntas →',
  },
  errors: {
    incomplete:
      'Completa tus datos, elige de uno a tres proyectos y autoriza a cada uno antes de enviar.',
    listUnavailable: 'Esta lista ya no está disponible.',
    notInList: 'Algún proyecto ya no está en esta lista. Recarga y revisa la selección.',
    consentMissing: 'Autoriza a cada proyecto que va a recibir la solicitud.',
    createLimit: 'Has enviado demasiadas solicitudes. No se envió ninguna; intenta más tarde.',
    itemUnconfirmed: 'No pudimos confirmar el envío. Revisa Mis contactos antes de repetir.',
  },
} as const;
