// Public navigation destinations.
// Every route lives under [locale], so a bare href like "/explorar/cobros" is
// missing its segment and middleware.ts 307-redirects it to "/es/explorar/cobros".
// Next never caches a prefetch that resolves to a redirect, so every link that
// skipped this turned into a cold navigation on click. Always prefix here.
export function navigationHref(href:string,locale:string){
  // We now have dedicated pages for /explorar, /industria, and /colecciones, so no need to rewrite to /?q=...
  if(href==='/explorar'||href==='/buscar')return `/${locale}#catalogo`;
  if(href==='/leads')return `/${locale}/account/opportunities`;
  return `/${locale}${href}`;
}
export function availableNavigation(href:string){
  // Now we allow /colecciones/* to show up in the menu!
  return !['/drops','/fundadores','/eventos','/destacados','/colecciones'].includes(href);
}
