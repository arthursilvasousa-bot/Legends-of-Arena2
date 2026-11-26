import { FighterAction, FighterState } from './types';

export type PriestSequenceKey =
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
  | 'staff_attack'
  | 'staff_slam'
  | 'grab'
  | 'throw'
  | 'special_holy_beam'
  | 'special_holy_shield'
  | 'special_celestial_hammer'
  | 'special_holy_explosion'
  | 'finisher'
  | 'victory';

export interface PriestSequenceMeta {
  key: PriestSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

export const PRIEST_RENDER_SCALE = 0.76;

// Configurable animation speeds & frame metadata matching /public/assets/priest_guilherme/manifest.json
export const PRIEST_SEQUENCES: Record<PriestSequenceKey, PriestSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/priest_guilherme/idle.png',
    frameWidth: 70,
    frameHeight: 98,
    frameCount: 4,
    fps: 8,
    loop: true,
    anchorX: 40,
    anchorY: 95,
  },
  walk: {
    key: 'walk',
    file: '/assets/priest_guilherme/walk.png',
    frameWidth: 78,
    frameHeight: 96,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 45,
    anchorY: 93,
  },
  run: {
    key: 'run',
    file: '/assets/priest_guilherme/run.png',
    frameWidth: 96,
    frameHeight: 94,
    frameCount: 4,
    fps: 16,
    loop: true,
    anchorX: 53,
    anchorY: 91,
  },
  jump: {
    key: 'jump',
    file: '/assets/priest_guilherme/jump.png',
    frameWidth: 62,
    frameHeight: 100,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 33,
    anchorY: 96,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/priest_guilherme/crouch.png',
    frameWidth: 60,
    frameHeight: 70,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 31,
    anchorY: 67,
  },
  standup: {
    key: 'standup',
    file: '/assets/priest_guilherme/standup.png',
    frameWidth: 62,
    frameHeight: 84,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 35,
    anchorY: 81,
  },
  block: {
    key: 'block',
    file: '/assets/priest_guilherme/block.png',
    frameWidth: 66,
    frameHeight: 86,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 43,
    anchorY: 83,
  },
  roll: {
    key: 'roll',
    file: '/assets/priest_guilherme/roll.png',
    frameWidth: 76,
    frameHeight: 78,
    frameCount: 3,
    fps: 12,
    loop: true,
    anchorX: 41,
    anchorY: 75,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/priest_guilherme/knockdown.png',
    frameWidth: 86,
    frameHeight: 72,
    frameCount: 2,
    fps: 10,
    loop: false,
    anchorX: 24,
    anchorY: 69,
  },
  getup: {
    key: 'getup',
    file: '/assets/priest_guilherme/getup.png',
    frameWidth: 56,
    frameHeight: 82,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 33,
    anchorY: 79,
  },
  punch: {
    key: 'punch',
    file: '/assets/priest_guilherme/punch.png',
    frameWidth: 78,
    frameHeight: 80,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 40,
    anchorY: 77,
  },
  kick: {
    key: 'kick',
    file: '/assets/priest_guilherme/kick.png',
    frameWidth: 84,
    frameHeight: 82,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 36,
    anchorY: 79,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/priest_guilherme/heavy_punch.png',
    frameWidth: 80,
    frameHeight: 80,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 40,
    anchorY: 77,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/priest_guilherme/heavy_kick.png',
    frameWidth: 90,
    frameHeight: 88,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 38,
    anchorY: 85,
  },
  staff_attack: {
    key: 'staff_attack',
    file: '/assets/priest_guilherme/staff_attack.png',
    frameWidth: 100,
    frameHeight: 80,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 60,
    anchorY: 77,
  },
  staff_slam: {
    key: 'staff_slam',
    file: '/assets/priest_guilherme/staff_slam.png',
    frameWidth: 100,
    frameHeight: 96,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 50,
    anchorY: 93,
  },
  grab: {
    key: 'grab',
    file: '/assets/priest_guilherme/grab.png',
    frameWidth: 88,
    frameHeight: 76,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 56,
    anchorY: 73,
  },
  throw: {
    key: 'throw',
    file: '/assets/priest_guilherme/throw.png',
    frameWidth: 92,
    frameHeight: 78,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 52,
    anchorY: 75,
  },
  special_holy_beam: {
    key: 'special_holy_beam',
    file: '/assets/priest_guilherme/special_holy_beam.png',
    frameWidth: 172,
    frameHeight: 84,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 40,
    anchorY: 81,
  },
  special_holy_shield: {
    key: 'special_holy_shield',
    file: '/assets/priest_guilherme/special_holy_shield.png',
    frameWidth: 108,
    frameHeight: 82,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 38,
    anchorY: 79,
  },
  special_celestial_hammer: {
    key: 'special_celestial_hammer',
    file: '/assets/priest_guilherme/special_celestial_hammer.png',
    frameWidth: 148,
    frameHeight: 104,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 56,
    anchorY: 100,
  },
  special_holy_explosion: {
    key: 'special_holy_explosion',
    file: '/assets/priest_guilherme/special_holy_explosion.png',
    frameWidth: 148,
    frameHeight: 108,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 74,
    anchorY: 104,
  },
  finisher: {
    key: 'finisher',
    file: '/assets/priest_guilherme/finisher.png',
    frameWidth: 176,
    frameHeight: 116,
    frameCount: 11,
    fps: 10,
    loop: false,
    anchorX: 80,
    anchorY: 113,
  },
  victory: {
    key: 'victory',
    file: '/assets/priest_guilherme/victory.png',
    frameWidth: 128,
    frameHeight: 112,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 72,
    anchorY: 109,
  },
};

export function mapActionToPriestSequence(action: FighterAction): PriestSequenceKey {
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
      return 'heavy_punch';
    case 'heavy_kick':
      return 'heavy_kick';
    case 'crouch_punch':
      return 'staff_attack';
    case 'crouch_kick':
      return 'staff_slam';
    case 'air_kick':
      return 'kick';
    case 'grab_attempt':
      return 'grab';
    case 'grab_throw':
      return 'throw';
    case 'special1':
      return 'special_holy_beam';
    case 'special2':
      return 'special_holy_shield';
    case 'special3':
      return 'special_celestial_hammer';
    case 'special4':
      return 'special_holy_explosion';
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

export interface ResolvedPriestFrame {
  sequence: PriestSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolvePriestFrame(f: FighterState, globalTime = 0): ResolvedPriestFrame {
  const seqKey = mapActionToPriestSequence(f.action);
  const seq = PRIEST_SEQUENCES[seqKey];

  let phase: ResolvedPriestFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  const alpha = 1;

  if (f.action === 'jump') {
    // Map jump frames to vertical velocity: rising -> apex -> descent
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
