# Newsletter: doble opt-in, campañas y «Nuevo esta semana»

Estado 17 de noviembre de 2026 (SHCWS-124 y la parte de correo de SHCWS-125). Describe lo que
hace el código; no certifica la configuración de Vercel ni de Resend. Migración:
`db/newsletter-sending.sql`. Sustituye lo que [newsletter-auth.md](newsletter-auth.md) decía de
que el newsletter «no envía correos».

## Resumen

1. **Alta con doble opt-in.** El formulario de `/newsletter` guarda la dirección sin confirmar y
   manda un correo con un enlace de confirmación. Nada más llega a esa dirección hasta que
   confirma.
2. **Campañas desde ops.** Un admin escribe la campaña en `/panel/newsletter/campanas`, la
   previsualiza, manda una **prueba obligatoria** de esa versión exacta y la envía a las
   suscripciones confirmadas del segmento elegido. El producto renderiza y envía; ops nunca
   manda correos.
3. **Clics agregados, sin píxel.** Cada enlace pasa por `/api/newsletter/click`, que suma uno al
   total de ese enlace en esa campaña (nunca quién hizo clic) y redirige. No hay píxel de
   apertura.
4. **Bajas, rebotes y quejas.** Baja en un clic desde el correo (RFC 8058) o desde la página; un
   webhook firmado de Resend da de baja ante un rebote permanente, una supresión o una queja de
   spam.
5. **«Nuevo esta semana».** El cron diario prepara el borrador semanal con las fichas que
   muestra `/nuevo`. Es solo un borrador: sale cuando alguien lo revisa, lo prueba y lo envía.

## Doble opt-in

- `POST /api/newsletter` valida igual que antes (correo, perfil, rol, consentimiento,
  honeypot, mismo origen, 2 KB, 5 intentos por red+correo en 4 h) y llama
  `requestNewsletterConfirmation` (`src/lib/newsletter/confirm.ts`).
- Una dirección nueva se guarda sin confirmar (`confirmed_at` NULL) con perfil, rol e idioma de la
  página (`locale`). **Una existente no cambia:** lo que se pidió en el formulario viaja en el
  token y solo se aplica cuando su dueño confirma. Así un formulario público nunca sobrescribe a
  otro suscriptor (regla que ya existía en [newsletter-auth.md](newsletter-auth.md)).
- Como máximo un correo de confirmación cada 10 minutos por dirección (`confirm_sent_at`), quien
  sea que llene el formulario. A una dirección ya confirmada y activa no se le escribe.
- La respuesta es la misma en todos esos casos: el formulario no revela si una dirección está en
  la lista. Si el correo no pudo salir, responde 503 y libera el reintento (sin éxito simulado).
- Token: 32 bytes aleatorios en base64url; solo se guarda su SHA-256 en
  `newsletter_confirmations`, con 7 días de vigencia y **un solo uso**. Al confirmar se queman
  los demás tokens pendientes de esa dirección.
- El enlace lleva el token en el **fragmento** (`/es/newsletter/confirm#token=…`), fuera de logs y
  referrers. La página lo lee una vez, lo quita de la barra y pide **un clic** para confirmar
  (`POST /api/newsletter/confirm`): los escáneres de correo que abren enlaces no suscriben a
  nadie y un GET nunca cambia nada (CLAUDE.md §5).
- Confirmar pone `confirmed_at`, borra una baja anterior (re-suscribirse es legítimo porque se
  probó la propiedad del correo) y registra la versión de consentimiento `newsletter-v3`.

### Suscriptores anteriores al doble opt-in

Decisión conservadora: **se quedan sin confirmar y no reciben campañas** hasta que confirmen.
`/panel/newsletter` muestra cuántos nunca recibieron el correo de confirmación y un admin puede
pulsar «Pedir confirmación» (modo seguro): el producto les escribe **una sola vez** («¿Sigues
queriendo recibir el newsletter de shwcs?»), 200 por llamada. Quien no confirme simplemente no
recibe campañas; su registro de consentimiento se conserva como antes. En `neondb` había 0
suscriptores al aplicar la migración; en producción, revisar el número antes de pedirlo.

## Campañas

### Contenido

Una campaña (`newsletter_campaigns.content`) tiene versión en español (obligatoria) y en inglés
(opcional; sin ella, quien eligió inglés recibe la de español), cada una con asunto, texto de
vista previa, título y cuerpo, más fichas opcionales (las del borrador semanal).

