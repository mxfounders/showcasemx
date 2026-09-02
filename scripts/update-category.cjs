const fs = require('fs');

let content = fs.readFileSync('src/components/category-explorer.tsx', 'utf8');

// Change export function CategoryExplorer to receive dict
content = content.replace(
  'export function CategoryExplorer({ categories = previewCategories, selected, onCategoryChange, results, query, onClear }: { categories?: PreviewCategory[]; selected: number; onCategoryChange: (index: number) => void; results: PreviewProduct[] | null; query: string; onClear: () => void }) {',
  'export function CategoryExplorer({ categories = previewCategories, selected, onCategoryChange, results, query, onClear, dict }: { categories?: PreviewCategory[]; selected: number; onCategoryChange: (index: number) => void; results: PreviewProduct[] | null; query: string; onClear: () => void; dict?: any }) {'
);

content = content.replace(
  'item.products.length === 1 ? "opción" : "opciones"',
  'item.products.length === 1 ? (dict?.option || "opción") : (dict?.options || "opciones")'
);

content = content.replace(
  '{results.length === 1 ? "solución" : "soluciones"} para “{query}”',
  '{results.length === 1 ? (dict?.solution || "solución") : (dict?.solutions || "soluciones")} {dict?.solutionFor || "para"} “{query}”'
);

content = content.replace(
  'Limpiar búsqueda',
  '{dict?.clearBtn || "Limpiar búsqueda"}'
);

content = content.replace(
  'Todavía no tenemos una solución para eso.',
  '{dict?.emptyTitle || "Todavía no tenemos una solución para eso."}'
);

content = content.replace(
  'El catálogo está creciendo. Prueba con cobros, tienda online o automatización, o explora otra categoría.',
  '{dict?.emptyDesc || "El catálogo está creciendo. Prueba con cobros, tienda online o automatización, o explora otra categoría."}'
);

content = content.replace(
  'product.website ? "Conocer solución" : "Ver ejemplo"',
  'product.website ? (dict?.seeSolution || "Conocer solución") : (dict?.seeExample || "Ver ejemplo")'
);
content = content.replace(
  'product.website ? "Conocer solución" : "Ver ejemplo"',
  'product.website ? (dict?.seeSolution || "Conocer solución") : (dict?.seeExample || "Ver ejemplo")'
); // second one

content = content.replace(
  'product.website ? `Por ${product.provider}` : product.feature',
  'product.website ? `${dict?.byLabel || "Por"} ${product.provider}` : product.feature'
);

content = content.replace(
  'Espacio disponible',
  '{dict?.availableSpace || "Espacio disponible"}'
);

content = content.replace(
  'Tu solución puede estar aquí.',
  '{dict?.applySpaceTitle || "Tu solución puede estar aquí."}'
);

content = content.replace(
  'Postular en {category.label}',
  '{dict?.applySpaceBtn || "Postular en"} {category.label}'
);

content = content.replace(
  '{results !== null ? "Resultados del catálogo real" : category.action}',
  '{results !== null ? (dict?.realResultsLabel || "Resultados del catálogo real") : category.action}'
);

content = content.replace(
  'realCount === 1 ? "solución real" : "soluciones reales"',
  'realCount === 1 ? (dict?.realSolutionsCount || "solución real") : (dict?.realSolutionsCountPlural || "soluciones reales")'
);

content = content.replace(
  'availableSlots === 1 ? "espacio disponible" : "espacios disponibles"',
  'availableSlots === 1 ? (dict?.availableSlotsCount || "espacio disponible") : (dict?.availableSlotsCountPlural || "espacios disponibles")'
);

content = content.replace(
  'Los ejemplos son ficticios · No son proveedores disponibles',
  '{dict?.fictionalNotice || "Los ejemplos son ficticios · No son proveedores disponibles"}'
);

content = content.replace(
  '`${detail.offering} · Por ${detail.provider}` : "Producto ficticio · Vista previa"',
  '`${detail.offering} · ${dict?.byLabel || "Por"} ${detail.provider}` : (dict?.previewTitle || "Producto ficticio · Vista previa")'
);

content = content.replace(
  'Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de shwcs.',
  '{dict?.previewNoticeReal || "Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de shwcs."}'
);

content = content.replace(
  'Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real.',
  '{dict?.previewNoticeMock || "Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real."}'
);

content = content.replace(
  'Ver ficha completa',
  '{dict?.viewFullBtn || "Ver ficha completa"}'
);

content = content.replace(
  'Visitar sitio oficial',
  '{dict?.visitSiteBtn || "Visitar sitio oficial"}'
);

content = content.replace(
  'Seguir explorando',
  '{dict?.keepExploringBtn || "Seguir explorando"}'
);

fs.writeFileSync('src/components/category-explorer.tsx', content);
