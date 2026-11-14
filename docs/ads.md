# Espacios patrocinados (anuncios) — octubre 2026

Un fundador con una ficha **ya aprobada** compra días en un espacio etiquetado
«Patrocinado». Se cobra por tiempo, como Product Hunt o LinkedIn: días × tarifa
diaria, por adelantado, con impuestos añadidos encima. El pago ocurre en shwcs: un
formulario propio con los Elements de Stripe incrustados, sin redirigir a una página de
Stripe (14 nov 2026, ver «Pago en la página»).

## Reglas de producto (no negociables)

1. Siempre etiquetado «Patrocinado / Sponsored» y separado de los resultados orgánicos.
2. Máximo 2 por categoría y día (`ad_placements.slots`), 1 en inicio y 1 en newsletter.
3. Nunca se mezcla con el orden orgánico: `publicProducts()` y `solutionScore()` no
   leen ninguna tabla de anuncios. El espacio se dibuja aparte (`sponsored` en
   `CategoryPageLayout`, bloque propio en la home).
4. Solo fichas con `published_data`: pagar no compra la aprobación. Si la ficha
   pierde la publicación, el espacio deja de mostrarse en la siguiente lectura.
5. Métricas propias y agregadas (`ad_campaign_daily_metrics`): sin cookies, sin
   píxeles, respetando DNT/GPC y sin contar al anunciante. El anunciante solo ve totales.

## Compra

- Ubicaciones: `category` (alcance = slug de una categoría que la ficha declara),
  `home`, `newsletter`. Newsletter no se puede abrir hasta que se envíen campañas
  (`scripts/ad-rates.cjs` exige `--newsletter-is-sending`).
- Días naturales completos en `America/Mexico_City` (`adTimeZone`), de 1 a 90 días,
  con inicio hasta 180 días adelante. `ends_on` es exclusivo.
- Monedas USD y MXN; tarifas en unidades menores en `ad_rates`. La reserva guarda la
  tarifa con la que se vendió.
- Impuestos: `tax_behavior: 'exclusive'` siempre y `automatic_tax` activo. Sin Stripe
  Tax configurado, el checkout responde 503 con «no se hizo ningún cargo» y libera la
  reserva; nunca cobra sin impuestos. `STRIPE_AUTOMATIC_TAX=off` solo para pruebas locales.
- Código de impuesto: `txcd_10701000` («Website Advertising»). Confirmar con contabilidad.

### Comprar en una pantalla (SHCWS-150, 72, 77)

`/account/solutions/[id]/promote` es una sola pantalla. A la izquierda, las decisiones:
ubicación (cada tarjeta con su precio por día y su alcance), categoría, duración con
atajos de 7, 14 y 30 días y un calendario de disponibilidad, moneda y código promocional.
A la derecha, la tarjeta «Patrocinado» tal como saldrá en esa ubicación (el mismo
`SponsoredCardBody` que sirve el espacio, con portada, nombre y texto aprobados) y el
total en vivo: precio × días, descuento, IVA estimado, total y la regla de reembolso.

- **Nada se pide antes de ver precio y alcance.** El perfil fiscal solo se pide al pagar:
  si falta, el botón dice «Continuar» y aparece en la misma página como último paso
  («Guardar y continuar al pago», mismo `billing_profiles`). Con perfil guardado son tres
  clics: «Promocionar» → casilla de consentimiento → «Continuar al pago».
- Una sola casilla: «Compro como empresa o profesional y acepto las condiciones de
  publicidad»; envía `acceptTerms` y `business`, que el servidor sigue exigiendo.
- Moneda inicial: pesos si el país de facturación es México, dólares si es otro; sin
  perfil, según el idioma. Se puede cambiar. IVA estimado: 16 % para México, 0 fuera
  (`estimatedTaxRate`); Stripe Tax decide el final.
