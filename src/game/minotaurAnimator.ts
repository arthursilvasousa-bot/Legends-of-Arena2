import { FighterAction, FighterState } from './types';

export type MinotaurSequenceKey =
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
  | 'special_brutal_rush'
  | 'special_seismic_stomp'
  | 'special_devastating_horn'
  | 'special_coliseum_throw'
  | 'finisher'
  | 'victory';

export interface MinotaurSequenceMeta {
  key: MinotaurSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

// Heavy colossus scale: ~79px standing vs ~66px for Ninja Pedro / Ariel / Guilherme / Lucas
export const MINOTAUR_RENDER_SCALE = 0.88;

// Animation speeds & frame metadata matching /public/assets/minotaur_wallace/manifest.json
export const MINOTAUR_SEQUENCES: Record<MinotaurSequenceKey, MinotaurSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/minotaur_wallace/idle.png',
    frameWidth: 52,
    frameHeight: 90,
    frameCount: 4,
    fps: 7,
    loop: true,
    anchorX: 26,
    anchorY: 86,
  },
  walk: {
    key: 'walk',
    file: '/assets/minotaur_wallace/walk.png',
    frameWidth: 58,
    frameHeight: 88,
    frameCount: 4,
    fps: 10,
    loop: true,
    anchorX: 34,
    anchorY: 85,
  },
  run: {
    key: 'run',
    file: '/assets/minotaur_wallace/run.png',
    frameWidth: 74,
    frameHeight: 90,
    frameCount: 4,
    fps: 14,
    loop: true,
    anchorX: 43,
    anchorY: 86,
  },
  jump: {
    key: 'jump',
    file: '/assets/minotaur_wallace/jump.png',
    frameWidth: 48,
    frameHeight: 84,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 23,
    anchorY: 80,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/minotaur_wallace/crouch.png',
    frameWidth: 50,
    frameHeight: 78,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 26,
    anchorY: 74,
  },
  standup: {
    key: 'standup',
    file: '/assets/minotaur_wallace/standup.png',
    frameWidth: 50,
    frameHeight: 76,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 26,
    anchorY: 72,
  },
  block: {
    key: 'block',
    file: '/assets/minotaur_wallace/block.png',
    frameWidth: 40,
    frameHeight: 76,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 19,
    anchorY: 73,
  },
  roll: {
    key: 'roll',
    file: '/assets/minotaur_wallace/roll.png',
    frameWidth: 52,
    frameHeight: 64,
    frameCount: 2,
    fps: 12,
    loop: true,
    anchorX: 33,
    anchorY: 60,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/minotaur_wallace/knockdown.png',
    frameWidth: 80,
    frameHeight: 50,
    frameCount: 2,
    fps: 8,
    loop: false,
    anchorX: 45,
    anchorY: 47,
  },
  getup: {
    key: 'getup',
    file: '/assets/minotaur_wallace/getup.png',
    frameWidth: 50,
    frameHeight: 64,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 26,
    anchorY: 61,
  },
  punch: {
    key: 'punch',
    file: '/assets/minotaur_wallace/punch.png',
    frameWidth: 88,
    frameHeight: 78,
    frameCount: 3,
    fps: 14,
    loop: false,
    anchorX: 33,
    anchorY: 75,
  },
  kick: {
    key: 'kick',
    file: '/assets/minotaur_wallace/kick.png',
    frameWidth: 78,
    frameHeight: 80,
    frameCount: 3,
    fps: 14,
    loop: false,
    anchorX: 36,
    anchorY: 77,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/minotaur_wallace/heavy_punch.png',
    frameWidth: 74,
    frameHeight: 80,
    frameCount: 3,
    fps: 11,
    loop: false,
    anchorX: 35,
    anchorY: 77,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/minotaur_wallace/heavy_kick.png',
    frameWidth: 70,
    frameHeight: 78,
    frameCount: 3,
    fps: 11,
    loop: false,
    anchorX: 26,
    anchorY: 75,
  },
  grab: {
    key: 'grab',
    file: '/assets/minotaur_wallace/grab.png',
    frameWidth: 64,
    frameHeight: 76,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 40,
    anchorY: 73,
  },
  throw: {
    key: 'throw',
    file: '/assets/minotaur_wallace/throw.png',
    frameWidth: 66,
    frameHeight: 94,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 38,
    anchorY: 91,
  },
  special_brutal_rush: {
    key: 'special_brutal_rush',
    file: '/assets/minotaur_wallace/special_brutal_rush.png',
    frameWidth: 76,
    frameHeight: 88,
    frameCount: 4,
    fps: 14,
    loop: false,
    anchorX: 43,
    anchorY: 85,
  },
  special_seismic_stomp: {
    key: 'special_seismic_stomp',
    file: '/assets/minotaur_wallace/special_seismic_stomp.png',
    frameWidth: 86,
    frameHeight: 84,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 41,
    anchorY: 80,
  },
  special_devastating_horn: {
    key: 'special_devastating_horn',
    file: '/assets/minotaur_wallace/special_devastating_horn.png',
    frameWidth: 88,
    frameHeight: 86,
    frameCount: 3,
    fps: 14,
    loop: false,
    anchorX: 46,
    anchorY: 83,
  },
  special_coliseum_throw: {
    key: 'special_coliseum_throw',
    file: '/assets/minotaur_wallace/special_coliseum_throw.png',
    frameWidth: 84,
    frameHeight: 94,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 42,
    anchorY: 91,
  },
  finisher: {
    key: 'finisher',
    file: '/assets/minotaur_wallace/finisher.png',
    frameWidth: 136,
    frameHeight: 122,
    frameCount: 5,
    fps: 8,
    loop: false,
    anchorX: 67,
    anchorY: 119,
  },
  victory: {
    key: 'victory',
    file: '/assets/minotaur_wallace/victory.png',
    frameWidth: 136,
    frameHeight: 122,
    frameCount: 5,
    fps: 8,
    loop: false,
    anchorX: 67,
    anchorY: 119,
  },
};

export function mapActionToMinotaurSequence(action: FighterAction): MinotaurSequenceKey {
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
      return 'special_coliseum_throw';
    case 'special1':
      return 'special_brutal_rush';
    case 'special2':
      return 'special_seismic_stomp';
    case 'special3':
      return 'special_devastating_horn';
    case 'special4':
      return 'special_coliseum_throw';
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

export interface ResolvedMinotaurFrame {
  sequence: MinotaurSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveMinotaurFrame(f: FighterState, globalTime = 0): ResolvedMinotaurFrame {
  const seqKey = mapActionToMinotaurSequence(f.action);
  const seq = MINOTAUR_SEQUENCES[seqKey];

  let phase: ResolvedMinotaurFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  const alpha = 1;

  if (f.action === 'jump') {
    if (f.vy < -55) frameIndex = 0;
    else if (f.vy <= 70) frameIndex = 1;
    else frameIndex = 2;
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
  } else if (f.actionDuration > 0 && (f.currentMove || f.action === 'grab_throw')) {
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
