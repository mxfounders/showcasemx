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
regenerar códigos de respaldo, reintentar todos los correos fallidos, el cierre
global de sesiones y, en el newsletter, enviar o cancelar una campaña, pedir
confirmación a las suscripciones anteriores y dar de baja por solicitud. Una cookie robada sirve para mirar, no para actuar. Cinco
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
| `/panel/postulaciones/[id]` | Ficha completa, diff palabra por palabra contra lo publicado, capturas, historial, actividad, reportes, comentarios; panel de decisión con plantillas y navegación por la cola; «Dirección pública» con el slug, los anteriores y, para admin, el cambio de dirección |
| `/panel/reportes` | Reportes de fichas y de comunidad con decisión obligatoria |
| `/panel/fraude` | Señales de multicuentas por ficha/lista y por cuenta (7/30/90 días), cuentas marcadas e historial; marcar y quitar marca (admin + modo seguro) |
| `/panel/dominios` | Pruebas TXT: verificadas, pendientes, vencidas, por revalidar (+90 días) |
| `/panel/cuentas`, `/panel/cuentas/[id]` | Filtros, orden, exportación; identidad, seguridad (sesiones del producto por dispositivo, 2FA, tokens vivos, membresía ops), publicaciones, biblioteca (solo conteos), contactos (metadatos), comunidad, avisos y bitácora |
| `/panel/contactos` | Solicitudes comprador → fundador, tasa de respuesta, serie diaria y línea de tiempo de estados; solicitudes sin respuesta con su etapa de recordatorio (SHCWS-61) |
| `/panel/comunidad` | Listas públicas, comentarios en listas y en fichas, moderación |
| `/panel/mensajes` | Bandeja del formulario de contacto, responder por correo, atender/reabrir |
| `/panel/correo` | Estado de los avisos transaccionales, reintentos |
| `/panel/newsletter` | Suscripciones confirmadas, sin confirmar y bajas (con motivo: enlace, un clic, rebote, queja, solicitud), segmentos, crecimiento; pedir confirmación a las anteriores al doble opt-in y dar de baja por solicitud (admin + modo seguro) |
| `/panel/newsletter/campanas` | Campañas: crear, editar (versiones), vista previa en una pestaña aislada, prueba obligatoria de la misma versión, enviar (admin + modo seguro + motivo), continuar, cancelar; resultados agregados y borrador semanal de «Nuevo esta semana» ([newsletter.md](newsletter.md)) |
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
- **Cambiar la URL de una ficha** (SHCWS-101). Publicar le da `/soluciones/<slug>` a
  partir del nombre. Si el proyecto cambia de nombre, un admin la cambia en «Dirección
  pública» de la postulación con un motivo; la anterior sigue redirigiendo (301) y el
  dueño recibe un aviso. Un slug que otra ficha usa o usó no se acepta. Detalle en
  [listings.md](listings.md#urls-con-nombre--14-noviembre-2026-shcws-101).

## Verificación

- `npm test` en la raíz incluye `tests/ops-security.test.ts` (allowlist IPv4/IPv6
  y CIDR, IP del cliente, CSP con nonce, CSV sin inyección de fórmulas, diff,
  ejes enteros).
- `RUN_OPS_INTEGRATION=1 OPS_PORT=<ops> MAIN_PORT=<producto> node tests/integration/ops.cjs`
  ahora cubre también sesión atada al navegador, modo seguro obligatorio, la guarda
  de reportes propios y la cadena de la bitácora. La guarda del último admin solo
  se ejercita si la base no tiene otros admins reales; si los hay, la prueba lo
  dice y la salta en vez de tocar filas reales.


## Avisos al equipo de revisión — 14 noviembre 2026 (SHCWS-139)

- Al enviarse una ficha (nueva o con cambios), cada miembro activo de `solution_reviewers` recibe un correo con el enlace a la postulación en ops. Lo envía el producto con `after()`; no lleva el correo privado de la ficha.
- Cada mañana, el cron de correo (`/api/internal/mail`) manda un resumen de lo pendiente: fichas en revisión y reportes abiertos de fichas, reseñas, comunidad y comentarios, lo más antiguo primero y marcado con ⚠ lo que pasó del tiempo prometido (`SOLUTION_REVIEW_TARGET_HOURS`, o 48 h sin la variable). Si no hay nada pendiente, no sale.
- Solo en producción o con `REVIEW_ALERTS=1` (docs/env.md): la base de desarrollo tiene revisores reales.
- La cola de postulaciones ya muestra la antigüedad de cada ficha («Actualizada»).
- Código: `src/lib/review-queue/alerts.ts`.

## Demanda de búsquedas — 14 noviembre 2026 (SHCWS-107)

`/panel/demanda`: búsquedas de los últimos 7 días (total, sin resultados, terminadas en una
ficha, distintas), las 20 sin resultados más frecuentes, las 20 más buscadas y la tendencia
de las últimas 8 semanas. Lee `search_demand` (`db/search-demand.sql`), que el producto llena
con una baliza en `/buscar`, el buscador del inicio y las páginas de categoría
(`src/components/search/search-demand-beacon.tsx`, `POST /api/search-demand`): agregado por
día y consulta normalizada, sin cuenta, dirección ni identificador; nada con DNT/GPC; nunca
guarda algo que parezca correo, teléfono o URL (`src/lib/search/demand.ts`). Retención de
400 días en el mantenimiento diario. Sin la tabla, la página lo dice.

### Alertas activas por tema (SHCWS-175)

Sección de solo lectura en `/panel/demanda`, junto a las búsquedas: las alertas de
búsqueda guardadas por los compradores (`search_alerts`, SHCWS-47) agrupadas por tema
(dónde se crearon —búsqueda, categoría, industria o colección—, su slug y su etiqueta
legible, que ya lleva palabras y filtros, p. ej. «Nómina · Retail»). Por tema: número de
alertas, cuentas distintas, coincidencias en 30 días (fichas distintas anunciadas, nunca
las que ya existían al crear la alerta) y última coincidencia. Arriba: alertas, cuentas,
temas y temas sin coincidencias en 30 días, que es a quién invitar. Ordena por alertas
(por defecto), cuentas, coincidencias o última coincidencia, en ambos sentidos
(`?orden=&dir=`), máximo 100 temas. Solo conteos: la consulta (`alertTopics`,
`ops/src/lib/data/demand.ts`) nunca devuelve `owner_id`, correos ni identificadores de
alerta; las cuentas suspendidas no cuentan. Sin la tabla, la sección lo dice y el resto de
la página sigue. Prueba: `tests/integration/ops-reminders-alerts.cjs`.

## Solicitudes sin respuesta — 14 noviembre 2026 (SHCWS-61)

`/panel/contactos` gana la tarjeta «Sin respuesta del fundador»: solicitudes abiertas que
el destinatario no ha tocado en más de 48 h y las marcadas «sin respuesta» a los 7 días
(`contact_requests.unanswered_at`, docs/contacts.md), la espera más larga primero (50).
Por fila: proyecto, fundador (destinatario), estado, etapa (más de 48 h, recordatorio de
48 h, de 5 días o «sin respuesta», según los avisos que escribió el cron), días sin
respuesta, fecha y la línea de tiempo de estados. Arriba: cuántas siguen sin respuesta,
cuántas se marcaron en 30 días y cuántas se respondieron después de marcarse. Solo
metadatos, como el resto de Contactos: nunca `details`, mensajes ni el comprador
(`awaitingReply`, `ops/src/lib/data/contacts.ts`). Sin `db/contact-reminders.sql`, la
tarjeta lo dice y la página carga.

## Interacciones sospechosas — 14 noviembre 2026 (SHCWS-141)

`/panel/fraude` busca multicuentas en me gusta, comentarios y reseñas de fichas y en me
gusta, guardados y comentarios de listas públicas, en los últimos 7, 30 o 90 días. Las
señales son motivos para mirar, nunca veredictos: un lanzamiento compartido en un grupo
también trae cuentas nuevas en ráfaga. Nada de esto aparece en el producto ni en
`/criterios`.

- **Señales por ficha o lista**: cuentas creadas juntas que interactúan con lo mismo,
  ráfaga de cuentas distintas en poco tiempo, cuentas que interactúan en sus primeras horas
  y son la mayoría, y varias cuentas con la misma cadena de navegador (débil: los
  navegadores populares la comparten). **Por cuenta**: correo de un proveedor de buzones
  temporales (lista propia en el código, sin servicios externos) y sesiones desde un
  navegador sin interfaz, una librería HTTP o un bot declarado.
- Detectores y umbrales: `ops/src/lib/fraud.ts` (funciones puras, con pruebas en
  `tests/fraud.test.ts`); datos: `ops/src/lib/data/fraud.ts`. La actividad del dueño sobre lo
  suyo no cuenta ni es señal.
- **Solo datos que ya existen**: fecha de registro, dominio del correo, user agent de
  `auth_sessions` y hora de cada interacción. Sin IP (§49). Los guardados de fichas
  (`buyer_saved_projects`) no entran: qué guardó cada persona es privado también para ops
  (§68). Tampoco notas, propósitos de listas ni contenido de contactos (§44).
- **Neutralizar**: un admin en modo seguro marca una cuenta (o todas las de una ficha con
  «Neutralizar N cuentas») con motivo obligatorio. `POST /api/fraud` (`flag`, `unflag`)
  escribe `account_flags` y una entrada de bitácora por cuenta (`account_flag`,
  `account_unflag`) en la misma sentencia, y pide al producto revalidar el catálogo. No
  puedes marcar tu propia cuenta.
- **Efecto**: `account_flagged()` (`db/account-flags.sql`) hace que sus me gusta,
  guardados, comentarios y reseñas pesen 0 en el orden del catálogo, en «Top de la semana» y
  en «Populares» de comunidad. Lo que hizo sigue visible y la persona no recibe aviso.
  Quitar la marca lo devuelve; el historial se conserva.
- La ficha de la cuenta en Cuentas muestra la marca, su motivo y los botones para marcar o
  quitarla. Los revisores ven el panel; solo un admin actúa.
- Verificado contra `neondb` con cuentas `@example.invalid` y un ops local: el anillo de
  prueba subía su ficha por encima de otra y su lista por encima de otra; al marcarlo,
  ambas bajan, los contadores visibles no cambian y quitar la marca restaura el orden.

## Perfiles públicos — 17 noviembre 2026 (SHCWS-120)

Detalle del producto en [public-profiles.md](public-profiles.md). En la ficha de cuenta
(`/panel/cuentas/<id>?tab=comunidad`), tarjeta «Perfil público» con su enlace, estado (activo,
apagado por su dueño u oculto por ops con su motivo), cuántas fichas y listas muestra,
cuántas personas lo siguen (solo el número) y sus enlaces anteriores. El encabezado de la
cuenta muestra una insignia «Perfil /c/<enlace>».

`POST /api/profiles`, con motivo de 10 caracteres o más; el cambio, la bitácora y el aviso al
dueño (categoría `account`, enlace a Ajustes) van en una sola sentencia:

- `hide` / `unhide` (cualquier miembro de ops): el perfil deja de verse (el middleware tarda
  hasta un minuto en responder 404) o vuelve a verse si su dueño lo tiene activo. El dueño
  lee el motivo en Ajustes. Fichas y listas no cambian. Bitácora: `profile_hide`,
  `profile_unhide`.
- `force_handle` (solo admin): enlace nuevo con las mismas reglas del producto
  (`ops/src/lib/profiles.ts`, copia de `src/lib/profiles/handle.ts`). El anterior va a
  `profile_handle_blocks`: no redirige y nadie puede volver a usarlo. Bitácora:
  `profile_force_handle` con `from` y `to`.
- «Despublicar todo» de una cuenta también oculta su perfil, con el mismo motivo.

Ops nunca edita el nombre, la bio ni los enlaces del perfil: si algo no cumple, se oculta.
Liberar un handle bloqueado es una operación manual en la base (`DELETE FROM
profile_handle_blocks WHERE handle = …`), registrada aparte.

## Newsletter — 17 noviembre 2026 (SHCWS-124/125)

Contrato completo en [newsletter.md](newsletter.md). Lo que toca a ops:

- **Ops no envía correos.** Escribe y audita las campañas en su propia base y pide al producto
  previsualizar, probar y enviar por `POST /api/internal/newsletter` con
  `Authorization: Bearer OPS_NEWSLETTER_SECRET` (mismo valor en los dos proyectos) y
  `PRODUCT_APP_ORIGIN`. Sin ellos se escriben borradores, pero no se prueban ni se envían, y
  Sistema lo marca.
- **Todo es de admin.** Crear, editar, probar y continuar: admin. Enviar y cancelar: admin +
  modo seguro + motivo (y escribir ENVIAR en la interfaz). Pedir confirmación a las
  suscripciones anteriores y dar de baja por solicitud: admin + modo seguro.
- **Prueba obligatoria.** Cada guardado crea una versión; «Enviar» solo funciona si la última
  prueba fue de esa misma versión (`tested_version = version`, comprobado en la sentencia).
- **Bitácora en la misma sentencia** para crear, editar, probar, enviar, cancelar y dar de baja
  (`newsletter_campaign_*`, `newsletter_unsubscribe`); `newsletter_campaign_resume`,
  `newsletter_weekly_draft`, `newsletter_weekly_refresh` y `newsletter_reconfirm` se registran
  justo después de que el producto acepta la petición.
- **Vista previa** en una pestaña aparte servida por ops con `Content-Security-Policy: sandbox`
  (sin scripts, origen opaco, imágenes solo por https): una campaña nunca actúa dentro de ops.
- **Privacidad:** ops ve correos, estado, motivo de baja y totales; nunca quién hizo clic (no se
  registra). Fuera de producción el producto solo escribe a `@resend.dev` y la vista previa lo
  dice.

## Canales y embudos — 17 noviembre 2026 (SHCWS-109/110/111)

- `/panel/canales`: visitas por canal (buscadores, IA, redes, newsletter, correos,
  insignia, compartido, invitación, otros sitios, pago, otras campañas, directo), fuentes
  y campañas, sitios que muestran la insignia (`ref=badge`, por dominio), otros sitios que
  enlazan y dónde aterrizan buscadores e IA, con los registros de cada canal.
- `/panel/embudos`: embudos del comprador y del fundador por semana y canal, con la
  conversión de cada paso. Pasos de visitas: totales de `traffic_daily`; pasos de cuentas:
  la cohorte de la semana y hasta dónde llegó hasta hoy.
- Métricas norte: la 5 (buscadores e IA) ya sale de `traffic_daily`; la 1 muestra los
  briefs atendidos cuando existe `buyer_briefs` y «sin datos todavía» si no.
- Ficha de cuenta: «Origen de alta».
- Solo metadatos (§44): si una cuenta guardó, escribió o recibió respuesta, nunca qué.
  Contrato completo: docs/attribution.md. Sin `db/traffic-attribution.sql` ambas
  pantallas dicen que falta la migración.
