# Listas de la comunidad — 31 agosto 2026

## Experiencia

- `/comunidad`: galería pública, búsqueda, categorías y paginación de 24 listas. La búsqueda usa el mismo buscador del catálogo (`rankCollections`, SHCWS-118): sinónimos, plurales y el vocabulario de las categorías de cada lista, sobre su título, descripción pública, firma y nombres de sus proyectos; con texto, el SQL aplica los demás filtros y el puntaje y la paginación se hacen en el servidor de la app (hasta 500 listas). El índice trigram de §56 ya no se usa para esto. `Recientes` ordena por creación; `Populares` usa `likes × 1 + guardados × 2 + comentarios × 3`, pero solo de cuentas con correo verificado, nunca del dueño de la lista y con el decaimiento de `rankingHalfLifeDays` (SHCWS-115); desempate por creación reciente. Búsqueda, orden y categorías se conservan en la URL; cambiar categoría vuelve a página 1. No se inventan colecciones, autores ni actividad.
- Navbar: globo inclinado inspirado en la referencia del usuario con la palabra «Comunidad» visible desde `lg` (en pantallas chicas es el nombre accesible, con «Listas de la comunidad» como `title`), hover lavanda y giro discreto que respeta movimiento reducido. Acceso también desde el footer («Listas de la comunidad», columna Colecciones), sidebar y Mis listas. El inicio tiene la franja «Listas de la comunidad» con hasta tres listas públicas, las más populares, debajo de las tarjetas animadas; sin listas públicas no se dibuja (SHCWS-114). Las listas editoriales siguen en SHCWS-113. Explorar catálogo sigue inmediatamente encima del menú de cuenta.
- `/account/lists`: tableros de cuatro espacios (2 × 2), sin repetir portadas para llenar huecos; búsqueda y filtro Todas/Privadas/Públicas.
- Crear/editar lista permite escoger visibilidad y varias categorías de la taxonomía del catálogo. Las categorías son de la colección y las elige su autor; no se infieren ni se restringe la pertenencia de proyectos.
- Publicar requiere al menos una categoría, firma pública (nombre o alias, hasta 60 caracteres) y confirmación explícita. La firma es declarada, no identidad verificada, y nunca puede ser la de la plataforma: `reservedCurator()` rechaza en servidor cualquier firma que, sin acentos, signos, mayúsculas ni letras parecidas de otros alfabetos, contenga «shwcs» o «showcase» (SHCWS-116).
- Hacer pública una lista exige al menos 3 proyectos disponibles (fichas publicadas), comprobado en servidor al pasar de privada a pública; una lista nueva nace privada. Si una lista pública baja de 3 por retiros, Comunidad, su detalle y «Guardadas» la ocultan hasta que vuelva a tener 3; conserva su configuración y su dueño puede seguir editándola (SHCWS-116).
- Descripción pública opcional de hasta 400 caracteres, independiente del propósito privado. Se conserva el título de la lista y se advierte que será público.
- `/comunidad/[UUID]`: nombre, descripción pública, firma, categorías, proyectos actualmente publicados, likes, guardado de la lista y conversación pública. Cada proyecto también puede guardarse en la biblioteca del visitante; sin sesión se ofrece acceso/registro y se conserva la intención existente para proyectos.
- Los likes y guardados son únicos por cuenta y lista. El autor no puede puntuar ni guardar su propia colección. Guardar una lista la añade a `/account/community`; si el autor la vuelve privada, deja de mostrarse de inmediato.
- Comentar exige sesión, nombre o alias público (60 caracteres) y texto de hasta 500. Solo se muestra el alias elegido: nunca correo, perfil privado ni ID de cuenta. Autor del comentario y curador de la lista pueden eliminarlo. Se muestran hasta 100 comentarios recientes, aunque el contador conserva el total.
- Compartir copia el enlace público, con alternativa seleccionable si falla el portapapeles. El propietario puede abrir la vista pública desde el editor. No hay dominio nuevo asumido: el enlace usa el origen donde corre la aplicación.
- Editar a privada o eliminar la lista la retira de comunidad y desactiva el enlace público. No se pueden retirar capturas o copias que un visitante ya haya hecho.

