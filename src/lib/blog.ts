import { i18n, isLocale, type Locale } from '@/i18n/config';

export type BlogTone = 'blue' | 'green' | 'lavender' | 'terracotta' | 'amber';

/** Stable id a post is filed under; filters compare ids, never translated text. */
export type BlogCategory = 'buying' | 'building' | 'product' | 'operations' | 'shwcs';

const blogCategoryLabels: Record<Locale, Record<BlogCategory, string>> = {
  es: {
    buying: 'Comprar mejor',
    building: 'Construir',
    product: 'Producto',
    operations: 'Operación',
    shwcs: 'shwcs',
  },
  en: {
    buying: 'Buying better',
    building: 'Building',
    product: 'Product',
    operations: 'Operations',
    shwcs: 'shwcs',
  },
};

type BlogSection = { title: string; paragraphs?: string[]; contentHtml?: string };

/** The prose of one article in one language. */
type BlogContent = {
  title: string;
  excerpt: string;
  takeaways: [string, string, string];
  sections: BlogSection[];
};

/**
 * One article: the facts every language shares (slug, date, tone…) once, and
 * the prose per locale. `Record<Locale, …>` makes a missing translation a
 * compile error instead of a silent fallback, and both languages keep the
 * same slug, so switching locale on an article never 404s.
 */
type BlogEntry = {
  slug: string;
  category: BlogCategory;
  publishedAt: string;
  readingMinutes: number;
  tone: BlogTone;
  content: Record<Locale, BlogContent>;
};

/** An article resolved for one locale — what pages and components render. */
export type BlogPost = Omit<BlogEntry, 'content'> & BlogContent & { categoryLabel: string };

/** What the blog index needs per card: no article body, so it stays out of the client bundle. */
export type BlogPostSummary = Omit<BlogPost, 'takeaways' | 'sections'>;

export const blogTones: Record<BlogTone, { background: string; foreground: string }> = {
  blue: { background: '#365DC4', foreground: '#FFFFFF' },
  green: { background: '#47785B', foreground: '#FFFFFF' },
  lavender: { background: '#7A57A8', foreground: '#FFFFFF' },
  terracotta: { background: '#BA5B3F', foreground: '#FFFFFF' },
  amber: { background: '#A47318', foreground: '#FFFFFF' },
};

