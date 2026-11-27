import { FighterAction, FighterState } from './types';

export type JackSequenceKey =
  | 'jack_idle'
  | 'jack_walk'
  | 'jack_run'
  | 'jack_jump'
  | 'jack_crouch'
  | 'jack_standup'
  | 'jack_block'
  | 'jack_dodge'
  | 'jack_hitstun'
  | 'jack_knockdown'
  | 'jack_getup'
  | 'jack_victory'
  | 'jack_punch'
  | 'jack_heavy_punch'
  | 'jack_kick'
  | 'jack_heavy_kick'
  | 'jack_crouch_kick'
  | 'jack_combo'
  | 'jack_special1_knives'
  | 'jack_special2_soul_eye'
  | 'jack_special3_giant_scissors'
  | 'jack_special4_gods_hands';

export interface JackSequenceMeta {
  key: JackSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
  impactFrame: number | null;
}

export const JACK_RENDER_SCALE = 0.485;
export const JACK_MAX_KNIVES = 8;
export const JACK_KNIFE_RECHARGE_SECONDS = 3.0;
export const JACK_BLEED_DURATION = 4.0;
export const JACK_VULNERABLE_DURATION = 4.5;
export const JACK_VULNERABLE_DAMAGE_MULTIPLIER = 1.3;
export const JACK_SOUL_EYE_SLOW_DURATION = 3.2;
export const JACK_VICTORY_QUOTE =
  'A elegância de um corte perfeito é uma arte que poucos sobrevivem para admirar.';