El cuerpo es **texto con un Markdown mínimo**, nunca HTML: párrafos separados por una línea en
blanco, `## subtítulo`, listas con `- `, `**negritas**` y `[texto](https://…)` o
`[texto](/es/ruta)`. `src/lib/newsletter/content.ts` escapa todo y solo construye su propio
marcado; un enlace que no sea http(s) o una ruta del sitio se queda como texto y bloquea la
prueba. Las fichas son copias de las publicadas, con las palabras de cada fundador (no se
traducen ni se editan en ops; solo se quitan).

### Segmentos

`segment = {profiles, roles}`; listas vacías = todas las confirmadas. La función SQL
`newsletter_in_segment(profile, role, segment)` es la misma para el worker y para los conteos de
ops. Las suscripciones anteriores a la segmentación (perfil NULL) solo entran en campañas sin
filtro de perfil.

### Versiones y prueba obligatoria

- Guardar en ops incrementa `version` (CAS sobre la versión que se editaba).
- «Enviar prueba» manda **cada idioma** de esa versión exacta a una dirección (por defecto la del
  operador): asunto «[Prueba vN] …», un aviso arriba, enlaces con `p=1` (no cuentan) y una baja
  sin token (no hace nada). El producto devuelve la versión enviada y ops la guarda en
  `tested_version` en la misma sentencia que su entrada de bitácora.
- «Enviar» solo pasa a `queued` si `tested_version = version` (también se comprueba en la
  sentencia). Editar después de probar exige otra prueba.
- Enviar y cancelar piden **admin + modo seguro + motivo**; en la interfaz, además, escribir
  ENVIAR. Todas las acciones escriben `ops_audit_log` en la misma sentencia que el cambio
  (`newsletter_campaign_create/update/test/send/cancel`), salvo las que solo piden algo al
  producto (`resume`, `weekly_draft`, `reconfirm`), que se registran justo después.

### Por qué un worker propio y no Resend Broadcasts

Se eligió enviar con la **API de lotes de Resend** (`POST /emails/batch`, hasta 100 correos por
petición) desde un worker propio:

- **Una sola fuente de verdad.** Broadcasts envía a «contactos» de una audiencia de Resend:
  habría que copiar ahí cada suscriptor, su confirmación, su perfil, rol e idioma, mantener la
  copia sincronizada (la API de contactos tiene su propio límite) y conciliar las bajas en dos
  sitios. Con el worker, la base de shwcs decide quién recibe qué.
- **Clics propios y sin píxel.** El seguimiento de Broadcasts es el de Resend (redirección por
  su dominio y píxel de apertura si se activa en el dominio, lo que afectaría también a los
  correos transaccionales). La redirección propia cuenta totales por enlace y respeta lo que
  promete Privacidad.
- **Baja firmada por persona** y en el idioma de cada quien, con nuestra página y nuestro token.
- **Vercel Hobby (§79).** No hace falta otro cron: ops pide el envío al producto
  (`POST /api/internal/newsletter`, `run`), que responde 202 y envía con `after()` dentro del
  límite de 300 s (presupuesto de 240 s; con la API de lotes son miles de correos por llamada).
  El cron diario de correo (`/api/internal/mail`) es el reintento: retoma lo que quedara.
- **Idempotencia y reintentos.** Al empezar, la audiencia se congela en `newsletter_deliveries`
  (una fila por destinatario, PK campaña+correo) agrupada en lotes de 100 que no cambian. Cada
  petición lleva `Idempotency-Key: nl:<campaña>:<lote>:<hash de sus destinatarios>`: si una
  respuesta no llega (timeout, 5xx), el reintento con la misma clave no duplica nada dentro de
  las 24 h de Resend. Un lote reintentado conserva sus destinatarios aunque alguno se haya dado
  de baja entretanto (si no, cambiaría la clave y podría duplicar a los demás); quien se da de
  baja antes del primer intento se omite. Intentos inciertos de más de 23 h o con 5 intentos se
  marcan `failed` en vez de arriesgar un duplicado. Un 429 detiene la corrida (cuota diaria del
  plan gratuito: reintenta en 1 h); un 4xx marca el lote como fallido.

### Envío

- `processNewsletterQueue` (`src/lib/newsletter/send.ts`) pasa las campañas `queued` a `sending`
  congelando la audiencia (confirmadas, activas, del segmento, en ese momento), envía lote por
  lote y la marca `sent` cuando no queda nada pendiente.
