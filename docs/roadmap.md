# Roadmap — ShowcaseMX

## Estado: prototipo interactivo, base aún en consolidación

Las casillas completas describen código o comportamiento local comprobado. No
implican integración de backend, CI remoto aprobado o despliegue en producción.

### Implementado

- [x] Next.js App Router, React, TypeScript y Tailwind.
- [x] Home con hero de dos líneas y copy de descubrimiento/conexión.
- [x] Navbar y footer con iconos de una paleta compartida de cinco familias.
- [x] Explorador sin título ni fondo exterior, siete categorías y nueve tarjetas
  por categoría; tres columnas en pantallas grandes.
- [x] Cord (software) y Flouvia (servicio) con fichas y enlaces oficiales; ejemplos
  restantes claramente identificados. Ver [entradas reales](listings.md).
- [x] Cambio animado de categoría, navegación por teclado, diálogo de ejemplo,
  movimiento reducido en el explorador y adaptación móvil de esa sección.
- [x] Scripts de lint, typecheck, build y check; comprobados localmente.
- [x] Workflow de GitHub Actions definido para push/pull_request.
- [x] Configuración Vercel versionada: framework Next.js y salida `.next`.
- [x] Cliente y esquema Drizzle/Neon escritos.
- [x] Clerk y AI SDK instalados, sin integración.

## Orden propuesto para completar el producto

### 1. Base estable

- [ ] Confirmar despliegue real y ejecución remota de CI.
- [ ] Completar navegación móvil y revisar footer/contrastes en pantallas pequeñas.
- [ ] Dar tratamiento explícito a enlaces de funcionalidades todavía inexistentes.
- [ ] Unificar tipografía y extender movimiento reducido al resto de la interfaz.
- [ ] Alinear metadatos y texto del footer con el nuevo posicionamiento.

Salida: home navegable sin acciones engañosas, interfaz revisada y despliegue verificado.

### 2. Catálogo real

- [ ] Ajustar esquema para identificadores, slugs, categorías y ficha de producto.
- [ ] Generar/revisar migraciones y confirmar su aplicación al entorno correcto.
- [ ] Confirmar pgvector cuando se aplique el esquema que utiliza `vector(1536)`.
- [ ] Cargar un conjunto pequeño de productos reales revisados.
- [ ] Implementar `/explorar` y `/p/[slug]`, filtros y estados vacíos/de error.
- [ ] Sustituir ejemplos sin perder etiquetas honestas ni navegación accesible.

Salida: encontrar y entender productos reales; los no aprobados no se publican.

### 3. Identidad, administración y publicación

- [ ] Integrar Clerk, webhook verificado y vínculo único con `users`.
- [ ] Implementar roles y autorización en servidor.
- [ ] Construir `/aplicar`, revisión admin y edición de productos propios.
- [ ] Implementar transiciones de estado y registro de revisión.

Salida: un founder puede postular; solo un admin puede aprobar/publicar.

### 4. Contactos y leads

- [ ] Formulario de contacto con validación, consentimiento y control de abuso.
- [ ] Evitar duplicados por reenvíos y definir entrega/notificación al founder.
- [ ] Dashboard mínimo de productos y leads propios.
- [ ] Separar eventos de búsqueda y solicitudes comerciales.

Salida: la solicitud llega al responsable y no expone datos de otros founders.

### 5. Búsqueda por problema

- [ ] Recuperación de productos aprobados y evaluación de relevancia.
- [ ] Embeddings, consultas pgvector y actualización al editar productos.
- [ ] API de búsqueda, límites de uso y estados de carga/error/sin resultados.
- [ ] Respuestas IA basadas en productos recuperados, sin inventar herramientas.

Salida: explicar por qué una opción es relevante o admitir que no hay coincidencia.

### 6. Distribución y negocio

- [ ] SEO, sitemap y Open Graph para fichas reales.
- [ ] Medición de descubrimiento → ficha → solicitud de contacto.
- [ ] Probar hipótesis de monetización y política de productos propios/patrocinios.
- [ ] Priorizar newsletter, colecciones, drops, perfiles y endorsements según demanda.

Dashboard del comprador, guardados, eventos y métricas sofisticadas quedan después
del recorrido principal; no son requisitos del primer catálogo útil.

## Decisiones pendientes

Proveedor de correo, analytics, almacenamiento de imágenes, criterios de entrada,
modelo comercial y política de curaduría. No instalar servicios adicionales antes
de definir el flujo que los necesita.

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.
