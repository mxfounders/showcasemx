# Verificación, reconocimientos e insignias — noviembre 2026

Pedido por el propietario el 14 de noviembre de 2026: que nadie tenga que escribir un RFC
para publicar, que el equipo verifique los proyectos y lo muestre con una palomita, un
reconocimiento propio en lugar del «Product of the Day» y una insignia que el fundador pueda
poner en su sitio. Linear: SHCWS-163 (verificación), SHCWS-164 (Top de la semana),
SHCWS-165 (Selección shwcs) y SHCWS-166 (insignias).

Reglas de fondo, de `docs/strategy.md`: las insignias son raras, fechadas y revocables;
ninguna se paga; no hay leaderboard diario.

## «Verificado por shwcs»

- Lo decide el equipo en ops (`/panel/postulaciones/[id]`, panel «Verificación»). El
  fundador no llena nada ni envía documentos; la página `/account/solutions/[id]/trust`
  solo le explica qué revisamos y en qué estado está.
- Qué se confirma (`verificationChecks`, `src/lib/recognition/model.ts`; copia en
  `ops/src/lib/recognition.ts`): el sitio funciona y es del proyecto; el producto existe y
  hace lo que dice la ficha; quien la registró representa al proyecto (las tres
  obligatorias); y los registros públicos que apliquen (la 69-B en México).
- Señales en ops que ayudan a decidir, nunca automáticas: el TXT de dominio, si el correo
  del dueño es del mismo dominio que el sitio y el resultado de la 69-B.
- `solution_verifications` guarda el host revisado (`recognitionHost`: minúsculas, sin
  `www.`). La palomita se muestra solo mientras el sitio publicado sigue en ese host: si la
  ficha cambia de dominio deja de verse sola y el dueño ve «volveremos a revisarla».
- Se ve junto al nombre en la ficha, en las tarjetas del catálogo (`VerifiedMark`) y como
  sello. Retirarla borra la fila; la bitácora de ops conserva quién y por qué.
- La **identidad fiscal** ya no la escribe el fundador (se retiraron la tarjeta y
  `POST /api/solutions/[id]/tax-identity`). La registra el equipo en el mismo panel de ops;
  sigue alimentando la consulta 69-B y el nivel «Compra comprobada» de reseñas.

## Top de la semana

- Semana de lunes a domingo en hora de Ciudad de México. El cron diario de monitor
  (`runWeeklyRecognition`, `src/lib/recognition/server.ts`) calcula la última semana
  terminada una sola vez: `solution_award_runs` marca la semana y las siguientes corridas
  no hacen nada, para que el resultado no cambie después (por ejemplo, si una cuenta
  verifica su correo más tarde).
- Puntaje de la semana: likes ×1, guardados ×2, comentarios ×3 y reseñas publicadas
  (estrellas × peso del nivel). Solo cuentas con correo verificado y nunca el dueño.
- Para competir, al menos 3 cuentas verificadas distintas en la semana. Rankings general
  (`scope = 'all'`) y por categoría. Puestos: uno por cada dos proyectos que compiten, hasta
  tres; con menos de tres no hay premio (`weeklyPlaces`). Desempate: puntaje, cuentas,
  publicación más antigua, id.
- Un puesto revocado en ops conserva su fila y su lugar: nadie lo hereda.

## Selección shwcs

- Elegida por un admin en ops (`/panel/destacados`), para un mes, con un motivo público de
  10–280 caracteres. Máximo 3 por mes, una vez por ficha y mes, solo fichas publicadas.
- Nadie puede elegir una ficha propia (el SQL lo impide). Hoy el propietario es dueño de
  Cord y Flouvia: para seleccionarlas haría falta otro admin.

## Insignias

`GET /api/badge/[id]?kind=featured|verified|award&award=<id>&layout=card|seal&theme=light|dark&lang=es|en`

- Dos formatos (`src/lib/recognition/badge.ts`): `card`, horizontal de 56 px de alto para
  pies de página; y `seal`, escudo de 132 × 156 con el wordmark arriba, el emblema (roseta
  con palomita, laurel con el puesto, estrella de la selección) y el texto en la parte
  ancha del escudo. Metal por tipo: azul (verificado), oro/plata/bronce por puesto, tinta
  (selección), blanco (publicado).
- Todo va dentro del SVG: wordmark e isotipo como PNG incrustados
  (`badge-assets.ts`, generado desde `public/brand`), texto en la fuente del sistema. Un
  `<img>` en cualquier sitio no carga nada más ni registra quién la ve.
- Solo fichas publicadas (404 si no). Si la verificación o el premio pedidos ya no están
  vigentes, responde «Publicado en shwcs» en lugar de romper la imagen. Caché pública de 5
  minutos en el navegador y 30 en el CDN: un retiro se nota en menos de una hora.
- La ficha pública muestra los sellos reales (no etiquetas); cada uno abre su explicación.
  El fundador elige insignia, formato y tema en `/account/solutions/[id]` y copia el HTML.
- Límite conocido: la CSP global de `next.config.mjs` sustituye la cabecera propia del
  SVG. No es un riesgo práctico (el SVG lo generamos con todo el texto escapado), pero si
  algún día se quiere `default-src 'none'` para `/api/badge`, hay que excluir esa ruta de
  las cabeceras globales.

## Verificación de esta entrega

- Unitarias: umbrales y desempates del ranking, semana en hora de México, host de la
  verificación, títulos y fechas de premios, SVG autocontenido y escapado
  (`tests/recognition.test.ts`).
- Contra `neondb` con cuentas `@example.invalid` borradas al terminar: el cálculo semanal
  otorgó solo el #1 general con 3 competidores, ignoró un proyecto con 2 cuentas y la
  actividad fuera de la semana, no recalculó en la segunda corrida, y la verificación
  desapareció al cambiar de host.
- Ops: verificación, identidad fiscal y selecciones probadas de punta a punta contra
  `neondb` (36/36), con cuentas temporales.
- `db/solution-recognition.sql` aplicada en `shwcs_production` el 14 de noviembre de 2026
  con `neondb_owner`; el rol de la app (producto y ops) tiene lectura y escritura sobre las
  tres tablas. No probado: el cron semanal corriendo en producción.
