# Configuración de cuenta

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

## Estado vigente — 3 septiembre 2026

Sustituye la estructura descrita más abajo. Contrato resumido en CLAUDE.md §49.

Seis secciones con pestañas persistentes (`SettingsNav`, patrón `.selector-tabs`):
Resumen, Perfil, Seguridad, Conexiones, Avisos y Datos. Ya no hay enlace «volver
al centro»: se salta de una a otra sin pasar por el índice. El Resumen lee estado
real de la base —nombre, foto, correo confirmado, segundo factor, sesiones
abiertas, Google— y señala lo que falta; si la consulta falla lo dice y no
inventa estado.

### Verificación en dos pasos (opcional)

- TOTP RFC 6238 en `src/lib/auth/totp.ts`: SHA1, 6 dígitos, pasos de 30 s y
  ventana ±1, los mismos parámetros que ops, para que una sola app autenticadora
  sirva para ambas cuentas.
- Secreto cifrado en reposo con AES-256-GCM bajo `AUTH_TOTP_KEY`. **Sin esa
  variable la función se muestra como no disponible y no se puede activar**; no
  se simula protección. Rotarla obliga a volver a dar de alta el factor.
- Activar, desactivar y regenerar códigos piden la contraseña: la cookie de
  sesión no basta para tocar el segundo factor. Desactivar y regenerar piden además
  un código (ver abajo).
- El secreto queda `totp_confirmed_at IS NULL` hasta que un código generado con
  él se acepta, así que abandonar el alta a la mitad no bloquea a nadie.
- Diez códigos de respaldo de 8 dígitos, guardados como SHA-256, de un solo uso.
  Regenerarlos invalida los anteriores, incluidos los no usados.

### Acceso en dos pasos

`POST /api/auth/login` deja de crear sesión cuando la cuenta tiene el factor
activo: escribe `auth_login_challenges` (5 minutos, con el hash de contraseña
del momento) y responde `{step:'totp'}`. `POST /api/auth/totp` lo consume.
Desde SHCWS-159:

- Cada código reserva antes un intento del reto con un `UPDATE … attempts < 5`
  atómico: cinco códigos por reto aunque lleguen en paralelo, y el reto se borra
  al agotarse.
- Los topes por red y global solo cuentan peticiones con un reto vivo; una cookie
  inventada no los gasta.
- Por cuenta, 10 códigos fallidos por hora sin importar el reto ni la red
  (`auth-totp-fail:<hash de la cuenta>`). Un código correcto devuelve su lugar.
- El código se gasta en la misma sentencia que abre la sesión: `totp_last_step`
  sube solo si el paso es mayor, el código de respaldo se quita solo si sigue en la
  lista y el reto se borra. Una repetición simultánea encuentra el código gastado.

Cambiar la contraseña invalida el reto, porque el hash guardado deja de
coincidir. `RUN_AUTH_SECURITY_INTEGRATION=1 node tests/integration/auth-security.cjs`
lo comprueba contra un servidor aislado.

### Ajustes del 14 de noviembre de 2026 (SHCWS-171 a 174)

- **Activar exige correo confirmado** (`start` y `confirm` responden 409 sin él). Si
  no, quien registra primero el correo de otra persona podría activarla y dejar fuera
  al dueño real después de que recupere la cuenta. Seguridad lo explica en lugar del
  botón.
- **El código del alta queda gastado**: `confirm` guarda su paso en `totp_last_step`.
- **Desactivar, regenerar códigos y eliminar la cuenta piden contraseña y código**
  (de la app o de respaldo), gastado con `spendSecondFactor`
  (`src/lib/auth/second-factor.ts`). Decisión del propietario: una contraseña robada
  sola no quita la protección ni borra la cuenta.
- **Aviso al llegar a 10 códigos fallidos** en una hora: aviso de seguridad
  `totp-failures`, una vez por hora, con «No fui yo».
- **Google también pide el código** (decisión del propietario, SHCWS-172): el callback
  crea el mismo reto de 5 minutos con `issueLoginChallenge` y redirige a
  `/sign-in?step=totp`, que abre directo el paso del código si la cookie del reto existe.
- **Sesión de Google**: guarda `user_agent`, borra la sesión anterior de ese navegador y
  no se abre para cuentas suspendidas (SHCWS-174).
- **Cookie de estado de Google** `__Host-showcasemx_google_state` en producción, para
  que un subdominio hermano no pueda plantarla. El callback acepta también el nombre
  anterior y borra ambos, para no romper flujos iniciados antes del cambio (§20).

### Límites de acceso (SHCWS-171)

- `requestIdentity` agrupa IPv6 por su /64 (en producto y en ops): una conexión suele
  tener una /64 entera, y contar direcciones sueltas no frenaba nada. IPv4 sigue exacta.
