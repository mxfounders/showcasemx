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
  y `tests/integration/ops.cjs`. Pendiente: variables de entorno del proyecto en
  Vercel (`OPS_TOTP_KEY`, `DATABASE_URL` de producción) y dominio conectado.
