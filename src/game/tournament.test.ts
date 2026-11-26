import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultParticipants,
  createTournamentBracket,
  getNextPendingMatch,
  getRoundTitle,
  recordMatchWinner,
  simulateCpuMatch,
} from './tournament';

test('4-player tournament bracket creates Semifinals and Final and advances champion', () => {
  const participants = createDefaultParticipants(4);
  let bracket = createTournamentBracket(participants, 'normal');

  assert.equal(bracket.rounds.length, 2);
  assert.equal(getRoundTitle(0, 2), 'SEMIFINAL');
  assert.equal(getRoundTitle(1, 2), 'FINAL');
  assert.equal(bracket.champion, null);

  const m1 = getNextPendingMatch(bracket);
  assert.ok(m1);
  assert.equal(m1.id, 'r0-m0');
  bracket = recordMatchWinner(bracket, 0, 0, 1, '2 - 0');

  const m2 = getNextPendingMatch(bracket);
  assert.ok(m2);
  assert.equal(m2.id, 'r0-m1');
  bracket = recordMatchWinner(bracket, 0, 1, 2, '2 - 1');

  const finalMatch = getNextPendingMatch(bracket);
  assert.ok(finalMatch);
  assert.equal(finalMatch.id, 'r1-m0');
  assert.equal(finalMatch.p1?.characterId, participants[0].characterId);
  assert.equal(finalMatch.p2?.characterId, participants[3].characterId);

  bracket = recordMatchWinner(bracket, 1, 0, 1, '2 - 0');
  assert.equal(bracket.champion?.characterId, participants[0].characterId);
  assert.equal(getNextPendingMatch(bracket), null);
});

test('8-player tournament creates 3 rounds and simulateCpuMatch produces valid results', () => {
  const participants = createDefaultParticipants(8);
  const bracket = createTournamentBracket(participants, 'hard');
  assert.equal(bracket.rounds.length, 3);
  assert.equal(getRoundTitle(0, 3), 'QUARTAS DE FINAL');

  const sim1 = simulateCpuMatch(participants[0], participants[1], 0.1);
  assert.equal(sim1.winnerSide, 1);
  const sim2 = simulateCpuMatch(participants[0], participants[1], 0.95);
  assert.equal(sim2.winnerSide, 2);
});
