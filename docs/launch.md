# Entrega de avisos, confianza, métricas y preparación de lanzamiento

Estado: 31 agosto 2026. Código local y migración aplicada a la conexión configurada.
No equivale a despliegue de la aplicación ni a proveedores externos activados.

## Publicaciones reales

Cord y Flouvia se publicaron por autorización explícita del propietario en esta
sesión. Cord pasó a versión 8 y Flouvia a versión 2 al publicar; las ediciones
posteriores del propietario pueden incrementar esos valores. Se preservaron los
borradores enriquecidos, owner_id y las identidades catalog:cord/catalog:flouvia.
La operación quedó registrada en solution_events como publicación administrativa,
no como revisión independiente ni certificación de identidad/resultados.

En catálogo: Cord primero, Flouvia segundo, después otras publicaciones. La búsqueda
mantiene relevancia primero y ese orden como desempate. Si una categoría no contiene
uno de los proyectos no se lo fuerza a aparecer. La ficha pública siempre usa
published_data. Un retiro no puede resucitar desde el catálogo estático o biblioteca.
Los 57 ejemplos de diseño están ocultos por defecto; solo se activan explícitamente
con NEXT_PUBLIC_SHOW_DEMO_PROJECTS=true y siguen sin ser proyectos contratables.

## 1. Avisos y correo verificado

- /account/notifications: avisos privados con filtro leídos/pendientes, paginación
  de 30 y marcado individual o de todos. No son mensajes de chat.
- /account/settings/notifications: preferencias separadas para solicitudes y
  postulaciones. No alteran consentimiento del newsletter.
- Triggers de contact_events y solution_events generan avisos en la misma
  transacción que el cambio. source_key único evita duplicados por evento.
- Los eventos de contacto avisan a la otra parte; nunca revelan notas/listas.
- /account/settings/security permite solicitar verificación. /verify-email recibe
  el token en fragmento y requiere confirmación explícita. Token aleatorio, solo
  hash en BD, 30 minutos, ligado a cuenta/correo y consumido una sola vez.
- No se verifica retrospectivamente a nadie por tener una cuenta. El registro manda
  el enlace de verificación al crear una cuenta nueva (SHCWS-27, con `after()`, sin
  cambiar la respuesta); Inicio y Seguridad permiten reenviarlo.
- Avisos por correo de solicitudes de contacto: encendidos salvo que la persona los
  apague (SHCWS-13, `db/contact-alerts-default.sql`). Los de fichas también, desde
  `db/listing-notices.sql` (SHCWS-18/20). Un `false` guardado sigue siendo `false`.
  Siempre exigen correo verificado y el worker vuelve a comprobar las
  preferencias antes de enviar. Crear o responder una solicitud corre el worker en ese
  momento para esa conversación; el cron diario queda como reintento. El aviso de una
  solicitud nueva lleva lo que el comprador aceptó compartir y va también al correo
  privado de contacto de la ficha.
- Avisos de fichas (`category='solution'`, `src/lib/notifications/listing-email.ts`):
  - decisión editorial (recibida, publicada, cambios, rechazo, retiro), con el
    comentario del equipo si lo hay;
  - al publicarse, el kit de lanzamiento: enlace público, compartir en LinkedIn, X y
    WhatsApp, insignia para el sitio y enlace para pedir reseñas;
  - comentario nuevo (autor y texto), reporte (solo el motivo, nunca quién lo envió)
    y reseña pública nueva (estrellas y título);
  - espacios patrocinados: pago confirmado, pausa, disputa, cancelación, reembolso
    (trigger en `ad_campaigns`), y «empieza mañana» y «terminó, con impresiones y
    clics» (fechas: `src/lib/ads/notices.ts`, los crea el cron de correo antes de
    enviar y mira dos días atrás por si un cron falló).
  - Comentarios y reportes se envían al momento con `after()`. Las decisiones de ops,
    cuando ops llama a `/api/internal/catalog-revalidate` tras decidir. El resto, con el
    cron diario.
