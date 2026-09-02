const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../CLAUDE.md');

let code = fs.readFileSync(file, 'utf8');

const newRule = `## 40. Paginación de colecciones (Blog) — 1 septiembre 2026

Toda paginación (como la implementada en \`/blog\`) debe cumplir con los siguientes lineamientos de UI y UX:
- **Estética:** Todos los controles interactivos de paginación (botones "Anterior"/"Siguiente" y el número de página activo) deben utilizar el estilo primario de la marca a través de \`style={actionButtonStyle}\` (importado de \`@/lib/brand-colors\`) y la clase \`action-button\`. Esto garantiza el fondo azul pastel (\`#E4EBFC\`) con texto azul profundo (\`#365DC4\`) consistente con el botón de "Suscribirse" en la barra de navegación.
- **Formato:** Los botones de navegación deben ser píldoras (\`rounded-full\`) con íconos \`ArrowLeft\` / \`ArrowRight\`. Los números inactivos son círculos de solo texto que cambian de fondo en hover (\`hover:bg-stone-100\`).
- **UX (Auto-Scroll):** Al hacer clic en cualquier control de página, el cliente debe hacer scroll suave (\`scrollIntoView({ behavior: 'smooth', block: 'start' })\`) hacia el ancla superior de la lista de elementos (\`#blog-posts-top\` con \`scroll-mt-24\` o similar) para que el usuario no se quede atrapado en el footer de la página anterior.
- **Manejo de estados:** Se utilizan puntos suspensivos (\`...\`) inactivos cuando la cantidad de páginas supera 5, colapsando lógicamente los elementos para no quebrar el layout horizontal.
`;

code = code.replace(/## 40\. Paginación de colecciones.*?(?=\n##|\n$)/s, newRule.trim());

fs.writeFileSync(file, code);
