// Public navigation destinations
export function navigationHref(href:string){
  // We now have dedicated pages for /explorar, /industria, and /colecciones, so no need to rewrite to /?q=...
  if(href==='/explorar'||href==='/buscar')return '/#catalogo';
  if(href==='/leads')return '/account/opportunities';
  return href;
}
export function availableNavigation(href:string){
  // Now we allow /colecciones/* to show up in the menu!
  return !['/drops','/fundadores','/eventos','/destacados','/colecciones'].includes(href);
}
