import { FighterAction, FighterState } from './types';

export type TeslaSequenceKey =
  | 'tesla_idle'
  | 'tesla_walk_forward'
  | 'tesla_walk_backward'
  | 'tesla_run_forward'
  | 'tesla_run_backward'
  | 'tesla_jump'
  | 'tesla_jab'
  | 'tesla_heavy_punch'
  | 'tesla_front_kick'
  | 'tesla_high_kick'
  | 'tesla_block'
  | 'tesla_low_block'
  | 'tesla_crouch'
  | 'tesla_standup'
  | 'tesla_roll'
  | 'tesla_damage'
  | 'tesla_knockdown'
  | 'tesla_getup'
  | 'tesla_grab'
  | 'tesla_throw'
  | 'tesla_victory'
  | 'tesla_guard_gold'
  | 'tesla_special1_charge'
  | 'tesla_special2_teleport'
  | 'tesla_special2_punch'
  | 'tesla_special3_charge'
  | 'tesla_special4_charge'
  | 'tesla_special4_end';

export interface TeslaSequenceMeta {
  key: TeslaSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

// Calibrated to match existing standing fighter heights (~74-75px on the 480x270 stage)
export const TESLA_RENDER_SCALE = 0.46;

// Exact victory quote for Nikola Tesla
export const TESLA_VICTORY_QUOTE = '“Mágica? Não, odeio essa palavra, isso é ciência!”';

// Animation speeds & frame metadata matching /public/assets/tesla/manifest.json
export const TESLA_SEQUENCES: Record<TeslaSequenceKey, TeslaSequenceMeta> = {
  tesla_idle: {
    key: 'tesla_idle',
    file: '/assets/tesla/animations/tesla_idle.png',
    frameWidth: 106,
    frameHeight: 164,
    frameCount: 4,
    fps: 8,
    loop: true,
    anchorX: 54,
    anchorY: 160,
  },
  tesla_walk_forward: {
    key: 'tesla_walk_forward',
    file: '/assets/tesla/animations/tesla_walk_forward.png',
    frameWidth: 118,
    frameHeight: 154,
    frameCount: 6,
    fps: 12,
    loop: true,
    anchorX: 61,
    anchorY: 151,
  },
  tesla_walk_backward: {
    key: 'tesla_walk_backward',
    file: '/assets/tesla/animations/tesla_walk_backward.png',
    frameWidth: 86,
    frameHeight: 152,
    frameCount: 6,
    fps: 12,
    loop: true,
    anchorX: 45,
    anchorY: 149,
  },
  tesla_run_forward: {
    key: 'tesla_run_forward',
    file: '/assets/tesla/animations/tesla_run_forward.png',
    frameWidth: 116,
    frameHeight: 134,
    frameCount: 7,
    fps: 16,
    loop: true,
    anchorX: 57,
    anchorY: 129,
  },
  tesla_run_backward: {
    key: 'tesla_run_backward',
    file: '/assets/tesla/animations/tesla_run_backward.png',
    frameWidth: 94,
    frameHeight: 134,
    frameCount: 5,
    fps: 16,
    loop: true,
    anchorX: 44,
    anchorY: 130,
  },
  tesla_jump: {
    key: 'tesla_jump',
    file: '/assets/tesla/animations/tesla_jump.png',
    frameWidth: 112,
    frameHeight: 130,
    frameCount: 5,
    fps: 12,
    loop: false,
    anchorX: 55,
    anchorY: 126,
  },
  tesla_jab: {
    key: 'tesla_jab',
    file: '/assets/tesla/animations/tesla_jab.png',
    frameWidth: 120,
    frameHeight: 128,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 59,
    anchorY: 124,
  },
  tesla_heavy_punch: {
    key: 'tesla_heavy_punch',
    file: '/assets/tesla/animations/tesla_heavy_punch.png',
    frameWidth: 106,
    frameHeight: 128,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 63,
    anchorY: 124,
  },
  tesla_front_kick: {
    key: 'tesla_front_kick',
    file: '/assets/tesla/animations/tesla_front_kick.png',
    frameWidth: 110,
    frameHeight: 130,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 37,
    anchorY: 126,
  },
  tesla_high_kick: {
    key: 'tesla_high_kick',
    file: '/assets/tesla/animations/tesla_high_kick.png',
    frameWidth: 102,
    frameHeight: 130,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 33,
    anchorY: 126,
  },
  tesla_block: {
    key: 'tesla_block',
    file: '/assets/tesla/animations/tesla_block.png',
    frameWidth: 96,
    frameHeight: 136,
    frameCount: 4,
    fps: 10,
    loop: true,
    anchorX: 52,
    anchorY: 133,
  },
  tesla_low_block: {
    key: 'tesla_low_block',
    file: '/assets/tesla/animations/tesla_low_block.png',
    frameWidth: 108,
    frameHeight: 116,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 67,
    anchorY: 113,
  },
  tesla_crouch: {
    key: 'tesla_crouch',
    file: '/assets/tesla/animations/tesla_crouch.png',
    frameWidth: 108,
    frameHeight: 106,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 58,
    anchorY: 103,
  },
  tesla_standup: {
    key: 'tesla_standup',
    file: '/assets/tesla/animations/tesla_standup.png',
    frameWidth: 100,
    frameHeight: 162,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 50,
    anchorY: 159,
  },
  tesla_roll: {
    key: 'tesla_roll',
    file: '/assets/tesla/animations/tesla_roll.png',
    frameWidth: 108,
    frameHeight: 114,
    frameCount: 3,
    fps: 15,
    loop: true,
    anchorX: 50,
    anchorY: 110,
  },
  tesla_damage: {
    key: 'tesla_damage',
    file: '/assets/tesla/animations/tesla_damage.png',
    frameWidth: 92,
    frameHeight: 146,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 48,
    anchorY: 142,
  },
  tesla_knockdown: {
    key: 'tesla_knockdown',
    file: '/assets/tesla/animations/tesla_knockdown.png',
    frameWidth: 100,
    frameHeight: 132,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 50,
    anchorY: 129,
  },
  tesla_getup: {
    key: 'tesla_getup',
    file: '/assets/tesla/animations/tesla_getup.png',
    frameWidth: 106,
    frameHeight: 162,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 58,
    anchorY: 159,
  },
  tesla_grab: {
    key: 'tesla_grab',
    file: '/assets/tesla/animations/tesla_grab.png',
    frameWidth: 120,
    frameHeight: 122,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 59,
    anchorY: 119,
  },
  tesla_throw: {
    key: 'tesla_throw',
    file: '/assets/tesla/animations/tesla_throw.png',
    frameWidth: 86,
    frameHeight: 116,
    frameCount: 2,
    fps: 14,
    loop: false,
    anchorX: 50,
    anchorY: 112,
  },
  tesla_victory: {
    key: 'tesla_victory',
    file: '/assets/tesla/animations/tesla_victory.png',
    frameWidth: 140,
    frameHeight: 146,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 67,
    anchorY: 143,
  },
  tesla_guard_gold: {
    key: 'tesla_guard_gold',
    file: '/assets/tesla/animations/tesla_guard_gold.png',
    frameWidth: 354,
    frameHeight: 432,
    frameCount: 8,
    fps: 10,
    loop: true,
    anchorX: 152,
    anchorY: 428,
  },
  tesla_special1_charge: {
    key: 'tesla_special1_charge',
    file: '/assets/tesla/animations/tesla_special1_charge.png',
    frameWidth: 120,
    frameHeight: 160,
    frameCount: 7,
    fps: 15,
    loop: false,
    anchorX: 56,
    anchorY: 153,
  },
  tesla_special2_teleport: {
    key: 'tesla_special2_teleport',
    file: '/assets/tesla/animations/tesla_special2_teleport.png',
    frameWidth: 134,
    frameHeight: 152,
    frameCount: 7,
    fps: 18,
    loop: false,
    anchorX: 72,
    anchorY: 142,
  },
  tesla_special2_punch: {
    key: 'tesla_special2_punch',
    file: '/assets/tesla/animations/tesla_special2_punch.png',
    frameWidth: 164,
    frameHeight: 156,
    frameCount: 2,
    fps: 18,
    loop: false,
    anchorX: 102,
    anchorY: 151,
  },
  tesla_special3_charge: {
    key: 'tesla_special3_charge',
    file: '/assets/tesla/animations/tesla_special3_charge.png',
    frameWidth: 172,
    frameHeight: 156,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 61,
    anchorY: 151,
  },
  tesla_special4_charge: {
    key: 'tesla_special4_charge',
    file: '/assets/tesla/animations/tesla_special4_charge.png',
    frameWidth: 122,
    frameHeight: 152,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 53,
    anchorY: 146,
  },
  tesla_special4_end: {
    key: 'tesla_special4_end',
    file: '/assets/tesla/animations/tesla_special4_end.png',
    frameWidth: 88,
    frameHeight: 132,
    frameCount: 1,
    fps: 12,
    loop: false,
    anchorX: 31,
    anchorY: 128,
  },
};

export function mapActionToTeslaSequence(
  action: FighterAction,
  isBackward = false,
  isLowBlock = false
): TeslaSequenceKey {
  switch (action) {
    case 'walk':
      return isBackward ? 'tesla_walk_backward' : 'tesla_walk_forward';
    case 'run':
      return isBackward ? 'tesla_run_backward' : 'tesla_run_forward';
    case 'jump':
      return 'tesla_jump';
    case 'crouch':
      return 'tesla_crouch';
    case 'standup':
      return 'tesla_standup';
    case 'block':
      return isLowBlock ? 'tesla_low_block' : 'tesla_block';
    case 'roll':
      return 'tesla_roll';
    case 'punch':
      return 'tesla_jab';
    case 'heavy_punch':
    case 'crouch_punch':
      return 'tesla_heavy_punch';
    case 'kick':
    case 'air_kick':
      return 'tesla_front_kick';
    case 'heavy_kick':
    case 'crouch_kick':
      return 'tesla_high_kick';
    case 'grab_attempt':
      return 'tesla_grab';
    case 'grab_throw':
      return 'tesla_throw';
    case 'special1':
      return 'tesla_special1_charge';
    case 'special2':
      return 'tesla_special2_teleport';
    case 'special3':
      return 'tesla_special3_charge';
    case 'special4':
      return 'tesla_special4_charge';
    case 'hitstun':
    case 'grabbed':
    case 'stun':
      return 'tesla_damage';
    case 'knockdown':
    case 'ko':
      return 'tesla_knockdown';
    case 'getup':
      return 'tesla_getup';
    case 'victory':
      return 'tesla_victory';
    case 'idle':
    default:
      return 'tesla_idle';
  }
}

export interface ResolvedTeslaFrame {
  sequence: TeslaSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveTeslaFrame(f: FighterState, globalTime = 0): ResolvedTeslaFrame {
  const isBackward = f.vx * f.facing < -1;
  let seqKey = mapActionToTeslaSequence(f.action, isBackward, f.isLowBlock);

  let phase: ResolvedTeslaFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let alpha = 1;
  let frameIndex = 0;

  // Special 2 (Teleporte Elétrico + Soco): startup -> teleport frames 0..6, active/recovery -> heavy electric punch
  if (f.action === 'special2') {
    const startup = Math.max(0.08, f.currentMove?.startup ?? 0.32);
    if (phase === 'startup') {
      seqKey = 'tesla_special2_teleport';
      const seq = TESLA_SEQUENCES[seqKey];
      const prog = Math.max(0, Math.min(0.9999, f.actionTime / startup));
      frameIndex = Math.floor(prog * seq.frameCount);
      if (frameIndex === 5) alpha = 0.72;
      return { sequence: seq, frameIndex, alpha, phase };
    } else {
      seqKey = 'tesla_special2_punch';
      const seq = TESLA_SEQUENCES[seqKey];
      const postDur = Math.max(0.1, (f.actionDuration || 0.7) - startup);
      const postProg = Math.max(0, Math.min(0.9999, (f.actionTime - startup) / postDur));
      frameIndex = postProg < 0.35 ? 0 : 1;
      return { sequence: seq, frameIndex, alpha, phase };
    }
  }

  // Special 4 (Gaiola Elétrica): startup/active -> tesla_special4_charge, recovery tail -> tesla_special4_end
  if (f.action === 'special4') {
    if (phase === 'recovery') {
      const seq = TESLA_SEQUENCES.tesla_special4_end;
      return { sequence: seq, frameIndex: 0, alpha: 1, phase };
    }
    const seq = TESLA_SEQUENCES.tesla_special4_charge;
    const activeEnd = Math.max(0.1, (f.currentMove?.startup ?? 0.22) + (f.currentMove?.active ?? 0.14));
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / activeEnd));
    frameIndex = Math.floor(prog * seq.frameCount);
    return { sequence: seq, frameIndex, alpha: 1, phase };
  }

