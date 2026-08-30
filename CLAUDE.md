# CLAUDE.md — ShowcaseMX

Contexto maestro del proyecto. Leer antes de trabajar y contrastar con el código.
Las decisiones actuales del usuario sustituyen la dirección visual inicial.

## Qué es ShowcaseMX

Una plataforma de descubrimiento de tecnología B2B mexicana que ayuda a las
empresas a encontrar soluciones y conocer a quienes las construyen. El software
es lo que se descubre; ShowcaseMX aporta selección, contexto y conexión.

Recorrido objetivo: problema → solución relevante → conocer al creador → contacto.
Hoy existe un catálogo local mixto de soluciones reales y ejemplos, no un marketplace
operativo ni un buscador IA conectado.

## Decisiones de interfaz aprobadas

- Base clara `#f5f5f4`, tarjetas blancas y texto stone. No volver al modo oscuro
  que describían las primeras versiones de la documentación.
- No añadir texto pequeño encima del título del hero.
- Título en dos líneas: «Encuentra soluciones.» / «Conoce a sus creadores.»
- Explorador debajo del hero, sin título visible ni tarjeta gris exterior:
  categorías y tarjetas directamente sobre el fondo de la página.
- Siete categorías: Cobros, Finanzas, Nómina, Ventas, Operación, Legal y Agencias.
- Nueve tarjetas por categoría: 63 entradas, de las que 57 son ejemplos ficticios.
  Cord y Flouvia ocupan seis entradas entre categorías. No presentar los ejemplos
  como productos reales ni la inclusión como certificación independiente.
- Cinco familias de acentos: azul, salvia, lavanda, terracota y ámbar.
  Fuente única: `src/lib/brand-colors.ts`; navbar, footer y categorías comparten
  el mapa de colores. No introducir colores independientes para esos elementos.
- GSAP para transiciones breves y escalonadas. Mantener soporte de teclado,
  foco visible, limpieza de animaciones y movimiento reducido en el explorador.

## Documentos

| Documento | Contenido |
| --- | --- |
| [Producto](docs/product.md) | Posicionamiento, copy aprobado, recorrido y negocio |
| [Diseño](docs/design.md) | Layout actual, interacción y decisiones visuales |
| [Colores](docs/colors.md) | Cinco familias y reglas de uso |
| [Entradas reales](docs/listings.md) | Cord, Flouvia, fuentes y categorías |
| [Roadmap](docs/roadmap.md) | Implementado, pendientes y orden propuesto |
| [Stack](docs/stack.md) | Tecnologías, estructura, validación y despliegue |
| [Base de datos](docs/database.md) | Esquema real y ajustes pendientes |
| [Entorno](docs/env.md) | Variables necesarias por integración |

## Estado real

- Home: `LandingDiscovery` conecta `Hero` y `CategoryExplorer`; `FounderInvitation` añade postulación. Navbar y footer viven en el layout.
- Cambiar categorías, navegar con flechas/Home/End y abrir/cerrar fichas de
  ejemplo funciona localmente. El diálogo se cierra con Escape y devuelve foco.
- Búsqueda local por palabras e intenciones, sin IA: solo entradas reales, sin duplicados, con estado vacío. Los chips filtran categorías dentro de la home.
- Muchos enlaces de navbar y footer apuntan a rutas todavía inexistentes.
- Clerk y AI SDK están instalados, pero no integrados. No hay autenticación,
  endpoints de búsqueda ni dashboards. El formulario de postulación envía a `/api/applications`; requiere Neon y `db/solution-applications.sql`. Sin conexión responde 503, nunca éxito ficticio.
- Drizzle tiene cliente y esquema; la home no consulta Neon. No hay migraciones
  versionadas en `drizzle/` en esta revisión ni verificación de la base remota.
- `vercel.json` define Next.js, `npm run build` y salida `.next`. Esto corrige la
  configuración que buscaba `public`; un build local no confirma el despliegue.

## Comandos

```bash
npm run dev          # Servidor local
npm run lint         # ESLint
npm run typecheck    # TypeScript sin emitir archivos
npm run build        # Compilación de producción
npm run check        # Lint + tipos + build
npm run start        # Servir un build ya generado
npx drizzle-kit generate  # Generar migraciones, no aplicarlas
npx drizzle-kit studio    # Inspeccionar la base configurada
```

No ejecutar `next dev` y `next build` simultáneamente sobre la misma carpeta
`.next`: se observó corrupción de caché y errores de estilos/vendor chunks.
Para comprobar un build mientras el usuario usa dev, utilizar una copia aislada
con su propia salida. Evitar varios servidores dev sobre el mismo checkout.

Cambiar `schema.ts` no implica aplicar cambios remotos automáticamente. Revisar
la migración y el entorno destino; `drizzle-kit push` modifica la base configurada.

## Reglas de implementación

1. TypeScript estricto, sin `any`.
2. Server Components por defecto; aislar interactividad en componentes cliente.
3. Secretos únicamente en variables de entorno; nunca documentar valores reales.
4. Reutilizar el stack y los tokens existentes antes de sumar dependencias.
5. Preservar cambios del usuario y distinguir ejemplos de datos de producción.
6. Commits descriptivos: `feat`, `fix`, `chore`, `docs`, `refactor`.
7. No afirmar que auth, BD, CI o producción funcionan solo porque un paquete está
   instalado o una configuración existe. Documentar qué se comprobó.

## Estructura actual

```text
src/
  app/                  # layout.tsx, page.tsx, globals.css, fuentes y favicon
  components/
    hero.tsx
    category-explorer.tsx
    navbar.tsx
    footer.tsx
    ui/button.tsx
  lib/
    brand-colors.ts      # Paleta y colores por ruta
    catalog-preview.ts   # Catálogo local mixto y tipos
    utils.ts
  db/
    index.ts
    schema.ts
.github/workflows/check.yml
vercel.json
drizzle.config.ts
docs/
```

`drizzle/`, `/explorar`, `/p/[slug]`, `/aplicar` y dashboards son trabajo futuro,
no archivos o rutas que ya estén implementados.

## Postulaciones y búsqueda

Ver `docs/discovery.md` para alcance, pruebas y activación pendiente de recepción en Neon.

Actualización de botones: CTA y chips de búsqueda usan `actionButtonStyle` (azul suave #E4EBFC y texto #365DC4). Se conservan los cinco colores de categorías e iconos. El buscador no tiene recuadro de foco interior; el teclado señala el campo con subrayado discreto.
