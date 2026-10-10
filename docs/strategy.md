# Estrategia: ganarle a Product Hunt — 10 de octubre de 2026

Auditoría del producto frente a Product Hunt (PH) y a los directorios B2B (G2, Capterra,
TrustRadius, ComparaSoftware), con investigación web de octubre de 2026. Las cifras que
vienen de estudios hechos por un proveedor se marcan como tales. Fuentes al final.

## Veredicto

shwcs no le gana a PH copiándolo. PH es un concurso de un día, con votos que se compran y
un público de creadores que se promocionan entre sí. shwcs puede ser **el lugar donde una
empresa decide qué comprar, con señales que no se pueden comprar ni inflar**. Esa es una
categoría que PH no ocupa.

**shwcs es para cualquier mercado** (decisión del propietario, 10 de octubre de 2026): la
interfaz ya está en español e inglés y los cobros en USD o MXN. México es el **primer
mercado**, no el límite: ahí los directorios globales casi no llegan y existen señales
públicas únicas (CFDI, lista 69-B del SAT) para arrancar con ventaja. Cada señal local se
diseña como un adaptador por país sobre una regla global, nunca como el producto entero.

La brecha más grande hoy no es de funciones, es de **oferta**. En `shwcs_production` hay
una cuenta y una ficha (Cord), en revisión y sin publicar (§45). Ninguna mejora de
producto compensa un catálogo vacío. La fase 0 va primero.

## Product Hunt hoy

- **El voto es opaco y se compra.** PH confirma que cada voto pesa distinto y que no
  revelará cuánto: una cuenta nueva de Gmail vale 0, un correo corporativo con LinkedIn
  pesa mucho. Su propio hilo sobre venta de votos lo llama «casi una estafa». Un análisis
  de 2025 documenta 200 votos por US$100, suficiente para el Top 5 entre semana.
- **El día de lanzamiento rinde poco.** Un #3 del día documentado: 1,305 visitas, 210
  registros, 7 clientes, US$543. El reinicio a medianoche del Pacífico favorece a quien
  ya tiene audiencia.
- **PH ya se está moviendo hacia las reseñas.** Retiró los Golden Kitty, creó los Orbit
  Awards trimestrales y su CEO dice que «las reseñas son la señal principal» y que «la
  historia real ocurre después del día de lanzamiento».
- **Su público son creadores, no compradores.** Su propia página para anunciantes pone a
  fundadores y makers primero. Tráfico mayoritariamente de EE. UU. y en inglés.

## Los directorios B2B

- **Se puede pagar por posición.** En Capterra la puja por clic ordena la categoría («a
  mayor puja, más arriba»). ComparaSoftware vende «visibilidad preferencial» y cobra en
  USD desde una empresa de EE. UU. (sin CFDI para el proveedor mexicano).
- **Las reseñas pagadas son la norma**: tarjeta de regalo de US$25 por defecto en G2; casi
  la mitad de quienes usan sitios de reseñas desconfía de las calificaciones infladas.
- **México casi no existe en ellos**: Aspel SAE, producto masivo para pymes, tiene 6
  reseñas en Capterra. En Google, «mejor sistema de facturación» devuelve proveedores que
  se ponen a sí mismos en el primer lugar.
- **La búsqueda se mudó a la IA**: el 51 % de compradores de software empieza en un
  chatbot (G2, marzo 2026, estudio propio de G2), y lo que más les da confianza en esa
  respuesta es que cite sitios de reseñas.
- **El cliente es micro**: el 95.5 % de las unidades económicas de México son
  microempresas (INEGI 2025). El contador es quien recomienda software.

## Dónde está shwcs hoy

Ya construido, y por encima de PH en lo que importa a un comprador:

| Ya existe | Por qué importa |
| --- | --- |
| Revisión editorial antes de publicar | PH destaca ~10 % de lanzamientos con criterios no públicos; shwcs publica sus criterios (`/criterios`) |
| Ficha estructurada: capacidades, industrias, tamaños, banda de precio, arranque, integraciones, cumplimiento | Permite filtrar y comparar; PH es una descripción libre |
| Guardados, listas, comparador de 2–3, solicitud de contacto con consentimiento y bandeja | PH no tiene flujo de compra; aquí termina en una conversación |
| Orden por interacción real: solo cuentas verificadas, decaimiento a 60 días, vistas deduplicadas (§55) | Más difícil de manipular que el voto de PH |
| Patrocinio separado del orden orgánico, sin píxeles (§64) | Lo contrario de Capterra |
| TXT de dominio, reportes, ops con auditoría | Base para señales verificables |
| Cobro en MXN/USD con CFDI vía Cord (§67) | Ningún directorio extranjero factura en México |
| Todo en español e inglés | |

Huecos frente a lo que esta estrategia necesita:

- **Sin reseñas.** Es la señal en la que PH, G2 y TrustRadius compiten hoy.
- **Sin señales de cumplimiento mexicanas** (lista 69-B del SAT, REPSE, PAC autorizado).
- **Sin valor continuo para el fundador**: no hay actualizaciones por ficha, seguir un
  proyecto ni resumen semanal; la ficha publicada no vuelve a generar visitas sola.
