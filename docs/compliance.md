# Registros públicos y compras comprobadas — octubre 2026

Fase 1 de `docs/strategy.md`: señales que no se pueden comprar ni inflar. Funciona para
cualquier mercado: el país de la identidad fiscal elige el **adaptador**, y México (SAT)
es el primero. Sin adaptador, la identidad se guarda y la ficha solo dice que se declaró.

## Identidad fiscal del proveedor

- La declara el dueño de la ficha en `/account/solutions/[id]` (tarjeta «Identidad
  fiscal»). `POST /api/solutions/[id]/tax-identity` (`save`/`delete`): mismo origen,
  sesión, solo el dueño, 20 cambios por hora.
- `solution_tax_identities` (una por ficha): **privada**. Nunca entra a `published_data`
  ni viaja a un visitante; la ficha pública muestra solo el resultado de la consulta,
  porque el RFC de una persona física es un dato personal.
- Validación (`readTaxIdentity`, `src/lib/compliance/server.ts`): en México, RFC
  estricto (`src/lib/compliance/rfc.ts`, compartido con facturación) y sin RFC genéricos;
  en otros países, un identificador simple de 3 a 40 caracteres.
- Cambiarla no requiere revisión editorial: el resultado sale de un registro público, no
  de lo que afirma el proveedor. La ficha lo presenta como «RFC declarado por el
  proveedor»; no prueba que el RFC sea suyo.

## México: lista 69-B del SAT

- Fuente: `Listado_Completo_69-B.csv` del SAT (~4.5 MB, Latin-1, ~14 000 RFC). Situaciones:
  presunto, definitivo, desvirtuado, sentencia favorable. Las filas que el SAT publica con
  el RFC tachado (`XXXXXXXXXXXX`) se descartan.
- `refreshSat69b()` corre en el cron diario `/api/internal/monitor`. Petición condicional
  con el ETag guardado: los días sin cambios cuestan un 304. Un archivo nuevo se lee con
  `parseSat69b` y reemplaza `sat_69b_list` en una sola transacción; un fallo conserva la
  lista anterior y guarda solo un código en `registry_imports.last_error`.
- La ficha pública (`ComplianceNote`) muestra «Sin coincidencias», «presunto»,
  «definitivo», «desvirtuado» o «sentencia favorable», con la fecha de corte de la lista y
  la de la consulta. Mientras la lista no se ha descargado dice «pendiente», no «limpio».
- Es una consulta pública, no una certificación; el texto lo dice.

## Compra comprobada (nivel de reseña)

- Disponible cuando el proveedor declaró un RFC mexicano. Su autor envía desde su propia
  reseña el folio fiscal (UUID), el RFC emisor, el RFC receptor y el total, con
  consentimiento explícito.
- El emisor debe ser el RFC que declaró el proveedor. `cfdiStatus()`
  (`src/lib/compliance/cfdi.ts`) consulta el servicio público del SAT
  (`ConsultaCFDIService`, la misma consulta de verificacfdi). Solo `Vigente` cuenta;
  `Cancelado` y `No encontrado` se rechazan con su motivo, y si el SAT no responde la API
  dice 503 sin adivinar.
- Se guarda **solo** el resultado (`solution_review_proofs`): método, fecha y
  `sha256("cfdi:" + UUID)`, único, para que un comprobante respalde una sola reseña. El
  UUID, los RFC y el total no se guardan.
- El total se consulta en los dos formatos que ha usado el SAT: CFDI 3.3/4.0 (`1566.5`,
  `100.0`) y 3.2 (`0000001566.500000`).
- La reseña muestra «Compra comprobada» y pesa 3 veces por estrella en el orden
  (`reviewWeights.customer`), frente a 1.5 de un correo de empresa y 1 de un buzón gratuito.
- `SAT_CFDI_URL` permite apuntar a un servicio simulado en pruebas; en producción no se
  define.

## Datos

`db/compliance.sql`: `solution_tax_identities`, `sat_69b_list`, `registry_imports`,
`solution_review_proofs`. Borrar la ficha borra su identidad; borrar la reseña borra su
comprobante. La exportación de la cuenta incluye la identidad fiscal propia y los
comprobantes (sin la huella).

## Verificación (10 de octubre de 2026)

- Unitarias: `tests/compliance.test.ts` (CSV con comillas, lectura de la 69-B con fecha de
  corte, RFC tachados y duplicados, comprobantes y sus dos formatos, respuesta del SAT,
  reintento con el formato antiguo y fallos sin adivinar, identidad fiscal por país,
  guardas de la API).
- Contra el archivo real del SAT: 14 054 RFC (definitivo 11 138, sentencia favorable
  1 617, presunto 959, desvirtuado 340), corte 2025-12-31, 91 filas tachadas descartadas.
- `RUN_COMPLIANCE_INTEGRATION=1 node tests/integration/compliance.cjs` contra un build de
  producción aislado y la base de desarrollo: el cron descarga la lista real, solo el
  dueño declara, RFC inválido con su campo, la ficha muestra el resultado sin el RFC, un
  RFC en la lista se ve como «definitivo», comprobante con consentimiento, emisor distinto,
  no encontrado, solo el autor, vigente → «Compra comprobada», reintento idempotente,
  solo se guarda la huella, un comprobante para una sola reseña, identidad de otro país
  sin comprobante, y borrar la identidad.
- El caso **vigente** se probó contra un SAT simulado, no con un CFDI real: falta repetirlo
  con una factura real (por ejemplo, una emitida por Cord).

## Pendiente

- Probar «Compra comprobada» con un CFDI real.
- Adaptadores de otros países: NIF/IVA de la UE (VIES), Companies House (Reino Unido).
- REPSE para agencias y servicios, y la lista de PAC autorizados.
- Mostrar en ops la identidad fiscal y el resultado de cada ficha.
- Comparar el RFC receptor con los datos de facturación de quien reseña.