- **Calendario** (`AvailabilityCalendar`): días con y sin espacio de `/api/ads/availability`
  (solo cuántos cupos quedan, nunca quién compró). Primer clic, primer día (conserva la
  duración si cabe); segundo, último día. Un rango nunca cruza un día lleno
  (`lastBookableDay`); mientras el comprador no toque las fechas, la ventana por defecto
  se mueve sola a días con espacio. Teclado: flechas, Re Pág/Av Pág, Enter. El cupo se
  vuelve a comprobar en `reserveBooking`, que responde 409 si alguien ganó el día.
- **Alcance**: visitas de los últimos 30 días a la página donde sale el espacio (inicio o
  la categoría), sin contar hoy; si la medición empezó hace menos, «desde el …». Se mide
  con `PlacementBeacon` → `POST /api/ads/reach` → `ad_placement_daily_views`: totales
  diarios, DNT/GPC respetados, sin identificadores. Newsletter no tiene página: sin alcance.
- **Lista de espera**: una ubicación cerrada muestra «Avisarme cuando abra»
  (`POST /api/ads/waitlist`, tabla `ad_waitlist`). Al abrirla (`enabled` de falso a
  verdadero, por `ads:rates` u ops), un trigger deja un aviso `ad:waitlist:…` con enlace a
  la página de Promocionar de esa ficha, también por correo si los avisos de fichas están
  activos y el correo verificado (`listing_notice`). Cada persona se avisa una vez;
  apuntarse otra vez la vuelve a poner en la lista.
- Entradas: botón «Promocionar» en la ficha propia y en cada ficha publicada de Mis
  soluciones; «Para avanzar» del inicio ya lo sugería.

### Códigos promocionales (SHCWS-75)

Se crean en Stripe (Productos → Cupones → código promocional): porcentaje o monto fijo en
la moneda de la reserva, duración «una vez», con límite de usos, vigencia, mínimo o un
cliente concreto si hace falta. Un cupón limitado a productos no aplica (los días se
venden como líneas sueltas). El código lo aplica el servidor, nunca la página de Stripe
(`allow_promotion_codes` queda apagado): `POST /api/ads/promo` lo revisa para mostrar el
descuento (20 intentos por hora y cuenta) y el checkout lo revisa otra vez y lo pasa en
`discounts` (`src/lib/ads/promo.ts`). Una moneda distinta o un mínimo no alcanzado dan
su propio mensaje.

- El descuento sale del subtotal antes de impuestos; Stripe calcula el IVA sobre lo que
  queda. La reserva guarda `discount_amount` y `promotion_code`; `subtotal_amount` sigue
  siendo el precio de lista, así que la comprobación del subtotal al liquidar no cambia.
- Un código del 100 % deja la sesión en `no_payment_required`, sin PaymentIntent:
  `fulfillCheckout` la marca pagada con total 0, no se emite CFDI (no hay importe) y
  cancelarla no reembolsa nada.
- Reembolsos: siguen siendo la parte proporcional de `total_amount`, que ya es neto del
  descuento. Prueba: 30 % sobre 7 días a 169 MXN → cobrado 960.60 MXN; cancelar con seis
  días reembolsables devolvió 823.37 MXN (= ⌊96 060 × 6 / 7⌋) en Stripe.
- CFDI con descuento: una sola línea por la ventana completa al precio neto, para que total
  e IVA coincidan al centavo con el cobro (`cordInvoiceDraft`, `discountAmount`).
- Créditos de días gratis desde ops: no existen todavía; un código del 100 % reservado a un
  cliente hace lo mismo desde Stripe.

### Flujo

1. `POST /api/ads/checkout`: origen, sesión, términos aceptados (`acceptTerms`), compra
   como empresa (`business`), validación (`readCampaignRequest`), código promocional
   opcional, límite de 20/h y datos de facturación completos ([billing.md](billing.md)).
2. `reserveBooking`: candado consultivo por ubicación+alcance y, en la misma
   transacción, comprobación de cupo por día e inserción con estado `checkout`.
   Reserva retenida 31 minutos (lo mismo que la sesión de Stripe).
