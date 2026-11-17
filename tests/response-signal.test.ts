import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatResponseSignal,
  isFastResponder,
  responseRankBonus,
} from '../src/lib/solutions/response-model';
import { signalFromRow } from '../src/lib/solutions/response';
import { solutionScore } from '../src/lib/solutions/ranking';

test('the response signal needs three requests and says nothing below them (SHCWS-52)', () => {
  assert.equal(signalFromRow({ requests: 2, answered: 2, median_hours: 3 }), null);
  assert.deepEqual(signalFromRow({ requests: 3, answered: 3, median_hours: 5 }), {
    medianHours: 5,
    answered: 3,
    requests: 3,
  });
  // Unanswered requests are a fact a buyer needs: the count shows, without a speed.
  assert.deepEqual(signalFromRow({ requests: 4, answered: 0, median_hours: null }), {
    medianHours: null,
    answered: 0,
    requests: 4,
  });
});

test('the sentence is an upper bound, in both languages', () => {
  const fast = { medianHours: 20, answered: 9, requests: 10 };
  assert.deepEqual(formatResponseSignal(fast, 'es'), {
    speed: 'Suele responder en menos de 24 h',
    rate: '9 de 10 respondidas',
  });
  assert.equal(
    formatResponseSignal({ ...fast, medianHours: 30 }, 'en').speed,
    'Usually replies within 48 h',
  );
  assert.equal(
    formatResponseSignal({ ...fast, medianHours: 50 }, 'es').speed,
    'Suele responder en menos de 3 días',
  );
  assert.deepEqual(formatResponseSignal({ medianHours: null, answered: 0, requests: 3 }, 'es'), {
    speed: null,
    rate: '0 de 3 respondidas',
  });
});

test('«Responde rápido» and the ranking bonus follow the published rule', () => {
  assert.equal(isFastResponder({ medianHours: 48, answered: 8, requests: 10 }), true);
  assert.equal(isFastResponder({ medianHours: 49, answered: 10, requests: 10 }), false);
  assert.equal(isFastResponder({ medianHours: 2, answered: 7, requests: 10 }), false);
  assert.equal(isFastResponder(null), false);
  // At most what one save weighs; half when slower than 48 h, nothing slower than a week.
  assert.equal(responseRankBonus({ medianHours: 10, answered: 10, requests: 10 }), 2);
  assert.equal(responseRankBonus({ medianHours: 100, answered: 10, requests: 10 }), 1);
  assert.equal(responseRankBonus({ medianHours: 200, answered: 10, requests: 10 }), 0);
  assert.equal(responseRankBonus({ medianHours: null, answered: 0, requests: 5 }), 0);
  assert.equal(responseRankBonus(null), 0);
  assert.equal(solutionScore(0, 1, 0, 0), solutionScore(0, 0, 0, 0, 0, 2));
});
