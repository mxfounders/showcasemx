import assert from 'node:assert/strict';
import test from 'node:test';
import { REVIEW_LEVEL_LABEL, reviewLevel } from '../ops/src/lib/reviews';
import { freeEmailDomains, reviewLevel as productReviewLevel } from '../src/lib/reviews/model';
import { reviews as reviewsEs } from '../src/i18n/dictionaries/es/reviews';

test('ops review levels match the product on the same author', () => {
  const emails = [
    'ana@acme.mx',
    'ana@gmail.com',
    'ana@hotmail.co.uk',
    'ana@yahoo.com.mx',
    'ana@prodigy.net.mx',
    'ana@empresa.com',
    ...freeEmailDomains.map(domain => `x@${domain}`),
  ];
  for (const email of emails)
    for (const verified of [true, false])
      for (const proven of [true, false])
        for (const contacted of [true, false])
          assert.equal(
            reviewLevel(email, verified, proven, contacted),
            productReviewLevel(email.split('@')[1], verified, proven, contacted),
            `${email} ${verified} ${proven} ${contacted}`,
          );
});

test('ops shows the same level wording as the public ficha', () => {
  assert.deepEqual(REVIEW_LEVEL_LABEL, { ...reviewsEs.levels });
});
