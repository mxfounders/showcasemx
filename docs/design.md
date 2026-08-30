# Diseño — ShowcaseMX

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

Actualización de botones: CTA y chips de búsqueda usan `actionButtonStyle` (azul suave #E4EBFC y texto #365DC4). Se conservan los cinco colores de categorías e iconos. El buscador no tiene recuadro de foco interior; el teclado señala el campo con subrayado discreto.
