import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import {
  batchMaxRecipients,
  composeNeed,
  createdOutcome,
  planBatch,
  readBatch,
  type BatchRecipient,
} from '../src/lib/contacts/batch';
import { consentVersion, contactCompanySizes, timelines } from '../src/lib/contacts/model';
import { POST } from '../src/app/api/contacts/batch/route';

const uuid = (n: number) => `6f1c2a40-1b2c-4d3e-8f40-${String(n).padStart(12, '0')}`;
const details = {
  name: 'Ana Pérez',
  company: 'Ejemplo SA',
  size: contactCompanySizes[1],
  timeline: timelines[0],
  budget: '',
  need: 'Necesitamos ordenar la cobranza de nuestra empresa.',
};
const recipient = (n: number, consent = true): BatchRecipient => ({
  id: uuid(100 + n),
  solutionId: uuid(200 + n),
  recipientId: consent ? uuid(300 + n) : '',
  consent,
});
const body = (recipients: unknown[], patch: Record<string, unknown> = {}) => ({
  ...details,
  id: uuid(1),
  listId: uuid(2),
  consentVersion,
  recipients,
  ...patch,
});

test('a batch reads the single request data and one to three recipients', () => {
  const input = readBatch(body([recipient(1), recipient(2), recipient(3)]));
  assert.ok(input);
  assert.equal(input.recipients.length, 3);
  assert.deepEqual(input.details, details);
  assert.equal(batchMaxRecipients, 3);
  // Identity and routing never come from the body.
  const forged = readBatch(
    body([recipient(1)], { buyer_email: 'forged@example.com', buyer_id: uuid(9) }),
  );
  assert.deepEqual(forged?.details, details);
  assert.equal('buyer_email' in (forged ?? {}), false);
  // A project already written to joins the group without a recipient or consent.
  assert.ok(readBatch(body([recipient(1), recipient(2, false)])));
});

test('a batch is refused before anything is written when it is malformed', () => {
  for (const bad of [
    body([]),
    body([recipient(1), recipient(2), recipient(3), recipient(4)]),
    body([recipient(1), { ...recipient(2), solutionId: recipient(1).solutionId }]),
    body([recipient(1), { ...recipient(2), id: recipient(1).id }]),
    body([{ ...recipient(1), id: uuid(1) }]),
    body([recipient(1, false), recipient(2, false)]),
    body([{ ...recipient(1), recipientId: '' }]),
    body([{ ...recipient(1), consent: 'yes' }]),
    body([{ ...recipient(1), solutionId: 'catalog:cord' }]),
    body([recipient(1)], { consentVersion: 'contact-v0' }),
    body([recipient(1)], { listId: 'not-a-uuid' }),
    body([recipient(1)], { need: 'corto' }),
    body([recipient(1)], { need: 'x'.repeat(2001) }),
    body([recipient(1)], { size: 'fake' }),
    { ...body([recipient(1)]), recipients: 'all' },
  ])
    assert.equal(readBatch(bad), null);
});

test('planning never duplicates a request and never creates one without consent', () => {
  const [a, b, c] = [recipient(1), recipient(2), recipient(3)];
  // Nothing on file: everything consented is created, in the buyer's order.
  assert.deepEqual(
    planBatch([a, b, c], new Map())?.map(step => [step.action, step.position]),
    [
      ['create', 0],
      ['create', 1],
      ['create', 2],
    ],
  );
  // b was written to earlier (another id); a was created by an earlier attempt of this
  // batch (same id): neither is sent again.
  const plan = planBatch(
    [a, b, c],
    new Map([
      [a.solutionId, a.id],
      [b.solutionId, uuid(999)],
    ]),
  );
  assert.deepEqual(
    plan?.map(step => [step.action, step.requestId]),
    [
      ['retry', a.id],
      ['existing', uuid(999)],
      ['create', undefined],
    ],
  );
  // A project the buyer did not authorize can only join if it already has a request.
  const linked = recipient(4, false);
  assert.equal(planBatch([a, linked], new Map()), null);
  assert.deepEqual(
    planBatch([a, linked], new Map([[linked.solutionId, uuid(998)]]))?.map(step => step.action),
    ['create', 'existing'],
  );
});

test('a create that returns another id means the buyer had already written', () => {
  assert.equal(createdOutcome(uuid(1), uuid(1)), 'sent');
  assert.equal(createdOutcome(uuid(1), uuid(2)), 'existing');
});

test('common questions are appended to the need as the buyer reviews it', () => {
  assert.equal(composeNeed('  Ordenar cobranza  ', [], 'Me ayudaría:'), 'Ordenar cobranza');
  assert.equal(
    composeNeed('Ordenar cobranza', ['Precio', ' ', 'Plazo'], 'Me ayudaría:'),
    'Ordenar cobranza\n\nMe ayudaría:\n• Precio\n• Plazo',
  );
});

test('a batch requires the same origin and a session', async () => {
  const url = 'http://localhost:3000/api/contacts/batch';
  for (const [origin, status] of [
    ['https://evil.test', 403],
    ['http://localhost:3000', 401],
  ] as const) {
    const request = new NextRequest(url, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body([recipient(1)])),
    });
    assert.equal((await POST(request)).status, status);
  }
});
