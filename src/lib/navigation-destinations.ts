// Public navigation destinations.
// Every route lives under [locale], so a bare href like "/explorar/cobros" is
// missing its segment and middleware.ts 307-redirects it to "/es/explorar/cobros".
// Next never caches a prefetch that resolves to a redirect, so every link that
// skipped this turned into a cold navigation on click. Always prefix here.
export function navigationHref(href: string, locale: string) {
  // We now have dedicated pages for /explorar, /industria, and /colecciones, so no need to rewrite to /?q=...
  if (href === '/explorar') return `/${locale}#catalogo`;
  if (href === '/leads') return `/${locale}/account/opportunities`;
  return `/${locale}${href}`;
}
// Destinations named in the footer/navbar dictionaries that have no page yet, each
// tied to the issue that builds it (SHCWS-131). They stay in the dictionaries so the
// copy is ready, and come back by removing them from here once the route exists.
// tests/navigation.test.ts fails if a visible link 404s. Weekly Drops became
// «Nuevo esta semana» (/nuevo, SHCWS-125) and the invented events were removed.
const pendingDestinations = [
  '/fundadores', // public creator profiles: SHCWS-120
  '/destacados', // «Selección shwcs», today only in ops: SHCWS-165
  '/colecciones', // index of the collections; each /colecciones/[slug] exists
  '/sponsor', // returns with /anunciate, the media kit: SHCWS-73
];

export function availableNavigation(href: string) {
  return !pendingDestinations.includes(href);
}