3. Checkout Session en `ui_mode: 'elements'` (`checkoutSessionParams`): cantidad = días, `booking_id` en la
   sesión, el PaymentIntent y la factura; OXXO y saldo bancario excluidos (no se
   pueden reembolsar o liquidan días después); `adaptive_pricing` desactivado.
4. Webhook o página de regreso (lo que llegue primero) llaman a `settleCheckout`:
   solo marca `paid` si la sesión es la de la reserva y el subtotal y la moneda
   coinciden. Invalida la etiqueta de caché `ads` y guarda el enlace a la factura.
   La página de regreso liquida durante el render, donde Next no deja invalidar
   etiquetas: ahí ese paso se salta (lo hace el webhook, y la caché vence en minutos) y
   la factura se encola igual. Antes de corregirlo, volver de Stripe mostraba «Estamos
   confirmando tu pago» aunque estuviera pagado y no encolaba el CFDI hasta el webhook.

## Reporte del anunciante (SHCWS-70)

`/account/solutions/[id]/promote/[bookingId]`, solo para el dueño de la reserva (404 para
cualquier otra cuenta). Muestra impresiones, clics, CTR, visitas a la ficha, clics al
sitio y solicitudes de contacto; la serie día por día (curva y tabla); lo que llegó
después del último día; y la ficha completa con y sin patrocinio: promedio diario de
visitas y solicitudes en los días patrocinados ya terminados frente a hasta 30 días
previos sin ningún espacio de esa ficha (y posteriores a su primera publicación). Cada
reserva en Promocionar tiene «Ver reporte» y ya muestra CTR, visitas y solicitudes.

Atribución propia, sin cookies ni píxeles:

- El espacio enlaza a `/soluciones/<id>?from=sponsored&ad=<reserva>`. En la ficha,
  `SponsoredVisit` cuenta una visita por pestaña y cada clic al sitio oficial
  (`/api/ads/events`, `visit` y `site`), en `ad_campaign_daily_metrics`. Cuentan desde el
  primer día hasta 7 días después del último servido (`attributionDays`), solo en la
  ficha de esa reserva.
- El enlace de contacto de esa visita lleva `&ad=`, que sobrevive al inicio de sesión
  (`authReturnTo`). Al abrir el formulario con sesión, `SponsoredContactIntent` guarda en
  `ad_contact_intents` cuenta + ficha + reserva, como mucho 7 días. Cuando esa cuenta crea
  la solicitud, un trigger sobre `contact_requests` la apunta en
  `ad_contact_attributions` y borra la intención; si algo falla, la solicitud se crea
  igual, sin atribuir. Es el único dato por persona, dura días y el anunciante solo ve el
  número.
- Se cuentan solo solicitudes de cuentas que abrieron el formulario desde el espacio;
  quien vuelve otro día por su cuenta no cuenta. El método se explica en el reporte.
- Resumen al terminar: el aviso diario «Terminó tu espacio…» (src/lib/ads/notices.ts,
  correo si los avisos de fichas están activos) ahora suma visitas y solicitudes y enlaza
  al reporte.

## Cancelación, retiros y reembolsos

Política comparada con Meta, LinkedIn, X, Reddit, Google, Product Hunt, BuySellAds e
IAB (investigación del 9 de octubre de 2026). Implementada en `firstRefundableDay` y
`refundAmount` (`src/lib/ads/model.ts`):

| Caso | Se reembolsa | Sigue mostrándose |
| --- | --- | --- |
| Anunciante cancela | Cada día que empieza ≥ 24 h después | Los días ya iniciados o que empiezan en < 24 h |
| shwcs retira por decisión propia | Todo lo no servido, incluido hoy | Nada |
| shwcs retira por incumplimiento | Desde mañana (salvo fraude/engaño) | Nada |
| Disputa abierta | Nada fuera del proceso de Stripe | Nada (se pausa) |
| Eliminación de cuenta | Igual que cancelar | — |

- Monto = `floor(total_cobrado × días_reembolsables / días_reservados)`, impuestos
  incluidos en proporción; nunca más de lo pagado ni más de una vez.