- **Sin perfiles públicos de creadores** ni preguntas y respuestas públicas por ficha.
- **Sin páginas para buscadores e IA**: no hay comparativas ni «alternativas a X», ni
  datos estructurados (JSON-LD) con fechas de verificación.
- **Compra individual**: las listas no se comparten con el equipo.
- **Correo sin probar en producción** y Google OAuth sin credenciales (§65).

## La tesis: cinco ventajas que PH no puede copiar

1. **Confianza que no se compra.** Reseñas cuyo peso depende de la verificación: correo
   verificado < correo de empresa < cliente comprobado. Los dos primeros niveles funcionan
   en cualquier país y ya están construidos (`docs/reviews.md`). El tercero usa
   comprobantes por país: en México, el CFDI vigente ante el SAT, que ningún sitio global
   usa; en otros mercados, una factura revisada o el registro fiscal del proveedor.
2. **Cumplimiento consultado, no declarado.** Registros públicos por país, con fecha y
   fuente; es una consulta, no una certificación (igual que el TXT hoy). México primero:
   lista 69-B del SAT, PAC autorizado, REPSE. Después, por ejemplo, IVA intracomunitario
   (VIES) en la UE o Companies House en el Reino Unido.
3. **Datos de decisión en los términos de cada comprador**: precio en su moneda, facturas
   válidas en su país (CFDI en México, factura electrónica en la UE), métodos de pago
   locales, idioma y horario de soporte, países donde opera el proveedor.
4. **Valor todo el año, no un día.** Actualizaciones fechadas, seguidores y señales de
   intención agregadas («3 empresas de manufactura de 11–50 personas te compararon esta
   semana»), nunca identidades sin consentimiento.
5. **La fuente que cita la IA en español.** Páginas generadas desde datos reales,
   fechadas y con fuente, solo cuando hay suficientes fichas completas.

## Plan por fases

Cada fase se puede lanzar sola. Las estimaciones son de construcción, no de operación.

### Fase 0 — Oferta y lanzamiento real (propietario, ahora)

- Aprobar y publicar Cord en producción desde ops; crear Flouvia (§45).
- Invitar a 30–50 proyectos mexicanos B2B con ficha completa antes de promocionar el sitio.
  Propuesta para el fundador: ficha gratis, contactos con contexto y, al llegar la fase 1,
  reseñas verificadas que no dependen de un día de votos.
- Cerrar §65: prueba de correo desde producción, Google OAuth, `AUTH_TOTP_KEY` en Vercel.
- Decisión de producto pendiente: ¿fichas «no reclamadas» creadas desde fuentes oficiales
  y reclamables por el fundador (como G2/Capterra)? Acelera la oferta, pero exige reglas:
  etiqueta visible, solo datos públicos fechados y sin contacto hasta que se reclame.

### Fase 1 — Confianza que no se compra (≈3 semanas)

**Estado (10 oct 2026):** construidas y probadas: reseñas con los tres niveles (correo,
correo de empresa, compra comprobada con CFDI ante el SAT), respuesta del fundador, avisos,
filtros, reportes y moderación en ops, peso en el orden, y el panel de registros públicos
con la lista 69-B del SAT (`docs/reviews.md`, `docs/compliance.md`, CLAUDE.md §70–§71).
Falta probar la compra comprobada con un CFDI real, REPSE/PAC y adaptadores de otros
países.

1. **Reseñas verificadas**: una por cuenta y ficha; campos estructurados (caso de uso,
   tamaño, tiempo usándolo, banda de precio pagado, lo mejor, lo peor, ¿lo recomiendas?).
   Respuesta pública del fundador, que no puede borrarlas (misma regla que comentarios,
   §46). Moderación y reportes en ops. Sin incentivos ligados al sentido de la reseña
   (regla de la FTC de 2024 como referencia).
2. **Verificación por niveles** visible en cada reseña. Nivel CFDI: el comprador captura
   UUID, RFC emisor, RFC receptor y total; se consulta su vigencia ante el SAT y se guarda
   solo el resultado y la fecha, nunca el XML. Requiere aviso de privacidad actualizado
   (dato fiscal) y consentimiento explícito.
3. **Panel de cumplimiento por ficha**: RFC declarado por el fundador (persona moral) y
   consulta diaria de la lista 69-B (CSV público del SAT) y de PAC autorizados; REPSE para
   agencias. Coincidencia solo por RFC exacto, con fecha, fuente y vía de aclaración.
4. **Ranking**: las reseñas entran a `solutionScore` ponderadas por nivel de verificación,
   con la fórmula publicada en `/criterios`. Los detectores de fraude no se publican.

Criterio de éxito: % de fichas con ≥3 reseñas verificadas; cero reseñas de cuentas del
propio fundador; tiempo de moderación.

### Fase 2 — Datos de decisión por mercado (≈2 semanas)

- Facetas nuevas en la ficha y en los filtros: países donde opera y factura, monedas,
  idiomas y horario de soporte, métodos de pago; y por país las que apliquen (en México:
  tipos de CFDI, varios RFC, SPEI/OXXO).