- El contador compartido de cada ámbito ya no es un muro: por encima de su tope por
  minuto solo se rechaza a las identidades que ya usaron una cuarta parte de su
  permiso de la hora (`withinLimit`, `pressureAllowance`). El acceso con contraseña
  usa la misma regla con 30 intentos por red cada 15 minutos y 120 por minuto en total.
- Recuperación y enlace mágico limitan por red (10/h), por correo desde esa red (3/h)
  y por correo (10/h); el enlace mágico, además, por invitación (30/h). Tres pedidos ya
  no bloquean la recuperación de otra persona.
- Restablecer contraseña y confirmar correo limitan por red: el token lo elige quien
  llama. El inicio con Google limita por red (30/h) en vez de una clave fija para todos.

### Sesiones abiertas

`auth_sessions` guarda `created_at`, `last_seen_at` y `user_agent`.
**No guarda IP a propósito**: el aviso de privacidad revisado se compromete a
cookies técnicas de sesión, y una etiqueta de dispositivo alcanza para
reconocerla. `deviceLabel()` produce «Chrome en macOS» y nunca el user agent
completo. Al cliente solo viaja el hash del token. La sesión actual no se cierra
desde esa lista: para eso está el botón de cerrar sesión.

### Datos y privacidad

`/account/settings/data` reúne idioma, copia de datos y eliminación.

- `GET /api/account/export` devuelve un JSON con perfil, publicaciones,
  biblioteca, listas y conversaciones de contacto. Nunca el hash de contraseña,
  el secreto TOTP ni datos privados de terceros.
- El idioma cambia el segmento de locale y declara su alcance real: catálogo,
  inicio y páginas informativas están traducidos; la cuenta y los correos siguen
  en español.
- `POST /api/account/delete` exige contraseña y escribir `ELIMINAR`. Antes se
  enumeran las consecuencias contando filas reales: publicaciones que se retiran
  del catálogo y conversaciones que desaparecen **también para la otra persona**,
  porque `contact_requests` cascadea por `buyer_id` y por `recipient_id`. Sin
  borrado suave ni periodo de recuperación.

Migración `db/account-security.sql` (aditiva), aplicada a `neondb` y a
`shwcs_production`. Otro entorno la necesita antes de servir este código: el
login consulta `totp_confirmed_at`. `AUTH_TOTP_KEY` sigue pendiente en Vercel.

---

Implementado el 30 de agosto de 2026. `/account/settings` reúne perfil, seguridad y cuentas vinculadas, directamente sobre el fondo. El menú de usuario incluye Configuración y muestra el nombre y foto guardados. `/account/profile` redirige a la nueva ruta.

## Perfil y foto

Nombre, empresa, perfil y rol se guardan en `/api/account` con identidad obtenida de la sesión. Correo de acceso de solo lectura: cambiar el nombre/perfil no cambia identidad ni permisos editoriales.

`PUT /api/account/avatar` acepta bytes JPG/PNG/WebP, hasta 2 MB y 16 megapíxeles. Sharp valida y decodifica, rechaza SVG/animaciones, orienta y recorta a 256×256, convierte a WebP y elimina metadatos. Solo se almacena la imagen comprimida como data URL en `auth_accounts.avatar_data`; no el original. Solución deliberadamente pequeña para el MVP, sin requerir almacenamiento externo. `DELETE` elimina la foto. Endpoints privados, mismo origen y límite de subidas por cuenta/global. No usar estas fotos como archivos públicos ni registrar sus datos.

## Contraseñas

- Cambio autenticado: contraseña actual + nueva + confirmación; mínimo 6 caracteres, máximo técnico 4096, errores propios. Verificación scrypt y comparación de hash contra la versión verificada para evitar carreras.
- El cambio cierra todas las sesiones y elimina enlaces de recuperación anteriores; obliga a entrar de nuevo. El login bloquea la fila de cuenta y vuelve a comprobar el hash al emitir una sesión para impedir que una verificación antigua cree acceso después del cambio.
- `/forgot-password` está enlazado desde acceso y seguridad. `/reset-password` recibe un token en el fragmento del enlace (no en consultas del servidor), lo retira del historial visible y permite nueva contraseña + confirmación. Recargar requiere reabrir el enlace del correo.
- Tokens aleatorios de 32 bytes, solo SHA-256 en Neon, caducidad 30 minutos, vinculados al hash de contraseña existente al emitirlos. Una actualización atómica invalida todos los tokens antiguos, revoca sesiones e impide reutilización concurrente. No se inicia sesión automáticamente.
- Respuesta genérica para correo existente/inexistente y límites persistentes por cuenta/global. Solicitud de correo espera al menos 8.5 segundos tras buscar la cuenta, cubriendo el timeout acotado del proveedor para reducir diferencias de tiempo. Fallos de entrega registran únicamente un mensaje genérico, nunca tokens/correos. No constituye garantía de entrega ni protección completa contra abuso.