export const JACK_SEQUENCES: Record<JackSequenceKey, JackSequenceMeta> = {
  jack_idle: {
    key: 'jack_idle',
    file: '/assets/jack_estripador/idle/strip.png',
    frameWidth: 122,
    frameHeight: 166,
    frameCount: 4,
    fps: 9,
    loop: true,
    anchorX: 64,
    anchorY: 162,
    impactFrame: null,
  },
  jack_walk: {
    key: 'jack_walk',
    file: '/assets/jack_estripador/walk/strip.png',
    frameWidth: 126,
    frameHeight: 170,
    frameCount: 8,
    fps: 11,
    loop: true,
    anchorX: 64,
    anchorY: 166,
    impactFrame: null,
  },
  jack_run: {
    key: 'jack_run',
    file: '/assets/jack_estripador/run/strip.png',
    frameWidth: 164,
    frameHeight: 164,
    frameCount: 7,
    fps: 12,
    loop: true,
    anchorX: 80,
    anchorY: 160,
    impactFrame: null,
  },
  jack_jump: {
    key: 'jack_jump',
    file: '/assets/jack_estripador/jump/strip.png',
    frameWidth: 146,
    frameHeight: 174,
    frameCount: 6,
    fps: 11,
    loop: false,
    anchorX: 67,
    anchorY: 170,
    impactFrame: null,
  },
  jack_crouch: {
    key: 'jack_crouch',
    file: '/assets/jack_estripador/crouch/strip.png',
    frameWidth: 124,
    frameHeight: 132,
    frameCount: 3,
    fps: 11,
    loop: false,
    anchorX: 63,
    anchorY: 128,
    impactFrame: null,
  },
  jack_standup: {
    key: 'jack_standup',
    file: '/assets/jack_estripador/standup/strip.png',
    frameWidth: 126,
    frameHeight: 170,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 63,
    anchorY: 166,
    impactFrame: null,
  },
  jack_block: {
    key: 'jack_block',
    file: '/assets/jack_estripador/block/strip.png',
    frameWidth: 130,
    frameHeight: 168,
    frameCount: 2,
    fps: 10,
    loop: false,
    anchorX: 59,
    anchorY: 164,
    impactFrame: null,
  },
  jack_dodge: {
    key: 'jack_dodge',
    file: '/assets/jack_estripador/dodge/strip.png',
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 63,
    anchorY: 124,
    impactFrame: null,
  },
  jack_hitstun: {
    key: 'jack_hitstun',
    file: '/assets/jack_estripador/hitstun/strip.png',
    frameWidth: 168,
    frameHeight: 154,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 70,
    anchorY: 150,
    impactFrame: null,
  },
  jack_knockdown: {
    key: 'jack_knockdown',
    file: '/assets/jack_estripador/knockdown/strip.png',
    frameWidth: 198,
    frameHeight: 154,
    frameCount: 5,
    fps: 11,
    loop: false,
    anchorX: 97,
    anchorY: 150,
    impactFrame: null,
  },
  jack_getup: {
    key: 'jack_getup',
    file: '/assets/jack_estripador/getup/strip.png',
    frameWidth: 154,
    frameHeight: 166,
    frameCount: 6,
    fps: 12,
    loop: false,
    anchorX: 66,
    anchorY: 162,
    impactFrame: null,
  },
  jack_victory: {
    key: 'jack_victory',
    file: '/assets/jack_estripador/victory/strip.png',
    frameWidth: 152,
    frameHeight: 174,
    frameCount: 7,
    fps: 10,
    loop: false,
    anchorX: 72,
    anchorY: 170,
    impactFrame: null,
  },
  jack_punch: {
    key: 'jack_punch',
    file: '/assets/jack_estripador/punch/strip.png',
    frameWidth: 248,
    frameHeight: 172,
    frameCount: 6,
    fps: 15,
    loop: false,
    anchorX: 100,
    anchorY: 168,
    impactFrame: 4,
  },
  jack_heavy_punch: {
    key: 'jack_heavy_punch',
    file: '/assets/jack_estripador/heavy_punch/strip.png',
    frameWidth: 248,
    frameHeight: 172,
    frameCount: 4,
    fps: 14,
    loop: false,
    anchorX: 100,
    anchorY: 168,
    impactFrame: 3,
  },
  jack_kick: {
    key: 'jack_kick',
    file: '/assets/jack_estripador/kick/strip.png',
    frameWidth: 224,
    frameHeight: 180,
    frameCount: 6,
    fps: 15,
    loop: false,
    anchorX: 70,
    anchorY: 176,
    impactFrame: 4,
  },
  jack_heavy_kick: {
    key: 'jack_heavy_kick',
    file: '/assets/jack_estripador/heavy_kick/strip.png',
    frameWidth: 224,
    frameHeight: 180,
    frameCount: 4,
    fps: 14,
    loop: false,
    anchorX: 70,
    anchorY: 176,
    impactFrame: 3,
  },
  jack_crouch_kick: {
    key: 'jack_crouch_kick',
    file: '/assets/jack_estripador/crouch_kick/strip.png',
    frameWidth: 150,
    frameHeight: 174,
    frameCount: 2,
    fps: 13,
    loop: false,
    anchorX: 63,
    anchorY: 170,
    impactFrame: 1,
  },
  jack_combo: {
    key: 'jack_combo',
    file: '/assets/jack_estripador/combo/strip.png',
    frameWidth: 254,
    frameHeight: 180,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 100,
    anchorY: 176,
    impactFrame: 4,
  },
  jack_special1_knives: {
    key: 'jack_special1_knives',
    file: '/assets/jack_estripador/special_1_knives/strip.png',
    frameWidth: 146,
    frameHeight: 168,
    frameCount: 7,
    fps: 18,
    loop: false,
    anchorX: 60,
    anchorY: 164,
    impactFrame: 4,
  },
  jack_special2_soul_eye: {
    key: 'jack_special2_soul_eye',
    file: '/assets/jack_estripador/special_2_soul_eye/strip.png',
    frameWidth: 122,
    frameHeight: 166,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 64,
    anchorY: 162,
    impactFrame: 1,
  },
  jack_special3_giant_scissors: {
    key: 'jack_special3_giant_scissors',
    file: '/assets/jack_estripador/special_3_giant_scissors/strip.png',
    frameWidth: 184,
    frameHeight: 226,
    frameCount: 9,
    fps: 18,
    loop: false,
    anchorX: 92,
    anchorY: 222,
    impactFrame: 3,
  },
  jack_special4_gods_hands: {
    key: 'jack_special4_gods_hands',
    file: '/assets/jack_estripador/special_4_gods_hands/strip.png',
    frameWidth: 184,
    frameHeight: 224,
    frameCount: 6,
    fps: 16,
    loop: false,
    anchorX: 65,
    anchorY: 220,
    impactFrame: 4,
  },
};