- Cada correo lleva `List-Unsubscribe` (POST de un clic + `mailto:hola@shwcs.site`),
  `List-Unsubscribe-Post: List-Unsubscribe=One-Click` y las etiquetas `kind=newsletter` y
  `campaign=<id>` para atribuir los eventos del webhook.
- Sin `NEWSLETTER_UNSUBSCRIBE_SECRET` no sale ninguna campaña (no habría baja en un clic).
- **Fuera de producción** (`VERCEL_ENV` distinto de `production`) las campañas y las
  reconfirmaciones solo se escriben a direcciones `@resend.dev`: la base de desarrollo es
  compartida y nunca debe escribir a una persona real por accidente. La prueba y la
  confirmación que alguien pide para sí no tienen ese límite. Ops lo indica en la vista previa.
- «Continuar envío» vuelve a pedir el envío si una campaña se quedó en `queued`/`sending`
  (por ejemplo, si el producto no respondió al encolarla). «Cancelar» detiene lo pendiente; lo
  enviado no se recupera.

## Clics

`GET /api/newsletter/click?c=<campaña>&l=<posición>`: la posición indexa `campaignLinks()`, una
lista fija de los enlaces de la campaña guardada (español, sus fichas, inglés, sus fichas). El
destino sale de la base, **nunca del query**: no es un redireccionador abierto. Suma uno a
`newsletter_link_clicks(campaign_id, link)` solo si la campaña está `sending` o `sent` y sin
`p=1`; 120 por red cada 10 minutos. Responde 303 con `Referrer-Policy: no-referrer`. Los filtros
de seguridad de algunos correos (que abren enlaces) inflan los totales: ops lo advierte.

## Bajas, rebotes y quejas

- `POST /api/newsletter/unsubscribe?token=…&c=…` desde el botón del cliente de correo (sin Origin
  nuestro) o `{token, campaign}` desde `/[locale]/newsletter/unsubscribe` (mismo origen). Solo
  cambia una suscripción activa; guarda el motivo (`one_click` o `link`) y suma una baja a la
  campaña si esa dirección la recibió. Respuesta idéntica para direcciones conocidas y
  desconocidas.
- Desde ops, «Dar de baja» (admin + modo seguro + motivo) para las solicitudes por correo que
  promete Privacidad (motivo `request`).
- `POST /api/webhooks/resend` verifica la firma Svix con `RESEND_WEBHOOK_SECRET` sobre el cuerpo
  crudo (HMAC-SHA256 de `id.timestamp.cuerpo`, tolerancia de 5 minutos, cualquier entrada `v1`
  válida); sin el secreto responde 503. Cada `svix-id` se aplica una vez
  (`resend_webhook_events`, en la misma sentencia):
  - `email.delivered` → `delivered_at` y contador de la campaña.
  - `email.bounced` con `bounce.type = Permanent` y `email.suppressed` → baja «bounce».
  - `email.complained` → baja «complaint».
  - Un rebote `Temporary` no da de baja.
  - Un rebote o una queja de **cualquier** correo de shwcs (también transaccional) da de baja el
    newsletter de esa dirección: enviar menos es el lado seguro. Las preferencias de avisos de la
    cuenta no cambian.

## «Nuevo esta semana» por correo (SHCWS-125)

- `createWeeklyNewsletterDraft` (`src/lib/newsletter/weekly-draft.ts`) usa la misma lista que
  `/nuevo`: `splitNewListings(publicProducts()).current`, fichas cuya primera aprobación cayó en
  los últimos siete días, de la más reciente a la más antigua, nunca por votos.
- Crea **un borrador por semana** (`week` = lunes en hora de Ciudad de México, índice único) con
  asunto, intro y enlace a `/nuevo` en español e inglés, y las fichas con su nombre, categoría y
  un resumen del problema escrito por el fundador.
- Lo crea el cron diario de correo la primera vez que hay fichas nuevas en la semana, o un admin
  con «Borrador de Nuevo esta semana». «Actualizar fichas» lo rehace con las fichas del momento
  (nueva versión, nueva prueba).
- **Nada sale sin revisión humana**: el cron solo inserta el borrador; enviarlo exige la prueba y
  el envío desde ops como cualquier campaña.
- El aviso al fundador «Tu ficha está en Nuevo esta semana» sigue pendiente (va con las
  notificaciones, ver el comentario de SHCWS-125).

