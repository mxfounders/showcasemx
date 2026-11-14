import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { renderEmailHtml } from '../src/lib/notifications/email-template';
import {
  createNoticeUnsubscribeToken,
  readNoticeUnsubscribeToken,
} from '../src/lib/notifications/unsubscribe-token';
import { createWeeklyUnsubscribeToken } from '../src/lib/notifications/weekly-token';
import { composeNotice } from '../src/lib/notifications/compose';
import { previewEmail, previewTemplates } from '../src/lib/notifications/preview';
import { getDictionary } from '../src/i18n/get-dictionary';
import { GET, POST } from '../src/app/api/notifications/unsubscribe/route';

const origin = 'https://shwcs.site';
const secret = 'x'.repeat(40);
const account = '00000000-0000-4000-8000-000000000002';
const email = {
  subject: 'Nueva reseña en Atlas',
  heading: 'Nueva reseña en Atlas',
  button: 'Ver la reseña',
  paragraphs: ['Hola'],
  text: 'Nueva reseña en Atlas.',
};

test('shell: wordmark image with a text fallback, contact and optional preferences', () => {
  const html = renderEmailHtml({ origin, heading: '<b>Hola</b>', paragraphs: [] });
  assert.match(
    html,
    /<img src="https:\/\/shwcs\.site\/brand\/shwcs-logo-1\.png" width="84" height="26" alt="shwcs"/,
  );
  assert.match(html, /<html lang="es">/);
  assert.match(html, /mailto:hola@shwcs\.site/);
  assert.doesNotMatch(html, /Preferencias de avisos/);
  assert.match(html, /&lt;b&gt;Hola&lt;\/b&gt;/);
  const withPrefs = renderEmailHtml({
    origin,
    heading: 'x',
    paragraphs: [],
    preferencesHref: `${origin}/es/account/settings/notifications`,
    lang: 'en',
  });
  assert.match(withPrefs, /<html lang="en">/);
  assert.match(withPrefs, /href="https:\/\/shwcs\.site\/es\/account\/settings\/notifications"/);
});

test('unsubscribe token: one account and one kind, signed, not interchangeable', () => {
  const token = createNoticeUnsubscribeToken(account, 'contact', secret);
  assert.ok(token);
  assert.deepEqual(readNoticeUnsubscribeToken(token, secret), {
    accountId: account,
    category: 'contact',
  });
  assert.equal(readNoticeUnsubscribeToken(token, 'y'.repeat(40)), null);
  // Security notices and the welcome cannot be turned off, so they never get one.
  assert.equal(createNoticeUnsubscribeToken(account, 'security', secret), null);
  assert.equal(createNoticeUnsubscribeToken(account, 'account', secret), null);
  assert.equal(createNoticeUnsubscribeToken('not-a-uuid', 'contact', secret), null);
  assert.equal(createNoticeUnsubscribeToken(account, 'contact', 'short'), null);
  // A weekly-summary token never works here.
  assert.equal(
    readNoticeUnsubscribeToken(createWeeklyUnsubscribeToken(account, secret), secret),
    null,
  );
  // Swapping the kind in the payload breaks the signature.
  const [, signature] = String(token).split('.');
  const forged = `${Buffer.from(`${account}:alert`).toString('base64url')}.${signature}`;
  assert.equal(readNoticeUnsubscribeToken(forged, secret), null);
});

test('composeNotice: one-click headers only for what can be turned off', () => {
  const contact = composeNotice({
    origin,
    email,
    buttonHref: `${origin}/es/account/contacts/x`,
    footerNote: 'nota',
    category: 'contact',
    accountId: account,
    secret,
  });
  const url = /<(.+)>/.exec(contact.headers?.['List-Unsubscribe'] ?? '')?.[1] ?? '';
  assert.equal(contact.headers?.['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(url.startsWith(`${origin}/api/notifications/unsubscribe?token=`));
  assert.deepEqual(readNoticeUnsubscribeToken(new URL(url).searchParams.get('token'), secret), {
    accountId: account,
    category: 'contact',
  });
  assert.match(contact.html, /Preferencias de avisos/);
  assert.match(contact.text, /Preferencias de avisos: https:\/\/shwcs\.site\/es\/account/);

  const security = composeNotice({
    origin,
    email,
    buttonHref: `${origin}/es/forgot-password`,
    footerNote: 'nota',
    category: 'security',
    accountId: account,
    secret,
  });
  assert.equal(security.headers, undefined);
  assert.doesNotMatch(security.html, /Preferencias de avisos/);
  assert.doesNotMatch(security.text, /Preferencias de avisos/);

  const noSecret = composeNotice({
    origin,
    email,
    buttonHref: origin,
    footerNote: '',
    category: 'contact',
    accountId: account,
    secret: '',
  });
  assert.equal(noSecret.headers, undefined);
});

// Snapshots of the HTML each kind of email turns into. To accept a deliberate change:
// UPDATE_SNAPSHOTS=1 npx tsx --test tests/email-notices.test.ts
test('email snapshots', async () => {
  const labels = (await getDictionary('es')).contacts;
  mkdirSync('tests/snapshots', { recursive: true });
  for (const template of previewTemplates) {
    const built = previewEmail(template, origin, labels, secret);
    const file = `tests/snapshots/email-${template}.html`;
    if (process.env.UPDATE_SNAPSHOTS === '1' || !existsSync(file)) writeFileSync(file, built.html);
    assert.equal(built.html, readFileSync(file, 'utf8'), `${template} changed`);
    assert.match(built.html, /alt="shwcs"/, template);
  }
});

test('unsubscribe route: bad tokens change nothing, a GET only redirects', async () => {
  const post = (query: string) =>
    POST(
      new NextRequest(`https://shwcs.site/api/notifications/unsubscribe${query}`, {
        method: 'POST',
      }),
    );
  assert.equal((await post('')).status, 400);
  assert.equal((await post('?token=abc.def')).status, 400);
  const response = GET(
    new NextRequest('https://shwcs.site/api/notifications/unsubscribe?token=whatever'),
  );
  assert.equal(response.status, 303);
  assert.equal(
    response.headers.get('location'),
    'https://shwcs.site/es/account/settings/notifications',
  );
});
