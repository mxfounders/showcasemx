import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CFDI_USES,
  MAX_BILLING_ATTEMPTS,
  SAT_TAX_REGIMES,
  errorHint,
  readCfdiReceptor,
} from '../ops/src/lib/billing';
import {
  cfdiUses,
  maxBillingAttempts,
  readBillingProfile,
  satTaxRegimes,
} from '../src/lib/billing/model';

const valid = {
  legalName: '  Acme   Comercial SA de CV ',
  taxId: 'aco-010101-ab1',
  taxRegime: '601',
  postalCode: '06600',
  cfdiUse: 'g03',
  invoiceEmail: 'Facturas@Acme.MX',
};

test('ops receptor rules match the product for a Mexican buyer', () => {
  assert.deepEqual(SAT_TAX_REGIMES, satTaxRegimes);
  assert.deepEqual(CFDI_USES, cfdiUses);
  assert.equal(MAX_BILLING_ATTEMPTS, maxBillingAttempts);
  const cases: Record<string, unknown>[] = [
    valid,
    { ...valid, invoiceEmail: '' },
    { ...valid, legalName: '' },
    { ...valid, taxId: 'XAXX010101000' },
    { ...valid, taxId: 'ACO0101' },
    { ...valid, taxRegime: '999' },
    { ...valid, postalCode: '6600' },
    { ...valid, cfdiUse: 'P01' },
    { ...valid, invoiceEmail: 'no-es-correo' },
  ];
  for (const input of cases) {
    const ops = readCfdiReceptor(input);
    const product = readBillingProfile({ ...input, countryCode: 'MX' });
    assert.equal(ops.ok, product.ok, JSON.stringify(input));
    if (ops.ok && product.ok) {
      assert.deepEqual(
        {
          legalName: ops.receptor.legal_name,
          taxId: ops.receptor.tax_id,
          taxRegime: ops.receptor.tax_regime,
          postalCode: ops.receptor.postal_code,
          cfdiUse: ops.receptor.cfdi_use,
          invoiceEmail: ops.receptor.invoice_email,
        },
        {
          legalName: product.profile.legalName,
          taxId: product.profile.taxId,
          taxRegime: product.profile.taxRegime,
          postalCode: product.profile.postalCode,
          cfdiUse: product.profile.cfdiUse,
          invoiceEmail: product.profile.invoiceEmail,
        },
      );
    } else if (!ops.ok && !product.ok) {
      assert.equal(ops.error, product.error, JSON.stringify(input));
    }
  }
});

test('the receptor copy uses the snake_case keys billing_documents.receptor stores', () => {
  const read = readCfdiReceptor(valid);
  assert.ok(read.ok);
  assert.deepEqual(Object.keys(read.receptor).sort(), [
    'cfdi_use',
    'country_code',
    'invoice_email',
    'legal_name',
    'postal_code',
    'tax_id',
    'tax_regime',
  ]);
  assert.equal(read.receptor.country_code, 'MX');
  assert.equal(read.receptor.tax_id, 'ACO010101AB1');
});

test('error hints point at the buyer data only when that is the usual cause', () => {
  assert.equal(errorHint('receptor_invalido')?.receptor, true);
  assert.equal(errorHint('pac_caido')?.receptor, false);
  assert.equal(errorHint('certificado_vencido')?.receptor, false);
  assert.equal(errorHint('http_422')?.receptor, true);
  assert.equal(errorHint('http_503')?.receptor, false);
  assert.equal(errorHint('algo_nuevo'), null);
  assert.equal(errorHint(null), null);
});
