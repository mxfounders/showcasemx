# Stack Técnico — ShowcaseMX

## Resumen

| Capa | Tecnología | Decisión |
|------|-----------|---------|
| Framework | Next.js 14 (App Router) | SSR nativo, Server Actions, SEO |
| Lenguaje | TypeScript strict | Tipo seguro a escala |
| Estilos | Tailwind CSS v3 | Utilidades, dark mode fácil |
| Componentes UI | shadcn/ui | Minimalista, personalizable, accesible |
| Base de datos | Neon (PostgreSQL Serverless) | Escala a cero, branching tipo git, pgvector |
| ORM | Drizzle ORM | Type-safe, ligero, edge-ready |
| Auth | Clerk | B2B auth, organizations, UI limpia |
| IA | Vercel AI SDK + OpenAI | Streaming nativo, embeddings |
| Vector Search | pgvector (Neon) | Búsqueda semántica del dolor operativo |
| Deploy | Vercel | CI/CD automático desde GitHub |
| Repo | GitHub (mxfounders/showcasemx) | Org mxfounders |

---

## Por qué cada decisión

### Next.js 14 sobre Astro
Astro es más rápido para sitios estáticos, pero ShowcaseMX tiene comportamiento de **app viva**:
- Usuarios logueados con estado global (como un Product Hunt)
- Dashboards asimétricos con data en tiempo real
- Acciones de interacción: guardar, votar, contactar, buscar con IA
- Server Actions para mutaciones sin APIs custom

Astro requeriría gestionar estado global entre islas con librerías externas (NanoStores), lo que se vuelve un dolor a escala. Next.js App Router lo resuelve de forma nativa.

### Neon sobre Supabase
- Neon es **solo base de datos** (PostgreSQL Serverless). Más especializado, mejor performance.
- Soporte nativo de `pgvector` para el motor de IA.
- Branching de base de datos tipo git (ideal para no romper producción).
- Se integra de forma nativa con Vercel (environment variables automáticas).
- Drizzle ORM maneja auth y queries. No necesitamos el backend de Supabase.

### Drizzle sobre Prisma
- Más rápido en runtime (no genera un proceso separado).
- Type-safe al 100% sin codegen.
- Compatible con Edge Runtime de Vercel.
- SQL-like API: más control, menos magia.

### Clerk sobre Auth.js
- Soporta **organizaciones B2B** de forma nativa (crucial para buyers corporativos).
- UI de onboarding lista en minutos.
- Webhooks para sincronizar usuarios con nuestra tabla `users` en Neon.
- Trade-off: es un servicio externo con costo, pero ahorra semanas de desarrollo de auth.

---

## Arquitectura de la IA (Vector Search)

```
1. Founder registra producto
   → descriptionPain + tagline pasan por OpenAI Embeddings (text-embedding-3-small)
   → Vector de 1536 dimensiones se guarda en product_embeddings (pgvector)

2. CFO escribe "mis clientes tardan 15 días en pagarme"
   → Esa frase se convierte en vector via OpenAI Embeddings
   → pgvector hace similarity search (cosine distance) contra product_embeddings
   → Trae los N productos más cercanos semánticamente

3. LLM (gpt-4o-mini) redacta la respuesta:
   → "Encontramos 2 herramientas que resuelven ese cuello de botella..."
   → La respuesta se hace stream via Vercel AI SDK (efecto tipo ChatGPT)
```

---

## Flujo de CI/CD

```
git push origin main
   → GitHub notifica a Vercel
   → Vercel corre npm run build
   → Si pasa → deploy a producción automático
   → Si falla → build error en Vercel dashboard
```

---

## Variables de Entorno Requeridas

Ver [`docs/env.md`](./env.md) para el listado completo.
