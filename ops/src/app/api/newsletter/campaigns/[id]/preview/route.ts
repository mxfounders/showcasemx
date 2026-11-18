import { opsRoute } from '@/lib/api';
import { failure, isUuid } from '@/lib/http';
import { productPreview } from '@/lib/newsletter';

export const runtime = 'nodejs';

/**
 * The campaign exactly as the product renders it (as a test of the current version), opened in
 * its own tab. Served with a CSP sandbox: no scripts, its own opaque origin, images only over
 * https (the wordmark from the product), so a campaign can never act inside ops.
 */
export const GET = opsRoute<{ id: string }>({}, async ({ params, url }) => {
  if (!isUuid(params.id)) return failure('Solicitud inválida.', 400);
  const locale = url.searchParams.get('locale') === 'en' ? 'en' : 'es';
  const result = await productPreview(params.id, locale);
  if (!result.ok) return failure(result.error, 502);
  const message = result.preview.message;
  if (!message) return failure('El contenido guardado no se puede mostrar.', 409);
  if (url.searchParams.get('format') === 'text')
    return new Response(`${message.subject}\n\n${message.text}`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  return new Response(message.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; sandbox allow-popups allow-popups-to-escape-sandbox",
    },
  });
});
