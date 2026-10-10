/** Page `<title>`, description and Open Graph text for public routes (see src/lib/seo.ts). */
export const meta = {
  site: {
    title: 'shwcs | Proyectos para tu empresa',
    description:
      'Descubre software, agencias y servicios para tu empresa. Conoce qué resuelven y conecta con sus creadores.',
    imageAlt: 'shwcs — Explora proyectos, descubre herramientas y conecta con sus operadores.',
    ogLocale: 'es_MX',
  },
  solution: {
    fallbackDescription: 'Descubre soluciones seleccionadas para tu empresa.',
  },
  community: {
    title: 'Listas de la comunidad | shwcs',
    description:
      'Descubre selecciones de software, agencias y servicios compartidas por la comunidad.',
  },
  communityList: {
    title: 'Lista de la comunidad | shwcs',
  },
} as const;
