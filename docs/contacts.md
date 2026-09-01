# Comparador y contacto — entrega del 30 de agosto de 2026

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
