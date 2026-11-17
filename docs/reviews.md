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
| Contactó vía shwcs | Correo confirmado y una solicitud de contacto de esa cuenta a esa ficha que llegó a «en conversación» o se cerró como ganada (`review_contact_backed`, SHCWS-135) | estrellas × 2 |
| Compra comprobada | Correo confirmado y un comprobante del proveedor confirmado por una autoridad (México: CFDI vigente ante el SAT, `docs/compliance.md`) | estrellas × 3 |

Los buzones gratuitos están en `freeEmailDomains` y `freeEmailPattern`
(`src/lib/reviews/model.ts`), compartidos por la interfaz y por el SQL del ranking.

Una reseña que llegó por el enlace de invitación del propio proyecto (SHCWS-132) pesa la
mitad de su nivel (`reviewInvitedFactor`, `reviewWeight` en `src/lib/reviews/model.ts`) y
muestra «Invitada por el proyecto». La marca es por cuenta y ficha
(`solution_review_invitees`), así que borrar y reescribir la reseña no la quita.

## Invitaciones a reseñar (SHCWS-132, SHCWS-135)

Contrato: `db/review-invitations.sql`, `src/lib/reviews/invitations.ts`.

- **Enlace del fundador**: uno por ficha publicada, se crea solo cuando el dueño lo pide
  (`POST /api/solutions/[id]/review-invite`, `create`/`rotate`) en la tarjeta de
  `OwnerReviewDigest` (`/account/solutions/[id]#invitar-resenas`). Lleva a
  `/resenar/<token>`: con sesión, el formulario; sin sesión, un correo para entrar o la
  contraseña. Reemplazar el enlace invalida el anterior; un token reemplazado al guardar
  responde 409 en vez de guardar una reseña sin marca. La tarjeta dice las reglas:
  invitar a todos y ningún incentivo que dependa del sentido de la reseña
  (Términos › Reseñas). Criterio elegido, el más estricto de los sitios de reseñas: G2 y
  Gartner etiquetan el origen y TrustRadius pesa menos lo que trae el proveedor; aquí
  hacemos las dos cosas.
- **Entrar por correo** (`POST /api/auth/magic-link`, `src/lib/auth/magic-link.ts`): un
  token de 32 bytes, solo su SHA-256 guardado, 30 minutos, un uso, en el fragmento del
  enlace. Crea la cuenta ya verificada si no existía. A una cuenta existente solo la abre
  si ya estaba verificada cuando se pidió el enlace y su contraseña no cambió; nunca abre
  ni verifica una cuenta sin verificar (posible pre-registro ajeno) ni una con verificación
  en dos pasos. Respuesta igual exista o no la cuenta. 3 por correo y 10 por red cada hora.
- **Invitación de shwcs** (`invite_contact_reviews()`, cron diario de correo): a los 30
  días de que una solicitud llegó a «en conversación» o se cerró como ganada (ventana de 30
  a 90 días, una vez por solicitud), aviso de categoría `contact` al comprador que aún no
  reseñó, con enlace a `/account/reviews/[id]`. El correo no cita nada de la conversación.
  Estas reseñas no llevan descuento: nadie eligió a quién invitar.

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