## Retención

- `newsletter_confirmations`: se borran un día después de vencer.
- `newsletter_deliveries` (a quién se envió cada campaña, cuándo y si se entregó, rebotó o hubo
  queja): 12 meses después de terminar o cancelarse la campaña. Se borran en cascada si se
  elimina la suscripción.
- `resend_webhook_events`: solo id y tipo, 30 días.
- Los contadores de la campaña y los clics por enlace son agregados y se conservan.
- La limpieza corre en el cron diario de correo.

## Variables

- `OPS_NEWSLETTER_SECRET` (nueva, **mismo valor** en `shwcs` y `shwcs-ops`, 32+ caracteres):
  autoriza a ops a previsualizar, probar y enviar.
- `RESEND_WEBHOOK_SECRET` (nueva, solo `shwcs`): secreto de firma `whsec_…` del webhook de Resend.
- Ya existentes: `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_APP_ORIGIN`,
  `NEWSLETTER_UNSUBSCRIBE_SECRET`, `PRODUCT_APP_ORIGIN` (ops). Detalle en [env.md](env.md).

## Puesta en marcha

Hecho el 18 de noviembre de 2026:

- `db/newsletter-sending.sql` aplicada en `shwcs_production` con el rol propietario. Verificado:
  seis tablas, columnas nuevas, la función `newsletter_in_segment()`, permisos
  SELECT/INSERT/UPDATE/DELETE y EXECUTE del rol `shwcs_app_production` (leyendo como ese rol) y
  datos sin cambios (1 suscriptor, sin confirmar; 6 cuentas; 7 fichas).
- Webhook creado en Resend para `https://shwcs.site/api/webhooks/resend` con
  `email.delivered`, `email.bounced`, `email.complained` y `email.suppressed`, **desactivado**:
  hasta que exista la ruta en producción y su secreto, cada evento fallaría y Resend acabaría
  desactivándolo solo.
- Comprobado en Resend: dominio `shwcs.site` verificado, seguimiento de aperturas y de clics
  **apagado**.
- La cuenta de Resend está en el **plan gratuito** (sus respuestas traen las cabeceras
  `x-resend-daily-quota` y `x-resend-monthly-quota`, que solo existen en ese plan; el 18 nov
  marcaban 59 y 136). La cuota es de toda la cuenta: una campaña grande puede agotarla y frenar
  también los correos transaccionales (recuperación, verificación, avisos) hasta el día siguiente.
  Con más de unas decenas de suscriptores, pasar a un plan de pago antes de enviar. Si se agota, el
  worker pausa el envío una hora y lo retoma solo.

Pendiente (André):

1. Desplegar el código (rama integrada en `main`).
2. `OPS_NEWSLETTER_SECRET` en `shwcs` y `shwcs-ops` (Vercel, equipo `mxfounders`), **mismo valor**
   (`openssl rand -hex 32`), Production y Preview, sensitive; redeploy de ambos. Sin él, ops escribe
   borradores pero no los prueba ni los envía.
3. En Resend → Webhooks, abrir el webhook de `shwcs.site/api/webhooks/resend`, copiar su
   signing secret (`whsec_…`) a `RESEND_WEBHOOK_SECRET` en `shwcs` (sensitive), redeploy y
   **activar** el webhook.
4. Pedir confirmación al suscriptor anterior desde `/panel/newsletter` («Pedir confirmación»).
5. Primera campaña: borrador → prueba a tu correo → enviar.
6. Revisión legal de los cambios en Privacidad (SHCWS-144) y decidir si es un cambio material (la
   política promete avisar con 15 días a los suscriptores activos).

## Verificación (17 nov 2026)

- `tests/newsletter-sending.test.ts`: escape y enlaces del cuerpo, lista de enlaces estable,
  correos renderizados (clics contados, baja, inglés y respaldo en español), prueba marcada,
  render determinista y clave de idempotencia, lectura estricta de contenido y segmentos, firma
  Svix con el vector publicado por Svix, efectos de cada evento, borrador semanal, enlace de
  confirmación en el fragmento, guarda fuera de producción y protección de las rutas.
- Recorrido de punta a punta contra `neondb` y los dos servidores locales con suscriptores
  `delivered+…@resend.dev` y una sesión de ops temporal; resultados en el comentario de
  SHCWS-124. Datos de prueba borrados al terminar (la bitácora de ops es de solo inserción y
  conserva sus entradas).
