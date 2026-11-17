import assert from 'node:assert/strict';
import test from 'node:test';
import {
  digestWeek,
  weeklyDigestEmail,
  weeklyIsEmpty,
  type WeeklyListing,
} from '../src/lib/notifications/weekly';
import {
  createWeeklyUnsubscribeToken,
  readWeeklyUnsubscribeToken,
} from '../src/lib/notifications/weekly-token';
import {
  createNewsletterUnsubscribeToken,
  readNewsletterUnsubscribeToken,
} from '../src/lib/newsletter-unsubscribe';

const listing = (patch: Partial<WeeklyListing> = {}): WeeklyListing => ({
  id: '6f1c1c2e-8f7a-4b8e-9b44-2f1e0f6c1a11',
  name: 'Cord <QA>',
  views: 0,
  viewsBefore: 0,
  clicks: 0,
  clicksBefore: 0,
  saves: 0,
  reviews: 0,
  comments: 0,
  task: null,
  position: null,
  ...patch,
});

test('the week is named by its Monday, whatever day the cron runs', () => {
  assert.equal(digestWeek(new Date('2026-11-16T14:15:00Z')), '2026-11-16');
  assert.equal(digestWeek(new Date('2026-11-18T09:00:00Z')), '2026-11-16');
  assert.equal(digestWeek(new Date('2026-11-22T23:59:00Z')), '2026-11-16');
});

test('a week with nothing is not sent; saves count only from three accounts', () => {
  assert.equal(weeklyIsEmpty([listing()], 0), true);
  assert.equal(weeklyIsEmpty([listing({ saves: 2 })], 0), true);
  assert.equal(weeklyIsEmpty([listing({ saves: 3 })], 0), false);
  assert.equal(weeklyIsEmpty([listing()], 1), false);
  assert.equal(weeklyIsEmpty([listing({ views: 1 })], 0), false);
});

test('the summary compares weeks, hides small save counts and escapes names', () => {
  const link = (path: string) => `https://shwcs.site/api/weekly/click?to=${path}`;
  const email = weeklyDigestEmail({
    listings: [
      listing({
        views: 120,
        viewsBefore: 100,
        clicks: 10,
        clicksBefore: 20,
        saves: 2,
        reviews: 1,
        task: { label: 'Precio', hint: 'Cuánto cuesta.' },
        position: { rank: 2, of: 9, category: 'Ventas' },
      }),
    ],
    unanswered: 2,
    link,
    unsubscribeUrl: 'https://shwcs.site/es/weekly/unsubscribe?token=x',
  });
  const html = email.paragraphs.join(' ');
  assert.match(html, /Cord &lt;QA&gt;/);
  assert.ok(!html.includes('<QA>'));
  assert.match(html, /Visitas: 120 \(↑ 20 % frente a la semana anterior\)/);
  assert.match(html, /Clics a tu sitio: 10 \(↓ 50 %/);
  assert.ok(!/guardaron/.test(html), 'fewer than 3 saves are never shown');
  assert.match(html, /1 reseña nueva/);
  assert.match(html, /Entre los 3 primeros de 9 en Ventas/);
  assert.match(html, /2 oportunidades sin responder/);
  assert.match(html, /Siguiente paso para Cord &lt;QA&gt;/);
  assert.match(html, /Dejar de recibir este resumen/);
  assert.match(email.text, /Cord <QA>/);
  assert.equal(email.button.href, link('/es/account/metrics'));
});

test('weekly and newsletter unsubscribe tokens are not interchangeable', () => {
  const secret = 'x'.repeat(40);
  const account = '6f1c1c2e-8f7a-4b8e-9b44-2f1e0f6c1a11';
  const weekly = createWeeklyUnsubscribeToken(account, secret);
  assert.ok(weekly);
  assert.equal(readWeeklyUnsubscribeToken(weekly, secret), account);
  assert.equal(readWeeklyUnsubscribeToken(weekly, 'y'.repeat(40)), null);
  assert.equal(readWeeklyUnsubscribeToken(`${weekly}x`, secret), null);
  assert.equal(readNewsletterUnsubscribeToken(weekly, secret), null);
  const newsletter = createNewsletterUnsubscribeToken('a@example.invalid', secret);
  assert.equal(readWeeklyUnsubscribeToken(newsletter, secret), null);
  assert.equal(createWeeklyUnsubscribeToken('not-a-uuid', secret), null);
});
