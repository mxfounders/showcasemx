import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import {
  isReviewInviteToken,
  reviewInvitedFactor,
  reviewLevel,
  reviewLevels,
  reviewWeight,
  reviewWeights,
} from '../src/lib/reviews/model';
import { readAnswer, readQuestion, readQuestionReport } from '../src/lib/questions/model';
import { validMagicToken } from '../src/lib/auth/magic-link';
import { authReturnTo } from '../src/lib/auth/return-to';
import { solutionQuestionsJsonLd } from '../src/lib/structured-data';
import { reviewRequestEmail } from '../src/lib/notifications/review-request-email';
import { listingNotificationEmail } from '../src/lib/notifications/listing-email';
import { es } from '../src/i18n/dictionaries/es';
import { en } from '../src/i18n/dictionaries/en';
import { POST as magicPost } from '../src/app/api/auth/magic-link/route';
import { POST as invitePost } from '../src/app/api/solutions/[id]/review-invite/route';
import { POST as questionsPost } from '../src/app/api/solutions/[id]/questions/route';

const solution = '00000000-0000-4000-8000-000000000001';

test('a conversation through shwcs is a level between a company address and a proof', () => {
  assert.equal(reviewLevel('gmail.com', true, false, true), 'contact');
  assert.equal(reviewLevel('acme.mx', true, false, true), 'contact');
  assert.equal(reviewLevel('acme.mx', true, true, true), 'customer');
  assert.equal(reviewLevel('acme.mx', false, false, true), 'unverified');
  assert.ok(reviewWeights.work < reviewWeights.contact);
  assert.ok(reviewWeights.contact < reviewWeights.customer);
  for (const level of reviewLevels) {
    assert.ok(es.reviews.levels[level]);
    assert.ok(en.reviews.levels[level]);
  }
});

test('an invited review never counts more than the same review unprompted', () => {
  assert.ok(reviewInvitedFactor > 0 && reviewInvitedFactor < 1);
  for (const level of reviewLevels) {
    assert.ok(reviewWeight(level, true) < reviewWeight(level, false));
    assert.equal(reviewWeight(level, false), reviewWeights[level]);
  }
  // The strongest invited review weighs no more than an uninvited proven purchase.
  assert.ok(reviewWeight('customer', true) <= reviewWeights.customer);
});

test('invite and sign-in tokens have one exact shape', () => {
  assert.ok(isReviewInviteToken('0123456789abcdef0123456789abcdef'));
  assert.ok(!isReviewInviteToken('0123456789ABCDEF0123456789abcdef'));
  assert.ok(!isReviewInviteToken('../account'));
  assert.ok(validMagicToken('a'.repeat(64)));
  assert.ok(!validMagicToken('a'.repeat(63)));
  assert.ok(!validMagicToken(undefined));
});

test('sign-in can come back to an invitation, and to nothing else new', () => {
  assert.equal(
    authReturnTo('/resenar/0123456789abcdef0123456789abcdef'),
    '/resenar/0123456789abcdef0123456789abcdef',
  );
  assert.equal(authReturnTo(`/account/reviews/${solution}`), `/account/reviews/${solution}`);
  assert.equal(authReturnTo('/resenar/../../evil'), '/account');
  assert.equal(authReturnTo('//evil.example/resenar/0123456789abcdef0123456789abcdef'), '/account');
  assert.equal(authReturnTo('/account/reviews/not-a-uuid'), '/account');
});

