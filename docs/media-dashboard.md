# Capturas, información pendiente e inicio adaptativo

Entrega del 30 de agosto de 2026. Implementa la ampliación de los puntos 1 y 7 y
el inicio del punto 6 del plan. Desarrollo local con persistencia real; no implica
push ni despliegue a producción. No se alteran las fichas reales de Cord/Flouvia
ni se inventan sus capturas, precios o resultados.

## Recorrido del fundador

1. En `/account`, elegir Fundador o Ambos. La primera vista se infiere del perfil;
   sin perfil conocido, de si existen soluciones propias. Puede cambiarse después.
2. Inicio muestra publicaciones y solicitudes nuevas reales, hasta tres fichas
   que necesitan atención y hasta cuatro solicitudes recientes del modo elegido.
3. `/account/solutions` conserva el listado anterior. `/account` ahora es Inicio.
4. En el editor, consultar la guía de información: cada bloque permite ir al paso
   correspondiente. El contador indica información aportada, no calidad validada.
5. En el paso de problema/público, añadir límites de encaje, enlace de demo y hasta
   cuatro capturas con sus descripciones. Reordenar con botones, sin arrastre obligado.
6. Guardar explícitamente. La vista previa abre el borrador **guardado**, no el
   contenido aún sin guardar. Es privada; no sirve como enlace público compartido.
7. Enviar a revisión. El revisor puede abrir la misma presentación para consultar
   las imágenes y el contexto. La ficha aprobada se conserva hasta otra aprobación.

Una actualización de un proyecto ya publicado vuelve el borrador a `draft`,
pero no cambia `published_data`. La fecha pública solo cambia cuando se aprueba.
Guardar, subir un archivo o cambiar el modo del dashboard no publica nada.

## Contenido de las fichas

Campos JSON opcionales nuevos en `SolutionData`:

| Campo | Contrato |
| --- | --- |
| `demoUrl` | Hasta 500 caracteres, HTTP(S), sin credenciales; enlace externo, nunca iframe |
| `notFor` | Hasta 500 caracteres para explicar cuándo no encaja |
| `screenshots` | Hasta 4 objetos únicos `{id, caption}`; UUID v4, descripción hasta 180 caracteres |

Al enviar, las capturas seleccionadas necesitan descripciones de al menos tres
caracteres. Un borrador puede tener descripciones vacías. Las fichas anteriores
sin estos campos siguen funcionando; no se exigen imágenes/demo para publicar.
Las URLs de demo no se descargan desde el servidor. No hay subida de video.

La presentación compartida por público y vista previa incluye galería, miniaturas,
ampliación con diálogo, anterior/siguiente, cierre con Escape y devolución del foco.
Sin autoplay. La imagen se contiene completa, sin recorte que esconda información.
Si no hay capturas o información se indica la ausencia. Los datos se identifican
como declarados por el proyecto; la revisión no certifica seguridad ni resultados.
El correo privado de contacto no se muestra ni se envía a componentes de galería.

## Guía de información y vigencia

Nueve bloques: identidad/categorías; problema/cliente; alcance/límites; capturas
con contexto; demo; precio/implementación; integraciones/soporte; evidencia/contacto.
Estos bloques agrupan campos; una ausencia hace que el bloque quede pendiente.
No son una puntuación, un ranking ni un criterio automático de aceptación.

En Inicio, las fichas con cambios solicitados aparecen primero. También se muestran
borradores, estados de revisión y fichas con información pendiente. Si existe
publicación y han pasado **más de 90 días** desde `published_at`, se invita a
revisar los datos. Las publicaciones antiguas sin fecha muestran que no hay fecha
registrada: la migración no inventa una. No hay caducidad automática, email, cron
ni botón que actualice la fecha sin una revisión editorial.

## Capturas: almacenamiento, permisos y concurrencia

Migración aditiva `db/solution-media-dashboard.sql` después de auth y soluciones:

- `solution_media`: UUID, solución propietaria con FK en cascada, `storage_key`
  (ruta del blob), `bytes`, `checksum` (sha256), ancho, alto y fecha. Índice por
  solución/fecha; índice único parcial por `storage_key`.
