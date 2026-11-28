import { ARENA_LIST, CHARACTER_LIST } from './roster';
import { ArenaDef, ArenaId, CharacterDef, CharacterId } from './types';

export const SELECT_GRID_COLS = 6;
export const STAGE_GRID_COLS = 3;

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

export function moveArenaCursor(
  currentId: ArenaId,
  direction: GridDirection,
  list: ArenaDef[] = ARENA_LIST,
  cols: number = STAGE_GRID_COLS
): ArenaId {
  if (list.length === 0) return currentId;
  const idx = Math.max(0, list.findIndex((a) => a.id === currentId));
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

export function pickRandomArenaId(
  currentId?: ArenaId,
  list: ArenaDef[] = ARENA_LIST,
  rng: () => number = Math.random
): ArenaId {
  if (list.length === 0) return currentId ?? 'shadow_temple';
  if (list.length === 1) return list[0].id;
  const candidates = currentId ? list.filter((a) => a.id !== currentId) : list;
  const pool = candidates.length > 0 ? candidates : list;
  const index = Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)));
  return pool[index].id;
}
