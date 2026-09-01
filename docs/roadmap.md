# Roadmap — estado consolidado, 31 agosto 2026

Producto: descubrir → evaluar → guardar/comparar → contactar → seguir la respuesta.
Una misma cuenta compra y publica. El modo del inicio no concede permisos.

| # | Entrega | Estado | Pendiente |
| --- | --- | --- | --- |
| 1 | Fichas para decidir | Capturas, demo, creadores/redes, alcance y límites | Casos comprobados y almacenamiento a escala |
| 2 | Comparador | 2–3 proyectos, datos aprobados y notas privadas | Iteración según uso |
| 3 | Contacto contextual | Consentimiento, identidad/destinatario de servidor y control opcional de correo verificado | Activar verificación obligatoria tras probar correo |
| 4 | Bandeja fundador | Respuesta, estados, historial y avisos internos | Activar entrega de avisos por email |
| 5 | Seguimiento comprador | Historial, retiro y avisos de cambios | Recordatorios y aprendizaje de uso |
| 6 | Inicio adaptativo | Fundador/comprador/ambos, proyectos, listas visuales y acciones concretas | Iteración con actividad real |
| 7 | Fichas completas | Formulario de 14 preguntas, información pendiente y fecha de aprobación | Operación editorial, no más campos por defecto |
| 8 | Confianza | TXT de dominio, señal acotada, información declarada | Identidad legal y evidencia/casos verificados |
| 9 | Avisos configurables | Centro privado, preferencias, outbox y verificación de email | Resend/remitente/cron y prueba de entrega |
| 10 | Métricas | Vistas/clics agregados y solicitudes reales por proyecto propio | Medición en producción; no visitantes únicos ni ventas |
| 11 | Editorial | Criterios públicos, reportes, decisión y retirada autorizada | Designar responsable, apelaciones y escala de moderación |
| 12 | Lanzamiento | OAuth propio preparado, navegación depurada, Next actualizado, CI y preflight | Credenciales, legal, Vercel correcto y smoke test remoto |
| 13 | Comunidad | Listas públicas opt-in, categorías, ranking reciente/popular, likes, guardado y comentarios con alias | Reportes/moderación central, señales antiabuso y notificaciones |

Cord y Flouvia publicados en la base configurada por autorización del propietario.
Orden del catálogo: Cord, Flouvia, demás proyectos. Búsqueda prioriza relevancia.
Ejemplos ficticios ocultos por defecto y nunca presentados como proveedores reales.

## Siguiente entrega útil

1. Activación real: remitente Resend, dominio canónico, Google y scheduler.
2. Responsable editorial, criterios operativos y completar políticas de privacidad.
3. Desplegar al proyecto shwcs correcto y probar correo, acceso y contactos.
4. Escuchar a fundadores/compradores reales; decidir mejoras a partir de solicitudes
   y conversaciones, antes de construir CRM/chat complejo.

No conectado: campañas newsletter, IA/vector, almacenamiento externo, monitoreo
externo. Guardados/listas/notas siguen privados; no generan leads ni avisos al fundador.
Código probado y migración aplicada no equivalen a un despliegue comprobado.

Detalles: [entrega de lanzamiento](launch.md), [ficha guiada](guided-solution-form.md),
[contactos](contacts.md), [biblioteca](buyer-library.md), [contexto maestro](../CLAUDE.md).


## Listas de comunidad — 31 agosto 2026

Implementadas listas privadas/públicas opt-in, categorías, galería, enlaces compartibles y capa social real. `Recientes` y `Populares`; actividad sin números de muestra; likes/guardados únicos; comentarios públicos con alias y borrado por autor/curador; listas guardadas dentro de la cuenta. Migraciones aditivas aplicadas en base configurada. Falta moderación central y protección antiabuso antes de promoción amplia. Detalle: [community-lists.md](community-lists.md).