## Activación pendiente del correo

La base configurada ya tiene la migración aditiva `db/account-settings.sql`. **No hay envío de recuperación habilitado**: faltan `RESEND_API_KEY`, `AUTH_EMAIL_FROM` (remitente verificado) y `AUTH_APP_ORIGIN` (origen HTTPS canónico, sin path/query/credenciales). Se utiliza `POST https://api.resend.com/emails` sin SDK. Si falta configuración, el formulario informa que no está disponible y el endpoint devuelve 503; nunca entrega el token en la respuesta.

No se enviaron correos reales durante las pruebas. La entrega, remitente/dominio y configuración en Vercel deben probarse antes de habilitar producción. La notificación de cambio de contraseña, verificación de email, cola/reintentos de entrega y limpieza periódica de tokens caducados siguen pendientes. No confundir recuperación implementada con entrega verificada.

## Google

Sección visible «Sin vincular · Próximamente», botón deshabilitado. No existe login OAuth, vinculación ni desvinculación funcional: sigue pendiente conectar Google. No se guarda un estado ficticio de conexión. Implementar posteriormente autorización por sesión, state/PKCE, verificación de identidad Google y reautenticación para vincular/desvincular; nunca enlazar por una coincidencia de email sin prueba. No permitir quitar el último método de acceso.

## Verificación

21 pruebas unitarias pasan; lint/tipos y build aislado. Prueba integral con cuenta temporal: perfil, foto decodificada y eliminación, rechazo de imagen inválida, contraseña actual, revocación de dos sesiones, invalidación de enlace anterior, caducidad y dos intentos concurrentes con un mismo token (solo uno exitoso). Comprobada respuesta 503 sin proveedor. Todos los datos temporales de cuenta, foto, sesiones y tokens se eliminaron.

Referencias técnicas: [OWASP: recuperación de contraseña](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [Resend: envío](https://resend.com/docs/api-reference/emails/send-email), [Sharp: límites de entrada](https://sharp.pixelplumbing.com/api-constructor/).

En navegador: perfil guardado y nombre actualizado en menú, layout móvil de 375 px sin desbordamiento, errores personalizados por contraseñas distintas y cambio exitoso desde Seguridad.

Navbar del dashboard: comparte `navbar-style.ts` con la landing (blanca, fija, 52 px, ancho máximo 7xl, sombra y esquinas inferiores). Navegación adaptada con Mis soluciones, Configuración, Explorar catálogo, Postular solución y menú de cuenta; enlaces móviles dentro de ese menú. El contenido reserva 56 px para evitar solapamiento.

Actualización del dashboard: sidebar blanca flotante con la estética de la landing, enlaces activos e iconos con la paleta existente. En móvil se despliega mediante botón; no se añade una tarjeta al contenido. Configuración ahora son rutas independientes: `/account/settings/profile`, `/account/settings/security`, `/account/settings/connections`; `/account/settings` redirige a Perfil. Sustituye la navbar horizontal anterior solo en la cuenta.

Postulación: categorías múltiples con casillas accesibles y pasos visibles. JSON `categories` contiene la selección sin duplicados y `category` conserva la primera por compatibilidad. Los registros anteriores siguen funcionando sin migración ni cambios masivos. La validación exige al menos una categoría para enviar y rechaza valores desconocidos. Se muestran todas en revisión/ficha pública y el catálogo incorpora la solución en cada categoría aprobada. Las actualizaciones mantienen la versión pública previa hasta aprobarse.

Validación: 22 pruebas unitarias, lint/tipos, build aislado y flujo integral con dos categorías desde borrador hasta publicación/revisión. Revisadas navegación de configuración y selección múltiple en navegador, incluido móvil de 375 px. Correo de recuperación y Google mantienen sus pendientes previos; no se activaron integraciones externas.

Pulido de sidebar: jerarquía más compacta, estado activo con el acento de cada sección, CTA de postulación separado, perfil inferior con menú desplegable hacia arriba (perfil, seguridad y cerrar sesión). El menú cierra al navegar, pulsar Escape, perder foco o pulsar fuera; incluye foco visible y movimiento reducido. Conserva borde izquierdo recto, esquinas derechas redondeadas y 24 px de margen vertical. No se añadieron métricas ni funciones simuladas.

Reestructura de navegación: la sidebar contiene Mis soluciones, Explorar catálogo, Configuración y el enlace de identidad al perfil. «Postular solución» lleva únicamente el + a la derecha; se retiraron flecha y puntos de estado. Configuración abre un centro real en `/account/settings` con enlaces a Perfil, Seguridad y Cuentas vinculadas. Las subpáginas incluyen vuelta al centro. Se eliminó el menú de cuenta desplegable y Cerrar sesión de la sidebar; cerrar sesión está en Seguridad. Guardados y listas de comparación para compradores siguen como propuesta, no funciones implementadas.
