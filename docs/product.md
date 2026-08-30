# Producto — ShowcaseMX

## Posicionamiento

ShowcaseMX es una plataforma de descubrimiento de tecnología B2B mexicana que
ayuda a las empresas a encontrar soluciones y conocer a quienes las construyen.
No se presenta como un software que realiza por sí mismo cobros, nómina o CRM.

La hipótesis de producto es que seleccionar herramientas, explicar su utilidad
y facilitar el contacto con sus creadores reduce el esfuerzo de encontrar una
solución. Esta hipótesis todavía necesita validarse con compradores y founders.

## Copy aprobado del hero

Sin texto pequeño encima. Título con un corte explícito en dos líneas:

> Encuentra soluciones.<br>
> Conoce a sus creadores.

Texto de apoyo:

> Descubre herramientas creadas en México para resolver los retos de tu empresa.
> En ShowcaseMX seleccionamos productos, te ayudamos a entender qué resuelven y
> te acercamos a quienes los construyen.

- Buscador: «¿Qué necesitas resolver en tu empresa?»
- Botón: «Encontrar soluciones».
- Ayuda: «Prueba con “quiero cobrar a tiempo” o “necesito organizar mi nómina”.»
- Chips: Finanzas, Nómina y CRM.

Evitar promesas sin evidencia como «infraestructura exacta», «grado institucional»
o «sello de garantía». La curaduría se deberá explicar con criterios y evidencia.

## Experiencia actual

Debajo del hero hay un explorador sin título visible y sin contenedor gris.
Siete categorías seleccionables muestran nueve tarjetas cada una. Cada tarjeta
incluye nombre, representación visual de ejemplo, problema que resuelve y tipo
de funcionalidad. Al pulsarla se abre una ficha que distingue soluciones reales
de ejemplos y ofrece un enlace oficial cuando corresponde.

Cord y Flouvia se incluyen con información de sus sitios oficiales; el resto
son ejemplos de diseño. No se ha hecho una auditoría independiente de resultados
o disponibilidad. Ver [entradas reales](listings.md). La búsqueda y
los enlaces a futuras páginas aún no completan un recorrido real de compra.

## Recorrido objetivo

1. Descubrir por problema escrito o por categoría.
2. Entender para quién sirve una herramienta y revisar evidencia de su utilidad.
3. Conocer a su creador y solicitar contacto.
4. Dar seguimiento a una solicitud comercial real.

La IA es una posible ayuda para descubrir; no sustituye al catálogo ni es
necesaria para publicar la primera versión útil.

## Storytelling propuesto para futuras páginas

- «Lo que tu empresa necesita puede estar construyéndose aquí.»: motivo de existir.
- «Entiende qué resuelve cada herramienta.»: casos de uso, destinatarios y evidencia.
- «Conoce a quienes están detrás.»: identidad y experiencia de los creadores.
- «Construyes algo útil. Ayudemos a que lo encuentren.»: invitación a founders,
  con CTA «Postular mi producto».

Estas secciones narrativas no están implementadas. No añadir títulos sobre el
explorador ni un rótulo sobre el hero para incorporarlas.

## Usuarios y curaduría previstas

| Rol | Responsabilidad prevista |
| --- | --- |
| Cliente | Explorar, evaluar y solicitar contacto |
| Founder | Postular productos y atender sus solicitudes |
| Admin | Revisar productos y gestionar publicaciones |

El esquema incluye `draft`, `pending_review`, `approved` y `rejected`. Falta
implementar las transiciones, permisos y consultas que muestran solo aprobados.
Los criterios de entrada y la evidencia de tracción siguen pendientes de definir.

## Negocio y confianza

La visión inicial es construir distribución B2B e información de intención de
compra. Leads cualificados, integraciones y participación en transacciones son
hipótesis de monetización, no servicios actualmente ofrecidos ni precios fijados.

La documentación inicial contemplaba distribuir también productos propios como
CordHQ. Si se desarrolla esa vía, se propone distinguir claramente productos
propios y posiciones patrocinadas de recomendaciones editoriales. Falta concretar
esa política y validar el modelo comercial.

Una búsqueda no equivale a un lead. Se propone registrar búsquedas por separado
y crear un lead cuando exista una solicitud de contacto. Ninguno de esos flujos
está implementado. No compartir consultas o datos de contacto sin definir antes
qué conoce cada actor y cómo se comunica al comprador.

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.
