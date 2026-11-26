import { FighterAction, FighterState } from './types';

export type NecromancerSequenceKey =
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
  | 'special_dark_sphere'
  | 'special_underworld_hands'
  | 'special_spectral_army'
  | 'special_shadow_teleport'
  | 'finisher'
  | 'victory';

export interface NecromancerSequenceMeta {
  key: NecromancerSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

// Calibrated to Ninja Pedro's rendered height (~66px standing)
export const NECROMANCER_RENDER_SCALE = 0.6;

// Animation speeds & frame metadata matching /public/assets/necromancer_lucas/manifest.json
export const NECROMANCER_SEQUENCES: Record<NecromancerSequenceKey, NecromancerSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/necromancer_lucas/idle.png',
    frameWidth: 102,
    frameHeight: 118,
    frameCount: 4,
    fps: 6,
    loop: true,
    anchorX: 65,
    anchorY: 114,
  },
  walk: {
    key: 'walk',
    file: '/assets/necromancer_lucas/walk.png',
    frameWidth: 90,
    frameHeight: 114,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 56,
    anchorY: 110,
  },
  run: {
    key: 'run',
    file: '/assets/necromancer_lucas/run.png',
    frameWidth: 110,
    frameHeight: 120,
    frameCount: 3,
    fps: 16,
    loop: true,
    anchorX: 69,
    anchorY: 116,
  },
  jump: {
    key: 'jump',
    file: '/assets/necromancer_lucas/jump.png',
    frameWidth: 112,
    frameHeight: 132,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 58,
    anchorY: 129,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/necromancer_lucas/crouch.png',
    frameWidth: 92,
    frameHeight: 88,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 63,
    anchorY: 84,
  },
  standup: {
    key: 'standup',
    file: '/assets/necromancer_lucas/standup.png',
    frameWidth: 80,
    frameHeight: 104,
    frameCount: 2,
    fps: 10,
    loop: false,
    anchorX: 42,
    anchorY: 101,
  },
  block: {
    key: 'block',
    file: '/assets/necromancer_lucas/block.png',
    frameWidth: 128,
    frameHeight: 110,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 61,
    anchorY: 106,
  },
  roll: {
    key: 'roll',
    file: '/assets/necromancer_lucas/roll.png',
    frameWidth: 96,
    frameHeight: 100,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 59,
    anchorY: 96,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/necromancer_lucas/knockdown.png',
    frameWidth: 118,
    frameHeight: 74,
    frameCount: 3,
    fps: 8,
    loop: false,
    anchorX: 70,
    anchorY: 69,
  },
  getup: {
    key: 'getup',
    file: '/assets/necromancer_lucas/getup.png',
    frameWidth: 108,
    frameHeight: 104,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 58,
    anchorY: 100,
  },
  punch: {
    key: 'punch',
    file: '/assets/necromancer_lucas/punch.png',
    frameWidth: 98,
    frameHeight: 106,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 60,
    anchorY: 102,
  },
  kick: {
    key: 'kick',
    file: '/assets/necromancer_lucas/kick.png',
    frameWidth: 98,
    frameHeight: 110,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 58,
    anchorY: 106,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/necromancer_lucas/heavy_punch.png',
    frameWidth: 106,
    frameHeight: 124,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 55,
    anchorY: 120,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/necromancer_lucas/heavy_kick.png',
    frameWidth: 126,
    frameHeight: 108,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 64,
    anchorY: 104,
  },
  staff_attack: {
    key: 'staff_attack',
    file: '/assets/necromancer_lucas/staff_attack.png',
    frameWidth: 108,
    frameHeight: 112,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 67,
    anchorY: 109,
  },
  staff_slam: {
    key: 'staff_slam',
    file: '/assets/necromancer_lucas/staff_slam.png',
    frameWidth: 130,
    frameHeight: 118,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 72,
    anchorY: 114,
  },
  grab: {
    key: 'grab',
    file: '/assets/necromancer_lucas/grab.png',
    frameWidth: 118,
    frameHeight: 112,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 58,
    anchorY: 108,
  },
  throw: {
    key: 'throw',
    file: '/assets/necromancer_lucas/throw.png',
    frameWidth: 118,
    frameHeight: 110,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 58,
    anchorY: 106,
  },
  special_dark_sphere: {
    key: 'special_dark_sphere',
    file: '/assets/necromancer_lucas/special_dark_sphere.png',
    frameWidth: 106,
    frameHeight: 114,
    frameCount: 6,
    fps: 15,
    loop: false,
    anchorX: 57,
    anchorY: 110,
  },
  special_underworld_hands: {
    key: 'special_underworld_hands',
    file: '/assets/necromancer_lucas/special_underworld_hands.png',
    frameWidth: 124,
    frameHeight: 110,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 65,
    anchorY: 106,
  },
  special_spectral_army: {
    key: 'special_spectral_army',
    file: '/assets/necromancer_lucas/special_spectral_army.png',
    frameWidth: 80,
    frameHeight: 108,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 55,
    anchorY: 104,
  },
  special_shadow_teleport: {
    key: 'special_shadow_teleport',
    file: '/assets/necromancer_lucas/special_shadow_teleport.png',
    frameWidth: 146,
    frameHeight: 110,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 69,
    anchorY: 105,
  },
  finisher: {
    key: 'finisher',
    file: '/assets/necromancer_lucas/finisher.png',
    frameWidth: 150,
    frameHeight: 150,
    frameCount: 10,
    fps: 10,
    loop: false,
    anchorX: 89,
    anchorY: 146,
  },
  victory: {
    key: 'victory',
    file: '/assets/necromancer_lucas/victory.png',
    frameWidth: 108,
    frameHeight: 150,
    frameCount: 7,
    fps: 10,
    loop: false,
    anchorX: 50,
    anchorY: 146,
  },
};

export function mapActionToNecromancerSequence(action: FighterAction): NecromancerSequenceKey {
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
      return 'special_dark_sphere';
    case 'special2':
      return 'special_underworld_hands';
    case 'special3':
      return 'special_spectral_army';
    case 'special4':
      return 'special_shadow_teleport';
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

export interface ResolvedNecromancerFrame {
  sequence: NecromancerSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveNecromancerFrame(f: FighterState, globalTime = 0): ResolvedNecromancerFrame {
  const seqKey = mapActionToNecromancerSequence(f.action);
  const seq = NECROMANCER_SEQUENCES[seqKey];

  let phase: ResolvedNecromancerFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  const alpha = 1;

  if (f.action === 'jump') {
    frameIndex = f.vy <= 35 ? 0 : 1;
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
