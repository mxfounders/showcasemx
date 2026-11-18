# «Publica tu necesidad» — briefs, propuestas y lista corta (SHCWS-58/60)

Noviembre de 2026. El comprador describe lo que necesita; los fundadores cuyas fichas
publicadas encajan lo ven y pueden enviar una propuesta; el comprador las compara y elige
con quién hablar, y eso abre una solicitud de contacto normal. El equipo atiende las
necesidades desde ops y puede mandar una lista corta. Migración `db/buyer-briefs.sql`.

## Recorrido

1. **Entradas.** «Publica tu necesidad» reemplaza a «Cuéntanos qué necesitas»
   (`/contacto?motivo=find`, §75) en: búsqueda sin resultados (`/buscar` y el buscador del
   inicio), tarjeta de categoría con pocos proyectos (inicio y explorador), categorías sin
   resultados (`/explorar`, `/industria`, `/colecciones`) y la salida al final de cada ficha
   («Busco algo parecido a {nombre}»). Todas llevan a
   `/account/briefs/new?necesidad=…&categoria=…` (`briefHref`, `src/lib/briefs/links.ts`):
   una línea de hasta 200 caracteres y una categoría conocida, nada más. Requiere cuenta:
   `authReturnTo` reconstruye ese destino desde cero, así que la intención sobrevive al
   acceso o al registro sin aceptar otros parámetros. `contactBriefHref` sigue existiendo
   para el formulario de contacto general y los correos de recordatorio.
2. **Brief** (`BriefForm`): qué necesita (20–2000), categorías (1–3), capacidades (0–8,
   solo de las categorías elegidas), industria y país opcionales, tamaño de empresa y plazo
   obligatorios, presupuesto opcional. Sugerencias de un clic desde el propio texto
   (`suggestCategories`, `suggestCapabilityIds`, `suggestIndustries`); nada se marca solo.
   El plazo usa los mismos valores que la solicitud de contacto y el tamaño la misma escala
   que las fichas, para poder prellenar el contacto al elegir.
3. **Revisión y consentimiento `brief-v1`.** Antes de publicar se muestra exactamente lo
   que verán los fundadores (`BriefFacts`) y una casilla: los fundadores cuyas fichas
   encajan la ven sin nombre, empresa ni correo; el equipo de shwcs la lee para atenderla;
   al elegir una propuesta se envía una solicitud de contacto que se revisa antes. Se
   guarda `consent_version` y `consent_at`. El texto pide no escribir datos de contacto en
   la descripción.
4. **Coincidencia** (`briefFit`/`pickMatches` en `src/lib/briefs/model.ts`,
   `matchBriefs` en `server.ts`): la categoría es obligatoria; lo declarado cierra la
   pregunta (§54) — industria, tamaño o capacidades declaradas que dejan fuera al brief
   excluyen la ficha; lo nunca declarado no excluye, solo pesa menos (capacidades no
   declaradas se infieren con `matchCapability`). Nunca la ficha del propio comprador ni
   de cuentas suspendidas. Hasta 25 fichas por brief, las de mejor encaje primero. Corre al
   crear el brief y, desde `/api/internal/catalog-revalidate`, cada vez que ops publica una
   ficha: una ficha publicada después recibe los briefs abiertos que le corresponden. Es
   idempotente (clave primaria por brief y ficha).
5. **Aviso al fundador**: uno por fundador y brief (`brief-match:<brief>:<fundador>`),
   «Una empresa busca algo que encaja con {ficha}», con correo inmediato (`after()` +
   `deliverNotifications`) si tiene el correo confirmado y la preferencia `brief_email`
   encendida. El correo trae categorías, tamaño, plazo, presupuesto y un extracto del
   problema; nunca quién es el comprador.
