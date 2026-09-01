# Diseño — shwcs

## Dirección vigente

Interfaz clara, editorial y directa, con tipografía marcada, espacios amplios,
esquinas redondeadas y movimiento discreto. Esta dirección sustituye la propuesta
oscura inicial. No reintroducirla al trabajar a partir de documentación antigua.

- Fondo de página: `#f5f5f4`.
- Tarjetas y navegación: blanco, bordes stone y sombras suaves.
- Texto: stone oscuro; secundarios en stone, sin usar el color como única señal.
- Cinco familias de acentos compartidas: ver [colores](colors.md).
- Acciones globales de búsqueda/suscripción: fondo oscuro neutro y texto blanco.

## Hero

- Sin texto pequeño, etiqueta o eyebrow sobre el título.
- Dos líneas: «Encuentra soluciones.» / «Conoce a sus creadores.»
- Cada frase está en un span de bloque sin salto interno. El tamaño responde al
  ancho del contenedor mediante `clamp(1.25rem, 8cqw, 3.25rem)`.
- Ancho máximo `max-w-5xl`; texto a la derecha desde `lg`, debajo en pantallas menores.
- Buscador blanco centrado, con etiqueta accesible, ejemplo debajo y chips con
  la misma paleta que navbar/footer. El botón aún no ejecuta búsquedas.
- Copy completo en [producto](product.md).

## Explorador de categorías

Archivo: `src/components/category-explorer.tsx`.

- Va después del hero, sin título visible. Tiene nombre accesible de sección.
- Sin tarjeta gris, borde o fondo exterior: todo se apoya sobre el fondo de página.
- Ancho máximo 1600 px; padding exterior y espacios entre elementos se conservan.
- Siete categorías: Cobros, Finanzas, Nómina, Ventas, Operación, Legal y Agencias.
- Nueve tarjetas por categoría. Contenido real y ficticio diferenciado en `src/lib/catalog-preview.ts`.
- Una columna en móvil, dos desde `sm`, tres desde `xl`.
- Categorías horizontales deslizables en móvil; columna sticky desde `lg` con
  filas según el número de categorías cuya altura se adapta a la ventana. No confundir nueve entradas
  por categoría con nueve categorías.
- Activo: color intenso, texto blanco, flecha visible y `aria-pressed`.
- Flechas del teclado y Home/End cambian selección y foco.
- Las tarjetas mantienen una altura uniforme y muestran una visualización
  decorativa, inicial/nombre, descripción y funcionalidad.
- «Ver ejemplo» abre un diálogo nativo con aviso de producto ficticio. Cierre
  mediante botón, Escape o fondo; retorno del foco al botón que lo abrió.

## Navbar y footer

- Navbar fija en `top-0`, blanco, margen horizontal y esquinas inferiores redondeadas.
- Navbar resuelve la sesión en servidor: sin sesión muestra «Entrar» y enlaza a
  `/sign-in`; con sesión válida muestra «Ir a mi panel» y enlaza a `/account`.
  Se aplica igual en escritorio y móvil, sin parpadeo ni consulta desde el cliente.
- Navbar y panel de megamenú: `max-w-7xl`. Apertura por hover o clic/teclado;
  Escape cierra. Los enlaces todavía apuntan mayormente a rutas pendientes.
- Footer blanco con esquinas superiores redondeadas y columnas por tema.
- Los iconos usan `getAccentStyle(href)` de `brand-colors.ts`; no definir
  `iconBg`/`iconColor` independientes para cada enlace.
- Navegación móvil completa y distribución del footer en pantallas estrechas
  siguen pendientes de una revisión general. El explorador sí tiene adaptación móvil.

## Tipografía: estado real

El layout carga Inter como `--font-sans`, pero `globals.css` declara Helvetica
Neue/Helvetica/Arial en html/body. Falta unificar esa configuración; no afirmar
que Inter sea la fuente efectiva en todos los componentes. Hay archivos Geist
heredados que no se usan en el layout actual.

## Movimiento

GSAP ya está instalado; no agregar un segundo motor para estos efectos.

