import { escapeHtml, renderEmailHtml } from './email-template';

/**
 * Account emails that do not go through the notices table, as pure builders so the
 * senders (src/lib/auth/verification.ts, recovery.ts) and the development preview
 * (api/dev/email-preview) render exactly the same message.
 */
export type BuiltEmail = { subject: string; text: string; html: string };

export function verificationEmail(origin: string, link: string): BuiltEmail {
  return {
    subject: 'Confirma tu correo en shwcs',
    text: `Confirma que este correo es tuyo:\n${link}\n\nEl enlace caduca en 30 minutos. Si no lo solicitaste, ignora este correo.`,
    html: renderEmailHtml({
      origin,
      preheader: 'Confirma tu correo en shwcs',
      heading: 'Confirma tu correo',
      paragraphs: [
        'Confirma que este correo es tuyo para activar avisos y contacto en tu cuenta de shwcs.',
        'El enlace caduca en 30 minutos.',
      ],
      button: { label: 'Confirmar correo', href: link },
      footerNote: 'Si no lo solicitaste, ignora este correo.',
    }),
  };
}

export function resetEmail(origin: string, link: string): BuiltEmail {
  return {
    subject: 'Restablece tu contraseña de shwcs',
    text: `Abre este enlace para elegir una nueva contraseña:\n${link}\n\nCaduca en 30 minutos y solo puede usarse una vez. Si no lo solicitaste, ignora este correo.`,
    html: renderEmailHtml({
      origin,
      preheader: 'Restablece tu contraseña de shwcs',
      heading: 'Restablece tu contraseña',
      paragraphs: [
        'Recibimos una solicitud para elegir una nueva contraseña en tu cuenta de shwcs.',
        'El enlace caduca en 30 minutos y solo puede usarse una vez.',
      ],
      button: { label: 'Elegir nueva contraseña', href: link },
      footerNote:
        'Si no lo solicitaste, ignora este correo: tu contraseña actual sigue funcionando.',
    }),
  };
}

/**
 * A security notice (SHCWS-154): what happened and on which device are in the title; this
 * adds when. «No fui yo» leads to choosing a new password, which closes every open
 * session (consumeReset); a GET link must never change anything by itself (CLAUDE.md §5).
 */
export function securityNotice(title: string, createdAt: string | Date) {
  const when = new Date(createdAt).toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  });
  return {
    subject: title,
    heading: title,
    button: 'No fui yo',
    paragraphs: [
      `<strong>Cuándo:</strong> ${escapeHtml(when)} (hora del centro de México).`,
      'Si fuiste tú, no tienes que hacer nada. Si no, elige una contraseña nueva ahora: eso cierra todas las sesiones abiertas de tu cuenta.',
    ],
    text: `${title}.\nCuándo: ${when} (hora del centro de México).\n\nSi no fuiste tú, elige una contraseña nueva: eso cierra todas las sesiones abiertas.`,
  };
}
