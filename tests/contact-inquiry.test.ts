import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  contactBriefHref,
  readContactPrefill,
  validateContactInquiry,
} from '../src/lib/contact-inquiry';
import { POST } from '../src/app/api/contact/route';

const valid = {
  reason: 'find',
  name: 'Ana Torres',
  email: ' ANA@EMPRESA.COM ',
  organization: 'Empresa Uno',
  role: 'CFO',
  website: 'https://empresa.com',
  message: 'Necesitamos encontrar una solución para ordenar cobranza y reportes.',
  urgency: 'month',
  consent: true,
  companyFax: '',
};

test('contact inquiry validates, normalizes and keeps newsletter consent separate', () => {
  const result = validateContactInquiry(valid);
  assert.ok(result);
  assert.equal(result.email, 'ana@empresa.com');
  assert.equal(result.website, 'https://empresa.com/');
  assert.equal('newsletter' in result, false);
});

test('contact inquiry rejects honeypots, short messages, arbitrary reasons and missing consent', () => {
  assert.equal(validateContactInquiry({ ...valid, companyFax: 'spam' }), null);
  assert.equal(validateContactInquiry({ ...valid, message: 'Hola' }), null);
  assert.equal(validateContactInquiry({ ...valid, reason: 'admin' }), null);
  assert.equal(validateContactInquiry({ ...valid, consent: false }), null);
});

test('public contact endpoint rejects foreign origins before storage or delivery', async () => {
  const request = new NextRequest('https://shwcs.site/api/contact', {
    method: 'POST',
    headers: { origin: 'https://example.com', 'content-type': 'application/json' },
    body: JSON.stringify(valid),
  });
  const response = await POST(request);
  assert.equal(response.status, 403);
});

test('a search with no results reaches the contact form with its words, bounded', () => {
  const href = contactBriefHref('  software para   mi restaurante ');
  assert.equal(href, '/contacto?motivo=find&necesidad=software+para+mi+restaurante');
  const params = Object.fromEntries(new URLSearchParams(href.split('?')[1]));
  assert.deepEqual(readContactPrefill(params), {
    reason: 'find',
    need: 'software para mi restaurante',
  });
  assert.equal(contactBriefHref(''), '/contacto?motivo=find');
  // Unknown reasons are dropped, repeated params and long text are bounded.
  assert.deepEqual(readContactPrefill({ motivo: 'admin', necesidad: ['a', 'b'] }), {
    reason: undefined,
    need: '',
  });
  assert.equal(readContactPrefill({ necesidad: 'x'.repeat(500) }).need.length, 200);
  assert.equal(readContactPrefill({ necesidad: 'línea\nnueva\tok' }).need, 'línea nueva ok');
});
