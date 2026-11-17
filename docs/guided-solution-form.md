# Registro de un proyecto: enlace primero, tres pasos y lo opcional aparte

Sustituye el editor de 17 preguntas lineales (§59) desde el 14 de noviembre de 2026
(SHCWS-29, SHCWS-36). Petición del propietario: que cualquiera registre un proyecto
rápido, sin RFC ni pantallas de más.

## Recorrido

1. **`/account/solutions/new` pide solo el enlace** (sitio o perfil público; acepta
   `tuproyecto.com` sin `https://`). El borrador nace con él (`POST /api/solutions` con
   `website`) y abre el editor.
2. **El editor lee el sitio una vez por visita** mientras nombre y descripción están vacíos:
   `POST /api/solutions/[id]/site-image` guarda la portada y devuelve lo que la página dice
   de sí misma (`readSiteMeta`, `readSiteLinks` en `src/lib/solutions/site-image.ts`, con
   la misma protección SSRF de §50). Solo llena campos vacíos: nombre (og:site_name o la
   primera parte del título), descripción (og:description o meta description) y redes
   oficiales (LinkedIn, X, Instagram, YouTube, GitHub, Product Hunt, TikTok; nunca botones
   de compartir ni publicaciones). Lo que el fundador ya escribió se respeta y la versión
   del sitio aparece como botón «Usar…». No hay IA: metadatos del propio sitio (la IA sigue
   en SHCWS-151).
3. **Tres pasos obligatorios** (`requiredQuestions`, `src/lib/solutions/questions.ts`):
   - **Lo básico**: enlace, nombre, tipo, descripción (mínimo 20, con contador).
   - **Dónde encaja**: categorías y, debajo de cada una, sus capacidades. Sugerencias de un
     clic desde el texto (`src/lib/search/suggest.ts`): raíz común («cotiza» ↔
     «cotizaciones»), cada término cuenta una vez, palabras genéricas («cliente»,
     «empresa»…) no cuentan y una categoría débil no aparece. Quitar una categoría quita sus
     capacidades. «¿No ves tu categoría?» guarda `otherCategory` (80 caracteres, privado:
     solo lo lee ops; nunca entra a `published_data`).
   - **Para quién**: cliente ideal e industrias/tamaños, con «Cualquier industria» y
     «Cualquier tamaño» como primera opción (el `[]` de §54).
4. **Revisa y envía**: resumen con «Editar» por fila, correo privado de revisión
   (prellenado con el de la cuenta) y el botón de envío. Debajo, **«Hazla más fuerte»**:
   capturas, demo, precio, arranque y soporte, integraciones, cumplimiento, alcance,
   equipo, redes y evidencia como tarjetas en cualquier orden, cada una con «Guardar» y
   «Descartar cambios».

A la derecha, en escritorio, la tarjeta del catálogo se redibuja con cada tecla
(`ListingPreview`): portada (captura propia o la del sitio), nombre, descripción,
categorías y dominio. Una ficha publicada abre directo en la revisión y su botón dice
«Enviar actualización a revisión»; sin cambios pendientes queda deshabilitado.

## Compatibilidad

`step` (0..3) y `editor_question` siguen igual en la base. Los ids del editor anterior
(`identity`, `categories`, `problem`, `capabilities`, `market`, `contact`) reanudan en el
paso equivalente y la API los sigue aceptando con su fase (`questionPhase`, con
`Object.hasOwn` para que «constructor» no resuelva por el prototipo). Las fases 2 y 3
antiguas reanudan en la revisión.

## Interacción

Una pantalla a la vez, transición GSAP de 220 ms (desactivada con reduced motion), foco en
el título al cambiar. Enter en un input continúa; Ctrl/Cmd+Enter en un texto largo
también; en el campo del enlace Enter no avanza. **Nunca se envía a revisión con un
atajo**: hace falta el botón. Cada «Continuar» guarda con CAS; un fallo no simula éxito.

## Datos públicos optativos

- `founders`: máximo tres objetos `{name,role,bio,links}`; nombre 100, rol 80 y bio
  400 caracteres; hasta cuatro enlaces por persona. Nombre obligatorio si se añade
  una persona, pero se puede eliminar el bloque o no añadir ninguno.
