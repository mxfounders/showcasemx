# Comparador y contacto — entrega del 30 de agosto de 2026

> **Vigente desde el 14 de noviembre de 2026 (SHCWS-168, decisión de André en
> SHCWS-63): las solicitudes tienen una conversación.** Comprador y destinatario se
> escriben mensajes de 1–2000 caracteres mientras la solicitud está nueva o en
> conversación (`POST /api/contacts/[id]/messages`). El primer mensaje del destinatario
> la pasa a «En conversación». Cada mensaje es un evento con `kind = 'message'`
> (`db/contact-messages.sql`) y avisa a la otra parte, con correo inmediato si tiene los
> avisos activos y el correo verificado. Cerrar, reabrir y retirar siguen igual, como
> acciones secundarias. Quién tiene el turno sale de quién habló al último
> (`whoseTurn`, `src/lib/contacts/thread.ts`) y se ve en el hilo y en «Te toca» de
> Inicio. No hay tiempo real: el hilo se actualiza al enviar o al recargar. Donde este
> documento dice «no hay chat» o «no hay mensajes fuera de transiciones», manda este
> párrafo.

> **Vigente desde el 14 de noviembre de 2026 (SHCWS-61): recordatorios y «sin
> respuesta».** Una solicitud sin respuesta es la que el destinatario nunca tocó: ni un
> mensaje ni un cambio de estado (siempre sigue «nueva»). El cron diario de correo
> (`/api/internal/mail`, sin cron nuevo) ejecuta `runContactReminders()`
> (`src/lib/contacts/reminders.ts`; reglas puras en `reminder-model.ts`):
>
> - **48 h**: aviso al destinatario «Recordatorio: {empresa} espera tu respuesta sobre
>   {proyecto}» (`contact-reminder:<id>:48h`).
> - **5 días**: segundo aviso, que dice qué pasa a los 7 (`contact-reminder:<id>:5d`).
> - **7 días**: `contact_requests.unanswered_at` y aviso al comprador «{proyecto} no
>   respondió a tu solicitud» (`contact-unanswered:<id>`), con hasta tres soluciones
>   parecidas (`pickSimilar` sobre el catálogo orgánico, nunca la misma ficha, una propia
>   del comprador ni una que ya contactó) y siempre el enlace a
>   `/contacto?motivo=find&necesidad=Busco algo parecido a {proyecto}`; sin parecidas,
>   ese enlace es el botón. La necesidad del comprador nunca viaja en la URL.
>
> Como el cron corre una vez al día, «48 h» es la primera ejecución después de las 48 h
> (hasta un día más tarde). Cada ejecución solo actúa sobre el último paso vencido: si
> faltó una semana, no manda el aviso de 48 h al quinto día. El aviso al comprador solo se
> escribe si el paso venció hace menos de una semana; una solicitud más vieja (primera
> ejecución en un entorno nuevo) se marca en silencio. Es idempotente: `source_key` es
> único y `unanswered_at` solo se escribe si sigue vacío, así que repetir no envía nada
> dos veces. Es *best-effort*: si falla, el cron lo registra y sigue. Los avisos usan la
> categoría `contact`: siguen la preferencia de correo de contacto y solo llegan a
> correos verificados; el destinatario suspendido no recibe recordatorios. El correo se
> arma al enviarse: si el destinatario ya respondió, se marca `skipped`. Los
> recordatorios del fundador van también a la dirección privada de la ficha, como la
> solicitud original.
>
> «Sin respuesta» **no es un estado**: la solicitud sigue «nueva», el destinatario puede
> responder y el comprador retirarla. Ambos ven la etiqueta en la bandeja y en el detalle
> mientras el destinatario no haya escrito; el comprador ve además las alternativas
> («Mientras tanto, alternativas parecidas»). Una respuesta tardía quita la etiqueta;
> `unanswered_at` se queda como registro. En la señal de respuesta del proyecto, una
> solicitud marcada cuenta como no respondida aunque el comprador la retire después
> (antes, retirar la sacaba del cálculo); una respuesta tardía cuenta como respondida, con
> su tiempo lento en la mediana. Ops la ve en `/panel/contactos` (solo metadatos).
> Migración `db/contact-reminders.sql`. Pruebas: `tests/contact-reminders.test.ts` y
> `RUN_CONTACT_REMINDERS_INTEGRATION=1 npx tsx --env-file=<repo>/.env.local
> tests/integration/contact-reminders.ts` (opcional `APP_ORIGIN` y `RESEND_TEST_EMAILS=1`).

> Actualización vigente, 31 agosto 2026: [launch.md](launch.md) incorpora avisos y
> verificación de correo, OAuth Google preparado, TXT de dominio, reportes/retirada
> y métricas. La migración launch-foundation.sql está aplicada a la base configurada.
> Proveedores externos y despliegue siguen pendientes; las notas inferiores sobre
> estas funciones describen entregas anteriores.

## Qué resuelve

Comparar opciones guardadas, pedir contacto de forma explícita y responder desde
la cuenta propietaria. El comprador consulta el seguimiento en Mis contactos.
No hay chat ni entrega por correo; persistir en la bandeja es la entrega de este MVP.

## Comparador

Desde /account/lists/[id], seleccionar 2–3 proyectos y abrir /compare con project
repetido en query. El servidor comprueba propiedad de la lista, pertenencia de todos
los proyectos, identidad válida, duplicados y máximo. Las notas de la lista permanecen
privadas. Muestra problema, audiencia, alcance, precio, implementación, integraciones,
soporte, evidencia y notas, sin puntuaciones ni valores inventados. Información de
founder_solutions tomada exclusivamente de published_data actual, no borradores.
La tabla tiene región enfocable y scroll horizontal en móvil.

