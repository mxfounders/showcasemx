# Postulación guiada, creadores y redes

Entrega original 30/08/2026, ampliada el 5/09/2026 (CLAUDE.md §59). Sustituye
la interfaz anterior de cuatro pantallas largas. Conserva las cuatro fases
internas para compatibilidad, pero presenta **17 preguntas cortas**: nombre,
tipo/categorías, problema, **qué hace en concreto (capacidades)**, audiencia,
a quién sirve (industrias/tamaño), alcance, creadores, enlaces, capturas, demo,
contratación (modelo/rango de precio), implementación/arranque/soporte,
**con qué se conecta**, **qué cumplimiento acredita**, evidencia, sitio/contacto
y revisión final. Las tres preguntas en negrita son la ampliación de §59; el
resto es la entrega original de esta página.

## Interacción

Sobre el mismo fondo y ancho de cuenta; sin tarjeta contenedora. Una pregunta
visible a la vez, avance persistido, transición GSAP de 220 ms (desactivada con
reduced motion), foco en el título y desplazamiento a la pregunta al avanzar.
El índice desplegable permite ir a cualquier pregunta guardando el borrador actual.
Anterior también guarda; no asumir que avanzar significa que todos los campos
opcionales ya están completos. Guardar y salir conserva incluso borradores incompletos.

Enter en un input continúa; Ctrl/Cmd+Enter en texto también. Enter en un textarea
normal añade un salto de línea. Se respeta composición IME. **Nunca se envía a
revisión con el atajo global**: hace falta activar el botón final. Botones/controles
quedan bloqueados durante escritura/subida. El guardado mantiene CAS y no simula
éxito al fallar. Si la revisión final encuentra errores, vuelve a la pregunta adecuada.
El panel de seguimiento de la postulación se conserva debajo del editor.

## Datos públicos optativos

- `founders`: máximo tres objetos `{name,role,bio,links}`; nombre 100, rol 80 y bio
  400 caracteres; hasta cuatro enlaces por persona. Nombre obligatorio si se añade
  una persona, pero se puede eliminar el bloque o no añadir ninguno.
- `projectLinks`: hasta seis `{label,url}` con etiqueta permitida y URL de hasta
  500 caracteres. LinkedIn, X, Instagram, YouTube, GitHub, Product Hunt, TikTok,
  sitio, documentación, precios o contacto.
- Arrays/longitudes validados en servidor. Se eliminan campos no reconocidos;
  no aceptar flags de identidad verificada ni información de la cuenta del cliente.
- Borradores permiten campos vacíos; envío valida nombres y URLs HTTP(S) sin
  credenciales. El público filtra URLs inseguras antes de renderizar.
- No se extrae información privada del perfil. La interfaz pide compartir datos
  con autorización; nada de email/avatar privado agregado automáticamente.
- Personas y enlaces aparecen en ficha/preview y resumen de revisión. Se publican
  solo con snapshot aprobado. No prueban titularidad ni reputación.

## Reanudación y compatibilidad

`db/solution-profile.sql` añade `editor_question` nullable (ID estable, máximo 64).
`PATCH /api/solutions/:id` acepta `question` opcional, valida que exista en
`solutionQuestions` y corresponda a la fase `step` 0..3. Actualiza ambos dentro de
la escritura versionada existente. Sin `question`, conserva compatibilidad con
clientes anteriores y deja la reanudación por fase. No cambiar la constraint de
step ni reescribir masivamente borradores antiguos.

`questionIndex` prefiere ID válido, de lo contrario el primer paso de la fase
legacy. La guía de completitud tiene **doce bloques** desde §59 (antes diez,
que ya incluían creadores con presencia pública; la cifra "nueve" de entregas
más antiguas describe un estado previo a la pregunta `market`). Sigue siendo
cobertura informativa, nunca puntuación.

## Capacidades, integraciones, precio, arranque y cumplimiento (§59)

`capabilities` no tiene estado `[]`: una solución hace algo concreto o no lo
hace, así que solo `undefined` (nunca contestada) es un hueco, y se exige al
menos una para enviar a revisión — igual que antes exigía `industries`/
`companySizes` declarados, no una lista específica. El editor las agrupa por
categoría ya declarada y sugiere capacidades leyendo `problem`/`audience`/
`scope` con el mismo umbral de dos aciertos de vocabulario que ya usaba la
inferencia de industria (`suggestCapabilities`, `src/lib/search/facets.ts`);
la sugerencia nunca marca nada por sí sola, solo ofrece un chip de un clic.
`integrationKeys` sí conserva el tri-estado ("no se conecta con nada" es
`[]`, una respuesta real). `pricingModel`/`priceBand`/`setupTime`/`compliance`
no tienen ninguna forma de "cualquiera": ausente y `[]` significan lo mismo,
así que no hay nada que distinguir ahí. Detalle completo en CLAUDE.md §59.

## Información de Cord/Flouvia

Datos investigados y preparados en [fuentes](research/cord-flouvia-sources.md).
Aplicados a los dos registros vinculados al dueño autorizado, sin alterar la
publicación ni saltarse la revisión. No incluir información no confirmada solo
para completar el contador. Los enlaces personales extra y capturas reales siguen
siendo información a aportar por el propietario.

## Verificación

37 pruebas unitarias. Contratos de arrays, límites, URLs, eliminación de campos
falsos, recuperación de fases antiguas, validación por pregunta y comprobación
final. Integración de media/dashboard extendida con creadores/enlaces públicos,
question persistida y rechazo de question/fase incompatibles. TypeScript, lint y build aislado finales pasando. Regresión de contactos completa
también pasando; sin despliegue implícito.

Validación visual final en navegador local: Enter avanza y guarda; índice lleva a
Creadores; añadir persona y su enlace, rechazar javascript:, corregir URL, añadir
red del proyecto por separado, guardar/salir y reanudar exactamente en Enlaces.
Sin desbordamiento horizontal a 375 px. Se revisó también a 1280 px. Pruebas con
cuentas temporales, nunca con las credenciales reales del propietario.
