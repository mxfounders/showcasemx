# Analítica de producto, feature flags y errores (PostHog)

Estado al 2 de noviembre de 2026. Proyecto de PostHog 705502, región de EE. UU.

## Regla de consentimiento

PostHog en el navegador solo corre después de que la persona acepta el banner de cookies.
Hasta entonces el SDK ni siquiera se descarga: no hay cookies `ph_`, ni almacenamiento
local, ni peticiones. Rechazar es tan fácil como aceptar (dos botones iguales) y no envía
nada; no hay modo «sin cookies» de respaldo.

- La decisión vive en la cookie técnica `shwcs-analytics` (`granted` | `denied`), seis
  meses, `SameSite=Lax`, `Secure` en HTTPS. La leen el navegador y el servidor.
- «Preferencias de cookies» reabre el banner: al pie de cada página pública y en
  Configuración → Datos. Retirar el consentimiento borra las cookies y el almacenamiento
  `ph_*` y recarga la página para que no sobreviva ninguna instancia en memoria.
- El banner se pinta solo en el cliente (`ConsentBanner`, montado en `[locale]/layout.tsx`):
  leer la cookie en el servidor volvería dinámicas las páginas estáticas.
- Sin `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` y `NEXT_PUBLIC_POSTHOG_HOST` no hay banner ni
  nada que consentir.

## Qué se envía y qué nunca

| Origen | Qué | Consentimiento |
| --- | --- | --- |
| Navegador | Páginas vistas, salidas, clics sin texto (`mask_all_text`, `mask_all_element_attributes`), errores de JS | Sí |
| Navegador en `/account` | `identify(accountId)`: solo el UUID de la cuenta | Sí |
| Servidor | Eventos de producto con `distinctId = accountId` | Sí (cookie de la petición) |
| Servidor | Errores no controlados (`onRequestError`), con patrón de ruta y stack, sin persona ni geoip | No: interés legítimo, sin datos personales |

Eventos de servidor (`captureServerEvent`, se envían con `after()` y nunca cambian la
respuesta): `account_registered`, `signed_in` (`method`), `solution_created`,
`solution_submitted`, `solution_deleted`, `project_saved`, `list_created` (`visibility`),
`community_list_liked`, `contact_created`, `contact_updated` (`status`),
`review_created`/`review_updated` (`rating`), `review_deleted`, `ad_checkout_started`
(`placement`, `scope`).

**Nunca** se envía correo, nombre, notas, propósito de listas, contenido de solicitudes o
mensajes, datos fiscales, ni el texto de los elementos pulsados. `before_send` quita el
`#fragmento` de toda URL porque recuperación y verificación de correo llevan ahí su token
de un uso. La navbar pública no recibe el id ni el correo de la cuenta (§25).

Configuración del cliente (`src/lib/analytics/client.ts`): `defaults: '2026-05-30'`,
`person_profiles: 'identified_only'`, `cross_subdomain_cookie: false` (la cookie no llega a
`ops.shwcs.site`), `capture_exceptions: true`, sin grabación de sesiones ni encuestas.

## Proxy

Todo pasa por `/relay` en el mismo dominio (`next.config.mjs`), así que el navegador nunca
se conecta a `posthog.com`. `skipTrailingSlashRedirect` es necesario para los endpoints de
PostHog; el middleware sigue quitando la barra final de las páginas (308) y excluye
`/relay/`.

## Feature flags

Cargan con el SDK, es decir, solo para quien aceptó. Para el resto, `isFeatureEnabled`
devuelve `undefined`: todo flag debe tener un comportamiento por defecto sensato.

## Archivos

- `src/lib/analytics/consent.ts`: cookie, ruta del proxy, evento de preferencias y
  `withoutUrlFragments` (compartido cliente/servidor, con pruebas).
- `src/lib/analytics/client.ts`: carga diferida, consentimiento, identidad y errores.
- `src/lib/analytics/server.ts`: eventos y errores del servidor (`posthog-node`).
- `src/instrumentation-client.ts`: arranca PostHog si ya hay consentimiento.
- `src/instrumentation.ts`: errores del servidor.
- `src/components/analytics/`: banner, botón de preferencias e identidad de cuenta.
- Políticas: privacidad `#analitica` y cookies `#analitica`, en los dos idiomas.

## Fuera de alcance

`ops/` no tiene PostHog: su CSP es estricta y maneja datos que ni la analítica debe ver.
Tampoco se conectó el «data warehouse» de PostHog a Neon, Resend o Stripe: copiaría
notas, solicitudes y datos fiscales a un tercero (frontera de §44).

## Pendiente

- Variables en Vercel (Production y Preview) y redeploy.
- Borrar la persona en PostHog al eliminar una cuenta (necesita una llave personal de API
  con `person:write`). Hoy la política ofrece pedirlo por correo.
- Plazo de retención de eventos en el proyecto de PostHog; la política no promete uno.
- Revisión legal humana de los cambios en Privacidad y Cookies.