test('questions are bounded and an empty answer removes it', () => {
  assert.deepEqual(readQuestion({ name: ' Ana ', body: '¿Emite facturas CFDI?' }), {
    ok: true,
    name: 'Ana',
    body: '¿Emite facturas CFDI?',
  });
  assert.deepEqual(readQuestion({ name: '', body: '¿Emite facturas CFDI?' }), {
    ok: false,
    field: 'name',
  });
  assert.deepEqual(readQuestion({ name: 'Ana', body: '¿CFDI?' }), { ok: false, field: 'body' });
  assert.equal(readAnswer('  '), null);
  assert.equal(readAnswer('Sí, timbramos con nuestro PAC.'), 'Sí, timbramos con nuestro PAC.');
  assert.equal(readAnswer('x'.repeat(2001)), undefined);
  assert.equal(readQuestionReport({ reason: 'spam', details: 'corto' }), null);
  assert.deepEqual(readQuestionReport({ reason: 'spam', details: 'Publicidad de otra app.' }), {
    reason: 'spam',
    details: 'Publicidad de otra app.',
  });
  for (const field of ['name', 'body'] as const) {
    assert.ok(es.questions.errors.fields[field]);
    assert.ok(en.questions.errors.fields[field]);
  }
});

test('only answered, visible questions feed the FAQPage markup', () => {
  assert.equal(
    solutionQuestionsJsonLd(solution, 'es', [{ body: '¿Tiene app?', answer: null }]),
    null,
  );
  const faq = solutionQuestionsJsonLd(solution, 'es', [
    { body: '¿Tiene app?', answer: { body: 'Sí, iOS y Android.' } },
    { body: '¿Oculta?', answer: { body: 'No debería salir.' }, hiddenReason: 'spam' },
    { body: '¿Sin respuesta?', answer: null },
  ]);
  assert.ok(faq);
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity.length, 1);
  assert.equal(faq.mainEntity[0].name, '¿Tiene app?');
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Sí, iOS y Android.');
});

test('notice emails carry the question and never the conversation', () => {
  const question = listingNotificationEmail({
    title: 'Nueva pregunta sobre tu ficha',
    solutionId: solution,
    solutionName: 'Cord',
    origin: 'https://shwcs.site',
    event: { kind: 'question', author: 'Ana <script>', body: '¿Emite CFDI?' },
  });
  assert.match(question.paragraphs.join(''), /¿Emite CFDI\?/);
  assert.doesNotMatch(question.paragraphs.join(''), /<script>/);
  assert.equal(question.button.href, `https://shwcs.site/es/soluciones/${solution}#preguntas`);
  const request = reviewRequestEmail({
    title: '¿Cómo te fue con Cord? Deja tu reseña',
    solutionId: solution,
    solutionName: 'Cord <b>',
    origin: 'https://shwcs.site',
  });
  assert.equal(request.button.href, `https://shwcs.site/es/account/reviews/${solution}`);
  assert.doesNotMatch(request.paragraphs.join(''), /<b>/);
});

test('the new endpoints refuse foreign origins and anonymous writes before storage', async () => {
  const post = (url: string, origin: string, body: unknown) =>
    new NextRequest(url, {
      method: 'POST',
      headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  const base = 'https://shwcs.example';
  assert.equal(
    (await magicPost(post(`${base}/api/auth/magic-link`, 'https://evil.example', {}))).status,
    403,
  );
  // A malformed token is refused before any lookup.
  assert.equal(
    (
      await magicPost(
        post(`${base}/api/auth/magic-link`, base, { action: 'consume', token: 'nope' }),
      )
    ).status,
    400,
  );
  const params = { params: Promise.resolve({ id: solution }) };
  const invite = `${base}/api/solutions/${solution}/review-invite`;
  assert.equal((await invitePost(post(invite, 'https://evil.example', {}), params)).status, 403);
  assert.equal((await invitePost(post(invite, base, { action: 'create' }), params)).status, 401);
  const questions = `${base}/api/solutions/${solution}/questions`;
  const ask = { action: 'ask', questionId: solution, name: 'Ana', body: '¿Emite CFDI?' };
  assert.equal(
    (await questionsPost(post(questions, 'https://evil.example', ask), params)).status,
    403,
  );
  assert.equal((await questionsPost(post(questions, base, ask), params)).status, 401);
});
