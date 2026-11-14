import type { Dictionary } from '@/i18n/dictionary';
import { resetEmail, securityNotice, verificationEmail } from './account-emails';
import { composeNotice, type NoticeEmail } from './compose';
import { contactNotificationEmail } from './contact-email';
import { listingNotificationEmail } from './listing-email';
import { welcomeEmail } from './welcome-email';

/**
 * Sample emails for the development preview (api/dev/email-preview) and the snapshot
 * tests (SHCWS-161), built with the same functions the senders use and fictional data:
 * no account, listing or address here is real.
 */
const listingId = '00000000-0000-4000-8000-000000000001';
const accountId = '00000000-0000-4000-8000-000000000002';

export const previewTemplates = [
  'verification',
  'reset',
  'contact-new',
  'contact-message',
  'listing-changes',
  'listing-review',
  'ad-starts',
  'security',
  'welcome',
] as const;
export type PreviewTemplate = (typeof previewTemplates)[number];

export const isPreviewTemplate = (value: unknown): value is PreviewTemplate =>
  previewTemplates.some(template => template === value);

export function previewEmail(
  template: PreviewTemplate,
  origin: string,
  labels: Pick<Dictionary['contacts'], 'teamSizes' | 'timelines' | 'statuses'>,
  secret?: string,
): { subject: string; html: string; text: string; headers?: Record<string, string> } {
  if (template === 'verification')
    return verificationEmail(origin, `${origin}/verify-email#token=ejemplo`);
  if (template === 'reset') return resetEmail(origin, `${origin}/reset-password#token=ejemplo`);

  const notice = (email: NoticeEmail, category: string, buttonHref: string, footerNote = '') => ({
    subject: email.subject,
    ...composeNotice({ origin, email, buttonHref, footerNote, category, accountId, secret }),
  });
  const listing = (
    title: string,
    event: Parameters<typeof listingNotificationEmail>[0]['event'],
  ) => {
    const built = listingNotificationEmail({
      title,
      solutionId: listingId,
      solutionName: 'Atlas Cobranza',
      origin,
      event,
    });
    return notice({ ...built, button: built.button.label }, 'solution', built.button.href);
  };

  switch (template) {
    case 'contact-new':
      return notice(
        contactNotificationEmail({
          title: 'Nueva solicitud para Atlas Cobranza',
          event: {
            status: 'new',
            kind: 'status',
            message: '',
            projectName: 'Atlas Cobranza',
            details: {
              name: 'Laura Méndez',
              company: 'Distribuidora Norte',
              size: 'pyme',
              timeline: 'En 1–3 meses',
              budget: 'Entre 500 y 1,000 USD al mes',
              need: 'Queremos dejar de cobrar por WhatsApp: recordatorios automáticos y un estado de cuenta por cliente.',
            },
            fromOtherSide: true,
          },
          toRecipient: true,
          labels,
        }),
        'contact',
        `${origin}/es/account/opportunities/${listingId}`,
      );
    case 'contact-message':
      return notice(
        contactNotificationEmail({
          title: 'Atlas Cobranza te respondió',
          event: {
            status: 'conversation',
            kind: 'message',
            message: 'Hola, Laura. ¿Te funciona una demo de 20 minutos el jueves a las 11?',
            projectName: 'Atlas Cobranza',
            details: {},
            fromOtherSide: true,
          },
          toRecipient: false,
          labels,
        }),
        'contact',
        `${origin}/es/account/contacts/${listingId}`,
      );
    case 'listing-changes':
      return listing('El equipo pidió cambios en Atlas Cobranza', {
        kind: 'decision',
        status: 'changes_requested',
        message:
          'Falta el rango de precio y para quién no es. Con eso la publicamos esta misma semana.',
      });
    case 'listing-review':
      return listing('Nueva reseña en Atlas Cobranza', {
        kind: 'review',
        rating: 5,
        headline: 'Dejamos de perseguir pagos por WhatsApp',
      });
    case 'ad-starts':
      return listing('Tu espacio patrocinado de Atlas Cobranza empieza mañana', {
        kind: 'other',
      });
    case 'security':
      return notice(
        securityNotice('Nuevo inicio de sesión: Chrome en macOS', '2026-11-14T18:30:00Z'),
        'security',
        `${origin}/es/forgot-password`,
        'Los avisos de seguridad siempre se envían; no se pueden desactivar.',
      );
    case 'welcome': {
      const built = welcomeEmail({
        profile: 'founder',
        origin,
        categories: [{ title: 'Cobros', slug: 'cobros' }],
      });
      return notice(
        {
          subject: built.subject,
          heading: built.heading,
          button: built.button.label,
          paragraphs: built.paragraphs,
          text: built.paragraphs.join('\n'),
        },
        'account',
        built.button.href,
        'Te escribimos una sola vez, al terminar de crear tu cuenta.',
      );
    }
    default:
      throw new Error('Unknown preview template');
  }
}