| Elemento | Comportamiento actual |
| --- | --- |
| Hero | Entrada de título, texto, búsqueda y chips con solapamiento |
| Enlaces navbar/footer | Slide-up de texto al hover |
| Megamenú | Entrada 220 ms; salida 180 ms; cancelación de tweens previos |
| Tarjetas al cambiar categoría | Salida 120 ms; entrada 380 ms, stagger 35 ms |
| Hover de tarjeta | Sombra/borde y desplazamiento breve de visual y flecha |

El explorador respeta `prefers-reduced-motion` y cancela transiciones anteriores
al cambiar rápido. Extender esa preferencia al hero/navbar/footer es pendiente.
Evitar rebotes, rotación automática de categorías y cambios de altura entre filtros.

## Comprobaciones de interfaz

Revisar escritorio y móvil, cambio rápido de categorías, teclado, cierre del
diálogo, foco visible y consistencia de color entre navegación, catálogo y footer.
Los chequeos de lint/tipos/build no sustituyen estas comprobaciones visuales.

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.

Invitación a fundadores: fila horizontal desde 1280px, título de 32px en una línea, descripción breve debajo y botón a la derecha. En pantallas menores se apila sin forzar una línea ni desbordar.

Actualización de botones: Los CTA usan `actionButtonStyle` (azul suave #E4EBFC y texto #365DC4). Se conservan los cinco colores de categorías e iconos. Los chips del hero mantienen su color por categoría: Finanzas azul, Nómina lavanda y CRM terracota (`getAccentStyle`). El buscador no tiene recuadro de foco interior; el teclado señala el campo con subrayado discreto.

## Newsletter y acceso propio

Implementados `/newsletter`, `/sign-in`, `/sign-up` y `/account`; Clerk retirado. Navbar con búsqueda expandible y microinteracciones discretas. Tablas de auth/newsletter creadas en la conexión local de Neon. Proveedor de correo y despliegue pendientes. Estado vigente y límites en [newsletter y auth](newsletter-auth.md).

Newsletter: formulario de tres pasos tipo Typeform (perfil, rol, correo y consentimiento), directamente sobre el fondo. Solo título arriba, sin texto introductorio, bullets ni tarjeta contenedora. Segmentos guardados en Neon; ver `docs/newsletter-auth.md`.

Acceso y registro: encabezado «Bienvenido a shwcs», composición centrada directamente sobre el fondo, sin tarjeta exterior. Campos transparentes con iconos y CTA azul suave. Google aparece como botón deshabilitado con aviso «Próximamente»; OAuth no está conectado. Se conserva el acceso real por correo/contraseña.

Dashboard MVP: `/account` con perfil editable persistido mediante `PATCH /api/account`, catálogo y acceso. Migración aditiva `db/account-profile.sql` aplicada. Login/registro con errores propios (sin globos nativos), mínimo 6 caracteres y sin máximo anunciado; límite técnico alto. Ver `docs/newsletter-auth.md`.

Navegación por contexto: `(marketing)` conserva navbar/footer comercial; `(focused)` sirve `/sign-in`, `/sign-up` y `/newsletter` con logo, vuelta al catálogo y sin footer comercial; `/account/layout.tsx` usa header propio y menú de usuario (perfil/acceso/logout). Las URLs no cambian. Root layout solo aporta HTML, tipografía y salto al contenido. No se añadieron enlaces legales a páginas inexistentes.

Mis soluciones: `/account` ahora gestiona postulaciones propias; perfil en `/account/profile`. Borrador, revisión, cambios, publicación y rechazo; cola editorial con permisos separados. Ver [flujo de fundadores](founder-workflow.md) para el estado vigente. El intake anónimo anterior está retirado.

Navbar del dashboard: comparte `navbar-style.ts` con la landing (blanca, fija, 52 px, ancho máximo 7xl, sombra y esquinas inferiores). Navegación adaptada con Mis soluciones, Configuración, Explorar catálogo, Postular solución y menú de cuenta; enlaces móviles dentro de ese menú. El contenido reserva 56 px para evitar solapamiento.

Actualización del dashboard: sidebar blanca flotante con la estética de la landing, enlaces activos e iconos con la paleta existente. En móvil se despliega mediante botón; no se añade una tarjeta al contenido. Configuración ahora son rutas independientes: `/account/settings/profile`, `/account/settings/security`, `/account/settings/connections`; `/account/settings` redirige a Perfil. Sustituye la navbar horizontal anterior solo en la cuenta.

Postulación: categorías múltiples con casillas accesibles y pasos visibles. JSON `categories` contiene la selección sin duplicados y `category` conserva la primera por compatibilidad. Los registros anteriores siguen funcionando sin migración ni cambios masivos. La validación exige al menos una categoría para enviar y rechaza valores desconocidos. Se muestran todas en revisión/ficha pública y el catálogo incorpora la solución en cada categoría aprobada. Las actualizaciones mantienen la versión pública previa hasta aprobarse.

Validación: 22 pruebas unitarias, lint/tipos, build aislado y flujo integral con dos categorías desde borrador hasta publicación/revisión. Revisadas navegación de configuración y selección múltiple en navegador, incluido móvil de 375 px. Correo de recuperación y Google mantienen sus pendientes previos; no se activaron integraciones externas.

Ajuste de sidebar: en escritorio queda pegada al borde izquierdo (`left: 0`), separada 24 px del borde superior e inferior, con lado izquierdo recto sin borde y solo las esquinas derechas redondeadas, fondo blanco y sombra suave. Conserva la navegación móvil existente.

Pulido de sidebar: jerarquía más compacta, estado activo con el acento de cada sección, CTA de postulación separado, perfil inferior con menú desplegable hacia arriba (perfil, seguridad y cerrar sesión). El menú cierra al navegar, pulsar Escape, perder foco o pulsar fuera; incluye foco visible y movimiento reducido. Conserva borde izquierdo recto, esquinas derechas redondeadas y 24 px de margen vertical. No se añadieron métricas ni funciones simuladas.

Reestructura de navegación: la sidebar contiene Mis soluciones, Explorar catálogo, Configuración y el enlace de identidad al perfil. «Postular solución» lleva únicamente el + a la derecha; se retiraron flecha y puntos de estado. Configuración abre un centro real en `/account/settings` con enlaces a Perfil, Seguridad y Cuentas vinculadas. Las subpáginas incluyen vuelta al centro. Se eliminó el menú de cuenta desplegable y Cerrar sesión de la sidebar; cerrar sesión está en Seguridad. Guardados y listas de comparación para compradores siguen como propuesta, no funciones implementadas.

Cuenta en sidebar: vuelve a ser un botón desplegable hacia arriba con Configuración y Cerrar sesión. Conserva el acceso directo a Configuración, el + a la derecha y los estados sin puntos. Cierra con Escape, clic exterior o navegación y permite acceso por teclado.

Avance del plan de conexión (primera fase): se retiró Configuración como enlace independiente de la sidebar; permanece en el desplegable de cuenta junto a Cerrar sesión. Postulación y ficha ahora admiten alcance (`scope`), precios (`pricing`), implementación (`implementation`), integraciones (`integrations`), soporte (`support`), evidencia (`evidence`) y enlace a caso/demo (`evidenceUrl`). Campos opcionales con límites de longitud y validación HTTP(S) sin credenciales. Se guardan en el JSON existente, por lo que no se alteran ni migran registros antiguos. Los revisores y el resumen de envío ven estos campos; solo se publican al aprobar.

La ficha pública organiza problema, cliente ideal, alcance, información comercial y evidencia. Las ausencias se indican explícitamente; no se inventan precios, garantías o casos. El correo de contacto continúa privado. La revisión editorial no se presenta como certificación. CTA real: visitar sitio oficial; solicitudes de contacto, guardados/listas y métricas siguen pendientes. El catálogo consulta Neon con `cache: no-store` para evitar mostrar publicaciones obsoletas.

Validación: 23 pruebas unitarias; flujo integral de postulación, permisos, aprobación, publicación y aislamiento de actualizaciones con nuevos detalles. Build aislado, lint y tipos. Se usaron y eliminaron cuentas/fichas temporales de prueba.

## Biblioteca del comprador

Guardados y Mis listas en sidebar, con iconos lavanda/ámbar; configuración solo en menú de cuenta. Páginas sobre el fondo, separadores ligeros, botones azul suave y confirmaciones inline. Estados vacíos invitan a explorar/crear; listas privadas y proyectos no disponibles se identifican explícitamente. Una solución puede estar en varias listas con notas independientes.

## Comparador y solicitudes — estado vigente

Las listas incluyen selección de 2–3 proyectos y tabla semántica con scroll
horizontal dentro de la región en móvil. Campos desconocidos explícitos, sin ranking.
Contacto se divide en datos y revisión/consentimiento; después abre seguimiento.
Sidebar incorpora Mis contactos y Oportunidades. Bandejas sobre el fondo, filtros
en pills y estados legibles. Respuestas y retiro requieren confirmación inline.
Configuración sigue solo en el desplegable. No hay chat ni notificaciones simuladas.


## Actualización vigente: capturas e inicio adaptativo

Inicio `/account` distingue comprador/fundador/ambos; listado en `/account/solutions`.
Sidebar conserva estética y añade Inicio, sin Configuración duplicada. Fichas con
galería de capturas reales, ampliación accesible y demo externa; preview privada
del borrador guardado. Guía de información, límites de encaje y fecha de aprobación.
Las pantallas mantienen fondo libre, separadores suaves, cinco tonos y botones azul
suave, sin movimientos magnéticos. No inventar capturas para Cord/Flouvia.
Contrato y permisos actuales: [media-dashboard.md](media-dashboard.md).


### Ancho uniforme y acceso al catálogo

Todas las páginas privadas usan `.account-page`: `w-full max-w-6xl mx-auto`,
24 px de margen interior horizontal y la misma separación vertical que Inicio.
Aplica también a configuración, creación/detalle de soluciones, listas/comparador,
contactos/oportunidades, revisión, preview y errores. No añadir límites de ancho
individuales al contenedor de página. Los párrafos/formularios pueden mantener
anchos legibles dentro de esa estructura; no cambiar marketing o login.
“Explorar catálogo” está en el bloque inferior de la sidebar, justo encima del
menú de cuenta; no entre los enlaces principales. En móvil conserva ese orden.


### Marca tipográfica — 31 agosto 2026

Se retiró el cuadrado del logo en navbar, footer, sidebar y pantallas de acceso.
Conservar solo el nombre tipográfico **shwcs**, en minúsculas. Nombre aplicado
en toda la interfaz; logo nuevo pendiente del usuario. No afecta favicons de proyectos del catálogo.


## Listas de comunidad — 31 agosto 2026

Implementadas listas privadas/públicas opt-in, categorías, galería y enlaces compartibles. Notas y propósito siempre privados; existentes privadas. Migración aditiva aplicada en base configurada. Detalle, verificación y pendientes de moderación: [community-lists.md](community-lists.md). Marca vigente: shwcs. Rebranding de interfaz aplicado; dominio y logo pendientes.

### Búsqueda y movimiento de iconos — 31 agosto 2026

- `SearchIcon` es el dibujo compartido de las lupas compactas: navbar, comunidad, Guardados, Mis listas y selectores de listas/proyectos. Gesto único de 460 ms al hover o foco del control, sin seguimiento del cursor. El hero es la excepción: conserva la barra grande permanente y una lupa estática.
- La lupa de navbar alterna una barra flotante debajo (56 px de alto, 420 px en escritorio, márgenes de 16 px en móvil). No expande sobre los enlaces ni sobre Comunidad. Foco inmediato al abrir, cierre con X/Escape/clic externo/salida del foco; envío conserva la búsqueda real `/?q=…#catalogo`. Abre cerrando otros menús.
- El formulario solo se monta abierto: no quedan campos invisibles alcanzables con Tab ni se pierde foco por transiciones de `visibility`. Entrada de 200 ms por opacidad y desplazamiento vertical, sin deformar ancho.
- `CommunityIcon` conserva el eje inclinado 25°. Solo el meridiano gira una vuelta (360°, 850 ms); contorno y ecuador permanecen fijos. Hover y foco visible, sin bucle.
- Todos estos movimientos se omiten con `prefers-reduced-motion`; la inclinación estática se conserva. Sin logos nuevos ni cambios de marca.
- Verificado en navegador a 390 px y escritorio: barra debajo del mundo, sin overflow horizontal, foco y búsqueda real. Lint/TypeScript/build aislado.

### Aclaración: se despliega el buscador completo

La petición posterior del usuario se refiere a **extender la cápsula hacia la izquierda**, no solo a animar el dibujo de la lupa. Componente vigente: `src/components/search/expanding-search.tsx`.

Comunidad, Guardados, Mis listas y selectores de listas/proyectos empiezan con un botón de lupa. Al pulsarlo se abre hacia la izquierda una cápsula blanca con foco automático, flecha azul y X; borde derecho fijo y ancho limitado por el contenedor, sin escalar el texto. Transición de 280 ms, desactivada con movimiento reducido. Las búsquedas ya presentes en URL se muestran abiertas para que el filtro no quede oculto. El buscador principal del hero permanece completo y visible desde el inicio.

Los filtros de biblioteca siguen siendo locales y reaccionan al escribir. Comunidad conserva el GET con `q` y categoría, y reinicia paginación. X/Escape limpian el texto y repliegan; mantienen tipo, categoría, lista y orden. En un diálogo, el primer Escape cierra la búsqueda y no el diálogo. Una búsqueda vacía se repliega al salir del foco. No se cambia privacidad ni persistencia.

Navbar conserva su panel flotante debajo y ahora revela la cápsula de derecha a izquierda, sin tapar el mundo. El giro sobre el eje inclinado de Comunidad se conserva.

Validación: lint, TypeScript y build aislado; navegador con cuenta temporal en Guardados/Mis listas/selector de listas, filtrado real y conservación de tipo, GET de comunidad y limpieza conservando categoría, ancho móvil de 390 px sin desbordamiento y Escape dentro del diálogo. Datos temporales eliminados.

### Lugares disponibles en el catálogo

Cada categoría mantiene nueve lugares visuales. Cuando todavía no hay suficientes
proyectos publicados, los huecos aparecen como tarjetas grises con borde discontinuo
y CTA para postular, sin nombres o información inventada. Conservan el tamaño de las
fichas reales para evitar que la cuadrícula parezca rota. Solo aparecen al explorar
una categoría; una búsqueda presenta exclusivamente coincidencias reales.

### Filtros de Guardados

El título «Guardados.» permanece visible con o sin filtros. Tipo, categoría, lista
y orden usan cápsulas de tono suave y menús flotantes como Comunidad, con check en
la opción activa. La categoría adopta su color semántico; búsqueda compacta queda a
la derecha con 24 px de separación. Solo un menú puede estar abierto; activar la
búsqueda cierra el menú activo. Se conserva filtrado local, intersección, contador y
limpieza existentes.

### Encabezado y filtros de Mis listas

«Mis listas.» queda solo como título. Se retiraron los enlaces flotantes a Comunidad
y Guardados porque ya existen en la sidebar. La barra inferior agrupa Todas, Privadas
y Públicas como cápsulas azul/lavanda/salvia; búsqueda y Crear lista quedan juntos a
la derecha. El mosaico de creación estilo Pinterest permanece únicamente en la vista
sin búsqueda y con Todas activo. Filtros vacíos ofrecen restablecer la vista.

### Selectores de pestañas y filtros

Los selectores equivalentes comparten un solo tratamiento visual en Comunidad y
la cuenta: opción activa con azul suave `#E4EBFC` y texto `#365DC4`; opciones
inactivas transparentes y grises. En hover, una opción inactiva recibe superficie
blanca, sombra breve y presión de 1 px, como los demás botones. Esto aplica a
categorías de Comunidad, visibilidad de Mis listas, estado de contactos y
oportunidades, modo del Inicio y filtros de Avisos.

Los desplegables de Guardados usan la misma lógica: estado predeterminado sin fondo,
filtro aplicado o menú abierto en azul y opción elegida en azul dentro del menú.
Se retiraron los tonos independientes de tipo, categoría, lista y orden. Los colores
semánticos se conservan en el explorador del catálogo y en selecciones múltiples de
categorías, donde distinguen contenido y no una pestaña activa.

La búsqueda expandible reserva su ancho real al abrirse. Crece hacia la izquierda,
pero ya no se superpone al selector anterior; en Guardados usa 340 px, conserva
32 px de separación y permanece en la misma fila en escritorio. En móvil puede
pasar a la siguiente línea y limita su ancho para respetar los márgenes.

### Acordeones y disclosures

Ningún `<summary>` funcional muestra el triángulo nativo del navegador. Todos los
disclosures de la app son compactos (`fit-content`), con área mínima de 44 px, texto
a la izquierda y chevron azul dentro de un círculo azul suave a la derecha. No deben
convertirse en barras del ancho del contenedor. Hover añade superficie blanca y
sombra ligera; al abrir, la fila toma texto azul y el chevron gira 180°. Mantienen
teclado, foco visible y movimiento reducido. Los dropdowns de filtros conservan su
propio chevron y quedan excluidos para evitar iconos duplicados.

Los checkboxes visibles tampoco usan el dibujo nativo del navegador. Comparten caja
de 20 px, radio de 6.4 px, borde stone y estado seleccionado azul con palomita blanca.
El foco es un contorno externo, sin alterar tamaño o alineación. Aplica a formularios,
consentimientos, comparador y selecciones; inputs `sr-only` conservan su control visual.

En el detalle de una lista, «Añadir proyectos» y «Editar lista» son CTA hermanos,
con la misma altura y cápsula azul. Editar usa icono de lápiz y chevron. Su formulario
abre como popover de 560 px máximo, tarjeta clara con borde, sombra y scroll interno;
queda fuera del flujo y nunca desplaza comparación, proyectos o notas. Cierra con X,
Escape o clic exterior y devuelve el foco al activador.

### Acciones globales de la cuenta

La sidebar ya no incluye el CTA grande «Postular solución» ni el enlace «Avisos».
Todas las páginas privadas muestran dos controles circulares en la esquina superior
derecha: `+` abre `/account/solutions/new` y la campana abre un panel flotante. En
móvil bajan debajo del encabezado de navegación para no tapar el menú.

La campana muestra los diez avisos reales más recientes, punto azul cuando existen
pendientes, estado leído/no leído, fecha, marcado individual al abrir y acción para
marcar todos. El panel no crea una página ni desplaza contenido; cierra con X, Escape
o clic exterior. Conserva enlace a preferencias de correo. La ruta histórica
`/account/notifications` redirige a `/account`.

El feed consulta `/api/notifications`: refresca al abrir y cada 30 segundos mientras
la pestaña está visible y el panel cerrado. Incluye skeleton, error recuperable,
actualización manual, contador total de no leídos y paginación estable por
`created_at + id` con «Ver anteriores». Leer uno o todos actualiza la interfaz de
forma optimista y revierte si la persistencia falla. En móvil, el contenido privado
reserva espacio superior para que `+` y campana no cubran los títulos.

### Curvas de actividad

La gráfica diaria usa curvas suaves como recurso de presentación: azul continua
para visitas y salvia segmentada para clics. El hover/foco revela guía, puntos y un
tooltip con fecha y valores exactos. El área azul es decorativa y discreta. Nunca se
altera un valor para separar líneas coincidentes; el trazo segmentado resuelve esa
distinción visual. Teclado: flechas, Home y End.

### Recursos, dominio y contacto

El origen de marca es `https://shwcs.site`. La navbar agrupa El Proyecto, Blog,
Changelog y Contacto dentro de un desplegable Recursos, con el mismo comportamiento
de los otros megamenús. El footer conserva la suscripción como CTA a la derecha y
coloca `hola@shwcs.site →` debajo de la descripción de marca, como enlace tipográfico
a `/contacto`. La página de contacto usa `contacto@shwcs.site` como dirección
principal y se divide en una gran superficie azul de marca con wordmark blanco y un
formulario progresivo de cuatro pasos sobre el fondo claro.

El panel no lleva eyebrow «Contacto». Titular vigente: «Hay algo que quieres
resolver. / Empecemos por ahí.»; en escritorio se compone deliberadamente en dos
líneas con escala contenida. El subtítulo contempla buscar, construir y colaborar.

`ops.shwcs.site` es una superficie futura separada para operación interna. No forma
parte de la navegación vigente ni comparte permisos buyer/founder. Su diseño deberá
conservar la marca, pero priorizar colas, revisión, historial y controles auditables.

### Wordmark

El logo activo es el archivo entregado `shwcs logo 1.png`: letras azules sobre
transparencia. Los originales quedan en `public/brand/source/`; la copia de interfaz
en `public/brand/shwcs-logo-1.png` únicamente recorta el padding transparente para
dimensionarse correctamente. `BrandLink` es la única implementación permitida del
wordmark y se comparte en navegación comercial, cuenta, acceso y footer.

En el footer, el correo pertenece al bloque de identidad: aparece debajo de la
descripción, como enlace tipográfico sin cápsula. Newsletter permanece como único
CTA del extremo derecho y usa ancho completo solo en móvil.

### Formulario público de contacto

`/contacto` pregunta motivo, identidad, empresa/proyecto, rol opcional, contexto,
sitio opcional, momento y consentimiento. Motivos: encontrar, presentar, alianza,
prensa, soporte u otra conversación. Cada paso valida antes de avanzar; el último
muestra un resumen. Transiciones breves y anuladas con movimiento reducido.
Las selecciones muestran check explícito. A–F selecciona el motivo cuando el foco no
está escribiendo; Enter avanza o envía. En el mensaje, Shift+Enter crea una nueva
línea y Enter continúa. El pie comunica el atajo sin depender de él.

El panel azul usa `shwcs-logo-white.png`, derivado exclusivamente del PNG blanco
entregado. `/contacto` no muestra navbar ni footer. En escritorio es una gran sidebar
plana pegada al borde izquierdo, separada 24 px de arriba/abajo y redondeada solo a
la derecha; en móvil se convierte en encabezado azul con margen y el formulario
continúa debajo. No añadir círculos, gradientes, texturas ni ilustraciones al azul.

POST `/api/contact` exige mismo origen, JSON limitado, honeypot, campos acotados y
consentimiento `contact-v1`. Persiste primero en `contact_inquiries` y después intenta
notificar a `CONTACT_EMAIL_TO` o `contacto@shwcs.site`. Una falla de Resend conserva
el mensaje con estado `failed`/`unavailable`; nunca responde éxito sin guardar.
El reply-to es el correo validado de quien escribe. No suscribir al newsletter.

### Métricas

`/account/metrics` presenta datos reales de los últimos 30 días directamente sobre
el fondo. El resumen usa cuatro columnas con separadores: visitas de ficha, clics al
sitio, solicitudes y porcentaje de visitas que llegaron a contacto. Debajo muestra
líneas diarias de visitas/clics, embudo de señales y rendimiento por proyecto con
barras proporcionales y valores exactos. Un disclosure conserva la tabla diaria.

No introducir scores, ventas, visitantes únicos ni atribución que no exista. Las
conversiones son cocientes de eventos y siempre muestran 0% cuando no hay base. La
vista vacía dirige a Mis soluciones; no muestra widgets en cero. El texto explica
DNT/GPC, bloqueadores y privacidad de guardados. SVG, tablas y barras son accesibles
y el contenido ancho usa scroll local, nunca overflow de página.
