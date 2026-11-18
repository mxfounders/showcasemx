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

## Firewall de Vercel (SHCWS-3)

Protección antes de que una petición llegue a una función: Vercel no cobra lo que el
firewall bloquea, reta o limita (§79). Las reglas propias están versionadas en
`firewall/rules.json` y las prueba `tests/firewall.test.ts`.

### Reglas propias

En Hobby caben 3 reglas por proyecto, como mucho 1 de límite de peticiones, y sin
acciones persistentes. Se evalúan en orden:

| Proyecto | Regla | Acción |
| --- | --- | --- |
| `shwcs` | Endpoints de máquinas: webhooks firmados, `/api/internal/*` (cron con secreto), `/api/health`, insignias, `robots.txt`, `sitemap.xml`, `llms.txt` y `/soluciones/<slug>.md` | `bypass` (sin reto de bots) |
| `shwcs` | Escáneres: `/wp-*`, `.php`, `/.env`, `/.git`, `/xmlrpc`, `phpmyadmin`, `cgi-bin`… | `deny` |
| `shwcs` | POST a `/api/auth/*`, `/api/contact` y `/api/newsletter` | 20 por minuto por IP, luego 429 |
| `shwcs-ops` | GET `/login` de la sonda externa (`shwcs-uptime/1.0`) | `bypass` |
| `shwcs-ops` | Escáneres | `deny` |
| `shwcs-ops` | POST a `/api/auth/*` (contraseña, código, alta) | 10 por minuto por IP, luego 429 |

Al pasar a Pro (`--plan pro`) se suman un límite general de 300 por minuto en `/api/*` y
un reto a las combinaciones de tres o más filtros en `/comunidad`, que `robots.txt` ya
excluye. Los límites por cuenta de la aplicación (`securityLimit`) siguen igual: el
firewall frena por IP antes de gastar una función, la aplicación frena por identidad.

### Cómo activarlas

Requiere la CLI con sesión en el equipo `mxfounders` y el proyecto vinculado
(`vercel link`; el de ops desde `ops/`). El script solo deja borradores y nunca publica.

1. Registrar sin bloquear y publicar:
   `npm run firewall -- --project shwcs --stage log --scope mxfounders`,
   `npm run firewall -- --project shwcs-ops --stage log --cwd ops --scope mxfounders`,
   revisar `vercel firewall diff` y `vercel firewall publish --yes` en cada proyecto.
2. Dejar pasar 24–48 h y revisar en Firewall → Traffic (filtrando por cada regla) que
   solo coinciden escáneres y ráfagas, no visitantes, buscadores ni Stripe.
3. Aplicar en firme con `--stage enforce` en ambos proyectos y publicar.
4. Comprobar: `curl -s -o /dev/null -w '%{http_code}' https://shwcs.site/wp-login.php`
   responde 403, y 25 POST seguidos a `/api/auth/login` con un correo `@example.invalid`
   desde la misma IP terminan en 429.

`--dry-run` imprime los comandos sin ejecutar nada. Volver a correr una etapa edita las
reglas existentes por nombre.

### Reglas administradas (panel de Vercel)

En Firewall → Rules → Managed Rulesets, ambos proyectos:

- **Bot Protection**: primero en `log`, luego en `challenge`. Reta a clientes que no son
  navegador; los bots verificados (buscadores) y lo que cubre la regla de máquinas pasan.
- **AI Bots**: recomendado dejarlo en `log`. La estrategia es que los buscadores con IA
  citen a shwcs (docs/strategy.md); bloquear solo los rastreadores de entrenamiento es
  una decisión del propietario (§79) que se hace en `robots.txt`, porque el ruleset no
  distingue entre rastreadores que entrenan y los que citan.

### Attack Mode

Ante un ataque en curso (picos en Observability, 5xx, consumo que se dispara): Firewall →
Attack Mode → Enable, o `vercel firewall attack-mode enable --duration 1h --yes` desde
una terminal propia (la CLI no deja hacerlo a un agente). Todo visitante no verificado ve
un reto; buscadores verificados pasan. Desactivarlo en cuanto pase:
`vercel firewall attack-mode disable --yes`. Si la sonda externa de disponibilidad marca
caída mientras está activo, es por el reto, no por el sitio.

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
