# Planes, soporte y contrato, y equipos técnicos (SHCWS-180)

Estado: 18 de noviembre de 2026. Implementado y probado en local; sin migración (los campos
viven en el `jsonb` de `data`/`published_data`, como §59 y SHCWS-56).

Pedido de André a partir de lo que Cord y Flouvia publican y la ficha no podía mostrar
(investigación en `docs/research/cord-flouvia-2026-11.md`). Su regla: que no sea tedioso de
llenar y que la ficha se vea bien. «Seguridad y datos» se propuso y quedó fuera por decisión
suya.

## Campos (`SolutionData`, `src/lib/solutions/model.ts`)

Todos opcionales y declarados por el proyecto; ninguno es obligatorio para enviar a revisión.

| Campo | Tipo | Regla |
| --- | --- | --- |
| `plans` | ≤6 `{name, price?, currency?, unit?, includes?}` | name ≤40, includes ≤240. Sin `price` = «A la medida»; 0 = «Gratis». Enviar exige nombre y, si cuesta más de 0, moneda y modalidad (`plansInvalid`). Nunca se convierte de moneda |
| `tryOptions` | lista cerrada `solutionTryOptions` | Plan gratis, prueba gratis, sin tarjeta, demo pública, demo con el equipo, diagnóstico gratis |
| `trialDays` | entero 1–365 | Solo tiene sentido con «prueba gratis»; el editor lo borra al desmarcarla |
| `developerTools` | lista cerrada `solutionDeveloperTools` | API REST, GraphQL, webhooks, OpenAPI, SDKs, CLI, MCP, entorno de prueba, embebibles, OAuth |
| `resources` | objeto `{docs, api, changelog, status, roadmap, help, community}` | URL ≤500; enviar exige HTTP(S) sin credenciales (`resourcesInvalid`). Un tipo desconocido se descarta |
| `supportChannels` | lista cerrada | Correo, chat, teléfono, WhatsApp, videollamada, centro de ayuda, comunidad, portal de clientes, persona asignada |
| `supportResponse` | una de `solutionSupportResponses` | Tiempo de primera respuesta, en rangos |
| `slaUptime` | número 90–100 | Solo un compromiso contractual; sin SLA, vacío |
| `onboarding` | lista cerrada | Por tu cuenta, configuración asistida, importación o migración de datos, capacitación, acompañamiento dedicado |
| `exitTerms` | lista cerrada | Cancelas cuando quieras, sin plazo forzoso, exportas tus datos, borras tu cuenta, el código es tuyo, garantía de reembolso |

Una lista vacía se descarta (no hay estado «cualquiera» en estos campos). Etiquetas es/en en
`src/lib/taxonomy.ts` y `src/lib/taxonomy-en.ts`. `src/lib/solutions/offer.ts` (`offerValues`,
`planPrice`, `tryLabels`, `resourceLinks`, `offerSections`) convierte los datos en texto para la
ficha, el comparador y el Markdown: los tres dicen lo mismo y solo muestran lo declarado.

La galería pasa de 4 a 8 imágenes (`maxSolutionScreenshots`); una solución sigue guardando
hasta 12 archivos.

## Editor

Sin pasos obligatorios nuevos. En «Hazla más fuerte» (`src/lib/solutions/questions.ts`,
`src/components/solutions/editor/offer-fields.tsx`):

- **Precio y planes** (la tarjeta `pricing`): después del precio de entrada, «Cómo se puede
  probar» en chips y la lista de planes. Un plan nuevo hereda la moneda y la modalidad del
  anterior o del precio de entrada, así que una lista de cinco planes son cinco nombres, cinco
  montos y una línea cada uno. Un plan de 0 marca «Plan gratis».
- **Soporte y contrato** (`service`): canales, primera respuesta, arranque, condiciones de
  salida (todo en chips), SLA en un campo numérico y los enlaces de ayuda y comunidad.
- **Para equipos técnicos** (`developers`): herramientas en chips y los enlaces de
  documentación, referencia de la API, registro de cambios, estado y roadmap.

## Ficha pública y vista previa

`src/components/solutions/offer-sections.tsx`, en la columna principal después de «Dónde
opera»: «Planes» (tarjetas con nombre, precio grande y qué incluye, y los chips de cómo
probarlo), «Soporte y contrato» (filas declaradas y las condiciones de salida con su check) y
«Para equipos técnicos» (pastillas y botones a sus páginas, con UTM fuera de la vista previa).
«Cómo probarlo» también va en la fila de datos clave junto al precio. Sin datos, nada aparece.

## Comparador, Markdown, IA y ops

- **Comparador**: filas «Planes» y «Cómo probarlo» en Precio; grupo «Soporte y contrato»;
  grupo «Para equipos técnicos» como matriz, igual que las integraciones
  (`readOfferFacts` lee solo estos campos y trata los `null` de SQL como ausentes).
- **Markdown** (`/soluciones/<slug>.md`): secciones «Planes», «Soporte y contrato» y «Para
  equipos técnicos».
- **Ficha con IA** (§86): propone planes de la página de precios (sin promociones con fecha),
  cómo probarlo, herramientas, canales, respuesta, arranque y salida solo si el sitio lo dice.
  Un enlace de `resources` cuenta solo si aparece en el sitio; la duración de la prueba solo con
  «prueba gratis»; el SLA solo en 90–100. Nunca pisa lo que el fundador ya llenó.
- **Ops**: la revisión de una postulación muestra la sección «Planes, soporte y equipos
  técnicos» y el diff nombra los campos nuevos.

## Verificación

`tests/offer.test.ts` (validación y límites, errores al enviar, 8 imágenes, textos es/en,
secciones del editor, comparador con `null`, IA y Markdown). Tipos, lint y formato del
producto y de ops.
