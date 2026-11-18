import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  campaignLinks,
  campaignProblems,
  readCampaignContent,
  readCampaignSegment,
  renderBody,
  renderCampaignEmail,
  safeCampaignHref,
  type CampaignContent,
} from '../src/lib/newsletter/content';
import { eventEffect, readResendEvent, verifySvixSignature } from '../src/lib/newsletter/webhook';
import { weeklyDraftContent, weeklyListings } from '../src/lib/newsletter/weekly-draft';
import { batchKey } from '../src/lib/newsletter/send';
import { authorizedOpsNewsletter, newsletterRecipientAllowed } from '../src/lib/newsletter/guard';
import { confirmationEmail } from '../src/lib/newsletter/confirm';
import { es } from '../src/i18n/dictionaries/es';
import { en } from '../src/i18n/dictionaries/en';
import { POST as unsubscribe } from '../src/app/api/newsletter/unsubscribe/route';
import { POST as confirm } from '../src/app/api/newsletter/confirm/route';
import { POST as internal } from '../src/app/api/internal/newsletter/route';
import { POST as webhook } from '../src/app/api/webhooks/resend/route';
import { isPagePath } from '../src/lib/routes';

const id = '7f3c2a10-1b2c-4d5e-8f90-123456789abc';
const listing = {
  solutionId: '11111111-2222-4333-8444-555555555555',
  name: 'Cord <script>',
  summary: 'Cotizaciones & pedidos',
  path: '/soluciones/cord',
  category: 'Ventas',
};
const content: CampaignContent = {
  es: {
    subject: 'Novedades',
    preheader: '',
    heading: 'Hola',
    body: '## Título\n\nTexto con **negritas** y [un enlace](https://example.com/a?b=1&c=2).\n\n- uno\n- [dos](/es/nuevo)\n\n<img src=x onerror=alert(1)>',
  },
  en: {
    subject: 'News',
    preheader: 'pre',
    heading: 'Hi',
    body: 'See [this](https://example.com/en) and [that](https://example.com/a?b=1&c=2).',
  },
  listings: [listing],
};

test('campaign links are http(s) or site paths, never other schemes', () => {
  assert.equal(safeCampaignHref('https://example.com/x'), 'https://example.com/x');
  assert.equal(safeCampaignHref('/es/nuevo'), '/es/nuevo');
  for (const bad of [
    'javascript:alert(1)',
    '//evil.example',
    'mailto:a@b.c',
    'data:text/html,x',
    'https://user:pass@example.com',
    'ftp://example.com',
  ])
    assert.equal(safeCampaignHref(bad), null, bad);
});

test('the link list is stable, deduplicated and per locale', () => {
  assert.deepEqual(campaignLinks(content), [
    'https://example.com/a?b=1&c=2',
    '/es/nuevo',
    '/es/soluciones/cord',
    'https://example.com/en',
    '/en/soluciones/cord',
  ]);
});

test('the body renderer escapes everything and only builds its own markup', () => {
  const { html, text } = renderBody(content.es.body, raw => safeCampaignHref(raw));
  assert.match(html, /<h2 [^>]*>Título<\/h2>/);
  assert.match(html, /<strong>negritas<\/strong>/);
  assert.match(html, /<ul [^>]*><li [^>]*>uno<\/li>/);
  assert.match(html, /href="https:\/\/example.com\/a\?b=1&amp;c=2"/);
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(text, /un enlace \(https:\/\/example.com\/a\?b=1&c=2\)/);
  assert.match(text, /• dos \(\/es\/nuevo\)/);
  // An unsafe link stays as text.
  assert.doesNotMatch(renderBody('[x](javascript:alert(1))', safeCampaignHref).html, /<a /);
});

