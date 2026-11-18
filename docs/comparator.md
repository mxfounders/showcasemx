# Comparador con datos estructurados (SHCWS-53)

Estado: 17 de noviembre de 2026. Implementado y probado en local contra `neondb`; no
desplegado. Sin migración: `contact_batches.list_id` ya era nullable (db/contact-batches.sql).

## Dos entradas, una tabla

- **Desde una lista** (`/account/lists/[id]/compare?project=…`, §8): igual que antes —solo
  el dueño, 2–3 miembros de su lista— más sus notas privadas de esa lista.
- **Comparación temporal** (`/comparar?project=…`, nueva): 2–3 fichas marcadas con
  «Comparar» desde el catálogo, sin crear lista. Pública, `noindex` y bloqueada en
  `robots.ts`; se arma con la URL y no guarda nada en el servidor. Solo acepta claves de
  fichas publicadas en este momento: un borrador, una ficha retirada, un duplicado, más de
  tres o un ejemplo estático invalidan toda la selección (`publishedSelection`,
  `src/lib/library/comparison.ts`). Nunca muestra notas.

Las dos usan `ComparisonTable` (`src/components/library/comparison-table.tsx`): tabla
semántica con `caption`, encabezados de columna y de fila, grupos con `scope="colgroup"`,
dentro de una región con scroll horizontal propio y foco de teclado (`ComparisonRegion`).

## Filas

Todo sale de `published_data` (`comparedProjects`, `src/lib/library/comparison-server.ts`),
leído en vivo. Nada se puntúa ni se recomienda; lo que falta dice «Sin información publicada».

| Grupo | Filas |
| --- | --- |
| Confianza | Verificado por shwcs (para el host actual), dominio comprobado por TXT (vigente), reseñas públicas con promedio, número y niveles (compra comprobada, contactó vía shwcs, correo de empresa, invitadas), señal de respuesta (SHCWS-52; sin dato bajo 3 solicitudes) |
| Precio | Desde, modelo, rango (SHCWS-51) y el texto del proyecto |
| Qué hace y para quién | Qué resuelve, cliente ideal, alcance y **una fila por capacidad** que alguna declaró: «Sí» / «No lo declara» / «No respondió» |
| Arranque y soporte | Tiempo de arranque, implementación, soporte |
| Integraciones | **Una fila por herramienta** declarada; `[]` se muestra como «No se conecta con otras herramientas», distinto de no haber respondido |
| Cumplimiento | Normas declaradas |
| Dónde opera y trayectoria | Filas de SHCWS-56 que al menos una declaró (docs/provider-facts.md) y casos «declarados por el proyecto, sin confirmar por el cliente» |
| Evidencia | Texto y enlace |
| Tu siguiente paso | Notas (solo en la lista) y «Solicitar contacto» |

Las reseñas por ficha salen de `getReviewSummaries(ids)` (`src/lib/reviews/server.ts`), una
consulta agrupada con las mismas reglas que la ficha; la ficha ahora también la usa.

## «Comparar» en el catálogo

- `CompareToggle` (`src/components/compare/compare-toggle.tsx`): botón con `aria-pressed` en
  las tarjetas de `/explorar`, `/industria`, `/colecciones`, `/nuevo`, el catálogo del inicio,
  los resultados de `/buscar` y la ficha (no la propia). Para no anidar un botón dentro de un
  enlace, las tarjetas pasan a «enlace estirado»: el nombre es el enlace y un `::after` cubre
  la tarjeta; el foco dibuja el contorno de toda la tarjeta. Los espacios patrocinados no
  tienen el botón y el comparador nunca muestra patrocinados.
- `CompareTray` (`src/components/compare/compare-tray.tsx`), montado en el layout de marketing:
  barra fija abajo con las fichas elegidas (quitar una, vaciar) y «Comparar N» desde dos.
  Máximo tres; un cuarto clic avisa por una región `aria-live`. La selección vive en
  `localStorage` (`shwcs-compare`), es solo comodidad de este navegador y tolera que el
  almacenamiento falle. Al abrir `/comparar`, `CompareSync` deja la bandeja igual a lo que se
  compara; en esa página la bandeja se oculta.
- Con tres fichas, cada columna tiene «Quitar de la comparación» (la URL sin esa ficha).

Recorrido: marcar «Comparar» en cada tarjeta (un clic por ficha) y «Comparar 3» en la bandeja.
No hay que crear una lista primero.

## Desde la comparación temporal

- **Guardar como lista**: `POST /api/library` con `action: 'save-comparison'` (`id` generado
  una vez en el navegador, `name` ≤100, `projectKeys`). Mismo origen y sesión. El servidor
  vuelve a resolver las claves (solo publicadas) y, en **una transacción**, crea la lista
  privada solo si caben la lista (30) y los guardados nuevos (200), guarda las fichas y las
  añade. Un reintento con el mismo `id` no crea otra lista. Sin sesión, «Entra para guardarla».
- **Pedir propuesta a estos N**: `/account/contacts/proposal?project=…`, el mismo formulario de
  SHCWS-62 sin lista. `ProposalView` (`src/components/contacts/proposal-view.tsx`) es ahora la
  pantalla compartida con `/account/lists/[id]/proposal`. `readBatch` acepta `listId` ausente o
  `null`; con lista se sigue exigiendo que cada proyecto esté en ella, sin lista cada
  destinatario se comprueba como una solicitud suelta (`createContact`: publicada, no propia,
  dueño mostrado). El grupo se guarda con `list_id` nulo.
- `authReturnTo` acepta `/comparar?project=…` y `/account/contacts/proposal?project=…`, reconstruidos
  con 2–3 claves válidas y nada más.

## Verificación

`tests/comparison.test.ts`: tamaño 2–3, identidad, duplicados, claves inválidas y ejemplos,
solo publicadas, membresía de lista, matriz sí/no/ninguna/sin respuesta, retorno tras iniciar
sesión, lote sin lista y origen/sesión de `save-comparison`. Recorrido contra el dev con
fichas publicadas temporales y cuentas `@example.invalid` (ver el comentario en SHCWS-53).

## Pendiente

- La confirmación de casos por el cliente (SHCWS-56) cambiaría la fila de casos.
- Filtros de país e idioma en Guardados.
