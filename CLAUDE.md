# CLAUDE.md — shwcs

Contexto maestro vigente al 31 de agosto de 2026. Leer antes de trabajar.
Este documento consolida las decisiones actuales y sustituye las notas históricas
contradictorias. El código y las instrucciones más recientes del usuario prevalecen.
Implementado no significa desplegado: distinguir siempre código, prueba local,
base configurada y producción.

## 1. Producto y propósito

shwcs conecta empresas mexicanas con proyectos B2B que pueden ayudarlas:
software, agencias y servicios. No vender shwcs como un software empresarial
ni como una certificación de proveedores. Su valor es selección, contexto para
evaluar y acceso a quienes construyen las soluciones.

Recorrido ya soportado:
problema → catálogo/ficha → guardar → organizar/comparar → solicitar contacto →
respuesta y seguimiento.

Una sola cuenta puede comprar y publicar. Fundador, comprador, ambos y explorador
son descripciones del perfil, no permisos. Nunca conceder revisión editorial,
acceso a solicitudes ajenas o propiedad de proyectos por nombre, dominio, rol
declarado o coincidencia de correo.

Objetivos:
- Fundador: postular, mejorar su ficha aprobada y recibir solicitudes con contexto.
- Comprador/CFO/dueño: entender opciones, conservar una selección privada,
  comparar y contactar conscientemente al proyecto adecuado.
- Equipo editorial: revisar información y controlar lo publicado.

## 2. Estado funcional real

| Área | Implementado | Límite actual |
| --- | --- | --- |
| Descubrimiento | Home, categorías, búsqueda local por palabras/intenciones, fichas y sitios oficiales | Sin búsqueda IA, sin catálogo masivo real |
| Publicación | Borradores propios, envío, revisión, cambios, rechazo, aprobación y ficha pública | Control de dominio por TXT y retirada con reportes; no verificación de resultados |
| Acceso | Registro/login por contraseña, sesiones persistentes, logout, cambio de contraseña | Verificación implementada; Google OAuth preparado, falta conexión externa |
| Recuperación | Flujo/token y pantalla implementados | Falta activar y verificar proveedor de correo |
| Configuración | Centro y páginas de perfil, seguridad y conexiones; foto | Vinculación/desvinculación implementada; requiere credenciales y prueba con Google |
| Newsletter | Formulario por pasos, segmentos y consentimiento guardados | No envía campañas; baja y doble opt-in operativos pendientes |
| Biblioteca y comunidad | Guardados privados; listas privadas/públicas, categorías y enlaces compartibles; notas siempre privadas | Sin colaboración ni moderación de listas todavía; ver docs/community-lists.md |
| Comparador | Dos o tres proyectos de una lista, información pública actual y notas propias | Sin rankings, puntuaciones o información inventada |
| Contactos | Solicitud con contexto, revisión de datos y consentimiento; entrega a propietario | Publicaciones con propietario, incluidos Cord/Flouvia vinculados; sin emails automáticos |
| Bandejas | Mis contactos y Oportunidades; filtros, páginas e historial, respuesta y estados | No chat ni tiempo real; avisos internos disponibles, entrega por email pendiente |
| Fichas enriquecidas | Capturas, demo externa, límites de encaje, preview privada y guía de información | Evidencia declarada; storage de MVP, sin hosting de video |
| Inicio adaptativo | Comprador/fundador/ambos, siguientes pasos y actividad propia | Preferencia visual, no permisos ni métricas de conversión |
| Métricas | Vistas/clics agregados y solicitudes reales, 30 días por proyecto propio | No personas únicas, ventas ni identidades de guardados |
| Producción | Next actualizado, configuración Vercel, CI, preflight y builds locales | Credenciales externas, responsable editorial, políticas y despliegue remoto pendientes |

El archivo de diseño contiene 63 entradas (7 × 9), con 57 ejemplos ficticios.
La interfaz pública los oculta salvo NEXT_PUBLIC_SHOW_DEMO_PROJECTS=true.
Los dos proyectos reales Cord/Flouvia se resuelven solo desde su publicación
aprobada, nunca como fallback si fueron retirados. Cord primero y Flouvia segundo;
búsqueda conserva relevancia como criterio principal. No duplicar por categorías.

Cord: catalog:cord, https://cordhq.app/.
Flouvia: catalog:flouvia, https://flouvia.com/.
Aparecer en varias categorías no crea otra identidad de guardado.
Cord y Flouvia ya están vinculados a la cuenta expresamente autorizada por el usuario.
Son publicaciones gestionables en founder_solutions, con catalog_key único cord/flouvia.
Reciben solicitudes en la bandeja del propietario. Esta asignación administrativa
no es verificación de email ni se repite automáticamente al registrar una cuenta.
No asignar otros proyectos por nombre, dominio o coincidencia de correo.

## 3. Decisiones visuales del usuario

- Marca tipográfica sin cuadrado/isotipo en navbar, footer, sidebar y acceso.
  Nombre vigente: **shwcs**, siempre en minúsculas. Cambio de marca aplicado el
  31 de agosto a interfaz, metadatos, correos, paquete y documentación. Sin logo
  nuevo. No cambiar dominios, identificadores, cookies o cuentas automáticamente.

- Fondo claro #f5f5f4, texto stone, tarjetas blancas solo donde aportan estructura.
  No restaurar la dirección oscura inicial.
- Hero en dos líneas: «Encuentra soluciones.» / «Conoce a sus creadores.».
  Prohibido añadir texto pequeño encima del título.
- Explorador debajo del hero, sin título visible ni tarjeta gris contenedora.
  Categorías a la izquierda y tarjetas directamente sobre el fondo.
- Categorías: Cobros, Finanzas, Nómina, Ventas, Operación, Legal, Agencias.
- Cinco acentos: azul, salvia, lavanda, terracota y ámbar.
  Fuente única: src/lib/brand-colors.ts.
- CTA con actionButtonStyle: fondo #E4EBFC, texto #365DC4.
  Categorías/iconos conservan sus colores; chips del hero por categoría.
- Animaciones mínimas perceptibles: flechas, hover, presión y cambios de categoría.
  Nada magnético ni efectos sobre el cursor. Respetar prefers-reduced-motion.
- Foco visible, teclado funcional, etiquetas reales; errores inline en formularios,
  sin depender de globos nativos. No quitar accesibilidad para conseguir estética.
- Newsletter sobre el fondo, título y formulario por pasos; sin bullets ni tarjeta.
- Login/registro «Bienvenido a shwcs», formulario centrado sobre el fondo,
  sin tarjeta exterior; Google indica «Pendiente de conexión» sin credenciales; nunca simular login.
- Comparador: tabla semántica con scroll horizontal contenido y foco de teclado
  en móvil. No provocar desbordamiento horizontal de toda la página.
- Contacto: datos → revisión explícita de lo que se comparte → consentimiento →
  envío; no compartir notas de biblioteca automáticamente.

### Sidebar y navegación de cuenta

- Blanca, estética de la landing, pegada al borde izquierdo.
- Escritorio: left:0, ancho 248px, 24px libres arriba/abajo; esquinas izquierdas
  rectas y derechas redondeadas. Contenido con margen izquierdo de 264px.
- CTA «Postular solución»: solo + a la derecha, sin flecha ni otro + a la izquierda.
- Sin puntos de color para indicar activo.
- Navegación: Inicio, Mis soluciones, Guardados, Mis listas, Mis contactos, Oportunidades.
  Ya no existe «Revisión editorial» en la sidebar: toda revisión vive en ops (ver §48).
  Explorar catálogo va abajo, justo encima del menú de cuenta, separado de la
  navegación principal.
- Perfil abajo con desplegable ascendente: Configuración y Cerrar sesión.
  No duplicar Configuración como enlace principal de la sidebar.
- Menú cierra al navegar, pulsar fuera, Escape o perder foco; devuelve foco al
  activador cuando corresponde. En móvil, navegación desplegable.
- /account es Inicio adaptativo con selector Comprador/Fundador/Ambos persistido.
  Mis soluciones está en /account/solutions. Elegir modo no cambia permisos ni perfil.

## 4. Stack y estructura

Next.js 15.5.24 App Router, React 19.2.8, TypeScript estricto, Tailwind 3, GSAP,
lucide-react. Neon HTTP mediante @neondatabase/serverless. Sharp para avatares y capturas.
No Clerk. AI SDK está instalado pero no conectado a un flujo del producto.
jose valida JWT de Google. PostCSS 8.5.26 mediante override para Next; APIs dinámicas async.

src/app:
- layout.tsx: HTML, tipografía y salto al contenido.
- (marketing)/layout.tsx: navbar/footer comercial; home y /soluciones/[id].
- (focused)/layout.tsx: logo y vuelta al catálogo; auth, recuperación, newsletter.
- account/layout.tsx: sidebar y contenido privado; error.tsx permite reintentar.
- api/: rutas de auth, cuenta, newsletter, soluciones, biblioteca y contactos.
- aplicar/page.tsx: entrada al flujo autenticado; no intake anónimo.

src/lib:
- database-url.ts: prioridad de configuración de Neon.
- auth/: hash, sesiones, seguridad, recuperación y retorno seguro al login.
- solutions/: modelo/validación, permisos, queries y cuerpo HTTP limitado.
- library/: identidad de proyectos, listas y resolución de datos publicados.
- contacts/: modelo, validación, transiciones, errores y operaciones de dominio.
- catalog-preview.ts: catálogo estático, ejemplos y tipos.
- catalog-search.ts: búsqueda local; no inferencia de IA.
- brand-colors.ts: paleta compartida.

src/components:
- navigation/: sidebar y piezas compartidas de marca.
- solutions/: editor, revisión y estados.
- library/: guardar, listas, notas y selector del comparador.
- contacts/: formularios de solicitud/respuesta, bandejas y actualización manual.
- settings/: perfil/seguridad/conexiones.

