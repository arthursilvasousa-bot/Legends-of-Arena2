import { FighterAction, FighterState } from './types';

export type ElfSequenceKey =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'crouch'
  | 'standup'
  | 'block'
  | 'roll'
  | 'knockdown'
  | 'getup'
  | 'punch'
  | 'kick'
  | 'heavy_punch'
  | 'heavy_kick'
  | 'grab'
  | 'throw'
  | 'special_flamejante'
  | 'special_congelante'
  | 'special_chuva'
  | 'special_arcana'
  | 'finisher'
  | 'victory';

export interface ElfSequenceMeta {
  key: ElfSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

export const ELF_RENDER_SCALE = 0.62;

// Configurable animation speeds & frame metadata matching /public/assets/elf_ariel/manifest.json
export const ELF_SEQUENCES: Record<ElfSequenceKey, ElfSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/elf_ariel/idle.png',
    frameWidth: 100,
    frameHeight: 120,
    frameCount: 6,
    fps: 8,
    loop: true,
    anchorX: 55,
    anchorY: 116,
  },
  walk: {
    key: 'walk',
    file: '/assets/elf_ariel/walk.png',
    frameWidth: 100,
    frameHeight: 118,
    frameCount: 8,
    fps: 12,
    loop: true,
    anchorX: 64,
    anchorY: 114,
  },
  run: {
    key: 'run',
    file: '/assets/elf_ariel/run.png',
    frameWidth: 126,
    frameHeight: 118,
    frameCount: 8,
    fps: 16,
    loop: true,
    anchorX: 81,
    anchorY: 113,
  },
  jump: {
    key: 'jump',
    file: '/assets/elf_ariel/jump.png',
    frameWidth: 134,
    frameHeight: 118,
    frameCount: 8,
    fps: 12,
    loop: false,
    anchorX: 86,
    anchorY: 113,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/elf_ariel/crouch.png',
    frameWidth: 96,
    frameHeight: 98,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 52,
    anchorY: 94,
  },
  standup: {
    key: 'standup',
    file: '/assets/elf_ariel/standup.png',
    frameWidth: 88,
    frameHeight: 118,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 54,
    anchorY: 114,
  },
  block: {
    key: 'block',
    file: '/assets/elf_ariel/block.png',
    frameWidth: 92,
    frameHeight: 108,
    frameCount: 4,
    fps: 10,
    loop: true,
    anchorX: 56,
    anchorY: 104,
  },
  roll: {
    key: 'roll',
    file: '/assets/elf_ariel/roll.png',
    frameWidth: 98,
    frameHeight: 106,
    frameCount: 6,
    fps: 12,
    loop: true,
    anchorX: 54,
    anchorY: 102,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/elf_ariel/knockdown.png',
    frameWidth: 122,
    frameHeight: 98,
    frameCount: 6,
    fps: 10,
    loop: false,
    anchorX: 38,
    anchorY: 94,
  },
  getup: {
    key: 'getup',
    file: '/assets/elf_ariel/getup.png',
    frameWidth: 138,
    frameHeight: 118,
    frameCount: 6,
    fps: 10,
    loop: false,
    anchorX: 54,
    anchorY: 114,
  },
  punch: {
    key: 'punch',
    file: '/assets/elf_ariel/punch.png',
    frameWidth: 112,
    frameHeight: 104,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 54,
    anchorY: 100,
  },
  kick: {
    key: 'kick',
    file: '/assets/elf_ariel/kick.png',
    frameWidth: 100,
    frameHeight: 102,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 50,
    anchorY: 98,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/elf_ariel/heavy_punch.png',
    frameWidth: 122,
    frameHeight: 112,
    frameCount: 6,
    fps: 12,
    loop: false,
    anchorX: 64,
    anchorY: 108,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/elf_ariel/heavy_kick.png',
    frameWidth: 164,
    frameHeight: 120,
    frameCount: 6,
    fps: 12,
    loop: false,
    anchorX: 61,
    anchorY: 115,
  },
  grab: {
    key: 'grab',
    file: '/assets/elf_ariel/grab.png',
    frameWidth: 114,
    frameHeight: 106,
    frameCount: 8,
    fps: 12,
    loop: false,
    anchorX: 63,
    anchorY: 102,
  },
  throw: {
    key: 'throw',
    file: '/assets/elf_ariel/throw.png',
    frameWidth: 168,
    frameHeight: 120,
    frameCount: 8,
    fps: 12,
    loop: false,
    anchorX: 64,
    anchorY: 115,
  },
  special_flamejante: {
    key: 'special_flamejante',
    file: '/assets/elf_ariel/special_flamejante.png',
    frameWidth: 112,
    frameHeight: 114,
    frameCount: 10,
    fps: 15,
    loop: false,
    anchorX: 45,
    anchorY: 110,
  },
  special_congelante: {
    key: 'special_congelante',
    file: '/assets/elf_ariel/special_congelante.png',
    frameWidth: 164,
    frameHeight: 120,
    frameCount: 10,
    fps: 15,
    loop: false,
    anchorX: 72,
    anchorY: 115,
  },
  special_chuva: {
    key: 'special_chuva',
    file: '/assets/elf_ariel/special_chuva.png',
    frameWidth: 146,
    frameHeight: 128,
    frameCount: 12,
    fps: 15,
    loop: false,
    anchorX: 79,
    anchorY: 124,
  },
  special_arcana: {
    key: 'special_arcana',
    file: '/assets/elf_ariel/special_arcana.png',
    frameWidth: 298,
    frameHeight: 120,
    frameCount: 12,
    fps: 15,
    loop: false,
    anchorX: 71,
    anchorY: 116,
  },
  finisher: {
    key: 'finisher',
    file: '/assets/elf_ariel/finisher.png',
    frameWidth: 206,
    frameHeight: 124,
    frameCount: 10,
    fps: 10,
    loop: false,
    anchorX: 75,
    anchorY: 120,
  },
  victory: {
    key: 'victory',
    file: '/assets/elf_ariel/victory.png',
    frameWidth: 118,
    frameHeight: 118,
    frameCount: 5,
    fps: 10,
    loop: false,
    anchorX: 56,
    anchorY: 114,
  },
};