6. **Necesidades** (`/account/needs`, grupo «Publicar» de la sidebar): los briefs que
   alguna ficha publicada propia encajó, con su estado y si ya propuso o lo eligieron. El
   detalle (`/account/needs/[id]`) muestra el brief sin datos del comprador y el formulario
   de propuesta: desde qué ficha (si encajaron varias), cómo lo resolvería (20–2000),
   precio estimado y plazo (texto, hasta 200). Una por fundador y brief, no editable. Un
   brief que ninguna ficha propia encajó, o que ops ocultó, es 404.
7. **Comparar y elegir** (`/account/briefs/[id]`, «Mis necesidades» en el grupo
   «Comprar»): las propuestas lado a lado en una tabla semántica con scroll horizontal
   contenido (como el comparador, §3): precio, plazo, propuesta, si la ficha atiende su
   tamaño (`sizeFit`) y fecha. «Elegir y escribirle» abre
   `/account/briefs/[id]/choose/[propuesta]`: el mismo `ContactForm` de siempre, prellenado
   con el brief (tamaño, plazo, presupuesto, necesidad) y nombre/empresa del perfil, con su
   revisión y su consentimiento `contact-v1`. `/api/contacts` recibe `briefId` y, tras
   `createContact`, marca la propuesta (`chosen_at`, `contact_request_id`). Si ya existía
   una conversación con ese proyecto (UNIQUE comprador/ficha, §9), no se envía otra:
   «Elegir y seguir la conversación» (`choose-existing`) enlaza la propuesta a la existente.
   El fundador elegido ve el enlace a la oportunidad; los demás siguen sin ver nada.
8. **Cerrar**: el comprador puede cerrar el brief (no más propuestas; lo recibido se
   queda). Vence a los 30 días con el mismo efecto.

## Límites

- 3 briefs por cuenta en 24 h y 10 abiertos a la vez, con bloqueo de la fila de la
  cuenta (dos envíos simultáneos no pasan la cuota). Además `securityLimit` por hora:
  10 creaciones, 30 propuestas, 60 cierres/elecciones.
- Correo confirmado obligatorio para publicar: un brief llega a varios fundadores a la vez.
- 10 propuestas por brief, con la fila del brief bloqueada al insertar.
- Reintentos idempotentes: el id del brief y de la propuesta lo genera el navegador.

## Ops: Necesidades (`/panel/necesidades`, SHCWS-60)

- Lista con filtros «Sin atender» (abiertas sin propuestas ni lista corta, la más antigua
  primero), «Abiertas», «Ocultas» y «Todas»; a cuántas fichas llegó, propuestas, lista
  corta y antigüedad. Aviso y ⚠ a las 24 h sin atender; la sidebar cuenta esas.
- «Búsquedas sin resultados por tema»: las búsquedas vacías de 7 días (`search_demand`)
  agrupadas por la categoría o industria a la que apuntan (`groupDemandByTopic` sobre
  `rankTopics`). El vocabulario vive en el producto, así que ops lo pide a
  `GET /api/internal/demand-topics` con la credencial ops→producto
  (`CATALOG_REVALIDATE_SECRET`, `PRODUCT_APP_ORIGIN`); sin ella la tarjeta lo dice y
  enlaza a Demanda.
- Detalle `/panel/necesidades/[id]`: el brief completo y quién lo publicó (enlace a la
  cuenta), a qué fichas llegó, **quién propuso y cuándo** (nunca el mensaje, el precio ni el
  plazo: son del fundador para el comprador) y dos acciones:
  - **Ocultar / volver a mostrar** (motivo obligatorio, lo ve el comprador): los
    fundadores dejan de verlo y no reciben más propuestas.
  - **Lista corta**: 1–3 fichas publicadas (las que ya recibieron el brief primero,
    buscador por nombre) y una nota. Una por brief; id generado en el navegador. Aviso al
    comprador (`brief-shortlist:<id>`) y entrada de bitácora en la misma sentencia; luego
    ops pide al producto enviar el correo ya (`POST /api/internal/brief-notices`, misma
    credencial); si no responde, sale con el cron diario. Los proyectos sugeridos no
    reciben aviso. El comprador la ve en su brief con «Ver ficha» y «Pedir contacto».
