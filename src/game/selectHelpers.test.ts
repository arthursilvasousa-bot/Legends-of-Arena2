import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_LIST } from './roster';
import {
  SELECT_GRID_COLS,
  SELECT_TIMER_SECONDS,
  formatFighterDisplayName,
  moveGridCursor,
  stepSelectCountdown,
} from './selectHelpers';

test('select grid constants match 30s timer and 6x2 layout for 11 fighters', () => {
  assert.equal(SELECT_TIMER_SECONDS, 30);
  assert.equal(SELECT_GRID_COLS, 6);
  assert.equal(CHARACTER_LIST.length, 11);
});

test('moveGridCursor navigates rows and columns cleanly with wrapping', () => {
  const first = CHARACTER_LIST[0].id;
  const second = CHARACTER_LIST[1].id;
  const row2First = CHARACTER_LIST[6].id;
  const last = CHARACTER_LIST[CHARACTER_LIST.length - 1].id;

  assert.equal(moveGridCursor(first, 'right'), second);
  assert.equal(moveGridCursor(first, 'left'), last);
  assert.equal(moveGridCursor(first, 'down'), row2First);
  assert.equal(moveGridCursor(row2First, 'up'), first);
  assert.equal(moveGridCursor(row2First, 'down'), first);
});

test('formatFighterDisplayName avoids duplicate playerName and preserves distinct aliases', () => {
  assert.equal(formatFighterDisplayName({ name: 'Ninja', playerName: '' }), 'Ninja');
  assert.equal(formatFighterDisplayName({ name: 'Zé da Pinga', playerName: 'Zé da Pinga' }), 'Zé da Pinga');
  assert.equal(
    formatFighterDisplayName({ name: 'Dono do Morro', playerName: 'Chefe' }),
    'Dono do Morro (Chefe)'
  );
});

test('stepSelectCountdown ticks down from 30 and signals auto-start at 0', () => {
  assert.deepEqual(stepSelectCountdown(30), { nextSeconds: 29, shouldAutoStart: false });
  assert.deepEqual(stepSelectCountdown(2), { nextSeconds: 1, shouldAutoStart: false });
  assert.deepEqual(stepSelectCountdown(1), { nextSeconds: 0, shouldAutoStart: true });
  assert.deepEqual(stepSelectCountdown(0), { nextSeconds: 0, shouldAutoStart: true });
});
