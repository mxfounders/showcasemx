# Ficha con IA desde el sitio del proyecto

Estado: 17 de noviembre de 2026 (SHCWS-151). Implementado y probado en local, incluida una
llamada real a Claude; no desplegado.

El fundador pega el enlace de su proyecto en «Publica tu proyecto» (`/account/solutions/new`)
y recibe un borrador de su ficha ya escrito, que revisa en los tres pasos del editor. Nada se
envía a revisión sin que llegue a la pantalla de revisión y lo confirme.

## Entradas

- **Onboarding** (`/onboarding`): quien elige «Soy fundador» o «Un poco de ambos» tiene
  un cuarto paso, «¿Agregamos tu producto ahora?», con tres opciones: con IA (pega su
  sitio ahí mismo y ve el avance), a mano (crea el borrador y abre el editor) o más
  tarde (Inicio). Compradores y exploradores siguen con tres pasos. El perfil se guarda
  antes de crear nada, así que un fallo al redactar no pierde las respuestas; si algo
  falla, se ofrece seguir a mano con el borrador o ir al Inicio. Sin clave de Anthropic
  la opción «con IA» no aparece. Ver SHCWS-28.
- **Publica tu proyecto** (`/account/solutions/new`, `NewSolutionForm`): el mismo campo de
  enlace de siempre. Con IA, «Empezar» redacta la ficha y muestra el avance; «Prefiero
  llenarla a mano» crea el borrador con el enlace y abre el editor, que lee del sitio solo
  nombre, descripción, portada y logo. Sin clave, el campo funciona como antes y no se
  menciona la IA.

Las dos usan el mismo cliente, `src/components/solutions/use-site-draft.tsx`
(`useSiteDraft` y `SiteDraftProgress`).

## Recorrido

1. El cliente normaliza la dirección (`tuproyecto.com` → `https://tuproyecto.com/`) y crea
   el borrador con su enlace (`POST /api/solutions`), igual que el camino manual y con el
   mismo id en cada reintento. Si algo falla después, el borrador ya existe y se puede
   seguir a mano.
2. `POST /api/solutions/[id]/site-draft` responde en NDJSON, una línea por etapa:
   `reading` → `read` (páginas leídas) → `drafting` → `done` o `error`. La página muestra
   ese avance real; no es un spinner.
3. Al terminar abre `/account/solutions/[id]` en «Lo básico». Un aviso arriba dice de qué
   sitio salió el borrador, y cada paso con respuestas tomadas de ahí lleva la marca ✦ con
   su fuente (enlace a la página exacta). La marca desaparece en cuanto el fundador cambia
   esa respuesta. La pantalla de revisión también etiqueta esas filas. Como la IA ya
   escribió el texto, el editor solo trae en silencio la portada y el logo del sitio, sin
   ofrecer el nombre y la descripción del sitio encima de lo redactado.

## Qué se lee y qué escribe la IA

- `src/lib/solutions/site-reader.ts` descarga la página principal y hasta cuatro internas
  (una por tipo: precios, producto, integraciones, nosotros), elegidas por la ruta o el
  texto del enlace. Nunca acceso, carrito, legales ni artículos sueltos. Mismas reglas
  SSRF que la portada (`src/lib/net/guarded-fetch.ts`): solo http(s), sin credenciales,
  sin IP privadas ni de metadatos, tres redirecciones revalidadas, 6 s y 512 KB por página.
  Se guarda el texto visible, como máximo 12 000 caracteres por página.
- Nombre y enlaces públicos (redes oficiales, precios, documentación) se leen directo del
  HTML, sin modelo (`readProjectLinks`, `siteBasics`). Los botones de compartir no cuentan.
- Cada línea repetida entre páginas (menú, pie, aviso de cookies) se envía una sola vez,
  en la primera página que la trae (`dedupePages`). En cordhq.app eso bajó la entrada de
  35 282 a 26 260 tokens.
- `src/lib/solutions/site-draft.ts` llama a Claude (`claude-sonnet-5-5`, esfuerzo `medium`)
  con el SDK oficial `@anthropic-ai/sdk` y salida estructurada: el esquema JSON enumera
  las listas cerradas del catálogo (categorías, capacidades, industrias, tamaños,
  precios, arranque, integraciones, cumplimiento), así que el modelo no puede devolver
  valores que no existen. Con `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`)
  la API reintenta en otro modelo si este rechaza la petición.
- La respuesta se valida otra vez en el servidor (`readDraftOutput`): se descartan valores
  desconocidos, capacidades fuera de las categorías elegidas, textos demasiado cortos y
  cualquier demo cuyo enlace no aparezca en el sitio. Los textos se recortan a sus límites.
- Desde SHCWS-56 (17 nov 2026) también propone país de origen, países donde atiende y
  factura, monedas, idiomas y horario de soporte, formas de pago y año de fundación. Los
  códigos se validan contra `Intl`, un año futuro se descarta y la IA nunca escribe `[]`
  («cualquier país» es respuesta del fundador). Equipo, número de clientes y casos no se le
  piden. Ver docs/provider-facts.md.
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
- Con Sonnet 5.5 ($2 y $10 por millón de tokens) cada intento cuesta entre 0.04 y
  0.07 USD y tarda unos 9 s (medido abajo). El tope global de 300 al día limita el gasto a
  unos 20 USD diarios en el peor caso.

## Modelo

Elegido por medición el 17 de noviembre: los mismos tres sitios reales (cordhq.app,
flouvia.com, alegra.com/mexico), leídos una vez y redactados por los tres modelos con
esfuerzo `medium`, pasando por la misma validación.

| Modelo | Costo por ficha | Tiempo | Resultado |
| --- | --- | --- | --- |
| Haiku 5.5 | 0.003–0.005 USD | 15–26 s | Correcto pero más corto: omitió «cuándo no encaja» de Cord, menos capacidades y copió una promoción temporal como precio |
| Sonnet 5.5 | 0.04–0.07 USD | 8–9 s | Igual de completo que Opus; a veces detecta más capacidades e integraciones |
| Opus 5.5 | 0.08–0.17 USD | 10–27 s | Referencia |

Sonnet 5.5 da la calidad de Opus a ~40 % del costo y en un tercio del tiempo, que en el
onboarding importa. Cambiar de modelo es una línea (`SITE_DRAFT_MODEL`); `draftGenerator`
omite `fallbacks` con Haiku, que no tiene respaldo del lado del servidor. Antes de cambiarlo,
repetir la comparación: el prompt de precios ya pide no copiar promociones con fecha.
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
- Llamadas reales a Claude (17 de noviembre): el recorrido completo del servidor con
  cordhq.app contra `neondb` (cuenta temporal borrada al terminar): 18 campos llenados con
  fuente por página, valores dentro del catálogo, tamaño de empresa vacío porque el sitio
  no lo dice, aterriza en «Lo básico». Y la comparación de modelos de arriba.
- No probado: el recorrido en el navegador contra un despliegue con la clave.
