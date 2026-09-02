
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
  sections: Array<{ title: string; paragraphs?: string[]; contentHtml?: string }>;
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
    slug: 'anatomia-de-una-evaluacion-b2b-profunda',
    title: 'Anatomía de una evaluación de software B2B: Más allá de las hojas de cálculo',
    excerpt: 'El 70% de las implementaciones SaaS fallan no por defectos técnicos, sino por evaluaciones superficiales. Una guía respaldada por datos para comprar mejor.',
    takeaways: ['Las RFPs tradicionales no sirven para productos modernos.', 'Evalúa integraciones a nivel API, no solo logotipos.', 'Exige pruebas de concepto acotadas a 14 días.'],
    category: 'Comprar mejor', publishedAt: '2026-09-02', readingMinutes: 12, tone: 'blue',
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
        `
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
        `
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
        `
      }
    ]
  },
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
  }
];

export const extraPosts: BlogPost[] = [
  {
    slug: 'migrar-datos-sin-frenar-la-operacion',
    title: 'Migrar datos sin frenar la operación',
    excerpt: 'El miedo a la migración retrasa compras necesarias. Una estrategia por fases reduce el riesgo y asegura la continuidad.',
    takeaways: ['Limpia antes de mover.', 'Migra primero el histórico inactivo.', 'Mantén ambos sistemas una semana.'],
    category: 'Operación', publishedAt: '2026-08-25', readingMinutes: 5, tone: 'blue',
    sections: [
      { 
        title: 'La oportunidad de limpiar', 
        paragraphs: [
          'Migrar no es simplemente copiar y pegar bases de datos. Es, por el contrario, el mejor momento para depurar registros duplicados, reglas de negocio obsoletas y usuarios inactivos que encarecen el nuevo sistema.', 
          'Antes de exportar la primera fila, el equipo debe definir qué datos realmente aportan valor hoy. Arrastrar procesos rotos a una herramienta nueva solo garantiza que la herramienta nueva también se rompa.'
        ] 
      },
      { 
        title: 'Migración por fases', 
        paragraphs: [
          'El enfoque de "apagador" (apagar el viejo sistema el viernes y encender el nuevo el lunes) es una receta para el desastre operativo. La alternativa profesional es separar los datos en "fríos" y "calientes".',
          'Primero, migra los datos históricos que no cambian (datos fríos). Esto permite probar la estructura de la nueva plataforma sin presión. Una vez validados, se hace una migración delta rápida con los datos activos del último mes.'
        ] 
      },
      { 
        title: 'Sistemas en paralelo', 
        paragraphs: [
          'Durante la primera semana de uso, mantén el sistema antiguo en modo de solo lectura. Si algo sale mal en la nueva plataforma, el equipo tiene una red de seguridad operativa para consultar cómo estaban las cosas.',
          'Esta tranquilidad mental reduce drásticamente la resistencia al cambio por parte del equipo de operaciones.'
        ] 
      }
    ]
  },
  {
    slug: 'cuando-comprar-vs-construir',
    title: 'Cuándo comprar y cuándo construir',
    excerpt: 'Construir internamente da control absoluto, pero el costo de mantenimiento oculto suele superar cualquier licencia comercial.',
    takeaways: ['Si es tu ventaja competitiva, constrúyelo.', 'Si es soporte operativo, cómpralo.', 'El costo real es el mantenimiento.'],
    category: 'Construir', publishedAt: '2026-08-20', readingMinutes: 7, tone: 'green',
    sections: [
      { 
        title: 'Foco en el diferenciador', 
        paragraphs: [
          'Ningún cliente te va a pagar más porque tu equipo de ingeniería construyó su propio CRM interno. Dedica el talento técnico exclusivamente a lo que hace única a tu empresa frente a la competencia.',
          'Si el software que necesitas es de "soporte" (recursos humanos, facturación, atención a tickets), la decisión por defecto siempre debe ser comprar.'
        ] 
      },
      { 
        title: 'El espejismo del costo cero', 
        paragraphs: [
          'Un argumento común es que desarrollar internamente ahorra el costo de licenciamiento anual. Este análisis suele ignorar por completo el TCO (Costo Total de Propiedad).',
          'Construir cuesta meses de sueldos de desarrolladores. Pero el verdadero costo viene después: actualizaciones de seguridad, servidores, deuda técnica y el hecho de que ese equipo no estará construyendo producto para los clientes.'
        ] 
      },
      { 
        title: 'Cuándo sí construir', 
        paragraphs: [
          'Solo debes construir cuando el mercado no ofrece nada que soporte tu modelo de negocio core, o cuando la forma en que operas ese proceso es precisamente la razón por la que tus clientes te eligen.',
          'En ese escenario, el software interno se convierte en un activo de la empresa, no en un gasto de mantenimiento.'
        ] 
      }
    ]
  },
  {
    slug: 'el-costo-oculto-del-software-gratuito',
    title: 'El costo oculto del software gratuito',
    excerpt: 'Las herramientas sin costo monetario inicial suelen pagarse con dispersión de datos y horas de trabajo manual.',
    takeaways: ['El trabajo manual cuesta más que una licencia.', 'Los silos de datos rompen la escala.', 'Evalúa el costo a 12 meses.'],
    category: 'Comprar mejor', publishedAt: '2026-08-15', readingMinutes: 4, tone: 'terracotta',
    sections: [
      { 
        title: 'El límite de lo gratis', 
        paragraphs: [
          'Cuando el equipo pasa más de cinco horas a la semana copiando datos de una plataforma gratuita a otra para mantenerlas sincronizadas, la herramienta gratuita se ha vuelto la más cara de la empresa.',
          'El salario de un operador haciendo "data entry" manual siempre superará el costo de una licencia de $50 USD al mes que ofrezca integraciones nativas.'
        ] 
      },
      { 
        title: 'Silos de información', 
        paragraphs: [
          'Las versiones gratuitas suelen limitar las exportaciones por API o los webhooks. Esto significa que tu información queda atrapada.',
          'A medida que la empresa crece, la imposibilidad de conectar esa herramienta gratuita con tu Data Warehouse o tu ERP crea un punto ciego que afecta las decisiones de negocio.'
        ] 
      },
      { 
        title: 'El riesgo de seguridad', 
        paragraphs: [
          'El software gratuito rara vez incluye controles de acceso granulares (SSO, 2FA forzado, logs de auditoría).',
          'Si un empleado deja la empresa, revocar su acceso en 15 herramientas gratuitas inconexas es un proceso manual propenso a errores, dejando abierta la puerta a brechas de seguridad.'
        ] 
      }
    ]
  },
  {
    slug: 'por-que-el-onboarding-rompe-compras',
    title: 'Por qué el onboarding rompe la adopción',
    excerpt: 'Una interfaz brillante no sobrevive a una implementación confusa. El primer mes define el éxito del contrato anual.',
    takeaways: ['El usuario final debe ver valor el día 1.', 'Mide la adopción, no solo la conexión.', 'El liderazgo debe dar el ejemplo.'],
    category: 'Producto', publishedAt: '2026-08-10', readingMinutes: 6, tone: 'lavender',
    sections: [
      { 
        title: 'Adopción por diseño', 
        paragraphs: [
          'Si la herramienta requiere un manual de 50 páginas y dos semanas de entrenamiento para hacer la tarea más básica, el problema no es la capacitación del equipo: es el diseño del producto.',
          'Las mejores herramientas corporativas de hoy guían al usuario hacia el "Aha! moment" en los primeros 10 minutos de uso.'
        ] 
      },
      { 
        title: 'Tiempo hasta el primer valor (TTV)', 
        paragraphs: [
          'El reloj empieza a correr desde el momento en que se firma el contrato. Si el equipo pasa 3 meses configurando flujos antes de poder enviar el primer correo o factura, la moral se desploma.',
          'Busca proveedores que ofrezcan plantillas pre-construidas e integraciones "plug-and-play" para lograr victorias tempranas en la primera semana.'
        ] 
      },
      { 
        title: 'El rol del liderazgo', 
        paragraphs: [
          'Comprar el software es solo el 10% del trabajo del directivo. El otro 90% es usarlo activamente.',
          'Si un gerente exige usar un nuevo CRM pero sigue pidiendo reportes en Excel por correo, el equipo abandonará el CRM inmediatamente. La adopción se lidera con el ejemplo.'
        ] 
      }
    ]
  },
  {
    slug: 'como-presentar-software-al-equipo',
    title: 'Cómo presentar software nuevo al equipo',
    excerpt: 'Imponer una herramienta genera resistencia. Involucrar a los usuarios clave desde la prueba piloto asegura el éxito.',
    takeaways: ['Elige campeones internos.', 'Comunica qué problema resuelve para ellos.', 'Escucha la fricción inicial.'],
    category: 'Operación', publishedAt: '2026-08-05', readingMinutes: 5, tone: 'amber',
    sections: [
      { 
        title: 'Vender internamente', 
        paragraphs: [
          'El equipo no se emociona por usar otra herramienta corporativa más. Lo que quieren es terminar su trabajo más rápido, con menos errores y menos frustración.',
          'No presentes la herramienta mostrando "todas las nuevas funcionalidades". Preséntala mostrando cómo elimina las dos tareas que más odian hacer en su día a día.'
        ] 
      },
      { 
        title: 'Campeones internos (Early Adopters)', 
        paragraphs: [
          'Antes del despliegue general, invita a los 2 o 3 miembros del equipo más vocales (incluso los más escépticos) a probar la herramienta de forma anticipada.',
          'Si logras convencerlos a ellos y resolver sus dudas, ellos se encargarán de evangelizar al resto del equipo mucho mejor que cualquier directivo.'
        ] 
      },
      { 
        title: 'Canales de retroalimentación', 
        paragraphs: [
          'Durante el primer mes, las quejas son información valiosa, no ataques personales. Crea un canal específico (un Slack channel, por ejemplo) para documentar fricciones.',
          'Resolver un pequeño cuello de botella en la semana 1 puede prevenir que todo el departamento abandone la plataforma en el mes 2.'
        ] 
      }
    ]
  },
  {
    slug: 'seguridad-como-requisito',
    title: 'Seguridad como requisito, no como lujo',
    excerpt: 'Evaluar certificaciones y cifrado antes de firmar previene crisis. Lo que debes buscar en la arquitectura técnica.',
    takeaways: ['Pide reportes SOC2.', 'Revisa el cifrado en reposo.', 'Audita permisos de usuarios.'],
    category: 'Construir', publishedAt: '2026-07-28', readingMinutes: 6, tone: 'blue',
    sections: [
      { 
        title: 'Prevención estructural', 
        paragraphs: [
          'Una brecha de datos cuesta infinitamente más que cualquier plan "Enterprise" de un proveedor de software. La arquitectura de seguridad ya no es negociable, sin importar el tamaño de tu startup.',
          'Pedir reportes SOC Type II o ISO 27001 debe ser el primer filtro, no un detalle de último minuto antes de firmar.'
        ] 
      },
      { 
        title: 'Cifrado y localización', 
        paragraphs: [
          'Asegúrate de entender exactamente dónde viven tus datos físicamente (AWS, GCP, en qué región) y cómo están protegidos tanto en tránsito (TLS) como en reposo (AES-256).',
          'Si la herramienta no puede explicar claramente su política de retención de datos o cómo eliminan definitivamente tu información al cancelar, busca otra opción.'
        ] 
      },
      { 
        title: 'Permisos granulares', 
        paragraphs: [
          'La seguridad interna es tan importante como la externa. Una plataforma corporativa debe permitir Roles y Permisos (RBAC) estrictos.',
          'No todos en la empresa necesitan ver la facturación de los clientes o tener el poder de borrar bases de datos. El principio de "menor privilegio" debe ser fácil de configurar.'
        ] 
      }
    ]
  },
  {
    slug: 'entender-el-pricing-por-asiento',
    title: 'Entender el pricing por asiento',
    excerpt: 'El modelo por usuario penaliza la colaboración. Cómo calcular el costo real cuando todo el equipo necesita acceso.',
    takeaways: ['Calcula usuarios esporádicos.', 'Negocia bloques de usuarios.', 'Busca precios por métrica de valor.'],
    category: 'Comprar mejor', publishedAt: '2026-07-22', readingMinutes: 4, tone: 'green',
    sections: [
      { 
        title: 'Penalizar el acceso', 
        paragraphs: [
          'Cobrar por cada usuario adicional crea un incentivo perverso: las empresas empiezan a compartir contraseñas genéricas (como "admin@empresa.com") para ahorrar dinero.',
          'Esto destruye la trazabilidad (no sabes quién hizo qué) y rompe por completo las políticas de seguridad de la compañía.'
        ] 
      },
      { 
        title: 'Usuarios intensivos vs esporádicos', 
        paragraphs: [
          'Un CFO que entra al sistema una vez al mes para descargar un reporte no debería costar lo mismo que el analista que pasa 8 horas al día en la plataforma.',
          'Busca proveedores que ofrezcan licencias de solo lectura gratuitas, o modelos de precio escalonados dependiendo del nivel de acceso que necesita el usuario.'
        ] 
      },
      { 
        title: 'La alternativa: pricing por valor', 
        paragraphs: [
          'El mercado B2B se está moviendo hacia precios basados en el valor real entregado (número de transacciones procesadas, volumen de correos enviados, o gigabytes almacenados).',
          'Estos modelos alinean el costo del software directamente con el crecimiento y los ingresos de tu empresa, haciéndolos mucho más predecibles.'
        ] 
      }
    ]
  },
  {
    slug: 'contratos-anuales-ciegos',
    title: 'El fin de los contratos anuales ciegos',
    excerpt: 'Firmar a 12 meses sin cláusulas de salida o periodos de gracia es un riesgo. Cómo proteger tu presupuesto.',
    takeaways: ['Pide un opt-out a 60 días.', 'Ata el pago a la implementación.', 'Evita renovaciones automáticas ciegas.'],
    category: 'Comprar mejor', publishedAt: '2026-07-15', readingMinutes: 5, tone: 'terracotta',
    sections: [
      { 
        title: 'Flexibilidad comercial', 
        paragraphs: [
          'El riesgo de que el software no se adapte a tu operación debe ser compartido. Obligarte a pagar 12 meses por adelantado por una herramienta que el equipo dejó de usar al mes dos es inaceptable en el mercado actual.',
          'Un contrato moderno debe incluir salidas razonables si el proveedor no cumple con el nivel de servicio prometido.'
        ] 
      },
      { 
        title: 'Cláusulas de Opt-Out', 
        paragraphs: [
          'Al negociar con ventas, exige una cláusula de "opt-out" a los 60 o 90 días. Si después de la implementación la herramienta no cumple con los criterios de éxito técnicos definidos, el contrato se cancela sin penalización.',
          'Los proveedores seguros de su producto aceptarán esta condición sin dudarlo.'
        ] 
      },
      { 
        title: 'La trampa de la renovación automática', 
        paragraphs: [
          'Revisa las letras pequeñas. Muchos contratos anuales requieren un aviso de cancelación con 60 días de anticipación, o se renuevan automáticamente bloqueándote un año más.',
          'Asegúrate de que la renovación exija un consentimiento explícito, y pon alarmas en el calendario de la empresa 90 días antes del vencimiento.'
        ] 
      }
    ]
  },
  {
    slug: 'interfaces-que-no-requieren-manual',
    title: 'Interfaces que no requieren manual',
    excerpt: 'El mejor B2B SaaS actual se siente como una app de consumidor. La usabilidad ya no es opcional en entornos corporativos.',
    takeaways: ['Consumerización del B2B.', 'Menos clics para la tarea principal.', 'El diseño influye en la retención.'],
    category: 'Producto', publishedAt: '2026-07-10', readingMinutes: 4, tone: 'lavender',
    sections: [
      { 
        title: 'El estándar ha subido', 
        paragraphs: [
          'Tus empleados usan aplicaciones perfectamente diseñadas como Spotify, Uber o Airbnb en su teléfono personal todos los días. Ya no tienen paciencia para interfaces corporativas grises, confusas y heredadas de los 90s.',
          'La "Consumerización del B2B" significa que el software empresarial ahora compite en usabilidad con las mejores apps de consumidor del mundo.'
        ] 
      },
      { 
        title: 'Reducir la carga cognitiva', 
        paragraphs: [
          'Un buen diseño no se trata de colores bonitos, sino de reducir el número de clics y decisiones necesarias para completar la tarea principal.',
          'Si un usuario necesita navegar por 4 sub-menús diferentes solo para generar una factura, la interfaz está fallando a nivel estructural.'
        ] 
      },
      { 
        title: 'Velocidad y atajos', 
        paragraphs: [
          'Para los usuarios avanzados (power users), la verdadera usabilidad radica en la velocidad. Soporte robusto para atajos de teclado, paletas de comandos (Cmd+K) y carga instantánea de páginas son los nuevos estándares oro de retención.'
        ] 
      }
    ]
  },
  {
    slug: 'nuestra-vision-sobre-el-descubrimiento',
    title: 'Nuestra visión sobre el descubrimiento',
    excerpt: 'Construimos shwcs para que encontrar la herramienta correcta sea tan elegante como usarla. Lo que viene en el roadmap.',
    takeaways: ['Filtros por casos de uso.', 'Reseñas verificadas de operadores.', 'Comparativas técnicas directas.'],
    category: 'shwcs', publishedAt: '2026-07-01', readingMinutes: 3, tone: 'amber',
    sections: [
      { 
        title: 'Transparencia total', 
        paragraphs: [
          'El proceso tradicional de compra de software está roto. Está diseñado para esconder información detrás de formularios de contacto interminables y "llamadas de descubrimiento" diseñadas para calificar tu presupuesto antes de mostrarte el producto.',
          'Queremos limpiar este ruido. Creemos que la mejor forma de vender un gran producto es mostrándolo claramente.'
        ] 
      },
      { 
        title: 'Filtros operativos, no palabras de moda', 
        paragraphs: [
          'Nuestros próximos lanzamientos se centrarán en permitirte buscar por necesidades operativas reales (ej. "Nómina que integre con SAP en México") en lugar de etiquetas genéricas o categorías pagadas.',
          'Devolverle el poder de decisión al operador que realmente va a usar la herramienta es la única forma de mejorar el ecosistema de software.'
        ] 
      },
      { 
        title: 'El ecosistema del futuro', 
        paragraphs: [
          'Visualizamos a shwcs no solo como un directorio, sino como el espacio definitivo donde los creadores de herramientas y los operadores de negocios pueden tener una conversación honesta, técnica y directa.'
        ] 
      }
    ]
  }
];

export function getBlogPost(slug: string) {
  const allPosts = [...blogPosts, ...extraPosts];
  return allPosts.find((post) => post.slug === slug);
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
