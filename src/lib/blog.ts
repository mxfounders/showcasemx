export type BlogTone = 'blue' | 'green' | 'lavender' | 'terracotta' | 'amber';

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  takeaways: [string, string, string];
  category: 'Comprar mejor' | 'Construir' | 'Producto' | 'Operación' | 'shwcs';
  publishedAt: string;
  readingMinutes: number;
  tone: BlogTone;
  sections: Array<{ title: string; paragraphs: string[] }>;
};

export const blogTones: Record<BlogTone, { background: string; foreground: string }> = {
  blue: { background: '#365DC4', foreground: '#FFFFFF' },
  green: { background: '#47785B', foreground: '#FFFFFF' },
  lavender: { background: '#7A57A8', foreground: '#FFFFFF' },
  terracotta: { background: '#BA5B3F', foreground: '#FFFFFF' },
  amber: { background: '#A47318', foreground: '#FFFFFF' },
};

export const blogPosts: BlogPost[] = [
  {
    slug: 'evaluar-software-sin-perderse-en-la-demo',
    title: 'Cómo evaluar software sin perderte en una demo',
    excerpt: 'Una demo enseña posibilidades. Tu evaluación necesita comprobar si esas posibilidades resuelven tu operación real.',
    takeaways: ['Llega con un problema y un caso real.', 'Pregunta por límites, dependencias y trabajo manual.', 'Termina con una prueba concreta, responsable y fecha.'],
    category: 'Comprar mejor', publishedAt: '2026-09-01', readingMinutes: 6, tone: 'blue',
    sections: [
      { title: 'Empieza por el problema', paragraphs: ['Antes de abrir una agenda, escribe qué proceso quieres cambiar, quién lo vive y qué resultado esperas. Una necesidad concreta permite distinguir una función útil de una demostración atractiva.', 'Lleva a la llamada un ejemplo real: una factura, una aprobación o un reporte. Pide que el producto recorra ese caso completo.'] },
      { title: 'Pregunta por los bordes', paragraphs: ['La mejor información suele aparecer cuando preguntas qué no hace el producto. Revisa permisos, exportación de datos, integraciones, soporte y el trabajo manual que seguirá existiendo.', 'Anota qué viene incluido, qué requiere configuración y qué depende de otro proveedor. Así comparas alcance y no solo pantallas.'] },
      { title: 'Cierra con un siguiente paso verificable', paragraphs: ['Define una prueba corta con responsables, datos y una fecha. Si todavía faltan respuestas, registra esas dudas antes de hablar de precio o contrato.'] },
    ],
  },
  {
    slug: 'siete-preguntas-para-una-ficha-util',
    title: 'Siete preguntas que hacen útil una ficha',
    excerpt: 'Una ficha clara ayuda a la persona correcta a entender el proyecto, descartarlo o iniciar una conversación con contexto.',
    takeaways: ['Explica el problema antes que las funciones.', 'Distingue evidencia, alcance y promesas.', 'Permite evaluar lo básico sin pedir una llamada.'],
    category: 'Construir', publishedAt: '2026-09-01', readingMinutes: 5, tone: 'green',
    sections: [
      { title: 'Claridad antes que volumen', paragraphs: ['Explica qué problema resuelves, para quién, cómo cambia el proceso, cuánto cuesta, qué necesita para funcionar, qué límites tiene y cómo se puede comprobar.', 'No necesitas convertir cada respuesta en una promesa. Una limitación bien explicada genera más confianza que una lista interminable de beneficios.'] },
      { title: 'Haz que la evidencia se pueda revisar', paragraphs: ['Separa resultados, testimonios y afirmaciones. Añade la fuente, el periodo y el contexto suficiente para que alguien entienda qué ocurrió sin adivinar.'] },
      { title: 'Escribe para la decisión', paragraphs: ['La ficha debe permitir tres acciones: seguir explorando, guardar para después o contactar. Si obliga a pedir una llamada para comprender lo básico, todavía le falta información.'] },
    ],
  },
  {
    slug: 'guardar-no-es-contactar',
    title: 'Guardar no es contactar: diseñar intención sin ruido',
    excerpt: 'Las señales de interés tienen distinto peso. Entenderlas evita perseguir curiosidad y ayuda a responder mejor.',
    takeaways: ['Like, guardado y contacto expresan intenciones distintas.', 'La privacidad debe ser explícita en cada gesto.', 'Mide progresión, no una cifra aislada.'],
    category: 'Producto', publishedAt: '2026-09-01', readingMinutes: 4, tone: 'lavender',
    sections: [
      { title: 'Cada gesto significa algo distinto', paragraphs: ['Un like puede expresar afinidad. Guardar suele indicar que una opción merece volver a verse. Un comentario añade contexto. Una solicitud de contacto ya pide una respuesta.', 'Tratar todas esas acciones como un lead produce ruido para quien publica y presión para quien apenas explora.'] },
      { title: 'La privacidad también es producto', paragraphs: ['Guardar debe poder ser privado. Publicar una lista debe ser una decisión explícita. Contactar debe mostrar exactamente qué datos se compartirán y con quién.'] },
      { title: 'Mide la progresión', paragraphs: ['Las vistas sirven para entender alcance; los clics, guardados y solicitudes muestran avances distintos. Ninguna métrica aislada explica la calidad de una oportunidad.'] },
    ],
  },
  {
    slug: 'que-necesita-un-cfo-antes-de-hablar',
    title: 'Qué necesita un CFO antes de hablar con un proveedor',
    excerpt: 'Precio es una parte de la decisión. Alcance, riesgo, tiempo y control explican si una solución realmente cabe en la empresa.',
    takeaways: ['Calcula licencia, implementación y tiempo interno.', 'Aclara control, exportación y salida.', 'Documenta supuestos para poder defender la decisión.'],
    category: 'Operación', publishedAt: '2026-09-01', readingMinutes: 6, tone: 'terracotta',
    sections: [
      { title: 'El costo completo', paragraphs: ['Además de la licencia, incluye implementación, migración, capacitación, soporte, integraciones y el tiempo del equipo interno. Pregunta qué cambia cuando crecen usuarios, volumen o entidades.'] },
      { title: 'El control operativo', paragraphs: ['Revisa quién puede aprobar, exportar y borrar información; qué historial queda; cómo se recuperan los datos; y qué ocurre si termina la relación comercial.'] },
      { title: 'Una decisión que se pueda defender', paragraphs: ['Documenta alternativas, supuestos y responsables. Una compra bien explicada puede revisarse después sin depender de la memoria de una sola persona.'] },
    ],
  },
  {
    slug: 'popularidad-y-relevancia',
    title: 'Popularidad y relevancia no son lo mismo',
    excerpt: 'Lo más visto puede iniciar una exploración. La mejor opción depende del problema, el contexto y las restricciones de cada empresa.',
    takeaways: ['Cada ranking responde una pregunta distinta.', 'Explica siempre por qué aparece una opción.', 'El objetivo final es encontrar encaje.'],
    category: 'shwcs', publishedAt: '2026-09-01', readingMinutes: 4, tone: 'amber',
    sections: [
      { title: 'Los rankings necesitan contexto', paragraphs: ['Una lista reciente, una lista guardada y una lista con conversación activa responden preguntas diferentes. Mezclarlas en una sola puntuación esconde más de lo que aclara.'] },
      { title: 'Señales comprensibles', paragraphs: ['En shwcs queremos mostrar por qué aparece algo: fecha, categoría, actividad o selección editorial. La persona debe poder cambiar el criterio y reconocer sus límites.'] },
      { title: 'El objetivo es encontrar encaje', paragraphs: ['Descubrir no termina en una posición. Termina cuando alguien comprende una opción, la compara con su realidad y puede tomar el siguiente paso con suficiente información.'] },
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