export function mapActionToJackSequence(action: FighterAction): JackSequenceKey {
  switch (action) {
    case 'walk':
      return 'jack_walk';
    case 'run':
      return 'jack_run';
    case 'jump':
      return 'jack_jump';
    case 'crouch':
      return 'jack_crouch';
    case 'standup':
      return 'jack_standup';
    case 'getup':
      return 'jack_getup';
    case 'block':
      return 'jack_block';
    case 'roll':
      return 'jack_dodge';
    case 'punch':
    case 'crouch_punch':
    case 'grab_attempt':
      return 'jack_punch';
    case 'heavy_punch':
    case 'grab_throw':
      return 'jack_heavy_punch';
    case 'kick':
      return 'jack_kick';
    case 'crouch_kick':
      return 'jack_crouch_kick';
    case 'heavy_kick':
    case 'air_kick':
      return 'jack_heavy_kick';
    case 'special1':
      return 'jack_special1_knives';
    case 'special2':
      return 'jack_special2_soul_eye';
    case 'special3':
      return 'jack_special3_giant_scissors';
    case 'special4':
      return 'jack_special4_gods_hands';
    case 'hitstun':
    case 'grabbed':
    case 'stun':
      return 'jack_hitstun';
    case 'knockdown':
    case 'ko':
      return 'jack_knockdown';
    case 'victory':
      return 'jack_victory';
    case 'idle':
    default:
      return 'jack_idle';
  }
}

export interface ResolvedJackFrame {
  sequence: JackSequenceMeta;
  frameIndex: number;
  flipHorizontal: boolean;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveJackFrame(f: FighterState, globalTime = 0): ResolvedJackFrame {
  const isBackward = (f.action === 'walk' || f.action === 'run') && f.vx * f.facing < -1;
  let phase: ResolvedJackFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  const seqKey = mapActionToJackSequence(f.action);
  const seq = JACK_SEQUENCES[seqKey];
  let frameIndex = 0;

  if (f.action === 'jump') {
    if (f.vy < -170) frameIndex = 0;
    else if (f.vy < -60) frameIndex = 1;
    else if (f.vy <= 45) frameIndex = 2;
    else if (f.vy <= 145) frameIndex = 3;
    else if (f.vy <= 230) frameIndex = 4;
    else frameIndex = 5;
  } else if (f.action === 'ko') {
    frameIndex = seq.frameCount - 1;
  } else if (f.action === 'idle') {
    const t = Math.max(0, globalTime + f.slot * 0.25);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'walk' || f.action === 'run') {
    const t = Math.max(0, f.actionTime);
    const raw = Math.floor(t * seq.fps) % seq.frameCount;
    frameIndex = isBackward ? seq.frameCount - 1 - raw : raw;
  } else if (f.action === 'crouch' || f.action === 'block') {
    frameIndex = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
  } else if (f.action === 'victory') {
    frameIndex = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
  } else if (f.action === 'special3' && f.currentMove) {
    // Tesoura Gigante: frames 0..2 startup grab -> frames 3..7 rapid spin -> frame 8 finisher cleave
    const m = f.currentMove;
    if (f.actionTime < m.startup) {
      const p = Math.max(0, f.actionTime / Math.max(0.01, m.startup));
      frameIndex = Math.min(2, Math.floor(p * 3));
    } else if (f.actionTime <= m.startup + m.active) {
      const activeElapsed = f.actionTime - m.startup;
      frameIndex = 3 + (Math.floor(activeElapsed * 16) % 5);
    } else {
      frameIndex = 8;
    }
  } else if (f.actionDuration > 0) {
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / f.actionDuration));
    const durIdx = Math.floor(prog * seq.frameCount);
    const fpsIdx = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
    frameIndex = Math.min(seq.frameCount - 1, Math.max(fpsIdx, durIdx));
  } else {
    frameIndex = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
  }

  return {
    sequence: seq,
    frameIndex,
    flipHorizontal: false,
    phase,
  };
}
