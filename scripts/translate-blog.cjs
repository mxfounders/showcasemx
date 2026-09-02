const fs = require('fs');

const es = {
  blog: {
    heroTitle: "Ideas para elegir, construir y operar mejores proyectos",
    heroDesc: "No es contenido para rellenar espacio. Aquí publicamos las notas, entrevistas y análisis que usamos internamente para entender qué herramientas funcionan, qué problemas importan y quiénes los están resolviendo mejor en el ecosistema.",
    tabs: ["Todo", "Founders", "Compradores"],
    emptyState: "No hay publicaciones en esta categoría.",
    ctaTitle: "¿Buscas herramientas B2B?",
    ctaDesc: "Explora el catálogo, guarda las opciones que te interesen y revisa su contexto antes de iniciar una conversación.",
    ctaBtn: "Explorar catálogo"
  }
};

const en = {
  blog: {
    heroTitle: "Ideas to choose, build and operate better projects",
    heroDesc: "This is not content to fill space. Here we publish the notes, interviews and analysis we use internally to understand what tools work, what problems matter and who is solving them best in the ecosystem.",
    tabs: ["All", "Founders", "Buyers"],
    emptyState: "No posts in this category.",
    ctaTitle: "Looking for B2B tools?",
    ctaDesc: "Explore the catalog, save the options that interest you and review their context before starting a conversation.",
    ctaBtn: "Explore catalog"
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

let blog = fs.readFileSync('src/components/blog/blog-index.tsx', 'utf8');
blog = blog.replace('export function BlogIndex() {', 'export function BlogIndex({ dict }: { dict?: any }) {');
blog = blog.replace(
  'Ideas para elegir, construir y operar mejores proyectos',
  '{dict?.heroTitle || "Ideas para elegir, construir y operar mejores proyectos"}'
);
blog = blog.replace(
  'No es contenido para rellenar espacio. Aquí publicamos las notas, entrevistas y análisis que usamos internamente para entender qué herramientas funcionan, qué problemas importan y quiénes los están resolviendo mejor en el ecosistema.',
  '{dict?.heroDesc || "No es contenido para rellenar espacio. Aquí publicamos las notas, entrevistas y análisis que usamos internamente para entender qué herramientas funcionan, qué problemas importan y quiénes los están resolviendo mejor en el ecosistema."}'
);
blog = blog.replace(
  /const categories = \['Todo', 'Founders', 'Compradores'\];/g,
  'const categories = dict?.tabs || ["Todo", "Founders", "Compradores"];'
);
blog = blog.replace(
  'No hay publicaciones en esta categoría.',
  '{dict?.emptyState || "No hay publicaciones en esta categoría."}'
);
blog = blog.replace(
  '¿Buscas herramientas B2B?',
  '{dict?.ctaTitle || "¿Buscas herramientas B2B?"}'
);
blog = blog.replace(
  'Explora el catálogo, guarda las opciones que te interesen y revisa su contexto antes de iniciar una conversación.',
  '{dict?.ctaDesc || "Explora el catálogo, guarda las opciones que te interesen y revisa su contexto antes de iniciar una conversación."}'
);
blog = blog.replace(
  'Explorar catálogo',
  '{dict?.ctaBtn || "Explorar catálogo"}'
);
fs.writeFileSync('src/components/blog/blog-index.tsx', blog);

let blogPage = fs.readFileSync('src/app/[locale]/(marketing)/blog/page.tsx', 'utf8');
blogPage = blogPage.replace('export default function BlogPage() { return <BlogIndex />; }', `import { getDictionary } from '@/i18n/get-dictionary';
import type { Locale } from '@/i18n/config';

export default async function BlogPage({params}:{params:Promise<{locale:string}>}) {
  const {locale} = await params;
  const dict = await getDictionary(locale as Locale);
  return <BlogIndex dict={dict.blog} />;
}`);
fs.writeFileSync('src/app/[locale]/(marketing)/blog/page.tsx', blogPage);

