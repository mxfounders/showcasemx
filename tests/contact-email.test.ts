import assert from 'node:assert/strict';
import test from 'node:test';
import { getDictionary } from '../src/i18n/get-dictionary';
import { contactCompanySizes, timelines } from '../src/lib/contacts/model';
import { contactNotificationEmail } from '../src/lib/notifications/contact-email';

test('a new lead email carries what the buyer shared, escaped', async () => {
  const labels = (await getDictionary('es')).contacts;
  const email = contactNotificationEmail({
    title: 'Nueva solicitud de contacto',
    event: {
      status: 'new',
      message: '',
      projectName: 'Cord',
      details: {
        name: 'Ana <script>',
        company: 'Ejemplo SA',
        size: contactCompanySizes[1],
        timeline: timelines[0],
        budget: '',
        need: 'Cotizar a mayoristas\ncada semana.',
      },
      fromOtherSide: true,
    },
    toRecipient: true,
    labels,
  });
  assert.equal(email.subject, 'Nueva solicitud para Cord');
  assert.equal(email.button, 'Responder en shwcs');
  const html = email.paragraphs.join('\n');
  assert.ok(html.includes('Ana &lt;script&gt; · Ejemplo SA'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Cotizar a mayoristas<br>cada semana.'));
  assert.ok(html.includes('Sin especificar'));
  // The listing scale's label and range, not the raw value.
  assert.ok(html.includes('Tamaño de empresa:</strong> PyME (11–100 personas)'));
  assert.ok(email.text.includes('Necesidad: Cotizar a mayoristas'));
});

test('a reply email shows the other side’s words, never the reader’s own', async () => {
  const labels = (await getDictionary('es')).contacts;
  const event = {
    status: 'conversation',
    message: 'Hola, te escribo mañana.',
    projectName: 'Cord',
    details: {},
  };
  const fromProject = contactNotificationEmail({
    title: 'Tu solicitud tiene una actualización',
    event: { ...event, fromOtherSide: true },
    toRecipient: false,
    labels,
  });
  assert.ok(fromProject.paragraphs.join().includes('Hola, te escribo mañana.'));
  const own = contactNotificationEmail({
    title: 'x',
    event: { ...event, fromOtherSide: false },
    toRecipient: false,
    labels,
  });
  assert.ok(!own.paragraphs.join().includes('Hola, te escribo mañana.'));
});

test('a message email carries the message, never the request again (SHCWS-168)', async () => {
  const labels = (await getDictionary('es')).contacts;
  const email = contactNotificationEmail({
    title: 'Nuevo mensaje de Ejemplo SA sobre Cord',
    event: {
      // A buyer's follow-up while the request is still new: not a second lead.
      status: 'new',
      kind: 'message',
      message: 'Usamos <CONTPAQi>\ny facturamos 200 al mes.',
      projectName: 'Cord',
      details: { name: 'Ana', company: 'Ejemplo SA', need: 'No debe repetirse aquí.' },
      fromOtherSide: true,
    },
    toRecipient: true,
    labels,
  });
  assert.equal(email.subject, 'Nuevo mensaje de Ejemplo SA sobre Cord');
  assert.equal(email.button, 'Responder en shwcs');
  const html = email.paragraphs.join('\n');
  assert.ok(html.includes('Usamos &lt;CONTPAQi&gt;<br>y facturamos 200 al mes.'));
  assert.ok(!html.includes('No debe repetirse'));
  assert.ok(!email.text.includes('No debe repetirse'));
});
