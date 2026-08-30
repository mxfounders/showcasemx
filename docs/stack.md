# Stack y operación — ShowcaseMX

## Tecnologías presentes

Consultar `package.json` y `package-lock.json` para versiones y resolución exactas.

| Capa | Tecnología | Estado |
| --- | --- | --- |
| Aplicación | Next.js 14.2.35 / React 18 / App Router | Home y layout implementados |
| Lenguaje | TypeScript estricto | Comprobación local disponible |
| Estilos | Tailwind CSS 3, tokens CSS | Interfaz clara y cinco acentos |
| Componentes | shadcn, Base UI, Lucide | Botón base y componentes propios |
| Animación | GSAP 3 | Hero, navegación y explorador |
| Datos | Drizzle + Neon HTTP | Cliente/esquema, no usados por la home |
| Autenticación | Clerk | Dependencia, sin provider/middleware/webhook |
| IA | Vercel AI SDK + proveedor OpenAI | Dependencias, sin endpoint |
| Búsqueda vectorial | Tipo custom `vector(1536)` | Solo esquema; integración pendiente |
| Despliegue | Vercel + GitHub | Configuración presente; resultado remoto sin verificar aquí |

Clerk gestionará autenticación; Drizzle realiza consultas y persistencia, no
sustituye auth. Los permisos deberán comprobarse en servidor.

## Flujo actual de renderizado

`layout.tsx` incluye navbar y footer. `page.tsx` compone `Hero` y
`CategoryExplorer`. Estos componentes interactivos usan cliente; la página sigue
siendo Server Component. No hay API routes ni Server Actions de negocio.

`catalog-preview.ts` contiene tipos, Cord y Flouvia y 57 ejemplos ficticios. `brand-colors.ts`
centraliza cinco paletas y el mapa de rutas compartido por navbar y footer.
`db/index.ts` crea el cliente Neon al importarse y requiere una URL válida.

## Arquitectura propuesta, no implementada

- Consultas reutilizables en `src/db/queries/` cuando exista el catálogo real.
- Autorización y validación separadas de la presentación.
- Búsqueda: consulta → embedding → productos aprobados por similitud → respuesta
  explicada. El esquema reserva 1536 dimensiones, pero generación, índices,
  modelos, límites y evaluación siguen pendientes.
- Ninguna búsqueda debe crear automáticamente un lead comercial.

## Validación local y CI

```bash
npm ci
npm run dev
# En otro momento, sin dev usando la misma carpeta de salida:
npm run check
```

`check` ejecuta lint, TypeScript y build. Para lint/tipos sin build:

```bash
npm run lint
npm run typecheck
```

`.github/workflows/check.yml` usa Node 22, `npm ci` y `npm run check` en push y PR.
La existencia del workflow no prueba que se haya ejecutado remotamente. No hay
suite automatizada de pruebas funcionales definida en package.json.

Se comprobaron localmente build, tipos, lint, categorías, fichas, teclado y
adaptación del explorador. Estas comprobaciones no cubren servicios aún sin integrar.

## Evitar conflictos de caché

No lanzar dev y build simultáneamente sobre el mismo `.next`, ni varios dev en
el mismo checkout. Durante esta sesión se observaron errores de estilos y módulos
`vendor-chunks` por salidas mezcladas. Para verificar mientras dev está abierto,
compilar una copia aislada con su propia carpeta de salida. Si ocurre el conflicto,
reiniciar el servidor afectado con caché regenerada; no borrar código fuente.

## Vercel

`vercel.json` fija:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

El log aportado mostraba compilación correcta seguida de un error por buscar
`public`. La configuración versionada aborda ese fallo. No crear una carpeta
`public` vacía ni activar exportación estática para ocultarlo.

Un push a la rama conectada puede iniciar el despliegue mediante la integración
Git de Vercel. Confirmar por separado aceptación del push, CI y estado del deploy;
no asumir que GitHub Actions bloquea por sí mismo el despliegue de Vercel.

Variables por integración en [entorno](env.md); cambios de datos en
[base de datos](database.md).

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.
