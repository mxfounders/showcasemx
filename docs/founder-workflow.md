# Mis soluciones y revisión editorial

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

## Recorrido implementado

- `/account`: inicio adaptativo. `/account/solutions`: listado privado de soluciones propias y estado vacío con CTA. Cualquier cuenta puede postular, no solo quienes eligen perfil fundador.
- `/account/profile`: perfil/acceso anterior, conservado.
- `/account/solutions/new`: crea un borrador persistido, con UUID de reintento.
- `/account/solutions/[id]`: formulario guiado de 14 preguntas (cuatro fases internas por compatibilidad), guardar y continuar, guardar y salir, estado e historial.
- `/aplicar` y CTA de landing llevan al nuevo flujo. El destino de postulación se conserva en login/registro mediante una lista cerrada de redirecciones.
- `/account/review`: cola editorial exclusiva de cuentas incluidas en `solution_reviewers`. No se asigna permiso por perfil, correo ni parámetros enviados por cliente. No se puede revisar una solución propia.
- `/soluciones/[id]`: ficha pública basada solo en la versión aprobada. El catálogo y buscador incorporan las versiones publicadas por categoría. No incluyen contacto privado, propietario ni comentarios.

## Estados y versiones

`draft` → `pending` → `changes_requested`, `published` o `rejected`.

El fundador guarda y envía. Mientras está pendiente, no puede modificar la postulación. Una solicitud de cambios o rechazo incluye comentario y permite corregir/reenviar. El revisor debe explicar cada decisión.

Cada escritura compara `version` y aumenta su valor. Una pestaña desactualizada recibe 409, sin sobrescribir trabajo más reciente. Transición e historial se escriben atómicamente. Las decisiones se validan también en servidor, incluyendo autorización del revisor y prohibición de autorrevisión.

Al editar una publicada, `published_data` conserva la versión anterior; la nueva `data` pasa por revisión. Aprobar sustituye la versión pública. Pedir cambios/rechazar una actualización no elimina lo que ya estaba publicado. La interfaz lo aclara. No hay retirada/eliminación implementada.

Los borradores se guardan explícitamente con los botones (no autosave por cada tecla). La interfaz señala cambios pendientes y advierte al cerrar/recargar con cambios sin guardar. Usar “Guardar y salir” antes de abandonar el formulario.

## Datos y activación

Se aplicó `db/founder-solutions.sql`: `founder_solutions`, `solution_events`, `solution_reviewers`. No se modificaron tablas de productos ni se migraron postulaciones anónimas por coincidencia de email. El endpoint anónimo anterior `/api/applications` ahora devuelve 410 y dirige a la cuenta; sus filas históricas se conservan.

Ninguna cuenta real recibió permisos de revisión. Para habilitar al responsable editorial, identificar y comprobar la cuenta exacta antes de añadir su ID a `solution_reviewers` mediante operación administrativa controlada. El UI no permite otorgarse permisos. Las cuentas temporales de pruebas se eliminan junto a sus permisos.

El perfil y tipo de usuario son descriptivos, no autorizan operaciones administrativas. La propiedad de una solución siempre se toma de la sesión. Datos de contacto e historial son privados. Revisión editorial puede ver postulaciones enviadas, no borradores iniciales ajenos.

## Límites explícitos

Guardados/listas/contactos y capturas ya están implementados (ver documentos vigentes). No hay métricas de conversión, notificaciones por email ni verificación automática de titularidad del sitio. No se simulan esas funciones. Recuperación/verificación de email, controles adicionales contra abuso y alertas pendientes de dependencias siguen siendo requisitos antes del lanzamiento público.

La home consulta versiones publicadas en cada solicitud; mantiene las entradas locales si la base falla. Esto no confirma despliegue en Vercel: revisar credenciales y aplicar SQL en otros entornos antes de desplegar.

## Comprobaciones