## Privacidad y permisos

Todas las listas anteriores y las nuevas sin elección explícita son privadas. No se publican listas de usuarios como datos de demostración.

La consulta pública selecciona únicamente `id`, `name`, `public_description`, `curator_name`, `categories` y referencias de proyectos disponibles. No selecciona propósito, notas, email, perfil, propietario ni otras listas/guardados. La consulta verifica visibilidad y membresía en una misma sentencia; luego `resolveProjects` usa solamente `published_data`. Una ficha retirada o un borrador no aparece. La cuenta del comprador nunca se expone al fundador por guardar un proyecto.

La ruta privada sigue validando sesión y propietario incluso cuando la lista sea pública. Comparaciones, notas y edición no se vuelven públicas. El formulario no copia el propósito privado a la descripción pública. Una actualización exige versión vigente; una segunda pestaña desactualizada no puede sobrescribir visibilidad/datos.

`force-dynamic` evita caché de servidor para comunidad y detalle. El detalle usa metadatos genéricos y `noindex,follow` para reducir indexación persistente mientras maduran moderación y curación. Las páginas ya abiertas o copias externas no pueden revocarse retroactivamente. Las listas de comunidad no equivalen a selección ni aval editorial.

## Datos y despliegue

Aplicar `db/public-collections.sql` después de `db/buyer-library.sql`:

```
npm run db:migrate -- db/public-collections.sql
```

Migración aditiva/idempotente, transaccional, aplicada a la base configurada en esta entrega. Añade `visibility` (private/public, default private), `categories text[]`, `public_description`, `curator_name`, índice parcial de listas públicas. No migra textos privados a campos públicos ni altera dueños. Si el despliegue usa otra base, aplicar allí antes de servir el código.

API existente `/api/library` create-list/update-list incorpora `visibility`, `categories`, `publicDescription`, `curatorName`, `publishConfirmed`. Campos omitidos conservan compatibilidad creando una lista privada; clientes antiguos que editan sin nuevos campos la dejan privada. Sesión, origen, cuota, frecuencia, longitud y versiones siguen protegidos. Límites existentes: 30 listas/200 proyectos guardados por cuenta. No hay permisos de roles nuevos.

Aplicar después `db/community-social.sql` con `npm run db:migrate -- db/community-social.sql`. Crea likes, listas guardadas y comentarios con claves foráneas y borrado en cascada. Una cuenta solo aporta un like y un guardado por lista. El API `/api/community` exige mismo origen, sesión, lista pública y límites de frecuencia; toggles atómicos y comentarios con UUID del cliente hacen seguros los reintentos.

Archivos principales: `src/lib/library/community.ts`, `model.ts`, `server.ts`, API library; componentes `board-card`, `board-gallery`, `list-form`, `community-icon`, `share-collection`; rutas de comunidad y listas.

## Verificación

- 49 pruebas unitarias, incluidas publicación explícita, límites, categorías, fórmula de ranking, comentarios públicos y frontera de origen/sesión.
- Integración `RUN_COMMUNITY_INTEGRATION=1 node tests/integration/community.cjs`: crea dos cuentas temporales; comprueba privado por defecto, rechazo sin consentimiento, edición ajena, conflictos de versión, búsqueda/categorías, ausencia de propósito/notas/correo/ID de dueño/borradores en HTML y RSC, retirada de fichas, revocación y eliminación. Limpieza en finally.
- Integración previa de contactos/comparador pasa sin perder privacidad ni notas.
- Integración `RUN_COMMUNITY_SOCIAL_INTEGRATION=1 node tests/integration/community-social.cjs`: tres cuentas temporales; valida sesión, bloqueo de autoactividad, toggles atómicos, reintentos de comentario sin duplicado, privacidad del alias, moderación del curador, listas guardadas y revocación al pasar a privada. Limpieza en `finally`.
- Lint, TypeScript y build de producción en directorio aislado; no se modifica `.next` del servidor de desarrollo.
- Revisión visual con cuenta temporal: formulario móvil, publicar con varias categorías, mosaico con dos proyectos y dos huecos, detalle público, compartir. Fixture eliminado al terminar.

