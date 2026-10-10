# shwcs

**Encuentra soluciones. Conoce a sus creadores.**

shwcs conecta empresas con software, agencias y servicios B2B. Un comprador descubre
proyectos en el catálogo, los guarda y compara en listas privadas y solicita contacto
con consentimiento explícito; un fundador postula su proyecto, lo publica tras
revisión editorial y responde a las solicitudes desde su cuenta. Una misma cuenta
puede comprar y publicar.

Producción: [shwcs.site](https://shwcs.site). Backoffice editorial: `ops.shwcs.site`
(app aparte en [`ops/`](ops)).

## Stack

| Capa        | Elección                                                                  |
| ----------- | ------------------------------------------------------------------------- |
| Aplicación  | Next.js 15 (App Router, Server Components), React 19, TypeScript estricto |
| Interfaz    | Tailwind CSS 3, GSAP, lucide-react                                        |
| Datos       | Neon Postgres por HTTP (`@neondatabase/serverless`), SQL parametrizado    |
| Archivos    | Vercel Blob privado; Sharp normaliza toda imagen a WebP                   |
| Autenticación | Propia: scrypt, sesiones opacas, TOTP opcional, Google OAuth (PKCE)     |
| Correo      | API de Resend con outbox transaccional y worker programado                |
| Pagos       | Stripe Checkout alojado para espacios patrocinados, con Stripe Tax        |
| Facturas    | CFDI 4.0 y notas de crédito emitidos con la API de Cord                   |
| Idiomas     | Español (fuente) e inglés, diccionarios tipados por sección               |

No hay ORM: el esquema vive en [`db/*.sql`](db).

## Estructura

```
src/
  app/[locale]/       páginas por idioma: (marketing), (focused), (contact), account
  app/api/            route handlers: autorización, validación y límites en servidor
  components/         UI por dominio (catalog, solutions, library, contacts, settings…)
  lib/                lógica de dominio sin React (auth, solutions, library, search…)
  i18n/               configuración de idiomas, tipo Dictionary y diccionarios
  middleware.ts       prefijo de idioma en cada ruta
db/                   migraciones SQL aditivas e idempotentes
scripts/              tareas operativas (migraciones, alta de revisores, backfills)
tests/                pruebas unitarias (node:test) e integraciones opt-in
ops/                  backoffice independiente (revisión, moderación, cuentas)
docs/                 contratos de producto, seguridad y operación
```

## Desarrollo

Requiere Node 22+.

```bash
npm ci
npm run setup:secrets   # genera secretos locales que falten en .env.local
npm run dev             # http://localhost:3000
```

Las variables están descritas en [`docs/env.md`](docs/env.md) y
[`.env.example`](.env.example). Cuenta, publicaciones, biblioteca y contactos
necesitan una base Neon con el esquema aplicado. Nunca apuntes un entorno local a
la base de producción: `.env.production.local`, si existe, tiene prioridad sobre
`.env.local` en `next build` y `next start`.

### Scripts

| Comando                | Qué hace                                                    |
| ---------------------- | ----------------------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                                      |
| `npm run check`        | Formato, lint, tipos, pruebas y build: lo mismo que CI       |
| `npm run format`       | Prettier sobre todo el repositorio                          |
| `npm run lint`         | ESLint con cero advertencias permitidas                     |
| `npm run typecheck`    | TypeScript sin emitir                                       |
| `npm test`             | Pruebas unitarias                                           |
| `npm run db:migrate -- db/<archivo>.sql` | Aplica migraciones, una transacción por archivo |
| `npm run ads:rates`    | Muestra o cambia tarifas y ubicaciones de anuncios            |
| `npm run preflight`    | Revisa la configuración de lanzamiento sin imprimir secretos |

No ejecutes `next dev` y `next build` a la vez sobre el mismo `.next`.

### Base de datos

Para una base nueva aplica los archivos en el orden de
[`docs/database.md`](docs/database.md):

```bash
npm run db:migrate -- db/auth.sql db/account-profile.sql db/account-settings.sql …
```

El orden está verificado sobre una base vacía. Los archivos son re-aplicables salvo las
dos fases de una sola vez de la migración a object storage (`media-storage*.sql`). El
splitter respeta bloques `$$` y comentarios, así que las funciones PL/pgSQL se aplican
intactas.

### Idiomas

Cada página vive bajo `/[locale]`. El español es la fuente: la forma de
`src/i18n/dictionaries/es` define el tipo `Dictionary`, y cada sección en inglés debe
satisfacerlo, así que una clave faltante o sobrante en inglés es un error de
compilación. Los componentes reciben su sección (`dict: Dictionary['catalog']`);
no hay textos de respaldo dentro de los componentes.

### Espacios patrocinados

Los fundadores con ficha aprobada pueden comprar días en un espacio etiquetado
«Patrocinado» (categorías, inicio y, más adelante, newsletter). Se paga por adelantado
con Stripe Checkout, con impuestos encima, y nunca altera el orden orgánico del
catálogo. Reglas, política de reembolsos, webhook y operación en [`docs/ads.md`](docs/ads.md).
Cada pago genera su CFDI (compradores en México) y cada reembolso su nota de crédito; la
cuenta los ve en Ajustes → Facturación ([`docs/billing.md`](docs/billing.md)).

### Pruebas de integración

Corren contra `localhost:3000` y la base de `.env.local`, con cuentas desechables
`@example.invalid` que eliminan al terminar:

```bash
RUN_CONTACT_INTEGRATION=1 node tests/integration/contacts.cjs
RUN_MEDIA_INTEGRATION=1 node tests/integration/media-dashboard.cjs
RUN_LAUNCH_INTEGRATION=1 node tests/integration/launch.cjs
```

## Documentación

- [Contexto completo, decisiones y estado](CLAUDE.md)
- Producto: [visión](docs/product.md), [roadmap](docs/roadmap.md), [diseño](docs/design.md), [paleta](docs/colors.md)
- Flujos: [publicación y revisión](docs/founder-workflow.md), [ficha guiada](docs/guided-solution-form.md), [capturas e inicio](docs/media-dashboard.md), [guardados y listas](docs/buyer-library.md), [comunidad](docs/community-lists.md), [contactos](docs/contacts.md), [cuenta](docs/account-settings.md)
- Anuncios y facturación: [espacios patrocinados y Stripe](docs/ads.md), [CFDI con Cord](docs/billing.md)
- Operación: [base de datos](docs/database.md), [entorno](docs/env.md), [stack](docs/stack.md), [seguridad](docs/security.md), [operación](docs/operations.md), [lanzamiento](docs/launch.md)
