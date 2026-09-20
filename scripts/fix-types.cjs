const fs = require('fs');

// 1. landing-features.tsx
let lf = fs.readFileSync('src/components/landing-features.tsx', 'utf8');
lf = lf.replace('typeof features[0]', 'typeof fallbackFeatures[0]');
lf = lf.replace(
  'Espacio Disponible',
  '{dict?.miniMockup?.availableSpace || "Espacio Disponible"}'
);
lf = lf.replace(
  'Tu solución puede estar aquí.',
  '{dict?.miniMockup?.text?.replace("\\n", " ") || "Tu solución puede estar aquí."}'
);
lf = lf.replace(
  'Postular en {activeTab.label.split(\' \')[0]}',
  '{dict?.miniMockup?.applySpaceBtn || "Postular en"} {activeTab.label.split(\' \')[0]}'
);
fs.writeFileSync('src/components/landing-features.tsx', lf);

// 2. landing-stacking-cards.tsx
let lsc = fs.readFileSync('src/components/landing-stacking-cards.tsx', 'utf8');
lsc = lsc.replace(
  'const fallbackFeatures = [',
  'export const fallbackStackingCards = ['
);
lsc = lsc.replace(
  'const stackData = (dict?.stackingCards?.map((f: any, i: number) => ({ ...fallbackFeatures[i], ...f })) || fallbackFeatures).map',
  'const stackData = (dict?.stackingCards?.map((f: any, i: number) => ({ ...fallbackStackingCards[i], ...f })) || fallbackStackingCards).map'
);
fs.writeFileSync('src/components/landing-stacking-cards.tsx', lsc);

// 3. landing-discovery.tsx
let ld = fs.readFileSync('src/components/landing-discovery.tsx', 'utf8');
ld = ld.replace(
  'const categories = useMemo(() => translatedCategories.map(category => ({ ...category, products: Array.from(new Map([...category.products.filter(product => process.env.NEXT_PUBLIC_SHOW_DEMO_PROJECTS===\'true\'&&!product.website), ...published.filter(product => product.categories.includes(category.label))].map(product => [product.website ?? product.name, product])).values()).sort((a,b)=>((b.score??0)-(a.score??0))||(catalogPriority(a)-catalogPriority(b))) })), [published]);',
  'const categories = useMemo(() => translatedCategories.map((category: any) => ({ ...category, products: Array.from(new Map([...category.products.filter((product: any) => process.env.NEXT_PUBLIC_SHOW_DEMO_PROJECTS===\'true\'&&!product.website), ...published.filter(product => product.categories.includes(category.label))].map(product => [product.website ?? product.name, product])).values()).sort((a: any,b: any)=>((b.score??0)-(a.score??0))||(catalogPriority(a)-catalogPriority(b))) })), [translatedCategories, published]);'
);
fs.writeFileSync('src/components/landing-discovery.tsx', ld);