/** Editorial picks, in display order. */
const featuredEntries: BlogEntry[] = [
  {
    slug: 'anatomia-de-una-evaluacion-b2b-profunda',
    category: 'buying',
    publishedAt: '2026-09-02',
    readingMinutes: 12,
    tone: 'blue',
    content: {
      es: {
        title: 'Anatomía de una evaluación de software B2B: Más allá de las hojas de cálculo',
        excerpt:
          'El 70% de las implementaciones SaaS fallan no por defectos técnicos, sino por evaluaciones superficiales. Una guía respaldada por datos para comprar mejor.',
        takeaways: [
          'Las RFPs tradicionales no sirven para productos modernos.',
          'Evalúa integraciones a nivel API, no solo logotipos.',
          'Exige pruebas de concepto acotadas a 14 días.',
        ],
        sections: [
          {
            title: 'El problema del checklist de funcionalidades',
            contentHtml: `
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">La forma en que la mayoría de las empresas compra software está fundamentalmente rota. Depender de hojas de Excel con más de 200 filas de requisitos (RFPs) crea un espejismo de control que inevitablemente lleva a implementaciones fallidas.</p>
          <p>Según un estudio reciente de Gartner (2025), el <strong>73% de las empresas B2B</strong> admiten tener un nivel alto de "arrepentimiento del comprador" tras adquirir software empresarial. La razón principal no es la falta de funciones técnicas, sino la falta de adopción debido a interfaces hostiles y flujos de trabajo que no coinciden con la realidad de la operación.</p>
          <h3 class="mt-12 text-2xl font-semibold tracking-tight text-stone-900 mb-6">Por qué los proveedores aman las RFPs</h3>
          <p>Cuando envías una hoja de cálculo con preguntas binarias (¿Tienen exportación a PDF? ¿Tienen API?), la respuesta del equipo de ventas siempre será "Sí". Es su trabajo encontrar la manera de marcar esa casilla. Sin embargo, un "Sí" puede significar cosas muy distintas:</p>
          <ul class="list-disc pl-5 mt-4 space-y-2">
            <li><strong>Sí, nativo:</strong> Está construido en la plataforma y funciona con un clic.</li>
            <li><strong>Sí, vía workaround:</strong> Se puede hacer usando Zapier y tres pasos manuales.</li>
            <li><strong>Sí, en el roadmap:</strong> Prometen construirlo para el Q4 del próximo año (tal vez).</li>
          </ul>
        `,
          },
          {
            title: 'El Framework de Evaluación Orientado a Escenarios',
            contentHtml: `
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">Para evitar caer en la trampa del checklist, las empresas modernas de alto crecimiento han pivotado hacia evaluaciones basadas estrictamente en escenarios de uso (Use-Case Scenarios).</p>
          <p>En lugar de preguntar si el software "hace X", dale al proveedor un problema real y pídele que demuestre cómo se resuelve dentro de su producto usando tus propios datos anonimizados.</p>
          
          <div class="my-10 overflow-hidden rounded-2xl border border-stone-200">
            <table class="w-full text-left text-sm">
              <thead class="bg-stone-50">
                <tr>
                  <th class="px-6 py-4 font-semibold text-stone-900 border-b border-stone-200">Enfoque Tradicional (Malo)</th>
                  <th class="px-6 py-4 font-semibold text-stone-900 border-b border-stone-200">Enfoque de Escenarios (Excelente)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200 bg-white">
                <tr>
                  <td class="px-6 py-4 text-stone-600">"¿Tienen permisos granulares?"</td>
                  <td class="px-6 py-4 text-stone-900 font-medium">"Muestra cómo un analista puede ver la base total, pero solo exportar su región."</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-stone-600">"¿Se integra con Salesforce?"</td>
                  <td class="px-6 py-4 text-stone-900 font-medium">"Crea una oportunidad en sandbox; muestra en tiempo real cómo actualiza el estado."</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-stone-600">"¿Cómo es el soporte técnico?"</td>
                  <td class="px-6 py-4 text-stone-900 font-medium">"Abre un ticket de prueba en vivo durante la demo para medir tiempo de respuesta."</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <p>Este marco de trabajo fuerza al proveedor a alejarse de su guion de ventas estándar y mostrar la realidad del producto. Las carencias en experiencia de usuario (UX) o los procesos manuales ocultos se hacen evidentes inmediatamente.</p>
        `,
          },
          {
            title: 'El Costo Total de Propiedad (TCO) Invisible',
            contentHtml: `
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">El precio de lista de la licencia SaaS rara vez representa más del 40% del costo real durante el primer año. Ignorar los costos de periferia es el error financiero más común de los directores operativos.</p>
          <p>Un cálculo de TCO robusto debe cuantificar obligatoriamente las siguientes dimensiones de impacto:</p>
          
          <ol class="list-decimal pl-5 mt-6 space-y-4">
            <li><strong>Costo de Migración:</strong> El tiempo que el equipo técnico (o consultores externos) pasará mapeando la base de datos antigua a la nueva estructura.</li>
            <li><strong>Setup e Implementación:</strong> Horas-hombre requeridas para configurar reglas de negocio, aprobaciones y roles.</li>
            <li><strong>Dip de Productividad:</strong> La caída temporal de eficiencia productiva que sufrirá el equipo durante las primeras semanas.</li>
            <li><strong>Suscripciones Periféricas:</strong> ¿El nuevo software requiere herramientas adicionales (ej. licencias de Zapier, conectores ETL de Fivetran)?</li>
          </ol>
          
          <div class="mt-10 border-l-4 border-[#365DC4] bg-stone-50 p-6 rounded-r-2xl">
            <p class="text-lg italic text-stone-700">"El software más caro no es el que tiene la licencia anual más alta. Es aquel que compras, implementas durante 6 meses, y tu equipo se niega a utilizar."</p>
            <p class="mt-4 text-sm font-semibold text-stone-900">— shwcs Editorial Team</p>
          </div>
        `,
          },
        ],
      },
      en: {
        title: 'Anatomy of a B2B software evaluation: Beyond the spreadsheet',
        excerpt:
          '70% of SaaS implementations fail not because of technical defects, but because of shallow evaluations. A data-backed guide to buying better.',
        takeaways: [
          "Traditional RFPs don't work for modern products.",
          'Evaluate integrations at the API level, not just by their logos.',
          'Require proofs of concept capped at 14 days.',
        ],
        sections: [
          {
            title: 'The problem with the feature checklist',
            contentHtml: `
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">The way most companies buy software is fundamentally broken. Relying on Excel sheets with more than 200 rows of requirements (RFPs) creates an illusion of control that inevitably leads to failed implementations.</p>
          <p>According to a recent Gartner study (2025), <strong>73% of B2B companies</strong> admit to a high level of "buyer's remorse" after purchasing enterprise software. The main reason isn't a lack of technical features, but a lack of adoption caused by hostile interfaces and workflows that don't match how the operation actually runs.</p>
          <h3 class="mt-12 text-2xl font-semibold tracking-tight text-stone-900 mb-6">Why vendors love RFPs</h3>
          <p>When you send a spreadsheet of yes-or-no questions (Do you have PDF export? Do you have an API?), the sales team's answer will always be "Yes." It's their job to find a way to check that box. But a "Yes" can mean very different things:</p>
          <ul class="list-disc pl-5 mt-4 space-y-2">
            <li><strong>Yes, native:</strong> It's built into the platform and works with one click.</li>
            <li><strong>Yes, via workaround:</strong> It can be done using Zapier and three manual steps.</li>
            <li><strong>Yes, on the roadmap:</strong> They promise to build it by Q4 next year (maybe).</li>
          </ul>
        `,
          },
          {
            title: 'The Scenario-Driven Evaluation Framework',
            contentHtml: `
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">To avoid falling into the checklist trap, modern high-growth companies have pivoted to evaluations based strictly on use-case scenarios.</p>
          <p>Instead of asking whether the software "does X," give the vendor a real problem and ask them to show how it's solved inside their product using your own anonymized data.</p>

          <div class="my-10 overflow-hidden rounded-2xl border border-stone-200">
            <table class="w-full text-left text-sm">
              <thead class="bg-stone-50">
                <tr>
                  <th class="px-6 py-4 font-semibold text-stone-900 border-b border-stone-200">Traditional Approach (Bad)</th>
                  <th class="px-6 py-4 font-semibold text-stone-900 border-b border-stone-200">Scenario Approach (Excellent)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-200 bg-white">
                <tr>
                  <td class="px-6 py-4 text-stone-600">"Do you have granular permissions?"</td>
                  <td class="px-6 py-4 text-stone-900 font-medium">"Show how an analyst can see the entire database but only export their own region."</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-stone-600">"Does it integrate with Salesforce?"</td>
                  <td class="px-6 py-4 text-stone-900 font-medium">"Create an opportunity in a sandbox; show in real time how it updates the status."</td>
                </tr>
                <tr>
                  <td class="px-6 py-4 text-stone-600">"What is technical support like?"</td>
                  <td class="px-6 py-4 text-stone-900 font-medium">"Open a test ticket live during the demo to measure response time."</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>This framework forces the vendor to step away from their standard sales script and show the reality of the product. Gaps in user experience (UX) or hidden manual processes become obvious immediately.</p>
        `,
          },
          {
            title: 'The Invisible Total Cost of Ownership (TCO)',
            contentHtml: `
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">The list price of a SaaS license rarely accounts for more than 40% of the real cost during the first year. Ignoring peripheral costs is the most common financial mistake operations leaders make.</p>
          <p>A robust TCO calculation must quantify the following dimensions of impact:</p>

          <ol class="list-decimal pl-5 mt-6 space-y-4">
            <li><strong>Migration Cost:</strong> The time the technical team (or outside consultants) will spend mapping the old database to the new structure.</li>
            <li><strong>Setup and Implementation:</strong> Person-hours required to configure business rules, approvals and roles.</li>
            <li><strong>Productivity Dip:</strong> The temporary drop in efficiency the team will go through during the first few weeks.</li>
            <li><strong>Peripheral Subscriptions:</strong> Does the new software require additional tools (e.g., Zapier licenses, Fivetran ETL connectors)?</li>
          </ol>

          <div class="mt-10 border-l-4 border-[#365DC4] bg-stone-50 p-6 rounded-r-2xl">
            <p class="text-lg italic text-stone-700">"The most expensive software isn't the one with the highest annual license. It's the one you buy, spend 6 months implementing, and your team refuses to use."</p>
            <p class="mt-4 text-sm font-semibold text-stone-900">— shwcs Editorial Team</p>
          </div>
        `,
          },
        ],
      },
    },
  },
  {
    slug: 'evaluar-software-sin-perderse-en-la-demo',
    category: 'buying',
    publishedAt: '2026-09-01',
    readingMinutes: 6,
    tone: 'blue',
    content: {
      es: {
        title: 'Cómo evaluar software sin perderte en una demo',
        excerpt:
          'Una demo enseña posibilidades. Tu evaluación necesita comprobar si esas posibilidades resuelven tu operación real.',
        takeaways: [
          'Llega con un problema y un caso real.',
          'Pregunta por límites, dependencias y trabajo manual.',
          'Termina con una prueba concreta, responsable y fecha.',
        ],
        sections: [
          {
            title: 'Empieza por el problema',
            paragraphs: [
              'Antes de abrir una agenda, escribe qué proceso quieres cambiar, quién lo vive y qué resultado esperas. Una necesidad concreta permite distinguir una función útil de una demostración atractiva.',
              'Lleva a la llamada un ejemplo real: una factura, una aprobación o un reporte. Pide que el producto recorra ese caso completo.',
            ],
          },
          {
            title: 'Pregunta por los bordes',
            paragraphs: [
              'La mejor información suele aparecer cuando preguntas qué no hace el producto. Revisa permisos, exportación de datos, integraciones, soporte y el trabajo manual que seguirá existiendo.',
              'Anota qué viene incluido, qué requiere configuración y qué depende de otro proveedor. Así comparas alcance y no solo pantallas.',
            ],
          },
          {
            title: 'Cierra con un siguiente paso verificable',
            paragraphs: [
              'Define una prueba corta con responsables, datos y una fecha. Si todavía faltan respuestas, registra esas dudas antes de hablar de precio o contrato.',
            ],
          },
        ],
      },
      en: {
        title: 'How to evaluate software without getting lost in a demo',
        excerpt:
          'A demo shows possibilities. Your evaluation needs to check whether those possibilities solve your real operation.',
        takeaways: [
          'Arrive with a problem and a real case.',
          'Ask about limits, dependencies and manual work.',
          'End with a concrete test, an owner and a date.',
        ],
        sections: [
          {
            title: 'Start with the problem',
            paragraphs: [
              'Before booking a meeting, write down which process you want to change, who lives with it and what result you expect. A concrete need lets you tell a useful feature apart from an attractive demo.',
              'Bring a real example to the call: an invoice, an approval or a report. Ask them to walk that case through the product from start to finish.',
            ],
          },
          {
            title: 'Ask about the edges',
            paragraphs: [
              "The best information usually comes up when you ask what the product doesn't do. Review permissions, data export, integrations, support and the manual work that will still exist.",
              "Note what's included, what requires configuration and what depends on another vendor. That way you compare scope, not just screens.",
            ],
          },
          {
            title: 'Close with a verifiable next step',
            paragraphs: [
              'Define a short test with owners, data and a date. If answers are still missing, write those questions down before talking about price or contract.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'siete-preguntas-para-una-ficha-util',
    category: 'building',
    publishedAt: '2026-09-01',
    readingMinutes: 5,
    tone: 'green',
    content: {
      es: {
        title: 'Siete preguntas que hacen útil una ficha',
        excerpt:
          'Una ficha clara ayuda a la persona correcta a entender el proyecto, descartarlo o iniciar una conversación con contexto.',
        takeaways: [
          'Explica el problema antes que las funciones.',
          'Distingue evidencia, alcance y promesas.',
          'Permite evaluar lo básico sin pedir una llamada.',
        ],
        sections: [
          {
            title: 'Claridad antes que volumen',
            paragraphs: [
              'Explica qué problema resuelves, para quién, cómo cambia el proceso, cuánto cuesta, qué necesita para funcionar, qué límites tiene y cómo se puede comprobar.',
              'No necesitas convertir cada respuesta en una promesa. Una limitación bien explicada genera más confianza que una lista interminable de beneficios.',
            ],
          },
          {
            title: 'Haz que la evidencia se pueda revisar',
            paragraphs: [
              'Separa resultados, testimonios y afirmaciones. Añade la fuente, el periodo y el contexto suficiente para que alguien entienda qué ocurrió sin adivinar.',
            ],
          },
          {
            title: 'Escribe para la decisión',
            paragraphs: [
              'La ficha debe permitir tres acciones: seguir explorando, guardar para después o contactar. Si obliga a pedir una llamada para comprender lo básico, todavía le falta información.',
            ],
          },
        ],
      },
      en: {
        title: 'Seven questions that make a listing useful',
        excerpt:
          'A clear listing helps the right person understand the project, rule it out or start a conversation with context.',
        takeaways: [
          'Explain the problem before the features.',
          'Separate evidence, scope and promises.',
          'Let people evaluate the basics without asking for a call.',
        ],
        sections: [
          {
            title: 'Clarity over volume',
            paragraphs: [
              'Explain what problem you solve, for whom, how it changes the process, how much it costs, what it needs to work, what limits it has and how it can be verified.',
              "You don't need to turn every answer into a promise. A well-explained limitation builds more trust than an endless list of benefits.",
            ],
          },
          {
            title: 'Make the evidence reviewable',
            paragraphs: [
              'Separate results, testimonials and claims. Add the source, the time period and enough context for someone to understand what happened without guessing.',
            ],
          },
          {
            title: 'Write for the decision',
            paragraphs: [
              "A listing should allow three actions: keep exploring, save for later or get in touch. If it forces people to request a call just to understand the basics, it's still missing information.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'guardar-no-es-contactar',
    category: 'product',
    publishedAt: '2026-09-01',
    readingMinutes: 4,
    tone: 'lavender',
    content: {
      es: {
        title: 'Guardar no es contactar: diseñar intención sin ruido',
        excerpt:
          'Las señales de interés tienen distinto peso. Entenderlas evita perseguir curiosidad y ayuda a responder mejor.',
        takeaways: [
          'Like, guardado y contacto expresan intenciones distintas.',
          'La privacidad debe ser explícita en cada gesto.',
          'Mide progresión, no una cifra aislada.',
        ],
        sections: [
          {
            title: 'Cada gesto significa algo distinto',
            paragraphs: [
              'Un like puede expresar afinidad. Guardar suele indicar que una opción merece volver a verse. Un comentario añade contexto. Una solicitud de contacto ya pide una respuesta.',
              'Tratar todas esas acciones como un lead produce ruido para quien publica y presión para quien apenas explora.',
            ],
          },
          {
            title: 'La privacidad también es producto',
            paragraphs: [
              'Guardar debe poder ser privado. Publicar una lista debe ser una decisión explícita. Contactar debe mostrar exactamente qué datos se compartirán y con quién.',
            ],
          },
          {
            title: 'Mide la progresión',
            paragraphs: [
              'Las vistas sirven para entender alcance; los clics, guardados y solicitudes muestran avances distintos. Ninguna métrica aislada explica la calidad de una oportunidad.',
            ],
          },
        ],
      },
      en: {
        title: 'Saving is not contacting: designing for intent without noise',
        excerpt:
          'Signals of interest carry different weight. Understanding them keeps you from chasing curiosity and helps you respond better.',
        takeaways: [
          'A like, a save and a contact request express different intentions.',
          'Privacy must be explicit in every gesture.',
          'Measure progression, not an isolated number.',
        ],
        sections: [
          {
            title: 'Every gesture means something different',
            paragraphs: [
              'A like can express affinity. Saving usually signals that an option deserves another look. A comment adds context. A contact request is already asking for a reply.',
              'Treating all of these actions as a lead creates noise for whoever publishes and pressure for whoever is just exploring.',
            ],
          },
          {
            title: 'Privacy is product too',
            paragraphs: [
              'Saving should be able to stay private. Publishing a list should be an explicit decision. Contacting should show exactly what data will be shared and with whom.',
            ],
          },
          {
            title: 'Measure the progression',
            paragraphs: [
              'Views help you understand reach; clicks, saves and requests show different kinds of progress. No single metric explains the quality of an opportunity.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'que-necesita-un-cfo-antes-de-hablar',
    category: 'operations',
    publishedAt: '2026-09-01',
    readingMinutes: 6,
    tone: 'terracotta',
    content: {
      es: {
        title: 'Qué necesita un CFO antes de hablar con un proveedor',
        excerpt:
          'Precio es una parte de la decisión. Alcance, riesgo, tiempo y control explican si una solución realmente cabe en la empresa.',
        takeaways: [
          'Calcula licencia, implementación y tiempo interno.',
          'Aclara control, exportación y salida.',
          'Documenta supuestos para poder defender la decisión.',
        ],
        sections: [
          {
            title: 'El costo completo',
            paragraphs: [
              'Además de la licencia, incluye implementación, migración, capacitación, soporte, integraciones y el tiempo del equipo interno. Pregunta qué cambia cuando crecen usuarios, volumen o entidades.',
            ],
          },
          {
            title: 'El control operativo',
            paragraphs: [
              'Revisa quién puede aprobar, exportar y borrar información; qué historial queda; cómo se recuperan los datos; y qué ocurre si termina la relación comercial.',
            ],
          },
          {
            title: 'Una decisión que se pueda defender',
            paragraphs: [
              'Documenta alternativas, supuestos y responsables. Una compra bien explicada puede revisarse después sin depender de la memoria de una sola persona.',
            ],
          },
        ],
      },
      en: {
        title: 'What a CFO needs before talking to a vendor',
        excerpt:
          'Price is one part of the decision. Scope, risk, time and control explain whether a solution really fits the company.',
        takeaways: [
          'Account for licensing, implementation and internal time.',
          'Clarify control, data export and exit.',
          'Document assumptions so the decision can be defended.',
        ],
        sections: [
          {
            title: 'The full cost',
            paragraphs: [
              "Beyond the license, include implementation, migration, training, support, integrations and the internal team's time. Ask what changes as users, volume or entities grow.",
            ],
          },
          {
            title: 'Operational control',
            paragraphs: [
              'Check who can approve, export and delete information; what history is kept; how data is recovered; and what happens if the business relationship ends.',
            ],
          },
          {
            title: 'A decision you can defend',
            paragraphs: [
              "Document alternatives, assumptions and owners. A well-explained purchase can be reviewed later without relying on one person's memory.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'popularidad-y-relevancia',
    category: 'shwcs',
    publishedAt: '2026-09-01',
    readingMinutes: 4,
    tone: 'amber',
    content: {
      es: {
        title: 'Popularidad y relevancia no son lo mismo',
        excerpt:
          'Lo más visto puede iniciar una exploración. La mejor opción depende del problema, el contexto y las restricciones de cada empresa.',
        takeaways: [
          'Cada ranking responde una pregunta distinta.',
          'Explica siempre por qué aparece una opción.',
          'El objetivo final es encontrar encaje.',
        ],
        sections: [
          {
            title: 'Los rankings necesitan contexto',
            paragraphs: [
              'Una lista reciente, una lista guardada y una lista con conversación activa responden preguntas diferentes. Mezclarlas en una sola puntuación esconde más de lo que aclara.',
            ],
          },
          {
            title: 'Señales comprensibles',
            paragraphs: [
              'En shwcs queremos mostrar por qué aparece algo: fecha, categoría, actividad o selección editorial. La persona debe poder cambiar el criterio y reconocer sus límites.',
            ],
          },
          {
            title: 'El objetivo es encontrar encaje',
            paragraphs: [
              'Descubrir no termina en una posición. Termina cuando alguien comprende una opción, la compara con su realidad y puede tomar el siguiente paso con suficiente información.',
            ],
          },
        ],
      },
      en: {
        title: 'Popularity and relevance are not the same thing',
        excerpt:
          "What's most viewed can start an exploration. The best option depends on each company's problem, context and constraints.",
        takeaways: [
          'Each ranking answers a different question.',
          'Always explain why an option appears.',
          'The end goal is finding a fit.',
        ],
        sections: [
          {
            title: 'Rankings need context',
            paragraphs: [
              'A recent list, a saved list and a list with an active conversation answer different questions. Blending them into a single score hides more than it clarifies.',
            ],
          },
          {
            title: 'Understandable signals',
            paragraphs: [
              'At shwcs we want to show why something appears: date, category, activity or editorial selection. People should be able to change the criterion and recognize its limits.',
            ],
          },
          {
            title: 'The goal is finding a fit',
            paragraphs: [
              "Discovery doesn't end at a position. It ends when someone understands an option, compares it with their reality and can take the next step with enough information.",
            ],
          },
        ],
      },
    },
  },
];

const archiveEntries: BlogEntry[] = [
  {
    slug: 'migrar-datos-sin-frenar-la-operacion',
    category: 'operations',
    publishedAt: '2026-08-25',
    readingMinutes: 5,
    tone: 'blue',
    content: {
      es: {
        title: 'Migrar datos sin frenar la operación',
        excerpt:
          'El miedo a la migración retrasa compras necesarias. Una estrategia por fases reduce el riesgo y asegura la continuidad.',
        takeaways: [
          'Limpia antes de mover.',
          'Migra primero el histórico inactivo.',
          'Mantén ambos sistemas una semana.',
        ],
        sections: [
          {
            title: 'La oportunidad de limpiar',
            paragraphs: [
              'Migrar no es simplemente copiar y pegar bases de datos. Es, por el contrario, el mejor momento para depurar registros duplicados, reglas de negocio obsoletas y usuarios inactivos que encarecen el nuevo sistema.',
              'Antes de exportar la primera fila, el equipo debe definir qué datos realmente aportan valor hoy. Arrastrar procesos rotos a una herramienta nueva solo garantiza que la herramienta nueva también se rompa.',
            ],
          },
          {
            title: 'Migración por fases',
            paragraphs: [
              'El enfoque de "apagador" (apagar el viejo sistema el viernes y encender el nuevo el lunes) es una receta para el desastre operativo. La alternativa profesional es separar los datos en "fríos" y "calientes".',
              'Primero, migra los datos históricos que no cambian (datos fríos). Esto permite probar la estructura de la nueva plataforma sin presión. Una vez validados, se hace una migración delta rápida con los datos activos del último mes.',
            ],
          },
          {
            title: 'Sistemas en paralelo',
            paragraphs: [
              'Durante la primera semana de uso, mantén el sistema antiguo en modo de solo lectura. Si algo sale mal en la nueva plataforma, el equipo tiene una red de seguridad operativa para consultar cómo estaban las cosas.',
              'Esta tranquilidad mental reduce drásticamente la resistencia al cambio por parte del equipo de operaciones.',
            ],
          },
        ],
      },
      en: {
        title: 'Migrating data without stalling operations',
        excerpt:
          'Fear of migration delays necessary purchases. A phased strategy reduces risk and ensures continuity.',
        takeaways: [
          'Clean up before you move.',
          'Migrate inactive history first.',
          'Run both systems for a week.',
        ],
        sections: [
          {
            title: 'The chance to clean up',
            paragraphs: [
              "Migrating isn't simply copying and pasting databases. On the contrary, it's the best moment to clear out duplicate records, obsolete business rules and inactive users that make the new system more expensive.",
              'Before exporting the first row, the team should define which data actually adds value today. Dragging broken processes into a new tool only guarantees that the new tool breaks too.',
            ],
          },
          {
            title: 'Phased migration',
            paragraphs: [
              'The "light switch" approach (turning off the old system on Friday and switching on the new one on Monday) is a recipe for operational disaster. The professional alternative is to split the data into "cold" and "hot."',
              "First, migrate the historical data that doesn't change (cold data). This lets you test the new platform's structure without pressure. Once it's validated, run a quick delta migration with the last month's active data.",
            ],
          },
          {
            title: 'Systems in parallel',
            paragraphs: [
              'During the first week of use, keep the old system in read-only mode. If something goes wrong on the new platform, the team has an operational safety net to check how things were.',
              'That peace of mind drastically reduces resistance to change from the operations team.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'cuando-comprar-vs-construir',
    category: 'building',
    publishedAt: '2026-08-20',
    readingMinutes: 7,
    tone: 'green',
    content: {
      es: {
        title: 'Cuándo comprar y cuándo construir',
        excerpt:
          'Construir internamente da control absoluto, pero el costo de mantenimiento oculto suele superar cualquier licencia comercial.',
        takeaways: [
          'Si es tu ventaja competitiva, constrúyelo.',
          'Si es soporte operativo, cómpralo.',
          'El costo real es el mantenimiento.',
        ],
        sections: [
          {
            title: 'Foco en el diferenciador',
            paragraphs: [
              'Ningún cliente te va a pagar más porque tu equipo de ingeniería construyó su propio CRM interno. Dedica el talento técnico exclusivamente a lo que hace única a tu empresa frente a la competencia.',
              'Si el software que necesitas es de "soporte" (recursos humanos, facturación, atención a tickets), la decisión por defecto siempre debe ser comprar.',
            ],
          },
          {
            title: 'El espejismo del costo cero',
            paragraphs: [
              'Un argumento común es que desarrollar internamente ahorra el costo de licenciamiento anual. Este análisis suele ignorar por completo el TCO (Costo Total de Propiedad).',
              'Construir cuesta meses de sueldos de desarrolladores. Pero el verdadero costo viene después: actualizaciones de seguridad, servidores, deuda técnica y el hecho de que ese equipo no estará construyendo producto para los clientes.',
            ],
          },
          {
            title: 'Cuándo sí construir',
            paragraphs: [
              'Solo debes construir cuando el mercado no ofrece nada que soporte tu modelo de negocio core, o cuando la forma en que operas ese proceso es precisamente la razón por la que tus clientes te eligen.',
              'En ese escenario, el software interno se convierte en un activo de la empresa, no en un gasto de mantenimiento.',
            ],
          },
        ],
      },
      en: {
        title: 'When to buy and when to build',
        excerpt:
          'Building in-house gives you absolute control, but the hidden cost of maintenance usually exceeds any commercial license.',
        takeaways: [
          "If it's your competitive advantage, build it.",
          "If it's operational support, buy it.",
          'The real cost is maintenance.',
        ],
        sections: [
          {
            title: 'Focus on the differentiator',
            paragraphs: [
              'No customer will pay you more because your engineering team built its own in-house CRM. Dedicate your technical talent exclusively to what makes your company unique against the competition.',
              'If the software you need is "support" software (human resources, invoicing, ticket handling), the default decision should always be to buy.',
            ],
          },
          {
            title: 'The zero-cost illusion',
            paragraphs: [
              'A common argument is that developing in-house saves the annual licensing cost. This analysis usually ignores the TCO (Total Cost of Ownership) entirely.',
              "Building costs months of developer salaries. But the real cost comes later: security updates, servers, technical debt and the fact that this team won't be building product for customers.",
            ],
          },
          {
            title: 'When building does make sense',
            paragraphs: [
              'You should only build when the market offers nothing that supports your core business model, or when the way you run that process is precisely why your customers choose you.',
              'In that scenario, internal software becomes a company asset, not a maintenance expense.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'el-costo-oculto-del-software-gratuito',
    category: 'buying',
    publishedAt: '2026-08-15',
    readingMinutes: 4,
    tone: 'terracotta',
    content: {
      es: {
        title: 'El costo oculto del software gratuito',
        excerpt:
          'Las herramientas sin costo monetario inicial suelen pagarse con dispersión de datos y horas de trabajo manual.',
        takeaways: [
          'El trabajo manual cuesta más que una licencia.',
          'Los silos de datos rompen la escala.',
          'Evalúa el costo a 12 meses.',
        ],
        sections: [
          {
            title: 'El límite de lo gratis',
            paragraphs: [
              'Cuando el equipo pasa más de cinco horas a la semana copiando datos de una plataforma gratuita a otra para mantenerlas sincronizadas, la herramienta gratuita se ha vuelto la más cara de la empresa.',
              'El salario de un operador haciendo "data entry" manual siempre superará el costo de una licencia de $50 USD al mes que ofrezca integraciones nativas.',
            ],
          },
          {
            title: 'Silos de información',
            paragraphs: [
              'Las versiones gratuitas suelen limitar las exportaciones por API o los webhooks. Esto significa que tu información queda atrapada.',
              'A medida que la empresa crece, la imposibilidad de conectar esa herramienta gratuita con tu Data Warehouse o tu ERP crea un punto ciego que afecta las decisiones de negocio.',
            ],
          },
          {
            title: 'El riesgo de seguridad',
            paragraphs: [
              'El software gratuito rara vez incluye controles de acceso granulares (SSO, 2FA forzado, logs de auditoría).',
              'Si un empleado deja la empresa, revocar su acceso en 15 herramientas gratuitas inconexas es un proceso manual propenso a errores, dejando abierta la puerta a brechas de seguridad.',
            ],
          },
        ],
      },
      en: {
        title: 'The hidden cost of free software',
        excerpt:
          'Tools with no upfront monetary cost are usually paid for with scattered data and hours of manual work.',
        takeaways: [
          'Manual work costs more than a license.',
          'Data silos break scale.',
          'Evaluate the cost over 12 months.',
        ],
        sections: [
          {
            title: 'The limit of free',
            paragraphs: [
              'When the team spends more than five hours a week copying data from one free platform to another to keep them in sync, the free tool has become the most expensive one in the company.',
              'The salary of an operator doing manual "data entry" will always exceed the cost of a $50 USD-a-month license that offers native integrations.',
            ],
          },
          {
            title: 'Information silos',
            paragraphs: [
              'Free versions usually limit API exports or webhooks. That means your information stays trapped.',
              'As the company grows, being unable to connect that free tool to your Data Warehouse or your ERP creates a blind spot that affects business decisions.',
            ],
          },
          {
            title: 'The security risk',
            paragraphs: [
              'Free software rarely includes granular access controls (SSO, enforced 2FA, audit logs).',
              'If an employee leaves the company, revoking their access across 15 disconnected free tools is a manual, error-prone process that leaves the door open to security breaches.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'por-que-el-onboarding-rompe-compras',
    category: 'product',
    publishedAt: '2026-08-10',
    readingMinutes: 6,
    tone: 'lavender',
    content: {
      es: {
        title: 'Por qué el onboarding rompe la adopción',
        excerpt:
          'Una interfaz brillante no sobrevive a una implementación confusa. El primer mes define el éxito del contrato anual.',
        takeaways: [
          'El usuario final debe ver valor el día 1.',
          'Mide la adopción, no solo la conexión.',
          'El liderazgo debe dar el ejemplo.',
        ],
        sections: [
          {
            title: 'Adopción por diseño',
            paragraphs: [
              'Si la herramienta requiere un manual de 50 páginas y dos semanas de entrenamiento para hacer la tarea más básica, el problema no es la capacitación del equipo: es el diseño del producto.',
              'Las mejores herramientas corporativas de hoy guían al usuario hacia el "Aha! moment" en los primeros 10 minutos de uso.',
            ],
          },
          {
            title: 'Tiempo hasta el primer valor (TTV)',
            paragraphs: [
              'El reloj empieza a correr desde el momento en que se firma el contrato. Si el equipo pasa 3 meses configurando flujos antes de poder enviar el primer correo o factura, la moral se desploma.',
              'Busca proveedores que ofrezcan plantillas pre-construidas e integraciones "plug-and-play" para lograr victorias tempranas en la primera semana.',
            ],
          },
          {
            title: 'El rol del liderazgo',
            paragraphs: [
              'Comprar el software es solo el 10% del trabajo del directivo. El otro 90% es usarlo activamente.',
              'Si un gerente exige usar un nuevo CRM pero sigue pidiendo reportes en Excel por correo, el equipo abandonará el CRM inmediatamente. La adopción se lidera con el ejemplo.',
            ],
          },
        ],
      },
      en: {
        title: 'Why onboarding breaks adoption',
        excerpt:
          "A brilliant interface doesn't survive a confusing implementation. The first month defines the success of the annual contract.",
        takeaways: [
          'The end user must see value on day 1.',
          'Measure adoption, not just logins.',
          'Leadership must lead by example.',
        ],
        sections: [
          {
            title: 'Adoption by design',
            paragraphs: [
              "If the tool requires a 50-page manual and two weeks of training to do the most basic task, the problem isn't the team's training: it's the product's design.",
              'The best business tools today guide the user to the "Aha! moment" within the first 10 minutes of use.',
            ],
          },
          {
            title: 'Time to first value (TTV)',
            paragraphs: [
              'The clock starts ticking the moment the contract is signed. If the team spends 3 months configuring workflows before it can send the first email or invoice, morale collapses.',
              'Look for vendors that offer pre-built templates and "plug-and-play" integrations to secure early wins in the first week.',
            ],
          },
          {
            title: 'The role of leadership',
            paragraphs: [
              "Buying the software is only 10% of an executive's job. The other 90% is actively using it.",
              'If a manager mandates a new CRM but keeps asking for Excel reports by email, the team will abandon the CRM immediately. Adoption is led by example.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'como-presentar-software-al-equipo',
    category: 'operations',
    publishedAt: '2026-08-05',
    readingMinutes: 5,
    tone: 'amber',
    content: {
      es: {
        title: 'Cómo presentar software nuevo al equipo',
        excerpt:
          'Imponer una herramienta genera resistencia. Involucrar a los usuarios clave desde la prueba piloto asegura el éxito.',
        takeaways: [
          'Elige campeones internos.',
          'Comunica qué problema resuelve para ellos.',
          'Escucha la fricción inicial.',
        ],
        sections: [
          {
            title: 'Vender internamente',
            paragraphs: [
              'El equipo no se emociona por usar otra herramienta corporativa más. Lo que quieren es terminar su trabajo más rápido, con menos errores y menos frustración.',
              'No presentes la herramienta mostrando "todas las nuevas funcionalidades". Preséntala mostrando cómo elimina las dos tareas que más odian hacer en su día a día.',
            ],
          },
          {
            title: 'Campeones internos (Early Adopters)',
            paragraphs: [
              'Antes del despliegue general, invita a los 2 o 3 miembros del equipo más vocales (incluso los más escépticos) a probar la herramienta de forma anticipada.',
              'Si logras convencerlos a ellos y resolver sus dudas, ellos se encargarán de evangelizar al resto del equipo mucho mejor que cualquier directivo.',
            ],
          },
          {
            title: 'Canales de retroalimentación',
            paragraphs: [
              'Durante el primer mes, las quejas son información valiosa, no ataques personales. Crea un canal específico (un Slack channel, por ejemplo) para documentar fricciones.',
              'Resolver un pequeño cuello de botella en la semana 1 puede prevenir que todo el departamento abandone la plataforma en el mes 2.',
            ],
          },
        ],
      },
      en: {
        title: 'How to introduce new software to your team',
        excerpt:
          'Imposing a tool breeds resistance. Involving key users from the pilot onward ensures success.',
        takeaways: [
          'Choose internal champions.',
          'Communicate what problem it solves for them.',
          'Listen to the early friction.',
        ],
        sections: [
          {
            title: 'Selling it internally',
            paragraphs: [
              "The team doesn't get excited about using yet another corporate tool. What they want is to finish their work faster, with fewer errors and less frustration.",
              'Don\'t introduce the tool by showing "all the new features." Introduce it by showing how it eliminates the two tasks they hate doing most in their day-to-day.',
            ],
          },
          {
            title: 'Internal champions (Early Adopters)',
            paragraphs: [
              'Before the general rollout, invite the 2 or 3 most vocal team members (even the most skeptical ones) to try the tool early.',
              "If you manage to win them over and resolve their doubts, they'll evangelize to the rest of the team far better than any executive could.",
            ],
          },
          {
            title: 'Feedback channels',
            paragraphs: [
              'During the first month, complaints are valuable information, not personal attacks. Create a dedicated channel (a Slack channel, for example) to document friction.',
              'Fixing a small bottleneck in week 1 can keep the whole department from abandoning the platform in month 2.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'seguridad-como-requisito',
    category: 'building',
    publishedAt: '2026-07-28',
    readingMinutes: 6,
    tone: 'blue',
    content: {
      es: {
        title: 'Seguridad como requisito, no como lujo',
        excerpt:
          'Evaluar certificaciones y cifrado antes de firmar previene crisis. Lo que debes buscar en la arquitectura técnica.',
        takeaways: [
          'Pide reportes SOC2.',
          'Revisa el cifrado en reposo.',
          'Audita permisos de usuarios.',
        ],
        sections: [
          {
            title: 'Prevención estructural',
            paragraphs: [
              'Una brecha de datos cuesta infinitamente más que cualquier plan "Enterprise" de un proveedor de software. La arquitectura de seguridad ya no es negociable, sin importar el tamaño de tu startup.',
              'Pedir reportes SOC Type II o ISO 27001 debe ser el primer filtro, no un detalle de último minuto antes de firmar.',
            ],
          },
          {
            title: 'Cifrado y localización',
            paragraphs: [
              'Asegúrate de entender exactamente dónde viven tus datos físicamente (AWS, GCP, en qué región) y cómo están protegidos tanto en tránsito (TLS) como en reposo (AES-256).',
              'Si la herramienta no puede explicar claramente su política de retención de datos o cómo eliminan definitivamente tu información al cancelar, busca otra opción.',
            ],
          },
          {
            title: 'Permisos granulares',
            paragraphs: [
              'La seguridad interna es tan importante como la externa. Una plataforma corporativa debe permitir Roles y Permisos (RBAC) estrictos.',
              'No todos en la empresa necesitan ver la facturación de los clientes o tener el poder de borrar bases de datos. El principio de "menor privilegio" debe ser fácil de configurar.',
            ],
          },
        ],
      },
      en: {
        title: 'Security as a requirement, not a luxury',
        excerpt:
          'Evaluating certifications and encryption before signing prevents crises. What to look for in the technical architecture.',
        takeaways: [
          'Ask for SOC2 reports.',
          'Check encryption at rest.',
          'Audit user permissions.',
        ],
        sections: [
          {
            title: 'Structural prevention',
            paragraphs: [
              'A data breach costs infinitely more than any vendor\'s "Enterprise" plan. Security architecture is no longer negotiable, no matter the size of your startup.',
              'Asking for SOC Type II or ISO 27001 reports should be the first filter, not a last-minute detail before signing.',
            ],
          },
          {
            title: 'Encryption and data location',
            paragraphs: [
              "Make sure you understand exactly where your data physically lives (AWS, GCP, in which region) and how it's protected both in transit (TLS) and at rest (AES-256).",
              "If the tool can't clearly explain its data retention policy or how it permanently deletes your information when you cancel, look for another option.",
            ],
          },
          {
            title: 'Granular permissions',
            paragraphs: [
              'Internal security is as important as external security. A business platform must allow strict Roles and Permissions (RBAC).',
              'Not everyone in the company needs to see customer billing or have the power to delete databases. The principle of "least privilege" should be easy to configure.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'entender-el-pricing-por-asiento',
    category: 'buying',
    publishedAt: '2026-07-22',
    readingMinutes: 4,
    tone: 'green',
    content: {
      es: {
        title: 'Entender el pricing por asiento',
        excerpt:
          'El modelo por usuario penaliza la colaboración. Cómo calcular el costo real cuando todo el equipo necesita acceso.',
        takeaways: [
          'Calcula usuarios esporádicos.',
          'Negocia bloques de usuarios.',
          'Busca precios por métrica de valor.',
        ],
        sections: [
          {
            title: 'Penalizar el acceso',
            paragraphs: [
              'Cobrar por cada usuario adicional crea un incentivo perverso: las empresas empiezan a compartir contraseñas genéricas (como "admin@empresa.com") para ahorrar dinero.',
              'Esto destruye la trazabilidad (no sabes quién hizo qué) y rompe por completo las políticas de seguridad de la compañía.',
            ],
          },
          {
            title: 'Usuarios intensivos vs esporádicos',
            paragraphs: [
              'Un CFO que entra al sistema una vez al mes para descargar un reporte no debería costar lo mismo que el analista que pasa 8 horas al día en la plataforma.',
              'Busca proveedores que ofrezcan licencias de solo lectura gratuitas, o modelos de precio escalonados dependiendo del nivel de acceso que necesita el usuario.',
            ],
          },
          {
            title: 'La alternativa: pricing por valor',
            paragraphs: [
              'El mercado B2B se está moviendo hacia precios basados en el valor real entregado (número de transacciones procesadas, volumen de correos enviados, o gigabytes almacenados).',
              'Estos modelos alinean el costo del software directamente con el crecimiento y los ingresos de tu empresa, haciéndolos mucho más predecibles.',
            ],
          },
        ],
      },
      en: {
        title: 'Understanding per-seat pricing',
        excerpt:
          'The per-user model penalizes collaboration. How to calculate the real cost when the whole team needs access.',
        takeaways: [
          'Account for occasional users.',
          'Negotiate blocks of users.',
          'Look for pricing based on a value metric.',
        ],
        sections: [
          {
            title: 'Penalizing access',
            paragraphs: [
              'Charging for every additional user creates a perverse incentive: companies start sharing generic passwords (like "admin@company.com") to save money.',
              "This destroys traceability (you don't know who did what) and completely breaks the company's security policies.",
            ],
          },
          {
            title: 'Heavy vs. occasional users',
            paragraphs: [
              "A CFO who logs into the system once a month to download a report shouldn't cost the same as the analyst who spends 8 hours a day on the platform.",
              'Look for vendors that offer free read-only licenses, or tiered pricing models based on the level of access each user needs.',
            ],
          },
          {
            title: 'The alternative: value-based pricing',
            paragraphs: [
              'The B2B market is moving toward pricing based on the real value delivered (number of transactions processed, volume of emails sent, or gigabytes stored).',
              "These models tie the cost of the software directly to your company's growth and revenue, making them far more predictable.",
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'contratos-anuales-ciegos',
    category: 'buying',
    publishedAt: '2026-07-15',
    readingMinutes: 5,
    tone: 'terracotta',
    content: {
      es: {
        title: 'El fin de los contratos anuales ciegos',
        excerpt:
          'Firmar a 12 meses sin cláusulas de salida o periodos de gracia es un riesgo. Cómo proteger tu presupuesto.',
        takeaways: [
          'Pide un opt-out a 60 días.',
          'Ata el pago a la implementación.',
          'Evita renovaciones automáticas ciegas.',
        ],
        sections: [
          {
            title: 'Flexibilidad comercial',
            paragraphs: [
              'El riesgo de que el software no se adapte a tu operación debe ser compartido. Obligarte a pagar 12 meses por adelantado por una herramienta que el equipo dejó de usar al mes dos es inaceptable en el mercado actual.',
              'Un contrato moderno debe incluir salidas razonables si el proveedor no cumple con el nivel de servicio prometido.',
            ],
          },
          {
            title: 'Cláusulas de Opt-Out',
            paragraphs: [
              'Al negociar con ventas, exige una cláusula de "opt-out" a los 60 o 90 días. Si después de la implementación la herramienta no cumple con los criterios de éxito técnicos definidos, el contrato se cancela sin penalización.',
              'Los proveedores seguros de su producto aceptarán esta condición sin dudarlo.',
            ],
          },
          {
            title: 'La trampa de la renovación automática',
            paragraphs: [
              'Revisa las letras pequeñas. Muchos contratos anuales requieren un aviso de cancelación con 60 días de anticipación, o se renuevan automáticamente bloqueándote un año más.',
              'Asegúrate de que la renovación exija un consentimiento explícito, y pon alarmas en el calendario de la empresa 90 días antes del vencimiento.',
            ],
          },
        ],
      },
      en: {
        title: 'The end of blind annual contracts',
        excerpt:
          'Signing for 12 months without exit clauses or grace periods is a risk. How to protect your budget.',
        takeaways: [
          'Ask for a 60-day opt-out.',
          'Tie payment to implementation.',
          'Avoid blind automatic renewals.',
        ],
        sections: [
          {
            title: 'Commercial flexibility',
            paragraphs: [
              "The risk that the software won't fit your operation should be shared. Being forced to pay 12 months up front for a tool the team stopped using in month two is unacceptable in today's market.",
              'A modern contract should include reasonable exits if the vendor fails to deliver the promised level of service.',
            ],
          },
          {
            title: 'Opt-Out Clauses',
            paragraphs: [
              'When negotiating with sales, demand an "opt-out" clause at 60 or 90 days. If after implementation the tool doesn\'t meet the defined technical success criteria, the contract is canceled without penalty.',
              'Vendors who are confident in their product will accept this condition without hesitation.',
            ],
          },
          {
            title: 'The automatic renewal trap',
            paragraphs: [
              "Read the fine print. Many annual contracts require 60 days' notice to cancel, or they renew automatically and lock you in for another year.",
              'Make sure renewal requires explicit consent, and set reminders in the company calendar 90 days before expiration.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'interfaces-que-no-requieren-manual',
    category: 'product',
    publishedAt: '2026-07-10',
    readingMinutes: 4,
    tone: 'lavender',
    content: {
      es: {
        title: 'Interfaces que no requieren manual',
        excerpt:
          'El mejor B2B SaaS actual se siente como una app de consumidor. La usabilidad ya no es opcional en entornos corporativos.',
        takeaways: [
          'Consumerización del B2B.',
          'Menos clics para la tarea principal.',
          'El diseño influye en la retención.',
        ],
        sections: [
          {
            title: 'El estándar ha subido',
            paragraphs: [
              'Tus empleados usan aplicaciones perfectamente diseñadas como Spotify, Uber o Airbnb en su teléfono personal todos los días. Ya no tienen paciencia para interfaces corporativas grises, confusas y heredadas de los 90s.',
              'La "Consumerización del B2B" significa que el software empresarial ahora compite en usabilidad con las mejores apps de consumidor del mundo.',
            ],
          },
          {
            title: 'Reducir la carga cognitiva',
            paragraphs: [
              'Un buen diseño no se trata de colores bonitos, sino de reducir el número de clics y decisiones necesarias para completar la tarea principal.',
              'Si un usuario necesita navegar por 4 sub-menús diferentes solo para generar una factura, la interfaz está fallando a nivel estructural.',
            ],
          },
          {
            title: 'Velocidad y atajos',
            paragraphs: [
              'Para los usuarios avanzados (power users), la verdadera usabilidad radica en la velocidad. Soporte robusto para atajos de teclado, paletas de comandos (Cmd+K) y carga instantánea de páginas son los nuevos estándares oro de retención.',
            ],
          },
        ],
      },
      en: {
        title: "Interfaces that don't need a manual",
        excerpt:
          "Today's best B2B SaaS feels like a consumer app. Usability is no longer optional in corporate environments.",
        takeaways: [
          'The consumerization of B2B.',
          'Fewer clicks for the main task.',
          'Design influences retention.',
        ],
        sections: [
          {
            title: 'The bar has risen',
            paragraphs: [
              'Your employees use beautifully designed apps like Spotify, Uber or Airbnb on their personal phones every day. They no longer have patience for gray, confusing corporate interfaces inherited from the 90s.',
              'The "Consumerization of B2B" means business software now competes on usability with the best consumer apps in the world.',
            ],
          },
          {
            title: 'Reducing cognitive load',
            paragraphs: [
              "Good design isn't about pretty colors, but about reducing the number of clicks and decisions needed to complete the main task.",
              'If a user has to navigate through 4 different submenus just to generate an invoice, the interface is failing at a structural level.',
            ],
          },
          {
            title: 'Speed and shortcuts',
            paragraphs: [
              'For advanced users (power users), real usability lies in speed. Robust support for keyboard shortcuts, command palettes (Cmd+K) and instant page loads are the new gold standards for retention.',
            ],
          },
        ],
      },
    },
  },
  {
    slug: 'nuestra-vision-sobre-el-descubrimiento',
    category: 'shwcs',
    publishedAt: '2026-07-01',
    readingMinutes: 3,
    tone: 'amber',
    content: {
      es: {
        title: 'Nuestra visión sobre el descubrimiento',
        excerpt:
          'Construimos shwcs para que encontrar la herramienta correcta sea tan elegante como usarla. Lo que viene en el roadmap.',
        takeaways: [
          'Filtros por casos de uso.',
          'Reseñas verificadas de operadores.',
          'Comparativas técnicas directas.',
        ],
        sections: [
          {
            title: 'Transparencia total',
            paragraphs: [
              'El proceso tradicional de compra de software está roto. Está diseñado para esconder información detrás de formularios de contacto interminables y "llamadas de descubrimiento" diseñadas para calificar tu presupuesto antes de mostrarte el producto.',
              'Queremos limpiar este ruido. Creemos que la mejor forma de vender un gran producto es mostrándolo claramente.',
            ],
          },
          {
            title: 'Filtros operativos, no palabras de moda',
            paragraphs: [
              'Nuestros próximos lanzamientos se centrarán en permitirte buscar por necesidades operativas reales (ej. "Nómina que integre con SAP") en lugar de etiquetas genéricas o categorías pagadas.',
              'Devolverle el poder de decisión al operador que realmente va a usar la herramienta es la única forma de mejorar el ecosistema de software.',
            ],
          },
          {
            title: 'El ecosistema del futuro',
            paragraphs: [
              'Visualizamos a shwcs no solo como un directorio, sino como el espacio definitivo donde los creadores de herramientas y los operadores de negocios pueden tener una conversación honesta, técnica y directa.',
            ],
          },
        ],
      },
      en: {
        title: 'Our vision for discovery',
        excerpt:
          "We built shwcs so that finding the right tool is as elegant as using it. What's coming on the roadmap.",
        takeaways: [
          'Filters by use case.',
          'Verified reviews from operators.',
          'Direct technical comparisons.',
        ],
        sections: [
          {
            title: 'Full transparency',
            paragraphs: [
              'The traditional software buying process is broken. It\'s designed to hide information behind endless contact forms and "discovery calls" meant to qualify your budget before showing you the product.',
              'We want to clear out that noise. We believe the best way to sell a great product is to show it clearly.',
            ],
          },
          {
            title: 'Operational filters, not buzzwords',
            paragraphs: [
              'Our upcoming releases will focus on letting you search by real operational needs (e.g., "Payroll that integrates with SAP") instead of generic tags or paid categories.',
              'Giving decision-making power back to the operator who will actually use the tool is the only way to improve the software ecosystem.',
            ],
          },
          {
            title: 'The ecosystem of the future',
            paragraphs: [
              'We envision shwcs not just as a directory, but as the definitive space where tool builders and business operators can have an honest, technical and direct conversation.',
            ],
          },
        ],
      },
    },
  },
];

function blogLocale(locale: string): Locale {
  return isLocale(locale) ? locale : i18n.defaultLocale;
}

function resolvePost(entry: BlogEntry, locale: string): BlogPost {
  const { content, ...shared } = entry;
  const language = blogLocale(locale);
  return {
    ...shared,
    ...content[language],
    categoryLabel: blogCategoryLabels[language][entry.category],
  };
}

// Functions rather than module-level values: the client blog index imports
// blogTones/formatBlogDate from this file, and only pure literals at the top
// level let the bundler drop both languages' article bodies from that bundle.
function allEntries(): BlogEntry[] {
  return [...featuredEntries, ...archiveEntries];
}

/** Every slug, in both locales — the closed set the article route prerenders. */
export function getBlogSlugs(): string[] {
  return allEntries().map(({ slug }) => slug);
}

/** The six editorial picks: the home bento and the article footer's "keep reading" cycle. */
export function getFeaturedPosts(locale: string): BlogPost[] {
  return featuredEntries.map(entry => resolvePost(entry, locale));
}

/** Featured posts first, then the archive — the blog index order. */
export function getPostSummaries(locale: string): BlogPostSummary[] {
  return allEntries().map(entry => {
    const { slug, category, publishedAt, readingMinutes, tone, title, excerpt, categoryLabel } =
      resolvePost(entry, locale);
    return { slug, category, publishedAt, readingMinutes, tone, title, excerpt, categoryLabel };
  });
}

export function getBlogPost(slug: string, locale: string): BlogPost | undefined {
  const entry = allEntries().find(item => item.slug === slug);
  return entry && resolvePost(entry, locale);
}

export function formatBlogDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}
