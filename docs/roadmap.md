# Roadmap — estado consolidado, 10 de octubre de 2026

Sustituye la versión del 5 de septiembre. Añade todo lo construido en octubre
(entregas 22–30): limpieza y CI, el sitio completo en inglés, anuncios con Stripe,
facturación con CFDI, ops a nivel producción, QA de la cuenta, reseñas verificadas,
registros públicos y la estrategia frente a Product Hunt. El detalle de cada entrega vive
en `CLAUDE.md` (§20 en adelante); esta tabla es el resumen, no la fuente de verdad.

Producto: descubrir → evaluar → guardar/comparar → contactar → seguir la respuesta.
Una misma cuenta compra y publica. El modo del inicio no concede permisos.
**Abierto a cualquier mercado** (10 oct 2026): México es el primer mercado, no el
límite; lo local entra como adaptador por país. Estrategia en [strategy.md](strategy.md).

| # | Entrega | Estado | Pendiente |
| --- | --- | --- | --- |
| 1 | Fichas para decidir | Capturas, demo, creadores/redes, alcance y límites | Casos comprobados a escala |
| 2 | Comparador | 2–3 proyectos, datos aprobados y notas privadas | Iteración según uso |
| 3 | Contacto contextual | Consentimiento, identidad/destinatario de servidor, correo verificado opcional | Activar verificación obligatoria |
| 4 | Bandeja fundador | Respuesta, estados, historial y avisos internos | Entrega de avisos por email en producción |
| 5 | Seguimiento comprador | Historial, retiro y avisos de cambios | Recordatorios y aprendizaje de uso |
| 6 | Inicio adaptativo | Fundador/comprador/ambos, proyectos, listas visuales y acciones concretas | Iteración con actividad real |
| 7 | Ficha guiada | Formulario por preguntas cortas (14 originales, 17 desde §59), información pendiente y fecha de aprobación | Operación editorial, no más campos por defecto |
| 8 | Confianza | TXT de dominio, señal acotada, información declarada | Identidad legal y evidencia/casos verificados |
| 9 | Avisos configurables | Centro privado, preferencias, outbox y verificación de email | Prueba humana de entrega desde producción |
| 10 | Métricas | Vistas/clics agregados y solicitudes reales por proyecto propio | No visitantes únicos ni ventas |
| 11 | Editorial | Criterios públicos, reportes, decisión y retirada autorizada | Ver #15: toda revisión se movió a ops |
| 12 | Lanzamiento y marca | `shwcs.site`, wordmark oficial, Resend verificado, `/blog` `/changelog` `/contacto` reales, nombre `shwcs` en todo | Prueba humana de recepción de correo en producción |
| 13 | Comunidad | Listas públicas opt-in, categorías, ranking reciente/popular, likes, guardado y comentarios con alias | Ver #20: moderación y búsqueda mejorada |
| 14 | Backoffice de operación (`ops.shwcs.site`) | App separada, TOTP obligatorio, autorrevisión permitida, auditoría, frontera de privacidad con notas/mensajes del comprador | Credenciales Vercel de `shwcs-ops`, revisión legal del dominio |
| 15 | Capa social y ranking real | Like/comentario en fichas (además de listas), orden del catálogo por interacción real y decayente, solo cuentas verificadas cuentan | Verificación de identidad/casos, defensa ante multicuentas |
| 16 | Onboarding y configuración avanzada | Bienvenida de tres pasos, verificación en dos pasos opcional, sesiones con dispositivo, exportación/eliminación de cuenta | Falta `AUTH_TOTP_KEY` en Vercel: 2FA no disponible aún en producción |
| 17 | Ficha enriquecida (fase 2–3 del catálogo) | Carrusel de imágenes, portada automática desde el sitio del proyecto, logos reales de redes, industrias/tamaños declarados | Video hospedado, verificación automática de resultados |
| 18 | Catálogo rápido y difícil de manipular (fase 1 y 4) | Navegación sin bloqueos, caché con revalidación por evento, decaimiento temporal, deduplicación de vistas | Revalidar catálogo entre ops y producto sin esperar el TTL de respaldo |
| 19 | Moderación de comunidad y búsqueda | Reportes de listas/comentarios en ops, búsqueda con `pg_trgm`; migraciones ya en producción | Bloqueo, apelaciones y defensa ante multicuentas |
| 20 | Búsqueda semántica y capacidades declaradas | Vocabulario por categoría/industria/capacidad, filtros del catálogo derivados del resultado real, formulario de 17 preguntas | Extender capacidad/integración a filtros de Guardados y comunidad |
| 21 | Almacenamiento de imágenes | Capturas y portadas en Vercel Blob; renditions 400/800/1600 con loader propio; migraciones en producción | Backfill de renditions cuando haya capturas en producción |
| 22 | Limpieza «nivel artesanía» (§62) | Scripts muertos, dependencias y CSS sin uso fuera; Prettier, ESLint sin advertencias, `npm run check`, CI en GitHub Actions, migrador único `npm run db:migrate` | — |
| 23 | Todo el sitio en inglés (§63, §69) | Diccionarios por sección con paridad verificada al compilar; cuenta, legal, blog y errores de la API en ambos idiomas; enlaces y redirecciones con idioma (sin saltos 307) | Correos en inglés (falta guardar el idioma de la cuenta); revisión por hablante nativo |
| 24 | Espacios patrocinados (§64, docs/ads.md) | Stripe Checkout por días, USD/MXN con impuestos, separado del orden orgánico, sin píxeles; reembolsos y disputas automáticos; tablas en producción con espacios cerrados | Stripe Tax, webhook y llaves en Vercel; tarifas reales; acciones en ops |
| 25 | Facturación (§67, docs/billing.md) | Datos fiscales en Ajustes, CFDI y notas de crédito con Cord, cola con reintentos | Llave de Cord y emisor con CSD; descarga de PDF/XML |
| 26 | Ops a nivel producción (§68, docs/ops.md) | Bitácora encadenada, modo seguro, sesiones atadas, CSP con nonce, páginas de contactos, seguridad, sistema y anuncios, ⌘K | Acciones de anuncios, passkeys |
| 27 | QA de la cuenta (§69) | Recorrido automatizado de 122 comprobaciones: registro, 2FA, sesiones, exportación, borrado; sidebar con página activa | — |
| 28 | Reseñas verificadas (§70, docs/reviews.md) | Una por cuenta, niveles correo / correo de empresa / compra comprobada, respuesta pública del fundador, reportes y moderación en ops, peso en el orden, avisos al fundador, filtros, vista del dueño | Comprobantes fuera de México |
| 29 | Registros públicos (§71, docs/compliance.md) | Identidad fiscal privada del proveedor; espejo diario de la lista 69-B del SAT; «Compra comprobada» con CFDI consultado ante el SAT | Probar con un CFDI real; VIES/Companies House; REPSE y PAC |
| 30 | Estrategia frente a Product Hunt (docs/strategy.md) | Auditoría con investigación de PH, G2, Capterra y el mercado; tesis y fases | Fases 2–6 (datos por mercado, valor continuo para fundadores, comparativas, compra en equipo) |

