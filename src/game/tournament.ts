import { CHARACTERS, CHARACTER_LIST } from './roster';
import { ArenaId, CharacterId, Difficulty } from './types';

export type TournamentSize = 4 | 8;
export type ParticipantControl = 'human' | 'ai';

export interface TournamentParticipant {
  seed: number;
  characterId: CharacterId;
  control: ParticipantControl;
}

export interface TournamentMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  p1: TournamentParticipant | null;
  p2: TournamentParticipant | null;
  arenaId: ArenaId;
  winnerSide: 1 | 2 | null;
  winner: TournamentParticipant | null;
  scoreLabel: string | null;
}

export interface TournamentBracket {
  size: TournamentSize;
  difficulty: Difficulty;
  rounds: TournamentMatch[][];
  champion: TournamentParticipant | null;
}

export function createDefaultParticipants(size: TournamentSize): TournamentParticipant[] {
  const chosen = CHARACTER_LIST.slice(0, size);
  return chosen.map((ch, idx) => ({
    seed: idx + 1,
    characterId: ch.id,
    control: idx === 0 ? 'human' : 'ai',
  }));
}

export function getRoundTitle(roundIndex: number, totalRounds: number): string {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return 'FINAL';
  if (fromEnd === 1) return 'SEMIFINAL';
  if (fromEnd === 2) return 'QUARTAS DE FINAL';
  return `RODADA ${roundIndex + 1}`;
}

export function createTournamentBracket(
  participants: TournamentParticipant[],
  difficulty: Difficulty
): TournamentBracket {
  const size: TournamentSize = participants.length >= 8 ? 8 : 4;
  const list = participants.slice(0, size);
  const totalRounds = size === 8 ? 3 : 2;
  const rounds: TournamentMatch[][] = [];

  // Seed Round 0: pair (0 vs 1), (2 vs 3), etc.
  const r0: TournamentMatch[] = [];
  for (let i = 0; i < size / 2; i++) {
    const p1 = list[i * 2];
    const p2 = list[i * 2 + 1];
    r0.push({
      id: `r0-m${i}`,
      roundIndex: 0,
      matchIndex: i,
      p1,
      p2,
      arenaId: CHARACTERS[p2.characterId].homeArena,
      winnerSide: null,
      winner: null,
      scoreLabel: null,
    });
  }
  rounds.push(r0);

  // Subsequent empty rounds
  for (let r = 1; r < totalRounds; r++) {
    const matchCount = Math.max(1, size / Math.pow(2, r + 1));
    const roundMatches: TournamentMatch[] = [];
    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: `r${r}-m${m}`,
        roundIndex: r,
        matchIndex: m,
        p1: null,
        p2: null,
        arenaId: 'shadow_temple',
        winnerSide: null,
        winner: null,
        scoreLabel: null,
      });
    }
    rounds.push(roundMatches);
  }

  return {
    size,
    difficulty,
    rounds,
    champion: null,
  };
}

export function getNextPendingMatch(bracket: TournamentBracket): TournamentMatch | null {
  for (const round of bracket.rounds) {
    for (const match of round) {
      if (match.winner === null && match.p1 !== null && match.p2 !== null) {
        return match;
      }
    }
  }
  return null;
}

export function recordMatchWinner(
  bracket: TournamentBracket,
  roundIndex: number,
  matchIndex: number,
  winnerSide: 1 | 2,
  scoreLabel = '2 - 0'
): TournamentBracket {
  const nextRounds = bracket.rounds.map((r) => r.map((m) => ({ ...m })));
  const current = nextRounds[roundIndex]?.[matchIndex];
  if (!current || !current.p1 || !current.p2) {
    return bracket;
  }

  const winner = winnerSide === 1 ? current.p1 : current.p2;
  current.winnerSide = winnerSide;
  current.winner = winner;
  current.scoreLabel = scoreLabel;

  let nextChampion = bracket.champion;
  if (roundIndex + 1 < nextRounds.length) {
    const targetMatchIdx = Math.floor(matchIndex / 2);
    const targetMatch = nextRounds[roundIndex + 1][targetMatchIdx];
    if (matchIndex % 2 === 0) {
      targetMatch.p1 = winner;
    } else {
      targetMatch.p2 = winner;
    }
    if (targetMatch.p2) {
      targetMatch.arenaId = CHARACTERS[targetMatch.p2.characterId].homeArena;
    } else if (targetMatch.p1) {
      targetMatch.arenaId = CHARACTERS[targetMatch.p1.characterId].homeArena;
    }
  } else {
    nextChampion = winner;
  }

  return {
    ...bracket,
    rounds: nextRounds,
    champion: nextChampion,
  };
}

export function simulateCpuMatch(
  p1: TournamentParticipant,
  p2: TournamentParticipant,
  roll: number = Math.random()
): { winnerSide: 1 | 2; scoreLabel: string } {
  const c1 = CHARACTERS[p1.characterId];
  const c2 = CHARACTERS[p2.characterId];
  const p1Score = c1.stats.power + c1.stats.speed + c1.stats.defense + c1.stats.range;
  const p2Score = c2.stats.power + c2.stats.speed + c2.stats.defense + c2.stats.range;
  const p1Prob = Math.max(0.25, Math.min(0.75, 0.5 + (p1Score - p2Score) * 0.04));
  const winnerSide: 1 | 2 = roll < p1Prob ? 1 : 2;
  const close = Math.abs(roll - p1Prob) < 0.16;
  return {
    winnerSide,
    scoreLabel: close ? '2 - 1' : '2 - 0',
  };
}
