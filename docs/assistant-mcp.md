# Servidor MCP para el asistente de IA del fundador

Estado: 18 de noviembre de 2026 (SHCWS-152). Implementado y probado en local contra `neondb`;
no desplegado. Migración `db/assistant-tokens.sql` aplicada solo en `neondb`.

Un fundador que ya trabaja con Claude, Cursor u otro asistente compatible con MCP conecta
shwcs como herramienta y pide «publica mi producto en shwcs» sin abrir el editor. El asistente
crea el borrador, ve lo que falta, lo completa y lo envía a revisión cuando el fundador lo
confirma. Nada se publica sin la revisión del equipo en ops.

## Servidor

- `POST /api/mcp` (`src/app/api/mcp/route.ts`): transporte Streamable HTTP del SDK oficial
  `@modelcontextprotocol/sdk@1.32.2` (`WebStandardStreamableHTTPServerTransport`), **sin
  sesiones** (`sessionIdGenerator: undefined`) y con respuesta JSON, no SSE. Cada petición crea
  su propio `McpServer` ligado a la cuenta del token, así que cualquier instancia de Fluid
  Compute contesta cualquier petición. `GET` y `DELETE` responden 405: no hay flujo iniciado
  por el servidor ni sesión que cerrar. Cuerpo máximo 64 KiB; `maxDuration` 180 s (preparar un
  borrador desde el sitio lee hasta cinco páginas y llama al modelo).
- Se eligió el SDK y no un manejador JSON-RPC propio porque su transporte de estándares web
  encaja directo con un Route Handler de Next 15 (recibe `Request`, devuelve `Response`) y
  resuelve el protocolo (inicialización, versiones, validación de argumentos con zod). `zod`
  (4.6.7) entra como dependencia explícita porque el SDK la pide como peer.
- Autenticación: solo `Authorization: Bearer shwcs_mcp_…`. La cookie de sesión no autentica
  aquí y el token nunca se lee de la URL (quedaría en los registros). Sin cabeceras CORS: un
  navegador no puede llamarlo desde otro sitio. Cada petición vuelve a buscar el token, por eso
  revocarlo surte efecto en la siguiente llamada.
- `/api/mcp` vive bajo `/api/`: el middleware no lo toca y no está en `robots` ni en el sitemap.

## Tokens personales

Ajustes → Conexiones → «Asistentes de IA» (`AssistantTokens`, `POST /api/account/assistant-tokens`).

- Formato `shwcs_mcp_` + 32 bytes aleatorios en base64url. Se muestra **una sola vez** al
  crearlo, con el comando listo para Claude Code. Solo se guarda su SHA-256 (como las
  sesiones) y los cuatro primeros caracteres del secreto para reconocerlo en la lista.
- Nombre (1–60), alcance (`solutions`: solo las fichas propias), caducidad de 7, 30, 90 o 365
  días (sin «nunca») e idioma (el de la página donde se creó; define el idioma de las
  descripciones y mensajes que recibe el asistente). Máximo 10 activos por cuenta.
- **Crear y revocar** exigen sesión, mismo origen y la contraseña otra vez, como vincular
  Google. Crear también gasta un código del segundo factor si la cuenta lo tiene activo
  (misma regla que SHCWS-173: una contraseña robada sola no entrega una credencial).
- Al crear uno llega un aviso de seguridad (categoría `security`, siempre activo, correo
  inmediato) que lleva a Conexiones. «No fui yo» manda a elegir contraseña nueva, y eso apaga
  todos los tokens (ver abajo).
- **Muere con la contraseña**: el token guarda el SHA-256 del hash de contraseña con el que se
  creó (`password_stamp`). Cambiarla, restablecerla o recuperarla deja de autenticar todos los
  tokens anteriores sin tocar otras rutas, igual que cierra las sesiones (CLAUDE.md §6). La
  lista los muestra como «Dejó de funcionar al cambiar tu contraseña».
- Una cuenta suspendida desde ops tampoco autentica sus tokens (`suspended_at IS NULL`).
- La exportación de datos incluye los tokens (sin hash) y su bitácora; eliminar la cuenta los
  borra en cascada.

## Herramientas

Nombres en español, descripciones en el idioma del token (diccionario `assistant.server`).
Todas trabajan solo sobre las fichas de la cuenta del token: un id ajeno responde `notFound`
igual que uno inexistente.

| Herramienta | Qué hace | Mismo camino que |
| --- | --- | --- |
| `estado_de_mis_fichas` | Lista las fichas propias: estado, versión, si ya se puede enviar, bloques que faltan, comentario de revisión y enlaces | `getOwnedSolutions`, `solutionChecklist`, `latestDecision` |
| `crear_borrador` | Crea un borrador; con `sitio_web`, lo prepara con IA salvo `preparar_con_ia: false` | `createDraft` (POST /api/solutions) y `reserveSiteDraft`/`runSiteDraft` (ficha con IA, misma cuota diaria y límite por hora) |
| `ver_lo_que_falta` | Datos actuales, versión, errores para enviar, guía de bloques, capacidades válidas para sus categorías, capturas subidas, comentario de revisión | `solutionErrors`, `solutionChecklist` |
| `actualizar_borrador` | Cambia campos con la versión leída; `null` quita un campo opcional | `applySolutionChanges` → `readSolutionData` → `saveSolution` (PATCH /api/solutions/[id]) |
| `subir_captura` | Descarga una imagen pública y la guarda; con descripción la agrega a la ficha | `guardedFetch` (SSRF), `prepareScreenshot`/`storeScreenshot` (POST …/media) |
| `enviar_a_revision` | Envía a revisión; exige `confirmo: true` | `saveSolution` con `submit` |

