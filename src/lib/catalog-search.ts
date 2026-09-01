import { previewCategories, catalogPriority, type PreviewCategory } from "./catalog-preview";

export function normalizeQuery(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const keywords: Record<string, string> = {
  "https://cordhq.app/": "cobrar cobros cobranza pagos pagar facturas facturar facturacion cotizar cotizaciones propuestas finanzas ventas",
  "https://flouvia.com/": "tienda tiendas online ecommerce comercio electronico e commerce automatizar automatizacion automatizaciones agencia agencias desarrollo portales b2b operacion",
};
const ignored = new Set("quiero necesito busco para mi mis una un el la los las de del a al en y o que me con por como empresa negocio tiempo organizar ayuda solucion soluciones".split(" "));

export function searchCatalog(query: string, categories: PreviewCategory[] = previewCategories) {
  const tokens = normalizeQuery(query).split(" ").filter(token => token && !ignored.has(token));
  if (!tokens.length) return [];
  const unique = Array.from(new Map(categories.flatMap(category => category.products).filter(product => product.website).map(product => [product.website, product])).values());
  return unique.map(product => {
    const words = new Set(normalizeQuery(`${product.name} ${product.description} ${product.feature} ${product.provider} ${keywords[product.website!] ?? ""}`).split(" "));
    return { product, score: tokens.filter(token => words.has(token)).length };
  }).filter(result => result.score > 0).sort((a, b) => b.score - a.score || catalogPriority(a.product)-catalogPriority(b.product)).map(result => result.product);
}
