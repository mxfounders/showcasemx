# Guardados y listas

> Actualización vigente: las listas ahora pueden ser públicas por elección explícita. Ver [community-lists.md](community-lists.md). Propósito y notas siguen privados. Las secciones siguientes conservan el historial de implementación.

Etapa de evaluación del comprador, implementada el 30 de agosto de 2026. Una misma cuenta puede postular soluciones y evaluar proyectos; el perfil fundador/comprador no concede permisos adicionales.

## Recorrido

- Guardar desde la ficha del catálogo o desde /soluciones/[slug]. Los ejemplos ficticios no tienen este botón.
- Sin sesión, el acceso y registro conservan el proyecto pendiente. Al entrar se presenta para confirmar Guardar; un GET nunca modifica datos.
- /account/saved reúne proyectos sin duplicarlos por categoría.
- /account/lists permite crear listas con nombre y propósito; /account/lists/[id] permite editar, añadir proyectos guardados y escribir notas privadas por proyecto/lista.
- Un proyecto puede estar en varias listas con notas diferentes. Cada ficha muestra alcance, precio orientativo e implementación cuando hay información publicada.
- Configuración y Cerrar sesión permanecen exclusivamente en el desplegable de la cuenta.

## Datos y privacidad

Aplicar db/buyer-library.sql después de db/auth.sql. Migración aditiva aplicada a la base configurada localmente durante esta implementación; otra base de despliegue necesitará la misma migración.

buyer_saved_projects referencia catalog:cord, catalog:flouvia o solution:UUID. buyer_lists y buyer_list_items vinculan propietario mediante claves foráneas compuestas. Los guardados no copian metadatos: resuelven el catálogo actual y published_data, nunca el borrador privado del fundador. Si desaparece la publicación, se muestra no disponible; las notas se conservan hasta que el comprador las quite.

API /api/library: GET consulta estado de un proyecto; POST admite save, unsave, create-list, update-list, delete-list, add-to-list, remove-from-list, update-note. Sesión obligatoria; el propietario se obtiene del servidor. Mutaciones con mismo origen, cuerpo limitado, validación y límite de frecuencia. Respuestas sin caché y páginas privadas no indexables.

Límites: 200 guardados, 30 listas, nombre 100 caracteres, propósito 400, nota 2000. Inserciones idempotentes y cuota serializada por propietario; edición de lista/nota con versión para evitar sobrescritura desde pestañas antiguas.

## Eliminación

- Quitar de una lista elimina su nota, conserva el guardado y otras listas.
- Eliminar una lista elimina sus notas y asociaciones, conserva todos los guardados.
- Quitar de Guardados elimina ese proyecto de todas las listas y sus notas. Confirmación explícita.
- Eliminar una cuenta elimina sus datos de biblioteca en cascada.

No se notifica al fundador al guardar. Las listas pueden ser públicas desde la entrega del 31 de agosto; no hay colaboración ni métricas comerciales de listas. Ahora existe comparador y solicitud explícita de contacto con consentimiento: ver contacts.md. Guardar por sí mismo nunca crea una solicitud.

## Verificación

27 pruebas unitarias pasan, incluidas identidad estable, retorno seguro de autenticación y rechazo de peticiones sin sesión/origen correcto. Prueba de integración con dos cuentas temporales y Neon: persistencia, duplicados, múltiples listas, notas, versiones, acceso ajeno rechazado, publicación actualizada sin filtrar borradores, proyecto retirado y eliminaciones en cascada. Cuentas temporales eliminadas al concluir. Lint, TypeScript y compilación aislada de producción correctos.

Verificación visual adicional: guardar desde catálogo sin sesión → registro → acceso → retomar proyecto; crear lista, añadir Cord y persistir nota desde interfaz. Revisión escritorio y móvil a 375 px sin desbordamiento horizontal. Menú de cuenta comprobado con Configuración y Cerrar sesión, sin duplicado en navegación.

## Actualización visual — 30 agosto 2026

La presentación vigente sustituye los renglones largos por tableros visuales:

- `/account/lists`: mosaicos de cuatro espacios fijos (2 × 2) para portadas reales, nombre, cantidad y privacidad. Búsqueda local por nombre; crear lista abre un diálogo, no una columna permanente.
- `/account/lists/[id]`: cuadrícula de proyectos, selector visual buscable de guardados, notas privadas plegadas y edición del nombre/propósito. Comparar sigue disponible al tener al menos dos entradas.
- `/account/saved`: tarjetas con portada, descripción breve y acciones Guardado/Organizar. Organizar abre un selector buscable de listas y permite crear una lista y añadir el proyecto sin abandonar Guardados.
- Los diálogos nativos aíslan el foco, admiten Escape y devuelven el foco al botón. Transiciones discretas, sin movimiento con `prefers-reduced-motion`. Los errores de guardado son explícitos; nunca se simula persistencia.

