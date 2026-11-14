import assert from 'node:assert/strict';
import test from 'node:test';
import { listingNotificationEmail } from '../src/lib/notifications/listing-email';

const origin = 'https://shwcs.site',
  solutionId = '6f1c1c2e-8f7a-4b8e-9b44-2f1e0f6c1a11';

test('an approval carries the launch kit: share links, badge and review link', () => {
  const email = listingNotificationEmail({
    title: 'Tu solución está publicada',
    solutionId,
    solutionName: 'Cord & <Co>',
    origin,
    event: { kind: 'decision', status: 'published', message: '' },
  });
  const listing = `${origin}/es/soluciones/${solutionId}`;
  assert.equal(email.button.href, listing);
  const html = email.paragraphs.join(' ');
  assert.match(html, /Cord &amp; &lt;Co&gt;/);
  assert.ok(!html.includes('<Co>'));
  assert.ok(html.includes(encodeURIComponent(listing)));
  assert.match(html, /linkedin\.com\/sharing/);
  assert.match(html, /x\.com\/intent\/tweet/);
  assert.match(html, /wa\.me/);
  assert.ok(html.includes(`${origin}/es/account/solutions/${solutionId}`));
  // «Pide reseñas» opens the invitation link on the founder's listing (SHCWS-132).
  assert.ok(html.includes(`${origin}/es/account/solutions/${solutionId}#invitar-resenas`));
  assert.match(email.text, /Pide reseñas/);
});

test('other events escape what people wrote and never name the reporter', () => {
  const comment = listingNotificationEmail({
    title: 'Nuevo comentario en tu ficha',
    solutionId,
    solutionName: 'Cord',
    origin,
    event: { kind: 'comment', author: 'Ana <script>', body: '¿Tiene API?\n<b>hola</b>' },
  });
  assert.ok(!comment.paragraphs.join(' ').includes('<script>'));
  assert.match(comment.paragraphs.join(' '), /&lt;b&gt;hola&lt;\/b&gt;/);
  assert.equal(comment.button.href, `${origin}/es/soluciones/${solutionId}`);
  // Plain text keeps the words as written, without HTML entities.
  assert.match(comment.text, /Ana <script>: «¿Tiene API\?/);

  const report = listingNotificationEmail({
    title: 'Recibimos un reporte sobre tu ficha',
    solutionId,
    solutionName: 'Cord',
    origin,
    event: { kind: 'report', reason: 'broken' },
  });
  assert.match(report.paragraphs.join(' '), /enlace o producto que no funciona/);
  assert.match(report.paragraphs.join(' '), /no compartimos quién lo envió/);
  assert.equal(report.button.href, `${origin}/es/account/solutions/${solutionId}`);

  const review = listingNotificationEmail({
    title: 'Nueva reseña de tu solución',
    solutionId,
    solutionName: 'Cord',
    origin,
    event: { kind: 'review', rating: 4, headline: 'Muy útil' },
  });
  assert.match(review.paragraphs.join(' '), /4 de 5/);
  assert.equal(review.button.href, `${origin}/es/soluciones/${solutionId}#resenas`);

  const changes = listingNotificationEmail({
    title: 'Tu ficha necesita cambios',
    solutionId,
    solutionName: 'Cord',
    origin,
    event: { kind: 'decision', status: 'changes_requested', message: 'Falta el precio.' },
  });
  assert.match(changes.paragraphs.join(' '), /Falta el precio\./);
});
