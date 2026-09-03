# Capa social en fichas y ranking del catálogo — 3 septiembre 2026

## Qué existe

- **Like**: `solution_likes(solution_id,owner_id)`, clave compuesta. Único por
  cuenta y ficha. El dueño de la ficha no puede darle like a la suya.
- **Comentarios**: `solution_comments(id,solution_id,author_id,author_name,body,created_at)`.
  El `id` lo genera el cliente (`crypto.randomUUID()`), así un reintento de
  red nunca duplica el comentario: el servidor responde `created:false` con
  el mismo `id` si ya existía.
- **Guardado**: no es nuevo — reusa `buyer_saved_projects` vía
  `SaveProjectButton`, ya presente en la ficha.

Todo empieza en cero. No se siembran likes, comentarios ni vistas ficticias.

## API

`POST /api/solutions/social` — mismo contrato que `POST /api/community`
(`src/app/api/community/route.ts`), aplicado a `founder_solutions` en vez de
`buyer_lists`:

| Acción | Requiere | Efecto |
| --- | --- | --- |
| `like` | sesión, ficha publicada, no ser el dueño | toggle atómico, devuelve `{active,count}` |
| `comment` | sesión, ficha publicada, `name` 1–60, `comment` 1–500 | inserción idempotente por `commentId` |
| `delete-comment` | sesión, ser el **autor** del comentario | borra la fila |

Guardas en orden: `Origin` exacto (403) → sesión (401) → cuerpo válido (400)
→ `securityLimit('solution-social', account.id, 60)` (429) →
`securityLimit('solution-comment', account.id, 10)` solo para comentar (429).

**El dueño de la ficha nunca puede borrar un comentario ajeno.** Es la única
diferencia real frente al patrón de listas, donde el curador sí modera los
comentarios de su propia colección. Aquí solo el autor o `ops` (nivel
`admin`, backoffice `ops/panel/comunidad`) pueden borrar — un fundador
silenciando críticas de su propio producto rompe la credibilidad del
catálogo.

## Qué se muestra públicamente

Un comentario expone únicamente `{id, name, body, createdAt, mine}` —
`author_id`, correo y perfil nunca llegan al cliente. `name` se precarga con
`auth_accounts.name` (el que captura el onboarding, ver CLAUDE.md §47) pero
es un campo editable: lo que queda guardado es el alias que la persona
confirmó al comentar, no una referencia viva a su perfil.

## Ranking

`src/lib/solutions/ranking.ts`:

```ts
solutionScore(likes, saves, comments, views) = likes + saves*2 + comments*3 + views*0.1
```

Un comentario pesa como 3, un guardado como 2, un like como 1, una vista
0.1. `src/lib/solutions/public.ts` ordena el catálogo por esta fórmula
(calculada en SQL, contando guardados con la misma doble identidad
`solution:UUID`/`catalog:key` que ya usa la comunidad) y expone
`likes/saves/comments/views/score` en cada producto. El desempate es
`catalog_key` (Cord, Flouvia, con sitio, ejemplo) — ya no el criterio
principal.

Se explica en la interfaz: un disclosure «Cómo se ordena» junto al selector
de orden en las páginas de categoría, y una sección dedicada en `/criterios`.
**No es una puntuación de calidad ni un aval editorial** — es interacción
bruta, empieza en cero y puede manipularse creando cuentas. Mismo aviso que
ya lleva la comunidad de listas en CLAUDE.md §23.

## Datos y migración

`db/solution-social.sql`, aplicada con `node scripts/migrate-solution-social.cjs`
a `neondb` (desarrollo) y a `shwcs_production` (con el rol propietario
`neondb_owner`, no el rol de aplicación `shwcs_app_production` que no tiene
permisos DDL). Otro entorno necesita aplicarla explícitamente antes de servir
el código — mismo patrón que `db/community-social.sql`.

## Verificación

- Unitarias: `tests/solution-social.test.ts` (pesos de `solutionScore`,
  origen/sesión de `/api/solutions/social`).
- Integración opt-in: `RUN_SOLUTION_SOCIAL_INTEGRATION=1 node tests/integration/solution-social.cjs`
  — tres cuentas `@example.invalid`, auto-like bloqueado, toggle atómico,
  comentario idempotente, alias público sin correo, y confirma que el dueño
  de la ficha no puede borrar un comentario ajeno. Limpieza en `finally`.

## Límites pendientes

Igual que la comunidad de listas (CLAUDE.md §23): sin reputación ponderada,
sin decaimiento temporal del puntaje, sin defensa sólida ante multicuentas.
El backoffice de ops modera comentarios de fichas; no hay reporte de
comentarios por parte de visitantes todavía. No reutilizar el flujo de
reportes de soluciones (`/api/reports`) como si ya cubriera esta capa social
— son entidades distintas.
