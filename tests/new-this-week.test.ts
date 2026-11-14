import assert from 'node:assert/strict';
import test from 'node:test';
import { splitNewListings, weekOf } from '../src/lib/solutions/new-this-week';

const now = new Date('2026-11-14T18:00:00Z'); // Saturday, 12:00 in Mexico City
const at = (iso: string, name: string) => ({ name, firstPublishedAt: iso });

test('weeks run Monday to Sunday in Mexico City time', () => {
  assert.equal(weekOf(now), '2026-11-09');
  // Monday 01:00 UTC is still Sunday evening in Mexico City.
  assert.equal(weekOf(new Date('2026-11-09T01:00:00Z')), '2026-11-02');
  assert.equal(weekOf(new Date('2026-11-09T07:00:00Z')), '2026-11-09');
});

test('the last seven days lead, by approval date; older ones go to their week (SHCWS-125)', () => {
  const { current, archive } = splitNewListings(
    [
      at('2026-11-10T12:00:00Z', 'Tuesday'),
      at('2026-11-13T12:00:00Z', 'Friday'),
      at('2026-11-07T19:00:00Z', 'Last Saturday'), // 6 days 23 h ago: still in the window
      at('2026-11-05T12:00:00Z', 'Last Thursday'),
      at('2026-10-01T12:00:00Z', 'October'),
      at('2026-05-01T12:00:00Z', 'Too old'),
      { name: 'Unknown', firstPublishedAt: null },
      at('2026-11-20T12:00:00Z', 'Future'),
    ],
    now,
  );
  assert.deepEqual(
    current.map(item => item.name),
    ['Friday', 'Tuesday', 'Last Saturday'],
  );
  assert.deepEqual(
    archive.map(week => [week.start, week.end, week.items.map(item => item.name)]),
    [
      ['2026-11-02', '2026-11-08', ['Last Thursday']],
      ['2026-09-28', '2026-10-04', ['October']],
    ],
  );
});
