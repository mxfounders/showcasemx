/**
 * «Verificado por shwcs», recognitions and the embeddable badges (docs/recognition.md):
 * the public listing, the catalogue cards, the founder's badge card and /criterios.
 */
export const recognition = {
  verified: 'Verificado por shwcs',
  verifiedShort: 'Verificado',
  verifiedOn: 'Verificado el {date}',
  verifiedExplainer:
    'El equipo de shwcs comprobó que el sitio funciona y es del proyecto, que el producto existe y hace lo que dice esta ficha, y que quien la registró lo representa. No certifica su calidad ni sus resultados.',
  howItWorks: 'Cómo verificamos y reconocemos',
  /** «#1 de la semana», with {rank}. */
  weeklyAll: '#{rank} de la semana',
  /** «#1 de la semana en Ventas», with {rank} and {category}. */
  weeklyIn: '#{rank} de la semana en {category}',
  editorial: 'Selección shwcs',
  weeklyExplainer:
    'Puesto calculado con la actividad real de esa semana: likes, guardados, comentarios y reseñas de cuentas verificadas que no son del equipo del proyecto.',
  editorialExplainer: 'Elegida por el equipo de shwcs. Por qué:',
  awardsLabel: 'Reconocimientos',
  /** Accessible name of the seal buttons on the listing, with {name}. */
  sealButton: '{name}: ver qué significa',
  /** Embeddable SVG (GET /api/badge/[id]); shown uppercase. */
  badge: {
    featured: 'Publicado en',
    verified: 'Verificado por',
    editorial: 'Selección del equipo',
    /** Accessible name of the image, with {name}. */
    title: '{name} en shwcs',
    /** The shield («seal») layout: two short lines under the emblem. */
    seal: {
      featured: 'Publicado',
      featuredBy: 'En el catálogo',
      verified: 'Verificado',
      verifiedBy: 'Por el equipo',
      weekly: 'De la semana',
      overall: 'General',
      editorial: 'Selección',
      editorialBy: 'Del equipo',
      /** Verification date on the seal, with {date} as «nov 2026». */
      since: 'Desde {date}',
    },
  },
  /** Card on /account/solutions/[id] for a published listing. */
  founder: {
    title: 'Verificación e insignias',
    verified: 'Verificada por el equipo el {date}.',
    pending: 'Aún no está verificada. El equipo la revisa; no tienes que hacer nada.',
    moved: 'Cambiaste de sitio: la verificación se volverá a revisar.',
    verificationLink: 'Qué revisamos',
    awards: 'Reconocimientos',
    noAwards:
      'Todavía ninguno. Cada semana reconocemos los proyectos con más actividad real en su categoría.',
    badgesTitle: 'Insignias para tu sitio',
    badgesHint:
      'Pon una en tu sitio y enlaza a tu ficha. Se actualiza sola: si un reconocimiento se retira, deja de mostrarse.',
    /** Keyed by the badge kind shown in the picker. */
    kinds: { featured: 'Publicado', verified: 'Verificado', award: 'Reconocimiento' },
    layoutLabel: 'Formato',
    card: 'Horizontal',
    sealLayout: 'Sello',
    themeLabel: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    codeLabel: 'Código para pegar en tu sitio',
    copy: 'Copiar código',
    copied: 'Copiado',
    copyFailed: 'No pudimos copiar. Selecciona el código y cópialo.',
    previewAlt: 'Vista previa de la insignia',
  },
  /** /criterios#reconocimientos, laid out like «Cómo se ordena el catálogo». */
  criteria: {
    title: 'Verificación y reconocimientos',
    intro:
      'Tres señales que solo se ganan: la verificación la decide el equipo y los reconocimientos salen de actividad real o de una elección explicada. Ninguno se paga, todos llevan fecha y se pueden retirar.',
    note: 'El Top de la semana se calcula cada lunes, en hora de Ciudad de México: likes ×1, guardados ×2, comentarios ×3 y reseñas según su verificación, solo de cuentas con correo verificado y nunca del propio equipo. Cada proyecto necesita 3 cuentas distintas y cada ranking 3 proyectos; se entrega un puesto por cada dos que compiten, hasta tres.',
    verified: {
      label: 'Verificado por shwcs',
      tag: 'Equipo',
      desc: 'Revisamos que el sitio sea del proyecto, que el producto haga lo que dice la ficha y que quien la registró lo represente. Queda atada al dominio revisado.',
    },
    weekly: {
      label: 'Top de la semana',
      tag: 'Semanal',
      desc: 'Hasta tres puestos en general y por categoría, con la actividad real de la semana. Sin competencia suficiente no hay premio.',
    },
    editorial: {
      label: 'Selección shwcs',
      tag: 'Mensual',
      desc: 'Hasta tres proyectos al mes, elegidos por el equipo con el motivo a la vista. Nadie puede elegir un proyecto propio.',
    },
  },
} as const;
