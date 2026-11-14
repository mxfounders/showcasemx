import { escapeHtml } from './email-template';

/**
 * shwcs's own request for a review, 30 days after the buyer's conversation with a vendor
 * through shwcs (SHCWS-135). Nothing from the conversation is quoted: only the listing's
 * public name. Spanish until accounts store a language (§63), like the other notices.
 */
export function reviewRequestEmail({
  title,
  solutionId,
  solutionName,
  origin,
}: {
  title: string;
  solutionId: string;
  solutionName: string;
  origin: string;
}) {
  const name = escapeHtml(solutionName);
  const href = `${origin}/es/account/reviews/${solutionId}`;
  return {
    subject: title,
    heading: title,
    paragraphs: [
      `Hace un mes hablaste con <strong>${name}</strong> por shwcs. Si llegaste a usarlo o a evaluarlo a fondo, tu reseña ayuda a otras empresas a decidir.`,
      'Tu reseña mostrará «Contactó vía shwcs»: dice que hubo una conversación, nunca lo que hablaron. Se publica tal como la escribas, buena o mala, y el proyecto no puede editarla ni borrarla.',
    ],
    button: { label: 'Escribir mi reseña', href },
    text: [
      title,
      '',
      `Hace un mes hablaste con ${solutionName} por shwcs. Si llegaste a usarlo o a evaluarlo a fondo, tu reseña ayuda a otras empresas a decidir.`,
      'Tu reseña mostrará «Contactó vía shwcs»: dice que hubo una conversación, nunca lo que hablaron.',
    ].join('\n'),
  };
}
