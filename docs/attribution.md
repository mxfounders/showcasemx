# Canales, origen de alta y embudos

SHCWS-111 (UTM y atribución), SHCWS-109 (embudos) y la métrica norte 5 de SHCWS-110.
Estado al 17 de noviembre de 2026.

## Regla

Saber de dónde llegan las visitas sin cookies de rastreo ni identificadores del
visitante. Las visitas se cuentan en totales por día y canal. Lo único que se guarda
junto a una persona es el **origen de alta** de su cuenta, una vez, al registrarse. Con
DNT o GPC no se cuenta ni se guarda nada. No depende de PostHog (solo corre con
consentimiento): ops lee sus números de la base.

## Convenciones de enlaces

Fuente única: `src/lib/attribution/conventions.ts` (`shareUrl`, `badgeUrl`, `noticeUrl`,
`newsletterUrl`, `socialUrl`, `tagUrl`). Un enlace que ya trae `utm_*` o `ref` conserva
los suyos: aplicarlas dos veces no cambia nada.

| Canal | utm_source | utm_medium | utm_campaign | ref |
| --- | --- | --- | --- | --- |
| Newsletter | `newsletter` | `email` | edición `AAAA-MM-DD` | — |
| Avisos por correo | `shwcs` | `email` | categoría del aviso (`contact`, `solution`, `account`, `weekly`…) | — |
| Redes propias | `linkedin`, `x`, `instagram`… | `social` | campaña libre | — |
| Compartir | `link`, `native`, `linkedin`, `whatsapp`, `x` | `share` | `listing`, `list`, `article` | — |
| Insignia | — | — | — | `badge` |
| Invitación a reseñar | — | — | — | `invite` (implícito en `/resenar/…`) |
| Referidos | — | — | — | código del socio |

Enlaces de salida (ficha → sitio del proyecto, SHCWS-19): `utm_source=shwcs`,
`utm_medium=listing|sponsored`, sin cambios.

Dónde se aplican: compartir una ficha, una lista o un artículo (los enlaces viejos con
`utm_source=share` y la plataforma como medio se siguen leyendo como «Compartido»); el
HTML de la insignia (`?ref=badge` y `rel="noopener"`, así el navegador dice desde qué
sitio llegó); el botón de todo aviso por correo salvo los de seguridad (`composeNotice`)
y la redirección contada del resumen semanal. `newsletterUrl()` queda listo para los
envíos del newsletter (SHCWS-124/125).

## Clasificación

`src/lib/attribution/classify.ts`, pura, con pruebas en `tests/attribution.test.ts`. El
navegador envía solo las señales de la página donde empezó la visita: `utm_*`, `ref`, el
dominio (nunca la ruta) del sitio que enlazó y el tipo de página. El servidor normaliza
y clasifica en este orden:

1. `ref`: `badge` → Insignia; `invite` → Invitación; otro → Otros sitios (referido).
2. `utm_*`: medio `share` → Compartido; fuente `newsletter` → Newsletter; medio `email`
   → Correos de shwcs; medios de pago → Pago; fuentes de asistentes (ChatGPT añade
   `utm_source=chatgpt.com`) → IA; redes → Redes; cualquier otra → Otras campañas.
3. Dominio: asistentes de IA, correo web, buscadores, redes, en ese orden
   (`gemini.google.com` y `mail.google.com` no son el buscador); otro → Otros sitios.
4. Nada → Directo.

Etiquetas en minúsculas, sin acentos, solo `a-z 0-9 . _ -`, 60 caracteres; se descarta
lo que parezca correo, teléfono (10 dígitos seguidos) o URL. Dominios sin `www.`, sin
puerto y nunca una IP.

## Conteo de visitas (`traffic_daily`)

`db/traffic-attribution.sql`. Una fila por día (hora del centro de México), paso, canal,
fuente, medio, campaña, sitio y página de llegada. Pasos, una vez por visita: `visit`
(primera página), `browse` (búsqueda, categoría, industria, colección o ficha), `listing`
(ficha) y `apply` (`/aplicar`).