test('rendered campaigns use counted links, the unsubscribe page and escaped listings', () => {
  const message = renderCampaignEmail({
    content,
    locale: 'es',
    origin: 'https://shwcs.site',
    campaignId: id,
    unsubscribeUrl: 'https://shwcs.site/es/newsletter/unsubscribe?token=a.b&c=x',
    copy: es.newsletter.mail.campaign,
  });
  assert.equal(message.subject, 'Novedades');
  assert.match(message.html, new RegExp(`/api/newsletter/click\\?c=${id}&amp;l=0"`));
  assert.match(message.html, new RegExp(`/api/newsletter/click\\?c=${id}&amp;l=2"`));
  assert.doesNotMatch(message.html, /example\.com/, 'external links only through the counter');
  assert.match(message.html, /Cord &lt;script&gt;/);
  assert.match(message.html, /Darte de baja/);
  assert.doesNotMatch(message.html, /p=1/);
  assert.match(message.text, /Darte de baja: https:\/\/shwcs\.site\/es\/newsletter\/unsubscribe/);
  // English subscribers get the English copy and its own listing path.
  const english = renderCampaignEmail({
    content,
    locale: 'en',
    origin: 'https://shwcs.site',
    campaignId: id,
    unsubscribeUrl: null,
    copy: en.newsletter.mail.campaign,
  });
  assert.equal(english.locale, 'en');
  assert.match(english.html, /l=4/);
  assert.match(english.html, /lang="en"/);
  // Without an English version, they get the Spanish one.
  assert.equal(
    renderCampaignEmail({
      content: { ...content, en: null },
      locale: 'en',
      origin: 'https://shwcs.site',
      campaignId: id,
      unsubscribeUrl: null,
      copy: en.newsletter.mail.campaign,
    }).locale,
    'es',
  );
});