- `founder_solutions.published_at`: fecha de la última aprobación, nullable.
- `auth_accounts.dashboard_mode`: `buyer`, `founder` o `both`, nullable.

**Los bytes viven en Vercel Blob (store privado `shwcs-blob`), no en Postgres.**
Migración `db/media-storage.sql` (fases 1–4) + `db/media-storage-drop.sql` (fase 5,
elimina la columna `content_base64` que usaba el MVP). Aplicadas a `neondb` y a
`shwcs_production` (5 sep 2026). Detalle completo en CLAUDE.md §58. Las claves de
blob nunca se derivan del contenido; la portada de sitio y el avatar acuñan clave
nueva en cada re-escritura para que el trigger de `storage_orphans` limpie la
vieja sin ambigüedad. No se exponen URLs públicas de blob: todo pasa por la ruta
proxy, que aplica el mismo predicado de autorización que antes.

| Endpoint | Permisos y comportamiento |
| --- | --- |
| `GET /api/solutions/:id/media` | Solo propietario; lista IDs/dimensiones/uso, no devuelve base64 |
| `POST /api/solutions/:id/media` | Sesión, origen propio, dueño, no pendiente; valida/normaliza y guarda archivo |
| `GET /api/solutions/:id/media/:assetId` | Público si lo referencia `published_data`; dueño siempre; revisor solo si no es draft y el archivo está referenciado en `data` |
| `DELETE /api/solutions/:id/media/:assetId` | Dueño, origen propio, no pendiente; solo archivos ausentes de borrador guardado y publicación |

Restricciones: JPG/PNG/WebP estático, entrada hasta 2 MiB leída con límite de
stream, hasta 16 megapíxeles. Sharp decodifica, orienta y elimina metadatos;
normaliza a WebP calidad 80, dentro de 1600 × 1200 sin ampliar. Salida máxima
400 KiB. Rechaza SVG, animaciones, archivos corruptos y formatos falsificados.
Máximo 12 archivos almacenados por solución y 4 seleccionados por ficha.
Límite por cuenta de 30 intentos de subida/hora y global de 60/minuto.

Subir no referencia automáticamente el archivo en BD: el editor lo selecciona
y el fundador debe guardar. La biblioteca permite reutilizar archivos o borrar
los que ya no estén guardados/publicados, con confirmación. Quitar de la ficha
solo modifica la selección; no borra el archivo aprobado. “Actualizar archivos”
refresca el uso guardado después de editar. Ante timeout, revisar archivos antes
de repetir: la subida no tiene clave de idempotencia y pudo haberse guardado.

Guardar valida que cada UUID pertenezca a esa solución. Subir/guardar/borrar
bloquean la fila padre durante la transacción; conservar la comprobación de
versión al guardar. Una carrera guardar/borrar no puede dejar referencias rotas.
La revisión sigue publicando el snapshot y su evento atómicamente. Si una captura
se retira de la nueva aprobación, deja de ser pública aunque el dueño la conserve.

Respuestas de imagen: `image/webp`, `nosniff`, `private, no-store`; evita que una
caché compartida conserve imágenes privadas o retiradas. No hay optimización
pública de Next Image (`unoptimized`), CDN ni URLs persistentes sin autorización.
El archivo no referenciado sigue privado incluso para revisores. Queda pendiente
limpieza operativa de archivos abandonados y cuota global de almacenamiento por
cuenta; los 12 archivos por solución no sustituyen esos controles.

## Inicio para compradores y cuentas mixtas

El selector guarda una preferencia mediante `POST /api/account/dashboard`.
Exige origen propio y sesión; actualiza solo el ID de la sesión. No acepta permisos
ni cambia el perfil descriptivo, el rol, la propiedad o el acceso editorial.
La navegación permanece compartida: una misma cuenta puede comprar y publicar.

- **Comprador:** totales de guardados/listas, tres listas recientes, solicitudes
  enviadas recientes y acciones para explorar/organizar opciones.
