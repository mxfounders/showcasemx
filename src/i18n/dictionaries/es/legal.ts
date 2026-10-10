export const legal = {
  backHome: 'Volver al inicio',
  pages: {
    privacidad: {
      title: 'Política de privacidad',
      intro:
        'shwcs opera como directorio B2B y trata los datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y, en lo aplicable, al Reglamento General de Protección de Datos (GDPR). Responsable del tratamiento: shwcs, contacto hola@shwcs.site.',
      sections: [
        {
          id: 'bases-legales',
          title: 'Bases legales y tipología de datos',
          paragraphs: [
            'shwcs opera bajo los principios de minimización y transparencia. Procesamos datos bajo cuatro bases legales: consentimiento explícito (registrado digitalmente con versión de la cláusula aceptada), necesidad contractual (para proveer la plataforma y los servicios contratados), cumplimiento de obligaciones legales (por ejemplo, fiscales) e interés legítimo (para garantizar la seguridad y disponibilidad del sistema).',
            'Recopilamos datos de identidad y acceso mediante protocolos OAuth (como Google), limitándonos estrictamente al correo electrónico y un identificador único seguro. No almacenamos, procesamos ni tenemos visibilidad de credenciales externas ni de otros servicios vinculados a tu proveedor de identidad.',
            'A nivel operativo, recopilamos la información corporativa, descripciones y activos digitales que decides integrar a tu perfil, tus listas de guardados, y los metadatos de interacción con el sistema (rol declarado, sector, eventos de uso de funciones).',
          ],
        },
        {
          id: 'newsletter',
          title: 'Newsletter y comunicaciones por correo electrónico',
          paragraphs: [
            'Responsable del tratamiento: shwcs (hola@shwcs.site). Finalidad: enviar actualizaciones editoriales, novedades del catálogo y contenido relacionado con software y servicios empresariales. El newsletter puede incluir menciones patrocinadas de proyectos del catálogo, siempre identificadas como tales; nunca compartimos tu correo con anunciantes ni lo usamos para segmentación de perfiles comerciales.',
            'Base legal: consentimiento explícito. Al suscribirte mediante el formulario del sitio, otorgas un consentimiento libre, específico, informado e inequívoco cuya versión (newsletter-v2 o posterior) y fecha quedan registradas en nuestra base de datos. El consentimiento es revocable en todo momento sin consecuencias.',
            'Datos tratados: únicamente la dirección de correo electrónico y, si los proporcionas voluntariamente, tu nombre, rol (Fundador / Comprador) y sector de actividad. Estos datos no se utilizan para crear perfiles de comportamiento ni se combinan con fuentes externas.',
            'Conservación: los datos se conservan mientras la suscripción esté activa. Si te das de baja, la dirección de correo se marca como no suscrita (unsubscribed_at) y no se eliminan automáticamente del registro histórico de consentimientos por obligaciones de auditoría. Puedes solicitar la supresión completa enviando un correo a hola@shwcs.site.',
            'Subprocesador de envíos: los correos se despachan a través de Resend (resend.com), proveedor con sede en EE. UU. sujeto al marco de privacidad UE-EE. UU. (EU-US Data Privacy Framework). Resend actúa como encargado del tratamiento y recibe únicamente la dirección destinataria, el remitente y el contenido del mensaje; no tiene acceso a otros datos de tu cuenta.',
            'Cómo darte de baja: incluimos un enlace de cancelación al pie de cada correo. También puedes darte de baja en cualquier momento enviando un correo a hola@shwcs.site con el asunto «Baja newsletter». La baja se procesa en un plazo máximo de 48 horas hábiles.',
            'Cómo retirar el consentimiento: el retiro del consentimiento no afecta la licitud del tratamiento anterior. Para revocarlo formalmente, basta con darte de baja según el punto anterior o escribir a hola@shwcs.site.',
          ],
        },
        {
          id: 'subprocesadores',
          title: 'Infraestructura y subprocesadores',
          paragraphs: [
            'Toda la información es procesada mediante infraestructuras de grado empresarial. Utilizamos alojamiento y almacenamiento de archivos de Vercel (vercel.com), bases de datos en la nube (Neon, con alojamiento en AWS us-east-1), el proveedor de correo transaccional Resend y, para el pago de espacios patrocinados, Stripe (stripe.com). Estos subprocesadores cumplen con estándares de encriptación en tránsito (TLS 1.2+) y en reposo (AES-256).',
            'Al utilizar shwcs, reconoces que la información puede ser enrutada, procesada o almacenada en servidores distribuidos geográficamente por nuestros subprocesadores. Exigimos acuerdos de confidencialidad y medidas de seguridad estrictas a nuestra cadena de suministro tecnológico, pero shwcs no se hace responsable por eventos de fuerza mayor o vulneraciones originadas en la infraestructura subyacente.',
          ],
        },
        {
          id: 'privacidad-transaccional',
          title: 'Privacidad transaccional y terceros',
          paragraphs: [
            'La arquitectura de shwcs separa estrictamente la información pública de la privada. Los borradores, el contenido en revisión, tus notas analíticas y tus listas (salvo que declares lo contrario) residen en silos de acceso exclusivo para tu cuenta.',
            'El componente de contacto es un conducto pasivo. Al iniciar una solicitud de conexión con un proyecto listado, otorgas tu consentimiento explícito para transmitir tu información de perfil, correo y el contexto del mensaje al destinatario. A partir de la entrega, el tratamiento queda sujeto a las políticas del destinatario. shwcs carece de autoridad para auditar o revocar ese uso posterior.',
            'Las reseñas y los comentarios que publicas son públicos: muestran el nombre que escribes y, si los indicas, tu país y el tamaño de tu empresa. Para mostrar el nivel de verificación de una reseña («Correo verificado» o «Correo de empresa») usamos si confirmaste tu correo y su dominio; nunca publicamos tu correo ni su dominio. Puedes editar o borrar tus reseñas en cualquier momento, y se incluyen en la exportación de tus datos.',
            'Si publicas una solución puedes declarar su identificación fiscal (en México, el RFC). Es privada: solo la usamos para consultarla en registros públicos —en México, la lista del artículo 69-B del SAT— y mostrar el resultado en tu ficha, nunca el identificador. Si compruebas una compra en una reseña, enviamos al SAT el folio fiscal, los RFC y el total del CFDI para consultar su estado; guardamos solo el resultado, la fecha y una huella irreversible del folio que impide usar el mismo comprobante dos veces.',
          ],
        },
        {
          id: 'pagos',
          title: 'Pagos y espacios patrocinados',
          paragraphs: [
            'Cuando reservas un espacio patrocinado, el pago se realiza en la página segura de Stripe (stripe.com). Stripe recibe directamente los datos de tu tarjeta u otro método de pago; shwcs nunca los recibe ni los almacena. Durante el pago, Stripe también recaba tu dirección de facturación y, si la proporcionas, tu identificación fiscal, para calcular los impuestos y emitir el comprobante.',
            'shwcs conserva el registro de cada reserva: la ficha y el espacio contratados, las fechas, los montos, impuestos y reembolsos, el correo de la cuenta, la versión de las condiciones aceptadas y los identificadores de la transacción en Stripe. Finalidad: ejecutar el contrato, emitir comprobantes, gestionar cancelaciones, reembolsos y disputas, y cumplir obligaciones fiscales y contables. Bases legales: ejecución del contrato y cumplimiento de obligaciones legales.',
            'Stripe actúa como encargado del tratamiento para procesar el pago y, para la prevención de fraude y el cumplimiento regulatorio de los servicios financieros, como responsable independiente conforme a su propia política de privacidad (stripe.com/privacy). Sus servidores pueden encontrarse fuera de tu país, incluido Estados Unidos.',
            'Conservación: los registros de reservas y pagos se mantienen durante el plazo que exija la legislación fiscal y contable aplicable, incluso si eliminas tu ficha o tu cuenta. En ese caso se desvinculan de tu cuenta y solo se conserva lo necesario para esa obligación.',
            'Medición de los espacios patrocinados: contamos impresiones y clics como totales diarios, sin cookies, sin identificadores de visitante y respetando las señales DNT y GPC. Los anunciantes ven únicamente esos totales; nunca quién vio o abrió su anuncio, quién guardó su ficha ni datos de tu cuenta.',
          ],
        },
        {
          id: 'derechos',
          title: 'Tus derechos ARCO y globales',
          paragraphs: [
            'Puedes ejercer en todo momento los derechos de Acceso, Rectificación, Cancelación y Oposición (ARCO) conforme a la legislación aplicable en materia de protección de datos, así como los derechos ampliados del GDPR (portabilidad, limitación del tratamiento, derecho al olvido). Escríbenos a hola@shwcs.site indicando el derecho que deseas ejercer y, si es posible, el correo asociado a tu cuenta.',
            'Plazo de respuesta: 20 días hábiles para confirmar la recepción y resolver tu solicitud (prorrogable 20 días hábiles adicionales cuando la complejidad lo justifique). Algunos derechos pueden ejercerse directamente desde el panel de tu cuenta (edición de perfil, supresión de listas, eliminación de solicitudes). Para la supresión técnica completa, la solicitud por correo garantiza el borrado en todos los subsistemas incluyendo respaldos cifrados en sus ciclos de rotación. La supresión no alcanza los registros de pagos que debamos conservar por obligación legal, descritos en «Pagos y espacios patrocinados».',
            'Si resides en la Unión Europea y consideras que el tratamiento vulnera el GDPR, tienes derecho a presentar una reclamación ante la autoridad de control de tu Estado miembro. En México, la autoridad competente es la Secretaría Anticorrupción y Buen Gobierno, que asumió las funciones del extinto INAI con la LFPDPPP vigente desde el 21 de marzo de 2025. Si resides en otro país, puedes acudir a la autoridad de protección de datos correspondiente a tu jurisdicción.',
            'shwcs es un directorio B2B diseñado exclusivamente para profesionales y entidades comerciales. El servicio no está dirigido a consumidores finales ni a menores de 18 años. Procederemos a la eliminación inmediata de cualquier cuenta o suscripción que incumpla este parámetro.',
          ],
        },
        {
          id: 'telemetria',
          title: 'Auditoría, telemetría y cambios a esta política',
          paragraphs: [
            'Desplegamos instrumentación telemétrica para garantizar el rendimiento, prevenir abusos (rate limiting) y generar métricas de visibilidad para los fundadores. Este procesamiento utiliza contadores efímeros y funciones hash irreversibles. No construimos perfiles individuales ni empleamos cookies de rastreo transversal.',
            'Esta política puede actualizarse. Cuando los cambios sean materiales, lo comunicaremos con al menos 15 días de anticipación a los suscriptores activos del newsletter. La versión vigente siempre estará disponible en shwcs.site/privacidad con la fecha de última actualización. Última revisión: octubre de 2026.',
          ],
        },
      ],
    },
    terminos: {
      title: 'Términos de servicio',
      intro:
        'Condiciones vinculantes y marco de responsabilidad aplicable a todas las interacciones, cuentas y contratos relacionados con la plataforma shwcs.',
      sections: [
        {
          id: 'naturaleza',
          title: 'Naturaleza del servicio y jurisdicción',
          paragraphs: [
            'shwcs funciona como un directorio informativo y conducto de descubrimiento de soluciones tecnológicas, y vende espacios patrocinados identificados como tales. No somos proveedores, distribuidores, brokers, consultores ni agentes de ninguna de las entidades que figuran en el catálogo.',
            'Cualquier uso de la plataforma constituye una aceptación total de estas condiciones. Los usuarios que representen a una empresa garantizan poseer la autoridad legal para vincular a dicha entidad a estos términos.',
          ],
        },
        {
          id: 'garantias',
          title: 'Limitación exhaustiva de garantías',
          paragraphs: [
            'Nuestra plataforma se provee "tal cual" (AS-IS) y "según disponibilidad" (AS-AVAILABLE). shwcs renuncia expresamente a cualquier garantía, ya sea explícita o implícita, incluyendo pero sin limitarse a garantías de comerciabilidad, adecuación para un propósito particular, calidad o no infracción.',
            'No garantizamos tiempos de disponibilidad del servidor (uptime), la preservación intacta de la información no guardada, ni que el servicio esté libre de errores, interrupciones o ataques cibernéticos.',
          ],
        },
        {
          id: 'responsabilidad',
          title: 'Exención de responsabilidad máxima',
          paragraphs: [
            'Bajo ninguna circunstancia, ni bajo ninguna teoría legal (agravio, contrato, negligencia o responsabilidad estricta), shwcs, sus directivos, empleados o afiliados serán responsables de daños indirectos, incidentales, punitivos, lucro cesante, pérdida de datos, o interrupción de negocios que resulten del uso o la incapacidad de usar la plataforma.',
            'Toda evaluación, auditoría técnica, revisión de solvencia y negociación de acuerdos (SLA, NDA, contratos de servicio) es responsabilidad exclusiva y absoluta entre el comprador y el proveedor. shwcs queda totalmente liberado de cualquier disputa resultante de dichas interacciones.',
          ],
        },
        {
          id: 'propiedad-intelectual',
          title: 'Propiedad intelectual y restricciones absolutas',
          paragraphs: [
            'El código fuente, algoritmos, arquitectura de datos, logotipos, diseño de interfaz (UI/UX) y la compilación de la base de datos de shwcs están protegidos por leyes internacionales de propiedad intelectual.',
            'Queda terminantemente prohibida cualquier forma de ingeniería inversa, extracción sistemática de datos (scraping, crawling, spidering), minería de bases de datos, reventa del servicio o la creación de trabajos derivados sin autorización explícita por escrito.',
          ],
        },
        {
          id: 'contenido',
          title: 'Contenido, licencias y moderación',
          paragraphs: [
            'Al someter activos, textos, logotipos y descripciones a shwcs, el usuario retiene la titularidad de su propiedad intelectual, pero otorga a shwcs una licencia global, perpetua, libre de regalías y transferible para alojar, ejecutar, modificar (para fines técnicos de visualización) y distribuir dicho contenido en la plataforma.',
            'El usuario asume responsabilidad legal total por la originalidad y los derechos de dicho contenido.',
            'shwcs ejerce una potestad de moderación unilateral. Nos reservamos el derecho inapelable de suspender cuentas, rechazar postulaciones, degradar visibilidad o eliminar fichas de forma inmediata y sin necesidad de justificación si determinamos riesgo legal, suplantación, baja calidad o violación de la filosofía del servicio.',
          ],
        },
        {
          id: 'resenas',
          title: 'Reseñas',
          paragraphs: [
            'Una reseña debe describir tu propia experiencia con la solución. No se permite reseñar una solución propia, la de tu empleador o la de un competidor directo, ni publicar reseñas a cambio de pagos, descuentos u otros beneficios que dependan de lo que digas.',
            'Quien publica la solución puede responder en público, pero no puede editar ni borrar reseñas. shwcs puede ocultar una reseña que incumpla estas reglas, contenga datos personales de terceros o sea ofensiva; quien la escribió verá el motivo y puede corregirla.',
            'Las reseñas influyen en el orden del catálogo según reglas publicadas en /criterios. Ningún pago cambia una reseña, su visibilidad ni su peso.',
          ],
        },
        {
          id: 'publicidad',
          title: 'Publicidad y espacios patrocinados',
          paragraphs: [
            'shwcs vende espacios patrocinados: un lugar identificado como «Patrocinado» en las páginas de categoría, en la página de inicio o, cuando se envíe, en el newsletter. Cada reserva cubre días naturales completos, de 00:00 a 23:59 hora de Ciudad de México, para una ficha y un espacio concretos. El precio es el número de días por la tarifa diaria vigente al momento de pagar; se paga por adelantado y no se renueva automáticamente.',
            'Solo pueden comprar espacios las cuentas cuya ficha haya sido aprobada por el equipo editorial, y solo empresas o profesionales que compran para su actividad. Al reservar declaras que compras en esa calidad y que tienes autoridad para obligar a la entidad que representas.',
            'El pago no compra la aprobación de una ficha ni su posición en el catálogo. Los espacios patrocinados se muestran separados de los resultados orgánicos y siempre etiquetados; no influyen en el orden del catálogo, la búsqueda, las colecciones ni las listas de la comunidad, y no constituyen aval, verificación ni certificación de shwcs.',
            'Los precios se expresan en dólares estadounidenses (USD) o pesos mexicanos (MXN), según elijas, sin impuestos. Los impuestos aplicables, como el IVA, se calculan y añaden en el pago a partir de tu dirección de facturación y tu identificación fiscal. El pago se procesa a través de Stripe y la reserva solo se confirma cuando Stripe confirma el cobro; una reserva no pagada se libera. Un cambio de tarifa aplica solo a reservas nuevas. Los comprobantes se emiten a través de Stripe; si necesitas un comprobante fiscal específico de tu país, escríbenos a hola@shwcs.site antes de comprar.',
            'Puedes cancelar una reserva desde tu cuenta en cualquier momento. Se reembolsa cada día reservado que empiece al menos 24 horas después de la cancelación; los días que ya empezaron o empiezan en menos de 24 horas se consideran entregados y se siguen mostrando. Ejemplo: si el lunes a las 10:00 cancelas una reserva de lunes a domingo, se muestran el lunes y el martes y se reembolsan del miércoles al domingo. Si cancelas al menos 24 horas antes del primer día, el reembolso es total.',
            'Podemos rechazar una reserva antes del pago o retirar un espacio en cualquier momento. Si lo retiramos por decisión propia o por causas que no te son imputables, reembolsamos todos los días no servidos, incluido el día en curso. Si lo retiramos porque la ficha o su contenido incumplen estos términos (por ejemplo, por información engañosa o suplantación), el espacio se detiene de inmediato y reembolsamos los días completos restantes a partir del día siguiente, salvo en casos de fraude, contenido ilícito o engaño deliberado, en los que podremos retener el importe de los días no servidos en la medida en que la ley lo permita. Si tu ficha deja de estar publicada durante una reserva, el espacio deja de mostrarse y revisaremos el caso para reembolsar los días no servidos conforme a este párrafo.',
            'Si por causas de shwcs un espacio no se muestra durante cuatro horas o más, acumuladas, en un día reservado, o el newsletter no se envía en la fecha reservada, ese día se considera no entregado y puedes elegir un día de reposición en el mismo espacio o el reembolso proporcional de ese día. Debes reclamarlo dentro de los 30 días siguientes al final de la reserva escribiendo a hola@shwcs.site. Si una causa de fuerza mayor impide mostrar un espacio durante más de cinco días hábiles, cualquiera de las partes puede cancelar los días restantes con reembolso de los no servidos. Estos son los únicos remedios por fallas de entrega; un menor tráfico, menos clics o menos contactos no constituyen una falla.',
            'No garantizamos impresiones, clics, contactos, ventas ni ningún resultado comercial. Las métricas de los espacios son totales agregados que pueden omitir eventos (por bloqueadores de contenido o por las señales DNT y GPC); son informativas y no sirven de base de cobro.',
            'Los reembolsos se emiten al método de pago original, en la moneda original, e incluyen la parte proporcional de los impuestos. Pueden tardar de 5 a 10 días hábiles en reflejarse, según tu banco. No se reembolsan diferencias cambiarias ni comisiones cobradas por terceros.',
            'Antes de disputar un cargo con tu banco, escríbenos: resolvemos la mayoría de los casos directamente. Mientras una disputa esté abierta, el espacio se pausa, no podemos emitir reembolsos fuera de ese proceso y podremos suspender nuevas compras de la cuenta.',
            'Eliminar tu cuenta equivale a cancelar tus reservas activas y futuras conforme a la regla de 24 horas. Conservamos los registros de pago durante el tiempo que exija la ley, como se explica en la Política de privacidad.',
            'Eres responsable de que la información de tu ficha sea veraz y de cumplir las leyes de publicidad y de protección al consumidor que te apliquen. La sección de indemnidad de estos términos aplica también a los espacios patrocinados.',
          ],
        },
        {
          id: 'indemnidad',
          title: 'Indemnidad (Hold Harmless)',
          paragraphs: [
            'El usuario acuerda indemnizar, defender y mantener indemne a shwcs y sus afiliados de y contra cualquier reclamación, daño, obligación, pérdida, responsabilidad, costo o deuda, y gasto (incluyendo honorarios legales) que surja de: (a) su uso y acceso a la plataforma; (b) su violación de cualquier término aquí establecido; o (c) cualquier reclamo derivado de su contenido o sus interacciones con terceros a través de nuestro conducto.',
          ],
        },
        {
          id: 'fuerza-mayor',
          title: 'Fuerza mayor y modificaciones',
          paragraphs: [
            'shwcs no será responsable de ningún retraso o fallo en el rendimiento resultante directa o indirectamente de causas que escapan a nuestro control razonable (huelgas, fallas de internet, catástrofes naturales, actos gubernamentales).',
            'Nos reservamos el derecho exclusivo de alterar, actualizar o modificar estos términos en cualquier instante. La continuación en el uso de los servicios después de cualquier revisión constituye un consentimiento vinculante a las nuevas normativas.',
          ],
        },
      ],
    },
    cookies: {
      title: 'Cookies y medición',
      intro:
        'shwcs usa exclusivamente cookies técnicas necesarias para el funcionamiento seguro de la sesión. No empleamos cookies analíticas de terceros ni rastreo publicitario.',
      sections: [
        {
          id: 'sesion',
          title: 'Cookies de sesión',
          paragraphs: [
            'La cookie de acceso es HttpOnly, SameSite=Lax y Secure en producción. No puede ser leída por JavaScript del cliente ni compartida entre sitios. El flujo de autenticación con Google utiliza una cookie temporal de seguridad (state) que caduca en diez minutos y se elimina automáticamente al completar el flujo.',
          ],
        },
        {
          id: 'metricas',
          title: 'Métricas agregadas sin identificación',
          paragraphs: [
            'El contador de visitas y clics de fichas funciona mediante hashes irreversibles del lado del servidor. No crea cookies analíticas, no genera un identificador de visitante permanente y no construye un perfil de comportamiento. Los contadores respetan señales DNT y GPC. Pueden omitir eventos por bloqueadores de contenido o limitaciones técnicas.',
          ],
        },
        {
          id: 'servicios-externos',
          title: 'Servicios externos',
          paragraphs: [
            'Los sitios, demos y redes sociales que abras desde shwcs tienen sus propias políticas de cookies y son responsables de su tratamiento. shwcs no controla, comparte datos con, ni es responsable de las cookies de esos terceros.',
            'Al pagar un espacio patrocinado, el pago ocurre en la página de Stripe, que puede usar sus propias cookies necesarias para el pago y la prevención de fraude conforme a su política.',
          ],
        },
        {
          id: 'sin-publicidad',
          title: 'Sin cookies de publicidad ni retargeting',
          paragraphs: [
            'shwcs no usa ni planea usar cookies publicitarias, píxeles de seguimiento (Facebook Pixel, Google Ads, etc.) ni cualquier tecnología de retargeting. No vendemos datos de visitantes a redes publicitarias.',
            'Los espacios patrocinados de shwcs tampoco usan cookies ni píxeles: se miden de forma agregada y de primera mano, como el resto de nuestras métricas.',
          ],
        },
      ],
    },
  },
} as const;