export function mapActionToElfSequence(action: FighterAction): ElfSequenceKey {
  switch (action) {
    case 'idle':
      return 'idle';
    case 'walk':
      return 'walk';
    case 'run':
      return 'run';
    case 'jump':
      return 'jump';
    case 'crouch':
      return 'crouch';
    case 'standup':
      return 'standup';
    case 'block':
      return 'block';
    case 'roll':
      return 'roll';
    case 'punch':
      return 'punch';
    case 'kick':
      return 'kick';
    case 'heavy_punch':
    case 'crouch_punch':
      return 'heavy_punch';
    case 'heavy_kick':
    case 'crouch_kick':
      return 'heavy_kick';
    case 'air_kick':
      return 'kick';
    case 'grab_attempt':
      return 'grab';
    case 'grab_throw':
      return 'throw';
    case 'special1':
      return 'special_flamejante';
    case 'special2':
      return 'special_congelante';
    case 'special3':
      return 'special_chuva';
    case 'special4':
      return 'special_arcana';
    case 'hitstun':
    case 'grabbed':
    case 'knockdown':
    case 'ko':
      return 'knockdown';
    case 'getup':
      return 'getup';
    case 'victory':
      return 'victory';
    default:
      return 'idle';
  }
}

export interface ResolvedElfFrame {
  sequence: ElfSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveElfFrame(f: FighterState, globalTime = 0): ResolvedElfFrame {
  const seqKey = mapActionToElfSequence(f.action);
  const seq = ELF_SEQUENCES[seqKey];

  let phase: ResolvedElfFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  const alpha = 1;

  if (f.action === 'jump') {
    // Map vertical velocity across all 8 jump frames: takeoff -> ascent -> apex -> descent -> landing prep
    if (f.vy < -230) frameIndex = 0;
    else if (f.vy < -140) frameIndex = 1;
    else if (f.vy < -60) frameIndex = 2;
    else if (f.vy <= 20) frameIndex = 3;
    else if (f.vy <= 95) frameIndex = 4;
    else if (f.vy <= 170) frameIndex = 5;
    else if (f.vy <= 240) frameIndex = 6;
    else frameIndex = 7;
  } else if (f.action === 'hitstun' || f.action === 'grabbed') {
    frameIndex = 0;
  } else if (f.action === 'ko') {
    frameIndex = seq.frameCount - 1;
  } else if (f.action === 'walk' || f.action === 'run') {
    frameIndex = Math.floor(Math.max(0, f.actionTime) * seq.fps) % seq.frameCount;
  } else if (f.action === 'idle') {
    const t = Math.max(0, globalTime + f.slot * 0.25);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'victory') {
    const rawIdx = Math.floor(Math.max(0, f.actionTime) * seq.fps);
    frameIndex = Math.min(seq.frameCount - 1, rawIdx);
  } else if (seq.loop) {
    frameIndex = Math.floor(Math.max(0, f.actionTime) * seq.fps) % seq.frameCount;
  } else if (f.actionDuration > 0 && f.currentMove) {
    const progress = Math.max(0, Math.min(0.9999, f.actionTime / f.actionDuration));
    const durationIdx = Math.floor(progress * seq.frameCount);
    const fpsIdx = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
    frameIndex = Math.min(seq.frameCount - 1, Math.max(fpsIdx, durationIdx));
  } else {
    frameIndex = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
  }

  return {
    sequence: seq,
    frameIndex,
    alpha,
    phase,
  };
}