Pruebas unitarias de datos parciales/completos, URL segura, identidad no controlada por cliente y acceso autenticado. Prueba integral con cuentas temporales distintas: propietario, ajeno y revisor; estado y concurrencia, envío/corrección/revisión/publicación, historial, privacidad de contacto y aislamiento de actualizaciones. Build aislado para no interferir con next dev.

Verificación en navegador: registro e inicio de sesión con retorno a postular, guardado y recuperación de borrador desde Mis soluciones, envío final e historial. Formulario comprobado a 375 px sin desbordamiento horizontal. Se corrigió una ambigüedad SQL en el orden del listado y el reintento de errores recarga los datos del servidor. Se eliminaron los datos temporales de estas pruebas.

Actualización del dashboard: sidebar blanca flotante con la estética de la landing, enlaces activos e iconos con la paleta existente. En móvil se despliega mediante botón; no se añade una tarjeta al contenido. Configuración ahora son rutas independientes: `/account/settings/profile`, `/account/settings/security`, `/account/settings/connections`; `/account/settings` redirige a Perfil. Sustituye la navbar horizontal anterior solo en la cuenta.

Postulación: categorías múltiples con casillas accesibles y pasos visibles. JSON `categories` contiene la selección sin duplicados y `category` conserva la primera por compatibilidad. Los registros anteriores siguen funcionando sin migración ni cambios masivos. La validación exige al menos una categoría para enviar y rechaza valores desconocidos. Se muestran todas en revisión/ficha pública y el catálogo incorpora la solución en cada categoría aprobada. Las actualizaciones mantienen la versión pública previa hasta aprobarse.

Validación: 22 pruebas unitarias, lint/tipos, build aislado y flujo integral con dos categorías desde borrador hasta publicación/revisión. Revisadas navegación de configuración y selección múltiple en navegador, incluido móvil de 375 px. Correo de recuperación y Google mantienen sus pendientes previos; no se activaron integraciones externas.

Avance del plan de conexión (primera fase): se retiró Configuración como enlace independiente de la sidebar; permanece en el desplegable de cuenta junto a Cerrar sesión. Postulación y ficha ahora admiten alcance (`scope`), precios (`pricing`), implementación (`implementation`), integraciones (`integrations`), soporte (`support`), evidencia (`evidence`) y enlace a caso/demo (`evidenceUrl`). Campos opcionales con límites de longitud y validación HTTP(S) sin credenciales. Se guardan en el JSON existente, por lo que no se alteran ni migran registros antiguos. Los revisores y el resumen de envío ven estos campos; solo se publican al aprobar.

La ficha pública organiza problema, cliente ideal, alcance, información comercial y evidencia. Las ausencias se indican explícitamente; no se inventan precios, garantías o casos. El correo de contacto continúa privado. La revisión editorial no se presenta como certificación. CTA real: visitar sitio oficial; solicitudes de contacto y guardados/listas ya están disponibles; métricas de conversión siguen pendientes. El catálogo consulta Neon con `cache: no-store` para evitar mostrar publicaciones obsoletas.

Validación: 23 pruebas unitarias; flujo integral de postulación, permisos, aprobación, publicación y aislamiento de actualizaciones con nuevos detalles. Build aislado, lint y tipos. Se usaron y eliminaron cuentas/fichas temporales de prueba.


## Estado vigente: fichas enriquecidas e inicio

La ampliación de capturas, galería, demo externa, límites de encaje, preview privada,
guía de información y seguimiento se detalla en [media-dashboard.md](media-dashboard.md).
El listado se movió a `/account/solutions`; Inicio ocupa `/account` y adapta acciones
al modo comprador/fundador/ambos persistido. No modifica permisos. La guía indica
información aportada y nunca certificación. `published_at` cambia solo al aprobar.
Las imágenes de borrador no sustituyen a las publicadas antes de la revisión.
Las notas históricas de configuración/sidebar no prevalecen sobre CLAUDE.md vigente.

Creadores/redes y persistencia por pregunta: [ficha guiada](guided-solution-form.md).
