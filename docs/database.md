# Base de datos — estado vigente

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

El MVP utiliza SQL parametrizado con Neon HTTP y migraciones aditivas en db/*.sql.
src/db/schema.ts conserva un diseño Drizzle anterior; NO representa el esquema
operativo completo. No ejecutar drizzle-kit push para sincronizarlo sin conciliación.

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
12. db/public-collections.sql
13. db/community-social.sql
14. db/contact-inquiries.sql

Newsletter es independiente; segments depende de subscribers.
La conexión usa NEON_DATABASE_URL, luego DATABASE_URL y luego POSTGRES_URL.
No imprimir cadenas de conexión ni copiar .env.local a documentación.

Migraciones previas y contact-requests.sql fueron aplicadas/pruebas en la base
configurada localmente. Otra base o proyecto Vercel requiere verificación separada.
No existe aún un sistema unificado de migraciones versionadas.

## Datos públicos y privados

- Solo published_data alimenta catálogo, ficha y comparador; nunca el borrador.
- Categorías múltiples están en JSON; category conserva compatibilidad.
- Guardados apuntan a catalog:cord, catalog:flouvia o solution:UUID, sin copiar ficha.
- Consultas de biblioteca y solicitudes acotadas a la sesión; SQL sin caché para
  información actual. No compartir notas con el dueño del proyecto.
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

src/db/schema.ts define users, products, product_embeddings, endorsements y leads.
Tiene enums propios y vector(1536), pero no integra automáticamente la identidad
operativa ni las solicitudes actuales. No usar esa tabla leads para las nuevas
oportunidades; no crear leads a partir de búsquedas/guardados.

Antes de adoptar ese diseño: decidir migración de identidad, unicidad de embeddings,
slugs/índices, permisos, retención y pgvector. Su presencia no demuestra que la
extensión o todas esas tablas estén aplicadas a la conexión configurada.
db/solution-applications.sql corresponde al intake anterior retirado.

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
Añade solution_media (WebP base64, dimensiones, FK en cascada), published_at en
founder_solutions y dashboard_mode en auth_accounts. Sin backfill de fechas.
Aplicada a la conexión local configurada; no certifica otro entorno de Vercel.
Guardar/upload/borrar usan lock de la fila padre para proteger referencias.
Los binarios son privados salvo referencia en snapshot publicado; no exponerlos
con SELECT público indiscriminado. Límites y futura migración a objetos privados
se documentan en [media y dashboard](media-dashboard.md).

`db/solution-profile.sql` añade editor_question nullable para reanudar las 14 preguntas.
El step 0..3 se mantiene. Fundadores/redes opcionales viven en data/published_data.


## Listas de comunidad — 31 agosto 2026

Implementadas listas privadas/públicas opt-in, categorías, galería, enlaces compartibles, likes, guardado de listas y comentarios públicos con alias. Notas y propósito siempre privados; existentes privadas. `public-collections.sql` y `community-social.sql` son migraciones aditivas aplicadas en la base configurada. Las tres tablas sociales usan FK en cascada, unicidad por cuenta/lista para like y guardado, y no exponen IDs/correos en consultas públicas. Detalle, ranking, verificación y pendientes de moderación: [community-lists.md](community-lists.md).