- `refund_requested_amount` se guarda **antes** de llamar a Stripe; la clave de
  idempotencia es `refund:<reserva>:<total solicitado>`, así que reintentar repite el
  mismo reembolso y nunca duplica. `refunded_amount` lo confirma el webhook `charge.refunded`.
- Una reserva cancelada guarda `served_until` (exclusivo): los días pagados dentro de
  las 24 h se siguen mostrando.
- `POST /api/account/delete` cancela y reembolsa antes de borrar; si un reembolso
  falla, la cuenta no se elimina. Los registros de pago sobreviven
  (`owner_id`/`solution_id` con `ON DELETE SET NULL`).
- **Ficha retirada (SHCWS-81)**: si el fundador la despublica, sus reservas se cancelan
  como las de cualquier anunciante (SHCWS-32). Si la retira ops, `stopListingBookings`
  (`ops/src/lib/ad-removal.ts`) detiene sus reservas pagadas con días por delante y
  reembolsa sin intervención: «decisión de shwcs» desde hoy, «incumplimiento» desde
  mañana, con la misma regla y la misma clave de idempotencia que un retiro manual.
  - Retiro desde la revisión: el diálogo tiene la casilla «Se retira por
    incumplimiento» (por defecto, decisión de shwcs).
  - Reporte aceptado con «Retirar la ficha»: incumplimiento.
  - «Despublicar todo» de una cuenta: decisión de shwcs.
  El retiro de la ficha nunca espera a Stripe: si un reembolso no se confirma, queda
  registrado y ops lo termina con «Reintentar reembolso»; el mensaje del panel lo dice.
  Cada parada y cada reembolso quedan en la bitácora con `automatic: true`.

## Webhook

`POST /api/webhooks/stripe` verifica la firma sobre el cuerpo crudo y procesa cada
`event.id` una vez (`stripe_events`). Eventos a suscribir en el endpoint:

```
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
charge.refunded
refund.created
refund.updated
charge.dispute.created
charge.dispute.closed
```

Crear el endpoint con la versión de API `2026-09-30.endive` (la que fija el SDK
`stripe@23.0.0` en `src/lib/ads/stripe.ts`).

## Datos

`db/ad-campaigns.sql`: `ad_placements`, `ad_rates`, `ad_campaigns`,
`stripe_customers`, `ad_campaign_daily_metrics`, `stripe_events`.
`db/ad-self-serve.sql` (después de `contact-requests.sql` y `listing-notices.sql`):
`discount_amount`/`promotion_code`, `visits`/`site_clicks` diarios,
`ad_contact_intents`, `ad_contact_attributions` y su trigger, `ad_placement_daily_views`,
`ad_waitlist` y el trigger que avisa al abrir una ubicación. El estado de
`ad_campaigns` solo sigue el pago (`checkout`, `processing`, `paid`, `expired`,
`failed`); cancelación, pausas, reembolsos y disputas tienen columnas propias.

## Rutas y componentes

- API: `/api/ads/checkout`, `/api/ads/cancel`, `/api/ads/availability`,
  `/api/ads/events`, `/api/ads/promo`, `/api/ads/reach`, `/api/ads/waitlist`,
  `/api/webhooks/stripe`.
- Páginas: `/[locale]/account/solutions/[id]/promote` (compra en una pantalla, lista de
  reservas, regreso de Checkout) y `/promote/[bookingId]` (reporte). Botón «Promocionar»
  en la ficha propia y en Mis soluciones.
- Componentes: `src/components/ads/` (`PromoteForm`, `AvailabilityCalendar`,
  `BookingList`, `BookingReportView`, `CancelBookingButton`, `SponsoredSlots` con
  `SponsoredCardBody`, y los contadores de `beacons.tsx`).
- Textos: sección `ads` de los diccionarios. Condiciones legales en
  `/terminos#publicidad`; datos de pago en `/privacidad#pagos`.

## Operación

