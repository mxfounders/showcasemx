# Espacios patrocinados (anuncios) — octubre 2026

Un fundador con una ficha **ya aprobada** compra días en un espacio etiquetado
«Patrocinado». Se cobra por tiempo, como Product Hunt o LinkedIn: días × tarifa
diaria, por adelantado, con Stripe Checkout alojado e impuestos añadidos encima.

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

### Flujo

1. `POST /api/ads/checkout`: origen, sesión, términos aceptados (`acceptTerms`), compra
   como empresa (`business`), validación (`readCampaignRequest`), límite de 20/h y datos de
   facturación completos ([billing.md](billing.md)).
2. `reserveBooking`: candado consultivo por ubicación+alcance y, en la misma
   transacción, comprobación de cupo por día e inserción con estado `checkout`.
   Reserva retenida 31 minutos (lo mismo que la sesión de Stripe).
3. Checkout alojado (`checkoutSessionParams`): cantidad = días, `booking_id` en la
   sesión, el PaymentIntent y la factura; OXXO y saldo bancario excluidos (no se
   pueden reembolsar o liquidan días después); `adaptive_pricing` desactivado.
4. Webhook o página de regreso (lo que llegue primero) llaman a `settleCheckout`:
   solo marca `paid` si la sesión es la de la reserva y el subtotal y la moneda
   coinciden. Invalida la etiqueta de caché `ads` y guarda el enlace a la factura.

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
`stripe_customers`, `ad_campaign_daily_metrics`, `stripe_events`. El estado de
`ad_campaigns` solo sigue el pago (`checkout`, `processing`, `paid`, `expired`,
`failed`); cancelación, pausas, reembolsos y disputas tienen columnas propias.

## Rutas y componentes

- API: `/api/ads/checkout`, `/api/ads/cancel`, `/api/ads/availability`,
  `/api/ads/events`, `/api/webhooks/stripe`.
- Página: `/[locale]/account/solutions/[id]/promote` (formulario, lista de reservas,
  regreso de Checkout). Enlace «Promocionar →» en la ficha del fundador si está publicada.
- Componentes: `src/components/ads/` (`PromoteForm`, `BookingList`,
  `CancelBookingButton`, `SponsoredSlots`).
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

Antes de vender en producción:

1. Stripe → Configuración → Impuestos: domicilio fiscal (origen) y un registro por
   cada jurisdicción donde se recaude (IVA México, etc.). Sin registro, el impuesto calculado es 0.
2. Stripe → Webhooks: endpoint `https://shwcs.site/api/webhooks/stripe` con los eventos
   de arriba; copiar su secreto a `STRIPE_WEBHOOK_SECRET` en Vercel.
3. Vercel: `STRIPE_SECRET_KEY` (clave restringida de producción) y `STRIPE_WEBHOOK_SECRET`.
4. Aplicar `db/ad-campaigns.sql` a `shwcs_production` y fijar tarifas.

## Verificación

- Unitarias: `tests/ads-model.test.ts` (validación, zona horaria, regla de 24 h,
  montos, estado visible) y `tests/ads-api.test.ts` (parámetros de Checkout, origen,
  sesión, 503 sin Stripe, DNT/GPC, firmas falsas del webhook).
- Punta a punta contra Stripe en modo prueba y la base de desarrollo (9 de octubre):
  sesión real de Checkout, PaymentIntent real, evento de pago firmado con el secreto
  real, espacio visible solo en su categoría, métricas, cancelación con reembolso real
  confirmado por el webhook de Stripe, sin doble reembolso, cupo 2/categoría/día y
  liberación de reservas. 24/24. El pago en la página alojada se simuló (sin navegador).

Cada pago y cada reembolso encolan su documento fiscal (CFDI o nota de crédito): ver
[billing.md](billing.md).

## Pendiente

- Panel de ops para ver, pausar y retirar reservas (hoy: Stripe Dashboard + SQL).
- Reembolso automático cuando una ficha pierde la publicación durante una reserva
  (los términos lo prometen tras revisión manual).
- Detección automática de caídas (regla de 4 h) y días de reposición.
- CFDI para clientes mexicanos (Stripe no lo emite; requiere un PAC).
- Envío del newsletter con menciones patrocinadas.
- Correos de confirmación propios (hoy: recibo/factura de Stripe).
