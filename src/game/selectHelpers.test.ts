import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_LIST, CHARACTER_LIST } from './roster';
import {
  SELECT_GRID_COLS,
  STAGE_GRID_COLS,
  formatFighterDisplayName,
  moveArenaCursor,
  moveGridCursor,
  pickRandomArenaId,
} from './selectHelpers';

test('select grid constants match 6x2 fighter layout and 3-col 6-stage layout', () => {
  assert.equal(SELECT_GRID_COLS, 6);
  assert.equal(CHARACTER_LIST.length, 12);
  assert.equal(STAGE_GRID_COLS, 3);
  assert.equal(ARENA_LIST.length, 6);
  assert.ok(ARENA_LIST.some((a) => a.id === 'favela_vida_loka'));
  assert.ok(!ARENA_LIST.some((a) => (a.id as string) === 'realm_of_dead'));
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

test('moveArenaCursor navigates the 3-col 6-stage grid cleanly with wrapping', () => {
  const first = ARENA_LIST[0].id;
  const second = ARENA_LIST[1].id;
  const row2First = ARENA_LIST[3].id;
  const last = ARENA_LIST[ARENA_LIST.length - 1].id;

  assert.equal(moveArenaCursor(first, 'right'), second);
  assert.equal(moveArenaCursor(first, 'left'), last);
  assert.equal(moveArenaCursor(first, 'down'), row2First);
  assert.equal(moveArenaCursor(row2First, 'up'), first);
  assert.equal(moveArenaCursor(row2First, 'down'), first);
});

test('pickRandomArenaId chooses a different arena deterministically when possible', () => {
  const first = ARENA_LIST[0].id;
  const picked = pickRandomArenaId(first, ARENA_LIST, () => 0);
  assert.notEqual(picked, first);
  assert.ok(ARENA_LIST.some((a) => a.id === picked));
});

test('formatFighterDisplayName avoids duplicate playerName and preserves distinct aliases', () => {
  assert.equal(formatFighterDisplayName({ name: 'Ninja', playerName: '' }), 'Ninja');
  assert.equal(formatFighterDisplayName({ name: 'Zé da Pinga', playerName: 'Zé da Pinga' }), 'Zé da Pinga');
  assert.equal(
    formatFighterDisplayName({ name: 'Dono do Morro', playerName: 'Chefe' }),
    'Dono do Morro (Chefe)'
  );
});
