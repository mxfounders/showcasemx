# Backoffice de operaciones (`ops/`)

Estado 10 de octubre de 2026. App Next.js independiente (`ops/`, proyecto Vercel
`shwcs-ops`, dominio `ops.shwcs.site`) sobre la misma base Neon que el producto,
con identidad de sesión propia. Este documento describe lo que hace el código; no
certifica la configuración de Vercel ni sustituye una prueba de penetración.

## Antes de desplegar

1. Aplicar `db/ops-hardening.sql` en la base del entorno (después de
   `db/ops-console.sql`): `npm run db:migrate -- db/ops-hardening.sql` con la
   credencial propietaria. El código nuevo lee `ops_sessions.elevated_until`,
   `solution_reviewers.enroll_by` y las columnas de la cadena de la bitácora; sin
   la migración el login falla.
2. Variables de `shwcs-ops`: obligatorias `DATABASE_URL` (o `NEON_DATABASE_URL`) y
   `OPS_TOTP_KEY`; recomendadas `PRODUCT_APP_ORIGIN`, `OPS_MEDIA_SECRET`,
   `CATALOG_REVALIDATE_SECRET`; opcionales `OPS_IP_ALLOWLIST`, `RESEND_API_KEY` +
   `OPS_ALERT_FROM`. Detalle en [env.md](env.md) y `ops/.env.example`.
3. La migración es aditiva salvo un punto: rellena la cadena de hashes de las filas
   existentes de `ops_audit_log` y después la vuelve de solo inserción.

## Acceso

- **Dos pasos siempre.** `POST /api/auth/login` valida contraseña (scrypt, tiempo
  uniforme con hash ficticio, mensaje genérico) y solo crea un reto de 5 minutos.
  `POST /api/auth/totp` o `POST /api/auth/enroll` abren la sesión.
- **TOTP y códigos de respaldo atómicos.** Quemar el reto, consumir el factor y
  crear la sesión ocurre en una sola sentencia SQL con CTE: dos peticiones con el
  mismo código (o el mismo código de respaldo) nunca abren dos sesiones. Un código
  ya usado se distingue de uno incorrecto y ambos cuentan como intento (5 por reto).
- **Alta del autenticador con plazo.** Quien se agrega o se reinicia desde Equipo
  tiene 72 h para configurarlo (`enroll_by`); vencido, un admin renueva la
  invitación. Las altas por script no tienen plazo (comportamiento anterior).
  Confirmar el alta exige el mismo secreto cifrado que se verificó.
- **Límites.** 5 intentos de contraseña por correo y 10 por red cada hora, 30
  códigos por red cada hora, 60 por minuto globales; los bloqueos quedan en la
  bitácora como `login_throttled`.

## Sesiones

- Cookie `__Host-ops-session` (producción), HttpOnly, Secure, SameSite=Strict; en
  Neon solo el SHA-256 del token.
- Duración máxima de 8 h y cierre tras **30 min sin actividad** (`last_seen_at`). El
  sondeo de estado (`GET /api/auth/session`) no cuenta como actividad: una pestaña
  abierta no mantiene viva una sesión. Dos minutos antes avisa y ofrece «Seguir
  conectado».
- **Atada al navegador.** Si la cookie llega con otro user agent la sesión se
  destruye y se registra `session_binding_mismatch`.
- Máximo 5 sesiones por cuenta; al iniciar una nueva se purgan las vencidas, las
  inactivas y las más antiguas.
- Alertas por correo (si hay Resend): acceso desde un dispositivo nuevo, uso de un
  código de respaldo, autenticador configurado y cambios de equipo que afectan a la
  persona. Nunca incluyen códigos ni enlaces que den acceso.

## Modo seguro (re-autenticación)

Un código TOTP nuevo eleva la sesión actual 10 minutos (`POST /api/auth/elevate`).
Lo exigen: todas las acciones sobre cuentas (verificar correo, cerrar sesiones,
suspender, reactivar, despublicar todo), todo cambio de Equipo, exportaciones,
regenerar códigos de respaldo, reintentar todos los correos fallidos y el cierre
global de sesiones. Una cookie robada sirve para mirar, no para actuar. Cinco
códigos fallidos en una hora cierran la sesión (`session_revoked_failed_elevation`).
El cliente abre el diálogo solo cuando una API responde `elevation_required` y
reintenta la acción una vez.

## Defensa en profundidad

- `ops/src/middleware.ts`: allowlist opcional de redes (`OPS_IP_ALLOWLIST`, todo
  lo demás recibe un 404), rechazo temprano sin cookie (`/panel` → `/login`, APIs →
  401) y **CSP con nonce por petición**: `script-src 'self' 'nonce-…'
  'strict-dynamic'`, sin `unsafe-inline` ni `unsafe-eval` en producción,
  `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`. Tipografías
  autoalojadas con `next/font` (`font-src 'self'`).
- `next.config.mjs`: HSTS con preload (producción), COOP/CORP same-origin,
  Permissions-Policy restrictiva, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, sin `X-Powered-By`.
- Cada página consulta la sesión contra la base (`requireOps`/`requireAdminPage`);
  el middleware no es la única barrera.
- Todas las rutas autenticadas pasan por `opsRoute()` (`ops/src/lib/api.ts`) con el
  mismo orden: origen exacto + `Sec-Fetch-Site` → sesión → cuerpo JSON acotado
  (32 KB) → rol → modo seguro → límite por cuenta. Los errores devuelven una
  referencia corta que coincide con el log, nunca detalles internos.
- Búsquedas con `LIKE` escapado, UUID validados, paginación acotada, proxy de
  capturas que solo reenvía `image/webp`.

