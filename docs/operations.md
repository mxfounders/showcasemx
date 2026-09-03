# Operación de producción

## Aislamiento de datos

`shwcs_production` es la base usada por `shwcs.site`. Desarrollo usa `neondb`. La aplicación de producción se conecta con `shwcs_app_production`, un rol sin permisos para crear bases, roles o modificar privilegios.

## Observabilidad

- Vercel Web Analytics registra visitas y rutas mediante `@vercel/analytics`.
- Vercel Speed Insights registra Core Web Vitals mediante `@vercel/speed-insights`.
- Vercel Observability registra solicitudes, funciones, APIs externas y errores de runtime.
- En el plan Hobby, Vercel envía avisos de fallos de deployment y certificados a los propietarios. Las alertas automáticas por anomalías de errores requieren Pro con Observability Plus.
- El endpoint público `GET /api/health` sirve para comprobar disponibilidad sin exponer estado interno.
- Vercel Cron ejecuta diariamente `GET /api/internal/monitor`: comprueba la portada y Neon y envía una alerta a `MONITOR_EMAIL_TO` si falla alguna comprobación. También procesa la cola de avisos mediante `GET /api/internal/mail`.

## Prueba de restauración

La prueba intenta crear una copia temporal exacta de `shwcs_production`. Si Neon mantiene conexiones activas, reconstruye una base temporal desde las migraciones sin interrumpir producción. Después compara tablas, columnas, restricciones, índices y conteos, y elimina la copia al terminar:

```bash
ALLOW_NEON_RESTORE_TEST=true node scripts/verify-neon-restore.cjs
```

Requiere que `DATABASE_URL` en `.env.local` pertenezca al rol propietario de Neon. El script nunca modifica ni elimina la base de origen y rechaza la ejecución sin la confirmación explícita de entorno. Mientras producción no contiene filas, el modo de migraciones valida una recuperación completa del esquema. Cuando existan datos, una diferencia de conteos hará fallar la prueba hasta incorporar el respaldo lógico o point-in-time restore correspondiente.

## Dominios

- `shwcs.site`: producto y comunidad públicos.
- `ops.shwcs.site`: proyecto Vercel independiente (`shwcs-ops`, carpeta `ops/`) para
  operación interna: revisión, reportes, cuentas, comunidad, mensajes, correo,
  newsletter, métricas, equipo y bitácora. Login propio en dos pasos (contraseña +
  TOTP obligatorio), sesiones en `ops_sessions` separadas de `auth_sessions`, y
  autorización por `solution_reviewers.level` (`reviewer`/`admin`). Ver CLAUDE.md §44
  y `tests/integration/ops.cjs`. Desplegado y con `OPS_TOTP_KEY`/`NEON_DATABASE_URL`
  configuradas apuntando a `shwcs_production` desde el 3 de septiembre de 2026.

## Incidente del 3 de septiembre de 2026 — variables de entorno vacías en producción

Las variables de entorno de Production del proyecto `shwcs` (`NEON_DATABASE_URL`,
`DATABASE_URL`, `POSTGRES_URL` y toda la familia `PG*`, más `AUTH_APP_ORIGIN`,
`AUTH_EMAIL_FROM`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `CRON_SECRET`,
`CONTACT_EMAIL_TO`, `MONITOR_EMAIL_TO`, `NEWSLETTER_UNSUBSCRIBE_SECRET`,
`NEXT_PUBLIC_SHOW_DEMO_PROJECTS`, `LAUNCH_LEGAL_REVIEWED`,
`AUTH_REQUIRE_VERIFIED_EMAIL`) estaban guardadas como cadena vacía, no ausentes.
Same en Preview. La portada seguía cargando porque `/` cae al catálogo estático
de `src/lib/catalog-preview.ts` cuando no hay fila publicada; rutas privadas
(`/account`, forzadas a `dynamic='force-dynamic'`) fallaban de inmediato porque
`getDatabaseUrl()` devolvía cadena vacía. `db/ops-console.sql` tampoco estaba
aplicada en `shwcs_production` (sí lo estaba en `neondb`, la base de
desarrollo), así que el código que ya consulta `suspended_at`/`disabled_at`
habría vuelto a romper `/account` aunque solo se hubieran arreglado las
variables. Corregido: valores reales cargados desde `.env.production.local`
(los propios de producción) y desde `.env.local` (Resend/Google, mismas
credenciales de siempre), migración aplicada a `shwcs_production` con el rol
propietario (`neondb_owner`, no el rol de la app en runtime), `hola@shwcs.site`
repromovido a admin de ops ahí, y redeploy de ambos proyectos. Verificado en
vivo tras el redeploy: `/api/health` 200, login con contraseña incorrecta
devuelve 401 genérico (antes 503 «Storage unavailable»), y el arranque de
Google OAuth redirige correctamente. Pendiente de confirmar por el propietario:
que la URI `https://shwcs.site/api/auth/google/callback` esté autorizada en
Google Cloud Console — eso no se configura desde Vercel.
