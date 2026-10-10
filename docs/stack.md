# Stack y operación — 31 agosto 2026

| Capa | Tecnología / estado |
| --- | --- |
| Aplicación | Next.js 15.5.24, React 19.2.8, App Router, TypeScript estricto |
| Interfaz | Tailwind 3, GSAP, Lucide, piezas propias; cinco acentos suaves |
| Datos | Neon HTTP parametrizado; db/*.sql es el esquema operativo |
| Auth | Scrypt, sesiones opacas hash, cookies HttpOnly, recuperación/verificación; OAuth Google con jose |
| Imágenes | Sharp, WebP; bytes en Vercel Blob privado, metadatos y permisos en Neon |
| Correo | API Resend + outbox transaccional; falta activar proveedor/scheduler |
| IA | Ninguna: la búsqueda es léxica y local (src/lib/search) |
| Hosting | Configuración Vercel presente; proyecto correcto y despliegue pendientes |

La actualización de Next usa async cookies/params/searchParams y pruebas adaptadas.
PostCSS 8.5.26 está forzado para Next mediante overrides; no eliminar sin revisar
la auditoría. Quedan cuatro vulnerabilidades moderadas de herramientas de desarrollo;
la auditoría --omit=dev reportó cero en esta revisión. No garantiza ausencia de fallos.

## Estructura

Root layout: HTML, Inter y salto al contenido.
(marketing): navbar/footer, catálogo aprobado, fichas y páginas informativas.
(focused): auth/newsletter/recuperación/verificación sin chrome comercial.
account: sidebar, cuenta, publicaciones, biblioteca, contactos, avisos y métricas.
api: handlers con autorización, validación, límites y consultas parametrizadas.

El esquema vive solo en db/*.sql y se aplica con `npm run db:migrate -- db/<archivo>.sql`.
No hay ORM: el diseño Drizzle anterior y sus dependencias se retiraron.

## Comprobaciones

npm ci; npm run lint; npm run typecheck; npm test; npm run build.
CI en .github/workflows/ci.yml repite esas comprobaciones y audit --omit=dev en PR y
push a main con Node 22. Su ejecución remota no se verificó. Vercel Git puede
desplegar independientemente; configurar checks/restricciones del proyecto correcto.

Integraciones opt-in contra localhost:3000, con cuentas temporales y limpieza:
- RUN_CONTACT_INTEGRATION=1 node tests/integration/contacts.cjs
- RUN_MEDIA_INTEGRATION=1 node tests/integration/media-dashboard.cjs
- RUN_LAUNCH_INTEGRATION=1 node tests/integration/launch.cjs

No ejecutar dev y build en la misma salida .next a la vez. Usar copia aislada de
src/public/config/package, sin .env, con node_modules enlazado. Si se mezcla la
caché, detener el proceso afectado y regenerar .next; no borrar trabajo fuente.
Tailwind importa plugins por ESM para funcionar también con Node 24 local.

## Lanzamiento

vercel.json indica nextjs, npm run build, salida .next. No exportar estáticamente
para ocultar errores de rutas dinámicas. /api/health es solo liveness. Preflight
muestra configuración faltante sin secretos; aún hacen falta proveedor de correo,
Google, cron, responsable editorial, revisión legal y pruebas del despliegue.

Ver [launch.md](launch.md), [entorno](env.md) y [CLAUDE.md](../CLAUDE.md).