db/*.sql: esquema operativo del MVP mediante migraciones SQL aditivas.
src/db/schema.ts: diseño Drizzle anterior (users/products/leads/vector).
No tratarlo como fuente de verdad de auth_accounts/founder_solutions/contact_requests.
No ejecutar drizzle-kit push para «sincronizar» todo sin revisar la divergencia.

## 5. Rutas y límites de acceso

| Ruta | Uso |
| --- | --- |
| / | Descubrimiento con publicaciones aprobadas; ejemplos ocultos por defecto |
| /soluciones/[id] | Ficha pública de published_data, UUID v4 válido |
| /newsletter | Suscripción segmentada sin cuenta obligatoria |
| /sign-in, /sign-up | Acceso propio |
| /forgot-password, /reset-password | Recuperación (entrega de correo pendiente) |
| /account | Inicio adaptativo comprador/fundador/ambos |
| /account/solutions | Mis soluciones propias |
| /account/solutions/new | Crear borrador autenticado |
| /account/solutions/[id] | Gestionar solución propia; solo el dueño |
| /account/solutions/[id]/preview | Vista previa privada del borrador guardado |
| /account/saved | Guardados privados |
| /account/lists | Listas privadas |
| /account/lists/[id] | Proyectos y notas de la lista del propietario |
| /account/lists/[id]/compare?project=...&project=... | Comparar 2–3 miembros de esa lista |
| /account/contacts/new?solution=UUID | Revisar y enviar solicitud al propietario |
| /account/contacts | Solicitudes enviadas por la cuenta |
| /account/opportunities | Solicitudes recibidas por la cuenta propietaria |
| /account/contacts/[id] | Seguimiento del comprador; destinatario redirige a su oportunidad |
| /account/opportunities/[id] | Seguimiento del destinatario; comprador/terceros no acceden por esta ruta |
| /account/settings | Centro de configuración, no redirección a perfil |
| /account/settings/profile | Nombre, empresa, perfil, rol y foto |
| /account/settings/security | Cambio/recuperación de contraseña y logout |
| /account/settings/connections | Estado de métodos de acceso, Google pendiente |
| /account/settings/data | Idioma, copia de datos y eliminación de cuenta |
| /account/profile | Alias anterior que redirige a configuración |

Las páginas privadas requieren sesión y no se indexan. Un UUID ajeno no concede acceso.
Pertenecer a `solution_reviewers` ya no cambia nada dentro del producto: no abre
fichas ajenas, capturas, listas, notas ni contactos. Solo da acceso a ops (§48).
Búsquedas del menú apuntan al catálogo; se ocultan destinos no implementados.
Páginas informativas existen; políticas legales son borradores y necesitan revisión.

authReturnTo valida una lista explícita de destinos internos. Conserva intención de
guardar y solicitar contacto a través de login/registro. Nunca aceptar redirect
externo, rutas arbitrarias o tokens de sesión en query. No mutar recursos de negocio desde enlaces GET; OAuth y worker son protocolos
excepcionales, con estado de un uso o autorización Bearer respectivamente.

## 6. Identidad, cuenta y seguridad

- auth_accounts es la identidad operativa; email único normalizado.
- Contraseñas con scrypt y sal aleatoria; mínimo 6 caracteres por decisión del usuario.
  Límite técnico 4096, no anunciar «longitud infinita».
- Sesiones: tokens aleatorios de 32 bytes; solo SHA-256 persistido.
  Cookie HttpOnly, SameSite=Lax, path /, Secure y prefijo __Host- en producción.
  Duración de sesión: siete días.
- Registro devuelve resultado genérico y no inicia sesión en cuentas preexistentes.
- Login y cambio de contraseña verifican concurrencia del hash.
  Cambiar contraseña revoca sesiones y recuperaciones anteriores.
- Cambios de perfil nunca cambian identidad, correo, propiedad ni privilegios.
- Recuperación: token hash, 30 minutos, vinculado al hash de contraseña de emisión,
  consumo atómico; token en fragmento del enlace, no devolverlo en API.
- Google OAuth propio implementado (PKCE, state, nonce, JWT). Sin credenciales
  externas no se activa. Vincular requiere reautenticación; desvincular revoca sesiones.
  Nunca fusionar cuentas por coincidencia de correo. Ver docs/launch.md.
- Avatares: JPG/PNG/WebP, 2 MB/16 MP máximo; Sharp valida, normaliza a WebP 256×256
  y elimina metadatos. Sin SVG/animaciones; imagen comprimida privada en avatar_data.
- Mutaciones sensibles: sesión y origen exacto, cuerpos acotados, campos validados,
  límites persistentes por identidad/global. Nunca confiar en IDs de propietario
  enviados por el cliente.
- No guardar secretos, correos, mensajes, cookies o cadenas de conexión en logs.
- email_verified_at solo cambia tras token de verificación o Google de correo
  coincidente verificado. Token acotado a cuenta/correo, 30 minutos, un uso.
  AUTH_REQUIRE_VERIFIED_EMAIL=true exige verificación para nuevos contactos;
  activar tras probar entrega. Tener cuenta no implica email verificado.

## 7. Publicaciones y revisión editorial

founder_solutions: owner_id, data privado, published_data aprobado, status,
step, version y fechas. owner_id proviene de la sesión.

Estados: draft, pending, changes_requested, published, rejected.
El fundador edita borradores/cambios y envía; el revisor decide con comentario.
solution_reviewers concede permisos explícitos. No se crea ningún revisor
automáticamente ni por perfil. Revisar (publicar/rechazar/pedir cambios/retirar)
es exclusivo de ops y ya **admite autorrevisión**, decisión explícita del
propietario del 3 de septiembre de 2026: sustituye la prohibición histórica. Ver §48.

- categories admite varias categorías conocidas sin duplicados.
  category conserva la primera por compatibilidad con registros antiguos.
- La ficha requiere nombre, tipo, categorías, problema, audiencia, sitio y correo
  privado de contacto.
- Opcionales: scope (800), pricing (400), implementation (400),
  integrations (400), support (400), evidence (800), evidenceUrl (500).
- Enlaces HTTP(S) sin credenciales; no ejecutar esquemas arbitrarios.
- Modificar data no sustituye published_data. La ficha y el catálogo conservan la
  versión aprobada anterior hasta nueva aprobación.
- Un estado de revisión/rechazo de actualización no retira automáticamente la
  versión pública anterior.
- No serializar el correo privado del fundador en catálogo/comparador.
- La resolución pública consulta solo published_data con cache:no-store.
- solution_events registra decisiones y mensajes. version evita sobrescrituras.
- Inclusión editorial no certifica seguridad, resultados ni calidad.

## 8. Guardados, listas y comparación

Tablas: buyer_saved_projects, buyer_lists, buyer_list_items.
Claves compuestas por owner_id impiden unir elementos de cuentas distintas.

Identidad:
- catalog:cord y catalog:flouvia para proyectos reales estáticos.
- solution:UUID para publicación de fundador.
- Ejemplos ficticios no se guardan ni reciben solicitudes.
- No copiar fichas a la biblioteca: resolver versión pública actual.
- catalog:cord/catalog:flouvia resuelven la publicación mediante catalog_key y
  conservan guardados/notas existentes. solutionId dirige el contacto al UUID real.
- Publicación retirada: mostrar «Proyecto no disponible» sin leer borrador;
  conservar notas hasta que el comprador las quite.

Límites: 200 guardados, 30 listas, nombre 100, propósito 400, nota 2000.
Las inserciones son idempotentes y serializan cuotas por propietario.
Editar nombre/propósito o nota exige versión actual.

Eliminación:
- Quitar de una lista borra su nota, conserva el guardado y otras listas.
- Borrar lista elimina sus notas/asociaciones, conserva guardados.
- Quitar guardado elimina todas sus asociaciones/notas con confirmación.
- Eliminar una cuenta en BD elimina biblioteca en cascada; no hay UI de borrar cuenta.

Comparación:
- Desde cada lista, seleccionar exactamente dos o tres proyectos disponibles.
- Validar identidad, duplicados, tamaño de selección y membresía en servidor.
- Primero comprobar propiedad de lista; nunca mostrar nombre/notas ajenas.
- Datos: problema, cliente ideal, alcance, precio, implementación, integraciones,
  soporte, evidencia/enlace y notas privadas de esa lista.
- Datos desconocidos señalados como faltantes; no puntajes, recomendaciones
  comerciales automáticas ni valores estimados inventados.
- CTA de contacto para publicaciones con dueño, incluidos Cord/Flouvia vinculados.
  Estáticos sin vincular conservan sitio oficial; nunca derivar UUID cortando catalog:key.
- No persiste otra entidad «comparación»: se genera desde la lista y query.
- Misma URL solo funciona para la cuenta propietaria; no es enlace para compartir.

## 9. Solicitudes de contacto y oportunidades

### Captura y consentimiento

Datos: nombre (2–100), empresa (2–150), tamaño de equipo (opciones conocidas),
plazo (opciones conocidas), necesidad (20–2000), presupuesto opcional (0–200).
Correo tomado de la sesión, nunca de un input editable enviado al API.

Antes de enviar se presenta resumen exacto, nombre del proyecto destinatario y
casilla explícita. Se registra consent_version=contact-v1 y consent_at.
La autorización cubre datos de la solicitud; NO incluye guardados, listas, notas
ni suscripción al newsletter. No insertar contactos silenciosamente al comparar.

El cliente envía recipientId como comprobación del destinatario mostrado; el servidor
resuelve el dueño desde founder_solutions, exige coincidencia y lo vuelve a comprobar
al insertar. No permite elegir arbitrariamente otra cuenta o contactar solución propia.
Solo se puede crear mientras published_data existe.

### Persistencia e idempotencia

contact_requests: id, buyer_id, recipient_id, solution_id, project_name,
buyer_email, details, consent_version, consent_at, status, version y fechas.
Nombre del proyecto/correo/contexto son instantáneas al envío.
El destinatario queda fijado al crear; transferir propiedad futura no debe transferir
automáticamente conversaciones privadas.

Una solicitud por comprador/proyecto (UNIQUE buyer_id,solution_id), incluso cerrada
o retirada. Reintentos retornan la existente; no generan oportunidades duplicadas.
La UI dirige al seguimiento existente. Retirada es terminal; recontactar tras retiro
queda pendiente de una decisión explícita de producto.

Máximo 1000 solicitudes por comprador; bloqueo de su fila serializa creación/cuota.
Creación limitada a 20 intentos/hora por comprador, actualizaciones a 100/hora;
securityLimit también impone 60/minuto global por cada scope.
No equivale a protección completa contra spam. Reportes implementados;
verificación obligatoria configurable, pendiente de activación de entrega.

### Estados, respuesta e historial

| Estado actual | Comprador | Cuenta destinataria |
| --- | --- | --- |
| new | Retirar | En conversación o cerrar |
| conversation | Retirar | Cerrar |
| closed | Consultar | Reabrir en conversación |
| withdrawn | Consultar | Consultar, sin responder/reabrir |

Cada cambio del destinatario exige respuesta de 10–2000 caracteres, visible para
el comprador, y confirmación previa. Puede indicar próximo paso o motivo de cierre.
No es chat: no hay mensajes ilimitados separados de cambios de estado.

Retirar requiere confirmación e informa que no borra lo ya recibido.
Respuesta/estado y contact_events se escriben atómicamente con CTE; version y estado
anterior impiden cambios perdidos. Una carrera cierre/retiro produce un éxito y un
conflicto; el usuario debe recargar antes de repetir.

### Acceso y entrega

- Mis contactos filtra buyer_id; Oportunidades filtra recipient_id.
- Detalle/historial admiten exclusivamente comprador o destinatario, no terceros
  ni revisores editoriales por su rol.
- Filtros: todas/nuevas/en conversación/cerradas/retiradas; páginas de 20.
- Actualizar recarga datos desde servidor. No WebSocket ni polling. Avisos internos
  transaccionales; correo configurable solo con proveedor/worker activos.
- «Entregada» significa persistida y accesible en bandeja, no leída ni email enviado.
- El dato privado contactEmail del fundador sigue sin mostrarse a visitantes.
- Tras retirar published_data, contactos existentes siguen accesibles a sus participantes.
- Borrar solución/cuenta en BD elimina solicitudes e historial relacionados en cascada.
  No existe aún una política operativa de retención ni exportación/eliminación en UI.
- Sin métricas de leads, notificaciones, CRM, agenda automática ni adjuntos.
- No enviar mensajes a personas reales mediante herramientas durante pruebas;
  usar cuentas temporales propias del test.

## 10. API operativa

| Endpoint | Operaciones |
| --- | --- |
| POST /api/auth/[action] | register, login, logout, totp (segundo paso del acceso) |
| PATCH /api/account | Perfil descriptivo de la sesión |
| POST /api/account/totp | start, confirm, regenerate, disable de la verificación en dos pasos |
| POST /api/account/sessions | revoke y revoke-others de las sesiones propias |
| GET /api/account/export | Copia JSON de los datos propios |
| POST /api/account/delete | Eliminación permanente con contraseña y confirmación escrita |
| PUT/DELETE /api/account/avatar | Foto propia |
| POST /api/account/dashboard | Preferencia de inicio de la sesión, sin cambio de permisos |
| POST /api/account/password | Cambio de contraseña |
| POST /api/auth/forgot-password | Emitir recuperación si correo está configurado |
| POST /api/auth/reset-password | Consumir recuperación válida |
| POST /api/newsletter | Segmentación y consentimiento |
| POST /api/solutions | Crear borrador propio |
| PATCH /api/solutions/[id] | Guardar y enviar a revisión, con versiones. Ya no aprueba ni rechaza |
| GET/POST /api/solutions/[id]/media | Biblioteca y subida de capturas propias |
| GET/DELETE /api/solutions/[id]/media/[assetId] | Imagen autorizada o borrado de archivo propio sin uso |
| GET /api/library?project=... | Estado de guardado propio |
| POST /api/library | save, unsave, create-list, update-list, delete-list, add-to-list, remove-from-list, update-note |
| POST /api/contacts | create o update |

/api/applications es legado retirado; no usarlo para postular anónimamente.
Biblioteca/contactos usan respuestas no-store y cuerpo JSON máximo 32768 bytes.
ContactError separa fallos esperados (400/404/409) de indisponibilidad (503).
La API no devuelve stack ni datos del error de conexión; log genérico con requestId.
Un timeout no confirma fracaso de la escritura: revisar bandeja antes de repetir.

## 11. Base de datos y migraciones

getDatabaseUrl usa, en orden: NEON_DATABASE_URL, DATABASE_URL, POSTGRES_URL.
Son secretos solo de servidor; no imprimir valores, hosts con credenciales ni tokens.

Orden de esquema operativo para base nueva:
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
12. db/launch-foundation.sql (tras auth/settings/soluciones/contactos)
13. db/account-security.sql (tras auth.sql; segundo factor y sesiones con dispositivo)
14. db/solution-site-image.sql (tras founder-solutions.sql; portada og:image del sitio)

Newsletter es independiente, pero segments exige subscribers.
db/solution-applications.sql y src/db/schema.ts son diseños anteriores;
no migrar usuarios/datos a esas tablas por suposición.

Las migraciones aditivas de auth/perfil/settings/soluciones/newsletter/biblioteca
se aplicaron previamente a la conexión local configurada. contact-requests.sql y catalog-ownership.sql
se aplicaron y verificaron con pruebas reales en esa misma configuración previamente.
También se aplicaron solution-media-dashboard.sql, solution-profile.sql y
launch-foundation.sql a esta conexión. La publicación autorizada de Cord/Flouvia
se realizó allí; versiones al publicar: 8 y 2. No se asignaron revisores reales.
Esto NO confirma que otro proyecto/base de Vercel tenga las tablas.

- Revisar SQL y destino antes de modificar una base.
- No reescribir ni borrar datos reales para una prueba.
- No hacer push de esquema Drizzle masivo sin conciliar el esquema operativo.
- Rollback de contactos requiere eliminar contact_events antes de contact_requests;
  borra esos datos, no es un rollback sin pérdida. No ejecutarlo automáticamente.
- No separar SQL ingenuamente por punto y coma: funciones PL/pgSQL usan bloques
  $$ y comentarios. scripts/migrate-launch.cjs respeta esos delimitadores.
- Sin framework unificado de migraciones. El worker limpia tokens de
  recuperación/verificación/OAuth y contadores caducados; requiere programación.
  Limpieza de sesiones y archivos abandonados sigue pendiente.

## 12. Entorno e integraciones pendientes

- Neon: necesario para cuenta, publicaciones remotas, biblioteca y contactos.
- AUTH_APP_ORIGIN: origen canónico HTTPS, sin ruta/query/credenciales.
- AUTH_EMAIL_FROM: remitente autorizado.
- RESEND_API_KEY: recuperación, verificación y avisos transaccionales.
- Recuperación usa API de Resend sin SDK; activación/entrega real aún por verificar.
- Newsletter no usa automáticamente el proveedor de recuperación.
- GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET: faltan conexión externa y prueba real.
- CRON_SECRET (32+ caracteres): worker de avisos, scheduler pendiente.
- Métricas internas implementadas, sin analytics externo. Campañas, almacenamiento
  externo y búsqueda IA no están conectados.
- Proyecto Vercel shwcs no disponible en cuenta CLI inspeccionada (Flouvia).
  No desplegar sobre Cord/Flouvia por confundir proyectos.
- No inventar servicios configurados porque aparece un paquete o variable.
- .env.local no se versiona ni copia a documentación o builds temporales.

## 13. Desarrollo y verificación

Comandos:
- npm run dev: Next dev.
- npm run lint: ESLint.
- npm run typecheck: TypeScript sin emitir.
- npm test: pruebas unitarias.
- npm run preflight: configuración de lanzamiento sin secretos.
- RUN_LAUNCH_INTEGRATION=1 node tests/integration/launch.cjs:
  verificación/avisos/TXT/reportes/métricas/desvinculación con cuentas temporales.
- RUN_CONTACT_INTEGRATION=1 node tests/integration/contacts.cjs:
  integración explícita contra localhost:3000 y la BD de .env.local.
- RUN_MEDIA_INTEGRATION=1 node tests/integration/media-dashboard.cjs:
  integración de capturas, publicación protegida, concurrencia y dashboard.
- npm run build: producción.
- npm run check: lint + typecheck + build.
- npm run start: servir build ya generado.

Nunca ejecutar next dev y next build con el mismo .next a la vez. Se observaron
errores de caché/vendor/estilos. Con dev abierto, usar copia temporal de src/public/
config/package con node_modules enlazado y su propia salida .next. No copiar secretos.
Evitar varios procesos dev sobre el mismo checkout.

Integración de contactos:
crea tres cuentas @example.invalid, publicaciones/lista propias del test y sesiones;
prueba comparación privada, campos públicos actuales, consentimiento, identidad,
destinatario, duplicados/concurrencia, rechazo de borradores/auto-contacto, bandejas,
respuestas, cierre/reapertura, conflictos de versión, retiro e historial atómico.
finally elimina solo cuentas del test, datos en cascada y sus contadores.
No usar cuentas reales del usuario ni enviar emails.

Pruebas unitarias actuales: 45 pasando. Lint y TypeScript correctos.
Integraciones de capturas/dashboard y regresión de contactos pasando. Build aislado
correcto. Verificación y límites de esta entrega en docs/launch.md y docs/media-dashboard.md;
no inferir validación de producción de estos resultados.

## 14. Estado del plan y siguiente entrega

Fichas enriquecidas, comparador, contactos/bandejas, inicio adaptativo, biblioteca
visual y formulario guiado están implementados. La entrega actual añade:
1. Avisos privados, preferencias y verificación de email; proveedor/cron pendientes.
2. TXT de dominio, criterios, reportes y retiro autorizado; no certifica resultados.
3. Métricas agregadas privadas de vistas/clics y solicitudes por proyecto propio.
4. Google OAuth preparado, navegación depurada, Next actualizado, CI y preflight.

Cord y Flouvia publicados por autorización explícita; no autoaprobación vía UI.
Siguiente paso: conectar remitente/Google/scheduler y proyecto Vercel correcto,
designar revisor, completar políticas y probar despliegue. No ampliar a CRM/chat
antes de validar uso real. Matriz de los 12 puntos en docs/roadmap.md.

## 15. Documentación y reglas para futuros cambios

Leer según área:
- docs/launch.md: avisos/verificación, Google, TXT/reportes, métricas y activación.
- docs/guided-solution-form.md: preguntas, creadores/redes y reanudación compatible.
- docs/media-dashboard.md: capturas, demos, información pendiente, inicio y permisos.
- docs/contacts.md: contrato de solicitudes, comparación y verificación.
- docs/buyer-library.md: guardados/listas y eliminación.
- docs/founder-workflow.md: publicación y revisión.
- docs/account-settings.md: perfil/contraseña/recuperación.
- docs/newsletter-auth.md: newsletter y acceso inicial.
- docs/roadmap.md: estado consolidado del plan de producto.
- docs/database.md, docs/env.md, docs/stack.md: referencias técnicas.
- docs/product.md, docs/design.md, docs/colors.md, docs/listings.md: producto y estética.

Algunos documentos específicos conservan notas históricas: priorizar su actualización
vigente y esta matriz; no reintroducir navbar horizontal, Clerk, intake anónimo ni
Configuración duplicada a partir de texto antiguo.

Reglas:
1. TypeScript estricto sin any; Server Components por defecto.
2. Aislar interactividad y enviar al cliente solo campos necesarios.
3. Preservar cambios existentes del usuario. No descartar archivos sin entenderlos.
4. Reutilizar dependencias/tokens, no crear estilos o servicios paralelos.
5. Autorizar en servidor cada lectura/mutación privada; no basta ocultar enlaces.
6. Escribir pruebas de permisos, concurrencia y flujo cuando el riesgo lo requiere.
7. Sin éxito simulado ante fallo de BD/proveedor. Mostrar ausencias y pendientes.
8. No atribuir a esta entrega cambios históricos ni afirmar push/deploy no ejecutados.
9. Actualizar documentación de estado, límites y verificación al cerrar una entrega.
10. Commits descriptivos cuando se pidan; no publicar/desplegar por defecto.


### Vinculación explícita de Cord y Flouvia

Se crearon dos publicaciones administrables para la cuenta autorizada, sin tocar
el borrador de otra cuenta ni modificar guardados/listas existentes. catalog_key
solo se asigna por operación administrativa; no se acepta desde el editor/API.
El catálogo usa los datos aprobados y conserva OG/favicon locales. El merge excluye
el fallback estático de un catalog_key publicado, evitando duplicados incluso si
el propietario cambia sitio o categorías. Nuevas revisiones siguen necesitando aprobación.
No se inventaron precios, audiencia o alcance: los campos desconocidos se dejan vacíos
y la ficha informa que falta detalle. Al editar, completar los campos requeridos.


## 16. Capturas, información pendiente e inicio adaptativo (entrega vigente)

### Contratos y rutas

- `SolutionData` añade `demoUrl` (500), `notFor` (500) y `screenshots` (hasta cuatro
  `{id,caption}` únicos). UUID v4; descripción hasta 180 caracteres, mínimo tres
  al enviar. Se conservan modelos anteriores sin estos campos. No obligar a subir
  capturas o demo para publicar una ficha con los campos básicos válidos.
- `solutionErrors` valida demos HTTP(S) sin credenciales; el servidor nunca descarga
  esa URL. Demo abre otra pestaña con `noopener noreferrer`, sin iframe ni autoplay.
- `SolutionPresentation` es Server Component compartido entre público y preview.
  Público recibe solo `published_data`; preview usa borrador guardado y autorización
  de `getSolution`. No compartir preview como URL pública ni llamarlo autosave.
- Galería cliente recibe solo IDs/descripciones y solución, nunca correo privado.
  Miniaturas, ampliación con diálogo, navegación y Escape. Imágenes completas.
- El revisor ve capturas desde la preview; no añadir autoaprobación por completitud.

### Persistencia y autorización de archivos

- `solution_media` almacena WebP en base64 con FK/cascada a founder_solutions.
  Sharp ya instalado; no hay dependencia ni proveedor nuevo.
- Límites: entrada 2 MiB, 16 MP, JPG/PNG/WebP estáticos; salida WebP calidad 80,
  1600×1200 máximo sin ampliar, 400 KiB. Decodificar y eliminar metadatos; rechazar
  SVG/animación/archivo inválido. 12 archivos por solución, 4 en una ficha.
- POST solo dueño y nunca pending; 30 intentos/hora por cuenta y 60/minuto global.
  Guardar/seleccionar son pasos separados; una subida sola permanece privada.
- GET archivo público solo si está en published_data; dueño siempre; revisor solo
  si no es draft y está referenciado en data. Un upload no seleccionado no es visible
  para revisores. Biblioteca de archivos solo del dueño, sin devolver base64.
- GET responde WebP con `private, no-store` y `nosniff`. Next Image unoptimized
  evita caché pública de imágenes privadas. No cambiar eso sin diseñar permisos.
- DELETE exige dueño/origen; solo fuera de pending y sin referencias en data ni
  published_data. Quitar de la ficha no borra; confirmar borrado explícitamente.
- POST media, PATCH save/submit y DELETE bloquean fila padre en transacción.
  PATCH conserva CAS/version y valida que todos los IDs sean de esa solución.
  Carrera guardar/borrar: una operación falla sin dejar referencias rotas.
- La publicación anterior protege sus imágenes mientras se prepara otra versión.
  Al aprobar se reemplaza snapshot y fecha; las imágenes retiradas dejan de ser
  públicas aunque sigan en la biblioteca del dueño. Nunca borrar primero la versión
  aprobada para luego subir la nueva.

### Guía y fecha

- `solutionChecklist`: nueve bloques de información, no ranking/certificación.
  Permite saltar al paso que falta y abrir preview. Puede marcar bloques opcionales
  pendientes aunque la ficha esté válida para enviar: es deliberado.
- `published_at` se escribe exclusivamente al aprobar editorialmente. Sin backfill
  ficticio para publicaciones antiguas. Guardar/subir no cambia la fecha.
- Inicio sugiere revisar publicaciones con más de 90 días o fecha desconocida.
  Prioriza changes_requested; también incluye otros estados pendientes y lagunas.
  Máximo tres fichas en inicio, resto en Mis soluciones. No caduca fichas ni envía correo.

### Inicio y privacidad

- `dashboard_mode` es preferencia nullable buyer/founder/both, distinta de profile.
  Prioridad: preferencia válida → perfil válido → fundador si tiene soluciones → comprador.
- API POST /api/account/dashboard valida origen/sesión/modo y actualiza solo
  dashboard_mode del usuario autenticado. Límite 100/hora y global 60/minuto.
  No recibir owner_id confiable, no cambiar rol, reviewer ni ownership.
- Server obtiene consultas independientes en paralelo: datos mínimos de perfil,
  contadores propios, tres listas y hasta cuatro contactos recientes por dirección.
  En ambos, ordena las solicitudes juntas y muestra cuatro. Sin notas privadas de
  terceros, nombres de otras cuentas o emails en payload cliente.
- Navegación compartida permite comprar/publicar sin cambiar de cuenta. Inicio
  separado de Mis soluciones; no reintroducir el listado en /account por enlaces antiguos.
- Contadores son inventario real, no métricas de conversión. Solicitudes recientes
  no son mensajes sin leer. No llamar a guardados leads ni avisar a fundadores de ellos.

### Verificación y siguientes límites

37 unitarias, lint, TypeScript y build aislado sin secretos. Prueba opt-in de media
recorre upload → guardar → preview → enviar → revisar → publicar → actualizar,
valida IDs ajenos, privacidad y carrera guardar/borrar. Comprueba modo persistido
sin cambiar perfil/permisos. Regresión de contactos completa pasando al repetir
tras un fallo transitorio de HMR del dev. Usar solo cuentas @example.invalid y
limpiar en finally; no probar con la cuenta real que posee Cord/Flouvia.

Neon con imágenes base64 es una elección acotada del MVP, no hosting definitivo.
Pendientes: storage privado de objetos antes de volumen alto, cuota global por
cuenta, limpieza de archivos abandonados, verificación de identidad/casos y
activación del proveedor de email/Google/worker. Verificación y preferencias
ya están implementadas; ver docs/launch.md. No se implementó video hospedado, verificación
automática de resultados ni recordatorios enviados. No afirmar push/deploy.


### Ancho uniforme y acceso al catálogo

Todas las páginas privadas usan `.account-page`: `w-full max-w-6xl mx-auto`,
24 px de margen interior horizontal y la misma separación vertical que Inicio.
Aplica también a configuración, creación/detalle de soluciones, listas/comparador,
contactos/oportunidades, revisión, preview y errores. No añadir límites de ancho
individuales al contenedor de página. Los párrafos/formularios pueden mantener
anchos legibles dentro de esa estructura; no cambiar marketing o login.
“Explorar catálogo” está en el bloque inferior de la sidebar, justo encima del
menú de cuenta; no entre los enlaces principales. En móvil conserva ese orden.


## 17. Ficha guiada y datos investigados (última ampliación)

El editor ahora muestra 14 preguntas cortas en vez de cuatro páginas extensas.
`src/lib/solutions/questions.ts` define IDs y fases. `step` sigue 0..3 por
compatibilidad; `editor_question` persiste el ID exacto. Migración aditiva
`db/solution-profile.sql` aplicada a la base configurada. API valida ID/fase juntos;
no romper los clientes anteriores sin question, que reanudan por fase.

Una pregunta visible, transición GSAP de 220 ms y respeto a reduced motion. Índice
colapsable y Anterior guardan; Continuar valida lo relevante y persiste. Guardar y
salir admite borrador incompleto. Enter en input y Ctrl/Cmd+Enter en texto avanzan,
pero jamás envían a revisión automáticamente desde el último paso. Validación final
revisa todos los campos y dirige al primero con error. Foco/scroll acompañan al
cambio de pregunta. Estado de red real, sin autosave falso por tecla.

`SolutionData` suma founders (hasta 3: name100/role80/bio400/links4) y projectLinks
(hasta6). Cada enlace tiene label de una lista cerrada y URL<=500. Borradores permiten
campos vacíos; envío requiere nombre si se añadió persona y URLs HTTP(S) sin
credenciales. Descartar propiedades desconocidas, incluidos emails privados o
flags verified. El público revalida URLs. No copiar perfil/avatar privado a la
ficha ni otorgar permisos por la persona declarada. Pedir autorización al compartir
información de colaboradores. Foto pública de fundador no está implementada.

Presentación pública, preview y revisión incluyen creadores/redes de forma separada;
solo aparecen públicamente al aprobar. La guía ahora tiene nueve bloques, no ocho:
se añadió creadores y presencia pública. Completitud sigue sin equivaler a calidad.

Cord/Flouvia fueron enriquecidos por solicitud expresa del propietario con fuentes
oficiales. Archivo de copy público `docs/research/cord-flouvia-profiles.json` y
trazabilidad `docs/research/cord-flouvia-sources.md`. Se actualizaron solo sus dos
borradores mediante CAS, con evento, `editor_question=review` y fase3. Publicaciones
previas, fechas, IDs, ownership y capturas existentes intactos. No autoaprobar ni
reaplicar ese JSON como seed. El backup previo privado está fuera del repo; no subirlo.

Dominio operativo corroborado: cordhq.app; crdhq.app no fue accesible. Se revisaron
sitios, condiciones de precios, integraciones y demo; no se certificó funcionamiento
real de todas sus promesas. Perfil público de Andre Valle en Product Hunt, enlazado
desde Cord, declara ambos proyectos; se añadió ese enlace, no redes adivinadas.
Pendientes capturas auténticas y enlaces personales adicionales que confirme el dueño;
Flouvia tiene enlace de casos, no se inventó una demo interactiva.

Verificación: 37 unitarias y la integración de media/dashboard ampliada con validación
question/fase, persistencia y creadores/redes publicados. Contratos y verificación
visual del formulario se registran en docs/guided-solution-form.md. Sin push/deploy.

### Inicio sin métricas vacías y listas visuales — 30 agosto 2026

Preferencia explícita del usuario: menos texto, eliminar widgets numéricos grandes y
párrafos de propósito del home; listas inspiradas en tableros de Pinterest, con la
estética actual. Esta actualización sustituye la presentación del home descrita arriba.

- `/account`: solo saludo y selector de vista en header. Fundador: hasta cinco
  proyectos recientes con portada, status y una indicación breve, más Postular.
  Comprador: dos listas recientes + crear, hasta tres guardados. Actividad reciente
  solo si hay solicitudes reales. Sin contadores grandes, "A tu ritmo" ni explicaciones
  vacías. `dashboardData` solo consulta perfil y actividad; no cargar contadores sin uso.
- `/account/lists`: `BoardGallery`, búsqueda por nombre, mosaicos automáticos de hasta
  tres proyectos, nombre/cantidad/privacidad; `CreateBoard` abre formulario en diálogo.
- `/account/lists/[id]`: `ProjectPin`, selector visual `AddSavedToList` con búsqueda,
  notas plegadas, edición de lista y comparación existente. No borrar notas ni cambiar
  sus límites. Acciones destructivas conservan confirmación.
- `/account/saved`: tarjetas visuales; `ListMembership` abre selector de listas,
  muestra asociaciones existentes y permite crear + guardar sin salir de la página.
- Componentes nuevos: `library/board-gallery.tsx`, `library/project-cover.tsx`,
  `library/project-pin.tsx`, `library/library-dialog.tsx`. Diálogo nativo con Escape,
  foco contenido/restaurado, maxaltura con scroll y animación de 180 ms desactivada
  al preferir movimiento reducido. Selectores con estados pendientes, errores y
  confirmación accesible; bloqueo de doble envío.
- `BuyerProject.image` es opcional. `getBoards(owner)` combina listas del propietario
  con las tres asociaciones más recientes por lista (orden estable). Las cubiertas
  resuelven EXCLUSIVAMENTE `published_data.screenshots[0]`, con fallback al OG estático
  para Cord/Flouvia. Nunca usar `data` para un tablero comprador. Sin imagen se muestra
  nombre/tono, no una captura inventada. Las notas no se serializan en BoardGallery.
- `getOwnedSolutions` incluye `catalog_key` opcional para resolver OG del propio
  proyecto en Inicio; las capturas privadas del fundador siguen protegidas por sesión.
- Crear lista desde Organizar y añadir proyecto son dos operaciones idempotentes,
  no una transacción: error parcial indica que la lista ya se creó y ofrece reintento
  desde el selector. Conservar esta honestidad si se cambia la interacción.
- No nuevas tablas/migraciones, permisos ni seed. No tableros públicos, drag & drop,
  colaboración, carga de portadas de comprador o integración Pinterest en esta entrega.

Verificación: 37 unitarias, lint/TypeScript/build aislado correctos; media/dashboard
comprueba cover aprobado frente a reemplazo privado, aislamiento de listas y modos;
contactos/comparador conserva sus pruebas. Navegador con fixture temporal para crear,
añadir y organizar. No se modificaron borradores/publicaciones reales, no push/deploy.
Detalles y límites vigentes: docs/buyer-library.md y docs/media-dashboard.md.

### Ampliación del inicio y filtros — 30 agosto 2026

- Portadas de listas: cuatro celdas iguales 2 × 2 SIEMPRE; si faltan proyectos, dejar
  espacios vacíos. `getBoards` ahora trae hasta cuatro asociaciones; no repetir imagen
  ni estirar una sola portada. Sustituye la indicación anterior de tres portadas.
- Inicio añade `NextActions`: Para avanzar con tareas derivadas de fichas propias
  (comentarios primero; no sugerir edición durante pending), guardados sin organizar
  y listas con al menos dos proyectos disponibles en portada para comparar. A mano
  enlaza oportunidades/contactos según vista y perfil. `ExploreNeeds` conecta cinco
  categorías a la búsqueda real del catálogo (`/?q=…#catalogo`). Sin números grandes,
  tarjetas vacías de actividad ni datos inventados; conservar saludo y contenido visual.
- Guardados usa `SavedGallery` + filtro puro en `lib/library/filters.ts`: búsqueda por
  palabras normalizadas sin acentos, tipo, todas las categorías del proyecto, lista/
  sin organizar, orden reciente/antiguo/A–Z. Intersección de filtros y reset visible.
  `?list=none` y `?list=ID_PROPIO` permiten abrir un filtro desde Inicio. Resto de
  filtros locales; no persistencia de preferencias ni llamadas por tecla. No pasar
  notas privadas al componente, solo pertenencias de lista y metadatos publicados.
- Sin esquema nuevo ni cambios en ownership/publicación. 39 unitarias (dos nuevas
  de filtros), lint/TypeScript y compilación aislada. Ver docs/buyer-library.md.

## 18. Entrega de lanzamiento — 31 agosto 2026 (vigente)

Contrato completo: docs/launch.md. Actualiza los límites de las entregas históricas.

Rutas añadidas: /account/notifications, /account/settings/notifications,
/account/metrics, /account/solutions/[id]/trust, /account/review/reports,
/verify-email; APIs /api/notifications, /api/account/verification,
/api/account/google, /api/auth/google/start, /api/auth/google/callback,
/api/solutions/[id]/domain, /api/reports, /api/metrics, /api/internal/mail, /api/health.

Tablas: notification_preferences, account_notifications, auth_email_verifications,
solution_domain_proofs, solution_reports, solution_daily_metrics,
auth_google_identities, auth_google_states; auth_accounts.email_verified_at.
Triggers de eventos crean avisos atómicos sin notificar guardados ni notas.
Publicaciones anteriores no se backfillean automáticamente como avisos nuevos.

Seguridad:
- JWT Google RS256, issuer/audience/azp/nonce y exp/iat/sub/email obligatorios.
- No vincular por email; subject único. PKCE y cookie/state hash de diez minutos.
- Reautenticación y cuenta bloqueada serializan operaciones de vinculación/sesión.
- Verificación por fragmento, consumo concurrente produce un éxito y un rechazo.
- TXT prueba control del host exacto, no identidad legal. Revalidar a los 90 días.
- Reportes requieren cuenta y revisor explícito ajeno al propietario/reportante.
  Resolver por versión; retirar quita snapshot público, conserva borrador.
- Consulta de ficha pública resta contactEmail ANTES de renderizar componentes,
  incluidos metadatos de depuración RSC de React 19. No basta ocultarlo en HTML visible.
- Métricas omiten propietario autenticado y DNT/GPC; agregadas, no visitas únicas.
- Worker con secreto, lease/reintentos e idempotencia. No afirmar entrega sin proveedor.

Validación final: unitarias, lint/tipos, integración de lanzamiento/contactos/media y
build aislado sin credenciales. Se corrigieron ambigüedad SQL al resolver reportes,
compatibilidad ESM del config Tailwind, exposición del correo en props RSC de dev
y lectura idempotente de fragmentos de verificación/reset en Strict Mode.
Browser con cuenta temporal: acceso, confirmación de email, restablecimiento de
contraseña, avisos, preferencias, métricas y navegación móvil; cuentas de
prueba eliminadas. Cero vulnerabilidades de producción según audit actual; cuatro
moderadas de herramientas de desarrollo. CI remoto y OAuth/correo reales no probados.

Pendientes operativos: credenciales Resend y Google, origen HTTPS, CRON_SECRET y
scheduler, proyecto shwcs en Vercel, responsable editorial y políticas legales
completas. /privacidad y /terminos son borradores noindex hasta revisión. No usar
LAUNCH_LEGAL_REVIEWED como sustituto de la revisión humana. No desplegar en otro
proyecto por ausencia de acceso. Nunca copiar secretos o backups privados al repo.


## 19. Comunidad y listas públicas — entrega 31 agosto 2026

Fuente vigente: `docs/community-lists.md`. Sustituye las menciones históricas a
«no hay listas públicas». Las notas y el propósito personal siguen privados.

- `/comunidad` abre desde el globo inclinado de la navbar, footer y sidebar.
  Tableros 2×2 con huecos vacíos, filtros por categoría, búsqueda, 24 por página.
- `/comunidad/[id]` muestra únicamente título, descripción pública, firma
  declarada, categorías y fichas aprobadas disponibles. Firma no verificada;
  la colección no es aval editorial. No perfiles/correos/IDs de cuenta públicos.
- Creación y edición en Mis listas: privada por defecto, pública opt-in,
  multiselección de categorías, campo de descripción pública separado,
  firma elegida y confirmación explícita de lo compartido.
- Volver a privada o borrar revoca nuevos accesos al enlace; notas permanecen
  salvo la eliminación explícita de la lista. No prometer retirar copias externas.
- Consulta pública con proyección explícita, sin leer propósito/notas/owner/email;
  resuelve fichas con `published_data`, no borradores. Las rutas privadas y el
  comparador siguen restringidos al dueño incluso si la lista es pública.
- Sin caché de servidor en páginas públicas de listas; detalle noindex,follow.
- Migración aditiva `db/public-collections.sql` aplicada a la base configurada;
  script `scripts/migrate-collections.cjs`. Todas las listas existentes privadas.
  Otro entorno/base necesita migración antes del despliegue. No despliegue remoto.
- Biblioteca API mantiene origen/sesión/cuota/versionado. Nuevos campos públicos
  se validan en servidor; ninguna elección de rol da permisos adicionales.
- 46 unitarias; integración de comunidad (dos cuentas temporales, no filtración
  en HTML/RSC, revocación, retirada de ficha, conflictos y permisos) y regresión
  de contactos. Lint, TypeScript y build aislado correctos.
- Pendiente antes de promoción amplia: moderación/reportes de listas. No fingir
  que el moderador de soluciones ya modera colecciones. Sin likes ni comunidad
  ficticia. Seguir, clonar o colaborar quedan para siguientes entregas.


## 20. Cambio de marca — shwcs

El usuario autorizó cambiar todo el nombre a `shwcs` el 31 de agosto de 2026.
Aplicado en navegación, footer, dashboard, acceso/registro, newsletter,
metadatos/títulos de páginas, textos informativos, errores y asuntos de correo.
Nombre del paquete npm y lockfile: `shwcs`. Documentación y textos de investigación
propios actualizados. Logo/isotipo pendiente del usuario; no crear uno provisional.

Se conservan las claves técnicas `showcasemx-session`,
`__Host-showcasemx-session`, `showcasemx_google_state` y el protocolo DNS
`_showcasemx` / `showcasemx-verification=` para no invalidar sesiones,
OAuth en curso o desafíos ya emitidos. Son compatibilidad técnica, no marca
comercial. No renombrar repositorio/carpeta, Vercel, dominio ni remitente verificado
sin configurar su migración. No cambiar datos de identidad ni propietarios.

Los enlaces antiguos de X/LinkedIn se retiraron del footer hasta conocer las
cuentas oficiales nuevas; nunca suponer que @shwcs pertenece al proyecto. Se
conserva el GitHub existente. El dominio definitivo y logo no se han proporcionado.
Las menciones previas a «rebranding pendiente» quedan sustituidas por esta sección.

Verificación del rebranding: 46 pruebas unitarias, lint y TypeScript correctos;
build aislado de producción y revisión de landing/acceso. Se corrigió también
la mención anterior en `evidence` de Flouvia (datos propios y publicación),
con copia previa, control de versión y sin cambiar dueño/estado ni otros campos.
Sin envío de correos, cambio de dominio ni despliegue remoto en esta entrega.

## 21. Búsqueda flotante y microinteracciones — 31 agosto 2026

La búsqueda de la navbar ya **no se extiende a la izquierda dentro de la barra**.
Se abre como cápsula flotante debajo, conservando visible el acceso a Comunidad.
En móvil usa 16 px a cada lado; en escritorio 420 px alineados a la lupa.
Se monta solo abierta, enfoca el input, cierra con Escape/X/fuera y envía al
catálogo existente. No cambiar esta decisión por el comportamiento anterior.

Todas las lupas usan `src/components/icons/search-icon.tsx`, con un gesto CSS
compartido al hover/foco. El mundo usa giro del meridiano sobre eje inclinado
fijo, una vuelta sin bucle; no rotar el SVG completo. Respeta movimiento reducido.
Reglas y duraciones en `docs/design.md` y `src/app/globals.css`.

## 22. Buscadores que se extienden hacia la izquierda

Aclaración vigente: las lupas compactas deben abrir el **campo completo**, con
la estética de la navbar, también dentro de la app. `ExpandingSearch` sustituye
los campos permanentes en Comunidad, Guardados, Mis listas y selectores.
El hero es la única excepción por decisión posterior: barra grande permanente,
lupa estática, placeholder completo y CTA «Encontrar soluciones».
Icono cerrado → cápsula creciendo hacia la izquierda → flecha azul/X.
Texto sin deformaciones; movimiento reducido respetado. Los filtros siguen
funcionando (locales en app; GET y categoría conservada en comunidad).
X/Escape limpian texto y cierran, sin resetear los demás filtros. Primera tecla
Escape dentro de diálogo solo cierra la búsqueda. Navbar sigue flotando debajo,
con revelado horizontal en lugar de desplazamiento vertical.
Ver `docs/design.md` para comportamiento y pruebas. No cambia datos o permisos.

## 23. Capa social de listas — 31 agosto 2026

Fuente vigente: `docs/community-lists.md`. Sustituye en la sección 19 el límite
histórico «sin likes». La actividad es real y empieza en cero; nunca sembrar cifras.

- Comunidad permite ordenar por `Recientes` (creación descendente) o `Populares`:
  `likes × 1 + guardados × 2 + comentarios × 3`, empate por creación descendente.
  El like es la interacción más fácil; guardar expresa intención y comentar aporta
  la señal más costosa. Mantener ese orden salvo nueva decisión explícita.
  No llamarlo tendencia, recomendación editorial ni prueba de calidad.
- Categorías son cápsulas con los cinco tonos de marca: suave inactiva y sólido
  con texto blanco activa. `Todas` usa azul. No regresar a tabs de texto plano.
- `/comunidad/[id]` integra like, guardar lista y comentarios. Like/guardado son
  únicos por cuenta; el propietario no puede interactuar con su propia lista.
  `/account/community` contiene las colecciones guardadas todavía públicas.
- Comentario: sesión y mismo origen obligatorios; alias público 1–60, texto 1–500,
  máximo 10 por hora por cuenta. UUID del cliente + inserción idempotente evita
  duplicados en reintentos. Autor o propietario de la lista pueden borrar.
  Nunca mostrar correo, nombre del perfil, owner_id ni author_id.
- Volver una lista privada revoca detalle, interacción y aparición en guardados.
  La relación guardada puede permanecer en BD, pero la consulta exige pública.
- Migración `db/community-social.sql`, script `migrate-community-social.cjs`, aplicada
  a la base configurada. Otros entornos requieren ambas migraciones de comunidad.
- Validación: 49 unitarias; integración social con tres cuentas temporales comprueba
  auth, autoactividad, atomicidad, idempotencia, privacidad, moderación y revocación.
- Límite: todavía no hay reporte/moderador central para colecciones/comentarios,
  bloqueo, apelaciones, reputación ni defensa sólida ante multicuentas. No promover
  masivamente la función hasta cerrar esa operación. No reutilizar reportes de
  soluciones como si cubrieran automáticamente las listas.

## 24. Espacios disponibles del catálogo — 31 agosto 2026

En navegación normal por categoría, el catálogo conserva una cuadrícula editorial
de nueve lugares. Los lugares sin proyecto real se muestran como tarjetas grises
con borde discontinuo, numeración, texto «Espacio disponible» y enlace directo a
postular en esa categoría. Son llamados a participar, no ejemplos ni proveedores.
No abrir ficha ficticia ni sumar estos lugares al contador de soluciones reales.
En resultados de búsqueda no renderizar espacios vacíos: mostrar únicamente las
coincidencias reales y el estado sin resultados. Animación discreta y compatible
con movimiento reducido.

## 25. Acceso contextual en navbar — 31 agosto 2026

La navbar comercial recibe únicamente un booleano de sesión resuelto por el layout
de servidor. Sin sesión válida: «Entrar» → `/sign-in`. Con sesión válida:
«Ir a mi panel» → `/account`. Mismo copy y destino en escritorio/móvil. No volver
a «Acceso», no consultar sesión desde el cliente y no serializar correo/ID/perfil.
Si almacenamiento falla, la navegación pública conserva «Entrar».

## 26. Filtros visuales de Guardados — 31 agosto 2026

`/account/saved` conserva siempre el título «Guardados.». Debajo, tipo, categoría,
lista y orden son cápsulas con fondo suave y dropdown flotante, siguiendo Comunidad;
no selects nativos grandes. Check marca la opción activa. Tonos: tipo azul, categoría
según taxonomía, lista lavanda y orden terracota. La lupa compacta queda al final.
Solo un dropdown permanece abierto; abrir otro o usar la búsqueda cierra el anterior.
Dejar 24 px visuales entre orden y lupa. No cambiar `filterSaved`: búsqueda,
intersección, orden y limpieza siguen locales.

## 27. Composición de Mis listas — 31 agosto 2026

El header muestra solamente «Mis listas.»; no agregar enlaces sueltos a Comunidad o
Guardados, pues ambos destinos están en la sidebar. Debajo: cápsulas Todas/Privadas/
Públicas a la izquierda; búsqueda compacta + Crear lista agrupados a la derecha.
Tonos azul/lavanda/salvia, misma selección visual que Comunidad. El tile Pinterest
de crear se muestra solo sin búsqueda y en Todas. Con cero resultados, restablecer.

## 28. Sistema unificado de selectores — 31 agosto 2026

Usar `.selector-tabs` y `.selector-tab` para grupos mutuamente excluyentes de la
interfaz: categorías de Comunidad, Todas/Privadas/Públicas, estados de contactos y
oportunidades, Comprador/Fundador/Ambos y Todos/Sin leer. Activo: azul suave
`#E4EBFC`, texto `#365DC4`, peso medio. Inactivo: transparente y stone. Hover del
inactivo: blanco, sombra discreta y presión de 1 px. Foco siempre visible. No volver
a asignar un color distinto a cada pestaña ni añadir X al estado seleccionado.

Para filtros con menú usar `.selector-dropdown-trigger` y `.selector-menu-active`:
predeterminado transparente; filtro aplicado o menú abierto azul. Guardados conserva
un solo dropdown abierto. No aplicar este patrón a categorías editoriales del
catálogo ni a chips de selección múltiple: ahí los cinco tonos siguen comunicando
taxonomía y permiten varias selecciones simultáneas.

`ExpandingSearch` reserva el ancho de `.expanding-search-shell` al abrir. La cápsula
sigue revelándose hacia la izquierda sin cubrir controles vecinos. Guardados usa la
variante `.saved-search` de 340 px, añade 32 px entre orden y búsqueda y no envuelve
la fila desde `xl`; en móvil sí puede bajar para evitar overflow. No regresar a una
cápsula absoluta que se superponga a filtros.

## 29. Disclosures sin marcador nativo — 31 agosto 2026

Todos los `summary` salvo `.selector-dropdown-trigger` reciben el patrón global de
disclosure en `globals.css`: marcador nativo oculto, ancho compacto `fit-content`,
área mínima de 44 px, chevron azul circular a la derecha, superficie blanca y sombra
discreta en hover, texto azul y giro de 180° al abrir. Nunca estirar el summary como
barra del contenedor. Foco visible y `prefers-reduced-motion`. Aplica a reportes,
comparación, métricas, postulaciones, completitud, archivos, listas/notas e índice
del editor. No añadir manualmente triángulos, caracteres ▶/▼ ni otro ChevronDown a
estos summaries. Los filtros ya contienen su icono React y están excluidos para no
duplicarlo.

Los `input[type=checkbox]` visibles usan el patrón global: 20 px, radio 6.4 px,
borde stone y selección azul con check blanco. Foco mediante outline externo y
presión de 1 px; sin apariencia nativa distinta entre navegadores. Excluir `sr-only`
porque esos inputs delegan su representación a labels personalizados.

## 30. Edición flotante de listas — 31 agosto 2026

En `/account/lists/[id]`, «Editar lista» no es un `details` inline. Usar
`EditListPopover`: CTA azul alineado y de la misma altura que «Añadir proyectos»,
con PencilLine y ChevronDown. El `ListForm` vive en tarjeta absoluta de 560 px máximo,
72svh y scroll interno; abrirla no cambia el layout. Cierra con X, Escape o clic fuera,
enfoca el primer campo al abrir y devuelve foco al botón al cerrar. No volver a
insertar el formulario dentro del flujo de la página.

## 31. Acciones globales y campana — 31 agosto 2026

Retirar de la sidebar «Postular solución» y «Avisos». `AccountUtilities`, montado una
sola vez por `account/layout.tsx`, muestra arriba a la derecha dos botones de 44 px:
`+` enlaza a `/account/solutions/new`; campana abre tarjeta flotante. En móvil usar
`top:92px` para no chocar con la navegación; escritorio `top/right:24px`.

El layout consulta solo los diez avisos del propietario autenticado y serializa
id, título, ruta interna, readAt y fecha. Sanitizar href a `/account...`; nunca pasar
owner_id ni correo. El panel muestra punto de no leído, marca individual antes de
navegar, permite marcar todos y enlaza a preferencias. Actualización optimista con
rollback si POST falla. Cierra con X, Escape o clic exterior. No desplaza la página.
`/account/notifications` solo redirige a `/account`; no restaurar la bandeja completa
ni duplicar el acceso en sidebar. Preferencias siguen en Settings.

Feed completo: GET `/api/notifications` requiere sesión, devuelve diez registros,
unreadCount total, hasMore y cursor compuesto `{before,beforeId}`. Orden y paginación
son `(created_at,id) DESC`; validar fecha y UUID. Cliente refresca al abrir y cada 30 s
solo con documento visible/panel cerrado. Incluye skeleton, refresco manual, error,
«Ver anteriores» y rollback de lecturas. El layout obtiene 11 para determinar hasMore;
si la tabla falla, no debe perder nombre/avatar/sidebar. Main reserva `pt-14` móvil.

## 32. Métricas editoriales — 31 agosto 2026

`/account/metrics` usa `MetricsDashboard` y dos consultas reales paralelas: agregado
por proyecto y serie de 30 fechas generada en PostgreSQL, completando días sin eventos
con cero. Métricas permitidas: views, clicks, contact_requests y cocientes derivados.
Resumen sin tarjetas genéricas, gráfica SVG accesible, embudo visita→clic→solicitud,
filas por proyecto y tabla diaria en disclosure. Estado sin proyectos invita a
revisar publicaciones, sin KPIs vacíos.

No llamar a estas cifras usuarios únicos, leads calificados, ventas, ingresos o ROI.
No crear score/ranking editorial. CTR = clicks/views; paso a contacto = requests/views;
denominador cero produce 0%. Mantener aclaración sobre eventos, DNT/GPC, bloqueadores
y privacidad de biblioteca. Scroll solo dentro de gráfica/tabla en móvil.

## 33. Curvas interactivas de métricas — 31 agosto 2026

La actividad de `/account/metrics` usa un componente cliente aislado sobre la serie
diaria real calculada en servidor. Visitas se dibuja como curva azul continua con
área azul de baja opacidad; clics como curva salvia segmentada. Ambas comparten el
mismo eje y máximo. La curva usa interpolación visual, pero los puntos y el tooltip
conservan exactamente los enteros recibidos: no suavizar, promediar ni desplazar los
datos. Si dos series coinciden, el patrón segmentado permite distinguirlas sin
inventar separación.

Pointer muestra guía vertical, dos puntos y tarjeta con fecha, visitas y clics. Con
teclado, foco activa el último día y flechas/Home/End recorren la serie; anunciar el
valor con `aria-live`. En móvil, la gráfica tiene scroll local y acepta gesto vertical.
No añadir animaciones continuas ni transiciones que contradigan movimiento reducido.

## 34. Dominio, Recursos y contacto — 31 agosto 2026

- Dominio público canónico: `https://shwcs.site`. `metadataBase` y Open Graph usan
  ese origen. `AUTH_APP_ORIGIN` debe coincidir exactamente en producción.
- Navbar comercial: `Recursos` es un megamenú del mismo nivel que compradores y
  fundadores. Contiene El Proyecto, Blog, Changelog y Contacto. El Proyecto ya no
  debe aparecer como enlace principal separado. Móvil replica el mismo acordeón.
- `/blog` y `/changelog` existen como superficies editoriales honestas. No publicar
  artículos, fechas, lanzamientos o promesas inventadas; el changelog registra solo
  comportamiento disponible.
- `/contacto` usa `contacto@shwcs.site` como canal principal y muestra
  `hola@shwcs.site` como conversación general. El footer pone `hola@shwcs.site →`
  debajo de la descripción de marca y enlaza a `/contacto`; no convertirlo en CTA.
- `ops.shwcs.site` es el backoffice de revisión, moderación, cuentas y operación,
  implementado como app Next.js independiente en `ops/` (proyecto Vercel `shwcs-ops`).
  Ver §44. No enlazarlo desde la navegación pública ni tratar un perfil founder/buyer
  como permiso operativo: el acceso depende exclusivamente de `solution_reviewers`.
- `.env.local` quedó con remitente `shwcs <hola@shwcs.site>` y origen canónico, sin
  versionar secretos. La clave Resend ya existía. Esto no acredita entrega real ni
  replica variables en Vercel.

## 35. Wordmark oficial — 31 agosto 2026

Los archivos entregados por el propietario viven en `public/brand/source/` con
nombres normalizados. El wordmark activo es **shwcs logo 1.png**, no su SVG ni las
variantes 2. `public/brand/shwcs-logo-1.png` es una copia optimizada del mismo PNG:
solo recorta transparencia exterior; no cambia color, proporción ni dibujo.

Renderizarlo siempre mediante `BrandLink`. Variante `navbar`: 21 px de alto;
predeterminada: 26 px. Ancho automático, texto alternativo vacío porque el enlace ya
tiene `aria-label`, y foco azul visible. Navbar comercial, footer, auth, sidebar y
navbar móvil/privada comparten ese componente. No volver a escribir «shwcs» como
wordmark con una fuente ni usar el logo cuadrado anterior.

## 36. Contacto partido y formulario Typeform — 31 agosto 2026

`/contacto` usa el route group `(contact)` y no hereda navbar ni footer comercial:
es una sola pantalla dedicada. Izquierda: superficie plana azul sólido `#365DC4`,
sin figuras decorativas, wordmark blanco `shwcs-logo-white.png`, propuesta de
contacto, garantías operativas y correo. En escritorio imita la sidebar privada:
pegada al borde izquierdo, margen vertical de 24 px, lado izquierdo recto y esquinas
derechas de 28 px. La columna derecha tiene su propio scroll si el viewport es bajo.
En móvil el panel se vuelve encabezado con margen. `ContactForm` vive directamente
sobre el fondo, sin tarjeta contenedora.

Cuatro pasos: 1) motivo; 2) nombre/correo/empresa/rol; 3) mensaje/sitio/momento;
4) resumen y consentimiento. Motivos y urgencias vienen de
`src/lib/contact-inquiry.ts`; cliente y servidor comparten las mismas opciones.
Validar cada paso, conservar respuestas al volver, enfocar el título nuevo y respetar
movimiento reducido. Opción elegida muestra check azul/blanco. En motivo, A–F elige;
Enter avanza en todos los pasos. En textarea, Enter avanza y Shift+Enter crea línea.
Confirmación solo después de respuesta `ok` del servidor.

POST `/api/contact`: mismo origen, JSON máximo 12 KB, honeypot, límites de longitud,
URL http(s), consentimiento obligatorio y rate limit hash por correo+origen técnico.
Guardar primero en `contact_inquiries`; luego enviar por Resend a `CONTACT_EMAIL_TO`
o `contacto@shwcs.site`, con reply-to del remitente e idempotencia basada en UUID.
Si Resend falla, conservar el registro y marcar `failed` o `unavailable`. Si Neon
falla, devolver 503 y mantener las respuestas en cliente. No crear suscripción al
newsletter ni guardar IP en la tabla de mensajes.

Migración aditiva `db/contact-inquiries.sql`, aplicada a la conexión local configurada.
Otra base/preview/producción debe aplicarla explícitamente. La retención y operación
de mensajes pendientes/fallidos debe definirse antes del lanzamiento general.

## 37. Encabezados y títulos sin punto final — 1 septiembre 2026

Nunca agregar un punto final (`.`) a los títulos, encabezados principales (H1, H2, hero sections, labels de cards) ni textos de tamaño `text-5xl` o superior en ninguna parte de la aplicación. Esta es una decisión de estilo estricta; los encabezados deben quedar limpios, sin puntuación de cierre, para mantener un formato editorial y moderno en todo el proyecto.

## 38. Páginas editoriales dinámicas — 1 septiembre 2026

La ruta `[info]/page.tsx` maneja las páginas informativas del sitio, pero usa componentes distintos según la intención estética:
- `/terminos`, `/privacidad`, `/cookies`: Usan `LegalStory` (layout de barra lateral "sticky").
- `/faq`: Usa `FaqStory` (layout de acordeones y diseño de tarjetas divididas).
- `/el-proyecto`: Usa `ProjectStory` (tarjetas gigantes).
- `/changelog`: Usa `ChangelogStory` (lista de versiones interactiva).
- `/proceso`: Usa `ProcesoStory` (layout de pasos numerados enormes y tarjetas a color).
- `/criterios`: Usa `CriteriosStory` (grid de principios a color).

## 39. Acordeón de pasos interactivo (StepsAccordion) — 1 septiembre 2026

La sección de "Cómo funciona shwcs para ti" en el Home (`/`) implementa un acordeón horizontal fluido mediante `src/components/ui/steps-accordion.tsx`.
- **Estética Editorial:** Utiliza 5 pasos inspirados en el flujo de publicación de fundadores, usando fondos apastelados (azul, verde, morado, ámbar, terracota) y textos en su versión oscura de la misma paleta. Los números son enormes, ocupan gran parte del espacio y mantienen el tono ligero.
- **Responsividad CSS Nativa:** El layout no usa JS ni librerías de terceros (como Framer Motion `layout`) para calcular los anchos. Utiliza flexbox nativo (`flex-grow: 5` para activo, `flex-grow: 1` para inactivo) combinado con `transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]` para un efecto de expansión/contracción sumamente elegante y de alto rendimiento.
- **Mobile First:** En dispositivos móviles (`flex-col`), se comporta como un acordeón vertical donde las tarjetas inactivas se apilan horizontalmente mostrando el título a lo largo. En pantallas de escritorio (`lg:flex-row`), se comportan como paneles estrechos con texto vertical (`writing-mode: vertical-rl; transform: rotate(180deg)`).
- Nunca romper las restricciones de diseño: Se deben respetar las paletas predefinidas y la tipografía editorial, sin inventar animaciones estridentes.

## 40. Paginación de colecciones (Blog) — 1 septiembre 2026

Toda paginación (como la implementada en `/blog`) debe cumplir con los siguientes lineamientos de UI y UX:
- **Estética:** Todos los controles interactivos de paginación (botones "Anterior"/"Siguiente" y el número de página activo) deben utilizar el estilo primario de la marca a través de `style={actionButtonStyle}` (importado de `@/lib/brand-colors`) y la clase `action-button`. Esto garantiza el fondo azul pastel (`#E4EBFC`) con texto azul profundo (`#365DC4`) consistente con el botón de "Suscribirse" en la barra de navegación.
- **Formato:** Los botones de navegación deben ser píldoras (`rounded-full`) con íconos `ArrowLeft` / `ArrowRight`. Los números inactivos son círculos de solo texto que cambian de fondo en hover (`hover:bg-stone-100`).
- **UX (Auto-Scroll):** Al hacer clic en cualquier control de página, el cliente debe hacer scroll suave (`scrollIntoView({ behavior: 'smooth', block: 'start' })`) hacia el ancla superior de la lista de elementos (`#blog-posts-top` con `scroll-mt-24` o similar) para que el usuario no se quede atrapado en el footer de la página anterior.
- **Manejo de estados:** Se utilizan puntos suspensivos (`...`) inactivos cuando la cantidad de páginas supera 5, colapsando lógicamente los elementos para no quebrar el layout horizontal.

## 41. Arquitectura de Filtros Segmentados en el Catálogo — 1 septiembre 2026

Los filtros del catálogo se generan dinámicamente según el contexto (ruta) en el que se encuentre el usuario, para evitar mostrar filtros irrelevantes:
- **En `/explorar/[slug]` (Problemas Operativos):** Si el usuario busca soluciones a un problema (ej. Cobranza), el sistema ofrece filtros ortogonales como "Industria específica", "Tamaño de empresa" y "Formato de solución" (SaaS/Agencia).
- **En `/industria/[slug]` (Sectores):** Si el usuario ya está explorando una industria (ej. Retail), se le ofrecen filtros complementarios como "Casos de uso" (Cobros, Nómina) y "Tamaño de empresa".
- **Implementación:** La lógica reside en `CategoryPageLayout` mediante un `useMemo` que evalúa el `basePath` y retorna una matriz de configuración de filtros basada en la taxonomía estandarizada, procesándolos mediante `useSearchParams` de Next.js en el componente cliente `CatalogFilterBar`.

## 42. Estado operativo vigente — 2 septiembre 2026

Esta sección sustituye notas históricas que indiquen que Resend, la baja del
newsletter, el cron o el isotipo siguen pendientes.

- `npm run verify:resend` confirma que Resend acepta la clave configurada y que el
  dominio de `AUTH_EMAIL_FROM` está verificado. Falta únicamente una prueba humana
  de recepción desde el despliegue de producción.
- El newsletter guarda consentimiento y segmentos en Neon y cuenta con baja firmada
  mediante `NEWSLETTER_UNSUBSCRIBE_SECRET`, endpoint y página de confirmación.
  Campañas, plantillas, webhooks de rebote/queja y double opt-in siguen pendientes.
- `CRON_SECRET` protege monitor y worker. En Vercel Hobby se mantienen dos crons
  diarios: monitor `0 14 * * *` y correo `15 14 * * *`. El worker procesa hasta 25
  avisos y tiene `maxDuration=300`; al subir de plan se puede cambiar solo el schedule.
- `NEXT_PUBLIC_SHOW_DEMO_PROJECTS` solo muestra ejemplos cuando vale exactamente
  `true`; ausente o `false` los oculta. No es obligatorio crearla si el panel de
  Vercel no permite editarla.
- `public/brand/source/iconologo.png` conserva el isotipo 1000×1000 entregado por el
  usuario. Sus derivados incluyen favicon ICO, PNG 16/32/48, Apple touch 180, PWA
  192/512, iconos automáticos de Next y `manifest.webmanifest`.
- Verificación actual: 54/54 pruebas unitarias, TypeScript y build de producción
  correctos. Google OAuth, campañas del newsletter, responsable editorial y revisión
  legal completa siguen siendo pendientes independientes.

## 42. Páginas legales LAUNCH_LEGAL_REVIEWED — 2 septiembre 2026

Las políticas de privacidad, términos y cookies en `src/app/[locale]/(marketing)/[info]/page.tsx` están marcadas como revisadas y completas para lanzamiento. El preflight `LAUNCH_LEGAL_REVIEWED` puede considerarse cumplido. Puntos clave cubiertos:

### Newsletter (sección "Newsletter y comunicaciones por correo electrónico"):
- **Responsable:** shwcs (hola@shwcs.site)
- **Finalidad:** actualizaciones editoriales del catálogo, sin publicidad de terceros
- **Base legal:** consentimiento explícito (versión `newsletter-v2` registrada en BD)
- **Datos tratados:** solo correo + rol/sector (voluntarios)
- **Conservación:** mientras la suscripción esté activa; historial de consentimientos retenido por auditoría; supresión completa a petición vía hola@shwcs.site
- **Subprocesador:** Resend (resend.com), EU-US Data Privacy Framework, solo recibe destinatario + contenido del mensaje
- **Baja:** enlace al pie de cada correo O correo a hola@shwcs.site asunto "Baja newsletter", máximo 48h hábiles
- **Retiro de consentimiento:** por cualquiera de las vías anteriores

### Cookies:
- Solo cookies técnicas de sesión (HttpOnly, SameSite=Lax, Secure)
- Sin cookies analíticas, sin píxeles, sin retargeting
- Métricas mediante hashes irreversibles del lado del servidor

### Derechos ARCO:
- Acceso, Rectificación, Cancelación, Oposición (LFPDPPP)
- Portabilidad, limitación, derecho al olvido (GDPR)
- Canal: hola@shwcs.site — 20 días hábiles de respuesta
- Autoridades: INAI (México), autoridad de control del Estado miembro (UE)

## 43. Rediseño de configuración (Estética de Tarjetas) — 2 septiembre 2026

Todas las páginas dentro de `/account/settings/*` (Seguridad, Cuentas Vinculadas, etc.) implementan un diseño estricto basado en "tarjetas" (`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm`). Se prohíbe dejar elementos de formulario o textos flotando directamente sobre el fondo gris de la página. 
- La arquitectura asegura que los campos de confirmación de contraseña (como en la vinculación de Google) se mantengan ocultos inicialmente para mantener la tarjeta limpia, desplegándose de manera elegante solo cuando el usuario requiere realizar la acción.
- Los botones de toggle interactivos y botones de "submit" adyacentes deben estar encapsulados en contenedores flex horizontales o verticales adecuados (`flex flex-col-reverse sm:flex-row`) para evitar el solapamiento que causaban las clases de margen verticales como `space-y-*` en elementos *inline* y de posición absoluta.

## 44. Backoffice de operaciones (`ops/`) — 2 septiembre 2026

App Next.js independiente en `ops/` (proyecto Vercel `shwcs-ops`, dominio previsto
`ops.shwcs.site`), con su propio `package.json`, `.next` y despliegue. Comparte la
misma base Neon que el producto pero **no comparte identidad de sesión** con él.

### Identidad y acceso

- Autorización: pertenencia activa (`disabled_at IS NULL`) en `solution_reviewers`,
  con `level` en `('reviewer','admin')`. Sin nivel implícito por perfil/rol del producto.
- TOTP obligatorio para toda cuenta de ops, con 10 códigos de respaldo de un solo uso.
  Login en dos pasos: `POST /api/auth/login` valida contraseña y crea un
  `ops_login_challenge` de 5 minutos (nunca una sesión); `POST /api/auth/totp` consume
  el código; `POST /api/auth/enroll` atiende el alta inicial (`/login/enroll`) y crea
  la sesión al confirmar. `totp_last_step` impide reutilizar un código dentro de la
  ventana. `OPS_TOTP_KEY` (32 bytes hex) cifra el secreto en reposo (AES-256-GCM);
  sin esa variable la app no puede validar códigos.
- Sesiones propias en `ops_sessions` (no `auth_sessions`), cookie `ops-session`
  (`__Host-` en producción), 8 horas. Una sesión de producto nunca abre ops y viceversa.
- Revocar sesiones desde el drawer de cuenta borra `auth_sessions` **y** `ops_sessions`
  de esa cuenta. Suspender una cuenta (`auth_accounts.suspended_at`) bloquea su login
  en el producto y revoca ambas tablas de sesión; reactivar limpia esas columnas.
- Alta: `scripts/add-reviewer.cjs <email>` (nivel `reviewer`) o
  `scripts/promote-ops-admin.cjs <email>` (nivel `admin`), sobre una cuenta ya
  registrada en el producto. Ninguna alta es automática por perfil o rol.

### Alcance de datos

Ops ve cuentas, perfiles, fichas (borrador y publicada), capturas, reportes,
dominios, métricas, listas públicas, comentarios y newsletter completos, más
METADATOS de contacto (destinatario, proyecto, estado, fechas). **Nunca** consulta
`buyer_list_items.note`, `buyer_lists.purpose`, `contact_requests.details` ni
`contact_events.message`: son las notas y el propósito personal del comprador y el
contenido de sus solicitudes, y permanecen fuera del backoffice. No añadir esas
columnas a ninguna consulta de `ops/` sin decisión explícita del usuario.

### Acciones y auditoría

`ops_audit_log` registra cada mutación (actor, acción, sujeto, motivo obligatorio
≥10 caracteres, metadata, IP). Es de solo inserción; no se borran filas al eliminar
cuentas de prueba. `solution_events.actor_id` registra quién decidió cada revisión,
incluida una autorrevisión: `POST /api/review` ya no exige `owner_id<>account.id`
(ver §48; decisión explícita del 3 de septiembre de 2026, sustituye la prohibición
histórica). `POST /api/reports` sigue bloqueando resolver un reporte que uno mismo
presentó (`reporter_id IS DISTINCT FROM`) — es una guarda distinta, sin tocar.
Solo `level='admin'` accede a `/panel/equipo`, `/panel/bitacora` y a suspender,
despublicar o verificar cuentas; nadie puede quitarse a sí mismo el último `admin`
ni auto-suspenderse/revocarse. `despublicar todo` retira `published_data` de sus
fichas y vuelve privadas sus listas públicas, sin suspender la cuenta.

### Verificación

`RUN_OPS_INTEGRATION=1 OPS_PORT=<puerto> node tests/integration/ops.cjs` recorre
login/TOTP/enrolamiento, aislamiento de sesión producto↔ops, auto-revisión bloqueada,
publicación con `actor_id`, permisos revisor/admin, guarda del último admin, frontera
de privacidad y todas las superficies del panel, con cuentas `@example.invalid`
desechables. No usar la cuenta real dueña de Cord/Flouvia para probar. Pendiente:
credenciales de Vercel para el proyecto `shwcs-ops` y revisión legal del nuevo dominio.

## 45. Producción real y estado corregido — 3 septiembre 2026

Con acceso confirmado al proyecto Vercel correcto (`mxfounders/shwcs` y
`mxfounders/shwcs-ops`, dominios `shwcs.site`/`ops.shwcs.site` ya desplegados),
se auditó y corrigió: las variables de entorno de Production/Preview de `shwcs`
estaban en cadena vacía (detalle completo en `docs/operations.md`), y
`db/ops-console.sql` no estaba aplicada en `shwcs_production`. Ambos corregidos
y redeployados el 3 de septiembre; verificado en vivo tras el redeploy.

**Estado real de `shwcs_production` a esa fecha, distinto de lo que sugerían
notas históricas de este documento**: una sola cuenta (`hola@shwcs.site`,
ahora admin de ops ahí) y una sola solución, "Cord", en estado `pending`,
**nunca publicada**, sin `catalog_key` asignado. Flouvia no existe como fila.
Nadie más se ha registrado. Las menciones previas a "Cord y Flouvia ya
publicados, versiones 8 y 2" describían el estado de una base de desarrollo,
no el de producción; no repetir esa afirmación como si fuera el estado en vivo.
Publicar/asignar `catalog_key` a Cord o crear Flouvia en producción sigue
pendiente de una acción explícita del propietario, igual que antes.

Dos bases Neon reales en el mismo host: `neondb` (desarrollo, rol
`neondb_owner`) y `shwcs_production` (real, rol de aplicación
`shwcs_app_production` sin permisos DDL — usar `neondb_owner` con la base
`/shwcs_production` solo para migraciones, nunca en runtime). `shwcs-ops`
usa `NEON_DATABASE_URL` propia apuntando a `shwcs_production`, ya no depende
del enlace cruzado `shwcs_POSTGRES_URL` (que apuntaba a `neondb`).

## 46. Capa social en fichas y ranking real del catálogo — 3 septiembre 2026

Fuente vigente: `docs/solution-social.md`. Las fichas de solución ganan like y
comentarios, espejo exacto del patrón ya probado en listas de comunidad
(`db/community-social.sql`, `src/app/api/community/route.ts`), y el catálogo
deja de ordenarse por prioridad editorial fija.

- `db/solution-social.sql` crea `solution_likes` (clave compuesta
  `solution_id,owner_id`, así de simple es la unicidad) y `solution_comments`
  (`id` lo genera el cliente, así de simple es el reintento idempotente).
  Aplicada a `neondb` y a `shwcs_production` con el rol propietario.
- `POST /api/solutions/social` (`like`, `comment`, `delete-comment`) reutiliza
  `communityComment()` sin cambios y el mismo orden de guardas: origen exacto,
  sesión, `securityLimit('solution-social',...,60)` y
  `securityLimit('solution-comment',...,10)`. El dueño de la ficha no puede
  darle like ni comentar la suya (`owner_id<>account.id` en el CTE), igual que
  ya bloqueaba la auto-revisión.
- **Diferencia deliberada frente a listas**: `delete-comment` solo acepta al
  autor (`author_id=account.id`). El dueño de la ficha **nunca** puede borrar
  un comentario ajeno — la moderación de comentarios en fichas es exclusiva de
  `level='admin'` en ops (`ops/panel/comunidad`, pestaña «Comentarios de
  fichas»), no del fundador. Es intencional: un fundador borrando críticas de
  su propio producto rompe la credibilidad del catálogo.
- El alias del comentario se precarga con `auth_accounts.name` (el mismo
  nombre que ahora captura el onboarding, ver §47) y queda editable en el
  campo; no reintroducir un input vacío como en listas. La regla de §23
  («nunca mostrar correo, nombre del perfil, owner_id ni author_id») sigue
  vigente tal cual para **listas**; en fichas el nombre del perfil sí se
  ofrece como alias inicial porque el usuario lo edita antes de publicarlo —
  la fila guardada sigue siendo un alias declarado, no una referencia viva al
  perfil.
- **Ranking real**: `src/lib/solutions/ranking.ts` exporta
  `solutionScore(likes,saves,comments,views)=likes+saves*2+comments*3+views*0.1`.
  `src/lib/solutions/public.ts` ordena por esa fórmula en SQL (contando
  guardados con la misma doble identidad `solution:UUID`/`catalog:key` que ya
  usa `community.ts`) y expone `likes/saves/comments/views/score` en cada
  producto. El desempate sigue siendo `catalog_key` (Cord, Flouvia, con sitio,
  ejemplo) — ya no el criterio principal. Se explica en la interfaz: disclosure
  «Cómo se ordena» junto al selector de orden de categorías
  (`catalog-filter-bar.tsx`) y sección nueva en `/criterios`
  (`criterios-story.tsx`). Nunca describir el orden como calidad, tendencia o
  aval editorial — es interacción bruta, empieza en cero y es manipulable.
- Se eliminó un número de «popularidad» que estaba **inventado**
  (`nombre.length*15+catalogId.length*5+42`) junto a un ícono de corazón en
  `landing-features.tsx` y duplicado en `landing-stacking-cards.tsx`; ambos
  usan ahora `score`/`likes` reales. El filtro de pestañas de
  `landing-features.tsx` (antes un `return true` incondicional pese a tener
  ramas condicionales) ahora compara contra la taxonomía real de categorías
  con un mapa explícito, editorial, documentado en el propio archivo. El sort
  «Más populares» de `/explorar`, `/industria`, `/colecciones`
  (`category-page-layout.tsx`) estaba sin implementar; ahora ordena por
  `score` real.
- El clic en una ficha real desde el landing (`category-explorer.tsx`) navega
  directo a `/soluciones/[id]` con un `Link`; el modal de vista previa queda
  reservado exclusivamente a los ejemplos estáticos sin `detailUrl`. Las
  tarjetas y espacios disponibles de `landing-features.tsx` que antes eran
  `<div cursor-pointer>` sin `onClick` ni `href` ahora son enlaces reales.
- **No tocado en esta entrega, marcado pendiente**:
  `landing-stacking-cards.tsx` tenía testimonios inventados atribuidos a
  empresas reales (Deel, Kueski, Kavak, Clara) con cifras falsas y funciones
  que no existen (IA de recomendaciones, alertas automáticas de gasto,
  marketplace de expertos verificados). Se retiraron los testimonios y se
  conectaron los dos botones (antes sin `href`) a `#catalogo` y `/criterios`.
  El resto de la copy de esas 4 tarjetas sigue describiendo funciones no
  construidas; el propietario indicó que arriba de esa sección van 3 mockups
  reales (ya alimentados por `products`, ver la fila de favicons antes del
  texto) que cambiarán conforme se suban apps reales, y que el texto debe
  describir esas apps — pendiente de contenido real, no inventar mientras tanto.
- Verificación: 56 unitarias (dos nuevas: pesos de `solutionScore` con el 0.1
  de vistas, y origen/sesión de `/api/solutions/social`), lint, TypeScript y
  build de producción limpios.
  `RUN_SOLUTION_SOCIAL_INTEGRATION=1 node tests/integration/solution-social.cjs`
  con tres cuentas temporales confirma auto-like bloqueado, toggle atómico,
  comentario idempotente, alias público sin correo, y que el dueño de la ficha
  no puede borrar un comentario ajeno. Se corrigió de paso un bug de
  infraestructura preexistente y no relacionado: `tailwind.config.ts` usaba
  `require()` dentro de un archivo `.ts`, lo que tumbaba por completo
  `next dev` (no `next build`) al compilar la primera página bajo Next
  15.5.24; ahora usa `import`.

## 47. Onboarding obligatorio tipo Typeform — 3 septiembre 2026

El registro solo pedía correo y contraseña; `auth_accounts.name` quedaba
`NULL` hasta que alguien entrara manualmente a Configuración. Nuevo flujo en
`/onboarding` (`src/app/[locale]/(focused)/onboarding/`), mismo patrón visual
e interacción que `ContactForm` (`.contact-step`, 220 ms, `key={step}` para
reiniciar la animación, foco en `<h1 tabIndex={-1}>` por paso, atajo de letra
A–F, Enter avanza) — no el patrón GSAP del editor guiado de soluciones.

- Tres pasos, **sin botón de saltar**: 1) nombre y empresa; 2) perfil, las
  cuatro opciones de `newsletterProfiles`; 3) rol, las seis de
  `newsletterRoles`. Un solo envío al final a `PATCH /api/account` (sin tocar
  el endpoint: sigue siendo todo-o-nada) y, si el perfil es
  `founder`/`buyer`/`both`, `POST /api/account/dashboard` — `exploring` no es
  un `DashboardMode` válido y se omite esa llamada a propósito.
- Puerta única en `src/app/[locale]/account/page.tsx`, justo después del
  `Promise.all` que ya trae `dashboardData` (que ya seleccionaba `name`):
  `if(!dashboard.profile.name?.trim())redirect('/onboarding')`. No se tocó
  `authReturnTo`/`return-to.ts`: el onboarding nunca es un destino `next=`, se
  dispara solo al visitar `/account`, porque el registro no inicia sesión
  (siempre hay un login de por medio antes de llegar ahí). Las cuentas de
  Google ya traen `name` desde el callback y saltan el paso 1 sin código
  adicional. `/onboarding` en sí redirige a `/account` si ya hay nombre.
- Verificado funcionalmente con una cuenta `@example.invalid` real: antes del
  onboarding `/account` redirige a `/onboarding`; tras el `PATCH`, `/account`
  saluda por nombre y `/onboarding` redirige de vuelta a `/account`. No hay
  prueba unitaria/integración dedicada porque reutiliza endpoints y
  validadores ya cubiertos (`validateAccount`, `isDashboardMode`); el flujo
  completo se comprobó a mano, no solo por inspección de código.

## 48. Toda la revisión editorial vive en ops — 3 septiembre 2026

Decisión explícita del usuario: «quiero que todas las revisiones sean en ops,
para eso es ops». El producto ya no tiene ninguna superficie de revisión.
Sustituye lo que decían la sección 7 y el §44 sobre el revisor dentro de la app.

- Se retiró de la sidebar «Revisión editorial» y con ello el `isReviewer()` que
  el layout de cuenta consultaba en cada carga. `AccountSidebar` ya no recibe
  la prop `reviewer`.
- `getSolution(id, owner)` perdió el tercer parámetro: una ficha se lee solo si
  `owner_id` coincide. Antes un revisor podía abrir cualquier solución que no
  fuera `draft` desde `/account/solutions/[id]` y su preview.
- `PATCH /api/solutions/[id]` perdió `action:'review'` y `POST /api/reports`
  perdió `action:'review'`; ambas responden 400 «Acción no válida». Crear un
  reporte desde la ficha pública sigue igual: eso lo hace cualquier visitante
  con cuenta, no un revisor.
- `GET /api/solutions/[id]/media/[assetId]` dejó de tener la cláusula que dejaba
  a un revisor ver capturas no publicadas. Ops lee las suyas por
  `ops/api/media/[assetId]`, con su propia sesión.
- `ReportForm` era doble (crear y resolver); quedó solo con la mitad pública.
- Verificado con una cuenta temporal a la que se le dio `level='admin'` en
  `solution_reviewers`: aun así `/account/review` y `/account/review/reports`
  responden 404, la sidebar no menciona la revisión y las dos acciones de API
  devuelven 400. El permiso ya solo sirve para entrar a `ops.shwcs.site`.
- Se eliminaron los archivos que quedaban sin uso: `src/app/[locale]/account/review/`
  (sus dos páginas), `src/components/solutions/review-form.tsx` y
  `src/components/settings/settings-back-link.tsx`, este último sustituido por
  `SettingsNav` (§49). `/account/review` y `/account/review/reports` responden
  404 porque la ruta ya no existe, no por una guarda. No reintroducirlas.

## 49. Configuración con seguridad y control de datos — 3 septiembre 2026

Fuente vigente: `docs/account-settings.md`. Migración `db/account-security.sql`
(aditiva), script `scripts/migrate-account-security.cjs`, aplicada a `neondb` y
a `shwcs_production` con el rol `neondb_owner`. Ninguna cuenta existente cambió.

- Configuración deja de ser un índice de cuatro enlaces. `SettingsNav` fija
  pestañas persistentes (`.selector-tabs`, §28) en las seis secciones, así que
  ya no hay que volver al hub entre una y otra; desapareció `SettingsBackLink`.
  El resumen ahora lee estado real —nombre, foto, correo confirmado, segundo
  factor, sesiones abiertas, Google— y destaca lo que falta, en vez de repetir
  descripciones genéricas. Si la base falla, avisa y no inventa estado.
- **Verificación en dos pasos opcional** (`/account/settings/security`).
  `src/lib/auth/totp.ts` replica el TOTP ya probado en ops —RFC 6238, SHA1,
  30 s, ventana ±1— para que ambas cuentas quepan en la misma app
  autenticadora. El secreto se guarda cifrado con AES-256-GCM bajo
  `AUTH_TOTP_KEY`; sin esa variable la interfaz dice que la función no está
  disponible y **nadie puede activarla**, en lugar de fingir protección.
  Activar y desactivar piden la contraseña otra vez: la cookie de sesión no
  basta. El secreto se marca confirmado solo cuando un código generado con él
  se acepta, así que abandonar el alta a medias no deja a nadie fuera.
  Diez códigos de respaldo de 8 dígitos, de un solo uso, hash SHA-256.
- **Acceso en dos pasos**: si la cuenta tiene segundo factor, `POST /api/auth/login`
  ya **no** crea sesión: escribe `auth_login_challenges` (5 minutos, guarda el
  hash de contraseña del momento) y responde `{step:'totp'}`. `POST /api/auth/totp`
  consume el reto. `totp_last_step` impide repetir un código dentro de su
  ventana; un código de respaldo se elimina con `array_remove` en la misma
  transacción que abre la sesión. Cinco intentos fallidos queman el reto.
  Cambiar la contraseña invalida el reto porque el hash deja de coincidir.
- **Sesiones abiertas**: `auth_sessions` gana `created_at`, `last_seen_at` y
  `user_agent`. **A propósito no hay columna de IP**: el aviso de privacidad
  revisado (§42) se compromete a cookies técnicas de sesión, y una etiqueta de
  dispositivo basta para reconocerla; añadir la dirección sería una categoría
  nueva de dato personal y necesita su propia decisión y su línea en la
  política. `deviceLabel()` deriva algo como «Chrome en macOS», nunca el
  user agent completo. Al cliente solo viaja el hash del token, que identifica
  la fila sin ser usable. La sesión actual no se puede cerrar desde ahí: para
  eso está cerrar sesión.
- **Datos y privacidad** (`/account/settings/data`, ruta nueva): idioma,
  `GET /api/account/export` y eliminación de cuenta. La exportación entrega
  perfil, publicaciones, biblioteca, listas y conversaciones de contacto; nunca
  el hash de la contraseña, el secreto TOTP ni datos privados de terceros.
  El selector de idioma cambia el segmento de locale y **dice la verdad sobre su
  alcance**: catálogo, inicio y páginas informativas están traducidos; la cuenta
  y los correos siguen en español.
- **Eliminar cuenta**: `POST /api/account/delete` exige contraseña **y** escribir
  `ELIMINAR`. La interfaz enumera antes las consecuencias reales contando filas:
  cuántas publicaciones se retiran del catálogo y cuántas conversaciones
  desaparecen —también para la otra persona, porque `contact_requests` cascadea
  por `buyer_id` y por `recipient_id`. No hay borrado suave ni periodo de
  recuperación; si algún día se decide una política de retención, hay que
  construirla ahí y no darla por supuesta.
- Verificación: 62 unitarias (6 nuevas: base32 ida y vuelta, ventana de deriva y
  no repetición del paso TOTP, forma de los códigos de respaldo, contenido del
  URI otpauth, `deviceLabel` sin eco del user agent, y origen/sesión de las tres
  rutas nuevas). Lint y TypeScript limpios. Recorrido completo contra el dev con
  una cuenta `@example.invalid`: alta, seis páginas de configuración, QR real en
  base64, activación solo tras código válido, contraseña sola ya sin sesión,
  código correcto abriendo sesión, respaldo de un solo uso, cierre de las otras
  sesiones conservando la propia, exportación sin contraseña ni secreto,
  desactivación y borrado en cascada. Cuenta eliminada al terminar.
- Pendiente operativo: `AUTH_TOTP_KEY` **no está en Vercel**. Hasta que se
  configure allí, producción muestra la verificación en dos pasos como no
  disponible. No desplegar el código sin haber aplicado antes la migración: el
  login consulta `totp_confirmed_at` (ya aplicada en `shwcs_production`).

## 50. Logos de redes y portada automática del sitio — 3 septiembre 2026

Dos peticiones del usuario sobre la ficha. Detalle de la portada en
`docs/listings.md`.

### Logos de las redes

lucide retiró los iconos de marca, así que `src/components/icons/social-icons.tsx`
dibuja los siete logos como SVG en línea sobre rejilla 24×24 con `currentColor`:
LinkedIn, X, Instagram, YouTube, GitHub, TikTok y Product Hunt. Los cuatro tipos
genéricos de `publicLinkKinds` (Sitio web, Documentación, Precios, Contacto)
siguen usando lucide para no abrir un set paralelo. Se usan en los dos sitios de
la ficha donde había solo texto: los enlaces de cada creador y las cápsulas de
«Sigue al proyecto». El logo acompaña al texto, no lo sustituye: un icono suelto
de «Documentación» o «Precios» no se entiende. Cada glifo es `aria-hidden`; el
nombre accesible lo da el enlace. Antes de darlos por buenos se rasterizaron con
Sharp y se revisaron a ojo, porque un `path` mal copiado se ve como una mancha y
compila igual. Añadir una marca nueva exige repetir esa comprobación visual.

### Portada automática desde el sitio

Al escribir el sitio, la ficha ya tiene imagen: se lee la `og:image` que ese
sitio publica. Funciona **en borrador**, que era el punto de la petición.

- Orden de portada: captura propia → arte local de Cord/Flouvia → `og:image`.
  Aplicado en `/account` (portadas del fundador), `library/server.ts` (guardados
  y listas) y `solutions/public.ts` (catálogo público).
- **Se guarda una copia reencodificada, nunca un enlace remoto**: Sharp la
  normaliza a WebP ≤1200×900 y ≤400 KB en `solution_site_images`. Un `<img>`
  remoto haría que cada visitante pidiera el archivo al servidor de un tercero,
  que es el píxel externo que §42 dice que el sitio no incrusta. No cambiar esto
  por «simplificar» a una URL directa.
- `GET /api/solutions/[id]/site-image` es público solo con la solución publicada;
  en borrador responde únicamente al dueño, para no confirmar que existe un
  borrador en ese UUID. `POST` la busca: dueño, mismo origen, 20 por hora.
  `SiteImageCard` lo intenta una sola vez automáticamente y luego deja un botón;
  no se relee el servidor ajeno en cada visita. El fallo se guarda y se muestra
  con su motivo, no como un hueco.
- Descargar una URL escrita por una persona es SSRF: `src/lib/solutions/site-image.ts`
  valida cada salto —solo http(s), sin credenciales, DNS resuelto y rechazo de
  loopback/privadas/link-local (incluida `169.254.169.254`)/CGNAT y sus
  equivalentes IPv6, máximo tres redirecciones revalidando el host, 6 s y 8 s de
  espera, 512 KB de HTML y 5 MB de imagen. `safeSolutionUrl` ya descartaba antes
  los hosts sin punto, o sea `localhost`. **Límite conocido**: la comprobación de
  DNS es previa a la conexión, así que queda un TOCTOU; está anotado en
  `docs/listings.md` y no se disimula.
- Migración `db/solution-site-image.sql`, script
  `scripts/migrate-solution-site-image.cjs`, aplicada a `neondb` y a
  `shwcs_production`.
- Verificación: 65 unitarias (3 nuevas: rangos privados incluidos IPv4 mapeados,
  lectura de og:image resuelta contra la página e ignorando el body, y
  origen/sesión de la ruta). Recorrido en vivo contra un sitio real
  (`cordhq.app`, og:image 1200×630 → 11 KB WebP) desde un borrador: guardada como
  copia propia, servida como WebP desde nuestro dominio, 404 para anónimos
  mientras es borrador y pública al publicarse; `127.0.0.1`, `localhost` y
  `169.254.169.254` rechazados sin guardar nada. Fichas de prueba eliminadas.

## 51. Autorrevisión permitida en ops — 3 septiembre 2026

Decisión explícita del usuario: «quita lo de que no pueda aceptar las mías».
`POST /api/review` en ops (§44, §48) bloqueaba con `owner_id<>account.id` que
un revisor publicara, rechazara, pidiera cambios o retirara **su propia**
solución. En la práctica esto le impedía al único admin de ops aprobar Cord,
su propia postulación (§45: única cuenta, único proyecto, en `pending`) —
no hay otro revisor que pueda hacerlo por él.

Se quitó esa cláusula de las cuatro transiciones (`publish`, `reject`,
`changes_requested`, `withdraw`). `solution_events.actor_id` sigue registrando
quién decidió, y `ops_audit_log` sigue auditando la acción con motivo
obligatorio; una autorrevisión queda tan trazada como cualquier otra. Esto
**sustituye** la prohibición histórica de autoaprobación de §7 y §44.

No se tocó `POST /api/reports`: resolver un reporte que uno mismo presentó
sigue bloqueado (`reporter_id IS DISTINCT FROM`) porque es una guarda distinta
— moderación de un tercero, no decisión sobre la propia publicación — y no fue
parte de lo pedido. Tampoco se tocó el bloqueo de autolike/autocomentario en
`solution_likes`/`solution_comments` (§46): esa guarda protege que la señal de
interacción sea de otra persona, no del propio fundador, algo que sigue
teniendo sentido incluso con un solo admin.

`tests/integration/ops.cjs` tenía una prueba explícita de que la autorrevisión
se bloqueaba (409); se cambió para afirmar lo contrario (200, con `actor_id`
correcto), en vez de borrarla o dejarla fallando.

## 52. Fase 1 — la navegación deja de trabarse — 3 septiembre 2026

Primera fase de un plan mayor (`/Users/andrevalleortega/.claude/plans/haz-el-plan-para-humble-magpie.md`
en la sesión que lo escribió) sobre navegación, ficha, filtros y ranking. Esta
entrega resuelve solo la causa de que «se traba al picarle a la navbar»:
cuatro causas acumuladas, ninguna requería migrar datos de negocio.

- **Enlaces sin locale.** Todo vive bajo `[locale]`, pero `navigationHref()`
  devolvía hrefs como `/explorar/cobros` sin prefijo; `middleware.ts` los
  redirige 307 a `/es/...`, y Next **descarta** el prefetch de un `<Link>`
  cuyo destino es un redirect. Cada clic era una navegación en frío, no una
  transición. `navigationHref(href, locale)` ahora exige el locale; `Navbar`,
  `Footer` y `BrandLink` lo reciben como prop desde
  `(marketing)/layout.tsx`, que ya lo tenía en `params`. `BrandLink` acepta
  `locale='es'` por defecto porque `/account` no está traducido (§ previas) y
  sus tres usos ahí no necesitan tocarse.
- **Cero `loading.tsx` en toda la app.** Sin límite de Suspense, el App
  Router bloquea la transición hasta que el RSC completo responde: la URL no
  cambiaba y la pantalla quedaba congelada, que es literalmente el síntoma.
  Nuevos: `explorar/[slug]`, `industria/[slug]`, `colecciones/[slug]`,
  `soluciones/[id]`, `comunidad` y `(marketing)` (genérico, para páginas sin
  esqueleto propio como `/blog` o `/criterios`). Esqueletos con
  `animate-pulse motion-reduce:animate-none`, el patrón ya usado en
  `account-utilities.tsx`; nunca un spinner.
- **`publicProducts()` sin caché, con 9 subconsultas correlacionadas por
  fila** (5 en el `SELECT`, las mismas 4 repetidas en el `ORDER BY`).
  Reescrita con CTEs agregadas (`likes`, `comments`, `views`, `saves`, una
  pasada `GROUP BY` cada una) y envuelta en `unstable_cache({tags:['catalog'],
  revalidate:300})`. El `catch` de errores queda **fuera** de la función
  cacheada a propósito: un fallo transitorio nunca se cachea como catálogo
  vacío, se reintenta en la siguiente llamada.
  `CREATE INDEX buyer_saved_projects_key ON buyer_saved_projects(project_key)`
  (`db/catalog-performance.sql`, aplicada a `neondb` y `shwcs_production`):
  el score consultaba por `project_key` solo contra una tabla cuya única
  clave es `(owner_id,project_key)`, así que era un seq scan.
- **`revalidateTag('catalog')`** en los cuatro puntos donde una interacción
  cambia el orden: like/comment/delete-comment
  (`/api/solutions/social`) y save/unsave (`/api/library`). Verificado en
  vivo: dar like a una ficha de prueba la hizo aparecer en
  `/es/explorar/cobros` **sin esperar los 300 s** del TTL de respaldo.
  **Límite conocido, no cerrado en esta fase**: `ops/` es un despliegue de
  Next.js separado con su propia caché; `POST /api/review` (publicar/retirar
  desde el backoffice) no invalida la del producto. Publicar una ficha desde
  ops tarda hasta 5 minutos en aparecer en el catálogo, contra instantáneo
  para like/comentario/guardado hechos desde el propio producto. Cerrarlo
  exigiría un endpoint de revalidación entre apps protegido por secreto; no
  se construyó todavía.
- **Filtros sin round-trip.** Cada cambio de filtro hacía `router.push()` y
  volvía a ejecutar el servidor entero para un filtrado que ya era 100 % en
  cliente. `CategoryPageLayout` pasa a dueño del estado (`useState` inicializado
  desde `useSearchParams()`), `CatalogFilterBar` se vuelve un componente
  controlado (`values`/`onChange`/`onClear`, sin `useRouter` propio), y la
  URL se sincroniza con `window.history.replaceState` — nunca dispara
  navegación ni petición al servidor. Los filtros siguen siendo compartibles
  por URL. **Efecto colateral bueno y no buscado**: al dejar de leer
  `searchParams` en el servidor, las tres rutas de categoría — con
  `generateStaticParams` sobre sus 7+7+4 slugs — pasaron de dinámicas (`ƒ`) a
  **prerrenderizadas (`●`)** en el build. `revalidateTag('catalog')` sigue
  regenerándolas bajo demanda: no es una foto fija del build.
- **Imágenes de fichas publicadas ahora cacheables.** Capturas
  (`/api/solutions/[id]/media/[assetId]`): `public, max-age=3600, immutable`
  cuando el asset está en `published_data.screenshots` — sus bytes no cambian
  nunca, no hay endpoint de reemplazo. Portada del sitio
  (`/api/solutions/[id]/site-image`): `public, max-age=60, s-maxage=3600,
  stale-while-revalidate=86400`, **sin** `immutable` porque el dueño puede
  volver a pedir la og:image en cualquier momento y el mismo URL cambiaría de
  contenido. Ambas rutas conservan `private, no-store` para borradores;
  verificado que una solución retirada a `draft` vuelve a dar 404 sin
  cabecera pública.
- `.no-scrollbar` y `.hide-scrollbar` se usaban en `blog-index.tsx` y
  `catalog-filter-bar.tsx` sin estar definidas en ningún CSS — clases
  muertas, la barra de scroll nativa se veía igual. Definidas en
  `@layer utilities` de `globals.css`.

**Verificación**: 65 unitarias (una corregida:
`navigationHref` ahora exige locale), lint y TypeScript limpios, build de
producción confirma las tres rutas como `●`. Contra el dev: enlace sin locale
sigue en 307 (comportamiento esperado de una URL vieja/externa), el que
genera el navbar ahora es 200 directo; dar like revalida el catálogo al
instante; portada pública vs. borrador con las cabeceras correctas.
Migración `db/catalog-performance.sql` aplicada a `neondb` y a
`shwcs_production` con `neondb_owner`.

**Pendiente, fuera de esta fase** (el plan completo tiene más pasos):
ficha con carrusel de imágenes, taxonomía única con industria/tamaño como
campos declarados, filtros del catálogo rediseñados sobre `.selector-*`
multiselección, filtros de comunidad mejorados, y el ranking difícil de
manipular (verificación de correo, decaimiento temporal, deduplicación de
vistas). Nada de eso se tocó todavía.

## 56. Moderación de listas/comentarios de comunidad y búsqueda con pg_trgm — 4 septiembre 2026

Cierra los dos pendientes marcados en §19/§23 (sin reporte central para listas/
comentarios de comunidad) y §54/§55 (`strpos()` sin índice en la búsqueda de
comunidad). Fuente vigente ampliada: `docs/community-lists.md`.

- **`db/community-reports.sql`**: tabla `community_reports`, espejo de
  `solution_reports` (§7) para la capa de comunidad — `subject_type`
  (`list`|`comment`), `list_id` siempre presente, `comment_id` solo en reportes
  de comentario, `reason` (`spam|abuse|impersonation|other`, distinto del
  enum de soluciones porque el contenido es otro), `status`
  (`open|resolved|dismissed`), `decision`, `reviewer_id`, `version` para
  concurrencia optimista igual que soluciones. Índices parciales únicos por
  `(list_id,reporter_id)` y `(comment_id,reporter_id)` con `status='open'`
  evitan reportes duplicados abiertos; reintentos devuelven 409. Tabla nueva,
  no una reforma de `solution_reports`: sigue la regla de este proyecto de
  migraciones aditivas y no reutiliza una tabla ajena a la forma de
  `founder_solutions`.
- **Corrección encontrada en la verificación en vivo, no en el diseño
  inicial**: `comment_id` se declaró primero `ON DELETE CASCADE`; al tomar la
  decisión "eliminar comentario" (`takedown`) sobre un reporte de comentario,
  el mismo borrado hacía cascada sobre `community_reports` y el reporte que
  acababa de resolverse desaparecía con su historial de decisión. Corregido a
  `ON DELETE SET NULL` (como ya hacían `reporter_id`/`reviewer_id`) y se quitó
  el CHECK que forzaba `comment_id` no nulo para `subject_type='comment'`,
  porque ese CHECK es precisamente lo que impedía conservar el reporte tras
  perder su comentario. Verificado de nuevo en vivo: el reporte de comentario
  queda `resolved` con su `decision` intacta aunque el comentario ya no exista.
- **Producto**: `POST /api/community` gana `action:'report'` junto a
  like/save/comment/delete-comment ya existentes, en vez de una ruta nueva.
  `securityLimit('community-report',cuenta,5)` (5/hora). Excluye
  autorreportes en el mismo INSERT (`owner_id<>cuenta` para listas,
  `author_id<>cuenta` para comentarios), igual que like/save ya excluían
  autointeracción. `communityReport()` y `escapeLikeTerm()` nuevos en
  `community-model.ts`; a diferencia del reporte de soluciones (enum inline
  en la ruta), aquí el validador quedó centralizado.
  `src/components/library/community-report-form.tsx` mirror exacto de
  `ReportForm` (fichas): mismo tono, mismo copy de éxito. En
  `community-actions.tsx`: `<details>Reportar esta lista</details>` (oculto
  para el dueño) y un botón de bandera por comentario, visible solo para
  quien no es su autor — el dueño de la lista ya puede borrar cualquier
  comentario directo (§23) y no necesita reportarlo.
- **Búsqueda**: `db/community-search-trgm.sql` habilita `pg_trgm` y crea un
  índice GIN sobre `(name||' '||public_description||' '||curator_name)`
  filtrado a `visibility='public'`. `getPublicCollections` cambió
  `strpos(...)>0` a `(...) ILIKE '%término%'` con el término escapado
  (`\ % _`) para que un `%`/`_` propio del visitante no actúe como comodín.
  Con el catálogo actual (pocas listas) el planificador sigue prefiriendo un
  seq scan — comportamiento esperado en una tabla pequeña, no un defecto;
  se confirmó forzando `enable_seqscan=off` que el índice sí resuelve la
  expresión. El índice se vuelve determinante según crece la tabla.
- **Ops**: `ops/api/community-reports` (GET paginado por estado, POST con la
  misma cadena CTE versionada que `ops/api/reports` — `resolve`/`dismiss`
  marcan el reporte; `takedown` además pone la lista en privado o borra el
  comentario según `subject_type`). `/panel/reportes` gana un selector
  Fichas/Comunidad sobre las mismas pestañas de estado y el mismo patrón
  expandir-y-decidir; no se creó una página de ops nueva. El KPI "Reportes
  abiertos" de `/panel` ahora suma `solution_reports` y `community_reports`.
  Auditoría con `action:'community_report_${decision}'`. No se tocó el flujo
  de reportes de soluciones (tabla, ruta ni UI) más allá de compartir esa
  página y esa tarjeta del KPI.
- **Migraciones aplicadas solo a la base de desarrollo configurada**
  (`scripts/migrate-community-reports.cjs`,
  `scripts/migrate-community-search-trgm.cjs`), verificado en vivo tras
  aplicar (tabla, índices y extensión existen). **No aplicadas a
  `shwcs_production`**: a diferencia de fases anteriores de este mismo plan
  de catálogo (§52-§55), esta entrega no tocó producción; queda como paso
  explícito pendiente del propietario, igual que el resto de credenciales
  operativas de §12.
- Verificación: 74 unitarias (dos nuevas: `communityReport()` y
  `escapeLikeTerm()`), lint, TypeScript y build de producción aislado
  limpios en ambas apps (`shwcs` y `ops/`). Recorrido en vivo completo contra
  el dev con cuentas `@example.invalid` desechables: creación de lista
  pública + comentario, reporte de lista y de comentario por cuentas
  distintas al dueño/autor, 409 en autorreporte y en reporte duplicado,
  búsqueda por término parcial con y sin coincidencia, sesión de ops
  temporal (cuenta+`solution_reviewers`+`ops_sessions` insertados
  directamente, sin pasar por TOTP) listando ambos reportes con los datos
  correctos, decisión `dismiss` sobre la lista y `takedown` sobre el
  comentario, verificación de `ops_audit_log`. Cuentas, sesión de ops y filas
  de prueba eliminadas al terminar.
- **Pendiente, no tocado aquí**: aplicar ambas migraciones a
  `shwcs_production`; las fichas de solución (`solution_comments`) todavía no
  tienen reporte visitante — ops solo puede borrarlas ad hoc como antes. No
  hay bloqueo, apelación, reputación ni defensa ante multicuentas para esta
  capa de reportes (mismo límite que ya señalaba §23 para moderación de
  comunidad en general); no promover masivamente la función hasta cerrar esa
  operación.

## 53. Fase 2 — la ficha con carrusel — 3 septiembre 2026

Segunda fase del plan de catálogo (§52). La ficha pública gana un carrusel de
imágenes, datos clave visibles antes de bajar, qué falta por declarar, y
soluciones parecidas al final.

- **`src/lib/solutions/gallery.ts`**, fuente única de dos reglas antes
  duplicadas con criterios distintos en tres archivos:
  - `solutionSlides()` — la lista del carrusel. **og:image primero**, luego
    las capturas del fundador en su orden. Es la imagen ancha tipo hero.
  - `solutionCover()` — la portada de rejilla (catálogo, biblioteca, Inicio
    del fundador). Orden **opuesto a propósito**: captura del fundador
    primero (sobrevive el recorte a una miniatura pequeña, una og:image de
    marketing no), luego og:image, luego el arte local de Cord/Flouvia.
    `public.ts`, `library/server.ts` y `account/page.tsx` ya tenían tres
    versiones a mano de este mismo criterio, desincronizadas entre sí; ahora
    las tres llaman a la misma función.
- **`hideSiteImage?:boolean`** en `SolutionData`: el fundador puede quitar la
  og:image de su ficha. Ausente/false = se muestra, así que ninguna ficha
  existente cambia. El interruptor vive en `site-image-card.tsx` (donde ya
  se veía esa portada) y escribe por el mismo `PATCH .../[id]` con
  `action:'save'` que usa el editor guiado — **no es instantáneo**: como
  cualquier otro campo, pasa a `data` (borrador), no a `published_data`, y
  necesita una nueva revisión para llegar a la ficha pública. La interfaz lo
  dice explícitamente tras guardar, para que una casilla no se sienta
  instantánea cuando no lo es.
- **`SolutionGallery`** (`src/components/solutions/solution-gallery.tsx`)
  sustituye a `screenshot-gallery.tsx` (eliminado, sin otro import). Tira con
  scroll-snap horizontal, mecánica copiada de `blog-index.tsx` (el único otro
  carrusel del repo); el `<dialog>` ampliado es casi verbatim el de la
  versión anterior —`showModal()`, devuelve el foco al disparador, `Escape`
  con `stopPropagation`— porque ya cumplía la barra de accesibilidad y
  reescribirlo arriesgaba perder justo eso. Se añadieron flechas de teclado
  (←/→ sobre la tira), que antes faltaban. Un solo ratio para toda imagen,
  **`aspect-[16/10]` + `object-contain`**: recortar una captura de interfaz
  esconde justo lo que debía mostrar, y es el punto medio entre el 4:3 de
  las capturas viejas y el 1.905 de una og:image 1200×630.
- Se inserta a **ancho completo entre el `</header>` y la rejilla de dos
  columnas** de `solution-presentation.tsx` — debajo del nombre y la
  descripción, como se pidió. Falta un dato para que la ficha pública supiera
  si existe og:image: `soluciones/[id]/page.tsx` no seleccionaba
  `has_site_image`; ahora sí, con el mismo `EXISTS(...)` que ya usan
  `public.ts` y `library/server.ts`. La preview privada no necesitó tocar
  SQL: `getSolution` ya lo devolvía.
- **Datos clave arriba**: precio, implementación e integraciones —antes
  enterrados en el `<dl>` «Antes de decidir», muy abajo— ahora en una fila
  compacta bajo el carrusel, junto al botón de demo. Solo se muestra el campo
  si el proyecto lo declaró; nunca un valor inventado.
- **Qué falta por declarar**: reutiliza `solutionChecklist` (ya existía, nueve
  bloques) en un disclosure visible **para cualquiera que lea la ficha, no
  solo el dueño** — decisión explícita: ayuda al comprador y empuja al
  fundador a completar. El texto aclara que falta de información no es lo
  mismo que mala calidad.
- **Soluciones parecidas**: hasta tres de la misma categoría al final de la
  ficha, desde `publicProducts()` ya cacheado en la fase 1 — sin consulta
  extra. La ficha dejó de ser un callejón sin salida.

### Bug de producción encontrado y corregido en el camino

Al verificar contra `next start` (no solo `next dev`), una categoría
**desconocida** en `/explorar`, `/industria` o `/colecciones` tiraba 500 con
`Error: Page changed from static to dynamic at runtime … reason: cookies`.
Causa: `generateStaticParams()` de la fase 1 devolvía solo `{slug}`, sin
`locale`; Next no podía resolver limpiamente la combinación
`[locale]/[slug]` en runtime, y el intento de render dinámico de respaldo
chocaba con que la ruta ya se había comprometido como estática en el build
(el layout de marketing lee `cookies()`, que se resuelve vacío durante el
prerender pero real en el fallback). Arreglado con dos cambios en las tres
rutas de categoría:
- `generateStaticParams()` ahora enumera **`{locale,slug}`** para los dos
  locales × sus slugs (7+7+4, ×2 = 36 combinaciones).
- `export const dynamicParams=false`: el conjunto de slugs es cerrado, así
  que uno desconocido debe dar 404 en la capa de enrutamiento, sin intentar
  nunca un render dinámico. (Poner `dynamicParams=false` sin arreglar antes
  el `generateStaticParams` rompía también los slugs *válidos* con
  `NoFallbackError` — las dos correcciones van juntas, no una sin la otra.)

**Límite pre-existente, no de esta fase, encontrado de paso**: en este
entorno, `notFound()` sirve el contenido correcto de «no encontrado» pero con
código HTTP 200 en vez de 404, tanto en `/explorar/[slug]` como en
`/soluciones/[id]` con un UUID inexistente. Confirmado con el contenido
exacto de la respuesta, no solo el código. No se investigó su causa ni se
tocó; queda anotado para revisión aparte.

**Verificación**: 70 unitarias (5 nuevas: orden del carrusel, que
`hideSiteImage` solo quita el slide del sitio, portada vacía sin capturas ni
sitio, orden opuesto de `solutionCover`, y validación del campo booleano).
Lint y TypeScript limpios. Contra `next start`: categoría desconocida → 404
limpio sin error en el log; categoría válida en `es` y `en` → 200 con el
contenido correcto. Contra el dev: ficha real con carrusel (portada del
sitio + captura), datos clave, disclosure de qué falta y soluciones
parecidas, todo presente en el HTML; alternar `hideSiteImage` vía `PATCH`
persiste en el borrador; un borrador ajeno sigue sin exponer su portada a un
extraño (404). Fixtures y cuentas de prueba eliminadas.

## 54. Fase 3 — taxonomía única y filtros reales — 4 septiembre 2026

Tercera fase del plan de catálogo (§52). Industria y tamaño de empresa pasan
de mocks a campos declarados de verdad, y las cinco fuentes de taxonomía
desincronizadas se reducen a una.

- **`src/lib/taxonomy.ts`**, fuente única de presentación del catálogo:
  `categories`/`industries` (slug, valor, tono, título, descripción),
  `companySizes` (etiqueta y rango), `offerings`, `collections` con su
  `CollectionRule` y `matchesCollection()`, y `catalogRoutes()`. Importa los
  arrays de valores legales (`solutionCategories`, `solutionIndustries`,
  `companySizes`) desde `solutions/model.ts` en una sola dirección —
  `model.ts` sigue siendo dueño de qué es legal guardar, `taxonomy.ts` de
  cómo se presenta — para no repetir el ciclo que ya había desincronizado
  `brand-colors.ts`, `catalog-preview.ts`, el objeto `taxonomy` local de
  `category-page-layout.tsx` y los tres mapas de slug de las rutas de
  categoría: la industria tenía 6 valores en el filtro y 7 en las rutas
  (faltaba Construcción), y el filtro de tamaño comparaba
  `pyme`/`midmarket`/`enterprise` contra texto libre de la descripción —
  un mock que siempre daba cero resultados, porque ninguna solución podía
  declarar un tamaño.
- **Campos declarados de verdad.** `solutionIndustries` (7 valores) y
  `companySizes` (micro/pyme/mediana/corporativo) en `solutions/model.ts`;
  `SolutionData` gana `industries?:string[]` y `companySizes?:string[]`.
  `[]` significa «declarado, sirve a cualquiera» — una respuesta real;
  `undefined` significa que nunca se contestó. Ambos casos se distinguen en
  toda la cadena: validación, checklist y filtros nunca colapsan uno en el
  otro. `solutionErrors` exige ambos campos en el paso 1 para enviar a
  revisión. Se declaran en la pregunta nueva `market` de
  `solutions/questions.ts` (entre `audience` y `scope`, fase 1), con su
  checklist item en `completeness.ts`.
- **Editor guiado.** `SolutionEditor` añade chips de selección múltiple por
  industria (con el tono de marca de cada una) y por tamaño, más una casilla
  «Sirve a cualquier industria/tamaño» por grupo que escribe `[]`
  explícitamente. El resumen final y `guideQuestion` (mapa de la guía de
  completitud a la pregunta) incluyen `market`.
- **Ficha pública.** `SolutionPresentation` muestra las industrias y tamaños
  declarados como cápsulas junto a «Para quién está pensada»: con el tono de
  marca de cada industria si se listaron valores, o «Cualquier
  industria»/«Cualquier tamaño de empresa» si el proyecto declaró `[]`. No
  se muestra nada si el campo nunca se contestó — el disclosure «Qué falta
  por declarar» (§53) ya cubre ese hueco.
- **`PublishedProduct`** (`solutions/public.ts`) expone `industries`/
  `companySizes`, opcionales igual que en `SolutionData`, leídos de
  `published_data`.
- **Filtros reales.** Las tres rutas de categoría (`explorar/[slug]`,
  `industria/[slug]`, `colecciones/[slug]`) ya no tienen mapas locales:
  `generateStaticParams` y el título/descripción salen de `taxonomy.ts`.
  `/industria/[slug]` filtraba antes por `category`/`categories` (la
  taxonomía de *problema*, no de industria) con una búsqueda de substring
  en la descripción como respaldo — comparaba contra el campo equivocado y
  nunca daba resultados reales; ahora filtra por
  `product.industries?.includes(info.value)`, el campo declarado. Antes
  colecciones era `products.slice(0, 8)` idéntico en las cuatro rutas; ahora
  cada colección filtra con `matchesCollection()` contra su `CollectionRule`
  declarada en `taxonomy.ts`. `CategoryPageLayout` perdió su objeto
  `taxonomy` local roto y su tipo `Product = Record<string,any>`: usa
  `PublishedProduct` real y compara contra `industries`/`categories`/
  `companySizes` en vez de buscar substrings en `description`/`feature`.
  Un producto que nunca declaró industria/tamaño simplemente no aparece en
  ese filtro específico — un hueco real, no un bug, igual que en la ficha.
- **Barra de filtros.** `CatalogFilterBar` sustituye el `<select>` nativo
  invisible superpuesto (sin `aria-label` en la superficie visible,
  monoselección, rueda nativa en móvil) por el patrón canónico §28:
  `.selector-dropdown-trigger`/`.selector-menu-active`, el mismo
  `FilterMenu` que ya usa `SavedGallery`. Un solo menú abierto a la vez.
- **Índice de comunidad.** `db/community-search.sql` añade
  `buyer_lists_public_created(created_at DESC,id) WHERE visibility='public'`:
  el `ORDER BY l.created_at DESC` de «Recientes» (`library/community.ts`,
  §23 fija esa semántica como creación, no edición) nunca usaba índice
  porque el único parcial existente (`buyer_lists_public`,
  `db/public-collections.sql`) cubre `updated_at`. Se añadió el índice que
  falta en vez de cambiar la semántica de «Recientes». La búsqueda de
  comunidad (`strpos` sobre texto concatenado sin índice) queda igual —
  indexarla con trigramas es un cambio de infraestructura mayor (extensión
  `pg_trgm`) que no se hizo en esta entrega.
- Migraciones `db/community-search.sql` y (Fase 4, ver abajo)
  `db/ranking-integrity.sql` aplicadas a `neondb` **y a `shwcs_production`**
  (4 de septiembre, con el rol `neondb_owner`; conexión obtenida vía
  `neonctl` autenticado por OAuth interactivo, no manualmente desde el
  console de Neon). Verificado en vivo tras aplicar: `solution_view_visitors`
  y su índice existen, `buyer_lists_public_created` existe.
- Verificación: 72 unitarias (dos nuevas, tri-estado de
  `industries`/`companySizes`), lint, TypeScript y build de producción
  aislado limpios (las 18 rutas de categoría siguen prerenderizadas `●`).
  Contra el dev: `/es/explorar/cobros`, `/es/industria/retail`,
  `/es/colecciones/essential` en 200, slug desconocido en 404; los tres
  filtros renderizan con `.selector-dropdown-trigger`. Recorrido en vivo con
  una cuenta `@example.invalid`: la pregunta `market` persiste
  `industries`/`companySizes` con la semántica de tri-estado correcta a
  través de `PATCH`, y la preview privada muestra las cápsulas declaradas.
  Cuenta y solución de prueba eliminadas.

## 55. Fase 4 — ranking difícil de manipular — 4 septiembre 2026

Cuarta y última fase del plan de catálogo (§52). El orden del catálogo deja
de poder inflarse con vistas anónimas repetidas, actividad sin correo
verificado o un empujón inicial que fija la posición para siempre.

- **Solo cuentas verificadas suman.** El score ya no sale de contar
  likes/guardados/comentarios en bruto: `public.ts` calcula, en la misma
  pasada de CTEs de la Fase 1, una suma **decayed** por señal que solo
  incluye filas de cuentas con `email_verified_at IS NOT NULL`. Los
  contadores en bruto (`likes`/`saves`/`comments`/`views`, los que se
  muestran en el botón de like y en las tarjetas del home) siguen siendo el
  total real sin filtrar — la actividad de una cuenta sin verificar se
  guarda y se muestra con normalidad, exactamente como decidió el
  propietario; solo el campo `score` (usado nada más que para ordenar,
  nunca mostrado como número) excluye esas filas.
- **La auto-actividad no cuenta.** Cada CTE decayed excluye también las
  filas donde el actor es el dueño de la ficha
  (`sl.owner_id<>s.owner_id`, etc.). El like y el comentario propio ya eran
  imposibles de crear desde la API (§46: bloqueados en el INSERT); el
  guardado propio sí era posible (`/api/library` nunca comprobó
  `owner_id` contra la solución) y sigue siéndolo — se ve, pero el CTE de
  `saves` lo excluye del score igual que a los otros dos, por si esa guarda
  de inserción cambia algún día.
- **Decaimiento temporal.** `src/lib/solutions/ranking.ts` fija
  `rankingHalfLifeDays=60`: cada like/guardado/comentario pesa
  `exp(-ln2·antigüedad/60d)` desde su `created_at`, y cada fila diaria de
  `solution_daily_metrics` pesa igual según `current_date-day`. Constante
  única, consumida por las CTEs de `public.ts` — no hay que recalcular nada
  con un cron: al ser una función continua de la fecha actual, el orden se
  actualiza solo con cada lectura cacheada (`revalidate:300`, Fase 1).
- **Vistas: una por visitante y día.** Tabla nueva
  `solution_view_visitors(solution_id,day,visitor_hash)` con PK compuesta —
  el `ON CONFLICT DO NOTHING` hace la deduplicación.
  `src/lib/solutions/view-visitor.ts` calcula `visitor_hash` como
  HMAC-SHA256 de `ip+':'+day` con clave `VIEW_HASH_SECRET`: nunca se guarda
  la IP, y el día entra en el HMAC (no solo en la columna) para que el hash
  del mismo visitante no se pueda correlacionar entre días distintos.
  **Sin `VIEW_HASH_SECRET` configurada, `/api/metrics` conserva el
  comportamiento anterior sin deduplicar** — mismo criterio que
  `AUTH_TOTP_KEY` en §49: una protección opcional que se apaga con
  honestidad en vez de fingir que existe. `VIEW_HASH_SECRET` **no está
  configurada en ningún entorno todavía**; hasta entonces las vistas siguen
  contándose como antes (limitadas solo por `securityLimit`, 600/hora por
  IP). Los clics nunca deduplican: pasar por el sitio varias veces es una
  señal real que no hay que aplastar.
- **Peso amortiguado.** `solutionScore` cambia el término de vistas de
  `views*0.1` a `Math.log1p(views)*0.1` — rendimientos decrecientes, para
  que miles de vistas no ahoguen unos pocos comentarios reales. Sigue
  siendo la única función que calcula el puntaje (§46 ya la había
  centralizado); ahora sus cuatro argumentos son las sumas *decayed* de
  SQL, no conteos en bruto — documentado en el propio archivo para que no
  se vuelva a mezclar con los contadores que sí se muestran.
- **Limpieza.** El cron de monitor (`/api/internal/monitor`, ya diario)
  borra filas de `solution_view_visitors` con más de 3 días — Vercel Hobby
  no tiene un tercer cron disponible (§42), y el borrado es best-effort: un
  fallo ahí nunca tumba la revisión de salud.
- Migración `db/ranking-integrity.sql`, script
  `scripts/migrate-ranking-integrity.cjs`, aplicada a `neondb` **y a
  `shwcs_production`** (4 de septiembre, ver §54). `VIEW_HASH_SECRET`
  configurada por el propietario en Vercel el mismo día (Production);
  activación en producción no verificada en vivo desde esta sesión —
  las variables de Vercel solo se leen al construir/arrancar, así que si se
  configuró después del último deploy hace falta un redeploy para que tome
  efecto. Sin ella, `/api/metrics` sigue contando vistas como antes (sin
  deduplicar), a propósito: ver el párrafo de arriba.
- **Corrección encontrada al revisar esta fase, no una adición nueva**: el
  comentario propio nunca estuvo bloqueado — solo el like. §46 decía lo
  contrario («el dueño de la ficha no puede darle like ni comentar la
  suya»); el código real de `POST /api/solutions/social` (`action:'comment'`)
  no tenía el `owner_id<>account.id` que sí tiene `action:'like'`, y se
  confirmó en vivo que un fundador podía comentar su propia ficha.
  Corregido para que combine: mismo guard en el INSERT, y
  `SolutionSocial` ya no muestra el formulario al dueño (`own` prop nueva),
  solo un aviso de que no puede comentar la suya.
- **Transparencia del correo verificado**: no había ninguna señal de que
  solo cuenta la actividad de cuentas verificadas. La ficha pública ahora le
  dice a un visitante logueado, no dueño y sin correo verificado, que su
  like/guardado/comentario se guarda pero no cuenta para el orden hasta que
  verifique — con enlace a Configuración. `/criterios` también se actualizó:
  ya no dice «puede manipularse creando cuentas» sin más, ahora explica el
  requisito de correo verificado y el decaimiento.
- **Límite conocido, no cerrado en esta fase:** ordenar depende de traer
  todas las publicadas y calcular el score en TS (§52, 4.6 del plan) — con
  el catálogo actual es irrelevante; si crece mucho toca paginar y ordenar
  en SQL. Tampoco se añadió `pg_trgm` para la búsqueda de comunidad (ver
  §54); ambos quedan anotados, no resueltos.
- Verificación: 72 unitarias (dos nuevas: la fórmula con amortiguación
  logarítmica y `rankingHalfLifeDays`, y el hash de visitante — ausente sin
  secreto, estable para el mismo IP+día, distinto entre días o IPs, y sin
  el IP en claro). Lint, TypeScript y build de producción aislado limpios.
  La query decayed de `public.ts` y la CTE de deduplicación de vistas se
  validaron directamente contra `neondb` con datos de prueba desechables
  (tres solicitudes de vista idénticas → una sola fila de visitante y
  `views=1`), eliminados al terminar. `tests/integration/solution-social.cjs`
  gana la aserción de auto-comentario bloqueado (409), corrida contra el dev
  real y pasando junto al resto de la suite existente. Migraciones
  verificadas en vivo contra `shwcs_production` tras aplicarlas: la tabla
  `solution_view_visitors` (con su índice) y `buyer_lists_public_created`
  existen.

## 57. Búsqueda semántica y filtros de comunidad al nivel del catálogo — 5 septiembre 2026

Petición del usuario: «la página de comunidad no sirve», y que tanto la barra
de búsqueda como los filtros «filtren los proyectos cabrón» — que un proyecto
de ventas como Cord aparezca al buscar «cotizaciones de mayoreo» o «agencias
que quieran cotizar», y que Comunidad tenga filtros «tipo explorar».
Decisiones tomadas: multi-select en categorías e industrias; Comunidad con
estado vacío honesto, sin sembrar contenido.

### Capa de búsqueda compartida — `src/lib/search/`

Antes había **tres** algoritmos de búsqueda incompatibles (`catalog-search.ts`
match exacto de token, `library/filters.ts` substring, `community.ts` ILIKE en
SQL) y **cero** vocabulario reutilizable — el «diccionario semántico» del sitio
eran dos líneas en `catalog-search.ts` indexadas por **URL exacta del sitio**
(si el fundador editaba su web quitando la barra final, perdía todos sus
sinónimos).

- **`normalize.ts`**: un solo normalizador (`normalizeText`/`tokenize`) —
  NFD + `\p{Diacritic}` + minúsculas + colapsar no-alfanumérico a espacio.
  Sustituye a `normalizeQuery` y a `normalizeLibrarySearch`, que discrepaban en
  silencio (uno quitaba puntuación, el otro no).
- **`vocabulary.ts`**: `categoryVocabulary` (7 categorías) e `industryVocabulary`
  (7 industrias), cada una ~20-25 términos de dominio en español, keyed por
  **valor de taxonomía** (`Ventas`, `Manufactura`), nunca por URL. Incluye
  `conceptCategories`, el mapa de 15 conceptos → 7 categorías que estaba
  atrapado sin exportar en `landing-features.tsx:156`; ahora lo consumen el
  landing **y** la búsqueda. `expandVocabulary(categories, industries)`
  devuelve el vocabulario que una faceta declarada implica.
- **`facets.ts`**: `matchIndustry`/`matchCompanySize` resuelven el tri-estado
  de `solutions/model.ts` y añaden un cuarto nivel: `'declared' | 'any' |
  'inferred' | 'none'`. **`[]` ahora devuelve `'any'`** — corrige el bug
  documentado en `public.ts:8-10` donde `p.industries?.includes(x)` excluía
  a quien declaró «sirvo a cualquier industria». **Declarar cierra la
  pregunta**: si el fundador declaró `['Retail']`, filtrar por `Salud` da
  `'none'` aunque el texto mencione clínicas — nunca `'inferred'`. La
  inferencia (≥2 aciertos de vocabulario distintos en el texto real de la
  ficha) solo llena el hueco de `undefined`. `matchCompanySize` nunca infiere.
- **`score.ts`**: `rankSearch(query, products, tieBreak)` reemplaza el match
  exacto. Campos pesados (nombre 6 > facetas declaradas 4 > feature 3 >
  descripción 2 > provider 1 > vocabulario expandido 1.5), stem-lite por
  prefijo común ≥5 (`cotizacion`↔`cotizaciones`, `cobrar`↔`cobranza`, sin
  dependencia nueva), y **los que matchean todos los tokens van primero**.
  El vocabulario expandido pesa poco a propósito: basta para sacar a Cord
  con «predicción» o «mayoreo», nunca para superar a quien lo dice literal.

### Búsqueda del catálogo — `catalog-search.ts` reescrito

- Delega en `rankSearch` + `vocabulary`. `searchCatalog(query, categories)`
  mantiene su firma; su único consumidor (`landing-discovery.tsx:19`) no cambia.
- Se eliminó el mapa `keywords` por URL. Los dos términos que no cubre ninguna
  categoría (Flouvia: «tienda online», «ecommerce», «automatización») viven
  ahora como `keywords?: string[]` en el objeto estático de
  `catalog-preview.ts` — atado a una identidad estable, no a un string de URL.
- `nómina` sigue devolviendo 0: no es un bug, es honesto — **ningún proyecto
  real declara la categoría Nómina** todavía. Lo que sí cambió: Cord aparece
  para `mayoreo`, `cotización` (singular, con acento), `predicción`, `CRM`,
  `forecast`, `pipeline`, `agencias que cotizan` — conceptos que su propia
  copy nunca usa, vía el vocabulario de sus categorías declaradas.

### Filtros del catálogo — `category-page-layout.tsx` + `catalog-filter-bar.tsx`

- `FilterMenu` se extrajo a `src/components/catalog/filter-menu.tsx` con dos
  modos desde un componente: **controlado** (catálogo, cliente) y
  **navegacional** (`href`/`clearHref`, para Comunidad, Server Component sin
  `'use client'`, funciona sin JS). Multi-select es solo `values` con más de
  un elemento; cada opción marcada conserva su `Check`, el trigger muestra
  `Etiqueta · N`. Cero estilos nuevos: reutiliza `.selector-*` de §28.
- Categoría e industria pasan a **multi-select** (OR dentro del eje);
  serializadas en la URL como lista separada por comas. Tamaño, formato y
  orden siguen mono-select.
- El filtrado usa `matchIndustry`/`matchCompanySize` en vez de `?.includes()`.
  Los `'inferred'` no se descartan ni se mezclan: van a una sección aparte
  **«También podrían servir»** bajo la rejilla, que aclara que no declararon
  esa industria y que coinciden por su categoría y descripción.
- `matchesCollection()` (`taxonomy.ts`) tenía el mismo bug de `includes`;
  ahora usa `isRealMatch(matchIndustry(...))` — una colección editorial solo
  crece por match declarado, nunca por inferencia.

### Comunidad — `getPublicCollections` + `CommunityFilterBar`

- **SQL nuevo** (`src/lib/library/community.ts`), todo server-side porque la
  paginación (OFFSET) y el contador viven ahí:
  - `category` (mono) → `categories` (multi, `l.categories && ARRAY[...]`);
  - **industria y tamaño de los proyectos contenidos** en la lista (`EXISTS`
    + `jsonb_array_elements_text`), respetando el tri-estado (`[]` = cualquiera);
  - la búsqueda ahora **también matchea el nombre de los proyectos dentro de
    la lista** — antes una lista con «Cord» no salía al buscar «cord» porque
    el `ILIKE` solo miraba nombre/descripción/firma de la lista;
  - devuelve `total` (`count(*) OVER ()`), y `hasMore = offset+rows < total`
    (ya no pide `pageSize+1`);
  - `viewer` se pasa en el listado (antes `page.tsx` no lo pasaba y
    `liked`/`saved`/`own` eran siempre `false` — trabajo hecho y tirado).
- **`community-url.ts`**: contrato puro de URL. `readCommunityFilters` valida
  cada valor contra la taxonomía y corta a 7 por eje; `communityHref` resetea
  `page` a 1 salvo patch explícito. **`savedBy` nunca viene de la URL** — solo
  el booleano `guardadas=1`; el id de cuenta lo resuelve la sesión en
  servidor, o cualquiera enumeraría las listas guardadas de otra cuenta con
  `?savedBy=<uuid>`.
- **`CommunityFilterBar`** (Server Component): cápsulas de categoría
  multi-select (`.selector-tab` + `aria-pressed`), `FilterMenu` de industria y
  tamaño en modo `href`, «Guardadas por mí» si hay sesión, botón «Limpiar»,
  contador `N listas`, `ExpandingSearch` (form GET nativo) y el orden. Idéntico
  visualmente al catálogo, sin una clase nueva en `globals.css`.
- `page.tsx` adelgazado; **estado vacío honesto**: con 0 listas dice «Aún no
  hay listas públicas», sin fingir actividad. Migración
  `db/community-facets.sql` + `scripts/migrate-community-facets.cjs` (índice
  GIN sobre `buyer_lists.categories`, índices de expresión para el join
  `'solution:'||id`, trigram sobre `published_data->>'name'`).

### Guardados y Mis listas — el tercer algoritmo unificado

«Todos los filtros» incluía la biblioteca privada, que corría un **tercer**
motor de búsqueda distinto (`filterSaved` con substring y su propio
`normalizeLibrarySearch`).

- `filters.ts` reescrito sobre el scorer compartido: `makeQueryScorer` (nuevo
  en `score.ts`) da un puntaje por proyecto sin perder la estructura de
  `SavedEntry`. Con query activa manda la relevancia; sin query, el orden
  elegido (recientes/antiguos/A–Z). Guardados hereda stem-lite y vocabulario:
  «pago» encuentra «Pagos del equipo», «cobros» encuentra un guardado de la
  categoría Cobros. `normalizeLibrarySearch` queda como re-export de
  `normalizeText` para no romper imports.
- `BuyerProject` gana `industries?`/`companySizes?`; `resolveProjects`
  (`library/server.ts`) los lee de `published_data` con el mismo tri-estado.
- `SavedGallery` añade dropdowns de **industria** y **tamaño**, con las
  opciones derivadas de los proyectos que sí las declararon (nada de cápsulas
  que no dan resultados). Filtran con `isRealMatch(matchIndustry/…)` —
  declarado o `[]`, sin inferencia: una vista personal se mantiene literal.
- `BoardGallery` (Mis listas) pasa a `normalizeText` para su búsqueda por
  nombre; ya usaba `.selector-tab`.

### Verificación

- **86 unitarias** (11 nuevas en `tests/search.test.ts` + 1 en
  `tests/library-filters.test.ts` para las facetas industria/tamaño y el
  stem-lite en Guardados; las 6 aserciones históricas de esos archivos y de
  `discovery.test.ts` pasan sin tocarse). Cubren: normalizador, higiene del
  vocabulario —todo término === su forma normalizada—, `conceptCategories`
  apunta solo a categorías reales, los cuatro niveles de `matchIndustry`
  incluida la regla «declarar cierra la pregunta», `matchCompanySize` nunca
  infiere, `expandVocabulary`, `rankSearch` prioriza cobertura total de
  tokens, `searchCatalog` encuentra Cord por conceptos de Ventas y mantiene
  sus guardarraíles de precisión (`contrato` no arrastra `control`;
  `nómina` sigue en 0 porque ningún proyecto real la declara). Lint y
  TypeScript limpios.
- SQL de comunidad verificado contra `neondb` con listas sembradas
  desechables (dos cuentas de proyecto con `industries`/`companySizes`
  declaradas, `[]` y ausente): multi-categoría con unión correcta, faceta de
  industria/tamaño del proyecto contenido, `[]` matcheando cualquier tamaño,
  búsqueda por nombre de proyecto dentro de la lista, `total` y paginación
  OFFSET consistentes, `savedBy` sin filtración. Datos eliminados en cascada
  al terminar.
- Dev server: `/es/comunidad` y variantes con `category`/`industria`/`tamano`/
  `q` en 200 sin error; `/es/explorar/cobros?industria=Retail,Salud` en 200.
- Migración `db/community-facets.sql` aplicada solo a `neondb` (dev). **No
  aplicada a `shwcs_production`** — paso explícito pendiente del propietario,
  igual que las de §56. Sin ella la app funciona (seq scan sobre tablas
  vacías); el índice se vuelve determinante al crecer.
- **Pendiente, no tocado aquí**: `npm run build` no se corrió (el dev server
  estaba abierto; CLAUDE.md §13 prohíbe compartir `.next`). No se añadieron
  filtros de industria/tamaño a `BoardGallery` (Mis listas filtran listas, no
  proyectos; sus proyectos no cargan facetas). Sigue sin haber acción real
  recomendada aparte: que Cord declare sus `industries` y `companySizes` en su
  ficha — la inferencia solo cubre el hueco mientras tanto. El plan completo
  está en `/Users/andrevalleortega/.claude/plans/oye-como-que-la-federated-newell.md`.

## 58. Imágenes en object storage (Vercel Blob) — 5 septiembre 2026

Fuente vigente: `docs/media-dashboard.md`, `docs/listings.md`, `docs/database.md`,
`docs/env.md`. Sustituye toda mención histórica a que las imágenes viven en Neon
como base64 (§16 "elección acotada del MVP", §50 "copia reencodificada en
`solution_site_images`", `db/solution-media-dashboard.sql` "WebP en base64").

Los bytes de imagen —capturas del fundador y portadas `og:image` del sitio— salieron
de Postgres a **Vercel Blob**, store privado `shwcs-blob` (`store_yvVU2hQFPsVHLP2A`),
conectado a `mxfounders/shwcs` y `mxfounders/shwcs-ops`. Migración por fases,
sin downtime, **completa y desplegada en producción**.

### Esquema

`db/media-storage.sql` (fases 1–4) + `db/media-storage-drop.sql` (fase 5),
**aplicadas a `neondb` y a `shwcs_production`**. Scripts
`scripts/migrate-media-storage.cjs` / `-drop.cjs` (reutilizan el splitter de
`migrate-launch.cjs`: respeta `$$` y comentarios).

- `solution_media` y `solution_site_images` ganan `storage_key text`,
  `bytes integer CHECK(<=409600)`, `checksum text` (sha256, sirve de `ETag`).
  `content_base64` **eliminada** en fase 5. `solution_media.storage_key/bytes/checksum`
  son `NOT NULL`; en `solution_site_images` siguen nullable (una fila de fallo no
  tiene imagen).
- `auth_accounts` gana `avatar_key` / `avatar_checksum`. `avatar_data` queda como
  **columna vestigial** (0 avatares en prod); una limpieza futura puede dropearla y
  colapsar los predicados `has_avatar` a solo `avatar_key IS NOT NULL`.
- **Índices únicos parciales** por `storage_key` / `avatar_key`: hacen que el chequeo
  de vida del barredor sea un lookup, no un seq scan.
- **`storage_orphans(key PK, deleted_at, attempts, locked_until)`**: la cola del
  único mecanismo de recolección de basura.
- **Vista `solution_site_image_ready`**: único lugar del predicado `has_site_image`
  (antes repetido en 6 consultas). Fase 5 la recrea sin `content_base64` y la app no
  se toca.

### Claves de blob

`src/lib/storage/keys.ts`. Nunca derivadas del contenido (dos soluciones
compartirían un blob; su existencia sería un oráculo entre cuentas). Formas:
`solutions/{sid}/media/{assetId}.webp`, `solutions/{sid}/site/{fetchId}.webp`,
`accounts/{acc}/avatar/{uploadId}.webp`. La captura usa el `randomUUID()` del asset
(nuevo por subida). **La portada de sitio y el avatar acuñan una clave nueva en
cada re-escritura**: el `AFTER UPDATE OF storage_key` encola la vieja en
`storage_orphans`. Una clave determinista se borraría bajo los pies de la fila viva
un ciclo de barrido después de un re-fetch.

### Recolección de basura — un solo mecanismo

Triggers → `storage_orphans` → barredor. Cinco triggers (`db/media-storage.sql`):
`AFTER DELETE` en `solution_media` y `solution_site_images`; `AFTER UPDATE OF
storage_key` en `solution_site_images` con `WHEN (OLD IS DISTINCT FROM NEW AND OLD
IS NOT NULL)`; `AFTER UPDATE OF avatar_key` y `AFTER DELETE` en `auth_accounts`.
`ON CONFLICT (key) DO NOTHING` en la función **no es opcional**: sin él una clave
duplicada aborta el DELETE del fundador (503). Es el único camino que atrapa los
borrados por `ON DELETE CASCADE` (borrar solución/cuenta), donde la app nunca ve
las claves. **La rama de fallo de `site-image` no lista `storage_key` en su
`SET`**, así que el trigger no dispara ahí y una portada que funciona no se
huerfaniza por un error transitorio del sitio — no "mejorar" esa rama para poner
`storage_key` a NULL.

El barredor va en `src/app/api/internal/monitor/route.ts` (cron diario, Hobby no
tiene un tercer cron), **antes** del probe de salud, detrás de
`STORAGE_SWEEP_ENABLED` (`true` en prod). Best-effort: un fallo nunca tumba el
health check. Dos sentencias en un `sql.transaction`: (1) purga de vida —borra de
la cola cualquier clave presente en una tabla viva, para que una clave resucitada
nunca se barra; (2) arrienda un lote de 100 (`attempts++`, `locked_until`), luego
`del()` con `AbortSignal.timeout(3000)`, luego borra las claves de la cola. El JSON
del monitor expone `orphansDeadLettered` (`attempts >= 5`).

### Rutas de servido

`GET /api/solutions/[id]/media/[assetId]`, `.../site-image`, y `GET
/api/account/avatar` (ruta nueva, sin id: sirve el avatar de la sesión). **La
consulta SQL de autorización no cambió** — captura pública si
`published_data->'screenshots' @> [{id}]`, dueño siempre, todo lo demás 404
uniforme. Los bytes salen de Blob vía `getObject` del adaptador, **buffeados**
(nunca stream directo: un fallo a mitad envenena el edge con una imagen truncada
bajo `immutable`). `ETag` = `"{checksum}"`; un `If-None-Match` que coincide
devuelve **304 sin tocar Blob** (el ETag propio del blob es otro hash, no se
reenvía). Caché: capturas publicadas `public, max-age=3600, immutable` (sus bytes
nunca cambian); portada de sitio `public, max-age=60, s-maxage=3600,
stale-while-revalidate=86400` **sin `immutable`** (el dueño la re-lee detrás de una
URL estable); borrador/avatar `private, no-store`. Retirar una publicación revoca
el acceso público **por predicado, no borrando bytes**: `withdraw` no borra ningún
blob y re-publicar restaura los mismos ids.

`src/lib/storage/blob.ts` es el **único** importador de `@vercel/blob@2.8.0`.
Auth: en el runtime de Vercel (prod/preview) OIDC (`VERCEL_OIDC_TOKEN` +
`BLOB_STORE_ID`); en local y scripts, `BLOB_READ_WRITE_TOKEN` estático —OIDC no
aplica al entorno `development`— y **sin `BLOB_STORE_ID` junto al token** o el SDK
lo ignora. Sin credenciales, las subidas responden 503 (sin éxito simulado).
`putImage()` del SDK descartado: cobra transformación por llamada, exige OIDC, y
sharp ya corre igual por el §6.

### `ops/` proxea, no lee Blob

`ops/src/app/api/media/[assetId]/route.ts` ya no hace `SELECT content_base64`:
resuelve el `solution_id` y llama a `GET /api/internal/media/[solutionId]/[assetId]`
del producto con `Authorization: Bearer OPS_MEDIA_SECRET`. Esa ruta interna —no
ops— aplica el predicado §16 (no draft + referenciada en `data`/`published_data`).
Razones: la ruta de ops era un `SELECT ... WHERE id=$1` sin scoping; el `DROP
COLUMN` de fase 5 no exige redeploy en lockstep de dos proyectos; cero deps nuevas
en `ops/package.json`. Requiere `OPS_MEDIA_SECRET` (mismo valor en ambos proyectos)
y `PRODUCT_APP_ORIGIN` en ops.

### Orden de escritura y borrado de cuenta

Subir a Blob → transacción `FOR UPDATE` que inserta la fila. Si devuelve 0 filas
(carrera de cuota/estado/propiedad) o lanza → `INSERT INTO storage_orphans` de la
clave recién subida, 409/503. Nunca al revés: una fila apuntando a un blob
inexistente es una imagen rota visible; un blob encolado es desperdicio invisible.
Borrar: solo la transacción; el `AFTER DELETE` encola. `POST /api/account/delete`
hace además un `deleteObjects` **inline best-effort** tras el commit del cascade,
para honrar la promesa de "sin ventana de retención"; los triggers + el barrido
son la red de garantía.

### Despliegue realizado

- Fase 1 (`db/media-storage.sql`) → `shwcs_production`, verificada.
- Migraciones §56/§57 de comunidad → `shwcs_production` (eran prerequisito del
  merge de esta rama a `main`).
- Fase 2 (código dual-read) desplegada; verificado en vivo que `shwcs.site` sirve
  la portada de Cord desde Blob con `ETag`/304.
- Fase 3 backfill en `shwcs_production`: 1 blob (portada de Cord, `bytes=11474`),
  `pending 0`.
- Fase 5a (código sin fallback `content_base64`) + Fase 5b
  (`db/media-storage-drop.sql`) → `shwcs_production`.
- Fase 6: `STORAGE_SWEEP_ENABLED=true` en ambos proyectos, redeploy.

### Verificación

86 unitarias, lint y build limpios en `shwcs` y `ops/`.
`RUN_MEDIA_INTEGRATION=1 node tests/integration/media-dashboard.cjs` **PASS**
contra el esquema post-drop, incluida la carrera guardar-vs-borrar `[200,409]`
(el `FOR UPDATE` sobre `founder_solutions` la sigue serializando). Reparada de
paso: el fixture necesitaba `industries:[]`/`companySizes:[]` (§54) y ahora limpia
sus propios blobs del store real en `finally`. Recorridos en vivo: triggers de GC
(delete/replace/cascada/rama-de-fallo/liveness-purge) contra `neondb`;
publicar→`immutable`, re-fetch de portada→clave nueva+huérfano, withdraw→404 con
blob y `storage_key` intactos, dueño ve la captura retirada.

### No hecho — Fase B (proyecto aparte)

**Renditions responsivas (400/800/1600 px).** Hoy una tarjeta de catálogo de
400 px carga la imagen completa de 1600×1200 (~400 KB). La Fase A movió los bytes
1:1; la Fase B añade tres anchos, tabla hija `solution_media_files`, URLs con
segmento de ancho (`/media/{id}/800.webp`), `ETag` por rendition, loader propio de
`next/image` y quitar `unoptimized` de los componentes. No empezada. El plan está
en `/Users/andrevalleortega/.claude/plans/haz-el-plan-para-abundant-dove.md`.
