# Configuración de cuenta

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

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
