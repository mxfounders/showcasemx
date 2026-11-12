# Ficha con IA desde el sitio del proyecto

Estado: 11 de noviembre de 2026 (SHCWS-151). Implementado, probado en local; no desplegado.

El fundador pega la dirección de su sitio en `/account/solutions/new` y recibe un borrador
de su ficha ya escrito, que revisa pregunta por pregunta en el editor de siempre. Nada se
envía a revisión sin que él llegue a la última pantalla y lo confirme.

## Entradas

- **Onboarding** (`/onboarding`): quien elige «Soy fundador» o «Un poco de ambos» tiene
  un cuarto paso, «¿Agregamos tu producto ahora?», con tres opciones: con IA (pega su
  sitio ahí mismo y ve el avance), a mano (crea el borrador y abre el editor) o más
  tarde (Inicio). Compradores y exploradores siguen con tres pasos. El perfil se guarda
  antes de crear nada, así que un fallo al redactar no pierde las respuestas; si algo
  falla, se ofrece seguir a mano con el borrador o ir al Inicio. Sin clave de Anthropic
  la opción «con IA» no aparece. Ver SHCWS-28.
- **Nueva solución** (`/account/solutions/new`): la tarjeta «Prepárala con IA desde tu
  sitio» y debajo el camino manual.

Las dos usan el mismo cliente, `src/components/solutions/use-site-draft.tsx`
(`useSiteDraft` y `SiteDraftProgress`).

## Recorrido

1. `SiteDraftStart` normaliza la dirección (`tuproyecto.com` → `https://tuproyecto.com/`)
   y crea el borrador con `POST /api/solutions`, como el botón manual. Si algo falla
   después, el borrador ya existe y se puede seguir a mano.
2. `POST /api/solutions/[id]/site-draft` responde en NDJSON, una línea por etapa:
   `reading` → `read` (páginas leídas) → `drafting` → `done` o `error`. La página muestra
   ese avance real; no es un spinner.
3. Al terminar abre `/account/solutions/[id]` en la primera pregunta. Un aviso arriba dice
   de qué sitio salió el borrador, y cada pregunta con respuestas tomadas de ahí lleva la
   marca ✦ con su fuente (enlace a la página exacta). La marca desaparece en cuanto el
   fundador cambia esa respuesta. La revisión final también etiqueta esas filas.

## Qué se lee y qué escribe la IA

- `src/lib/solutions/site-reader.ts` descarga la página principal y hasta cuatro internas
  (una por tipo: precios, producto, integraciones, nosotros), elegidas por la ruta o el
  texto del enlace. Nunca acceso, carrito, legales ni artículos sueltos. Mismas reglas
  SSRF que la portada (`src/lib/net/guarded-fetch.ts`): solo http(s), sin credenciales,
  sin IP privadas ni de metadatos, tres redirecciones revalidadas, 6 s y 512 KB por página.
  Se guarda el texto visible, como máximo 12 000 caracteres por página.
- Nombre y enlaces públicos (redes oficiales, precios, documentación) se leen directo del
  HTML, sin modelo (`readProjectLinks`, `siteBasics`). Los botones de compartir no cuentan.
- `src/lib/solutions/site-draft.ts` llama a Claude (`claude-opus-5-5`, esfuerzo `medium`)
  con el SDK oficial `@anthropic-ai/sdk` y salida estructurada: el esquema JSON enumera
  las listas cerradas del catálogo (categorías, capacidades, industrias, tamaños,
  precios, arranque, integraciones, cumplimiento), así que el modelo no puede devolver
  valores que no existen. Con `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`)
  la API reintenta en otro modelo si este rechaza la petición.
- La respuesta se valida otra vez en el servidor (`readDraftOutput`): se descartan valores
  desconocidos, capacidades fuera de las categorías elegidas, textos demasiado cortos y
  cualquier demo cuyo enlace no aparezca en el sitio. Los textos se recortan a sus límites.
- Regla del prompt: si el sitio no lo dice, el campo queda vacío. Nunca precios, clientes,
  cifras, certificaciones ni industrias supuestas. El texto del sitio va como material de
  referencia entre delimitadores (sin `<`/`>` propios) y el prompt de sistema ordena
  ignorar instrucciones que aparezcan ahí.

## Qué se guarda

- `mergeSiteDraft` llena solo lo vacío. Industrias, tamaños e integraciones tratan `[]`
  como respuesta («cualquiera» / «ninguna»), así que la IA nunca escribe `[]` ni pisa uno.
  El resultado pasa por `readSolutionData`, la misma validación que un guardado del editor.
- Escritura con control de versión (como el `PATCH` del editor); si el fundador guardó en
  otra pestaña mientras tanto, se vuelve a mezclar sobre su versión una vez. Solo borradores
  y cambios solicitados: una ficha en revisión no se toca. Deja un evento en el historial.
- `solution_site_drafts` (`db/solution-site-drafts.sql`): un registro por intento con
  estado, motivo de fallo, los valores escritos (`suggested`), la página de cada uno
  (`sources`), el modelo y los tokens. Nunca el texto del sitio ni el prompt. Se borra en
  cascada con la ficha o la cuenta.

## Límites y costo

- 5 intentos por cuenta y 300 en total cada 24 horas; cuentan los que llegaron al modelo o
  siguen en curso, no los sitios que no se pudieron abrir. Además, `securityLimit` de 5 por
  hora por cuenta y 20 por minuto global. Dos peticiones simultáneas pueden pasar el conteo
  diario por uno; el límite por hora acota esa ventana.
- Cada intento son unos 15 000 tokens de entrada (cinco páginas) y unos pocos miles de
  salida: del orden de 0.10–0.20 USD con los precios de Opus 5.5. El tope global acota el
  gasto diario.
- Sin `ANTHROPIC_API_KEY` la opción no aparece (no se ofrece algo que luego se niega) y la
  API responde 503.
- Si el modelo falla, se rechaza o se corta, el borrador se queda con lo que se lee directo
  (nombre y enlaces), marcado como parcial, y el aviso del editor lo dice.
- Sitios que cargan todo con JavaScript dejan poco texto en el HTML: con menos de 40
  palabras se responde `tooLittleText` y se sugiere llenarla a mano.

## Privacidad

Anthropic recibe el texto público de las páginas del sitio y la dirección escrita, nunca
datos de la cuenta. Está nombrado como subprocesador en Privacidad (es/en,
`#subprocesadores`) y en la propia tarjeta. Requiere la revisión legal pendiente (SHCWS-144).

## Verificación

- `tests/site-draft.test.ts` (11 pruebas): extracción de texto y metadatos, elección de
  páginas, enlaces públicos, validación de la respuesta, recorte, mezcla que respeta lo
  contestado, esquema igual al catálogo, delimitadores, normalización de la dirección y
  guardas de origen y sesión.
- `RUN_SITE_DRAFT_INTEGRATION=1 npx tsx tests/integration/site-draft.ts` recorre el camino
  completo del servidor contra la base configurada con el sitio real y un modelo simulado
  (gratis, sin clave): campos llenados y respetados, marcas y fuentes, evento, modo parcial,
  ficha en revisión intacta, límite diario y limpieza en cascada.
- No probado: una llamada real a Claude. Necesita `ANTHROPIC_API_KEY`.
