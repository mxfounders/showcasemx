# Reseñas verificadas — octubre 2026

Las reseñas son la señal principal de confianza del catálogo (`docs/strategy.md`, fase 1).
Funcionan para cualquier mercado: el país de quien reseña es cualquier código ISO 3166-1
y los niveles de verificación no dependen de ningún país.

## Reglas de producto

1. Una reseña por cuenta y solución publicada. Se puede editar o borrar siempre.
2. Solo son públicas las reseñas de cuentas con el correo confirmado. Una reseña de una
   cuenta sin verificar se guarda y solo la ve su autor, con un aviso; al verificar el
   correo se publica sola, sin tocar la fila.
3. Nadie reseña su propia solución, ni desde el dominio del proveedor (`cordhq.app`
   reseñando `cordhq.app` o un subdominio). Los buzones gratuitos nunca cuentan como
   conflicto.
4. El dueño de la solución responde en público, pero **no puede editar ni borrar**
   reseñas (la misma regla que §46 fijó para comentarios). Puede reportarlas.
5. Solo ops oculta una reseña, desde un reporte y con un motivo que su autor ve. Ops puede
   restaurarla. Todo queda en la bitácora.
6. Pagar no cambia nada: ni la visibilidad de una reseña ni su peso. El patrocinio sigue
   separado (`docs/ads.md`).

## Niveles de verificación

Se calculan **al leer**, desde la cuenta del autor; nunca se guardan en la reseña ni se
envía al navegador el correo o su dominio.

| Nivel | Condición | Peso en el orden |
| --- | --- | --- |
| Sin verificar | Correo sin confirmar | No es pública |
| Correo verificado | Correo confirmado en un buzón gratuito | estrellas × 1 |
| Correo de empresa | Correo confirmado en un dominio propio | estrellas × 1.5 |
| Compra comprobada | Correo confirmado y un comprobante del proveedor confirmado por una autoridad (México: CFDI vigente ante el SAT, `docs/compliance.md`) | estrellas × 3 |

Los buzones gratuitos están en `freeEmailDomains` y `freeEmailPattern`
(`src/lib/reviews/model.ts`), compartidos por la interfaz y por el SQL del ranking.

## Avisos, filtros y vista del dueño

- El fundador recibe un aviso «Nueva reseña de tu solución» cuando una reseña se vuelve
  pública: al escribirla una cuenta verificada, o después, cuando su autor confirma el
  correo. Las dos rutas comparten la clave `review:<id>`, así que avisa una vez. Sigue su
  preferencia de correo de fichas. Triggers en `db/solution-reviews.sql`.
- El aviso lleva a `/account/solutions/[id]`, donde `OwnerReviewDigest` muestra promedio,
  número de reseñas y cuántas faltan por responder, con enlace a la ficha pública.
- Con tres o más reseñas de otras personas aparecen filtros: orden (recientes, mejor y
  peor calificadas), estrellas, tamaño de empresa y país, solo con valores que alguna
  reseña tiene (`src/lib/reviews/filters.ts`). La reseña propia queda siempre arriba.

## Orden del catálogo

`solutionScore` (`src/lib/solutions/ranking.ts`) suma, por cada reseña pública,
`estrellas × peso del nivel`, con el mismo decaimiento de 60 días que el resto. Una reseña
de cinco estrellas con correo de empresa pesa 7.5, más que un comentario (3). Una reseña
baja suma poco y **nunca resta**: un competidor no puede hundir una ficha dejando una
estrella, solo dejar de subirla. La fórmula está publicada en `/criterios`.

## Datos

`db/solution-reviews.sql`:

- `solution_reviews`: id generado por el cliente (un reintento devuelve la misma fila),
  `UNIQUE (solution_id, author_id)`, campos acotados por `CHECK`, `status`
  `published|hidden` con `hidden_reason` obligatorio al ocultar, respuesta del dueño
  (`reply`, `reply_at`) y `version` para editar sin perder cambios.
- `solution_review_reports`: espejo de `community_reports` (§56). `review_id` es
  `ON DELETE SET NULL` para que el reporte y su decisión sobrevivan si el autor borra la
  reseña. Un reporte abierto por persona y reseña.

Borrar la cuenta borra sus reseñas (cascada). La exportación de datos las incluye en
`published.reviews`, junto con los comentarios.

## API

`POST /api/solutions/[id]/reviews`, mismo origen y sesión:

| Acción | Quién | Notas |
| --- | --- | --- |
| `save` | Cualquier cuenta que no sea dueña | Crea (sin `version`) o edita (con `version`). Valida con `readReview`; un error de campo responde `{ error, field }`. 10 por hora |
| `delete` | Autor | |
| `reply` | Dueño de la solución | `''` quita la respuesta. 30 por hora |
| `report` | Cualquiera menos el autor | `fake`, `conflict`, `abuse`, `spam`, `other`; 5 por hora |

Ops: `GET/POST /api/review-reports` (`resolve`, `dismiss`, `hide`, y `restore` sobre una
reseña oculta). Pestaña «Reseñas» en `/panel/reportes`; el contador de la barra lateral,
el KPI y la cola del panel incluyen estos reportes.

## Interfaz

`src/components/reviews/`: `ReviewSection` (contenedor), `ReviewSummary` (promedio,
distribución, % que la recomienda y cómo se verifica), `ReviewCard` (respuesta y
reporte), `ReviewForm` (valida con el mismo `readReview` que la API), `ReviewBadge`
(estrellas bajo el título) y `Stars`. Las tarjetas del catálogo muestran estrellas y número
de reseñas. Textos en la sección `reviews` de los diccionarios.

## Verificación (10 de octubre de 2026)

- Unitarias: `tests/reviews.test.ts` (validación por campo, cualquier país, buzones
  gratuitos y de empresa, conflicto por dominio, peso en el orden, textos en ambos idiomas,
  guardas de la API).
- `RUN_REVIEWS_INTEGRATION=1 node tests/integration/reviews.cjs` contra un build de
  producción y la base de desarrollo: quién puede escribir (anónimo, dueño, dominio del
  proveedor, ficha sin publicar), idempotencia, segunda reseña, que la página pública
  nunca muestre el correo ni su dominio, reseña sin verificar visible solo para su autor,
  que la ficha reseñada suba por encima de una más reciente, edición con versión,
  respuesta solo del dueño, que el dueño no pueda borrar, reportes, ocultar y ver el
  motivo, exportación y borrado.
- Moderación en ops punta a punta: el reporte aparece en la pestaña y en la cola del
  panel, ocultar exige motivo, el autor lo ve, no se decide dos veces, restaurar, bitácora
  con etiquetas legibles.
- Capturas en escritorio y móvil (es/en) revisadas a ojo.

## Pendiente

- Comprobantes fuera de México (ver `docs/compliance.md`).
- Ocultar desde ops una reseña sin reporte previo (hoy: solo desde un reporte).
- El título del aviso está en español para todos, como los demás triggers (§63).
