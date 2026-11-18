# Objetivos de invitación: 100 proyectos B2B (SHCWS-87)

Consulta del **17 de noviembre de 2026**. Hoja completa: [`outreach-targets.csv`](outreach-targets.csv) (UTF-8, 100 filas, 12 columnas). Solo información pública; nadie fue contactado, no se enviaron mensajes ni se llenaron formularios ni se crearon cuentas.

## Método

1. **Búsqueda por categoría.** Cinco investigadores (agentes) recorrieron las 14 categorías de `src/lib/taxonomy.ts` con la misma consigna: software, agencias y servicios B2B de México y LatAm para pymes, con sitio vivo y clientes reales; sin bancos ni multinacionales ni Cord/Flouvia.
2. **Verificación en el sitio oficial.** Cada fila se leyó en su sitio oficial el 2026-11-17 (WebFetch/búsqueda). Lo que el sitio no confirma queda marcado «sin verificar» o «inferido» en el propio campo.
3. **Comprobación propia.** Al consolidar, pedí la portada de los 100 sitios con `curl`: 98 responden 200 y ninguno redirige a otro dominio. Dos (Control de Gastos/Focaltec con 403 y Black360 Digital con 406) bloquean clientes automáticos; los cargó el investigador con otro cliente.
4. **Consolidación.** 123 filas entregadas, 12 duplicadas entre investigadores (se conservó una, con la prioridad más alta y la categoría más natural) y 11 descartadas por débiles: sitio no verificado (Bugster, Cyberpeace), tamaño o propiedad que ya no necesita visibilidad (Nubox, Talana, Rex+, Runa, Loggro, Doppler, Lexter), compra sin confirmar (Chattigo) o señales vacías (Silent4Business).
5. **Privacidad de los datos.** Solo canales públicos del proyecto: correos genéricos (hola@, contacto@, ventas@…), formularios y LinkedIn/X de la empresa. Se quitaron teléfonos, WhatsApp y dos correos con nombre de persona (Fencode, Landaverde Labs). El fundador aparece solo si el propio sitio lo muestra (8 filas); si no, queda vacío.
6. **Prioridad.** 1 = sitio activo con clientes reales visibles, tamaño pyme, canal público de contacto y categoría con poca oferta (20 filas). 2 = buen encaje con alguna señal débil, más grande o sin canal directo (58). 3 = posible, con señales débiles (22).

## Reparto

| Categoría | Filas | P1 | P2 | P3 |
| --- | ---: | ---: | ---: | ---: |
| Cobros | 8 | 1 | 6 | 1 |
| Finanzas | 7 | 2 | 4 | 1 |
| Nómina | 4 | 1 | 3 | 0 |
| Legal | 7 | 3 | 3 | 1 |
| Operación | 5 | 1 | 4 | 0 |
| Ventas | 8 | 2 | 3 | 3 |
| Atención al cliente | 6 | 2 | 3 | 1 |
| Comercio electrónico | 9 | 1 | 6 | 2 |
| Agencias | 19 | 4 | 10 | 5 |
| Desarrollo | 5 | 0 | 3 | 2 |
| Marketing | 10 | 1 | 7 | 2 |
| Datos e IA | 4 | 1 | 3 | 0 |
| TI y seguridad | 4 | 1 | 2 | 1 |
| Productividad | 4 | 0 | 1 | 3 |
| **Total** | **100** | **20** | **58** | **22** |

| País | Filas |
| --- | ---: |
| México | 49 |
| Colombia | 15 |
| Chile | 13 |
| Argentina | 8 |
| Sin verificar | 7 |
| Uruguay | 3 |
| Brasil | 2 |
| Ecuador | 1 |
| México/Colombia | 1 |
| Perú | 1 |

## Qué sale de esto y qué no

- **México es 49 %, no el 70 % buscado.** Las alternativas mexicanas pequeñas de Cobros, Nómina, Ventas y Productividad casi no aparecieron con sitio verificable; lo que salió era grande o no cargaba. Para invitar a más mexicanos hace falta otra pasada (directorios locales, ecosistema de Startups MX, Clutch México).
- **Categorías delgadas:** Nómina (4), Datos e IA (4), TI y seguridad (4) y Productividad (4, la más débil: AgendaPro es de reservas y las otras dos tienen clientes grandes). Agencias (19) y Marketing (10) están sobrerrepresentadas porque es donde más pequeños con portafolio público aparecieron.
- **Sin ejemplos de cotizaciones/CPQ ni de ERP/manufactura mexicanos:** Bind ERP y ClickBalance devolvieron verificación de bots o 403; no se incluyeron por no poder verificarlos.
- **Sede sin verificar** en 7 filas (el país es de prensa o del dominio); el campo `notas_verificacion` lo explica fila por fila.
- **Cuatro proyectos sin canal público verificado** (Fintoc, Kapso, Wawandco, Prometheo): no se inventó ninguno.
- Las reseñas, cifras y logos son lo que el propio sitio o un tercero publica; no se auditaron de forma independiente.
- Magokoro publica rankings propios donde se coloca primero y Dtona mostró copyright 2025; ver sus filas antes de invitar.

