# Base de datos — estado vigente

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

El MVP utiliza SQL parametrizado con Neon HTTP y migraciones aditivas en db/*.sql.
No hay ORM. Cada archivo se aplica con `npm run db:migrate -- db/<archivo>.sql`
(una transacción por archivo; el splitter respeta bloques $$ y comentarios).

## Tablas operativas

| Tabla | Uso y acceso |
| --- | --- |
| auth_accounts | Identidad, contraseña hash, nombre, organización, perfil/rol descriptivos, avatar privado y dashboard_mode |
| auth_sessions | Tokens hash, cuenta y caducidad; revocación al cambiar contraseña |
| auth_rate_limits | Contadores persistentes por identidad y global |
| auth_password_resets | Token hash, hash de contraseña de emisión y caducidad |
| founder_solutions | Dueño, borrador data, snapshot aprobado published_data, estado, paso y versión |
| solution_reviewers | Autorización editorial explícita, no inferida del perfil |
| solution_events | Historial de decisiones/comentarios de publicación |
| buyer_saved_projects | Referencias privadas a proyectos reales, únicas por dueño/proyecto |
| buyer_lists | Listas privadas con propósito, versión y fechas |
| buyer_list_items | Membresías y notas por lista/proyecto con FK compuestas por dueño |
| contact_requests | Comprador, destinatario, proyecto, datos compartidos, consentimiento, estado y versión |
| contact_events | Historial atómico de solicitudes y respuestas, privado a sus participantes |
| newsletter_subscribers | Correo, segmentos, consentimiento, alta y baja |
| contact_inquiries | Mensajes del formulario público, consentimiento y estado de entrega |

Una cuenta puede comprar y publicar. Nunca unir identidades o asignar proyectos
por email no verificado, nombre de perfil o dominio parecido.

## Orden para base nueva

Aplicar en este orden con `npm run db:migrate -- <archivo> [<archivo> …]`
(una transacción por archivo). Verificado sobre una base vacía. Todos son re-aplicables
salvo media-storage.sql y media-storage-drop.sql, fases de una sola vez de la
migración a object storage:

1. db/auth.sql
2. db/account-profile.sql
3. db/account-settings.sql
4. db/founder-solutions.sql
5. db/buyer-library.sql
6. db/contact-requests.sql
7. db/catalog-ownership.sql
8. db/solution-media-dashboard.sql
9. db/solution-profile.sql
10. db/newsletter-subscribers.sql
11. db/newsletter-segments.sql
12. db/launch-foundation.sql — avisos, verificación, Google, dominio, reportes, métricas
13. db/public-collections.sql
14. db/community-social.sql
15. db/contact-inquiries.sql
16. db/ops-console.sql — backoffice: sesiones, TOTP y bitácora de ops
17. db/account-security.sql — segundo factor y sesiones con dispositivo
18. db/solution-social.sql
19. db/solution-site-image.sql
20. db/catalog-performance.sql
21. db/community-search.sql
22. db/ranking-integrity.sql
23. db/community-reports.sql
24. db/community-search-trgm.sql — requiere la extensión pg_trgm
25. db/community-facets.sql
26. db/media-storage.sql — object storage, fase 1
27. db/media-storage-drop.sql — IRREVERSIBLE en bases con datos; en una base nueva es inocuo
28. db/media-renditions.sql
29. db/ad-campaigns.sql — espacios patrocinados y pagos con Stripe (docs/ads.md)
30. db/ops-hardening.sql — modo seguro, plazo de alta 2FA y bitácora de ops encadenada y de solo inserción (después de ops-console.sql; ver docs/ops.md)
31. db/billing.sql — datos fiscales y CFDI de los pagos (docs/billing.md)
32. db/solution-reviews.sql — reseñas verificadas y sus reportes (docs/reviews.md); el catálogo la consulta, así que va antes del despliegue
33. db/compliance.sql — identidad fiscal privada, espejo de la lista 69-B del SAT y comprobantes de compra de reseñas (docs/compliance.md)
34. db/solution-recognition.sql — «Verificado por shwcs» (solution_verifications) y reconocimientos (solution_awards, solution_award_runs) (docs/recognition.md); solo depende de founder_solutions y auth_accounts; aplicada en neondb y shwcs_production (14 nov 2026)
35. db/contact-alerts-default.sql — avisos de contacto por correo encendidos salvo que la persona los apague (SHCWS-13); reemplaza notify_contact_event() de launch-foundation.sql
36. db/security-notices.sql — categorías `security` (avisos de seguridad, siempre activos) y `account` (bienvenida) en account_notifications (SHCWS-154/156/153)
37. db/listing-notices.sql — avisos de fichas por correo encendidos por defecto; avisos de comentarios, reportes y espacios patrocinados (SHCWS-18/20); redefine notify_solution_event() y notify_solution_review()
38. db/community-notices.sql — avisos de comunidad: me gusta, guardados y comentarios en listas públicas agrupados por lista y día; «tu proyecto aparece en una lista pública» al fundador; preferencia `community_email` (apagada por defecto) y categoría `community` (SHCWS-117). Después de listing-notices.sql
39. db/contact-messages.sql — hilo de conversación: contact_events.kind y avisos de mensaje (SHCWS-168)
40. db/solution-comment-reports.sql — reportes de comentarios de fichas desde el sitio y `solution_comments.hidden_at`/`hidden_reason` (SHCWS-140)
41. db/contact-read-state.sql — `contact_requests.recipient_read_at`: oportunidades sin leer (SHCWS-14); rellena desde el último evento del destinatario
42. db/contact-outcomes.sql — resultado de cada oportunidad cerrada: `outcome`, `outcome_value`, `outcome_at` (SHCWS-22). `getContact`/`listContacts` leen estas columnas: aplicar 41 y 42 antes de desplegar
43. db/weekly-digest.sql — «Tu semana en shwcs»: preferencia `weekly_email` (encendida por defecto), envíos por cuenta y semana y conteos agregados de envíos y clics (SHCWS-21)
44. db/search-demand.sql — búsquedas del catálogo agregadas por día, sin cuenta ni dirección: veces, sin resultados y con clic (SHCWS-107); se borran a los 400 días
45. db/solution-questions.sql — preguntas y respuestas públicas en las fichas, sus reportes y el aviso al fundador (SHCWS-57); después de listing-notices.sql
46. db/review-invitations.sql — reseñas invitadas por el proyecto y nivel «Contactó vía shwcs» con su invitación a los 30 días (SHCWS-132/135); después de solution-reviews, listing-notices, contact-outcomes y contact-messages. El catálogo y las reseñas llaman sus funciones: aplicar antes de desplegar
47. db/ad-self-serve.sql — compra de espacios en una pantalla: códigos promocionales y descuento, lista de espera, alcance por ubicación y atribución de visitas y solicitudes desde un espacio patrocinado (SHCWS-70/72/75/77/150); después de contact-requests.sql y listing-notices.sql
48. db/search-alerts.sql — alertas de búsqueda guardada: categoría de aviso `alert`, preferencia `alert_email`, `search_alerts` y `search_alert_matches` (SHCWS-47); después de community-notices.sql. `deliverNotifications` lee `alert_email`: aplicar antes de desplegar
49. db/community-follows.sql — seguir listas y curadores: `community_list_follows`, `community_curator_follows`, `community_list_announcements` y sus triggers (SHCWS-121); después de community-notices.sql
50. db/solution-site-icons.sql — el logo que declara el sitio de cada ficha, copiado a Blob como WebP de 128 px, con sus triggers de recolección (SHCWS-177); después de media-storage.sql. El catálogo y las fichas del dueño lo consultan: aplicar antes de desplegar

db/solution-applications.sql es el intake anónimo retirado: no aplicarlo.
Newsletter es independiente; segments depende de subscribers.
La conexión usa NEON_DATABASE_URL, luego DATABASE_URL y luego POSTGRES_URL.
No imprimir cadenas de conexión ni copiar .env.local a documentación.

No hay tabla de versiones: qué migraciones tiene cada base (desarrollo `neondb`,
producción `shwcs_production`) se registra en CLAUDE.md al aplicarlas.

## Datos públicos y privados

- Solo published_data alimenta catálogo, ficha y comparador; nunca el borrador.
- Categorías múltiples están en JSON; category conserva compatibilidad.
- Guardados apuntan a catalog:cord, catalog:flouvia o solution:UUID, sin copiar ficha.
- Consultas de biblioteca y solicitudes acotadas a la sesión; SQL sin caché para
  información actual. No compartir notas con el dueño del proyecto.
- Reseñas: públicas solo con estado `published` y correo del autor verificado; el nivel
  (correo / correo de empresa) se calcula al leer desde la cuenta y nunca se guarda ni se
  publica el correo o su dominio. El dueño de la ficha responde pero no borra; ops oculta
  con motivo. Los reportes sobreviven al borrado de la reseña (`review_id` SET NULL).
- Contactos guardan snapshot del nombre público, correo de cuenta y contexto
  autorizado; destinatario fijo y UNIQUE comprador/proyecto.
- Transiciones e historial de contacto se escriben atómicamente; versión evita
  sobrescrituras concurrentes.
- Revisor editorial no recibe acceso a listas o contactos ajenos.

## Borrado y cuotas

Borrar lista conserva guardados; quitar un guardado elimina asociaciones/notas
tras confirmación. Borrar una cuenta en BD elimina relaciones por cascada.
Borrar solución elimina solicitudes y eventos asociados. Retirar solo publicación
conserva solicitudes existentes y muestra ficha no disponible en biblioteca.
Falta política de retención/exportación y UI de borrado de cuenta.

Biblioteca: 200 guardados, 30 listas. Contactos: 1000 por comprador, una solicitud
por proyecto incluso cerrada/retirada. Límites de escritura y validación en servidor.
No modificar datos reales para probar estos límites.

## Diseño anterior y futuro

El diseño Drizzle anterior (users, products, product_embeddings con vector(1536),
endorsements, leads) se retiró del repositorio junto con drizzle-orm y pgvector.
Si alguna de esas tablas existe en una base antigua, no forma parte del esquema
operativo. Adoptar embeddings exigiría decidir identidad, unicidad, permisos,
retención y la extensión pgvector desde cero.
db/solution-applications.sql documenta la tabla del intake anónimo retirado; no
aplicarla a bases nuevas.

## Operación y referencias

Revisar SQL/destino; generar migración no la aplica. Un rollback de contactos
elimina contact_events antes que contact_requests y pierde esos datos; no ejecutarlo
automáticamente. Retirar comentarios antes de partir SQL por punto y coma.

Pendientes: backups/restauración verificados, limpieza de sesiones/resets/contadores
caducados y conciliación del esquema Drizzle. Nunca exponer valores de conexión.

Detalle: [publicación](founder-workflow.md), [biblioteca](buyer-library.md),
[contactos](contacts.md), [configuración](account-settings.md), [contexto maestro](../CLAUDE.md).


## Identidad del catálogo vinculada

db/catalog-ownership.sql añade catalog_key único y restringido a cord/flouvia en
founder_solutions. Aplicado en la base configurada; ambas publicaciones tienen
propietario asignado por instrucción explícita. No modifica sesiones ni verifica
correo, no adopta borradores de otras cuentas. El API/editor no acepta catalog_key.
Biblioteca conserva catalog:cord/catalog:flouvia y resuelve sus fichas/contactos
actuales sin migrar o borrar guardados, listas o notas.


## Capturas e inicio adaptativo — vigente

Aplicar `db/solution-media-dashboard.sql` después de auth/founder-solutions.
Añade solution_media (WebP, dimensiones, FK en cascada), published_at en
founder_solutions y dashboard_mode en auth_accounts. Sin backfill de fechas.
Guardar/upload/borrar usan lock de la fila padre para proteger referencias.
Los binarios son privados salvo referencia en snapshot publicado; no exponerlos
con SELECT público indiscriminado.

**Object storage — vigente (5 sep 2026).** Los bytes de imagen (capturas,
portadas de sitio) salieron de Postgres a Vercel Blob. Migraciones
`db/media-storage.sql` (columnas `storage_key`/`bytes`/`checksum`, tabla
`storage_orphans`, funciones + triggers de recolección de basura, vista
`solution_site_image_ready`) y `db/media-storage-drop.sql` (elimina
`content_base64`, pone `solution_media.storage_key/bytes/checksum` NOT NULL,
recrea la vista). **Ambas aplicadas a `neondb` y a `shwcs_production`.**
`auth_accounts.avatar_data` queda como columna vestigial (0 avatares en prod).
Detalle completo: CLAUDE.md §58 y [media y dashboard](media-dashboard.md).

`db/solution-profile.sql` añade editor_question nullable para reanudar las 14 preguntas.
El step 0..3 se mantiene. Fundadores/redes opcionales viven en data/published_data.


## Listas de comunidad — 31 agosto 2026

Implementadas listas privadas/públicas opt-in, categorías, galería, enlaces compartibles, likes, guardado de listas y comentarios públicos con alias. Notas y propósito siempre privados; existentes privadas. `public-collections.sql` y `community-social.sql` son migraciones aditivas aplicadas en la base configurada. Las tres tablas sociales usan FK en cascada, unicidad por cuenta/lista para like y guardado, y no exponen IDs/correos en consultas públicas. Detalle, ranking, verificación y pendientes de moderación: [community-lists.md](community-lists.md).
