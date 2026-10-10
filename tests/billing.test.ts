import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  cfdiTaxRate,
  issuesCfdi,
  readBillingProfile,
  retryDelayMinutes,
} from '../src/lib/billing/model';
import { cord, cordClientFields, cordInvoiceDraft, CordError } from '../src/lib/billing/cord';
import { POST as saveBilling } from '../src/app/api/account/billing/route';
import { billing as es } from '../src/i18n/dictionaries/es/billing';
import { billing as en } from '../src/i18n/dictionaries/en/billing';

const mexican = {
  countryCode: 'MX',
  legalName: 'Empresa Demo',
  taxId: 'edm 010101 ab1',
  taxRegime: '601',
  postalCode: '06600',
  cfdiUse: 'G03',
  invoiceEmail: 'Facturas@Example.com',
};

test('a Mexican profile carries exactly what a CFDI 4.0 needs, normalised', () => {
  const result = readBillingProfile(mexican);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.profile.taxId, 'EDM010101AB1');
  assert.equal(result.profile.invoiceEmail, 'facturas@example.com');
  assert.equal(issuesCfdi(result.profile), true);
  // Persona física RFC (13 characters) is valid too.
  assert.equal(
    readBillingProfile({ ...mexican, taxId: 'GODE561231GR8', taxRegime: '612' }).ok,
    true,
  );
});

test('each invalid Mexican field is reported with its own code', () => {
  const error = (patch: Record<string, unknown>) => {
    const result = readBillingProfile({ ...mexican, ...patch });
    return result.ok ? null : result.error;
  };
  assert.equal(error({ countryCode: 'ZZ' }), 'country');
  assert.equal(error({ legalName: '   ' }), 'legalName');
  assert.equal(error({ taxId: 'ABC' }), 'rfc');
  assert.equal(error({ taxId: 'XAXX010101000' }), 'genericRfc');
  assert.equal(error({ taxRegime: '999' }), 'taxRegime');
  assert.equal(error({ postalCode: '6600' }), 'postalCode');
  assert.equal(error({ cfdiUse: 'P01' }), 'cfdiUse');
  assert.equal(error({ invoiceEmail: 'not-an-email' }), 'invoiceEmail');
});

test('outside Mexico only a legal name is required and no CFDI is issued', () => {
  const result = readBillingProfile({ countryCode: 'US', legalName: 'Acme Inc', taxRegime: '601' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.profile.taxRegime, null);
  assert.equal(result.profile.cfdiUse, null);
  assert.equal(issuesCfdi(result.profile), false);
});

test('the CFDI tax rate is the one Stripe charged, snapped to SAT rates or refused', () => {
  assert.equal(cfdiTaxRate(135_000, 21_600), 0.16);
  assert.equal(cfdiTaxRate(10_000, 800), 0.08);
  assert.equal(cfdiTaxRate(10_000, 0), 0);
  assert.equal(cfdiTaxRate(10_001, 1_600), 0.16); // rounding of one centavo
  assert.equal(cfdiTaxRate(10_000, 2_100), null); // e.g. a 21% VAT: never on a CFDI
  assert.equal(cfdiTaxRate(0, 0), null);
});

test('retries back off exponentially and never wait more than a day', () => {
  assert.deepEqual([0, 1, 2, 5].map(retryDelayMinutes), [1, 2, 4, 32]);
  assert.equal(retryDelayMinutes(30), 1440);
});

test('Cord payloads: the receptor fields and a draft whose total equals the charge', () => {
  const profile = readBillingProfile(mexican);
  assert.ok(profile.ok);
  if (!profile.ok) return;
  assert.deepEqual(cordClientFields(profile.profile, 'account@example.com'), {
    empresa: 'Empresa Demo',
    email: 'facturas@example.com',
    rfc: 'EDM010101AB1',
    regimenFiscal: '601',
    usoCfdi: 'G03',
    cpFiscal: '06600',
    countryCode: 'MX',
  });
  const draft = cordInvoiceDraft('cli_1', {
    description: 'Espacio patrocinado',
    days: 3,
    dailyAmount: 45_000,
    currency: 'mxn',
    taxRate: 0.16,
    reference: 'booking',
  });
  assert.equal(draft.document_mode, 'fiscal');
  assert.equal(draft.iva_incluido, false);
  assert.equal(draft.currency, 'MXN');
  assert.deepEqual(draft.items[0], {
    descripcion: 'Espacio patrocinado',
    cantidad: 3,
    precio_unitario: 450,
    tax_rate: 0.16,
  });
});

test('Cord requests carry the key, the pinned version and the idempotency key; errors keep only the code', async () => {
  const saved = { key: process.env.CORD_API_KEY, fetch: globalThis.fetch };
  const calls: { url: string; init: RequestInit }[] = [];
  process.env.CORD_API_KEY = 'sk_test_unit';
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (String(url).endsWith('/facturas/bad'))
      return new Response(
        JSON.stringify({ error: 'Receptor rejected for RFC X', code: 'receptor_invalido' }),
        { status: 400 },
      );
    return new Response(JSON.stringify({ data: { id: 'fac_1', estado_fiscal: 'issued' } }), {
      status: 200,
    });
  }) as typeof fetch;
  try {
    const invoice = await cord.act('fac_1', { action: 'finalize' }, 'finalize:doc');
    assert.equal(invoice.estado_fiscal, 'issued');
    const headers = new Headers(calls[0].init.headers);
    assert.equal(calls[0].url, 'https://cordhq.app/api/v1/facturas/fac_1');
    assert.equal(headers.get('authorization'), 'Bearer sk_test_unit');
    assert.equal(headers.get('cord-version'), '2026-10-01');
    assert.equal(headers.get('idempotency-key'), 'finalize:doc');
    await assert.rejects(
      cord.act('bad', { action: 'finalize' }, 'k'),
      (error: unknown) =>
        error instanceof CordError &&
        error.code === 'receptor_invalido' &&
        !error.message.includes('RFC'),
    );
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.CORD_API_KEY;
    else process.env.CORD_API_KEY = saved.key;
  }
});

test('Cord refuses to run without a key instead of pretending to invoice', async () => {
  const saved = process.env.CORD_API_KEY;
  delete process.env.CORD_API_KEY;
  try {
    await assert.rejects(
      cord.getInvoice('x'),
      (error: unknown) => error instanceof CordError && error.code === 'not_configured',
    );
  } finally {
    if (saved !== undefined) process.env.CORD_API_KEY = saved;
  }
});

test('every billing error code has a message in both languages', () => {
  for (const code of Object.keys(es.errors.codes)) {
    assert.ok(en.errors.codes[code as keyof typeof en.errors.codes], code);
  }
});

test('the billing route rejects other origins and anonymous requests', async () => {
  const post = (origin: string) =>
    new NextRequest('http://localhost:3000/api/account/billing', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ ...mexican, version: 0 }),
    });
  assert.equal((await saveBilling(post('https://evil.example'))).status, 403);
  assert.equal((await saveBilling(post('http://localhost:3000'))).status, 401);
});
