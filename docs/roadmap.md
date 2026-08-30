# Roadmap — ShowcaseMX

## Estado General del Proyecto

**Fase actual:** Fase 1 — Infraestructura Base ✅

---

## Fase 1 — Infraestructura Base
**Objetivo:** Tener el proyecto compilando, deployado y con la BD conectada.

- [x] Next.js 14 (App Router, TypeScript, Tailwind CSS)
- [x] shadcn/ui inicializado (tema oscuro)
- [x] Drizzle ORM + Neon Serverless configurados
- [x] Esquema de BD definido (users, products, embeddings, endorsements, leads)
- [x] Clerk instalado para autenticación
- [x] Vercel AI SDK instalado
- [x] Deploy en Vercel funcionando
- [x] Variables de entorno configuradas en Vercel
- [x] Base de datos Neon creada
- [x] Repositorio en GitHub (mxfounders/showcasemx)
- [x] Navbar flotante minimalista
- [x] Hero section con AI search input
- [x] Documentación base (`docs/`, `CLAUDE.md`)
- [ ] Extensión pgvector habilitada en Neon
- [ ] Primera migración aplicada a Neon (`npx drizzle-kit push`)

---

## Fase 2 — Autenticación y Dashboards
**Objetivo:** Usuarios pueden registrarse, iniciar sesión y ver su dashboard según su rol.

- [ ] Middleware de Clerk configurado (proteger rutas `/dashboard/**`)
- [ ] Webhook de Clerk → sincronizar usuario en tabla `users` de Neon
- [ ] Dashboard del Founder (`/dashboard/founder`)
  - [ ] Métricas: visitas al perfil, leads generados, búsquedas que matchearon
  - [ ] Lista de sus productos y estado de aprobación
- [ ] Dashboard del Cliente (`/dashboard/client`)
  - [ ] Búsquedas guardadas
  - [ ] Herramientas guardadas ("Mi Tech Stack")
- [ ] Panel de Admin (`/dashboard/admin`)
  - [ ] Cola de productos en `pending_review`
  - [ ] Aprobar / rechazar con un clic

---

## Fase 3 — Catálogo y Buscador IA
**Objetivo:** El core del producto está vivo. Los usuarios pueden buscar y descubrir.

- [ ] Página del catálogo (`/explorar`) con grid de productos aprobados
- [ ] Página de producto individual (`/p/[slug]`)
- [ ] Input de IA funcional en el home
  - [ ] API route para procesar la búsqueda (`/api/search`)
  - [ ] Generar embedding de la query del usuario
  - [ ] pgvector similarity search contra `product_embeddings`
  - [ ] Streaming de la respuesta del LLM con Vercel AI SDK
- [ ] Al buscar → generar registro en tabla `leads` (con `intent_query`)
- [ ] Formulario de aplicación para founders (`/aplicar`)
  - [ ] Al enviar → producto entra como `pending_review`
  - [ ] Generar embedding del producto automáticamente

---

## Fase 4 — Social y Distribución
**Objetivo:** Prueba social, interacción y los mecanismos de distribución orgánica.

- [ ] Sistema de Endorsements (votos con peso)
- [ ] "Weekly Drops" — lógica de `launched_at` para revelar productos cada martes
- [ ] Páginas de perfil de founders (`/founder/[slug]`)
- [ ] Compartir producto (Open Graph cards optimizadas para WhatsApp/Twitter)
- [ ] Newsletter de "Weekly Drop" (integrar Resend o similar)
- [ ] SEO: sitemap.xml, meta tags, structured data para Google

---

## Fase 5 — Monetización
**Objetivo:** Los primeros flujos de ingresos.

- [ ] Definir modelo de monetización exacto (leads premium, featured listings, comisión transaccional)
- [ ] Integrar CordHQ como producto featured (el "Caballo de Troya")
- [ ] Analytics de intención de compra para el equipo (dashboard interno)

---

## Stack de Decisiones Pendientes

| Decisión | Opciones | Estado |
|----------|---------|--------|
| Email/Newsletter | Resend + React Email | Por decidir |
| Analytics | Vercel Analytics / Mixpanel | Por decidir |
| CDN para logos/imágenes | Vercel Blob / Cloudinary | Por decidir |