## Moderación: reportes de listas y comentarios — 4 septiembre 2026

Sustituye la nota histórica de "Límites pendientes" que decía que faltaba un reporte
central para listas/comentarios y que no había que reutilizar el flujo de reportes de
soluciones. Se construyó una tabla y un flujo propios, espejo de `solution_reports`
(`db/launch-foundation.sql`), sin tocar ese flujo existente.

- `db/community-reports.sql`: tabla `community_reports` (`subject_type` `list`|`comment`,
  `list_id` siempre presente, `comment_id` solo para reportes de comentario, `reason`
  `spam|abuse|impersonation|other`, `details`, `status` `open|resolved|dismissed`,
  `decision`, `reviewer_id`, `version` para concurrencia optimista). Un índice parcial único
  por `(list_id,reporter_id)` y otro por `(comment_id,reporter_id)` con `status='open'`
  impiden que la misma cuenta abra dos reportes simultáneos sobre el mismo contenido;
  reintentos devuelven 409, no duplican. `comment_id` es `ON DELETE SET NULL` (no
  `CASCADE`): al eliminar el comentario reportado, el reporte conserva su historial de
  decisión en vez de desaparecer con él — se detectó y corrigió durante la verificación
  en vivo de esta entrega, antes de tocar producción.
- Cualquier visitante autenticado que no sea el dueño de la lista ni el autor del
  comentario puede reportar. `POST /api/community` gana `action:'report'` (además de
  like/save/comment/delete-comment ya existentes), límite `securityLimit('community-report',
  cuenta,5)` (5/hora), y excluye autorreportes en la misma inserción
  (`owner_id<>cuenta` / `author_id<>cuenta`), igual que like/save.
- `CommunityReportForm` (`src/components/library/community-report-form.tsx`) es el mismo
  patrón que `ReportForm` de fichas: motivo + contexto (10–2000 caracteres), sin resolver
  nada desde el producto. Vive en un `<details>Reportar esta lista</details>` (oculto para
  el dueño) y, por comentario, en un botón de bandera visible solo para quien no es su
  autor (el dueño de la lista ya puede borrar cualquier comentario directamente y no
  necesita reportarlo).
- Ops: nuevo `ops/api/community-reports` (GET paginado por estado, POST de decisión) y
  `/panel/reportes` ahora tiene un selector Fichas/Comunidad encima de las pestañas de
  estado existentes, reutilizando la misma UI de expandir-y-decidir. Decisiones:
  `resolve`, `dismiss`, `takedown` (pone la lista en privado o borra el comentario según
  `subject_type`). Concurrencia optimista igual que soluciones (`version`), auditoría en
  `ops_audit_log` con `action:'community_report_${decision}'`. El KPI "Reportes abiertos"
  de `/panel` ahora suma ambas tablas.
- No se tocó el flujo de reportes de soluciones ni sus rutas; ambos comparten página de
  ops pero no tabla ni endpoint.

## Búsqueda con pg_trgm — 4 septiembre 2026

Sustituye la nota histórica que señalaba `strpos()` sin índice como deuda pendiente.
`db/community-search-trgm.sql` habilita la extensión `pg_trgm` y crea un índice GIN sobre
`(name||' '||public_description||' '||curator_name)` filtrado a `visibility='public'`.
`getPublicCollections` (`src/lib/library/community.ts`) cambió el filtro de
`strpos(...)>0` a `(...) ILIKE '%término%'`, con el término del visitante escapado
(`escapeLikeTerm`, `community-model.ts`) para que un `%` o `_` propios no se interpreten
como comodín. Verificado en vivo: coincide con una lista de prueba por una palabra
suelta de su descripción y no coincide con términos ajenos; con el catálogo actual de
pocas listas el planificador todavía prefiere un seq scan (esperado, no un defecto: el
índice se vuelve determinante según crece la tabla, se confirmó forzando su uso con
`enable_seqscan=off`).

