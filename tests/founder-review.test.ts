import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { latestDecision, reviewTargetHours, type SolutionEvent } from '../src/lib/solutions/model';
import { PATCH } from '../src/app/api/solutions/[id]/route';

const event = (status: SolutionEvent['status'], message = 'm'): SolutionEvent => ({
  id: String(Math.random()),
  status,
  message,
  created_at: '2026-11-01T10:00:00Z',
});

test('the reviewer comment stays on top until the founder submits again (SHCWS-31)', () => {
  const asked = event('changes_requested', 'Falta el precio.');
  // Newest first, as getEvents returns them.
  assert.equal(latestDecision('changes_requested', [asked, event('pending')]), asked);
  // Saving turns the listing into a draft without an event: the comment stays.
  assert.equal(latestDecision('draft', [asked, event('pending')]), asked);
  const rejected = event('rejected', 'No es B2B.');
  assert.equal(latestDecision('rejected', [rejected]), rejected);
  // Submitted again, or approved: nothing to fix any more.
  assert.equal(latestDecision('pending', [event('pending'), asked]), null);
  assert.equal(latestDecision('draft', [event('pending'), asked]), null);
  assert.equal(latestDecision('published', [asked]), null);
  assert.equal(latestDecision('draft', [event('draft'), asked]), null, 'withdrawn or unpublished');
  assert.equal(latestDecision('draft', []), null);
});

test('a review target shows only once ops sets a sensible number of hours', () => {
  assert.equal(reviewTargetHours(undefined), null);
  assert.equal(reviewTargetHours(''), null);
  assert.equal(reviewTargetHours('48'), 48);
  for (const value of ['0', '-4', '4.5', '721', 'cuarenta'])
    assert.equal(reviewTargetHours(value), null, value);
});

test('unpublishing and withdrawing a submission require the same origin and a session', async () => {
  const id = '6f1c2a40-1b2c-4d3e-8f40-5a6b7c8d9e0f';
  for (const action of ['unpublish', 'withdraw-submission'])
    for (const [origin, status] of [
      ['https://evil.test', 403],
      ['http://localhost:3000', 401],
    ] as const) {
      const request = new NextRequest('http://localhost:3000/api/solutions/' + id, {
        method: 'PATCH',
        headers: { origin, 'content-type': 'application/json' },
        body: JSON.stringify({ action, version: 1 }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id }) });
      assert.equal(response.status, status, `${action} from ${origin}`);
    }
});
