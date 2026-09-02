const fs = require('fs');

const es = {
  categoryExplorer: {
    emptyTitle: "Todavía no tenemos una solución para eso.",
    emptyDesc: "El catálogo está creciendo. Prueba con cobros, tienda online o automatización, o explora otra categoría.",
    solutionFor: "para",
    clearBtn: "Limpiar búsqueda",
    option: "opción",
    options: "opciones",
    solution: "solución",
    solutions: "soluciones",
    applySpaceTitle: "Tu solución puede estar aquí.",
    applySpaceBtn: "Postular en",
    availableSpace: "Espacio disponible",
    realResultsLabel: "Resultados del catálogo real",
    realSolutionsCount: "solución real",
    realSolutionsCountPlural: "soluciones reales",
    availableSlotsCount: "espacio disponible",
    availableSlotsCountPlural: "espacios disponibles",
    fictionalNotice: "Los ejemplos son ficticios · No son proveedores disponibles",
    seeSolution: "Conocer solución",
    seeExample: "Ver ejemplo",
    byLabel: "Por",
    previewTitle: "Producto ficticio · Vista previa",
    previewNoticeReal: "Descripción basada en el sitio del proveedor. Consulta allí el alcance, disponibilidad y condiciones. Su inclusión no implica certificación independiente de shwcs.",
    previewNoticeMock: "Este ejemplo muestra cómo se presentarán las soluciones del catálogo. Aún no representa una aplicación disponible ni un fundador real.",
    viewFullBtn: "Ver ficha completa",
    visitSiteBtn: "Visitar sitio oficial",
    keepExploringBtn: "Seguir explorando"
  }
};

const en = {
  categoryExplorer: {
    emptyTitle: "We don't have a solution for that yet.",
    emptyDesc: "The catalog is growing. Try billing, online store or automation, or explore another category.",
    solutionFor: "for",
    clearBtn: "Clear search",
    option: "option",
    options: "options",
    solution: "solution",
    solutions: "solutions",
    applySpaceTitle: "Your solution could be here.",
    applySpaceBtn: "Apply in",
    availableSpace: "Available space",
    realResultsLabel: "Real catalog results",
    realSolutionsCount: "real solution",
    realSolutionsCountPlural: "real solutions",
    availableSlotsCount: "available slot",
    availableSlotsCountPlural: "available slots",
    fictionalNotice: "The examples are fictional · They are not available providers",
    seeSolution: "See solution",
    seeExample: "See example",
    byLabel: "By",
    previewTitle: "Fictional product · Preview",
    previewNoticeReal: "Description based on the provider's site. Check there for scope, availability and terms. Its inclusion does not imply independent certification by shwcs.",
    previewNoticeMock: "This example shows how catalog solutions will be presented. It doesn't represent an available app or a real founder yet.",
    viewFullBtn: "View full profile",
    visitSiteBtn: "Visit official site",
    keepExploringBtn: "Keep exploring"
  }
};

function inject(file, extras) {
  let content = fs.readFileSync(file, 'utf8');
  const jsonStr = JSON.stringify(extras, null, 2);
  const insertStr = jsonStr.substring(2, jsonStr.length - 2);
  content = content.replace('"footer": {', insertStr + ',\n  "footer": {');
  fs.writeFileSync(file, content);
}

inject('src/i18n/dictionaries/es.ts', es);
inject('src/i18n/dictionaries/en.ts', en);

// Add footer description
let esDict = fs.readFileSync('src/i18n/dictionaries/es.ts', 'utf8');
esDict = esDict.replace(
  '"madeIn": "Hecho en México",',
  '"madeIn": "Hecho en México",\n    "description": "Software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con quienes los construyen.",\n    "newsletter": "Suscribirse al newsletter",'
);
fs.writeFileSync('src/i18n/dictionaries/es.ts', esDict);

let enDict = fs.readFileSync('src/i18n/dictionaries/en.ts', 'utf8');
enDict = enDict.replace(
  '"madeIn": "Made in Mexico",',
  '"madeIn": "Made in Mexico",\n    "description": "Software, agencies and services for your company. Know what they solve and connect with those who build them.",\n    "newsletter": "Subscribe to newsletter",'
);
fs.writeFileSync('src/i18n/dictionaries/en.ts', enDict);
