# Base de Datos — ShowcaseMX

**Motor:** PostgreSQL Serverless via [Neon](https://neon.tech)  
**ORM:** Drizzle ORM  
**Schema file:** [`src/db/schema.ts`](../src/db/schema.ts)  
**Cliente:** [`src/db/index.ts`](../src/db/index.ts)  
**Migraciones:** `drizzle/` (generadas con `npx drizzle-kit generate`)

---

## Diagrama de Relaciones

```
users (1) ──────── (N) products         [un founder tiene N productos]
users (1) ──────── (N) endorsements     [un user da N endorsements]
users (1) ──────── (N) leads            [un client genera N leads]
products (1) ───── (1) product_embeddings [cada producto tiene 1 vector]
products (1) ───── (N) endorsements
products (1) ───── (N) leads
```

---

## Tablas

### `users`
Identidad centralizada. Todos los actores del sistema viven aquí.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid (PK) | Identificador único |
| `email` | text (unique) | Email, indexado |
| `role` | enum | `founder` \| `client` \| `admin` |
| `company_name` | text | Nombre de la empresa (buyers corporativos) |
| `linkedin_url` | text | Para validar identidad real |
| `is_verified` | boolean | Sello de confianza (activo por admins) |
| `created_at` | timestamp | Fecha de registro |

### `products`
El catálogo curado. Solo los aprueba un `admin`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid (PK) | Identificador único |
| `founder_id` | uuid (FK → users) | Quién lo construyó |
| `name` | text | Nombre del producto |
| `tagline` | text | Copy de 60 chars máx |
| `description_pain` | text | **Qué dolor operativo resuelve** (input para la IA) |
| `pricing_model` | enum | `saas` \| `transactional` \| `custom` |
| `status` | enum | `draft` → `pending_review` → `approved` / `rejected` |
| `url` | text | URL del producto |
| `launched_at` | timestamp | Para Weekly Drops |
| `created_at` | timestamp | Fecha de creación |

### `product_embeddings`
El cerebro del buscador IA. Separada de `products` para no bloquear queries normales.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid (PK) | Identificador único |
| `product_id` | uuid (FK → products) | Producto asociado |
| `embedding` | vector(1536) | Vector generado por `text-embedding-3-small` de OpenAI |

### `endorsements`
Prueba social B2B con peso. No son upvotes vacíos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid (PK) | Identificador único |
| `product_id` | uuid (FK → products) | Producto endorsado |
| `user_id` | uuid (FK → users) | Quién endosa |
| `weight` | integer | Peso del voto (CFO verificado = 10, usuario nuevo = 1) |
| `created_at` | timestamp | Fecha |

### `leads`
**El corazón del modelo de negocio.** Registra cada intención de compra.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | uuid (PK) | Identificador único |
| `product_id` | uuid (FK → products) | Producto de interés |
| `client_id` | uuid (FK → users) | El corporativo interesado |
| `intent_query` | text | **Qué buscó el cliente en la IA antes de contactar** |
| `status` | enum | `initiated` \| `contacted` \| `closed` |
| `created_at` | timestamp | Fecha del lead |

---

## Comandos de Migraciones

```bash
# Generar archivo de migración desde el schema
npx drizzle-kit generate

# Aplicar migraciones directamente a Neon (dev/staging)
npx drizzle-kit push

# Explorar la BD visualmente
npx drizzle-kit studio
```

> ⚠️ Siempre correr `npx drizzle-kit push` después de modificar `src/db/schema.ts`

---

## Estado Actual

- [x] Schema definido en código (`src/db/schema.ts`)
- [x] Cliente Neon configurado (`src/db/index.ts`)
- [x] Variables de entorno en Vercel
- [ ] Extensión `pgvector` habilitada en Neon (correr `CREATE EXTENSION vector;` en Neon console)
- [ ] Primera migración aplicada (`npx drizzle-kit push`)
