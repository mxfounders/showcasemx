# ShowcaseMX

Plataforma de descubrimiento de tecnología B2B mexicana.

**Encuentra soluciones. Conoce a sus creadores.**

## Estado

Prototipo interactivo: hero, navegación y explorador con siete categorías y nueve
entradas por categoría, combinando Cord/Flouvia con ejemplos ficticios. La búsqueda, autenticación, publicación de
productos y generación de leads todavía no están conectadas.

## Desarrollo

```bash
npm ci
npm run dev
```

Abrir http://localhost:3000. La home actual no necesita claves de servicios.
Consultar [variables de entorno](docs/env.md) antes de integrar Neon, Clerk u OpenAI.

```bash
npm run lint
npm run typecheck
npm run check
```

`check` incluye el build: no ejecutarlo simultáneamente con dev sobre el mismo
`.next`. Usar una copia aislada si el servidor debe seguir abierto.

## Documentación

- [Contexto del proyecto](CLAUDE.md)
- [Producto y copy](docs/product.md)
- [Diseño](docs/design.md) y [paleta](docs/colors.md)
- [Roadmap](docs/roadmap.md)
- [Stack, validación y despliegue](docs/stack.md)
- [Esquema de datos](docs/database.md)
- [Variables de entorno](docs/env.md)

Vercel se configura mediante `vercel.json` para Next.js y salida `.next`.
La configuración y un build local correcto no confirman el estado de producción.

## Actualización: búsqueda y postulaciones

La búsqueda local y los chips de la home ya funcionan. Se añadió invitación y formulario con endpoint de guardado en Neon; activación de credenciales y tabla pendiente. Ver [detalle](docs/discovery.md) para el estado vigente, que sustituye las referencias anteriores a búsqueda de interfaz o formulario futuro.
