const fs = require('fs');

const es = {
  changelog: {
    heroTitle: "Lo nuevo en shwcs",
    heroDesc1: "Un registro de los cambios que ya puedes usar en shwcs.",
    heroDesc2: "Publicamos funciones cuando están disponibles. Las ideas que siguen en desarrollo se quedan fuera hasta convertirse en algo real.",
    feedbackBtn: "Cuéntanos qué mejorarías",
    filterTitle: "Filtrar lanzamientos",
    categoryLabel: "Categoría",
    releaseLabel: "lanzamiento",
    releasesLabel: "lanzamientos",
    updateLabel: "actualización",
    updatesLabel: "actualizaciones",
    footerTitle: "¿Algo debería funcionar mejor?",
    footerDesc: "Cuéntanos qué te estorba, qué falta o qué esperabas encontrar.",
    footerBtn: "Abrir una conversación"
  }
};

const en = {
  changelog: {
    heroTitle: "What's new in shwcs",
    heroDesc1: "A log of the changes you can already use in shwcs.",
    heroDesc2: "We publish features when they are available. Ideas that are still in development stay out until they become real.",
    feedbackBtn: "Tell us what you would improve",
    filterTitle: "Filter releases",
    categoryLabel: "Category",
    releaseLabel: "release",
    releasesLabel: "releases",
    updateLabel: "update",
    updatesLabel: "updates",
    footerTitle: "Should something work better?",
    footerDesc: "Tell us what gets in your way, what's missing, or what you expected to find.",
    footerBtn: "Open a conversation"
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

let changelog = fs.readFileSync('src/components/editorial/changelog-story.tsx', 'utf8');
changelog = changelog.replace('export function ChangelogStory() {', 'export function ChangelogStory({ dict }: { dict?: any }) {');
changelog = changelog.replace('Lo nuevo en shwcs', '{dict?.heroTitle || "Lo nuevo en shwcs"}');
changelog = changelog.replace('Un registro de los cambios que ya puedes usar en shwcs.', '{dict?.heroDesc1 || "Un registro de los cambios que ya puedes usar en shwcs."}');
changelog = changelog.replace('Publicamos funciones cuando están disponibles. Las ideas que siguen en desarrollo se quedan fuera hasta convertirse en algo real.', '{dict?.heroDesc2 || "Publicamos funciones cuando están disponibles. Las ideas que siguen en desarrollo se quedan fuera hasta convertirse en algo real."}');
changelog = changelog.replace('Cuéntanos qué mejorarías', '{dict?.feedbackBtn || "Cuéntanos qué mejorarías"}');
changelog = changelog.replace('Filtrar lanzamientos</p>', '{dict?.filterTitle || "Filtrar lanzamientos"}</p>');
changelog = changelog.replace('Categoría</p>', '{dict?.categoryLabel || "Categoría"}</p>');
changelog = changelog.replace("? 'lanzamiento' : 'lanzamientos'", "? (dict?.releaseLabel || 'lanzamiento') : (dict?.releasesLabel || 'lanzamientos')");
changelog = changelog.replace("? 'actualización' : 'actualizaciones'", "? (dict?.updateLabel || 'actualización') : (dict?.updatesLabel || 'actualizaciones')");
changelog = changelog.replace("? 'actualización' : 'actualizaciones'", "? (dict?.updateLabel || 'actualización') : (dict?.updatesLabel || 'actualizaciones')"); // second one
changelog = changelog.replace('¿Algo debería funcionar mejor?', '{dict?.footerTitle || "¿Algo debería funcionar mejor?"}');
changelog = changelog.replace('Cuéntanos qué te estorba, qué falta o qué esperabas encontrar.', '{dict?.footerDesc || "Cuéntanos qué te estorba, qué falta o qué esperabas encontrar."}');
changelog = changelog.replace('Abrir una conversación', '{dict?.footerBtn || "Abrir una conversación"}');

fs.writeFileSync('src/components/editorial/changelog-story.tsx', changelog);
