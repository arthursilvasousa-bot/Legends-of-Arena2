import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTRO_TOTAL_DURATION,
  TITLE_MENU_ITEMS,
  computeIntroPhases,
  moveTitleMenuIndex,
} from './titleMenuHelpers';

test('TITLE_MENU_ITEMS matches exact required order and labels', () => {
  assert.deepEqual(
    TITLE_MENU_ITEMS.map((i) => i.label),
    ['JOGAR', '2 JOGADORES LOCAL', 'TORNEIO', 'CONFIGURAÇÕES', 'COMO JOGAR']
  );
});

test('moveTitleMenuIndex wraps cleanly in both directions', () => {
  assert.equal(moveTitleMenuIndex(0, -1), 4);
  assert.equal(moveTitleMenuIndex(4, 1), 0);
  assert.equal(moveTitleMenuIndex(2, 1), 3);
});

test('computeIntroPhases reveals sequence progressively and supports instant skip', () => {
  const early = computeIntroPhases(0.2, false);
  assert.ok(early.sky > 0);
  assert.equal(early.menu, 0);
  assert.equal(early.isReady, false);

  const mid = computeIntroPhases(1.6, false);
  assert.equal(mid.sky, 1);
  assert.ok(mid.logo > 0.8);
  assert.ok(mid.menu > 0);

  const skipped = computeIntroPhases(0.1, true);
  assert.equal(skipped.sky, 1);
  assert.equal(skipped.cursor, 1);
  assert.equal(skipped.isReady, true);

  const done = computeIntroPhases(INTRO_TOTAL_DURATION, false);
  assert.equal(done.isReady, true);
});