- «Tu semana en shwcs» (SHCWS-21, `src/lib/notifications/weekly.ts`, `db/weekly-digest.sql`):
  - a fundadores con ficha publicada y correo verificado, desde la primera corrida diaria
    del cron de correo de cada semana; resume los 7 días anteriores al lunes;
  - visitas y clics contra la semana anterior; guardados solo desde 3 cuentas distintas;
    reseñas y comentarios nuevos; oportunidades sin responder; el siguiente bloque de la
    guía de completitud; posición aproximada en su primera categoría;
  - no sale si la semana fue cero en todo; uno por cuenta y semana; si falla, el cron del
    día siguiente lo reintenta;
  - encendido por defecto (`weekly_email`), interruptor en Preferencias de avisos, baja con
    enlace firmado y `List-Unsubscribe` de un clic (RFC 8058);
  - mide envíos y clics agregados por semana (`/api/weekly/click`, solo rutas internas);
    las aperturas no se miden porque requieren un píxel, que la política de privacidad
    descarta. En español hasta SHCWS-25.
- Alertas de búsqueda guardada (SHCWS-47, `db/search-alerts.sql`, categoría `alert`):
  - «Avísame cuando haya algo nuevo» en `/buscar` y en `/explorar`, `/industria` y
    `/colecciones` con sus filtros y palabras; requiere cuenta. Se administran en
    `/account/alerts` (enlazada desde Guardados y Preferencias de avisos). 20 por cuenta;
    la misma búsqueda es la misma alerta.
  - Coincide exactamente con los resultados principales de esa página: mismo buscador y
    mismas reglas de filtros (`src/lib/search/catalog-filter.ts`, espejo de
    `CategoryPageLayout`). «También podrían servir» no cuenta. Nunca avisa al dueño de la
    ficha. Lo que ya coincidía al crearla queda como visto.
  - Se revisa justo después de que ops publica (`/api/internal/catalog-revalidate`) y en
    el cron diario de correo. Un aviso por alerta junta las fichas nuevas; el correo sale
    al momento la primera vez y después **como máximo una vez cada 7 días por alerta**:
    lo que llega entre tanto se acumula en el siguiente.
  - Correo encendido por defecto (`alert_email`, la alerta ya es la petición), exige correo
    verificado y se apaga en Preferencias de avisos. Borrar la alerta cancela su correo
    pendiente.
- AUTH_REQUIRE_VERIFIED_EMAIL=true exige verificación al crear solicitudes nuevas.
  Activar en producción después de comprobar entrega, no antes sin salida para usuarios.

### Cola y operación

/api/internal/mail requiere Authorization: Bearer CRON_SECRET (mínimo 32 caracteres).
Vercel Cron lo ejecuta diariamente a las 14:15 UTC mientras el proyecto permanezca
en Hobby. Al migrar a un plan que permita mayor frecuencia, cambiar únicamente el
schedule a cada cinco minutos. No pegar el secreto en URLs/logs.

Procesa hasta 25 mensajes por ejecución, con FOR UPDATE SKIP LOCKED, lease de cinco
minutos, máximo cinco intentos y backoff. Resend recibe una clave idempotente por
aviso. No se reintenta automáticamente una entrega incierta de más de 23 horas:
pasa a failed para no exceder la ventana de idempotencia del proveedor. Observar
pending/sending/failed y la edad de la cola; cinco mensajes por cinco minutos no
sustituye un sistema de alto volumen. No reenviar failed a ciegas.

El worker también limpia enlaces de recuperación/verificación/OAuth caducados y
contadores antiguos. No hay envíos automáticos sin proveedor y scheduler activos.
La entrega externa, rebotes y reputación del remitente siguen sin probarse.

### Presentación y baja en un clic (SHCWS-161, 14 noviembre 2026)

- Todos los correos usan la plantilla de `src/lib/notifications/email-template.ts`. La
  cabecera es el wordmark oficial en PNG (`/brand/shwcs-logo-1.png`, 84×26), con texto
  alternativo «shwcs» en azul para los clientes que bloquean imágenes. El pie lleva
  `hola@shwcs.site` y, en todo aviso que se puede apagar, «Preferencias de avisos».