- `projectLinks`: hasta seis `{label,url}` con etiqueta permitida y URL de hasta
  500 caracteres. LinkedIn, X, Instagram, YouTube, GitHub, Product Hunt, TikTok,
  sitio, documentación, precios o contacto.
- Arrays/longitudes validados en servidor. Se eliminan campos no reconocidos;
  no aceptar flags de identidad verificada ni información de la cuenta del cliente.
- Borradores permiten campos vacíos; envío valida nombres y URLs HTTP(S) sin
  credenciales. El público filtra URLs inseguras antes de renderizar.
- No se extrae información privada del perfil. La interfaz pide compartir datos
  con autorización; nada de email/avatar privado agregado automáticamente.
- Personas y enlaces aparecen en ficha/preview y resumen de revisión. Se publican
  solo con snapshot aprobado. No prueban titularidad ni reputación.

## Reanudación y compatibilidad

`db/solution-profile.sql` añade `editor_question` nullable (ID estable, máximo 64).
`PATCH /api/solutions/:id` acepta `question` opcional, valida que exista en
`solutionQuestions` y corresponda a la fase `step` 0..3. Actualiza ambos dentro de
la escritura versionada existente. Sin `question`, conserva compatibilidad con
clientes anteriores y deja la reanudación por fase. No cambiar la constraint de
step ni reescribir masivamente borradores antiguos.

`questionIndex` prefiere ID válido, de lo contrario el primer paso de la fase
legacy. La guía de completitud tiene **doce bloques** desde §59 (antes diez,
que ya incluían creadores con presencia pública; la cifra "nueve" de entregas
más antiguas describe un estado previo a la pregunta `market`). Sigue siendo
cobertura informativa, nunca puntuación.

## Capacidades, integraciones, precio, arranque y cumplimiento (§59)

`capabilities` no tiene estado `[]`: una solución hace algo concreto o no lo
hace, así que solo `undefined` (nunca contestada) es un hueco, y se exige al
menos una para enviar a revisión — igual que antes exigía `industries`/
`companySizes` declarados, no una lista específica. El editor las agrupa por
categoría ya declarada y sugiere capacidades leyendo `problem`/`audience`/
`scope` con el mismo umbral de dos aciertos de vocabulario que ya usaba la
inferencia de industria (`suggestCapabilities`, `src/lib/search/facets.ts`);
la sugerencia nunca marca nada por sí sola, solo ofrece un chip de un clic.
`integrationKeys` sí conserva el tri-estado ("no se conecta con nada" es
`[]`, una respuesta real). `pricingModel`/`priceBand`/`setupTime`/`compliance`
no tienen ninguna forma de "cualquiera": ausente y `[]` significan lo mismo,
así que no hay nada que distinguir ahí. Detalle completo en CLAUDE.md §59.

## Información de Cord/Flouvia

Datos investigados y preparados en [fuentes](research/cord-flouvia-sources.md).
Aplicados a los dos registros vinculados al dueño autorizado, sin alterar la
publicación ni saltarse la revisión. No incluir información no confirmada solo
para completar el contador. Los enlaces personales extra y capturas reales siguen
siendo información a aportar por el propietario.

## Verificación

37 pruebas unitarias. Contratos de arrays, límites, URLs, eliminación de campos
falsos, recuperación de fases antiguas, validación por pregunta y comprobación
final. Integración de media/dashboard extendida con creadores/enlaces públicos,
question persistida y rechazo de question/fase incompatibles. TypeScript, lint y build aislado finales pasando. Regresión de contactos completa
también pasando; sin despliegue implícito.

Validación visual final en navegador local: Enter avanza y guarda; índice lleva a
Creadores; añadir persona y su enlace, rechazar javascript:, corregir URL, añadir
red del proyecto por separado, guardar/salir y reanudar exactamente en Enlaces.
Sin desbordamiento horizontal a 375 px. Se revisó también a 1280 px. Pruebas con
cuentas temporales, nunca con las credenciales reales del propietario.
