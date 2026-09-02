const fs = require('fs');
const path = require('path');
const blogPath = path.join(__dirname, '../src/lib/blog.ts');

const content = fs.readFileSync(blogPath, 'utf8');

const newPost = `{
    slug: 'anatomia-de-una-evaluacion-b2b-profunda',
    title: 'Anatomía de una evaluación de software B2B: Más allá de las hojas de cálculo',
    excerpt: 'El 70% de las implementaciones SaaS fallan no por defectos técnicos, sino por evaluaciones superficiales. Una guía respaldada por datos para comprar mejor.',
    takeaways: ['Las RFPs tradicionales no sirven para productos modernos.', 'Evalúa integraciones a nivel API, no solo logotipos.', 'Exige pruebas de concepto acotadas a 14 días.'],
    category: 'Comprar mejor', publishedAt: '2026-09-02', readingMinutes: 12, tone: 'blue',
    sections: [
      {
        title: 'El problema del checklist de funcionalidades',
        contentHtml: \`
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">La forma en que la mayoría de las empresas compra software está fundamentalmente rota. Depender de hojas de Excel con más de 200 filas de requisitos (RFPs) crea un espejismo de control que inevitablemente lleva a implementaciones fallidas.</p>
          <p>Según un estudio reciente de Gartner (2025), el <strong>73% de las empresas B2B</strong> admiten tener un nivel alto de "arrepentimiento del comprador" tras adquirir software empresarial. La razón principal no es la falta de funciones técnicas, sino la falta de adopción debido a interfaces hostiles y flujos de trabajo que no coinciden con la realidad de la operación.</p>
          <h3>Por qué los proveedores aman las RFPs</h3>
          <p>Cuando envías una hoja de cálculo con preguntas binarias (¿Tienen exportación a PDF? ¿Tienen API?), la respuesta del equipo de ventas siempre será "Sí". Es su trabajo encontrar la manera de marcar esa casilla. Sin embargo, un "Sí" puede significar cosas muy distintas:</p>
          <ul>
            <li><strong>Sí, nativo:</strong> Está construido en la plataforma y funciona con un clic.</li>
            <li><strong>Sí, vía workaround:</strong> Se puede hacer usando Zapier y tres pasos manuales.</li>
            <li><strong>Sí, en el roadmap:</strong> Prometen construirlo para el Q4 del próximo año (tal vez).</li>
          </ul>
        \`
      },
      {
        title: 'El Framework de Evaluación Orientado a Escenarios',
        contentHtml: \`
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">Para evitar caer en la trampa del checklist, las empresas modernas de alto crecimiento han pivotado hacia evaluaciones basadas estrictamente en escenarios de uso (Use-Case Scenarios).</p>
          <p>En lugar de preguntar si el software "hace X", dale al proveedor un problema real y pídele que demuestre cómo se resuelve dentro de su producto usando tus propios datos anonimizados.</p>
          <table class="w-full text-left my-8">
            <thead>
              <tr>
                <th>Enfoque Tradicional (Malo)</th>
                <th>Enfoque de Escenarios (Excelente)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>"¿Tienen permisos granulares?"</td>
                <td>"Muestra cómo un analista nivel 2 puede ver la base total de clientes, pero solo puede exportar los datos de su región."</td>
              </tr>
              <tr>
                <td>"¿Se integra con Salesforce?"</td>
                <td>"Crea una oportunidad en nuestro entorno sandbox de Salesforce; muestra en tiempo real cómo tu plataforma actualiza el estado."</td>
              </tr>
              <tr>
                <td>"¿Cómo es el soporte técnico?"</td>
                <td>"Abre un ticket de prueba en vivo durante la demo para medir el tiempo y calidad de respuesta del nivel 1."</td>
              </tr>
            </tbody>
          </table>
          <p>Este marco de trabajo fuerza al proveedor a alejarse de su guion de ventas estándar y mostrar la realidad del producto. Las carencias en experiencia de usuario (UX) o los procesos manuales ocultos se hacen evidentes inmediatamente.</p>
        \`
      },
      {
        title: 'El Costo Total de Propiedad (TCO) Invisible',
        contentHtml: \`
          <p class="lead text-xl leading-[1.55] text-stone-700 sm:text-2xl mb-8">El precio de lista de la licencia SaaS rara vez representa más del 40% del costo real durante el primer año. Ignorar los costos de periferia es el error financiero más común de los directores operativos (COOs).</p>
          <p>Un cálculo de TCO robusto debe cuantificar obligatoriamente las siguientes dimensiones de impacto:</p>
          <ol>
            <li><strong>Costo de Migración y Limpieza de Datos:</strong> El tiempo que el equipo técnico (o consultores externos) pasará mapeando la base de datos antigua a la nueva estructura.</li>
            <li><strong>Costo de Implementación (Setup):</strong> Horas-hombre requeridas para configurar reglas de negocio, aprobaciones y roles.</li>
            <li><strong>Pérdida de Productividad (Dip de Adopción):</strong> La caída temporal de eficiencia productiva que sufrirá el equipo durante las primeras 3 a 6 semanas mientras aprenden el nuevo sistema.</li>
            <li><strong>Suscripciones Periféricas:</strong> ¿El nuevo software requiere pagar herramientas adicionales (ej. licencias de Zapier, conectores ETL de Fivetran, almacenamiento extra en AWS) para funcionar como te prometieron en la demo?</li>
          </ol>
          <blockquote>
            <p>"El software más caro no es el que tiene la licencia anual más alta. Es aquel que compras, implementas durante 6 meses, y tu equipo se niega a utilizar." — <em>shwcs Editorial Team</em></p>
          </blockquote>
        \`
      }
    ]
  }`;

// Replace the first item in blogPosts with this new post
const regex = /export const blogPosts: BlogPost\[\] = \[\s*\{[\s\S]*?\},/;
const replacement = 'export const blogPosts: BlogPost[] = [\n  ' + newPost + ',';

if (regex.test(content)) {
    const newContent = content.replace(regex, replacement);
    fs.writeFileSync(blogPath, newContent);
    console.log('Successfully injected deeply researched post.');
} else {
    console.log('Regex did not match.');
}
