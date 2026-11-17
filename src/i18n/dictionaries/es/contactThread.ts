/** The conversation inside a contact request (SHCWS-168): thread, turn and composer. */
export const contactThread = {
  title: 'Conversación',
  you: 'Tú',
  /** Above the thread: whose move it is. */
  turnMine: 'Te toca responder',
  /** With {name} and {since} («hace 2 días»). */
  turnTheirs: 'Esperando a {name} · {since}',
  closed: 'Esta conversación está cerrada. Pueden reabrirla desde «Más acciones».',
  closedBuyer: 'Esta conversación está cerrada.',
  withdrawn: 'El comprador retiró la solicitud.',
  /** System lines, with {name} for who did it. */
  changes: {
    started: '{name} respondió y empezó la conversación',
    closed: '{name} cerró la conversación',
    reopened: '{name} reabrió la conversación',
    withdrawn: '{name} retiró la solicitud',
  },
  /** The same lines when the reader did it («Cerraste…», not «Tú cerró…»). */
  changesMine: {
    started: 'Respondiste y empezaste la conversación',
    closed: 'Cerraste la conversación',
    reopened: 'Reabriste la conversación',
    withdrawn: 'Retiraste la solicitud',
  },
  composerLabel: 'Tu mensaje',
  placeholderBuyer: 'Responde, propone una fecha o pregunta lo que necesites…',
  placeholderRecipient:
    'Responde con un siguiente paso concreto: una demo, una propuesta, una pregunta…',
  send: 'Enviar',
  sending: 'Enviando…',
  hint: '⌘/Ctrl + Enter para enviar',
  sent: 'Mensaje enviado.',
  errors: {
    origin: 'Usa tu cuenta de shwcs.',
    signIn: 'Inicia sesión para continuar.',
    invalid: 'Escribe un mensaje de hasta 2000 caracteres.',
    limit: 'Demasiados mensajes seguidos. Intenta en unos minutos.',
    closed: 'Esta conversación ya no admite mensajes. Recarga para ver su estado.',
    unavailable: 'Conversación no disponible.',
    failed: 'No pudimos confirmar el envío. Recarga para comprobarlo antes de repetir.',
  },
} as const;