- Banda de precio obligatoria para publicar (la transparencia de precio es lo primero que
  piden los compradores).
- Preguntas y respuestas públicas por ficha, respondidas por el fundador.

### Fase 3 — Valor continuo para fundadores (≈3 semanas)

- Actualizaciones fechadas por ficha (changelog) y botón «Seguir»; resumen semanal por
  correo a seguidores (requiere el proveedor de correo de fase 0).
- «Nuevo esta semana»: ventana de 7 días en hora de México, sin carrera de medianoche.
- Perfiles públicos de creadores con sus proyectos (solo lo que el creador publica).
- Señales de intención agregadas en `/account/metrics`, mostradas solo a partir de 3
  empresas para no revelar a nadie.

### Fase 4 — Fuente para buscadores e IA (≈2 semanas)

- Comparativas «X vs Y» y «Alternativas a X» generadas desde fichas aprobadas, solo con
  suficientes fichas completas; el resto `noindex` (la política de Google contra contenido
  masivo castiga lo contrario).
- JSON-LD `SoftwareApplication` con datos reales, fecha de última verificación, sitemap y
  `hreflang` es/en.
- Nada patrocinado en comparativas ni en datos estructurados.

### Fase 5 — Compra en equipo y canal de contadores (≈3 semanas)

- Listas compartidas con el equipo, con comentarios.
- Solicitud ligera a 2–3 proveedores con las mismas preguntas (precio MXN, CFDI, plazo)
  para recibir respuestas comparables; reutiliza contactos y comparador.
- Contadores e implementadores como curadores verificados (cédula profesional, consulta
  pública de la SEP) que publican «el stack que recomiendo», con campo obligatorio para
  declarar comisiones.

### Fase 6 — Monetización alineada

- Patrocinio por días (ya existe, §64).
- Introducciones con asesor: shwcs arma una lista corta desde todo el catálogo y cobra al
  proveedor solo cuando el comprador acepta la introducción; se informa al comprador.
- Nunca pago por posición, por insignia ni por reseña.

## Lo que no haremos

- Ordenar categorías por puja ni vender «visibilidad preferencial».
- Insignias infladas: si existen, son raras, fechadas y revocables.
- Reseñas pagadas o filtradas; tampoco esconder las negativas.
- Contenido masivo para SEO sin datos detrás.
- Un leaderboard diario que premie a quien ya tiene audiencia.

## Riesgos

- **Datos fiscales**: RFC de persona física y montos de CFDI son datos personales bajo la
  LFPDPPP de 2025. Guardar solo el resultado de la consulta, con consentimiento.
- **Falsos positivos en 69-B**: solo RFC exacto, fecha y fuente visibles, vía de aclaración.
- **Multicuentas**: el nivel de verificación limita el daño; ops necesita detección.
- **Arranque en frío de reseñas**: invitar a clientes reales de los primeros proyectos y
  marcar las invitadas por el fundador como tales (TrustRadius les da menos peso).

## Métricas norte

1. Decisiones apoyadas: solicitudes de contacto respondidas por mes.
2. Fichas con ≥3 reseñas verificadas.
3. Tasa y tiempo de respuesta de fundadores.
4. Visitas recurrentes de fundadores (valor continuo).
5. Visitas desde buscadores e IA a comparativas.

## Fuentes principales

- PH, venta de votos y pesos: https://www.producthunt.com/p/producthunt/vote-selling-on-product-hunt
- PH, Orbit Awards y reseñas: https://www.producthunt.com/p/producthunt/rip-golden-kitty-awards-long-live-orbit-awards
- PH, AMA del CEO: https://www.producthunt.com/p/producthunt/i-m-the-product-hunt-ceo-and-i-ve-launched-8-times-on-ph-ama-unfiltered
- PH, #3 del día con US$543: https://www.producthunt.com/p/indiemerger/we-placed-3rd-on-product-hunt-and-earned-543
- Votos comprados (análisis independiente): https://sedimental.org/product_hunt_is_dead.html
- PH, página de patrocinio: https://www.producthunt.com/sponsor
- G2 compra Capterra, Software Advice y GetApp: https://company.g2.com/news/g2-acquires-capterra-software-advice-getapp
- Capterra, orden por puja: https://www.capterra.com/resources/what-is-ppc/
- G2, compradores e IA (estudio propio): https://company.g2.com/news/g2-research-the-answer-economy
- TrustRadius, desconfianza en reseñas: https://solutions.trustradius.com/vendor-blog/b2b-review-sites-are-losing-buyer-confidence-introducing-buyer-intelligence/
- ComparaSoftware, servicios: https://www.comparasoftware.com/nuestros-servicios
- INEGI, mipymes 2025: https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2025/EAP_MIPYMES_25.pdf
- Lista 69-B (EFOS): https://www.siigo.com/mx/blog/obligaciones-fiscales/que-son-las-efos/
- REPSE: https://blog.alegra.com/mexico/repse-empresas-servicios/
- Nueva LFPDPPP 2025: https://www.hoganlovells.com/es/publications/mexicos-new-federal-data-protection-law-what-it-means-for-companies
- Google, contenido masivo: https://developers.google.com/search/docs/essentials/spam-policies
