import test from 'node:test';
import assert from 'node:assert/strict';
import { buildThread, readMessage, whoseTurn, type ThreadEvent } from '../src/lib/contacts/thread';

const buyer = 'buyer-1',
  founder = 'founder-1';
const at = (minute: number) => `2026-11-10T10:${String(minute).padStart(2, '0')}:00.000Z`;
const event = (
  id: number,
  actor: string,
  status: ThreadEvent['status'],
  message: string,
  kind: 'status' | 'message' = 'status',
): ThreadEvent => ({ id: String(id), actor_id: actor, status, message, created_at: at(id), kind });

test('the thread reads oldest first, with messages from both sides and system lines', () => {
  const events = [
    // Given newest first, as the database used to return them.
    event(4, buyer, 'conversation', 'El jueves a las 10 me funciona.', 'message'),
    event(3, founder, 'conversation', 'Hola, ¿demo el jueves?', 'message'),
    event(1, buyer, 'new', 'Solicitud enviada con consentimiento.'),
  ];
  const thread = buildThread(events, buyer);
  assert.deepEqual(
    thread.map(item =>
      item.type === 'message' ? `${item.mine ? 'me' : 'them'}:${item.text}` : `·${item.change}`,
    ),
    ['·started', 'them:Hola, ¿demo el jueves?', 'me:El jueves a las 10 me funciona.'],
  );
  assert.deepEqual(whoseTurn(events, 'conversation', founder), { turn: 'mine', since: at(4) });
  assert.deepEqual(whoseTurn(events, 'conversation', buyer), { turn: 'theirs', since: at(4) });
});

test('a reply sent the old way (inside a status change) still shows as a message', () => {
  const thread = buildThread(
    [
      event(1, buyer, 'new', 'Solicitud enviada con consentimiento.'),
      event(2, founder, 'conversation', 'Sí nos conectamos con CONTPAQi.'),
      event(3, founder, 'closed', 'Gracias, cerramos por ahora.'),
      event(4, founder, 'conversation', 'Reabrimos: ya salió la integración.'),
      event(5, buyer, 'withdrawn', 'El comprador retiró la solicitud.'),
    ],
    founder,
  );
  assert.deepEqual(
    thread.map(item => (item.type === 'message' ? item.text : `·${item.change}`)),
    [
      '·started',
      'Sí nos conectamos con CONTPAQi.',
      '·closed',
      'Gracias, cerramos por ahora.',
      '·reopened',
      'Reabrimos: ya salió la integración.',
      // The fixed system text of a withdrawal is a line, never a message bubble.
      '·withdrawn',
    ],
  );
});

test('closed or withdrawn conversations wait on nobody; a new request waits on the founder', () => {
  const opened = [event(1, buyer, 'new', 'Solicitud enviada con consentimiento.')];
  assert.equal(whoseTurn(opened, 'new', founder).turn, 'mine');
  assert.equal(whoseTurn(opened, 'new', buyer).turn, 'theirs');
  assert.equal(whoseTurn(opened, 'closed', founder).turn, 'none');
  assert.equal(whoseTurn(opened, 'withdrawn', buyer).turn, 'none');
  assert.equal(whoseTurn([], 'new', founder).turn, 'none');
});

test('a message is trimmed and between 1 and 2000 characters', () => {
  assert.equal(readMessage('  hola  '), 'hola');
  assert.equal(readMessage('   '), null);
  assert.equal(readMessage('x'.repeat(2000))?.length, 2000);
  assert.equal(readMessage('x'.repeat(2001)), null);
  assert.equal(readMessage(42), null);
});
