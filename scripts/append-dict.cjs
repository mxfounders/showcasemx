const fs = require('fs');

const esExtras = {
  elProyecto: {
    heroLine1: "Encontrar es fácil<br />Elegir bien cambia todo",
    heroDesc: "shwcs presenta software, agencias y servicios con el contexto que una empresa necesita para entenderlos, compararlos y comenzar una conversación útil.",
    exploreBtn: "Explorar proyectos",
    card1Title: "Entiende antes de contactar",
    card1Desc: "Explora por necesidad, guarda opciones, crea listas y compara el contexto de cada proyecto antes de abrir una conversación.",
    card1Btn: "Descubrir proyectos",
    card2Title: "Presenta algo que se entienda",
    card2Desc: "Explica el problema, el alcance y las personas detrás. Mantén la información al día y responde con contexto a quien quiere conocerte.",
    card2Btn: "Postular un proyecto",
    problemTitle: "Más opciones no siempre significan mejores decisiones.",
    problemDesc: "Construimos shwcs para ordenar esa búsqueda alrededor de preguntas concretas: qué resuelve, para quién funciona, qué límites tiene y quién está detrás. El catálogo es el punto de partida; la decisión sigue siendo tuya."
  }
};

const enExtras = {
  elProyecto: {
    heroLine1: "Finding is easy<br />Choosing right changes everything",
    heroDesc: "shwcs presents software, agencies, and services with the context a company needs to understand them, compare them, and start a useful conversation.",
    exploreBtn: "Explore projects",
    card1Title: "Understand before you reach out",
    card1Desc: "Explore by need, save options, create lists, and compare the context of each project before opening a conversation.",
    card1Btn: "Discover projects",
    card2Title: "Present something that is understood",
    card2Desc: "Explain the problem, the scope, and the people behind it. Keep information up to date and respond with context to those who want to know you.",
    card2Btn: "Apply a project",
    problemTitle: "More options don't always mean better decisions.",
    problemDesc: "We built shwcs to organize that search around specific questions: what it solves, who it works for, what limits it has, and who is behind it. The catalog is the starting point; the decision remains yours."
  }
};

function inject(file, extras, name) {
  let content = fs.readFileSync(file, 'utf8');
  const jsonStr = JSON.stringify(extras, null, 2);
  const insertStr = jsonStr.substring(2, jsonStr.length - 2); // remove outer {}
  content = content.replace('"footer": {', insertStr + ',\n  "footer": {');
  fs.writeFileSync(file, content);
}

inject('src/i18n/dictionaries/es.ts', esExtras, 'es');
inject('src/i18n/dictionaries/en.ts', enExtras, 'en');
