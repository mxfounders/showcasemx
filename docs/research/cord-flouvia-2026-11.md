# Cord y Flouvia: hallazgos del 18 de noviembre de 2026

Sustituye como fuente vigente a `cord-flouvia-sources.md` (30 de agosto), que se conserva
como histórico. Todo dato de abajo sale de una página pública de cada sitio, leída el 18 de
noviembre de 2026; lo que no se pudo confirmar queda marcado. Los repositorios locales
(`flouvia-cord`, `flouvia`) solo se usaron para ubicar páginas; manda lo publicado.

## Cord (cordhq.app)

### Fuentes

| Fuente | Qué confirma |
| --- | --- |
| [llms.txt](https://cordhq.app/llms.txt) (generado del código el 17 nov) | Qué existe hoy, qué no, mercados, métodos de pago por país, capacidades, límites fiscales, integraciones, herramientas de desarrollo |
| [pricing.md](https://cordhq.app/pricing.md) (revisado 13 nov) | Planes, precios por divisa, límites, qué incluye cada plan |
| [Seguridad](https://docs.cordhq.app/en/docs/developers/essentials/security) (11 oct) | Cifrado, dónde viven los datos, identidad, aislamiento, bitácora, retención, vulnerabilidades |
| [Auditorías](https://cordhq.app/en/support/security-audits) | Sin SOC 2, ISO 27001 ni pentest de tercero que compartir; cuestionarios por correo |
| [security.txt](https://cordhq.app/.well-known/security.txt) | `security@flouvia.com`, política de reporte |
| [Términos](https://cordhq.app/en/terms) | DPA forma parte de los términos; ley mexicana; cancelación sin reembolso de meses no usados |
| [Privacidad](https://cordhq.app/en/privacy) | LFPDPPP y GDPR, DPA, página de subprocesadores, cláusulas contractuales tipo |
| [Centro de ayuda](https://cordhq.app/en/support) | «Soporte técnico avanzado incluido en todos los planes… en menos de 2 horas hábiles» (afirmación del sitio, sin SLA) |
| [Ventas](https://cordhq.app/en/contact/sales) | Demo personalizada; «respondemos en 24 horas hábiles»; `cord@flouvia.com` |
| [Estado](https://status.cordhq.app/en) | Sondas sintéticas, historial de 90 días e incidentes |
| [Roadmap](https://cordhq.app/en/roadmap), [registro de cambios de la API](https://docs.cordhq.app/en/docs/developers/changelog), [docs](https://docs.cordhq.app/en/docs), [comunidad](https://community.cordhq.app/en), [blog de desarrolladores](https://dev.cordhq.app/dev-blog/en) | Recursos públicos |
| Pie del sitio (`/` y `/en`) | Redes: LinkedIn `company/cordapp`, X `usecordapp`, Instagram `cord.hq`, TikTok `@cord.hq` |
| [Directorio de Claude](https://claude.ai/directory/cord) | Conector de Claude (citado en llms.txt) |

### Lo que hace hoy

- Cotizaciones: editor con catálogo, precios negociados, niveles por volumen, costos y
  márgenes, anticipos, planes de pago por hitos (2 a 24 pagos, intereses opcionales),
  igualas recurrentes y crédito Net; borrador con IA desde texto, PDF o fotos; Cord
  Studio para diseñar el link.
- Link público: el cliente aprueba sin cuenta, comentarios por línea, aprobación parcial,
  identidad declarada del firmante, sello de tiempo, IP y huella de la versión;
  seguimiento en vivo; negociación y contraofertas.
- Cobros: Cord Payments (tarjeta y métodos locales en MX, US, CA, ES, GB, DE, FR) y
  Mercado Pago propio (MX, BR, CO, AR, CL, PE); SPEI con CLABE, ACH, SEPA, débitos
  (beta); portal del cliente; reembolsos; disputas.
- Facturación: CFDI 4.0 con complemento de pago (MX, desde Starter), Verifactu (ES,
  beta), factura electrónica de DE (XRechnung/Factur-X/Peppol), facturas estándar en US,
  CA, GB; BR, CO, AR, CL, PE y FR «en activación». Facturas recurrentes y recordatorios.
- Cobranza: espacio de cobranza y agente de IA (con aprobación o automático).
- Finanzas: flujo a 90 días, DSO, riesgo de concentración, multi-divisa con FX Lock
  (14 divisas de transacción), 15 reportes y explorador de reportes.
- Equipo: roles y permisos por sección, aprobaciones de descuento y margen (Scale), SSO
  SAML (Scale), varias empresas.
- Automatización: Cord Workflows sin código (47 eventos, 16 acciones).
- Integraciones (incluidas en todos los planes): HubSpot, Shopify, Mercado Pago, Slack,
  Zapier, Make, n8n, Microsoft Teams, WhatsApp Business, Gmail, Google Sheets, Excel,
  QuickBooks Online, Xero y Claude.
- Desarrolladores: API REST con OpenAPI 3.1, webhooks firmados (44 eventos), servidor
  MCP (30 herramientas), Cord Elements (componentes embebibles), CLI, SDKs de Node,
  Python y PHP, modo de prueba con simuladores, llaves restringidas con IPs permitidas,
  versionado por cabecera, registro de cambios con RSS.
- Herramienta gratuita: cotizador con IA sin cuenta, una página por mercado.

### Lo que el propio sitio dice que no tiene

SLA con porcentaje comprometido; SOC 2 o ISO 27001; integraciones con CONTPAQi y Aspel;
reportes por API o MCP.

### Precios (pricing.md, 13 nov)

| Plan | MXN/mes | USD/mes | EUR/mes | Lo principal |
| --- | --- | --- | --- | --- |
| Free | 0 | 0 | 0 | 5 envíos al mes, 5 activas, 1 usuario, sin vencimiento ni tarjeta |
| Starter | 240 | 12 | 12 | Envíos ilimitados, sin «Powered by Cord», 30 facturas fiscales al mes |
| Professional | 590 | 30 | 30 | 5 usuarios, cobranza con IA, recurrentes, flujo a 90 días, Cord Domains |
| Scale | 1,390 | 70 | 70 | 15 usuarios, aprobaciones, SSO/SAML, intereses moratorios |
| Developer | a la medida | | | Volumen e integración a la medida, contacto con ventas |

Anual = 10 mensualidades. MXN y EUR incluyen IVA; USD sin impuesto. México se cobra en
MXN; ES, DE y FR en EUR; los demás mercados en USD.

### Mercados

Alta en 12 países: MX, US, CA, BR, ES, GB, DE, FR, CO, AR, CL, PE. Sitio en español,
inglés, portugués, francés y alemán. Soporte (`contactPoint` del sitio): español e inglés.

### Seguridad y datos

Datos en Neon (AWS us-east-1) y Vercel (iad1), Estados Unidos. HTTPS con HSTS preload;
secretos con AES-256-GCM; contraseñas con Argon2id; tokens y llaves solo como hash.
Acceso con contraseña, Google, passkeys y SSO SAML; verificación en dos pasos
exigible al equipo; reautenticación en acciones sensibles; bitácora de auditoría;
exportar datos y borrar la cuenta desde Ajustes; reporte de vulnerabilidades con
política publicada; DPA y página de subprocesadores.

### Pendiente de confirmar con el propietario

- La promesa de soporte «en menos de 2 horas hábiles» del centro de ayuda.
- La evidencia publicada hoy en shwcs («de 14 días a segundos»): es una afirmación del
  fundador, no un dato del sitio.
- Año de fundación de Cord (Flouvia presenta el caso como «2026»), equipo y clientes.

## Flouvia (flouvia.com)

### Fuentes

| Fuente | Qué confirma |
| --- | --- |
| [Inicio](https://flouvia.com/) | Siete servicios, casos destacados, redes |
| [Nosotros](https://flouvia.com/nosotros/) | Fundada en 2024; equipo: André Valle Ortega (fundador) y Emilio Rubio Pérez Ulloa (socio); forma de trabajo; Gota |
| [Servicios](https://flouvia.com/servicios/) y sus siete páginas | Qué entrega cada servicio, proceso en cuatro fases, diagnóstico gratuito de 30 minutos, mantenimiento, preguntas frecuentes |
| [Trabajo](https://flouvia.com/work/) y sus cinco casos | Cord, El Zarco, shwcs, Masuma, Anter House |
| [Contacto](https://flouvia.com/contacto/) | Respuesta en menos de 24 horas; rangos de inversión desde $15–50 mil MXN |
| [Términos](https://flouvia.com/terminos/) | Flouvia, S.A.S. de C.V.; cobro por hito, mensual o a la entrega; USD o MXN; CFDI; propiedad de los entregables al liquidar |
| [Privacidad](https://flouvia.com/privacidad/) | Aviso de privacidad |
| Pie del sitio | Instagram `flouviahq`, X `flouviahq`, LinkedIn `company/flouvia`, Facebook `flouvia` |

### Lo que hace hoy

Estudio de diseño e ingeniería, todo a la medida, sin subcontratar:

1. Sitios web: sitios de marca, CMS editable, multilingüe, SEO técnico, rendimiento.
2. E-commerce: Shopify y Shopify Plus, temas a la medida, headless (Hydrogen),
   migraciones, checkout y pagos, conexión con ERP.
3. Portales B2B: catálogo privado, precios por cliente, crédito y condiciones, pedido por
   SKU, cotizaciones en línea, historial y recompra.
4. Apps móviles: iOS y Android (nativa, multiplataforma o PWA), cuentas, pagos,
   notificaciones, publicación en las tiendas.
5. Apps de Shopify: privadas y públicas, extensiones de checkout, Shopify Functions,
   apps en el admin.
6. Software a la medida: SaaS, herramientas internas, portales de clientes, cobros y
   suscripciones con Stripe, APIs, roles, passkeys y bitácora.
7. Automatizaciones: integración con ERP, datos sincronizados, APIs y webhooks, reportes
   automáticos, agentes de IA con aprobación humana.

Proceso: descubrimiento (diagnóstico gratuito de 30 minutos), arquitectura, construcción
por fases con avance en su portal Flouvia OS, lanzamiento con monitoreo y mantenimiento.
El código y el repositorio son del cliente desde el primer día (página Nosotros); los
términos dicen que los derechos de uso pasan al liquidar el pago total. Trabajo remoto,
«con quien tenga algo que construir, sin importar su industria, su tamaño ni dónde esté».

### Casos (todos de 2026, contados por Flouvia)

| Caso | Qué hicieron | Enlace |
| --- | --- | --- |
| Cord | Producto propio: producto, diseño e ingeniería | https://flouvia.com/work/cord/ |
| El Zarco | Distribuidor de mayoreo desde 1992: sitio, catálogo, portal B2B y panel, con Cord | https://flouvia.com/work/el-zarco/ |
| shwcs | Este catálogo: producto, diseño e ingeniería | https://flouvia.com/work/shwcs/ |
| Masuma | Sitio con cotización y SEO para una empresa de mantenimiento en CDMX | https://flouvia.com/work/masuma/ |
| Anter House | Sitio y panel de contenido para un taller de moda en Monterrey | https://flouvia.com/work/anter-house/ |

### Pendiente de confirmar con el propietario

- Presupuesto mínimo vigente: en agosto era «$30,000 MXN»; hoy el sitio ya no lo dice y el
  formulario parte del rango «$15–50 mil MXN».
- Plazos: en agosto «8–14 semanas para portales B2B»; hoy el sitio dice «depende» y da un
  calendario por fases tras el diagnóstico.
- Si «shwcs» y «Cord» deben contarse como casos de clientes en la ficha (son productos
  propios).

## Comparación con la ficha publicada de Cord en shwcs

Leída de `https://shwcs.site/soluciones/cord.md` (publicada el 13 de septiembre). El
borrador de producción no se pudo leer desde esta sesión.

| Campo | Publicado hoy | Lo que dice el sitio hoy |
| --- | --- | --- |
| Capacidades | Sin declarar (obligatorio para enviar) | Cotizaciones, cobranza, CFDI, portal de pagos, suscripciones/igualas, cartera, flujo de efectivo, reportes, impuestos, CRM, catálogo y precios, pronóstico, contratos, mayoreo, automatización, chatbots/IA, APIs |
| Precio | «suscripción estandarizado en USD» | MXN en México, EUR en ES/DE/FR, USD en el resto; plan gratis sin vencimiento |
| Integraciones | «ecosistema autónomo… webhooks… SDKs React/Next.js» | 15 integraciones nativas, API, webhooks, MCP, SDKs de Node, Python y PHP, CLI |
| Soporte | «founder-led… no delegamos a foros comunitarios» | Centro de ayuda, docs, comunidad pública, correo; español e inglés |
| Dónde opera | Sin declarar | 12 países, 14 divisas |
| Cumplimiento | Sin declarar | CFDI 4.0, factura fiscal MX, LFPDPPP, GDPR; sin SOC 2 ni ISO 27001 |
| Capturas | Ninguna | Pendientes de tomar de pantallas reales |
| Enlaces | Sitio, X, LinkedIn, Product Hunt, Instagram, TikTok | Igual, más docs, estado, roadmap y comunidad |