- Los avisos de contacto, de fichas, de comunidad y de alertas llevan `List-Unsubscribe`
  y `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058). El token está firmado
  con `NEWSLETTER_UNSUBSCRIBE_SECRET` y el prefijo `notice:`
  (`src/lib/notifications/unsubscribe-token.ts`), y vale para una cuenta y un tipo de
  aviso. `POST /api/notifications/unsubscribe` apaga solo ese tipo. Un GET a la misma
  dirección solo redirige a Preferencias de avisos: nunca cambia nada (§5).
- Los avisos de seguridad y la bienvenida no llevan baja: no se pueden apagar. Sin el
  secreto no se añade la cabecera, en lugar de mandar un enlace que no funcionaría.
- `src/lib/notifications/compose.ts` arma el mensaje final de cada aviso; verificación y
  recuperación salen de `account-emails.ts`. Así los envíos y la vista previa producen
  exactamente lo mismo.
- Vista previa: `GET /api/dev/email-preview` (índice) y `?t=<plantilla>&format=text`. Solo
  con `next dev` o `EMAIL_PREVIEW=1`; en producción responde 404. Datos ficticios, no
  envía nada.
- `tests/email-notices.test.ts` compara el HTML de cada plantilla con
  `tests/snapshots/email-*.html`. Para aceptar un cambio deliberado:
  `UPDATE_SNAPSHOTS=1 npx tsx --test tests/email-notices.test.ts`.
- Comprobado en Chrome (escritorio, móvil y sin imágenes) y con Resend, que aceptó el
  correo de contacto con su cabecera de baja y el de seguridad sin ella. **Falta revisarlos
  a mano en Gmail, Outlook y Apple Mail, en claro y en oscuro.** Los textos siguen en
  español hasta que las cuentas guarden su idioma (SHCWS-25).

## 2. Confianza y revisión editorial

- /criterios, /proceso, /faq y /el-proyecto explican el alcance del producto.
- /account/solutions/[id]/trust: propietario de una publicación solicita TXT para
  _showcasemx.<host exacto>, con desafío aleatorio de siete días.
- Se consulta DNS, no se descarga una URL aportada. Solo HTTPS y dominios válidos,
  sin IP, localhost, credenciales ni puertos arbitrarios.
- Al verificar, la comprobación dura 90 días. Se muestra solo si dueño y host
  publicado coinciden. Cambiar dueño/dominio o caducar elimina la señal pública.
- «Control de dominio comprobado» NO verifica identidad legal, seguridad,
  resultados, casos, precios ni calidad. No añadir reseñas inventadas.
- Reporte autenticado de publicación: motivo y contexto; máximo un reporte
  abierto por persona/proyecto. No se publica la identidad del reportante.
- /account/review/reports requiere solution_reviewers. El revisor no puede resolver
  su propio reporte ni uno sobre su propia publicación. Decisión explicada y CAS
  impiden sobrescribir decisiones concurrentes.
- Retirar elimina published_data y published_at, registra evento withdrawn y
  devuelve la ficha a changes_requested. Conserva borrador e historial privado.
- No se asignó ningún revisor real. Un responsable debe designarlo expresamente.
  Las cuentas reviewer de pruebas son temporales y se eliminan.

La cola de reportes muestra hasta 50 abiertos, sin paginación todavía. No hay
apelaciones ni backoffice de moderación masiva. La eliminación total de cuentas no
está expuesta en UI; al operar borrados administrativos, revisar las cascadas y
ordenar reportes/proyectos antes de las identidades referenciadas.

## 3. Métricas privadas

/account/metrics muestra los últimos 30 días por proyecto propio: vistas de ficha,
clics al sitio oficial y solicitudes reales creadas. Los agregados diarios permiten
ver actividad sin identificar visitantes. No se infieren ventas ni personas únicas.

El cliente respeta DNT/GPC, no envía identificadores de visitante ni contenido de
listas. El endpoint excluye al propietario autenticado y proyectos no publicados,
valida origen y aplica límites. Recargas, bots, bloqueadores o visitas con JS
apagado afectan recuentos. No son una auditoría de tráfico ni un sistema antifraude.
Las solicitudes provienen de contact_requests, no de eventos de clic fabricados.

## 4. Acceso Google y preparación técnica

OAuth propio sin Clerk: PKCE S256, state/cookie HttpOnly y nonce; flujo de diez
minutos de un solo uso. JWT firmado RS256, issuer/audience/azp, caducidad y correo
verificado comprobados con jose. No se guardan access/refresh tokens.

Una identidad Google se resuelve por subject. Un correo coincidente con una cuenta
existente NO la vincula automáticamente: entrar con contraseña y vincular desde
Conexiones. Vincular exige reautenticación y sesión/hash vigentes. Desvincular
requiere contraseña conocida y revoca sesiones. Usuarios creados solo con Google
deben establecer contraseña por recuperación antes de desvincularlo.

Google todavía no está configurado ni probado contra el proveedor real. El botón
no simula acceso; sin configuración informa «Pendiente de conexión».

Actualización incremental a Next 15.5.24, React 19.2.8, async params/cookies y jose.
PostCSS 8.5.26 fijado para Next mediante override. Auditoría de dependencias de
producción: cero vulnerabilidades reportadas en esta revisión; quedan cuatro
moderadas en herramientas de desarrollo. No ejecutar audit fix --force sin revisar
los cambios mayores sugeridos. Tailwind usa import ESM compatible con Node local.

CI versionado: lint, tipos, unitarias, build y audit de producción en PR/push a main.
No implica ejecución remota exitosa ni bloqueo automático de despliegues de Vercel.
/api/health es liveness sin detalles de infraestructura, no comprueba Neon ni email.
npm run preflight informa configuración faltante sin imprimir secretos.

Navegación comercial dirige búsquedas a /?q=...#catalogo. Se ocultan enlaces a
Drops/Eventos/Fundadores/Colecciones no implementados. Páginas legales existentes
son borradores operativos explícitos: requieren responsable, contacto, política de
retención y revisión antes de lanzamiento público. No afirmar cumplimiento legal.

## Validación y pendientes externos

Pruebas unitarias de JWT, configuración, límites de origen, privacidad, navegación
y entrega simulada; integración opt-in con identidades @example.invalid que se
eliminan; regresión de biblioteca/contactos/capturas; build aislado sin credenciales.
Consultar CLAUDE.md para resultados finales de la ejecución.

Pendientes para activar producción:
1. El propietario reporta proyecto y dominio `shwcs.site` preparados en Vercel.
   Sigue pendiente hacer push, desplegar y comprobar que el proyecto vinculado no
   sea Cord o Flouvia antes de cargar secretos o promover a producción.
2. Replicar `RESEND_API_KEY`, `AUTH_EMAIL_FROM=shwcs <hola@shwcs.site>` y
   `AUTH_APP_ORIGIN=https://shwcs.site` en Vercel; probar una entrega real. En local,
   preflight ya reconoce la configuración de email, pero eso no prueba producción.
3. GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET y redirect autorizado exacto:
   <AUTH_APP_ORIGIN>/api/auth/google/callback; consent screen y prueba real.
4. Replicar CRON_SECRET en Vercel, comprobar la ejecución diaria y monitorear la cola.
5. Responsable editorial explícito y revisión de políticas/contacto/retención.
6. Activar verificación obligatoria para contactos y probar el recorrido completo
   en el despliegue final. Separar bases de desarrollo, preview y producción.
7. Aplicar `db/contact-inquiries.sql`, enviar una solicitud real desde `/contacto`
   y revisar persistencia, destino, reply-to y estado de entrega en producción.

Las campañas del newsletter, reseñas verificadas, almacenamiento externo de capturas,
monitoreo externo y CRM/chat completo siguen fuera de esta entrega.

## Superficie operativa (`ops.shwcs.site`)

Construida en `ops/`: roles `reviewer`/`admin` sobre `solution_reviewers`, login con
TOTP obligatorio, sesiones propias (`ops_sessions`) separadas del producto, y
auditoría de cada decisión en `ops_audit_log`. Ver CLAUDE.md §44 y
`docs/operations.md`. No expuesta desde el dashboard público; el acceso nunca se
concede por seleccionar «fundador» o «comprador» en el perfil. Pendiente: variables
de entorno del proyecto Vercel `shwcs-ops`, dominio conectado y revisión legal.
