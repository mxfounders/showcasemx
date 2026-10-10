export const faq = {
  metaTitle: 'Preguntas frecuentes',
  title: 'Preguntas<br />frecuentes',
  intro: 'Lo esencial para descubrir proyectos, gestionar tu cuenta y publicar en el directorio.',
  link: 'Conocer el proyecto',
  groups: {
    account: {
      title: 'Cuenta y privacidad',
      items: [
        {
          question: '¿Quién puede usar una cuenta?',
          answer:
            'Una persona puede explorar soluciones y publicar sus propios proyectos. Comprador y fundador son vistas de trabajo dentro de una misma cuenta; no son permisos separados.',
        },
        {
          question: '¿Mis listas y notas son públicas?',
          answer:
            'Tus guardados y notas son siempre privados. Las listas solo se comparten si decides publicarlas. Guardar un proyecto no envía ninguna notificación a su equipo ni crea solicitudes de contacto.',
        },
        {
          question: '¿Qué información se comparte al contactar?',
          answer:
            'Solo al enviar explícitamente una solicitud autorizas compartir la información y el contexto de uso que hayas escrito con el destinatario.',
        },
      ],
    },
    contact: {
      title: 'Contacto y decisiones',
      items: [
        {
          question: '¿Cómo contacto a un proyecto?',
          answer:
            'Desde su ficha puedes enviar una solicitud con contexto sobre tu problema y escenario. Las respuestas del equipo se consultan directamente dentro de tu cuenta en shwcs.',
        },
        {
          question: '¿shwcs recomienda contratar las soluciones publicadas?',
          answer:
            'Publicar facilita evaluar y contactar con un equipo, pero no es una recomendación de compra ni garantiza resultados. Debes confirmar las condiciones y alcances directamente con el proyecto.',
        },
        {
          question: '¿Intervienen en la contratación o pagos?',
          answer:
            'No. shwcs es un espacio para descubrir y presentar proyectos con claridad. No procesa la contratación, facturación ni los acuerdos entre empresas y proveedores.',
        },
      ],
    },
    publishing: {
      title: 'Publicación de proyectos',
      items: [
        {
          question: '¿Qué se necesita para postular?',
          answer:
            'Cualquier fundador con una cuenta activa puede enviar un borrador. Necesitas aportar contexto real: el problema que resuelves, para quién funciona, el alcance, limitaciones, precios y evidencia que respalde lo que ofreces.',
        },
        {
          question: '¿Puedo actualizar un proyecto ya publicado?',
          answer:
            'Sí. Tus cambios se guardan como un nuevo borrador y pasan por revisión editorial. Mientras tanto, tu versión pública actual seguirá mostrándose sin interrupciones hasta que se aprueben los cambios.',
        },
        {
          question: '¿Cuánto tiempo tarda la revisión?',
          answer:
            'No hay un plazo de respuesta prometido. Revisa las notificaciones de tu cuenta para consultar decisiones, cambios solicitados o aprobaciones.',
        },
      ],
    },
    review: {
      title: 'Revisión editorial',
      items: [
        {
          question: '¿Estar publicado es una certificación de calidad?',
          answer:
            'No. Una ficha aprobada significa que el proyecto explicó su contexto claramente. No equivale a una auditoría de seguridad, revisión de solvencia, ni asegura que cumplirán sus resultados.',
        },
        {
          question: '¿Qué pasa si mi proyecto es rechazado?',
          answer:
            'El equipo editorial debe explicar el motivo de cada decisión. Una solicitud de cambios o un rechazo siempre incluye un comentario del revisor, dándote la oportunidad de corregir la información y volver a enviarla.',
        },
        {
          question: '¿Cómo reporto información falsa o problemas?',
          answer:
            'No aceptamos suplantación de identidad, afirmaciones engañosas ni contenido ilícito. Puedes reportar cualquier ficha directamente desde su página para que sea evaluada y, si procede, retirada.',
        },
      ],
    },
  },
} as const;
