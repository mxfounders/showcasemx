import assert from 'node:assert/strict';
import test from 'node:test';
import { welcomeEmail } from '../src/lib/notifications/welcome-email';

const origin = 'https://shwcs.site';

test('each onboarding profile gets its own welcome, pointing at real pages', () => {
  const founder = welcomeEmail({ profile: 'founder', origin, categories: [] });
  assert.equal(founder.button.href, 'https://shwcs.site/es/account/solutions/new');
  assert.match(founder.paragraphs.join(' '), /nadie paga por aparecer más arriba/);
  assert.deepEqual(welcomeEmail({ profile: 'both', origin, categories: [] }), founder);

  const buyer = welcomeEmail({
    profile: 'buyer',
    origin,
    categories: [
      { title: 'Cobros <b>', slug: 'cobros' },
      { title: 'Ventas', slug: 'ventas' },
    ],
  });
  const html = buyer.paragraphs.join(' ');
  assert.ok(html.includes('href="https://shwcs.site/es/explorar/cobros"'));
  assert.ok(html.includes('Cobros &lt;b&gt;') && !html.includes('<b>'));
  assert.ok(html.includes('/es/contacto?motivo=find'));
  // With no published listings, no category links at all.
  const empty = welcomeEmail({ profile: 'buyer', origin, categories: [] }).paragraphs.join(' ');
  assert.ok(!empty.includes('/explorar/'));

  const exploring = welcomeEmail({ profile: 'exploring', origin, categories: [] });
  assert.match(exploring.paragraphs.join(' '), /crear tu cuenta no te suscribe/);
  assert.deepEqual(welcomeEmail({ profile: null, origin, categories: [] }), exploring);
});
