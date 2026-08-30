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
en `src/lib/catalog-preview.ts`; no se han migrado a Neon.

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
como alternativa para entradas sin icono. Esto no cambia el favicon de ShowcaseMX.