```bash
npm run db:migrate -- db/ad-campaigns.sql        # una vez por base
npm run ads:rates                                # ver ubicaciones y tarifas
npm run ads:rates -- set category usd 25.00      # tarifa diaria antes de impuestos
npm run ads:rates -- set category mxn 450.00
npm run ads:rates -- enable category             # abrir (requiere tarifa)
```

Emisor: **Flouvia, S.A.S. de C.V.** (decisión del propietario, 14 de noviembre de 2026),
inscrito ante el SAT con IVA. Tarifas de lanzamiento: categoría 9 USD / 169 MXN y inicio
19 USD / 349 MXN por día, antes de impuestos.

### Stripe Tax

- Domicilio fiscal (head office): solo el país, México. Stripe lo acepta y basta para que
  Stripe Tax quede `active`; no hace falta una dirección postal.
- Registro: México, tipo `simplified` (el único que ofrece la API para MX). Con domicilio en
  México Stripe lo trata como venta nacional: IVA 16 % (`standard_rated`).
- Valores por defecto: `tax_behavior: exclusive` y `tax_code: txcd_10701000`.
- Resultado comprobado en el sandbox (14 de noviembre): empresa en México con o sin RFC →
  16 %; empresa de la UE con NIF-IVA → `reverse_charge`, 0; EE. UU. y la UE sin NIF →
  `not_collecting`, 0, porque no hay registro allí. Que el 0 % para clientes extranjeros
  equivalga a exportación de servicios lo confirma el contador (§65 A6).

### Clave restringida (`rk_live_`)

La app solo hace estas llamadas, así que la clave de producción solo necesita:

| Recurso | Permiso | Para qué |
| --- | --- | --- |
| Checkout Sessions | Write | Crear, leer y expirar la sesión de cada reserva |
| Customers | Write | Crear y actualizar el cliente con los datos de facturación |
| Refunds | Write | Reembolsar cancelaciones y retiros |
| Invoices | Read | Guardar el enlace a la factura de Stripe; vista previa de `verify:stripe` |
| Promotion Codes | Read | Revisar el código promocional antes de cobrar |
| Coupons | Read | Leer el descuento del código (se expande con él) |

Todo lo demás en **None**. La firma del webhook se verifica en local y no necesita permiso.

### Puesta en marcha

1. Tax en la cuenta en vivo (arriba). Se puede hacer por API o en Stripe → Impuestos.
2. Webhook en vivo: `https://shwcs.site/api/webhooks/stripe`, versión `2026-09-30.endive`
   y los nueve eventos de arriba. Su secreto se revela en la página del endpoint en Stripe
   y se pega directo en Vercel; no pasarlo por chats ni archivos.
3. Vercel (`shwcs`, Production): `STRIPE_SECRET_KEY` = la clave `rk_live_` y
   `STRIPE_WEBHOOK_SECRET`, ambas como *sensitive*. Nunca `STRIPE_AUTOMATIC_TAX`. Redeploy.
4. `npm run verify:stripe -- --prompt` con la clave `rk_live_`: tiene que salir todo en OK
   (no imprime la clave; tampoco puede ver el webhook ni los ajustes de impuestos con una
   clave restringida, pero sí comprueba el IVA con una vista previa de factura gratuita).
5. Tarifas en `shwcs_production` y, solo al final, abrir las ubicaciones:
   `npm run ads:rates -- set …` / `enable …` con la base de producción.
6. Una compra real pequeña y su reembolso desde la propia cuenta, para ver el webhook,
   la factura de Stripe y el CFDI de punta a punta.

### Desarrollo local

`npm run stripe:listen` reenvía al `localhost:3000` los mismos eventos que el webhook de
producción y deja `STRIPE_WEBHOOK_SECRET` en `.env.local` (sin imprimirlo). Requiere la
CLI de Stripe y una clave de prueba. `npm run verify:stripe` revisa el sandbox.

## Verificación

- Unitarias: `tests/ads-model.test.ts` (validación, zona horaria, regla de 24 h,
  montos, estado visible) y `tests/ads-api.test.ts` (parámetros de Checkout, origen,
  sesión, 503 sin Stripe, DNT/GPC, firmas falsas del webhook).
