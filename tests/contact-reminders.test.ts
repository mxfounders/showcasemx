import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contactReminderHours,
  contactReminderKey,
  daysWaiting,
  dueContactStep,
  planContactReminders,
  readContactReminderKey,
  unansweredNoticeWindowHours,
  type ContactReminderStep,
} from '../src/lib/contacts/reminder-model';
import { pickContactAlternatives } from '../src/lib/contacts/alternatives';
import {
  contactReminderEmail,
  unansweredContactEmail,
} from '../src/lib/notifications/contact-reminder-email';
import { es } from '../src/i18n/dictionaries/es';
import { en } from '../src/i18n/dictionaries/en';
import type { PublishedProduct } from '../src/lib/solutions/public';

const id = '0b6f0e2a-4f7e-4c51-9d55-1a2b3c4d5e6f';

test('each step is due at 48 h, 5 days and 7 days, and only the latest one (SHCWS-61)', () => {
  assert.equal(contactReminderHours.first, 48);
  assert.equal(contactReminderHours.second, 5 * 24);
  assert.equal(contactReminderHours.unanswered, 7 * 24);
  const cases: Array<[number, ContactReminderStep | null]> = [
    [0, null],
    [47.99, null],
    [48, 'first'],
    [119.99, 'first'],
    [120, 'second'],
    [167.99, 'second'],
    [168, 'unanswered'],
    [24 * 30, 'unanswered'],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
  ];
  for (const [hours, step] of cases) assert.equal(dueContactStep(hours), step, `${hours} h`);
});

test('every step has its own idempotency key, and only these keys read back', () => {
  assert.equal(contactReminderKey(id, 'first'), `contact-reminder:${id}:48h`);
  assert.equal(contactReminderKey(id, 'second'), `contact-reminder:${id}:5d`);
  assert.equal(contactReminderKey(id, 'unanswered'), `contact-unanswered:${id}`);
  for (const step of ['first', 'second', 'unanswered'] as const)
    assert.deepEqual(readContactReminderKey(contactReminderKey(id, step)), {
      requestId: id,
      step,
    });
  for (const other of [
    `contact:${id}`,
    `review-request:${id}`,
    `contact-reminder:${id}:7d`,
    `contact-reminder:${id}:48h:x`,
    `contact-unanswered:${id.toUpperCase()}`,
    'contact-unanswered:not-a-uuid',
  ])
    assert.equal(readContactReminderKey(other), null, other);
});

test('a run acts on the latest due step; a late first run never sends stale reminders', () => {
  const plan = planContactReminders([
    { id: 'a', ageHours: 30 },
    { id: 'b', ageHours: 50 },
    { id: 'c', ageHours: 130 },
    { id: 'd', ageHours: 170 },
    { id: 'e', ageHours: unansweredNoticeWindowHours + 1 },
  ]);
  assert.deepEqual(plan.reminders, [
    { id: 'b', step: 'first', key: 'contact-reminder:b:48h' },
    { id: 'c', step: 'second', key: 'contact-reminder:c:5d' },
  ]);
  // Both are marked «sin respuesta»; only the recent one is still news for the buyer.
  assert.deepEqual(plan.unanswered, [
    { id: 'd', key: 'contact-unanswered:d', notifyBuyer: true },
    { id: 'e', key: 'contact-unanswered:e', notifyBuyer: false },
  ]);
});

test('with one run a day, each step lands once, on the first run after it is due', () => {
  // The mail cron runs at 14:15 UTC (vercel.json). A request sent at 10:00 and another at
  // 15:00 on day 0; the pass is simulated every day for two weeks, keys deduplicated like
  // the unique source_key does, and the request stops being read once it is marked.
  for (const sentAt of [10, 15]) {
    const sent = new Set<string>();
    const landed: Array<[string, number]> = [];
    let marked = false;
    for (let day = 0; day <= 14; day++) {
      if (marked) break;
      const age = day * 24 + 14.25 - sentAt;
      if (age < contactReminderHours.first) continue;
      const plan = planContactReminders([{ id, ageHours: age }]);
      for (const item of [...plan.reminders, ...plan.unanswered]) {
        if (sent.has(item.key)) continue;
        sent.add(item.key);
        landed.push([item.key, age]);
      }
      if (plan.unanswered.length) marked = true;
    }
    assert.deepEqual(
      landed.map(([key]) => key),
      [
        contactReminderKey(id, 'first'),
        contactReminderKey(id, 'second'),
        contactReminderKey(id, 'unanswered'),
      ],
    );
    const [first, second, unanswered] = landed.map(([, age]) => age);
    assert.ok(first >= 48 && first < 72, `first at ${first} h`);
    assert.ok(second >= 120 && second < 144, `second at ${second} h`);
    assert.ok(unanswered >= 168 && unanswered < 192, `unanswered at ${unanswered} h`);
  }
});

