# Descubrimiento y postulaciones

## Implementado

- Búsqueda del hero mediante Enter o botón; normaliza acentos, ignora palabras comunes y reconoce vocabulario de cobros, e-commerce y automatización. No usa IA.
- Busca únicamente Cord y Flouvia, deduplicados por URL. Sin coincidencias muestra estado vacío. Limpiar o elegir una categoría vuelve al catálogo mixto, cuyos ejemplos siguen identificados.
- Chips Finanzas, Nómina y CRM seleccionan categorías y llevan el foco al catálogo sin cambiar de ruta.
- Invitación debajo del catálogo, sin fondo envolvente, con acento terracota compartido.
- Formulario en diálogo accesible: nombre, URL, tipo, correo y problema. Validación cliente/servidor; conserva valores tras errores; evita doble envío e incorpora ID de reintento.
- POST `/api/applications`: JSON limitado a 12 KB, mismo origen, honeypot, SQL parametrizado y persistencia Neon. No publica automáticamente ni envía correos. No registra datos personales en logs.

## Activar la recepción

1. Configurar `NEON_DATABASE_URL` de servidor en el entorno correspondiente.
2. Revisar y aplicar `db/solution-applications.sql` a esa base. Es una tabla independiente, sin modificar productos o usuarios. No es parte de migraciones Drizzle generadas.
3. Reiniciar el servidor y verificar una postulación en ese entorno y su fila guardada.

No hay `.env.local` en el checkout revisado. No se aplicaron cambios remotos ni se verificó guardado en Neon. Sin configuración o tabla disponible se devuelve 503 con mensaje honesto; nunca se simula éxito. Antes de abrir captación pública, completar aviso de privacidad, política de retención y protección distribuida contra abuso (el honeypot y control de origen no sustituyen rate limiting).

## Validación

`npx tsx --test tests/discovery.test.ts` comprueba búsqueda, deduplicación y validación de postulaciones. `npm run lint` y `npm run typecheck`. Compilar en copia aislada mientras esté activo next dev.

Conexión: se acepta `NEON_DATABASE_URL`, `DATABASE_URL` o `POSTGRES_URL`, en ese orden, solo en servidor. Neon conectado en Vercel no confirma que exista `solution_applications`. La sesión CLI revisada solo accede al equipo flouvia, donde no aparece shwcs; tabla y envío remotos siguen sin verificar. No se cambiaron bases remotas.