- **Fundador:** total publicado/nuevas solicitudes recibidas, fichas por mejorar,
  solicitudes recibidas y acciones para preparar la primera ficha.
- **Ambos:** reúne ambos recorridos sin duplicar cuentas.

Consultas de servidor paralelas, siempre limitadas por propietario/comprador/
destinatario. No se calculan supuestos leads a partir de guardados; no se comparten
notas/listas con fundadores. “Conversaciones en movimiento” representa solicitudes
recientes, no mensajes sin leer ni un chat en tiempo real. Los contadores de listas
incluyen referencias guardadas aunque algún proyecto ya no esté disponible; el
comparador existente vuelve a validar disponibilidad.

## Verificación y límites

- `npx tsx --test tests/*.test.ts`: 37 pruebas unitarias pasando.
- `RUN_MEDIA_INTEGRATION=1 node tests/integration/media-dashboard.cjs`: prueba
  opt-in contra localhost y BD configurada. Crea cuentas temporales, verifica
  normalización/límites, propiedad, vista previa, permisos editoriales, snapshot
  público, fecha, borrado protegido, IDs ajenos y carrera guardar/borrar; además
  persistencia del modo, aislamiento de cuenta y separación de permisos/perfil.
- `RUN_CONTACT_INTEGRATION=1 node tests/integration/contacts.cjs`: regresión de
  comparación, contactos, estados, concurrencia y privacidad. Una primera corrida
  encontró un error transitorio de render/HMR en dev; la repetición completa pasó.
- Cuentas temporales y datos relacionados se eliminan al terminar. Nunca usar
  la cuenta real del usuario como fixture, ni modificar sus proyectos para probar.
- Lint/TypeScript y build en copia aislada sin `.env.local`. Nunca ejecutar build
  en el mismo `.next` de un servidor dev activo.

Quedan fuera: hosting de videos, verificación de casos/identidad, análisis automático
de calidad, emails de actualización, notificaciones push, métricas de conversión,
Google y preparación final de lanzamiento. No se certifica producción por estas pruebas.


### Ancho uniforme y acceso al catálogo

Todas las páginas privadas usan `.account-page`: `w-full max-w-6xl mx-auto`,
24 px de margen interior horizontal y la misma separación vertical que Inicio.
Aplica también a configuración, creación/detalle de soluciones, listas/comparador,
contactos/oportunidades, revisión, preview y errores. No añadir límites de ancho
individuales al contenedor de página. Los párrafos/formularios pueden mantener
anchos legibles dentro de esa estructura; no cambiar marketing o login.
“Explorar catálogo” está en el bloque inferior de la sidebar, justo encima del
menú de cuenta; no entre los enlaces principales. En móvil conserva ese orden.


Verificación visual local: escritorio y móvil de 375 px, selector de tres modos,
edición de descripción y orden de capturas con persistencia, preview y ampliación,
cambio de imagen, cierre con Escape y restauración del foco. Ancho móvil sin
scroll horizontal de página. La subida/decodificación se comprobó por API en la
integración; la galería usa capturas sintéticas solo de la cuenta de prueba.


Ampliación posterior: formulario guiado de 14 preguntas, creadores y redes separadas;
ver [ficha guiada](guided-solution-form.md). Conserva las cuatro fases internas.

## Inicio visual — 30 agosto 2026

Se retiran las tarjetas grandes de contadores, el subtítulo de propósito y los párrafos de acompañamiento. El encabezado conserva el saludo y Comprador/Fundador/Ambos. Fundadores ven sus proyectos recientes con portada, estado y una acción de seguimiento; compradores ven mosaicos de listas y últimos guardados. La actividad solo aparece cuando hay solicitudes reales; no hay bloques vacíos ni indicadores ficticios. Se eliminaron las consultas de contadores y listas duplicadas de `dashboardData`.

El acceso al catálogo, contactos y oportunidades sigue en la sidebar. La preferencia de vista sigue sin cambiar permisos. Todos los apartados conservan el contenedor compartido `.account-page`. Portadas y privacidad de tableros se describen en `buyer-library.md`.
