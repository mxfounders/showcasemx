# Facturación — octubre 2026

Stripe cobra y calcula el impuesto; Cord (cordhq.app) emite el documento fiscal mexicano
(CFDI 4.0) con el CSD de shwcs. La cuenta ve todo en **Ajustes → Facturación**
(`/[locale]/account/settings/billing`).

## Datos de facturación

- Uno por cuenta (`billing_profiles`), con control de versión: crear empieza en la
  versión 1 y una ventana desactualizada recibe 409 en lugar de sobrescribir.
- México: razón social exacta (como en la Constancia de Situación Fiscal), RFC (12 o 13
  caracteres; no se aceptan los genéricos), régimen fiscal (`c_RegimenFiscal`), código
  postal fiscal (5 dígitos) y uso de CFDI (`G03` o `S01`).
- Otros países: nombre legal y, opcionalmente, identificador fiscal y código postal.
- Correo para facturas opcional (si falta, se usa el de la cuenta).
- Validación compartida en `src/lib/billing/model.ts` (`readBillingProfile`, códigos de
  error por campo). Los nombres oficiales del SAT se muestran en español en ambos idiomas.
- Comprar un espacio patrocinado exige este perfil (venta B2B). Al guardarlo se actualiza
  el cliente de Stripe (nombre, correo, país y código postal) para que Checkout llegue prellenado.

## Documentos fiscales

`billing_documents` es una cola y a la vez el registro fiscal (nunca se borra):

| Origen | Documento | Estado inicial |
| --- | --- | --- |
| Pago confirmado (`checkout.session.completed`, `source_id` = sesión) | CFDI de ingreso | `pending` si el perfil es de México; si no, `skipped` |
| Reembolso exitoso (`refund.created`/`refund.updated` con `succeeded`, `source_id` = reembolso) | Nota de crédito (CFDI de egreso) | el mismo destino que su factura |

- El receptor se copia al encolar: un documento se puede emitir aunque la cuenta se haya
  borrado después.
- El trabajador (`processBillingQueue`) arrienda filas con `FOR UPDATE SKIP LOCKED`, así
  que el `after()` del webhook y el cron diario nunca procesan el mismo documento. Corre
  justo después de cada pago o reembolso, y el cron `/api/internal/monitor` reintenta.
- Reintentos con espera exponencial (1, 2, 4… minutos, máximo un día); a los 10 intentos
  queda `failed` para revisión humana. Se guarda solo el código de error, nunca el mensaje.
- Sin `CORD_API_KEY` no se envía nada y los documentos esperan en `pending`
  («En preparación» en la interfaz).

## Integración con Cord

Cliente en `src/lib/billing/cord.ts`, contrato `https://cordhq.app/openapi.yaml`
(versión `2026-10-01`, cabecera `Cord-Version`):

1. Cliente: `POST /clientes` con `empresa`, `email`, `rfc`, `regimenFiscal`, `usoCfdi`,
   `cpFiscal` y `countryCode`; uno por cuenta, actualizado (`PATCH`) cuando cambia el perfil.
2. Factura: `POST /facturas` en modo `fiscal`, una línea con cantidad = días,
   `precio_unitario` = tarifa diaria y `tax_rate` igual al que cobró Stripe (0, 0.08 o
   0.16; cualquier otro detiene el documento con `tax_rate_mismatch`).
3. `POST /facturas/{id}` con `finalize` (timbrar), `payment` (pago con tarjeta, referencia
   del PaymentIntent) y `send`. Si el timbrado queda `pending`, se reintenta; `error` cuenta
   como intento fallido.
4. Nota de crédito: `POST /facturas/{factura}` con `credit_note` por el monto reembolsado.

Cada escritura lleva `Idempotency-Key` derivada del documento (`invoice:<id>`,
`finalize:<id>`, `credit:<id>`…): un reintento nunca duplica nada en Cord.

## Verificación (10 de octubre de 2026)

- Unitarias: `tests/billing.test.ts` (validación, tasa de IVA, espera, contenido de las
  peticiones a Cord, cabeceras, errores por código, ruta protegida).
- Punta a punta contra Stripe en modo prueba, la base de desarrollo y un **Cord simulado**
  que implementa el contrato publicado (22/22): perfil y versiones, bloqueo de compra sin
  perfil, CFDI con 16 % emitido tras el pago, caída del PAC con reintento del cron, nota de
  crédito a partir de un reembolso real de Stripe, comprador de EE. UU. sin CFDI y
  exportación de datos con la facturación. Falta repetirla contra el sandbox real de Cord.

## Pendiente

- Llave de Cord (`sk_test_` del sandbox y `sk_live_` en producción) de la cuenta emisora de
  shwcs, con CSD cargado, y confirmar el nombre exacto de los campos fiscales del cliente.
- Decidir con el contador: CFDI a extranjeros (RFC genérico de extranjero) y retenciones.
- Descarga del PDF y XML desde la cuenta (la API publicada no la documenta; hoy Cord los
  envía por correo con `send`).
- Panel en ops para documentos `failed` y reemisión manual.
- Aplicar `db/billing.sql` a `shwcs_production`.