- Punta a punta contra Stripe en modo prueba y la base de desarrollo (9 de octubre):
  sesión real de Checkout, PaymentIntent real, evento de pago firmado con el secreto
  real, espacio visible solo en su categoría, métricas, cancelación con reembolso real
  confirmado por el webhook de Stripe, sin doble reembolso, cupo 2/categoría/día y
  liberación de reservas. 24/24. El pago en la página alojada se simuló (sin navegador).

- Autoservicio (14 de noviembre, SHCWS-70/72/75/77/150): `tests/ads-self-serve.test.ts`
  y, contra la base de desarrollo, el sandbox de Stripe y un `next dev` aislado, en Chrome
  sin interfaz: compra en una pantalla con código del 30 % pagada en la página alojada
  real (tarjeta 4242), regreso con «Pago confirmado» y factura encolada, cancelación con
  reembolso real de ⌊total × 6/7⌋; código del 100 % pagado sin tarjeta y cancelado sin
  reembolso; paso de facturación en la misma página; calendario con un día lleno (no se
  puede elegir; el servidor responde 409); lista de espera y su aviso; espacio en
  `/explorar/ventas` → impresión, clic, visita, clic al sitio, `ad` conservado al iniciar
  sesión, intención y solicitud atribuida; reporte con serie y comparación; móvil sin
  desbordamiento.

Cada pago y cada reembolso encolan su documento fiscal (CFDI o nota de crédito): ver
[billing.md](billing.md).

## Pendiente

- Detección automática de caídas (regla de 4 h) y días de reposición (SHCWS-179):
  necesita un monitor externo, porque el cron vive en el mismo despliegue que se cae.
- CFDI para clientes mexicanos: construido con Cord ([billing.md](billing.md)); falta
  `CORD_API_KEY` de la cuenta emisora en Vercel.
- Envío del newsletter con menciones patrocinadas.
- Correos de confirmación propios (hoy: recibo/factura de Stripe).
- Créditos de días gratis desde ops y el precio de patrocinador fundador (decisión del
  propietario: qué descuento, para quién y hasta cuándo; se implementa como código).
- Ops todavía no ve `discount_amount`/`promotion_code` ni los reportes.

## Pago en la página — 14 noviembre 2026

Petición del propietario: el pago no redirige a Stripe. La Checkout Session pasa de
alojada a `ui_mode: 'elements'` (antes `custom`, que Stripe ya rechaza) con `return_url`
en lugar de `success_url`/`cancel_url`.

- `POST /api/ads/checkout` ya no devuelve una URL: devuelve el `client_secret` de la
  sesión, su id, la reserva con su versión y los datos de facturación del propio
  comprador para prellenar la dirección. Sin `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  responde 503 y la página no ofrece comprar: nada podría cobrar.
- `src/components/ads/checkout-payment.tsx` monta, con la apariencia de shwcs, la
  dirección de facturación, el identificador fiscal opcional y el Payment Element, y el
  total que calcula Stripe (descuento e impuestos incluidos). «Pagar» confirma en la
  misma página (`redirect: 'if_required'`); una tarjeta con 3-D Secure abre el marco de
  Stripe. Al terminar abre `?checkout=success&session_id=…`, que liquida desde el
  registro de Stripe igual que antes. «Cambiar la selección» libera las fechas con
  `/api/ads/cancel` y cierra la sesión.
- Mientras se paga, la selección queda bloqueada: es lo que cobra la sesión abierta.
- Los datos de tarjeta solo existen en los iframes de Stripe (PCI SAQ A). Impuestos,
  códigos promocionales, factura, CFDI, webhook y reembolsos no cambian.
- CSP: solo la página de promoción admite `js.stripe.com`, `hooks.stripe.com` y
  `api.stripe.com` (`contentSecurityPolicy({ stripe: true })` en `next.config.mjs`); el
  resto del sitio sigue cerrado a orígenes externos.
- Sin subdominio aparte: la página vive en `shwcs.site`, donde está la sesión.
