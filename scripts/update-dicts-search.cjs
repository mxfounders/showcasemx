const fs = require('fs');

const es = {
  search: {
    searchLabel: "Buscar soluciones en el catálogo",
    searchPlaceholder: "¿Qué necesitas resolver?",
    searchBtnLabel: "Buscar soluciones",
    searchSubmitLabel: "Enviar búsqueda",
    searchCloseLabel: "Cerrar búsqueda"
  }
};

const en = {
  search: {
    searchLabel: "Search solutions in the catalog",
    searchPlaceholder: "What do you need to solve?",
    searchBtnLabel: "Search solutions",
    searchSubmitLabel: "Submit search",
    searchCloseLabel: "Close search"
  }
};

function inject(file, extras) {
  let content = fs.readFileSync(file, 'utf8');
  // Inject into navbar since it's dict.navbar.search (Wait, in navbar.tsx I passed dict?.search but dict is dict.navbar! So dict.navbar.search)
  const jsonStr = JSON.stringify(extras, null, 2);
  const insertStr = jsonStr.substring(2, jsonStr.length - 2);
  content = content.replace('"navbar": {', '"navbar": {\n' + insertStr + ',');
  fs.writeFileSync(file, content);
}

inject('src/i18n/dictionaries/es.ts', es);
inject('src/i18n/dictionaries/en.ts', en);
