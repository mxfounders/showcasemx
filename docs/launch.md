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
- No se verifica retrospectivamente a nadie por tener una cuenta. El registro no
  envía correo automáticamente: el usuario lo solicita desde Seguridad.
- El correo transaccional está desactivado por defecto. Activarlo exige correo
  verificado; el worker vuelve a comprobar las preferencias antes de enviar.
- AUTH_REQUIRE_VERIFIED_EMAIL=true exige verificación al crear solicitudes nuevas.
  Activar en producción después de comprobar entrega, no antes sin salida para usuarios.

### Cola y operación

/api/internal/mail requiere Authorization: Bearer CRON_SECRET (mínimo 32 caracteres).
Un operador debe programar una llamada cada cinco minutos en el entorno correcto;
no se creó un cron ni automatización externa. Verificar límites del plan Vercel o
usar un scheduler compatible. No pegar el secreto en URLs/logs.

Procesa cinco mensajes por ejecución, con FOR UPDATE SKIP LOCKED, lease de cinco
minutos, máximo cinco intentos y backoff. Resend recibe una clave idempotente por
aviso. No se reintenta automáticamente una entrega incierta de más de 23 horas:
pasa a failed para no exceder la ventana de idempotencia del proveedor. Observar
pending/sending/failed y la edad de la cola; cinco mensajes por cinco minutos no
sustituye un sistema de alto volumen. No reenviar failed a ciegas.

El worker también limpia enlaces de recuperación/verificación/OAuth caducados y
contadores antiguos. No hay envíos automáticos sin proveedor y scheduler activos.
La entrega externa, rebotes y reputación del remitente siguen sin probarse.

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
4. CRON_SECRET, scheduler, monitoreo de cola y comprobación de recuperación/avisos.
5. Responsable editorial explícito y revisión de políticas/contacto/retención.
6. Activar verificación obligatoria para contactos y probar el recorrido completo
   en el despliegue final. Separar bases de desarrollo, preview y producción.
7. Aplicar `db/contact-inquiries.sql`, enviar una solicitud real desde `/contacto`
   y revisar persistencia, destino, reply-to y estado de entrega en producción.

Las campañas del newsletter, reseñas verificadas, almacenamiento externo de capturas,
monitoreo externo y CRM/chat completo siguen fuera de esta entrega.

## Superficie operativa futura

Reservar `ops.shwcs.site` para revisión editorial, moderación, publicación, reportes
y operación del catálogo. Antes de construirla: definir roles mínimos, acceso de
emergencia, auditoría de cada decisión, separación de sesiones y base/entorno de
producción. No exponerla como una ruta escondida del dashboard público ni conceder
acceso por seleccionar «fundador» o «comprador» en el perfil.
