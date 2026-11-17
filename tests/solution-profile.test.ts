import assert from 'node:assert/strict';
import test from 'node:test';
import { emptySolution, readSolutionData, solutionErrors } from '../src/lib/solutions/model';
import {
  questionErrors,
  questionIndex,
  questionPhase,
  solutionQuestions,
  requiredQuestions,
  optionalQuestions,
  isSolutionQuestion,
} from '../src/lib/solutions/questions';
const founder = {
  name: 'Public name',
  role: 'Cofounder',
  bio: 'Professional introduction.',
  links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/example' }],
};
test('public founders and links are bounded and cannot smuggle private account metadata', () => {
  const data = readSolutionData({
    ...emptySolution,
    founders: [{ ...founder, email: 'private', account_id: 'fake' }],
    projectLinks: [{ label: 'GitHub', url: 'https://github.com/example', verified: true }],
  })!;
  assert.deepEqual(data.founders, [founder]);
  assert.deepEqual(data.projectLinks, [{ label: 'GitHub', url: 'https://github.com/example' }]);
  for (const patch of [
    { founders: Array(4).fill(founder) },
    { founders: [{ ...founder, name: 'x'.repeat(101) }] },
    { founders: [{ ...founder, links: Array(5).fill(founder.links[0]) }] },
    { projectLinks: [{ label: 'Verified', url: 'https://example.com' }] },
    { projectLinks: Array(7).fill(founder.links[0]) },
  ])
    assert.equal(readSolutionData({ ...emptySolution, ...patch }), null);
  const draft = readSolutionData({
    ...emptySolution,
    founders: [{ ...founder, name: '', links: [{ label: 'X', url: '' }] }],
    projectLinks: [{ label: 'X', url: 'javascript:alert(1)' }],
  })!;
  assert.ok(draft);
  assert.ok(solutionErrors(draft).founders);
  assert.ok(solutionErrors(draft).projectLinks);
});
test('registration editor: three required steps, legacy drafts resume, optional stays optional', () => {
  assert.deepEqual(
    requiredQuestions.map(item => item.id),
    ['basics', 'fit', 'audience', 'review'],
  );
  // Drafts saved by the previous 18-question editor resume at the equivalent step.
  for (const [legacy, id] of [
    ['identity', 'basics'],
    ['categories', 'basics'],
    ['problem', 'basics'],
    ['capabilities', 'fit'],
    ['market', 'audience'],
    ['contact', 'review'],
  ])
    assert.equal(solutionQuestions[questionIndex(legacy)].id, id);
  assert.equal(solutionQuestions[questionIndex(null, 0)].id, 'basics');
  assert.equal(solutionQuestions[questionIndex(null, 1)].id, 'fit');
  assert.equal(solutionQuestions[questionIndex(null, 2)].id, 'review');
  assert.equal(solutionQuestions[questionIndex(null, 3)].id, 'review');
  // The API checks question and phase together, for current and legacy ids.
  for (const item of solutionQuestions) assert.equal(questionPhase(item.id), item.phase);
  assert.equal(questionPhase('contact'), 2);
  assert.equal(questionPhase('constructor'), undefined);
  assert.equal(isSolutionQuestion('constructor'), false);
  assert.deepEqual(
    questionErrors(
      {
        ...emptySolution,
        name: 'Example',
        kind: 'Software',
        website: 'https://example.com',
        problem: 'Un problema concreto que resolvemos',
      },
      questionIndex('basics'),
    ),
    [],
  );
  assert.ok(
    questionErrors(
      { ...emptySolution, demoUrl: 'https://user:secret@example.com' },
      questionIndex('demo'),
    ).length,
  );
  assert.deepEqual(questionErrors(emptySolution, questionIndex('founders')), []);
  assert.ok(optionalQuestions.every(item => item.optional));
  // Every field that can block a submission lives in some question, so the editor can
  // always take the founder to it.
  const placed = new Set<string>(solutionQuestions.flatMap(item => [...item.fields]));
  for (const field of Object.keys(solutionErrors(emptySolution)))
    assert.ok(placed.has(field), field);
});
