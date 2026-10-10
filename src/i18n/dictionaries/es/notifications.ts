export const notifications = {
  action: {
    saveError: 'No pudimos guardar. Intenta otra vez.',
    saving: 'Guardando…',
    saved: 'Preferencias guardadas.',
  },
  preferences: {
    intro: 'Los avisos de tu cuenta son independientes del newsletter.',
    contacts: 'Solicitudes y respuestas por correo',
    solutions: 'Estado de mis postulaciones por correo',
    save: 'Guardar preferencias',
    verifyHint: 'Verifica tu correo desde {link} para activarlos.',
    verifyLink: 'Seguridad',
    emailUnavailable:
      'El envío por correo aún no está activado. Los avisos dentro de la cuenta sí están disponibles.',
  },
  verification: {
    verified: 'Correo verificado.',
    sent: 'Enlace enviado. Revisa tu bandeja de entrada.',
    genericError: 'No pudimos completar la operación.',
    pending: 'Un momento…',
    confirm: 'Confirmar mi correo',
    send: 'Verificar mi correo',
    unavailable: 'El envío todavía no está activado.',
    openLink: 'Abre el enlace que recibiste por correo.',
    back: 'Volver a Seguridad →',
  },
  verifyPage: {
    metaTitle: 'Verifica tu correo',
    title: 'Confirma tu correo.',
  },
  settingsPage: {
    title: 'Preferencias de avisos',
    desc: 'Elige qué novedades de tu cuenta te llegan por correo. Los avisos dentro de la app siguen apareciendo en la campana.',
  },
  /** Messages returned by /api/notifications. */
  errors: {
    signIn: 'Inicia sesión.',
    invalidCursor: 'Cursor inválido.',
    loadUnavailable: 'No pudimos cargar tus avisos.',
    useAccount: 'Usa tu cuenta.',
    tooManyChanges: 'Demasiados cambios. Intenta más tarde.',
    invalidPreferences: 'Preferencias inválidas.',
    verifyFirst: 'Verifica tu correo antes de activar avisos por email.',
    invalidAction: 'Acción inválida.',
    saveUnavailable: 'No pudimos guardar el cambio.',
  },
} as const;
