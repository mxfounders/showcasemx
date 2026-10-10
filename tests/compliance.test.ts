import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { parseCsv, parseSat69b } from '../src/lib/compliance/sat-69b';
import {
  cfdiExpressions,
  cfdiStatus,
  parseCfdiResponse,
  readCfdiReceipt,
} from '../src/lib/compliance/cfdi';
import { readTaxIdentity } from '../src/lib/compliance/server';
import { reviewLevel, reviewWeights } from '../src/lib/reviews/model';
import { POST as taxIdentityPost } from '../src/app/api/solutions/[id]/tax-identity/route';

test('parseCsv handles quoted commas, escaped quotes and CRLF', () => {
  assert.deepEqual(parseCsv('a,"b, c","d ""e"""\r\n1,,3\n'), [
    ['a', 'b, c', 'd "e"'],
    ['1', '', '3'],
  ]);
});

test('parseSat69b reads the cut-off date, maps situations and skips redacted rows', () => {
  const file = [
    '"Información actualizada al 31 de diciembre de 2025; los listados…",,,',
    'Listado completo de contribuyentes (Artículo 69-B del CFF),,,',
    'No,RFC,Nombre del Contribuyente,Situación del contribuyente',
    '1,AAA080808HL8,"ASESORES, S.A. DE C.V.",Sentencia Favorable',
    '2,XXXXXXXXXXXX,"RESERVADO",Definitivo',
    '3,bbb010101ab1,"OTRA, S.A.",Presunto',
    '4,BBB010101AB1,"OTRA, S.A.",Definitivo',
    '5,CCC010101AB1,"RARA, S.A.",En revisión',
    '',
  ].join('\n');
  const result = parseSat69b(file);
  assert.equal(result.sourceDate, '2025-12-31');
  assert.deepEqual(result.entries, [
    { rfc: 'AAA080808HL8', situation: 'sentencia_favorable' },
    // Listed twice: the last row wins, and the RFC is normalised.
    { rfc: 'BBB010101AB1', situation: 'definitivo' },
  ]);
  assert.equal(result.skipped, 2);
  assert.throws(() => parseSat69b('a,b\n1,2\n'), /SAT_69B_FORMAT/);
});

test('CFDI receipts: validation and both total formats the SAT has used', () => {
  const ok = readCfdiReceipt({
    uuid: '5fb2822e-396d-4725-8521-cdc4bdd20ccf',
    issuer: 'aaa 010101 aaa',
    receiver: 'BBB010101BB1',
    total: '$1,566.50',
  });
  assert.ok(ok.ok);
  if (!ok.ok) return;
  assert.equal(ok.receipt.uuid, '5FB2822E-396D-4725-8521-CDC4BDD20CCF');
  assert.equal(ok.receipt.issuer, 'AAA010101AAA');
  assert.equal(ok.receipt.total, 1566.5);
  assert.deepEqual(cfdiExpressions(ok.receipt), [
    '?re=AAA010101AAA&rr=BBB010101BB1&tt=1566.5&id=5FB2822E-396D-4725-8521-CDC4BDD20CCF',
    '?re=AAA010101AAA&rr=BBB010101BB1&tt=0000001566.500000&id=5FB2822E-396D-4725-8521-CDC4BDD20CCF',
  ]);
  assert.match(cfdiExpressions({ ...ok.receipt, total: 100 })[0], /&tt=100\.0&/);
  assert.match(cfdiExpressions({ ...ok.receipt, issuer: 'A&B010101AB1' })[0], /re=A&amp;B/);
  const valid: Record<string, unknown> = {
    uuid: '5FB2822E-396D-4725-8521-CDC4BDD20CCF',
    issuer: 'AAA010101AAA',
    receiver: 'BBB010101BB1',
    total: 10,
  };
  const cases: [Record<string, unknown>, string][] = [
    [{ uuid: 'nope' }, 'uuid'],
    [{ issuer: 'XYZ' }, 'issuer'],
    [{ receiver: '' }, 'receiver'],
    [{ total: 0 }, 'total'],
    [{ total: 'abc' }, 'total'],
  ];
  for (const [patch, field] of cases) {
    const parsed = readCfdiReceipt({ ...valid, ...patch });
    assert.deepEqual(parsed, { ok: false, field }, JSON.stringify(patch));
  }
});