Sin peticiones por página (§79): `VisitTracker` (cliente, en `[locale]/layout.tsx`, las
páginas estáticas siguen estáticas) manda la visita y `browse`/`apply` a
`POST /api/visit`; la vista de una ficha (`/api/metrics`) lleva `browse` y `listing`, y la
visita si aterrizó ahí; la primera búsqueda (`/api/search-demand`) lleva `browse`. Una
petición extra en la llegada (ninguna en una ficha) y como mucho dos más por visita. Bots
que lo declaran en su user agent, otro origen, DNT y GPC no cuentan. Límite de 120 por
hora por red. Se borra a los 400 días (`src/lib/maintenance.ts`).

`src/lib/attribution/visit.ts` guarda en **sessionStorage** (`shwcs-visit`) las señales
de llegada, los pasos ya contados y la hora del último uso. No es una cookie, no tiene
identificador y muere al cerrar la pestaña. Una visita nueva empieza con la pestaña, tras
30 minutos sin páginas, o cuando una carga completa llega desde otra campaña u otro sitio
(recargar o volver atrás no). Descrito en Cookies → «Métricas agregadas sin
identificación».

## Origen de alta (`account_signup_origins`)

Una vez por cuenta: canal, fuente, medio, campaña, dominio de origen, página de llegada e
intención (`founder` si la visita pasó por `/aplicar` o el registro lleva a publicar,
`buyer` si lleva a guardar, contactar o reseñar). Sin IP ni páginas visitadas.

- Contraseña: `AuthForm` manda `origin` con el registro; el servidor lo valida y guarda.
- Google: viaja en el enlace de inicio y en el estado OAuth
  (`auth_google_states.signup_origin`); el callback lo guarda si crea la cuenta.
- Enlace mágico de una invitación a reseñar: canal Invitación.
- DNT/GPC: nada. Cuentas anteriores: «Sin dato».
- En la exportación de datos (`signupOrigin`); se borra con la cuenta.

## Ops

- `/panel/canales`: visitas, exploró, ficha, `/aplicar` y registros por canal; fuentes y
  campañas; sitios que muestran la insignia (por dominio); otros sitios que enlazan; dónde
  aterrizan buscadores e IA.
- `/panel/embudos`: comprador y fundador por semana (lunes a domingo, 8 o 12 semanas),
  filtrables por canal, con conversión de cada paso respecto al anterior. Pasos de
  visitas: totales, no personas. Pasos de cuentas: las cuentas creadas esa semana y hasta
  dónde llegaron hasta hoy; cada cuenta cuenta en todos los pasos hasta el más lejano que
  alcanzó, así el embudo nunca crece. Comprador: … registro → guardó → solicitud,
  «Cuéntanos qué necesitas» desde su correo o brief (`buyer_briefs`, si existe) →
  respuesta del destinatario, mensaje atendido o propuesta/lista corta. Fundador:
  `/aplicar` → registro → onboarding → borrador → enviado → publicado → primera
  solicitud → primera respuesta. «Ambos» está en los dos embudos. La conversión entre
  visitas y cuentas compara conteos de la misma semana, no a las mismas personas.
- Métrica norte 5 en `/panel`: visitas de buscadores e IA del mes contra el mismo tramo
  del anterior; sin comparación antes del primer día contado.
- Métrica norte 1: «briefs atendidos» lee `buyer_briefs` cuando existe (primera propuesta
  o lista corta en el periodo); si no, «sin datos todavía». Enganche:
  `buyerBriefsNorth()` en `ops/src/lib/data/north.ts`.
- La ficha de cada cuenta muestra su origen de alta.

Frontera de §44: ops solo lee si una cuenta guardó, escribió o recibió respuesta, nunca
qué. El correo solo se usa dentro de la consulta para unirla con «Cuéntanos qué
necesitas».

## Límites

- Sin JavaScript, con bloqueadores, DNT o GPC una visita no se cuenta.
- El origen es solo el dominio y a veces nada (apps de mensajería, `noreferrer`): un
  enlace sin etiqueta desde WhatsApp cuenta como Directo.
- Una visita es por pestaña.
- Las semanas recientes se ven peor hasta que sus cuentas tienen tiempo de avanzar.
- Google sin credenciales de producción: el origen por Google solo tiene pruebas
  unitarias.
