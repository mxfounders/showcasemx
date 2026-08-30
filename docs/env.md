# Variables de Entorno — ShowcaseMX

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables.
**Nunca commitear `.env.local` al repositorio.** (Ya está en `.gitignore`)

---

## Todas las variables requeridas

```bash
# ─── BASE DE DATOS ─────────────────────────────────────────
# Neon PostgreSQL Serverless
# Obtener desde: https://console.neon.tech → tu proyecto → Connection string
NEON_DATABASE_URL=postgres://user:password@endpoint.neon.tech/neondb?sslmode=require

# ─── AUTENTICACIÓN ─────────────────────────────────────────
# Clerk — Autenticación B2B
# Obtener desde: https://dashboard.clerk.com → tu app → API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# URLs de redirección de Clerk (valores fijos)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# ─── INTELIGENCIA ARTIFICIAL ───────────────────────────────
# OpenAI — Para embeddings (text-embedding-3-small) y LLM (gpt-4o-mini)
# Obtener desde: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...
```

---

## Estado por entorno

| Variable | Local (`.env.local`) | Vercel (Producción) |
|----------|---------------------|---------------------|
| `NEON_DATABASE_URL` | ✅ Configurar | ✅ Ya configurado |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ⏳ Pendiente | ⏳ Pendiente |
| `CLERK_SECRET_KEY` | ⏳ Pendiente | ⏳ Pendiente |
| `OPENAI_API_KEY` | ⏳ Pendiente | ⏳ Pendiente |

---

## Notas importantes

- Las variables con prefijo `NEXT_PUBLIC_` son visibles en el cliente (browser). No poner secrets ahí.
- `NEON_DATABASE_URL` **nunca** debe tener prefijo `NEXT_PUBLIC_`. Es solo server-side.
- `CLERK_SECRET_KEY` es server-side únicamente. Nunca exponer al cliente.
- En Vercel: Settings → Environment Variables → agregar cada variable para "Production" y "Preview".