const soap = (estado: string) =>
  `<s:Envelope><s:Body><ConsultaResponse><ConsultaResult><a:CodigoEstatus>S</a:CodigoEstatus><a:Estado>${estado}</a:Estado></ConsultaResult></ConsultaResponse></s:Body></s:Envelope>`;

test('parseCfdiResponse reads the three states and nothing else', () => {
  assert.equal(parseCfdiResponse(soap('Vigente')), 'vigente');
  assert.equal(parseCfdiResponse(soap('Cancelado')), 'cancelado');
  assert.equal(parseCfdiResponse(soap('No Encontrado')), 'no_encontrado');
  assert.equal(parseCfdiResponse('<html>error</html>'), null);
});

test('cfdiStatus tries the legacy total format and never guesses on failure', async () => {
  const receipt = {
    uuid: '5FB2822E-396D-4725-8521-CDC4BDD20CCF',
    issuer: 'AAA010101AAA',
    receiver: 'BBB010101BB1',
    total: 100,
  };
  const realFetch = globalThis.fetch;
  try {
    const bodies: string[] = [];
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      bodies.push(String(init.body));
      return new Response(soap(bodies.length === 1 ? 'No Encontrado' : 'Vigente'));
    }) as typeof fetch;
    assert.equal(await cfdiStatus(receipt), 'vigente');
    assert.match(bodies[0], /tt=100\.0&/);
    assert.match(bodies[1], /tt=0000000100\.000000&/);

    globalThis.fetch = (async () => new Response(soap('Cancelado'))) as typeof fetch;
    assert.equal(await cfdiStatus(receipt), 'cancelado');

    globalThis.fetch = (async () => new Response('down', { status: 503 })) as typeof fetch;
    await assert.rejects(cfdiStatus(receipt), /SAT_CFDI_UNAVAILABLE/);
    globalThis.fetch = (async () => new Response('<html/>')) as typeof fetch;
    await assert.rejects(cfdiStatus(receipt), /SAT_CFDI_UNREADABLE/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('tax identity: strict RFC in Mexico, plain identifiers anywhere else', () => {
  assert.deepEqual(readTaxIdentity({ country: 'mx', taxId: ' aaa-010101-aaa ' }), {
    ok: true,
    identity: { country: 'MX', taxId: 'AAA010101AAA' },
  });
  assert.deepEqual(readTaxIdentity({ country: 'MX', taxId: '123' }), { ok: false, error: 'rfc' });
  assert.deepEqual(readTaxIdentity({ country: 'MX', taxId: 'XAXX010101000' }), {
    ok: false,
    error: 'genericRfc',
  });
  assert.deepEqual(readTaxIdentity({ country: 'ES', taxId: 'b12345678' }), {
    ok: true,
    identity: { country: 'ES', taxId: 'B12345678' },
  });
  assert.deepEqual(readTaxIdentity({ country: 'US', taxId: '12-3456789' }), {
    ok: true,
    identity: { country: 'US', taxId: '12-3456789' },
  });
  assert.deepEqual(readTaxIdentity({ country: 'ZZ', taxId: 'X1' }), {
    ok: false,
    error: 'country',
  });
  assert.deepEqual(readTaxIdentity({ country: 'US', taxId: '<script>' }), {
    ok: false,
    error: 'taxId',
  });
});

test('a proven purchase is the strongest review level', () => {
  assert.equal(reviewLevel('gmail.com', true, true), 'customer');
  assert.equal(reviewLevel('acme.com', false, true), 'unverified');
  assert.ok(reviewWeights.customer > reviewWeights.work);
});

test('the tax identity API rejects foreign origins, bad ids and anonymous requests', async () => {
  const call = (origin: string, id = '00000000-0000-4000-8000-000000000001') =>
    taxIdentityPost(
      new NextRequest(`https://shwcs.example/api/solutions/${id}/tax-identity`, {
        method: 'POST',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'save', country: 'MX', taxId: 'AAA010101AAA' }),
      }),
      { params: Promise.resolve({ id }) },
    );
  assert.equal((await call('https://evil.example')).status, 403);
  assert.equal((await call('https://shwcs.example', 'nope')).status, 400);
  assert.equal((await call('https://shwcs.example')).status, 401);
});