test('a test send is labelled, versioned and its clicks are not counted', () => {
  const message = renderCampaignEmail({
    content,
    locale: 'es',
    origin: 'https://shwcs.site',
    campaignId: id,
    unsubscribeUrl: null,
    copy: es.newsletter.mail.campaign,
    test: { version: 3 },
  });
  assert.equal(message.subject, '[Prueba v3] Novedades');
  assert.match(message.html, /versión 3/);
  assert.match(message.html, /&amp;p=1"/);
  assert.match(message.text, /^Envío de prueba de la versión 3/);
});

test('rendering is deterministic, which the batch idempotency key relies on', () => {
  const args = {
    content,
    locale: 'es' as const,
    origin: 'https://shwcs.site',
    campaignId: id,
    unsubscribeUrl: 'https://shwcs.site/x',
    copy: es.newsletter.mail.campaign,
  };
  assert.deepEqual(renderCampaignEmail(args), renderCampaignEmail(args));
  assert.equal(batchKey(id, 2, ['b@x.dev', 'a@x.dev']), batchKey(id, 2, ['a@x.dev', 'b@x.dev']));
  assert.notEqual(batchKey(id, 2, ['a@x.dev']), batchKey(id, 2, ['a@x.dev', 'b@x.dev']));
  assert.ok(batchKey(id, 2, ['a@x.dev']).length <= 256);
});

test('content and segments are read strictly; problems block the test', () => {
  assert.deepEqual(readCampaignContent(content), content);
  assert.equal(
    readCampaignContent({ ...content, es: { subject: 'x'.repeat(151), heading: 'h' } }),
    null,
  );
  assert.equal(
    readCampaignContent({ ...content, listings: [{ ...listing, path: 'https://evil' }] }),
    null,
  );
  assert.equal(readCampaignContent({ ...content, en: { subject: 1 } }), null);
  assert.deepEqual(readCampaignSegment({ profiles: ['founder', 'nope'], roles: 'x' }), {
    profiles: ['founder'],
    roles: [],
  });
  assert.deepEqual(campaignProblems(content), []);
  assert.deepEqual(
    campaignProblems({
      es: { subject: '', preheader: '', heading: 'h', body: '[x](javascript:1)' },
      en: null,
      listings: [],
    }),
    ['es:subject', 'es:link'],
  );
  assert.deepEqual(
    campaignProblems({
      es: { subject: 's', preheader: '', heading: 'h', body: ' ' },
      en: null,
      listings: [],
    }),
    ['es:body'],
  );
});

test('Svix signatures: published test vector, tolerance, tampering', () => {
  const vector = {
    secret: 'whsec_plJ3nmyCDGBKInavdOK15jsl',
    id: 'msg_loFOjxBNrRLzqYUf',
    timestamp: '1731705121',
    body: '{"event_type":"ping","data":{"success":true}}',
    signature: 'v1,rAvfW3dJ/X/qxhsaXPOyyCGmRKsaKWcsNccKXlIktD0=',
  };
  assert.equal(verifySvixSignature({ ...vector, now: 1731705121_000 }), true);
  assert.equal(
    verifySvixSignature({
      ...vector,
      signature: `v1,bad= ${vector.signature}`,
      now: 1731705121_000,
    }),
    true,
    'any matching v1 entry',
  );
  assert.equal(verifySvixSignature({ ...vector, now: (1731705121 + 301) * 1000 }), false);
  assert.equal(
    verifySvixSignature({ ...vector, body: vector.body + ' ', now: 1731705121_000 }),
    false,
  );
  assert.equal(
    verifySvixSignature({ ...vector, secret: 'plJ3nmyCDGBKInavdOK15jsl', now: 1731705121_000 }),
    false,
  );
  assert.equal(
    verifySvixSignature({ ...vector, signature: 'v2,rAvfW3dJ', now: 1731705121_000 }),
    false,
  );
});

test('Resend events: only permanent bounces, suppressions and complaints unsubscribe', () => {
  const event = readResendEvent({
    type: 'email.bounced',
    created_at: '2026-11-17T10:00:00Z',
    data: {
      email_id: 'abc',
      to: ['Persona <Delivered+X@Resend.dev>'],
      tags: { campaign: id, kind: 'newsletter' },
      bounce: { type: 'Permanent', subType: 'Suppressed', message: '…' },
    },
  });
  assert.deepEqual(event, {
    type: 'email.bounced',
    emailId: 'abc',
    to: ['delivered+x@resend.dev'],
    campaignId: id,
    bounceType: 'Permanent',
  });
  assert.deepEqual(eventEffect(event!), { column: 'bounced', reason: 'bounce' });
  assert.deepEqual(eventEffect({ ...event!, bounceType: 'Temporary' }), {
    column: null,
    reason: null,
  });
  assert.deepEqual(eventEffect({ ...event!, type: 'email.complained' }), {
    column: 'complained',
    reason: 'complaint',
  });
  assert.deepEqual(eventEffect({ ...event!, type: 'email.suppressed' }).reason, 'bounce');
  assert.deepEqual(eventEffect({ ...event!, type: 'email.delivered' }), {
    column: 'delivered',
    reason: null,
  });
  assert.deepEqual(eventEffect({ ...event!, type: 'email.opened' }), {
    column: null,
    reason: null,
  });
  assert.equal(readResendEvent({ data: {} }), null);
});

test('the weekly draft lists the new listings with their own words, in both languages', () => {
  const listings = weeklyListings([
    {
      solutionId: listing.solutionId,
      name: 'Cord',
      description: 'Cotiza  y  cobra.'.padEnd(300, ' x'),
      detailUrl: '/soluciones/cord',
      categories: ['Ventas', 'Cobros'],
    },
    { solutionId: '', name: 'Sin id', description: '', detailUrl: '/soluciones/x', categories: [] },
  ]);
  assert.equal(listings.length, 1);
  assert.equal(listings[0].category, 'Ventas');
  assert.ok(listings[0].summary.length <= 240 && listings[0].summary.startsWith('Cotiza y cobra.'));
  const draft = weeklyDraftContent(listings, {
    es: es.newsletter.mail.weekly,
    en: en.newsletter.mail.weekly,
  });
  assert.equal(draft.es.subject, 'Nuevo esta semana en shwcs: Cord');
  assert.equal(draft.en?.subject, 'New this week on shwcs: Cord');
  assert.deepEqual(campaignProblems(draft), []);
  assert.ok(campaignLinks(draft).includes('/es/nuevo'));
  assert.ok(campaignLinks(draft).includes('/en/nuevo'));
});

test('confirmation links carry the token in the fragment only', () => {
  const message = confirmationEmail({
    origin: 'https://shwcs.site',
    locale: 'en',
    token: 'tok',
    copy: en.newsletter.mail.confirm,
  });
  assert.match(message.html, /https:\/\/shwcs\.site\/en\/newsletter\/confirm#token=tok/);
  assert.doesNotMatch(message.html, /\?token=/);
  assert.equal(message.subject, 'Confirm your shwcs subscription');
});

test('outside production only Resend test addresses receive campaigns', () => {
  const previous = process.env.VERCEL_ENV;
  try {
    delete process.env.VERCEL_ENV;
    assert.equal(newsletterRecipientAllowed('delivered+a@resend.dev'), true);
    assert.equal(newsletterRecipientAllowed('persona@empresa.com'), false);
    process.env.VERCEL_ENV = 'production';
    assert.equal(newsletterRecipientAllowed('persona@empresa.com'), true);
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test('routes: the internal API needs its own secret, the webhook its signature', async () => {
  const previous = process.env.OPS_NEWSLETTER_SECRET;
  const previousWebhook = process.env.RESEND_WEBHOOK_SECRET;
  try {
    process.env.OPS_NEWSLETTER_SECRET = 's'.repeat(40);
    assert.equal(authorizedOpsNewsletter(`Bearer ${'s'.repeat(40)}`), true);
    assert.equal(authorizedOpsNewsletter(`Bearer ${'s'.repeat(39)}`), false);
    const call = (auth?: string) =>
      internal(
        new NextRequest('http://localhost/api/internal/newsletter', {
          method: 'POST',
          headers: { ...(auth ? { authorization: auth } : {}), 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'nope' }),
        }),
      );
    assert.equal((await call()).status, 401);
    assert.equal((await call(`Bearer ${process.env.CRON_SECRET ?? 'x'.repeat(40)}`)).status, 401);
    assert.equal((await call(`Bearer ${'s'.repeat(40)}`)).status, 400);

    delete process.env.RESEND_WEBHOOK_SECRET;
    const hook = (headers: Record<string, string>, body = '{"type":"email.delivered","data":{}}') =>
      webhook(
        new Request('http://localhost/api/webhooks/resend', { method: 'POST', headers, body }),
      );
    assert.equal((await hook({})).status, 503);
    const key = Buffer.from('k'.repeat(24));
    process.env.RESEND_WEBHOOK_SECRET = `whsec_${key.toString('base64')}`;
    const now = String(Math.floor(Date.now() / 1000));
    assert.equal(
      (await hook({ 'svix-id': 'msg_1', 'svix-timestamp': now, 'svix-signature': 'v1,AAAA' }))
        .status,
      400,
    );
    // A valid signature over a payload without a type is still refused before any write.
    const body = '{"data":{}}';
    const signature = createHmac('sha256', key).update(`msg_1.${now}.${body}`).digest('base64');
    assert.equal(
      (
        await hook(
          { 'svix-id': 'msg_1', 'svix-timestamp': now, 'svix-signature': `v1,${signature}` },
          body,
        )
      ).status,
      400,
    );
  } finally {
    if (previous === undefined) delete process.env.OPS_NEWSLETTER_SECRET;
    else process.env.OPS_NEWSLETTER_SECRET = previous;
    if (previousWebhook === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
    else process.env.RESEND_WEBHOOK_SECRET = previousWebhook;
  }
});

test('routes: unsubscribe and confirm refuse forged or cross-origin requests', async () => {
  const page = (body: unknown, origin = 'http://localhost') =>
    new NextRequest('http://localhost/api/x', {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  assert.equal((await confirm(page({ token: 'x' }, 'https://evil.example'))).status, 403);
  assert.equal((await unsubscribe(page({ token: 'x' }, 'https://evil.example'))).status, 403);
  // One-click (no Origin of ours) still needs a valid signed token.
  const oneClick = await unsubscribe(
    new NextRequest('http://localhost/api/newsletter/unsubscribe?token=forged.token', {
      method: 'POST',
      body: 'List-Unsubscribe=One-Click',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    }),
  );
  assert.equal(oneClick.status, 400);
  assert.equal(isPagePath(['newsletter', 'confirm']), true);
  assert.equal(isPagePath(['newsletter', 'confirmar']), false);
});
