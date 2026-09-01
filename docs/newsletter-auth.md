# Newsletter, acceso propio e interacción

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

## Implementado

- `/newsletter`: correo y consentimiento explícito, independiente de una cuenta. Los botones de navbar/footer tienen destino real.
- `POST /api/newsletter`: normalización de correo, validación, mismo origen, cuerpo limitado y honeypot. Inserta sin duplicados; no revela membresía ni reactiva bajas.
- `/sign-in`, `/sign-up`, `/account`: acceso propio, sin Clerk. La cuenta comprueba la sesión en servidor y redirige si no existe.
- `POST /api/auth/login`, `/register`, `/logout`: contraseña scrypt con sal aleatoria (N=131072, r=8, p=1); sesión aleatoria de 256 bits, guardada como SHA-256; cookie HttpOnly, SameSite=Lax y Secure en producción; expiración absoluta de siete días. Login rota la sesión actual; logout revoca en servidor. Sin contraseñas en texto claro ni tokens en localStorage.
- Límites de auth en Neon: 10 intentos por correo/15 minutos y 120 globales/minuto, contadores atómicos entre instancias. Complementar con protección perimetral antes de exposición pública; un límite global puede afectar usuarios legítimos durante ataques.
- Navbar: buscador que se extiende a la izquierda, enfoca el campo, envía con Enter y cierra con Escape. Busca desde cualquier página mediante `/?q=...#catalogo`.
- Microinteracciones: presión de 1px y flechas de 2–3px, sin seguimiento de cursor ni magnetismo. Movimiento reducido desactiva efectos nuevos y los de texto/menú de navbar.

## Base y activación

Durante esta implementación apareció `.env.local` con conexión Neon. Se comprobó que el esquema contenía las tablas `users`, `products`, `product_embeddings`, `endorsements` y `leads` del proyecto. Se aplicaron de forma aditiva `db/auth.sql` y `db/newsletter-subscribers.sql`, sin modificar las tablas existentes. No se imprimieron credenciales ni se subió `.env.local`.

La selección del servidor acepta `NEON_DATABASE_URL`, `DATABASE_URL` o `POSTGRES_URL`. Si otra rama/entorno apunta a otra base, necesitará las mismas tablas. No se confirma por ello un despliegue en Vercel; hay que desplegar estos cambios y verificar ese entorno.

## Pendientes antes del lanzamiento

Newsletter guarda registros, pero NO envía correos todavía. Conectar proveedor/remitente, confirmación de propiedad del correo, baja por enlace seguro, filtro de bajas, protección contra abuso y aviso de privacidad/retención antes de campañas. No hay bienvenida automática ni frecuencia semanal prometida.

Auth no verifica correo ni permite recuperar/cambiar contraseña aún; necesita la integración de correo. No tratar el email como identidad verificada ni asociar estas cuentas con el esquema `users`/productos por coincidencia de correo. Las tablas `auth_accounts` están separadas del esquema de negocio aún sin integrar. Añadir mantenimiento de sesiones/contadores vencidos y una revisión de seguridad antes del lanzamiento.

`npm audit --omit=dev` reporta vulnerabilidades altas en Next.js 14.2.35 y PostCSS transitivo. No se aplicó automáticamente un salto mayor de framework; resolver y volver a auditar antes de publicar autenticación.

## Verificación

`npx tsx --test tests/*.test.ts`, lint, TypeScript y build en copia aislada. Pruebas locales cubren búsqueda, consentimiento, validación, errores, hash y cookies. La prueba integral contra la base se realiza con correo/contraseña temporales y limpia únicamente los registros de prueba.

Referencias: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

Prueba integral confirmada: registro duplicado seguro, rechazo de contraseña incorrecta, login, página protegida, logout, rechazo de sesión revocada, newsletter sin duplicados y baja conservada. Se eliminaron cuenta, sesiones, correo y contador de intentos temporales.

## Segmentación del newsletter

La página usa tres pasos sobre el fondo, sin tarjeta exterior ni bullets: perfil, rol, correo/consentimiento. Navegación anterior/siguiente con respuestas conservadas, validación por paso y transiciones breves con movimiento reducido.

Se aplicó `db/newsletter-segments.sql`: `profile` y `role` son columnas opcionales para registros anteriores, obligatorias y validadas para nuevas solicitudes. Perfiles: `founder`, `buyer`, `both`, `exploring`. Roles: `leadership`, `product_tech`, `sales_marketing`, `operations`, `finance_procurement`, `other`. Consentimiento nuevo `newsletter-v2` informa uso de perfil y rol.

Segmento de fundadores: `profile IN ('founder', 'both')`; compradores: `profile IN ('buyer', 'both')`. Filtrar siempre `unsubscribed_at IS NULL`. Los NULL históricos siguen sin clasificar. No se sobrescriben preferencias ni bajas de correos existentes desde un formulario público sin verificar su propiedad. Este cambio guarda datos de segmentación; no crea campañas ni activa envíos.

En instalaciones nuevas, aplicar primero `db/newsletter-subscribers.sql` y después `db/newsletter-segments.sql`.

Acceso y registro: encabezado «Bienvenido a shwcs», composición centrada directamente sobre el fondo, sin tarjeta exterior. Campos transparentes con iconos y CTA azul suave. Google aparece como botón deshabilitado con aviso «Próximamente»; OAuth no está conectado. Se conserva el acceso real por correo/contraseña.

## Dashboard MVP y validación propia

`/account` incluye perfil editable (nombre, empresa opcional, perfil y rol), soluciones reales para explorar, enlace al newsletter y cierre de sesión. No hay métricas ficticias, permisos elevados por rol ni inferencia de suscripción por coincidencia de correo. La identidad del `PATCH /api/account` se obtiene exclusivamente de la sesión. La cuenta no cambia su email ni preferencias de otra suscripción.

Se aplicó `db/account-profile.sql` de forma aditiva. Cambios de perfil persistidos en `auth_accounts`; newsletter sigue separado hasta verificar propiedad del correo. `profile` y `role` describen al usuario, no son permisos administrativos.

Login/registro usan `noValidate` y mensajes propios vinculados a los campos, con foco en el primer error. Mínimo de contraseña solicitado: 6 caracteres. No se anuncia máximo ni se trunca el input; se conserva un límite técnico de 4096 caracteres y 32 KB de cuerpo para proteger el servicio. Se recomiendan frases largas: seis caracteres ofrece menos protección, y sigue pendiente revisión antes de exposición pública. Hash y cookies no se debilitaron.

Configuración de cuenta: `/account/settings` incluye perfil/foto y cambio de contraseña real con cierre de sesiones. Recuperación implementada, pendiente de activar correo (`RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `AUTH_APP_ORIGIN`). Google sigue sin conectar. Migración `db/account-settings.sql` aplicada. Ver [account-settings.md](account-settings.md) para alcance, límites y pruebas.
