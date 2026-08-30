# CLAUDE.md — ShowcaseMX

Este archivo es el contexto maestro del proyecto. Léelo completo antes de hacer cualquier cosa.
Toda decisión de arquitectura, stack, producto y diseño está documentada aquí.

---

## Qué es esto

**ShowcaseMX** es una boutique/marketplace curado de software B2B construido por operadores mexicanos.
No es un directorio. No es un foro. Es un catálogo de infraestructura de grado institucional.

La visión estratégica es controlar la distribución B2B en México. Al ser dueños del tráfico corporativo y de la data de intención de compra, se posicionan los propios productos del fundador (como CordHQ) de forma orgánica en el centro del ecosistema.

---

## Docs del proyecto

| Documento | Descripción |
|-----------|-------------|
| [`docs/product.md`](./docs/product.md) | Visión de producto, los 3 pilares, modelo de negocio |
| [`docs/stack.md`](./docs/stack.md) | Stack técnico completo y decisiones de arquitectura |
| [`docs/database.md`](./docs/database.md) | Esquema de base de datos, tablas, relaciones |
| [`docs/design.md`](./docs/design.md) | Sistema de diseño, tokens, estética |
| [`docs/roadmap.md`](./docs/roadmap.md) | Fases de desarrollo y estado actual |
| [`docs/env.md`](./docs/env.md) | Variables de entorno requeridas (sin valores sensibles) |

---

## Comandos Esenciales

```bash
# Dev server
npm run dev

# Build de producción
npm run build

# Generar migraciones de Drizzle
npx drizzle-kit generate

# Aplicar migraciones a Neon
npx drizzle-kit push

# Ver el esquema en Drizzle Studio
npx drizzle-kit studio
```

---

## Reglas de Código (NO negociables)

1. **TypeScript estricto.** Cero `any`. Si no sabes el tipo, investiga.
2. **Server Components por defecto.** Solo agregar `"use client"` cuando sea estrictamente necesario (interactividad real).
3. **Estética oscura pura.** Fondos `zinc-900`/`zinc-950`/`#000`. Cero colores de marca de startups. Ver `docs/design.md`.
4. **Variables de entorno.** Nunca hardcodear keys. Siempre desde `.env.local` vía `process.env`.
5. **Sin dependencias innecesarias.** Antes de instalar un paquete nuevo, justificarlo.
6. **Commits descriptivos.** Formato: `tipo: descripción`. Tipos: `feat`, `fix`, `chore`, `docs`, `refactor`.

---

## Estructura del Proyecto

```
showcasemx/
├── src/
│   ├── app/                   # App Router (Next.js)
│   │   ├── layout.tsx         # Layout global (Navbar, fuentes, dark mode)
│   │   ├── globals.css        # Estilos globales, variables CSS de shadcn
│   │   └── page.tsx           # Home (Hero + AI search input)
│   ├── components/
│   │   ├── ui/                # Componentes shadcn (no modificar directamente)
│   │   ├── navbar.tsx         # Navbar flotante con megamenu full-width + GSAP
│   │   └── footer.tsx         # Footer espejo de la navbar (rounded-t-2xl)
│   ├── db/
│   │   ├── index.ts           # Cliente Drizzle + Neon
│   │   └── schema.ts          # Esquema completo de la BD
│   └── lib/
│       └── utils.ts           # Utilidades (cn, etc.)
├── docs/                      # Documentación del proyecto (este directorio)
├── drizzle/                   # Migraciones generadas por Drizzle Kit
├── drizzle.config.ts          # Configuración de Drizzle Kit
├── tailwind.config.ts         # Configuración de Tailwind v3
└── CLAUDE.md                  # ← Estás aquí
```
