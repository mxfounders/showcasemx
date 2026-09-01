# Variables de entorno

Estado 31 agosto 2026. Nunca imprimir valores ni versionar .env.local. Next carga
ese archivo; los scripts locales usan dotenv en silencio. Reiniciar dev al cambiar
variables. Separar bases de desarrollo, preview y producción.

| Variable | Uso |
| --- | --- |
| NEON_DATABASE_URL, DATABASE_URL o POSTGRES_URL | URL de servidor; prioridad en ese orden. Basta una. Necesaria para catálogo aprobado, cuentas, biblioteca, contactos y avisos. |
| AUTH_APP_ORIGIN | Origen canónico HTTPS sin ruta, query, fragmento ni credenciales. Se usa en enlaces de correo y callback Google. |
| RESEND_API_KEY | Envío transaccional: recuperación, verificación y avisos; no campañas automáticas. |
| AUTH_EMAIL_FROM | Remitente con dominio autorizado en Resend. |
| CONTACT_EMAIL_TO | Destino opcional del formulario público. Por defecto `contacto@shwcs.site`. |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | OAuth propio. Callback exacto AUTH_APP_ORIGIN/api/auth/google/callback. |
| CRON_SECRET | Secreto servidor de mínimo 32 caracteres para /api/internal/mail. Nunca en query. |
| AUTH_REQUIRE_VERIFIED_EMAIL | true para exigir verificación antes de crear contactos; activar tras probar entrega. |
| NEXT_PUBLIC_SHOW_DEMO_PROJECTS | false/ausente por defecto. true muestra ejemplos de diseño no contratables. No usar en catálogo público real. |
| LAUNCH_LEGAL_REVIEWED | true solo después de revisión humana de responsable, contacto y políticas; preflight no valida contenido legal. |
| OPENAI_API_KEY | Opcional/futuro. No hay búsqueda IA implementada. |

La conexión local de Neon tiene aplicadas las migraciones operativas, incluida
launch-foundation.sql. Eso no confirma otro entorno de Vercel. Revisar orden y
esquema en CLAUDE.md y docs/database.md antes de aplicar nuevas migraciones.

No hacen falta claves Clerk. Google admite localhost HTTP solo en NODE_ENV=development;
correo exige origen HTTPS incluso localmente. No copiar secretos a builds de prueba.

El envío, Google y scheduler siguen pendientes de credenciales/configuración externa.
Ejecutar npm run preflight para ver indicadores sin valores secretos. Un build
correcto no demuestra acceso a BD, entrega real ni callback configurado.

Operación, pruebas y activación: [launch.md](launch.md).

Para el sitio público de producción, `AUTH_APP_ORIGIN=https://shwcs.site` y el
remitente previsto es `AUTH_EMAIL_FROM=shwcs <hola@shwcs.site>`. La configuración
local ya tiene ambos valores y una clave Resend; repetirlos en el proyecto correcto
de Vercel y probar recepción, rebote y enlaces antes de declarar correo activo.
`ops.shwcs.site` no debe reutilizar este origen como callback de forma implícita:
definir su estrategia de autenticación y alcance cuando exista esa aplicación.
