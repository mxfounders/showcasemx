# Paleta de acentos

La interfaz mantiene fondos claros y texto neutro. Se usan cinco familias de
color para conectar categorías, iconos de navegación y footer. Cada familia tiene
una versión suave para fondos y una intensa para iconos y botones seleccionados.

Fuente única: `src/lib/brand-colors.ts`. Cambiar los valores ahí actualiza todos
los componentes. No agregar colores independientes a los enlaces.

| Familia | Intenso | Suave | Categoría principal |
| --- | --- | --- | --- |
| Azul | `#365DC4` | `#E4EBFC` | Finanzas y Agencias |
| Salvia | `#416B50` | `#E4EDE2` | Cobros |
| Lavanda | `#7753A5` | `#EEE5F5` | Nómina y Legal |
| Terracota | `#A94E35` | `#F6E5DD` | Ventas |
| Ámbar | `#88631B` | `#F4ECD5` | Operación |

- Los iconos usan el tono intenso sobre su fondo suave.
- Los botones de categoría activos usan el tono intenso con texto blanco,
  flecha visible y `aria-pressed`; la selección no depende solamente del color.
- Los fondos de las vistas previas usan el tono suave de la categoría.
- Navbar y footer consultan el mismo mapa de rutas, para mantener el mismo
  color cuando un enlace aparece en varios lugares.
- Las acciones globales, como suscripción y búsqueda, siguen siendo neutras.
- Las tarjetas distinguen las soluciones reales de los ejemplos ficticios;
  no usar colores como sello de verificación.

El explorador no lleva un fondo gris envolvente ni título visible. Las familias
de acento se aplican a sus categorías y tarjetas, no a una tarjeta exterior.
Hay siete categorías y cinco familias: Nómina y Legal comparten lavanda.

Ver [diseño](design.md) para composición y [producto](product.md) para copy.

Actualización de botones: Los CTA usan `actionButtonStyle` (azul suave #E4EBFC y texto #365DC4). Se conservan los cinco colores de categorías e iconos. Los chips del hero mantienen su color por categoría: Finanzas azul, Nómina lavanda y CRM terracota (`getAccentStyle`). El buscador no tiene recuadro de foco interior; el teclado señala el campo con subrayado discreto.