## Estado real de producción — corregido el 3 de septiembre (§45)

Con acceso confirmado a los proyectos Vercel correctos (`mxfounders/shwcs` y
`mxfounders/shwcs-ops`), se corrigió una idea equivocada que arrastraban
entregas anteriores de este documento: **Cord no está publicado en
producción** — una sola cuenta, una sola solución en estado `pending`, sin
`catalog_key` asignado — y **Flouvia no existe como fila** en
`shwcs_production`. Las menciones históricas a "Cord y Flouvia publicados,
versiones 8 y 2" describían la base de desarrollo (`neondb`), nunca el estado
en vivo. Publicar o asignar `catalog_key` en producción sigue pendiente de una
acción explícita del propietario. Desde la entrega #20, además, `capabilities`
es obligatorio para publicar, así que Cord necesitará declarar sus capacidades
antes de poder aprobarse.

## Producción al 10 de octubre de 2026

`shwcs_production` tiene todas las migraciones del orden de docs/database.md, incluidas
las de octubre: `ad-campaigns`, `billing`, `solution-reviews` y `compliance` (aplicadas
el 10 de octubre con el rol propietario; el rol de la app recibe permisos por defecto).
Los espacios patrocinados están cerrados hasta fijar tarifas. La lista 69-B se llena con
el primer cron diario después del despliegue.

## Siguiente entrega útil

1. **Oferta**: publicar Cord en producción e invitar a 30–50 proyectos con ficha
   completa (fase 0 de strategy.md).
2. Credenciales: `AUTH_TOTP_KEY`, Google OAuth, Stripe (Tax, webhook, llaves), Cord;
   prueba humana de correo desde producción.
3. Probar «Compra comprobada» con un CFDI real.
4. Fase 2 de strategy.md: datos de decisión por mercado (países, monedas, idioma y
   horario de soporte, métodos de pago).
5. Responsable editorial y revisión legal humana de Términos, Privacidad y Cookies.

No conectado: campañas de newsletter, IA/vector, monitoreo externo. Guardados,
listas y notas siguen privados; ops nunca lee `contact_requests.details`,
`contact_events.message`, `buyer_list_items.note` ni `buyer_lists.purpose`.
Código probado y migración aplicada a desarrollo no equivalen a un despliegue
comprobado en `shwcs_production`.

Detalles: [entrega de lanzamiento](launch.md), [ficha guiada](guided-solution-form.md),
[contactos](contacts.md), [biblioteca](buyer-library.md),
[listas de comunidad](community-lists.md), [capa social](solution-social.md),
[operaciones](operations.md), [fichas y filtros](listings.md),
[reseñas](reviews.md), [registros públicos](compliance.md), [anuncios](ads.md),
[facturación](billing.md), [ops](ops.md), [estrategia](strategy.md),
[contexto maestro](../CLAUDE.md).