`getBoards(owner)` obtiene las cuatro asociaciones más recientes por lista con `row_number`, orden estable y filtro del propietario. Solo entrega a la interfaz metadatos de lista y miniaturas, no notas. `resolveProjects` añade `image`: primera captura de `published_data` o imagen OG local del catálogo, nunca capturas del borrador. Sin imagen o si falla la carga, muestra el nombre con la paleta de marca. El inicio del fundador sí puede usar su captura privada porque la ruta y el recurso validan sesión y propiedad.

La creación desde Organizar consta de dos operaciones idempotentes: crear lista y añadir proyecto. Si la segunda falla, se informa que la lista existe y permite volver al selector para reintentar. No es una transacción única. Sin cambios de esquema, permisos ni límites; no incluye reordenamiento manual, portadas subidas por compradores, tableros compartidos o importación desde Pinterest.

Verificación actual: 37 pruebas unitarias, lint, TypeScript y build aislado. Integración de media ampliada: Guardados, mosaico y detalle usan captura aprobada cuando existe otra privada; otra cuenta no puede abrir la lista. Integración de contactos/comparación conserva notas, aislamiento, versiones y consentimiento. Navegador con cuenta temporal: crear lista, añadir Cord visualmente y crear otra desde Organizar sin navegación; limpieza posterior del fixture.

### Filtros y portadas de cuatro espacios

`BoardCard` siempre reserva cuatro celdas iguales; los lugares sin proyecto quedan vacíos, sin repetir imágenes. `getBoards` resuelve como máximo cuatro asociaciones recientes por lista.

`SavedGallery` filtra en el cliente únicamente los guardados privados entregados por el servidor: búsqueda por palabras sin distinguir acentos o mayúsculas (nombre, descripción, tipo y categorías), tipo, categoría y lista, incluida Sin organizar. Los filtros se intersectan; categorías secundarias también coinciden. Orden por guardado reciente/antiguo o nombre A–Z. Muestra cantidad de resultados, limpiar y estado sin coincidencias. Sin red por pulsación ni mutación de guardados al filtrar. `/account/saved?list=none` abre el filtro Sin organizar; también admite un ID de lista propia. Los demás filtros son locales y se reinician al recargar. Proyectos no disponibles conservan acciones para eliminarlos.

Pruebas de `library-filters.test.ts`: intersecciones, acentos, pertenencia múltiple, sin organizar, orden sin mutar entrada y proyectos retirados; total 39 unitarias.

### Encabezado y barra (14 de noviembre de 2026)

Sustituye lo que §26–§28 de CLAUDE.md decían de la composición de Guardados y Mis listas.

- **Encabezado**: título a la izquierda con una línea de resumen debajo; la acción de la página a la derecha. Guardados: «7 proyectos guardados · solo tú los ves» con candado, y «Mis alertas». Mis listas: «3 listas · 1 pública» y «Crear lista». Sin conteos repetidos más abajo. Guardados ya no repite «Mis listas», que está en la barra lateral (§27).
- **Barra de Guardados**, solo cuando sirve:
  - de 1 a 3 guardados, sin barra;
  - de 4 en adelante, orden y búsqueda a la derecha;
  - de 6 en adelante, también Tipo, Categoría, Industria, Tamaño y Lista a la izquierda.
- Cada menú muestra el nombre del eje hasta que se elige un valor y entonces muestra el valor (azul). Un filtro activo siempre se ve aunque haya pocos guardados (por ejemplo «Sin organizar» desde Inicio), para poder quitarlo.
- Con filtros activos aparecen «2 de 7 proyectos» y «Limpiar» junto al orden. En móvil, el orden queda bajo los menús y la lupa a la derecha; el conteo se anuncia, pero no se dibuja.
- Mientras el primer menú es texto, la fila se corre 16 px para que su texto quede alineado con el título; cuando es una pastilla azul, la pastilla queda en el borde.
- **Mis listas**: pestañas Todas/Privadas/Públicas solo si hay listas de los dos tipos; búsqueda desde 6 listas. El tile «Crear lista» sigue en la cuadrícula sin filtros.
- **Sin líneas**: ni bajo la barra ni alrededor de los estados vacíos. `LibraryEmpty` (`src/components/library/library-empty.tsx`) es el único estado vacío y sin coincidencias de las dos páginas: superficie discontinua, ícono, título sin punto, texto y acción. Sin listas, Mis listas muestra «Crea tu primera lista» en lugar de «No hay listas con estos filtros», y el botón del encabezado se oculta para no repetirlo.
- La tarjeta «El proyecto que querías guardar» es una tarjeta blanca, no un bloque entre dos líneas.