- Bitácora: `brief_hide`, `brief_unhide`, `brief_shortlist`. Revisores y admins por igual,
  sin modo seguro (el mismo tipo de trabajo que decidir un reporte).
- Frontera §44 intacta: ops lee el brief porque el comprador lo envió para eso, y sigue
  sin leer `contact_requests.details`, los mensajes ni el contenido de las propuestas.

## Avisos y correo

Categoría nueva `brief` en `account_notifications` con preferencia `brief_email`
(encendida por defecto) en Preferencias de avisos y baja en un clic (§84). Tres avisos:
`brief-match`, `brief-proposal` («{proyecto} te envió una propuesta», sin el mensaje) y
`brief-shortlist`. `loadBriefNoticeEmail` arma cada correo al enviarlo: un brief que se
cerró u ocultó, o una propuesta borrada, se marca `skipped`.

## Privacidad (SHCWS-148, parte de briefs)

- Privacidad (es/en) gana «Necesidades publicadas y propuestas» (`#necesidades`): qué se
  guarda, quién la ve (fundadores que encajan sin datos de contacto, y el equipo), que
  ops la lee a diferencia de las solicitudes de contacto, qué recibe el comprador de una
  propuesta, conservación y borrado. «Analítica» menciona los eventos `brief_created` y
  `brief_proposal_sent` (solo con consentimiento, sin contenido). Pendiente de revisión
  legal humana (SHCWS-144).
- Exportación (`/api/account/export`, clave `briefs`): necesidades publicadas, propuestas
  recibidas, listas cortas y propuestas enviadas; nunca quién está detrás de un brief al
  que se propuso. Lectura propia: una base sin la migración exporta igual.
- Eliminar la cuenta: todo cae en cascada (briefs, coincidencias, propuestas en ambos
  sentidos, listas cortas). La pantalla de eliminación lo enumera si la cuenta tiene
  necesidades o propuestas.
- Conservación: sin borrado automático. Un brief vencido sigue en la cuenta del comprador
  con sus propuestas; definir un plazo de retención queda pendiente (igual que
  conversaciones, SHCWS-148).

## Datos (`db/buyer-briefs.sql`)

`buyer_briefs` (id del navegador, comprador, campos del brief con CHECK, consentimiento,
`expires_at` a 30 días, `closed_at`, `hidden_at`/`hidden_reason`/`hidden_by`),
`buyer_brief_matches` (brief, ficha, fundador; PK brief+ficha), `buyer_brief_proposals`
(una por fundador y brief; FK compuesta a la coincidencia, así nadie propone a un brief
que no se le mostró; `chosen_at`, `contact_request_id` con `ON DELETE SET NULL`) y
`buyer_brief_shortlists` (una por brief, 1–3 fichas, nota). Redefine
`account_notifications_category_check` con `brief` y añade
`notification_preferences.brief_email`. Todo en cascada desde `auth_accounts`.

## Verificación

- `tests/briefs.test.ts`: validación del brief y de la propuesta, capacidad fuera de sus
  categorías, reglas de coincidencia (declarado cierra, no declarado no excluye, límite y
  ficha propia), estados, enlaces y `authReturnTo`, agrupación de búsquedas por tema,
  correo sin datos del comprador y con HTML escapado, baja en un clic y origen/sesión de la
  API.
- `tests/integration/briefs.cjs` contra `neondb` con cuentas temporales (las que reciben
  correo usan `delivered+…@resend.dev`; el resto `@example.invalid` sin confirmar), en tres
  fases para correr con un solo servidor a la vez (`BRIEFS_PHASE=product|ops|finish` y
  `BRIEFS_STATE`) o de una vez con los dos.
