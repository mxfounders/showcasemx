const fs = require('fs');

let content = fs.readFileSync('src/components/editorial/project-story.tsx', 'utf8');

content = content.replace(
  'export function ProjectStory() {',
  'export function ProjectStory({ dict }: { dict?: any }) {'
);

// We need to use dangerouslySetInnerHTML for heroLine1 since it has <br />
content = content.replace(
  '{/* Hero */}',
  '{/* Hero */}\n        {/* eslint-disable-next-line react/no-danger */}'
);
content = content.replace(
  /<h1 className="max-w-5xl[^>]*>[\s\S]*?<\/h1>/g,
  '<h1 className="max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl" dangerouslySetInnerHTML={{ __html: dict?.heroLine1 || "Encontrar es fácil<br />Elegir bien cambia todo" }} />'
);

content = content.replace(
  'shwcs presenta software, agencias y servicios con el contexto que una empresa necesita para entenderlos, compararlos y comenzar una conversación útil.',
  '{dict?.heroDesc || "shwcs presenta software, agencias y servicios con el contexto que una empresa necesita para entenderlos, compararlos y comenzar una conversación útil."}'
);

content = content.replace(
  'Explorar proyectos',
  '{dict?.exploreBtn || "Explorar proyectos"}'
);

content = content.replace(
  'Entiende antes de contactar',
  '{dict?.card1Title || "Entiende antes de contactar"}'
);

content = content.replace(
  'Explora por necesidad, guarda opciones, crea listas y compara el contexto de cada proyecto antes de abrir una conversación.',
  '{dict?.card1Desc || "Explora por necesidad, guarda opciones, crea listas y compara el contexto de cada proyecto antes de abrir una conversación."}'
);

content = content.replace(
  'Descubrir proyectos',
  '{dict?.card1Btn || "Descubrir proyectos"}'
);

content = content.replace(
  'Presenta algo que se entienda',
  '{dict?.card2Title || "Presenta algo que se entienda"}'
);

content = content.replace(
  'Explica el problema, el alcance y las personas detrás. Mantén la información al día y responde con contexto a quien quiere conocerte.',
  '{dict?.card2Desc || "Explica el problema, el alcance y las personas detrás. Mantén la información al día y responde con contexto a quien quiere conocerte."}'
);

content = content.replace(
  'Postular un proyecto',
  '{dict?.card2Btn || "Postular un proyecto"}'
);

content = content.replace(
  'Más opciones no siempre significan mejores decisiones.',
  '{dict?.problemTitle || "Más opciones no siempre significan mejores decisiones."}'
);

content = content.replace(
  'Construimos shwcs para ordenar esa búsqueda alrededor de preguntas concretas: qué resuelve, para quién funciona, qué límites tiene y quién está detrás. El catálogo es el punto de partida; la decisión sigue siendo tuya.',
  '{dict?.problemDesc || "Construimos shwcs para ordenar esa búsqueda alrededor de preguntas concretas: qué resuelve, para quién funciona, qué límites tiene y quién está detrás. El catálogo es el punto de partida; la decisión sigue siendo tuya."}'
);

fs.writeFileSync('src/components/editorial/project-story.tsx', content);

let infoPage = fs.readFileSync('src/app/[locale]/(marketing)/[info]/page.tsx', 'utf8');

infoPage = infoPage.replace(
  'export default async function InfoPage({params}:{params:Promise<{info:string}>}){',
  'import { getDictionary } from "@/i18n/get-dictionary";\nimport type { Locale } from "@/i18n/config";\n\nexport default async function InfoPage({params}:{params:Promise<{info:string, locale:string}>}){const {locale}=await params;\nconst dict = await getDictionary(locale as Locale);\n'
);

// Oh wait, `params` already has `locale` and `info` dynamically inside `[locale]`. Let's just destructure it.
// Wait, `params` is a Promise. Let's fix the regex.
