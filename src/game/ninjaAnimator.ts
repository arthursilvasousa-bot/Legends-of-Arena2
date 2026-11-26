import { FighterAction, FighterState } from './types';

export type NinjaSequenceKey =
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
  | 'special_lamina'
  | 'special_teletransporte'
  | 'special_shurikens'
  | 'special_corte'
  | 'finisher'
  | 'victory';

export interface NinjaSequenceMeta {
  key: NinjaSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

export const NINJA_RENDER_SCALE = 0.62;

// Configurable animation speeds & frame metadata matching /public/assets/ninja_pedro/manifest.json
export const NINJA_SEQUENCES: Record<NinjaSequenceKey, NinjaSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/ninja_pedro/idle.png',
    frameWidth: 64,
    frameHeight: 116,
    frameCount: 4,
    fps: 8,
    loop: true,
    anchorX: 30,
    anchorY: 111,
  },
  walk: {
    key: 'walk',
    file: '/assets/ninja_pedro/walk.png',
    frameWidth: 82,
    frameHeight: 116,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 51,
    anchorY: 111,
  },
  run: {
    key: 'run',
    file: '/assets/ninja_pedro/run.png',
    frameWidth: 98,
    frameHeight: 116,
    frameCount: 4,
    fps: 16,
    loop: true,
    anchorX: 63,
    anchorY: 112,
  },
  jump: {
    key: 'jump',
    file: '/assets/ninja_pedro/jump.png',
    frameWidth: 60,
    frameHeight: 108,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 27,
    anchorY: 102,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/ninja_pedro/crouch.png',
    frameWidth: 68,
    frameHeight: 94,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 35,
    anchorY: 89,
  },
  standup: {
    key: 'standup',
    file: '/assets/ninja_pedro/standup.png',
    frameWidth: 64,
    frameHeight: 98,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 33,
    anchorY: 93,
  },
  block: {
    key: 'block',
    file: '/assets/ninja_pedro/block.png',
    frameWidth: 58,
    frameHeight: 94,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 28,
    anchorY: 89,
  },
  roll: {
    key: 'roll',
    file: '/assets/ninja_pedro/roll.png',
    frameWidth: 86,
    frameHeight: 98,
    frameCount: 2,
    fps: 12,
    loop: true,
    anchorX: 57,
    anchorY: 86,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/ninja_pedro/knockdown.png',
    frameWidth: 118,
    frameHeight: 68,
    frameCount: 2,
    fps: 10,
    loop: false,
    anchorX: 63,
    anchorY: 64,
  },
  getup: {
    key: 'getup',
    file: '/assets/ninja_pedro/getup.png',
    frameWidth: 62,
    frameHeight: 76,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 35,
    anchorY: 71,
  },
  punch: {
    key: 'punch',
    file: '/assets/ninja_pedro/punch.png',
    frameWidth: 86,
    frameHeight: 100,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 32,
    anchorY: 92,
  },
  kick: {
    key: 'kick',
    file: '/assets/ninja_pedro/kick.png',
    frameWidth: 112,
    frameHeight: 106,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 64,
    anchorY: 99,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/ninja_pedro/heavy_punch.png',
    frameWidth: 78,
    frameHeight: 100,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 42,
    anchorY: 94,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/ninja_pedro/heavy_kick.png',
    frameWidth: 92,
    frameHeight: 104,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 31,
    anchorY: 97,
  },
  grab: {
    key: 'grab',
    file: '/assets/ninja_pedro/grab.png',
    frameWidth: 82,
    frameHeight: 96,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 51,
    anchorY: 90,
  },
  throw: {
    key: 'throw',
    file: '/assets/ninja_pedro/throw.png',
    frameWidth: 96,
    frameHeight: 100,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 63,
    anchorY: 94,
  },
  special_lamina: {
    key: 'special_lamina',
    file: '/assets/ninja_pedro/special_lamina.png',
    frameWidth: 192,
    frameHeight: 88,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 53,
    anchorY: 84,
  },
  special_teletransporte: {
    key: 'special_teletransporte',
    file: '/assets/ninja_pedro/special_teletransporte.png',
    frameWidth: 110,
    frameHeight: 102,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 54,
    anchorY: 95,
  },
  special_shurikens: {
    key: 'special_shurikens',
    file: '/assets/ninja_pedro/special_shurikens.png',
    frameWidth: 112,
    frameHeight: 94,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 62,
    anchorY: 88,
  },
  special_corte: {
    key: 'special_corte',
    file: '/assets/ninja_pedro/special_corte.png',
    frameWidth: 94,
    frameHeight: 110,
    frameCount: 10,
    fps: 16,
    loop: false,
    anchorX: 49,
    anchorY: 102,
  },
  finisher: {
    key: 'finisher',
    file: '/assets/ninja_pedro/finisher.png',
    frameWidth: 188,
    frameHeight: 156,
    frameCount: 6,
    fps: 10,
    loop: false,
    anchorX: 82,
    anchorY: 148,
  },
  victory: {
    key: 'victory',
    file: '/assets/ninja_pedro/victory.png',
    frameWidth: 186,
    frameHeight: 154,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 81,
    anchorY: 146,
  },
};

export function mapActionToNinjaSequence(action: FighterAction): NinjaSequenceKey {
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
      return 'special_lamina';
    case 'special2':
      return 'special_teletransporte';
    case 'special3':
      return 'special_shurikens';
    case 'special4':
      return 'special_corte';
    case 'hitstun':
    case 'grabbed':
      return 'knockdown';
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

export interface ResolvedNinjaFrame {
  sequence: NinjaSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveNinjaFrame(f: FighterState, globalTime = 0): ResolvedNinjaFrame {
  const seqKey = mapActionToNinjaSequence(f.action);
  const seq = NINJA_SEQUENCES[seqKey];

  let phase: ResolvedNinjaFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  let alpha = 1;

  if (f.action === 'jump') {
    // Map jump frames to vertical velocity: rising -> apex flip -> descent
    if (f.vy < -55) frameIndex = 0;
    else if (f.vy <= 70) frameIndex = 1;
    else frameIndex = 2;
  } else if (f.action === 'hitstun' || f.action === 'grabbed') {
    frameIndex = 0;
  } else if (f.action === 'ko') {
    frameIndex = seq.frameCount - 1;
  } else if (f.action === 'walk' || f.action === 'run') {
    // Synchronize stride animation with movement & configured FPS
    const t = Math.max(0, f.actionTime);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'idle') {
    const t = Math.max(0, globalTime + f.slot * 0.25);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'victory') {
    // Play unique win-pose strip once and hold final frame
    const rawIdx = Math.floor(Math.max(0, f.actionTime) * seq.fps);
    frameIndex = Math.min(seq.frameCount - 1, rawIdx);
    if (seq.key === 'finisher' && frameIndex === 4) {
      alpha = 0.88;
    }
  } else if (seq.loop) {
    frameIndex = Math.floor(Math.max(0, f.actionTime) * seq.fps) % seq.frameCount;
  } else if (f.actionDuration > 0 && f.currentMove) {
    // Sync non-looping attacks across startup -> active -> recovery cleanly
    const progress = Math.max(0, Math.min(0.9999, f.actionTime / f.actionDuration));
    const durationIdx = Math.floor(progress * seq.frameCount);
    const fpsIdx = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
    // Prefer fps pacing unless move finishes earlier or slower
    frameIndex = Math.max(fpsIdx, durationIdx);
    frameIndex = Math.min(seq.frameCount - 1, frameIndex);
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
