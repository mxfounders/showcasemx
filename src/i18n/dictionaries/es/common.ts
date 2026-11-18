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
  /** SHCWS-51: the entry price on cards, the listing and the comparator ({price} = «$29 USD/mes»). */
  priceFrom: 'Desde {price}',
  /** A declared entry price of 0. */
  priceFree: 'Plan gratuito',
  /** SHCWS-180: a plan's price when it is 0 or quoted, and a free trial with its length. */
  planFree: 'Gratis',
  planCustom: 'A la medida',
  trialDays: 'Prueba gratis de {days} días',
  /** A declared contractual availability, {value} = «99.9». */
  slaUptime: '{value} % de disponibilidad comprometida',
} as const;
