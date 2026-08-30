# Product — ShowcaseMX

## El Problema

El ecosistema de founders tech en México está desconectado. Las plataformas actuales son directorios pasivos llenos de proyectos sin modelo de negocio. Los compradores corporativos (CFOs, dueños de agencias, VCs) no los usan porque hay demasiado ruido y cero confianza.

## La Solución

Una boutique curada de software B2B construido por operadores mexicanos. Opera bajo un dominio neutral (`.dev` o `.co`) para mantener independencia total. Los founders de élite se suman sin sentir que alimentan la marca de un tercero.

**No es un foro. Es catálogo de infraestructura de grado institucional.**

---

## Los 3 Pilares

### 1. Filtro de Calidad Extremo
- Curaduría manual estricta por el equipo de ShowcaseMX
- Solo entran proyectos B2B con modelo de negocio validado o tracción real
- Cero proyectos "zombie" (side projects sin usuarios ni ingresos)
- El proceso de aprobación funciona como un sello de garantía para compradores corporativos
- Estado de productos: `draft → pending_review → approved / rejected`

### 2. Buscador B2B Impulsado por IA (Core Feature)
- El home NO tiene un grid aburrido de categorías
- Tiene un input de lenguaje natural
- El tomador de decisiones escribe su **dolor operativo**: "mis clientes tardan 15 días en pagarme"
- La IA responde con la herramienta exacta del catálogo que resuelve ese cuello de botella
- Implementación: Vector Search (pgvector en Neon) + LLM (OpenAI via Vercel AI SDK)

### 3. Vistas Asimétricas
- **Vista del cliente (Corporativo/CFO):** Limpia, enfocada en resolver el problema y contactar al founder.
- **Vista del founder:** Dashboard con métricas de tráfico, leads generados, búsquedas que matchearon su producto.

---

## Modelo de Negocio y Visión Maestra

**No se cobra \$10/mes por estar listados.** El objetivo es ser dueños de la distribución.

Al controlar el tráfico B2B y la **data de intención de compra** (qué buscan las empresas mexicanas), se obtiene:

1. **Posicionamiento orgánico** de los propios productos del fundador (CordHQ, infraestructura de pagos) en el centro del ecosistema.
2. **Monetización de distribución corporativa:** Cobrar a empresas por acceso a leads cualificados o por integraciones premium.
3. **Flujos transaccionales:** Al ser el intermediario de confianza, participar en el cierre de deals.

### La Tabla `leads` es el corazón del modelo de negocio
Registra `intent_query` (qué buscó el corporativo antes de conectar con el founder). Esta data vale más que cualquier suscripción mensual.

---

## Usuarios y Roles

| Rol | Quién es | Qué hace |
|-----|----------|----------|
| `admin` | Equipo de ShowcaseMX | Aprueba/rechaza productos, gestiona el catálogo |
| `founder` | Fundador de SaaS B2B | Publica su producto, ve métricas y leads |
| `client` | CFO, Director de Ops, dueño de agencia | Busca herramientas, contacta founders |

---

## Competitive Moat (Foso Defensivo)

1. **Curaduría** → Confianza del comprador corporativo
2. **Data de intención** → Ventaja informacional sobre el mercado
3. **Network de founders élite** → Dificil de replicar (requiere reputación)
4. **Distribución orgánica** → SEO + palabra de boca en el ecosistema
