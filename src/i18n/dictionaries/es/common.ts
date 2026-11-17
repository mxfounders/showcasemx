export const common = {
  skipToContent: 'Saltar al contenido',
  homeLink: 'shwcs, volver al inicio',
  clearSearch: 'Cerrar y limpiar búsqueda',
  loading: 'Cargando',
  loadingSolutions: 'Cargando soluciones',
  loadingListing: 'Cargando ficha',
  loadingLists: 'Cargando listas',
  cookiePreferences: 'Preferencias de cookies',
  verifiedBy: 'Verificado por shwcs',
  /** How a project answers contact requests (SHCWS-52, src/lib/solutions/response.ts). */
  responseWithinHours: 'Suele responder en menos de {hours} h',
  responseWithinDays: 'Suele responder en menos de {days} días',
  responseRate: '{answered} de {requests} respondidas',
  responseFast: 'Responde rápido',
  /** SHCWS-134: the TXT proof on catalogue cards. */
  domainVerified: 'Dominio verificado · {date}',
  domainVerifiedHint:
    'Probó con un registro TXT que controla el dominio de su sitio. No es una verificación de identidad legal ni del producto.',
} as const;