## Bitácora encadenada

`ops_audit_log` es de solo inserción: triggers bloquean `UPDATE`, `DELETE` y
`TRUNCATE` (la única actualización permitida es el `SET NULL` de `actor_id` cuando
se borra una cuenta). Un trigger con bloqueo consultivo asigna `chain_seq`,
`prev_hash` y `row_hash = sha256(fila canónica + hash anterior)`. Seguridad y
Bitácora recalculan toda la cadena en la base y señalan el primer evento roto; la
«huella actual» conviene anotarla fuera del sistema de vez en cuando, porque quien
tenga privilegios de dueño de la base podría reescribir la cadena completa.

Las mutaciones principales (revisión, reportes, comunidad, acciones de cuenta,
equipo, mensajes, correo, sesiones) escriben su entrada **en la misma sentencia**
que el cambio. Una exportación no se entrega si no pudo registrarse.

## Frontera de privacidad (sin cambios respecto a §44)

Ops nunca consulta `buyer_list_items.note`, `buyer_lists.purpose`,
`contact_requests.details` ni `contact_events.message`, ni tampoco **qué**
proyectos guardó un comprador (solo cuántos). Contactos muestra quién, a qué
proyecto, estado, fechas y la línea de tiempo de estados sin mensajes. La prueba de
seguridad comprueba los marcadores en JSON y en el HTML/RSC renderizado.

## Pantallas

| Ruta | Para qué |
| --- | --- |
| `/panel` | Pendientes, actividad del catálogo, colas, salud, tu acceso anterior e intentos fallidos con tu correo |
| `/panel/revision` | Cola pendiente, la más antigua primero, con señales (cuenta nueva, sin verificar, actualización, reportes); `j`/`k` |
| `/panel/postulaciones` | Todas las fichas: estados, categoría, proyecto vinculado, orden, exportación |
| `/panel/postulaciones/[id]` | Ficha completa, diff palabra por palabra contra lo publicado, capturas, historial, actividad, reportes, comentarios; panel de decisión con plantillas y navegación por la cola |
| `/panel/reportes` | Reportes de fichas y de comunidad con decisión obligatoria |
| `/panel/dominios` | Pruebas TXT: verificadas, pendientes, vencidas, por revalidar (+90 días) |
| `/panel/cuentas`, `/panel/cuentas/[id]` | Filtros, orden, exportación; identidad, seguridad (sesiones del producto por dispositivo, 2FA, tokens vivos, membresía ops), publicaciones, biblioteca (solo conteos), contactos (metadatos), comunidad, avisos y bitácora |
| `/panel/contactos` | Solicitudes comprador → fundador, tasa de respuesta, serie diaria y línea de tiempo de estados |
| `/panel/comunidad` | Listas públicas, comentarios en listas y en fichas, moderación |
| `/panel/mensajes` | Bandeja del formulario de contacto, responder por correo, atender/reabrir |
| `/panel/correo` | Estado de los avisos transaccionales, reintentos |
| `/panel/newsletter` | Suscripciones, altas/bajas, segmentos, crecimiento |
| `/panel/metricas` | Vistas, clics, solicitudes, cuentas, señales sociales, embudo y rendimiento por ficha (7/30/90 días) |
| `/panel/seguridad` | Tus sesiones, modo seguro, códigos de respaldo; para admin: accesos fallidos, cookies reutilizadas, postura, límites activos, cadena de la bitácora y cierre global de sesiones |
| `/panel/sistema` | Admin: latencia y tamaño de la base, tablas, Blob, colas, residuos por limpiar, salud del producto, configuración (solo presencia) |
| `/panel/equipo` | Admin: altas, niveles, desactivar/quitar, reiniciar 2FA, renovar invitación, cerrar sesiones |
| `/panel/bitacora` | Admin: filtros por grupo/acción/actor/sujeto/fechas/texto, metadatos, hash por evento, exportación |

Paleta de comandos `⌘K` (páginas, cuentas, fichas, listas, mensajes y acciones),
atajos `g` + letra, `?` para la ayuda, tema claro/oscuro/sistema sin parpadeo.
Las gráficas son SVG propios con eje único, tabla alternativa, tooltip por teclado
y una paleta validada para daltonismo en ambos temas.

## Procedimientos

- **Perdí mi teléfono.** Entra con un código de respaldo y pide a otro admin
  «Reiniciar autenticador» en Equipo. Si eres el único admin y no tienes códigos,
  hace falta la base de datos: por eso Seguridad avisa cuando hay un solo admin.
- **Sospecho una intrusión.** Seguridad → «Cerrar todas las sesiones de ops»
  (admin + modo seguro): cierra todas las sesiones y retos menos la tuya. Después
  revisa Bitácora filtrando por el grupo Seguridad y verifica la cadena.
- **Restringir por red.** Define `OPS_IP_ALLOWLIST` con la IP o rango de la VPN y
  redeploy; cualquier otra red recibe 404 incluso en `/login`.

## Verificación

- `npm test` en la raíz incluye `tests/ops-security.test.ts` (allowlist IPv4/IPv6
  y CIDR, IP del cliente, CSP con nonce, CSV sin inyección de fórmulas, diff,
  ejes enteros).
- `RUN_OPS_INTEGRATION=1 OPS_PORT=<ops> MAIN_PORT=<producto> node tests/integration/ops.cjs`
  ahora cubre también sesión atada al navegador, modo seguro obligatorio, la guarda
  de reportes propios y la cadena de la bitácora. La guarda del último admin solo
  se ejercita si la base no tiene otros admins reales; si los hay, la prueba lo
  dice y la salta en vez de tocar filas reales.
