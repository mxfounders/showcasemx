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

Se mantienen nueve tarjetas en cada una de siete categorías: 63 entradas visuales,
seis apariciones de dos ofertas reales y 57 ejemplos ficticios. Los datos están
en `src/lib/catalog-preview.ts`; ahora se vinculan a publicaciones de Neon mediante catalog_key.

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
- Tiempos de espera de 6 s (HTML) y 8 s (imagen); topes de 512 KB de HTML y 5 MB
  de imagen, cortando el flujo al superarlos.
- Solo se leen `og:image`, sus variantes y `twitter:image`, y únicamente dentro
  del `<head>`.

**Límite conocido y no disimulado**: la comprobación de DNS ocurre antes de la
petición, y un nombre podría resolver a otra dirección entre la comprobación y la
conexión (TOCTOU). Cerrarlo del todo exige conectar contra la IP ya validada con
la cabecera Host correcta; no está hecho. El riesgo queda acotado por el resto de
guardas y porque la respuesta nunca se devuelve al cliente: solo se guarda una
imagen reencodificada.

## Carrusel de la ficha y portadas — 3 septiembre 2026

`src/lib/solutions/gallery.ts` es la fuente única de dos reglas de orden que
antes vivían duplicadas, con criterios distintos, en `public.ts`,
`library/server.ts` y `account/page.tsx`:

- `solutionSlides()` — el carrusel de la ficha pública. **og:image primero**,
  luego las capturas del fundador en su orden declarado. Es la imagen ancha,
  tipo hero.
- `solutionCover()` — la portada de una tarjeta pequeña (catálogo, biblioteca,
  Inicio del fundador). Orden **opuesto a propósito**: captura del fundador
  primero, og:image después, arte local de Cord/Flouvia al final. Una
  og:image de marketing rara vez sobrevive el recorte a una miniatura
  cuadrada; una captura del producto sí.

El fundador puede ocultar la og:image de su ficha con `hideSiteImage` en
`SolutionData` (interruptor en `site-image-card.tsx`). Como cualquier otro
campo, el cambio pasa por revisión antes de llegar a la ficha pública — no es
instantáneo, y la interfaz lo dice.

Un solo ratio para toda imagen del carrusel: `aspect-[16/10]` +
`object-contain` sobre fondo blanco. `object-cover` en una captura de interfaz
recorta justo lo que debía enseñarse; 16/10 es el punto medio entre el 4:3 de
las capturas y el 1.905 de una og:image 1200×630.