  const seq = TESLA_SEQUENCES[seqKey];

  if (f.action === 'jump') {
    if (f.vy < -160) frameIndex = 0;
    else if (f.vy < -45) frameIndex = 1;
    else if (f.vy <= 45) frameIndex = 2;
    else if (f.vy <= 145) frameIndex = 3;
    else frameIndex = 4;
  } else if (f.action === 'special1') {
    const dur = Math.max(0.1, f.actionDuration || 0.58);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'special3') {
    // Feixe de Eletricidade: 0..1 startup charge, 2 sustained firing stance throughout beam
    if (phase === 'startup') {
      const startup = Math.max(0.05, f.currentMove?.startup ?? 0.18);
      frameIndex = Math.min(1, Math.floor((f.actionTime / startup) * 2));
    } else {
      frameIndex = 2;
    }
  } else if (f.action === 'hitstun' || f.action === 'grabbed' || f.action === 'stun') {
    const dur = Math.max(0.15, f.actionDuration || 0.35);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'ko') {
    frameIndex = seq.frameCount - 1;
  } else if (f.action === 'walk' || f.action === 'run') {
    frameIndex = Math.floor(Math.max(0, f.actionTime) * seq.fps) % seq.frameCount;
  } else if (f.action === 'block') {
    const rawIdx = Math.floor(Math.max(0, f.actionTime) * seq.fps);
    frameIndex = Math.min(seq.frameCount - 1, rawIdx);
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