## Avisos de comunidad — 14 noviembre 2026 (SHCWS-117)

Migración `db/community-notices.sql` (aplicada solo en `neondb`).

- Al curador: me gusta, guardados y comentarios en su lista pública. Un aviso por tipo,
  lista y día cuyo número sube («A 2 personas les gustó tu lista «X»»); al subir vuelve
  arriba y sin leer. Solo números: nunca quién dio me gusta o la guardó. Lo propio no
  cuenta. Enlaza a `/account/lists/<id>`.
- Por correo solo si el curador lo activa en Preferencias de avisos (`community_email`,
  apagado por defecto). Un aviso del día ya enviado no se vuelve a enviar al subir.
- Al fundador: «Tu proyecto aparece en la lista pública X», una vez por lista y proyecto,
  con enlace a la lista y botones para compartirla. Solo cuando la lista se ve en la
  galería (pública y con 3 proyectos disponibles, SHCWS-116); los proyectos del propio
  curador no avisan. Es un aviso de ficha: sigue la preferencia de correo de fichas.
- La campana acepta enlaces a `/comunidad/<id>` además de `/account…`
  (`src/lib/notifications/href.ts`).
- Prueba: `RUN_COMMUNITY_NOTICES_INTEGRATION=1 node tests/integration/community-notices.cjs`.

## Seguir listas y curadores — 14 noviembre 2026 (SHCWS-121)

Migración `db/community-follows.sql` (aplicada solo en `neondb`), después de
`db/community-notices.sql`.

- En `/comunidad/<id>`, «Seguir lista» y «Seguir a {firma}» (no para el dueño). La lista
  tiene que verse en la galería (pública y con 3 proyectos disponibles).
- **Curador = firma**, no una identidad: se sigue el par (cuenta detrás de la lista, firma
  normalizada con `curator_key()`: minúsculas y espacios). Las listas que esa cuenta firme
  de otra forma no entran, y otra cuenta con la misma firma es otra persona. El cliente solo
  nombra una lista; el servidor resuelve la cuenta y nunca la devuelve (ni en la API, ni en
  el HTML, ni en la exportación).
- Avisos solo a quien sigue, en la categoría `community`: un aviso por persona y semana cuyo
  número sube («Un proyecto nuevo en una lista que sigues», «Esta semana en lo que sigues:
  1 proyecto nuevo y 1 lista nueva»), enlazado a `/account/community`.
  - Proyecto nuevo: un proyecto publicado que entra a una lista seguida y visible.
  - Lista nueva: la primera vez que una lista de esa firma se ve en la galería
    (`community_list_announcements`). La migración marca como ya anunciadas las listas
    visibles hoy, para no presentar nada viejo como nuevo.
  - Solo cuenta lo que pasó después de empezar a seguir.
- Correo: un **resumen semanal**, nunca uno por cambio. Sale el lunes siguiente
  (`next_attempt_at`), solo con `community_email` activo y correo verificado. El texto de
  Preferencias de avisos lo dice.
- `/account/community` suma «Listas que sigues», «Curadores que sigues» (con dejar de
  seguir) y, para quien tiene listas públicas, «Quién te sigue»: solo números por firma y
  por lista, nunca quién.
- API `POST /api/follows`: `list`, `curator` (alternan desde una lista visible),
  `unfollow-list` y `unfollow-curator` (por el id propio del seguimiento; funcionan aunque
  la lista ya sea privada). Mismo origen, sesión y 60 cambios por hora.

## Límites pendientes

No hay colaboración entre autores, clonado, portadas personalizadas ni perfiles públicos. El ranking mide interacción bruta, no calidad ni tendencia temporal, y puede manipularse creando cuentas; usarlo solo como orden auxiliar durante beta. El curador modera comentarios de su lista directamente y ahora también existe un reporte central en ops (ver arriba), pero todavía faltan bloqueo, apelación, reputación y defensa sólida ante multicuentas — no promover masivamente la función hasta cerrar esa operación.

Marca vigente: **shwcs**. Rebranding de interfaz aplicado después de esta entrega; dominio, logo y servicios externos pendientes.