Cord y Flouvia estáticos pueden compararse, pero las condiciones comerciales no
documentadas aparecen como faltantes. Sus entradas ya están vinculadas a publicaciones con dueño de cuenta autorizado
expresamente por el usuario y permiten solicitar contacto dentro de shwcs. No se asignan oportunidades por nombre,
dominio o email coincidente. El contacto interno funciona para publicaciones con
owner_id confirmado mediante el flujo de postulación/revisión.

## Solicitud

1. Desde ficha pública, guardados/lista o comparador, abrir contacto del proyecto.
2. Entrar/registrarse si hace falta; authReturnTo conserva el proyecto.
3. Completar nombre, empresa, tamaño, plazo, necesidad y presupuesto opcional.
4. Revisar el resumen con el correo de la cuenta y el destinatario.
5. Autorizar con casilla explícita y enviar.
6. Abrir seguimiento propio; el propietario ve la misma solicitud en Oportunidades.

El correo procede de la sesión y todavía no está verificado. Esa limitación se señala
al destinatario. El consentimiento contact-v1 se registra con fecha. No comparte
listas, notas, guardados ni inscribe al newsletter. No se enviaron correos a personas
reales en esta entrega.

## API y permisos

POST /api/contacts:
- create: id UUID, solutionId, recipientId esperado, datos, consent:true,
  consentVersion:contact-v1. El servidor valida dueño/publicación y destinatario
  esperado. Rechaza auto-contacto y borradores.
- update: id, status, version, message. Solo el participante autorizado puede
  ejecutar la transición; el comprador no puede responder como fundador.

Modelo en src/lib/contacts/model.ts; servicio en server.ts; HTTP en route.ts.
Cuerpo máximo 32768 bytes; errores propios; mismo origen y sesión obligatorios.
Respuesta sin caché. Excepciones de infraestructura no filtran consultas ni credenciales.
El log de error solo incluye evento genérico y requestId.

## Estados

| Estado | Comprador | Destinatario |
| --- | --- | --- |
| Nueva | Retirar | Responder en conversación o cerrar |
| En conversación | Retirar | Cerrar con respuesta |
| Cerrada | Consultar | Reabrir con respuesta |
| Retirada | Consultar | Consultar |

Respuesta del destinatario: 10–2000 caracteres y confirmación antes de publicar.
Retirada terminal, con advertencia de que no borra datos ya recibidos.
Una solicitud por comprador/proyecto incluso después de cerrar/retirar.
No hay reenvío nuevo tras retiro en esta versión. No hay mensajes fuera de transiciones.

Status/version y evento cambian atómicamente. Conflicto de versión devuelve 409:
recargar, revisar y repetir conscientemente. No sobrescribir desde pestañas antiguas.

## Datos y operación

db/contact-requests.sql crea contact_requests y contact_events. Requiere auth y
founder-solutions. Aplicada y probada contra la base configurada localmente.
Otro entorno/base necesita su propia aplicación verificada.

Campos capturados como instantánea: project_name, buyer_email y details.
buyer_id/recipient_id/solution_id son referencias; no se migra destinatario al editar
ficha. Retirar publicación conserva conversaciones existentes; borrar cuenta o
solución en BD elimina solicitudes y eventos relacionados en cascada. Falta definir
retención operativa/exportación antes de ofrecer borrado de cuenta.

Límites: nombre 100, empresa 150, necesidad 2000, presupuesto 200; tamaños y plazos
enumerados. Cuota 1000 solicitudes/comprador; 20 intentos de creación/hora, 100
actualizaciones/hora y 60/minuto global por scope. Una clave única evita duplicados;
crear serializa por comprador y reintentar retorna solicitud existente.
Bandejas con filtros y páginas de 20; Actualizar vuelve a consultar servidor.

## Pruebas reproducibles

- npx tsx --test tests/*.test.ts: 32 pruebas.
- RUN_CONTACT_INTEGRATION=1 node tests/integration/contacts.cjs: servidor en
  localhost:3000, tablas aplicadas y .env.local. Crea tres cuentas de prueba
  @example.invalid; limpia cuentas/datos y contadores propios en finally.
- Cubre comparación privada, aislamiento de borrador, consentimiento, identidad,
  destinatario, auto-contacto, duplicados, concurrencia, bandejas/detalle ajenos,
  respuestas, cierre/reapertura, retiro terminal e historial atómico.
- Lint, TypeScript y build de producción en copia aislada: correctos.
- No se hizo push ni despliegue; no confundir con validación de producción.

## Pendientes de producto

Verificación de email, avisos configurables, reportes/antispam, vinculación de futuras
entradas estáticas, mejores fichas, inicio adaptativo, política de retención y
métricas reales. No hace falta construir chat/CRM completo para probar este recorrido.

## Revisión visual realizada

En navegador: selección de dos proyectos desde lista, tabla con información
publicada/notas propias, solicitud con datos precargados de perfil, error inline
sin consentimiento, envío a cuenta temporal y seguimiento. El propietario abrió
Oportunidades, respondió y el comprador consultó esa respuesta desde su propia sesión.
En móvil de 375 px, comparador con scroll interno (tabla 740px, página 375px),
formulario y seguimiento sin desbordamiento horizontal.

Detalle del destinatario en /account/opportunities/[id], manteniendo sidebar activa
en Oportunidades. El comprador usa /account/contacts/[id]. El destinatario que abre
esta última se redirige a su ruta; terceros no acceden a ninguna.
Fechas de bandeja/historial usan CDMX.

Cuentas, fichas, listas, solicitudes y notas temporales de revisión eliminadas.
