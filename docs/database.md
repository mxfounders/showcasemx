# Base de datos — ShowcaseMX

Fuente de verdad: [`src/db/schema.ts`](../src/db/schema.ts).
Cliente: [`src/db/index.ts`](../src/db/index.ts), Drizzle sobre Neon HTTP.

## Estado

El esquema está escrito, pero la home no lo consulta: usa
`src/lib/catalog-preview.ts`. No hay carpeta de migraciones versionadas
`drizzle/` en esta revisión. La existencia remota de tablas, extensión pgvector y
credenciales no se verificó. No confundir cliente configurado con BD operativa.

## Tablas actuales

Todas tienen `id` UUID con PK y valor aleatorio por defecto.

| Tabla | Campos y restricciones relevantes |
| --- | --- |
| `users` | `email` obligatorio y único; `role` obligatorio, default `client`; `company_name`, `linkedin_url` opcionales; `is_verified` default false; `created_at` |
| `products` | `founder_id` FK obligatoria; `name`, `tagline`, `description_pain`, `pricing_model` obligatorios; `status` default `draft`; `url`, `launched_at` opcionales; `created_at` |
| `product_embeddings` | `product_id` FK obligatoria, sin unicidad; `embedding` tipo custom `vector(1536)`, nullable |
| `endorsements` | `product_id` y `user_id` FK obligatorias; `weight` default 1; `created_at`; sin unicidad del par usuario/producto |
| `leads` | `product_id` y `client_id` FK obligatorias; `intent_query` opcional; `status` default `initiated`; `created_at` |

Enums:

- Usuario: `founder`, `client`, `admin`.
- Producto: `draft`, `pending_review`, `approved`, `rejected`.
- Precio: `saas`, `transactional`, `custom`.
- Lead: `initiated`, `contacted`, `closed`.

Las relaciones actuales permiten varios productos por usuario y varios leads,
endorsements y embeddings por producto. La intención original de un embedding
por producto **no está garantizada** por el esquema actual.

`tagline` es text sin límite de 60 caracteres en BD. `weight` no implementa por
sí mismo un sistema de reputación. Los enums no garantizan permisos ni transiciones
válidas; falta lógica de aplicación.

## Ajustes propuestos antes de conectar el catálogo

- Identificador único de Clerk para sincronizar identidades.
- Slug único, categoría, datos de ficha y fechas de actualización/revisión.
- Restricción única de embedding por producto si se mantiene esa decisión.
- Restricción única de endorsement por usuario/producto y validación de peso.
- Definir índices y políticas de borrado conforme a consultas y necesidades reales.
- Separar búsquedas de leads y definir tratamiento de solicitudes duplicadas.
- Evaluar registros de revisión y autorización por propietario.

Son pendientes, no columnas o restricciones ya aplicadas. El mapeo visual de
categorías/colores pertenece a `src/lib/`, no es una taxonomía persistida en BD.

## Migraciones y seguridad operativa

```bash
npx drizzle-kit generate
npx drizzle-kit studio
```

`drizzle.config.ts` define salida `./drizzle` y toma `NEON_DATABASE_URL` de
`.env.local`. Generar una migración no la aplica. Revisar SQL y base destino antes
de ejecutar cualquier cambio. `npx drizzle-kit push` sincroniza directamente el
esquema con la base configurada: no correrlo automáticamente después de cada edición.

Antes de aplicar tablas con `vector(1536)`, confirmar que pgvector esté habilitado.
La generación de embeddings y los índices de búsqueda semántica aún no existen.
No registrar búsquedas como leads por defecto: una solicitud de contacto es un
evento distinto de escribir una consulta.

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.
