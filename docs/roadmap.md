# Roadmap — estado consolidado, 5 de septiembre de 2026

Sustituye la versión del 31 de agosto: aquella quedó desactualizada frente al
trabajo real de septiembre (backoffice de operación, capa social, onboarding,
seguridad avanzada, fases del catálogo, búsqueda semántica y capacidades
declaradas). El detalle completo de cada entrega vive en `CLAUDE.md` (§20 en
adelante); esta tabla es el resumen, no la fuente de verdad.

Producto: descubrir → evaluar → guardar/comparar → contactar → seguir la respuesta.
Una misma cuenta compra y publica. El modo del inicio no concede permisos.

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
| 19 | Moderación de comunidad y búsqueda | Reportes de listas/comentarios en ops, búsqueda con `pg_trgm` | Migraciones aplicadas solo en desarrollo, no en `shwcs_production` |
| 20 | Búsqueda semántica y capacidades declaradas | Vocabulario por categoría/industria/capacidad, filtros del catálogo derivados del resultado real, formulario de 17 preguntas | Extender capacidad/integración a filtros de Guardados y comunidad |
| 21 | Almacenamiento de imágenes | Capturas y portadas en Vercel Blob, no como base64 en Postgres | Renditions responsivas (Fase B) sin aplicar a `shwcs_production` |

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

## Siguiente entrega útil

1. Activar `AUTH_TOTP_KEY` en Vercel (2FA), confirmar Google OAuth y
   remitente/scheduler de avisos en producción.
2. Aplicar `db/community-reports.sql`, `db/community-search-trgm.sql` y
   `db/community-facets.sql` a `shwcs_production` (entregas #19–20).
3. Declarar `catalog_key`/publicar Cord (y crear Flouvia) en producción,
   ahora con sus capacidades, integraciones y precio declarados.
4. Responsable editorial, criterios operativos y revisión legal completa del
   dominio `ops.shwcs.site`.
5. Escuchar a fundadores/compradores reales antes de construir CRM/chat.

No conectado: campañas de newsletter, IA/vector, monitoreo externo. Guardados,
listas y notas siguen privados; ops nunca lee `contact_requests.details`,
`contact_events.message`, `buyer_list_items.note` ni `buyer_lists.purpose`.
Código probado y migración aplicada a desarrollo no equivalen a un despliegue
comprobado en `shwcs_production`.

Detalles: [entrega de lanzamiento](launch.md), [ficha guiada](guided-solution-form.md),
[contactos](contacts.md), [biblioteca](buyer-library.md),
[listas de comunidad](community-lists.md), [capa social](solution-social.md),
[operaciones](operations.md), [fichas y filtros](listings.md),
[contexto maestro](../CLAUDE.md).