Reglas que heredan del editor, sin duplicarlas:

- `src/lib/solutions/writes.ts` (`createDraft`, `saveSolution`, `applySolutionChanges`) y
  `src/lib/solutions/screenshots.ts` (`prepareScreenshot`, `storeScreenshot`) se extrajeron de
  las rutas del editor, que ahora los llaman. Mismo SQL, mismo control de `version`, mismo
  aviso al equipo de revisión al enviar, mismas cuotas de archivos.
- El esquema de `cambios` enumera las listas cerradas del modelo (categorías, capacidades,
  industrias, tamaños, precios, integraciones, cumplimiento, tipos de enlace) y es estricto:
  un campo fuera del editor (`catalog_key`, `owner_id`, `status`…) se rechaza. Después,
  `readSolutionData` valida igual que un guardado del editor; si algo no pasa, la respuesta
  dice qué campos fallaron probando cada uno sobre los datos actuales.
- Una ficha en revisión no se edita ni recibe capturas. Guardar una ficha publicada la deja en
  borrador sin tocar `published_data`, como el editor.
- `enviar_a_revision` deja la ficha en `pending`, escribe el evento y avisa al equipo. Nunca
  publica: aprobar sigue siendo exclusivo de ops.
- El asistente no puede retirar un envío, despublicar ni borrar: esas acciones siguen en la web.

## Límites y bitácora

- Por token: 300 peticiones por hora (`securityLimit('assistant-mcp')`, 600/min en total). Un
  token inválido gasta uno de 30 intentos por hora de su red.
- Por cuenta, los mismos límites que la web, compartidos con ella: `solution-create` 20/h,
  `solution-update` 180/h, `solution-media` 30/h y la cuota de ficha con IA (5 al día).
- `assistant_token_events`: una fila por llamada a herramienta con el token, la herramienta, la
  ficha propia (si la hubo), el resultado y un código corto. Nunca los argumentos ni el texto de
  la ficha. Se guardan 180 días (cada inserción borra las más viejas de ese token). El dueño ve
  las últimas 40 en Conexiones.

## Clientes

Página «Conecta shwcs a tu asistente» (`/account/settings/connections/assistant`, es/en).

- **Claude Code**: `claude mcp add --transport http shwcs <url> --header "Authorization: Bearer <token>"`.
- **Claude.ai y Claude Desktop**: conector personalizado con la sección «Request headers» (en
  beta, no todas las cuentas la tienen); si no aparece, en Claude Desktop el puente
  `mcp-remote@0.15.2` (versión fijada) con el encabezado en una variable de entorno.
- **Cursor y otros clientes**: `url` + `headers` en su `mcp.json`.
- **ChatGPT**: sus conectores solo aceptan OAuth o ningún acceso. shwcs todavía no ofrece OAuth
  y la página lo dice así, sin fingir que funciona.

## OAuth: fuera de esta entrega

El issue pedía OAuth «o» token personal. OAuth para MCP exige metadatos del recurso protegido y
del servidor de autorización, registro dinámico de clientes (Claude.ai lo usa), pantalla de
consentimiento, códigos con PKCE, tokens de acceso y de refresco con rotación y revocación. No
es simple y se dejó fuera a propósito; es lo que falta para ChatGPT y para Claude.ai sin la
sección de encabezados. Los tokens personales cubren Claude Code, Claude Desktop y Cursor hoy.

## Verificación

- `tests/assistant-mcp.test.ts`: formato del token y del encabezado, nombre y caducidad, sello
  de contraseña, cambios validados por el editor (incluido `null`, `[]` y un campo requerido),
  campos ajenos descartados, textos en ambos idiomas y guardas de las rutas (sin token → 401 sin
  tocar la base, cookie de sesión no autentica, sin CORS, `GET` 405, origen y sesión al crear).
- `RUN_ASSISTANT_MCP_INTEGRATION=1 APP_ORIGIN=http://localhost:3107 npx tsx tests/integration/assistant-mcp.ts`
  con el cliente oficial contra un servidor en marcha y `neondb`: crear token (contraseña
  incorrecta rechazada, solo el hash guardado, aviso de seguridad), listar herramientas, crear
  borrador, ver lo que falta, versión vieja → conflicto, campo inválido señalado, `catalog_key`
  rechazado, actualizar hasta quedar lista, capturas desde `127.0.0.1` y `169.254.169.254`
  rechazadas, captura pública subida y agregada, ninguna herramienta alcanza la ficha de otra
  cuenta, enviar sin confirmación rechazado y con confirmación `pending` sin publicar, ficha en
  revisión bloqueada, bitácora sin argumentos, token revocado y token anterior a un cambio de
  contraseña rechazados en la siguiente llamada, exportación sin hash. Cuentas, blobs y
  contadores se borran al terminar.

## Pendientes

- OAuth (ver arriba) y, con él, ChatGPT.
- Herramientas de lectura del catálogo para compradores (`buscar_soluciones`), junto con
  llms.txt (SHCWS-106).
- Límite propio en el firewall de Vercel para `/api/mcp` si llega tráfico abusivo: hoy solo lo
  limitan `securityLimit` y las reglas generales (`firewall/rules.json` no lo bloquea).
- Revisión legal: la guía avisa que el asistente elegido recibe los datos de las fichas que se
  le pida leer, incluido el correo privado de contacto (SHCWS-144).
