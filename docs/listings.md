# Entradas reales del catálogo local

Incluidas por solicitud del usuario, con descripciones basadas en sus sitios
oficiales. No implican certificación independiente, pruebas funcionales de esos
servicios ni garantías sobre sus resultados.

| Entrada | Tipo | Categorías | Fuente y enlace |
| --- | --- | --- | --- |
| Cord | Software de Flouvia | Cobros, Finanzas, Ventas | [cordhq.app](https://cordhq.app/) |
| Flouvia | Servicio de ingeniería digital | Operación, Ventas, Agencias | [flouvia.com](https://flouvia.com/) |

Cord presenta cotización, seguimiento comercial, cobranza y facturación.
Flouvia ofrece desarrollo de e-commerce, portales B2B y automatizaciones a medida.
Agencias agrupa proveedores de servicios; es distinto de la industria de empresas
compradoras «Agencias y consultoras» enlazada en la navegación.

Los ejemplos ficticios de `src/lib/catalog-preview.ts` solo se muestran con
`NEXT_PUBLIC_SHOW_DEMO_PROJECTS=true`; las entradas reales se vinculan a
publicaciones de Neon mediante catalog_key. Desde SHCWS-38 el home ya no rellena
cada categoría hasta nueve lugares con «Espacio disponible» (ver abajo).

Las entradas reales tienen `website`, `provider` y `offering`. La ficha ofrece
«Visitar sitio oficial» en una pestaña nueva. Los ejemplos mantienen «Ver ejemplo»
y su aviso de contenido ficticio. No mostrar mockups de diseño como capturas de
los productos reales ni inventar logos, testimonios o nombres de founders.

Siguiente paso propuesto: fichas permanentes `/p/[slug]`, contenido/activos reales
autorizados y medición de visitas al sitio oficial; después catálogo persistente,
revisión y solicitudes de contacto.

## Portadas Open Graph

Las tarjetas reales usan copias locales de la imagen `og:image` declarada por
cada página, renderizadas con `next/image` y carga diferida:

| Oferta | Fuente OG | Copia local |
| --- | --- | --- |
| Cord | `https://cordhq.app/og-cord.jpg` | `public/images/catalog/cord-og.jpg` |
| Flouvia | `https://flouvia.com/imgs/og-flouvia.png` | `public/images/catalog/flouvia-og.png` |

El campo `ogImage` apunta a la copia local. No hay scraping en cada visita ni
actualización automática: si cambia el OG del proveedor, renovar el archivo.

El icono junto al nombre usa el campo `favicon`, también con copia local:
`https://cordhq.app/favicon.svg` → `public/images/catalog/cord-favicon.svg` y
`https://flouvia.com/favicon-light.svg` → `public/images/catalog/flouvia-favicon.svg`.
Se conservan los colores originales del favicon; la inicial de color queda
como alternativa para entradas sin icono. Esto no cambia el favicon de shwcs.


## Propietario y solicitudes

Cord y Flouvia fueron vinculados a la cuenta indicada expresamente por el usuario.
Aparecen en Mis soluciones y reciben solicitudes en Oportunidades. Conservan OG,
favicon, categorías e identidad de guardados. Datos adicionales todavía desconocidos
se muestran como pendientes, sin inventar información comercial.


## Actualización vigente: capturas e inicio adaptativo

Inicio `/account` distingue comprador/fundador/ambos; listado en `/account/solutions`.
Sidebar conserva estética y añade Inicio, sin Configuración duplicada. Fichas con
galería de capturas reales, ampliación accesible y demo externa; preview privada
del borrador guardado. Guía de información, límites de encaje y fecha de aprobación.
Las pantallas mantienen fondo libre, separadores suaves, cinco tonos y botones azul
suave, sin movimientos magnéticos. No inventar capturas para Cord/Flouvia.
Contrato y permisos actuales: [media-dashboard.md](media-dashboard.md).

## Portada automática desde el sitio del proyecto — 3 septiembre 2026

Una ficha ya no depende de que su autor suba capturas para tener imagen: al
escribir el sitio, se lee la `og:image` que ese sitio ya publica.

- Orden de portada: captura propia (`published_data.screenshots[0]`) → arte local
  de Cord/Flouvia (`ogImage` en `catalog-preview.ts`) → `og:image` del sitio.
- **Guardamos una copia, no un enlace remoto.** Los bytes se descargan una vez,
  se reescalan a 1200×900 como máximo y se reencodifican a WebP (≤400 KB) con
  Sharp, igual que las capturas. Apuntar el catálogo a un `<img>` remoto haría
  que cada visitante pidiera un archivo al servidor de un tercero, que es
  justamente el píxel externo que el aviso de privacidad dice no incrustar.
- Tabla `solution_site_images` (una fila por solución), migración
  `db/solution-site-image.sql`, aplicada a `neondb` y a `shwcs_production`.
- **Los bytes viven en Vercel Blob**, no en Postgres (migración `db/media-storage.sql`
  + `db/media-storage-drop.sql`, 5 sep 2026; ver CLAUDE.md §58). La fila guarda
  `storage_key` (ruta del blob), `bytes` y `checksum` (sha256, sirve de `ETag`).
  Cada re-lectura de la og:image acuña una `storage_key` nueva; el trigger
  `AFTER UPDATE OF storage_key` encola la vieja en `storage_orphans` para el
  barredor. La rama de fallo nunca toca `storage_key`, así que una portada que
  funciona no se huerfaniza por un error transitorio del sitio.
- `GET /api/solutions/[id]/site-image` sirve el WebP: público solo si la solución
  está publicada; mientras es borrador responde únicamente a su dueño, para que
  un UUID ajeno no confirme que ahí existe un borrador.
- `POST` en esa misma ruta la busca o la actualiza; solo el dueño, mismo origen,
  20 por hora. `SiteImageCard` lo intenta **una vez** de forma automática cuando
  hay sitio y todavía no hay portada; después es un botón manual. No se relee el
  servidor ajeno en cada visita.
- Cuando falla se guarda el motivo y se le muestra al dueño («el sitio no declara
  og:image», «no pudimos abrirlo»), en vez de dejar un hueco silencioso: el
  arreglo casi siempre está de su lado.

### Petición saliente con URL de un tercero

Descargar una dirección que escribió una persona es territorio de SSRF, así que
cada salto se valida en `src/lib/solutions/site-image.ts`:

- Solo `http:`/`https:`, sin credenciales en la URL. Además `safeSolutionUrl` ya
  exige un punto en el host, lo que descarta `localhost` antes de tocar la red.
- Resolución DNS previa y rechazo de loopback, privadas, link-local (incluida
  `169.254.169.254`, la de metadatos de nube), CGNAT y las equivalentes IPv6,
  incluidas las direcciones IPv4 mapeadas.
- Redirecciones seguidas a mano, máximo tres, revalidando el host en cada salto.
- Tiempos de espera de 6 s (HTML) y 8 s (imagen); topes de 2 MB de HTML (lo que
  sobra se corta, no se rechaza la página) y 5 MB de imagen.
- Solo se leen `og:image`, sus variantes y `twitter:image`: primero en el `<head>` y,
  si no están ahí, en el resto de la página, donde los ponen los sitios que mandan los
  metadatos en streaming (React 19, Next.js). Las del `<head>` siempre ganan.
  `<title>` solo cuenta dentro del `<head>`: en el cuerpo suele ser la etiqueta de
  un SVG.

**Límite conocido y no disimulado**: la comprobación de DNS ocurre antes de la
petición, y un nombre podría resolver a otra dirección entre la comprobación y la
conexión (TOCTOU). Cerrarlo del todo exige conectar contra la IP ya validada con
la cabecera Host correcta; no está hecho. El riesgo queda acotado por el resto de
guardas y porque la respuesta nunca se devuelve al cliente: solo se guarda una
imagen reencodificada.

## Logo automático desde el sitio — 14 noviembre 2026 (SHCWS-177)

La misma lectura que toma la portada lee también el logo que declara el sitio, así
que cada ficha muestra su marca en el catálogo, el inicio, la búsqueda y la vista
previa del editor, en vez de su inicial.

- Candidatos del `<head>`, de mejor a peor: un PNG declarado cerca de 192 px (un
  `apple-touch-icon` cuenta como 180), luego SVG, luego PNG pequeños y `favicon.ico`.
  Después, `/apple-touch-icon.png` y `/favicon.ico` aunque no estén declarados.
  `mask-icon` se ignora: es una silueta de un color. Como mucho tres descargas.
- `src/lib/solutions/site-icon.ts`: Sharp lo normaliza a un WebP cuadrado de hasta
  128 px, con fondo transparente y como máximo 64 KB. Un SVG se rasteriza (nunca se
  sirve como SVG); una animación queda en su primer cuadro; un `.ico` se abre a mano,
  porque Sharp no lo lee (PNG interno o mapas de bits de 24/32 bits). Menos de 32 px se
  descarta: el navegador lo convertiría en un borrón y la inicial se ve mejor.
- Se guarda en Blob con clave nueva en cada lectura (`solutions/{id}/icon/{uuid}.webp`)
  y una fila en `solution_site_icons`. Sus triggers encolan el blob anterior en
  `storage_orphans` al reemplazarlo o al borrar la ficha o la cuenta. El borrado de
  cuenta no lo elimina en línea como la portada: lo recoge el barrido diario.
- Si una lectura no encuentra logo, se conserva el anterior, salvo que la ficha ahora
  apunte a otro sitio; en ese caso se borra, porque ya no es su logo.
- `GET /api/solutions/[id]/site-icon` sigue las reglas de la portada: público con la
  ficha publicada, solo el dueño en borrador y 404 vacío en cualquier otro caso. No es
  `immutable`, porque el dueño puede volver a leer el sitio.
- **Siempre al día (18 nov 2026, pedido de André al cambiar el favicon de Cord):** el logo
  leído del sitio va **antes** que el arte local de Cord y Flouvia (`staticArtFor()` queda
  solo como respaldo sin logo guardado). `refreshSiteIcons()`
  (`src/lib/solutions/site-icon-store.ts`) vuelve a leer el logo de cada ficha publicada
  con más de 20 h desde su última lectura, en el cron diario de monitor, y de las leídas
  hace más de una hora tras cada decisión de publicación en ops (`catalog-revalidate`).
  Lee solo el logo, no la portada (`fetchSiteIconOnly`). Si los bytes son los mismos solo
  actualiza `fetched_at`: sin blob nuevo ni huérfano. Un logo distinto tiene clave nueva y
  la URL pública lleva `?v=<checksum>` (`siteIconUrl`), así que ningún navegador ni la CDN
  se quedan con el anterior. Un sitio caído conserva su logo y se reintenta al día
  siguiente.

Páginas largas: muchos sitios mandan más de 512 KB de HTML con CSS y JS en línea, y
los que hacen streaming de metadatos ponen la `og:image` y los íconos después del
`<head>` (en linear.app, a unos 960 KB del inicio). Antes eso daba `pageTooLarge`, o se
ignoraban esas etiquetas, y la ficha se quedaba sin portada ni logo. Ahora se leen los
primeros 2 MB y se busca primero en el `<head>` y después en el resto de la página.
Comprobado el 14 de noviembre con cordhq.app, flouvia.com, linear.app, stripe.com,
github.com, notion.so, vercel.com y hubspot.com: los ocho dan portada y logo.

## Carrusel, portada y estructura de la ficha — 18 noviembre 2026

Sustituye la versión del 3 de septiembre. Pedido del propietario: «la primera imagen
siempre la og:image a menos que decidan lo contrario los founders», un carrusel que se
vea como carrusel y una ficha fácil de leer.

### Primera imagen

`src/lib/solutions/gallery.ts` es la única regla:

- `solutionSlides()`: la og:image del sitio va primero y luego las imágenes del fundador
  en su orden. Si el fundador eligió `coverSource: 'screenshot'`, va primero su primera
  imagen y la og:image queda al final. `hideSiteImage` la quita.
- `solutionCover()`: la portada de las tarjetas (catálogo, inicio, biblioteca, Inicio del
  fundador) es siempre la primera diapositiva; sin imágenes, el arte local de Cord y
  Flouvia. Una og:image oculta nunca es portada (antes sí podía serlo).

El fundador lo elige junto a la vista previa de su tarjeta en el editor: «La imagen de tu
sitio (recomendada)», «Tu primera imagen de la galería» o «Solo tus imágenes, sin la de tu
sitio». Como todo campo de `data`, llega al público al aprobarse. También lo leen el
asistente MCP (`coverSource`) y la revisión en ops («Primera imagen»).

### Carrusel (`solution-gallery.tsx`)

Una fila a todo el ancho de la ficha: dos imágenes completas y la tercera asomándose en
escritorio, una y media en móvil. Marco 16:10 para todas; las imágenes del fundador con
`object-contain` (no se recorta una interfaz) y la og:image con `object-cover` (por
especificación es 1.91:1 y centra su contenido). Flechas a los lados, puntos debajo,
desplazamiento táctil y flechas del teclado. Al tocar una imagen se abre en un `<dialog>`
con posición («3 de 9»), pie, anterior/siguiente, flechas del teclado y Escape; el foco
vuelve a la imagen que lo abrió.

`?w=1600` de una captura es la imagen completa: el cargador pide 400, 800 o 1600 y la ruta
antes respondía 404 al tercero, así que las pantallas grandes y retina veían imágenes
rotas (corregido el 18 de noviembre, `src/lib/images/media-width.ts`).

### Estructura de la ficha pública

1. Tipo y categorías, nombre, descripción del problema.
2. Carrusel, en la primera pantalla también en móvil.
3. «De un vistazo»: precio, cómo probarlo, modelo, rango, arranque e integraciones en una
   tarjeta.
4. Barra de secciones fija bajo el menú del sitio (`section-nav.tsx`), solo con las
   secciones que la ficha muestra, marcando la que se está leyendo.
5. «Qué hace» (alcance y capacidades), «Para quién está pensada» y «Cuándo puede no
   encajar» lado a lado, Planes, Soporte y contrato, Para equipos técnicos, Antes de
   decidir, Dónde opera, Conoce su trabajo, Quién está detrás, Novedades, Reseñas y
   Preguntas.

Las secciones con ancla (`que-hace`, `para-quien`, `planes`, `soporte`, `tecnico`,
`antes-de-decidir`, `su-trabajo`, `equipo`, `resenas`, `preguntas`) tienen
`scroll-margin-top` para no quedar bajo las dos barras.

### Tarjetas del inicio (`landing-features.tsx`)

La portada va arriba y el texto abajo sobre blanco, nunca encima de la imagen: una portada
suele traer su propio titular y el nombre superpuesto no se leía. Categoría y contadores
van en pastillas blancas sobre la imagen.

## Capacidades y filtros derivados del resultado — 5 septiembre 2026

Detalle completo en CLAUDE.md §59. La categoría `Agencias` (proveedores de
servicios) es distinta de la industria `Agencias y consultoras` (empresas
compradoras) mencionada arriba — desde esta entrega la categoría también tiene
ruta propia (`/explorar/agencias`) y aparece en el filtro "Caso de uso"; antes
era legal declararla pero no tenía dónde aparecer.

Los filtros de capacidad, integración, precio, arranque y cumplimiento se
calculan a partir de los productos que ya pasaron los demás filtros: un eje
sin ningún valor presente entre esos resultados no se renderiza. Con el
catálogo real todavía en una o dos fichas, esto evita ocho dropdowns casi
vacíos; el comportamiento cambia solo — y automáticamente — según crece el
catálogo real.

## Home para compradores y señales en las tarjetas — noviembre 2026

- **Sin huecos (SHCWS-38)**: el explorador del home, las pestañas de «Encuentra la
  tecnología» y las tarjetas apiladas muestran solo proyectos reales. Una categoría o
  pestaña con menos de tres (cuatro en las pestañas) termina con una tarjeta «Cuéntanos qué
  necesitas» que lleva al formulario de contacto con la necesidad prellenada
  (`contactBriefHref`). La única llamada a fundadores del home es la franja final
  «¿Construyes software para empresas? Publicar gratis» (`FounderInvitation`). Sustituye la
  decisión histórica de los nueve lugares (CLAUDE.md §24).
- **Señal de respuesta (SHCWS-52)**: `src/lib/solutions/response.ts` (consulta) y
  `response-model.ts` (reglas y texto, sin driver de base). Mediana de horas hasta la
  primera respuesta del destinatario (mensaje o cambio de estado) y cuántas respondió, en
  los últimos 90 días, solo solicitudes de cuentas con correo verificado; no cuentan las de
  las últimas 72 h sin respuesta ni las retiradas antes de responder. Mínimo 3 solicitudes.
  `PublishedProduct.response` la lleva a las tarjetas (`ResponseSignalNote`); para una sola
  ficha, `solutionResponseSignal(id)`. Filtro «Responde rápido» (≥ 8 de 10 respondidas y
  mediana ≤ 48 h) y bonificación de hasta 2 puntos en el orden (`responseRankBonus`),
  publicada en `/criterios`.
- **Dominio verificado (SHCWS-134)**: las tarjetas muestran «Dominio verificado · mes»
  (`DomainVerifiedChip`) mientras la prueba TXT esté vigente y sea del host al que apunta la
  ficha (`PublishedProduct.domainVerifiedAt`). Es control del dominio, no identidad legal ni
  «Verificado por shwcs». El cron diario de monitor llama a `renewDomainProofs`
  (`src/lib/trust/renewal.ts`): 14 días antes de vencer, si el TXT sigue publicado renueva
  90 días; si no, crea un aviso al fundador con `listing_notice` (cuenta y, con los avisos
  de fichas activos, correo por la cola existente), una vez por fecha de vencimiento.
- **Nuevo esta semana (SHCWS-125)**: `/nuevo` muestra las fichas cuya primera aprobación
  (primer evento `published` en `solution_events`, o `published_at`) cae en los últimos
  siete días, por fecha, sin votos; después, un archivo por semana (lunes a domingo, hora de
  Ciudad de México, hasta 12 semanas). El home muestra hasta cuatro en un bloque que no se
  renderiza si no hay ninguna. Lógica en `src/lib/solutions/new-this-week.ts`.


## Precio que sirve para decidir (SHCWS-51) — noviembre 2026

El precio sigue siendo **opcional para publicar** (decisión del propietario, 14 de
noviembre). Lo que el proyecto declara se muestra igual en la tarjeta, la ficha, el
comparador, `/soluciones/<id>.md` y el JSON-LD; nada se inventa ni se convierte.

- **Campos** (`SolutionData`, en el `jsonb`, sin migración): `priceFrom` (número ≥ 0,
  redondeado a centavos, máximo 10 000 000 000), `priceCurrency` (código ISO 4217 de
  `Intl.supportedValuesOf`, cualquier mercado; `src/lib/currencies.ts`) y `priceUnit`
  (qué paga: un modelo con monto — mensual, anual, pago único, por uso, por proyecto, por
  hora; `solutionPriceUnits`). `0` es «Plan gratuito». Para enviar a revisión, un monto
  mayor que cero exige moneda y modalidad (`priceIncomplete`).
- **Formato** (`src/lib/solutions/pricing.ts`): «Desde $29 USD/mes», «Desde $90,000 MXN por
  proyecto», «From €9.50 EUR, one-time». El código de la moneda siempre se ve, porque «$»
  solo es ambiguo. Sin moneda no se muestra un número suelto.
- **Bandas en dólares**, para filtrar entre monedas: las cinco mensuales de siempre (sus
  ids conservan el nombre con el que se guardaron) y cinco nuevas de presupuesto por
  proyecto (`proyecto-menos-1000` … `proyecto-mas-50000`), más «Depende del alcance». El
  editor ofrece la familia que corresponde al modelo declarado (suscripción y uso: mensual;
  proyecto, hora y pago único: por proyecto; sin modelo: ambas). Si el precio está en USD,
  el editor sugiere la banda con un clic y el filtro la usa cuando no hay una declarada
  (`effectivePriceBand`; un precio anual se divide entre doce). Otras monedas no derivan
  banda: no hay fuente de tipo de cambio.
- **Tarjetas**: `priceSummary` muestra el «Desde», o la banda, o los modelos
  («Por proyecto · Solo a cotizar»), o nada. En el explorador del home ocupa el lugar de
  «Por {proveedor}» para no cambiar la altura fija de la tarjeta.
- **Filtros**: «Rango de precio» (las dos familias en el mismo eje) y «Modelo de
  contratación» (`contratacion`, varios valores con O), también en las alertas guardadas.
- **Comparador**: filas «Precio de entrada», «Modelo de contratación» y «Rango de precio»
  antes del texto libre del fundador.
- **Pendiente**: mostrar al comprador una conversión a su moneda. Requiere una fuente de
  tipo de cambio que hoy no existe; hasta entonces la ficha dice que el precio está en la
  moneda del proyecto y que no se convierte.

## URLs con nombre — 14 noviembre 2026 (SHCWS-101)

La ficha pública vive en `/<locale>/soluciones/<slug>` (`/es/soluciones/cord`). El slug
solo nombra la página: el UUID sigue siendo la identidad en guardados (`solution:<uuid>`,
`catalog:cord`), contactos, métricas, anuncios, imágenes y APIs. `catalog_key` no cambia.

- **Columna y forma** (`db/solution-slugs.sql`): `founder_solutions.slug`, única;
  minúsculas ASCII, dígitos y guiones entre palabras, hasta 60 caracteres, nunca con forma
  de UUID ni `opengraph-image…`. `isSolutionSlug` (`src/lib/solutions/slug.ts`) comprueba lo
  mismo que el CHECK.
- **Asignación**: la primera aprobación en ops (`POST /api/review`, `publish`) la deriva
  del nombre aprobado (`solutionSlugCandidates`: sin acentos, `cord`, `cord-2`…) y toma la
  primera libre: ni el slug actual de otra ficha ni uno que otra usó antes. Se conserva al
  actualizar, retirar y volver a publicar. Si las 50 candidatas estuvieran ocupadas, la
  ficha sigue funcionando por UUID. La bitácora del `publish` guarda el slug.
- **Cambio por ops**: solo admin, en la tarjeta «Dirección pública» de la postulación
  (`POST /api/solutions/<id>/slug`, motivo obligatorio). Una sentencia escribe el cambio, la
  bitácora (`solution_slug_change`, anterior → nuevo) y, si la ficha está publicada, un aviso
  al dueño (categoría `account`). No acepta el slug que otra ficha usa o usó.
- **Historial**: un trigger guarda cada slug anterior en `solution_slug_history`. Un slug
  está en un solo sitio: actual de una ficha o anterior de una. Por eso un enlace viejo
  nunca termina en otra ficha.
- **Redirecciones reales**: el middleware decide antes de renderizar
  (`src/lib/solutions/slug-routing.ts`), así que los códigos son HTTP de verdad (una página
  bajo `loading.tsx` solo puede responder 200, CLAUDE.md §53): UUID o slug anterior → **301**
  al actual, conservando idioma, query (`?from=sponsored&ad=…`) y el sufijo de transporte de
  Next (`.rsc`); slug desconocido → **404** pequeño; sin idioma → 307 directo a
  `/<locale>/soluciones/<slug>`. Guarda en memoria los slugs publicados y los recarga como
  mucho cada minuto, o cada 15 segundos mientras ve slugs que no conoce (una ficha recién
  publicada o renombrada; no más seguido para que los bots que prueban rutas inventadas no
  mantengan despierta la base, §79). Ante cualquier duda (sin base, lectura fallida, UUID sin slug)
  deja pasar a la página, que también encuentra la ficha por UUID o slug anterior y
  redirige ella (redirección suave, bajo el `loading.tsx`).
- **Dónde aparece el slug**: tarjetas del catálogo (`detailUrl`), canonical, hreflang,
  Open Graph, JSON-LD, sitemap, `/llms.txt`, `/soluciones/<slug>.md` (por UUID responde 301
  al slug), compartir, insignia que se copia desde la cuenta, «Ver ficha pública» de la
  cuenta y de ops, Guardados y listas. **Siguen con UUID**, porque el 301 los lleva al slug y
  el UUID nunca caduca: correos y avisos, enlaces internos de reseñas, preguntas, contactos y
  alertas, y los `next=` de acceso.
- Nunca derivar una identidad de `detailUrl`: los productos publicados llevan `solutionId`.

## «Qué falta por declarar» solo dentro de la app — 14 noviembre 2026

Decisión del propietario: la lista de lo que le falta a una ficha es tarea del fundador y
ya no aparece en la ficha pública (antes se mostraba a cualquiera, §53). Se ve en la vista
previa privada (`/account/solutions/<id>/preview`), en la guía del editor y en Inicio.
`SolutionPresentation` solo la calcula con `preview`.