## Las 20 de prioridad 1

| # | Proyecto | Categoría | País | Por qué |
| ---: | --- | --- | --- | --- |
| 1 | [Monato](https://monato.com) | Cobros | México | Cobranza por domiciliación con caso publicado (aceptación del 16 % al 30.4 %); encaja directo con la necesidad «cobrar a tiempo» del hero de shwcs. |
| 2 | [Contalink](https://www.contalink.com) | Finanzas | México | Contabilidad para despachos con más de 25,000 contadores declarados y ronda reportada; el contador es quien recomienda software a la pyme (docs/strategy.md). |
| 3 | [Facturapi](https://facturapi.io) | Finanzas | México | API de facturación CFDI con precio publicado desde 299 MXN/mes, correo público y © 2026; producto concreto para desarrolladores y software contable. |
| 4 | [Worky](https://www.worky.mx) | Nómina | México | Nómina y RR.HH. con casos de Benetton y MSC, precios por plan y contenido de 2026; Nómina es la categoría con menos oferta en la lista. |
| 5 | [EasyLex](https://www.easylex.com/) | Legal | México | Contratos y trámites legales con logos de clientes y términos actualizados en sept 2026; cubre Legal para pymes y micro despachos. |
| 6 | [Firmame (Firmamex)](https://firmame.com/) | Legal | México | Firma electrónica con precio por documento publicado (desde 21 MXN) y prueba de 30 días; el precio abierto facilita una ficha completa. |
| 7 | [Legalario](https://www.legalario.com/) | Legal | México | Automatización de contratos con logos y cuatro testimonios con nombre; formulario público; un anuncio de legaltech con clientes reales. |
| 8 | [Pulpos](https://www.pulpos.com/) | Operación | México | Inventario y operación para comercio con reseñas en App Store, Google Play y Trustpilot y correo público; Operación es de las categorías más pedidas. |
| 9 | [Leadsales](https://leadsales.io) | Ventas | México | CRM sobre WhatsApp con más de 2,800 empresas declaradas y testimonios nombrados; Ventas pyme con tracción visible. |
| 10 | [Shutpoint](https://www.shutpoint.com) | Ventas | México | CRM mexicano pequeño (Monterrey) con siete logos, tres testimonios, precios y dos correos públicos; cubre el hueco de CRM local. |
| 11 | [Aurora Inbox](https://www.aurorainbox.com) | Atención al cliente | México | Bandeja de WhatsApp con IA, precios en MXN con CFDI y 2.1 M de conversaciones declaradas; Atención al cliente pyme mexicana. |
| 12 | [Wasapi](https://www.wasapi.io) | Atención al cliente | Colombia | Plataforma de WhatsApp con más de 1,000 marcas declaradas y seis testimonios con nombre; su fundador se muestra en su propio sitio. |
| 13 | [Ziyegó](https://ziyego.mx/) | Comercio electrónico | México | Envíos para tiendas chicas con carriers conectados y tres correos públicos (ventas, soporte, aclaraciones); Comercio electrónico en Morelos. |
| 14 | [AMAD Software Solutions](https://amadsoftwaresolutions.com) | Agencias | México | Estudio de Irapuato con cerca de 50 logos y 203 proyectos declarados; formulario con respuesta en 24 h; ancla de oferta de desarrollo fuera de CDMX. |
| 15 | [Exdoo TI](https://exdoo.mx) | Agencias | México | Consultora de Pachuca con unos doce logos de clientes pyme, tres testimonios con nombre y diagnóstico gratuito; toca Odoo/ERP, una necesidad frecuente de pymes. |
| 16 | [Núcleo Studio](https://nucleostudio.com) | Agencias | México | Estudio de Guadalajara con casos con testimonio (ERP logístico y cotizador), 5.0 en Google y correo público; buen perfil de «agencia con clientes reales». |
| 17 | [Sintaxio](https://www.sintaxio.com) | Agencias | México | Estudio de Guadalajara con casos publicados con cifras (cobranza por WhatsApp +38 %) y correo, formulario y agenda públicos; publica a quien contrata desarrollo a la medida. |
| 18 | [Cliento](https://www.cliento.mx/) | Marketing | México | Agencia de marketing de CDMX con logos y casos con cifras (+40 % ventas, ROI 54x) y correo público; marketing B2B para pymes. |
| 19 | [Nubimetrics](https://www.nubimetrics.com/) | Datos e IA | Argentina | Analítica de mercado para vendedores de marketplace con cuatro testimonios nombrados y correo público; el mejor candidato de Datos e IA. |
| 20 | [Delta Protect](https://www.deltaprotect.com/) | TI y seguridad | México | Ciberseguridad con ocho testimonios con nombre (Bitso, Fondeadora, Atrato) y más de 350 empresas declaradas; formulario público. |

Dieciocho de las 20 son de México (en Leadsales y Delta Protect la sede no se confirma en el sitio); las otras dos son Wasapi (Colombia) y Nubimetrics (Argentina). Revisar cada fila del CSV antes de enviar cualquier invitación: este documento no contacta a nadie.
