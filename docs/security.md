# Seguridad de cuenta y datos

Revisión local: 1 septiembre 2026. Este documento describe controles en el
código; una revisión local no certifica la configuración externa de Vercel,
Google, Resend o Neon ni sustituye una prueba de penetración independiente.

## Acceso y sesiones

- Contraseñas con `scrypt` (N=131072, r=8, p=1), sal aleatoria por cuenta y
  comparación constante. El máximo de entrada evita trabajo criptográfico sin
  límite. El mínimo de seis caracteres se conserva por decisión de producto.
- Respuestas genéricas para login, registro y recuperación. El registro no inicia
  sesión en una cuenta preexistente y la recuperación retrasa respuestas para
  reducir enumeración por tiempo.
- Login limitado por cuenta, dirección de red y cuota global mediante contadores
  atómicos en Neon. Las mutaciones sensibles tienen cuotas por cuenta; formularios
  públicos combinan una dirección normalizada con la identidad pertinente.
- Tokens de sesión aleatorios de 256 bits. Neon conserva únicamente SHA-256 del
  token; la cookie es HttpOnly, SameSite=Lax, Secure en producción y de host.
  Cambiar contraseña o conexión Google revoca sesiones.
- Recuperación y verificación usan tokens aleatorios, guardados como hash, ligados
  al estado actual de la cuenta, con caducidad y consumo único.
- Google usa Authorization Code, PKCE S256, state, nonce, cookie temporal y JWT
  RS256 con issuer, audience, azp, tiempo y `email_verified`. No se guardan tokens
  de acceso. Un correo coincidente no vincula cuentas automáticamente.

## API, navegador y archivos

- Las mutaciones exigen `Origin` exacto, sesión cuando corresponde, tipo y tamaño
  acotados, validación positiva y respuestas `no-store` para datos privados.
- Cabeceras globales bloquean framing, objetos, cambio de base/form origin,
  detección MIME, cámara, micrófono y geolocalización. Producción activa HSTS.
- Avatares admiten JPG/PNG/WebP estático de hasta 2 MB y 16 MP; `sharp` decodifica,
  rota, redimensiona y vuelve a codificar WebP antes de almacenarlo.
- Los redirects de auth y enlaces de avisos se restringen a rutas internas
  conocidas. Los enlaces públicos se validan antes de publicarse.

## Neon y SQL

- Las rutas usan el tagged template de `@neondatabase/serverless` y cada valor de
  usuario viaja como parámetro. No hay `sql.unsafe` ni SQL formado por concatenación
  de entrada HTTP. Los únicos `sql.query(statement)` ejecutan archivos SQL
  versionados durante migraciones locales, fuera de las rutas públicas.
- Propiedad y permisos se vuelven a comprobar en cada `UPDATE`/`DELETE`; no se
  acepta `owner_id`, correo de cuenta ni estado editorial desde el cliente.
- Cambios concurrentes importantes usan versión CAS o bloqueo/transacción. Claves
  únicas vuelven idempotentes registro, listas, eventos, solicitudes y correo.
- Producción debe usar una base y credencial separadas de desarrollo/preview,
  `sslmode=require`, rotación de credenciales, PITR/backups comprobados y el menor
  privilegio posible. La URL de Neon nunca debe tener prefijo `NEXT_PUBLIC_`.

## Backoffice de operaciones

`ops/` es una app y una identidad de sesión separadas del producto (cookie y tabla
`ops_sessions` propias; contraseña compartida con `auth_accounts`). Resumen de
controles, con el detalle en [ops.md](ops.md):

- TOTP obligatorio con códigos de respaldo; consumo del factor, quema del reto y
  apertura de la sesión en una sola sentencia (sin carreras de reuso). Plazo de
  72 h para configurar el autenticador tras un alta o reinicio desde el panel.
- Sesiones de 8 h con cierre a los 30 min sin uso, atadas al user agent que las
  creó, máximo 5 por cuenta; alertas por correo de dispositivos nuevos (opcional).
- Modo seguro: un código TOTP nuevo, válido 10 min, para toda acción sobre cuentas,
  equipo, exportaciones y cierres masivos de sesión.
- CSP con nonce por petición sin `unsafe-inline`/`unsafe-eval` en producción, HSTS
  con preload, COOP/CORP, allowlist opcional de redes y rechazo temprano sin cookie
  en el middleware; cada página y ruta valida además la sesión en la base.
- Bitácora `ops_audit_log` de solo inserción y encadenada con SHA-256, verificable
  desde el panel; las mutaciones principales la escriben en la misma sentencia.
- Dos niveles (`reviewer`/`admin`); solo `admin` suspende cuentas, cambia el
  equipo, exporta datos y lee la bitácora y el estado del sistema.

## Límites de esta revisión

- No hay MFA/TOTP en el producto todavía. Google puede reducir dependencia de
  contraseña, pero no equivale a MFA obligatorio. El backoffice de operaciones sí
  exige TOTP (ver arriba).
- No hay WAF/captcha adaptativo ni detección central de credenciales filtradas.
- Falta probar producción después del primer deploy: cookies Secure, OAuth real,
  entrega/recuperación, cron, cabeceras, separación de bases y restauración.
- Aviso de privacidad, retención, eliminación de cuenta y términos requieren
  responsable y revisión legal antes del lanzamiento general.