test('days waiting are whole days, never zero', () => {
  const now = new Date('2026-11-14T14:15:00Z');
  assert.equal(daysWaiting('2026-11-12T10:00:00Z', now), 2);
  assert.equal(daysWaiting('2026-11-07T10:00:00Z', now), 7);
  assert.equal(daysWaiting('2026-11-14T14:00:00Z', now), 1);
  assert.equal(daysWaiting('not a date', now), 1);
});

test('the founder’s reminders say how long the buyer waited and what happens next', () => {
  const first = contactReminderEmail({
    title: 'Recordatorio: Acme espera tu respuesta sobre Cord',
    step: 'first',
    projectName: 'Cord <b>',
    company: 'Acme <script>',
    need: 'Cotizar a mayoristas\ncada semana con <img src=x>.',
    days: 2,
    href: 'https://shwcs.site/es/account/opportunities/x',
  });
  const html = first.paragraphs.join('\n');
  assert.ok(html.includes('Acme &lt;script&gt; te escribió hace 2 días'));
  assert.ok(html.includes('Cord &lt;b&gt;'));
  assert.ok(!html.includes('<script>') && !html.includes('<img'));
  assert.ok(html.includes('Suele responder en'));
  assert.equal(first.button.label, 'Responder en shwcs');
  assert.ok(first.text.includes('hace 2 días'));
  const second = contactReminderEmail({
    title: 'Acme sigue esperando tu respuesta sobre Cord',
    step: 'second',
    projectName: 'Cord',
    company: '',
    need: '',
    days: 5,
    href: 'https://shwcs.site/es/account/opportunities/x',
  });
  assert.ok(second.paragraphs[0].includes('Un comprador te escribió hace 5 días'));
  assert.ok(second.text.includes('7 días'));
  assert.ok(second.text.includes('señal de respuesta'));
});

test('the buyer’s notice lists alternatives, or offers shwcs’s help when there are none', () => {
  const base = {
    title: 'Cord no respondió a tu solicitud',
    projectName: 'Cord',
    days: 7,
    requestHref: 'https://shwcs.site/es/account/contacts/x',
    briefHref: 'https://shwcs.site/es/contacto?motivo=find&necesidad=Busco+algo',
  };
  const listed = unansweredContactEmail({
    ...base,
    alternatives: [
      { name: 'Atlas <x>', description: 'Cotiza a mayoristas.', href: 'https://shwcs.site/es/a' },
      { name: 'Brisa', description: '', href: 'https://shwcs.site/es/b' },
    ],
  });
  const html = listed.paragraphs.join('\n');
  assert.ok(html.includes('href="https://shwcs.site/es/a"'));
  assert.ok(html.includes('Atlas &lt;x&gt;'));
  assert.ok(html.includes('Cuéntanos qué buscas'));
  assert.equal(listed.button.href, base.requestHref);
  assert.ok(listed.text.includes('«sin respuesta»'));
  const none = unansweredContactEmail({ ...base, alternatives: [] });
  assert.equal(none.button.href, base.briefHref);
  assert.equal(none.button.label, 'Cuéntanos qué buscas');
});

test('alternatives never include the silent listing, one already contacted or a non-listing', () => {
  const listing = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const product = (n: number, capabilities: string[]): PublishedProduct => ({
    name: `P${n}`,
    description: '',
    feature: '',
    category: 'Ventas',
    categories: ['Ventas'],
    capabilities,
    response: null,
    detailUrl: `/soluciones/${listing(n)}`,
  });
  const catalog = [
    product(1, ['cotizaciones-propuestas']),
    product(2, ['cotizaciones-propuestas']),
    product(3, []),
    product(4, ['cotizaciones-propuestas']),
    { ...product(5, ['cotizaciones-propuestas']), detailUrl: undefined },
  ];
  const current = { categories: ['Ventas'], capabilities: ['cotizaciones-propuestas'] };
  const picked = pickContactAlternatives(current, listing(1), new Set([listing(4)]), catalog);
  assert.deepEqual(
    picked.map(item => item.product.name),
    ['P2', 'P3'],
  );
  assert.deepEqual(pickContactAlternatives(null, listing(1), new Set(), catalog), []);
});

test('«sin respuesta» exists in both languages', () => {
  assert.equal(es.contacts.unanswered.label, 'Sin respuesta');
  assert.equal(en.contacts.unanswered.label, 'No reply');
  assert.ok(es.contacts.unanswered.buyerNote.includes('{project}'));
  assert.ok(en.contacts.unanswered.buyerNote.includes('{project}'));
});
