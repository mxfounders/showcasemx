# Variables de entorno — ShowcaseMX

## Qué necesita la versión actual

La home muestra ejemplos locales y no importa el cliente de base de datos.
Puede ejecutarse sin credenciales de Neon, Clerk u OpenAI. Eso no significa que
esas integraciones estén listas.

El archivo `.env.local.example` contiene únicamente placeholders. Copiarlo a
`.env.local` cuando se vaya a conectar un servicio y reemplazar solo los valores
necesarios. No commitear secretos ni incluir valores reales en documentación.

| Variable | Uso | Estado del código |
| --- | --- | --- |
| `NEON_DATABASE_URL` | Cliente Neon y herramientas Drizzle | Se lee al importar `src/db/index.ts` y en `drizzle.config.ts` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk | Integración pendiente |
| `CLERK_SECRET_KEY` | Operaciones servidor de Clerk | Integración pendiente |
| `OPENAI_API_KEY` | Embeddings/respuestas | Integración pendiente |

La presencia y validez de variables en Vercel o Neon no se verificaron en esta
actualización. La documentación anterior las daba por configuradas sin evidencia
suficiente; revisar cada entorno antes de conectar servicios.

## Configuración futura

Las rutas de login, registro, onboarding y dashboard no existen todavía.
Definir redirecciones al implementarlas. El webhook de Clerk necesitará su
configuración de verificación; no se ha añadido ni implementado aún.

## Reglas

- `NEXT_PUBLIC_` expone valores al navegador: solo usarlo para datos públicos.
- `NEON_DATABASE_URL`, `CLERK_SECRET_KEY` y `OPENAI_API_KEY` son secretos de servidor.
- Separar bases/credenciales de desarrollo, preview y producción.
- Antes de migrar, comprobar el entorno al que apunta `NEON_DATABASE_URL`.
- Drizzle carga `.env.local` mediante dotenv; Next carga su entorno al arrancar.
- El build descarga la fuente Inter configurada en el layout, por lo que puede
  necesitar acceso de red aun sin integraciones de negocio.

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.

Conexión: se acepta `NEON_DATABASE_URL`, `DATABASE_URL` o `POSTGRES_URL`, en ese orden, solo en servidor. Neon conectado en Vercel no confirma que exista `solution_applications`. La sesión CLI revisada solo accede al equipo flouvia, donde no aparece ShowcaseMX; tabla y envío remotos siguen sin verificar. No se cambiaron bases remotas.
