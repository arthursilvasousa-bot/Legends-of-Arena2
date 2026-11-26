import { CHARACTER_LIST } from './roster';
import { CharacterDef, CharacterId } from './types';

export const SELECT_TIMER_SECONDS = 30;
export const SELECT_GRID_COLS = 6;

export type GridDirection = 'left' | 'right' | 'up' | 'down';

export function formatFighterDisplayName(char: Pick<CharacterDef, 'name' | 'playerName'>): string {
  if (!char.playerName || char.name.toLowerCase() === char.playerName.toLowerCase()) {
    return char.name;
  }
  return `${char.name} (${char.playerName})`;
}

export function moveGridCursor(
  currentId: CharacterId,
  direction: GridDirection,
  list: CharacterDef[] = CHARACTER_LIST,
  cols: number = SELECT_GRID_COLS
): CharacterId {
  if (list.length === 0) return currentId;
  const idx = Math.max(0, list.findIndex((c) => c.id === currentId));
  const total = list.length;

  if (direction === 'left') {
    return list[(idx - 1 + total) % total].id;
  }
  if (direction === 'right') {
    return list[(idx + 1) % total].id;
  }
  if (direction === 'up') {
    const nextIdx = idx - cols;
    return list[nextIdx >= 0 ? nextIdx : (nextIdx + total) % total].id;
  }
  const nextIdx = idx + cols;
  return list[nextIdx < total ? nextIdx : nextIdx % cols < total ? nextIdx % cols : idx].id;
}

export function stepSelectCountdown(secondsLeft: number): {
  nextSeconds: number;
  shouldAutoStart: boolean;
} {
  if (secondsLeft <= 1) {
    return { nextSeconds: 0, shouldAutoStart: true };
  }
  return { nextSeconds: secondsLeft - 1, shouldAutoStart: false };
}
