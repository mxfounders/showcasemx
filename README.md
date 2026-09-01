# shwcs

Estado vigente: [entrega de lanzamiento](docs/launch.md), [roadmap](docs/roadmap.md)
y [contexto maestro](CLAUDE.md). Avisos, verificación, confianza y métricas implementados;
activación de proveedores y despliegue pendientes. `npm test` y `npm run preflight`
permiten comprobar código y configuración por separado.

**Encuentra soluciones. Conoce a sus creadores.**

Plataforma de descubrimiento de software, agencias y servicios B2B mexicanos.
El MVP permite publicar proyectos con revisión editorial, guardar y comparar
opciones, solicitar contacto con consentimiento y responder desde la cuenta
propietaria. El catálogo mezcla Cord/Flouvia, ejemplos identificados y publicaciones
aprobadas de Neon.

## Desarrollo

```bash
npm ci
npm run dev
```

Abrir localhost:3000. Configurar Neon según [entorno](docs/env.md) y aplicar las
migraciones operativas en el orden de [CLAUDE.md](CLAUDE.md). No copiar secretos.
Cuenta, publicaciones, biblioteca y contactos requieren la base configurada.

```bash
npm run lint
npm run typecheck
npx tsx --test tests/*.test.ts
RUN_CONTACT_INTEGRATION=1 node tests/integration/contacts.cjs
```

La integración es opt-in y usa el servidor local con cuentas temporales que elimina.
Nunca ejecutar next build/check y dev sobre el mismo .next; comprobar producción
en una copia aislada si dev debe continuar abierto.

## Documentación

- [Contexto maestro, permisos, rutas y decisiones](CLAUDE.md)
- [Roadmap y estado de los 12 puntos](docs/roadmap.md)
- [Comparador, contactos y oportunidades](docs/contacts.md)
- [Guardados/listas](docs/buyer-library.md)
- [Publicaciones/revisión](docs/founder-workflow.md)
- [Ficha guiada y creadores](docs/guided-solution-form.md)
- [Capturas e inicio adaptativo](docs/media-dashboard.md)
- [Configuración de cuenta](docs/account-settings.md)
- [Diseño](docs/design.md), [paleta](docs/colors.md), [entradas reales](docs/listings.md)
- [Base de datos](docs/database.md), [entorno](docs/env.md), [stack](docs/stack.md)

Google, verificación de email, campañas, avisos automáticos y métricas siguen
pendientes. Recuperación está implementada pero falta activar/verificar el envío.
La solicitud se entrega dentro de shwcs, no por correo.
Cord/Flouvia ya están vinculados a publicaciones con propietario y reciben solicitudes internas.

Vercel tiene configuración de Next.js y salida .next. Build local no equivale
a despliegue o CI remoto verificado. No se desplegó esta entrega.
