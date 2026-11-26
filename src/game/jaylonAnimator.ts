import { FighterAction, FighterState } from './types';

export type JaylonSequenceKey =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'crouch'
  | 'standup'
  | 'block'
  | 'roll'
  | 'punch'
  | 'kick'
  | 'heavy_punch'
  | 'heavy_kick'
  | 'grab'
  | 'throw'
  | 'damage'
  | 'stun'
  | 'knockdown'
  | 'getup'
  | 'drink'
  | 'smoke'
  | 'special_bottle'
  | 'special_vomit'
  | 'special_drink'
  | 'special_malboro'
  | 'victory';

export interface JaylonSequenceMeta {
  key: JaylonSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

// Calibrated to match existing standing fighter heights (~73-75px on the 480x270 stage)
export const JAYLON_RENDER_SCALE = 0.43;

// Animation speeds & frame metadata matching /public/assets/jaylon/manifest.json
export const JAYLON_SEQUENCES: Record<JaylonSequenceKey, JaylonSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/jaylon/animations/idle.png',
    frameWidth: 116,
    frameHeight: 176,
    frameCount: 4,
    fps: 6,
    loop: true,
    anchorX: 64,
    anchorY: 172,
  },
  walk: {
    key: 'walk',
    file: '/assets/jaylon/animations/walk.png',
    frameWidth: 92,
    frameHeight: 156,
    frameCount: 5,
    fps: 10,
    loop: true,
    anchorX: 50,
    anchorY: 152,
  },
  run: {
    key: 'run',
    file: '/assets/jaylon/animations/run.png',
    frameWidth: 122,
    frameHeight: 154,
    frameCount: 4,
    fps: 13,
    loop: true,
    anchorX: 62,
    anchorY: 150,
  },
  jump: {
    key: 'jump',
    file: '/assets/jaylon/animations/jump.png',
    frameWidth: 104,
    frameHeight: 144,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 57,
    anchorY: 140,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/jaylon/animations/crouch.png',
    frameWidth: 128,
    frameHeight: 122,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 60,
    anchorY: 118,
  },
  standup: {
    key: 'standup',
    file: '/assets/jaylon/animations/standup.png',
    frameWidth: 88,
    frameHeight: 156,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 43,
    anchorY: 152,
  },
  block: {
    key: 'block',
    file: '/assets/jaylon/animations/block.png',
    frameWidth: 114,
    frameHeight: 150,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 66,
    anchorY: 146,
  },
  roll: {
    key: 'roll',
    file: '/assets/jaylon/animations/roll.png',
    frameWidth: 118,
    frameHeight: 136,
    frameCount: 3,
    fps: 12,
    loop: true,
    anchorX: 49,
    anchorY: 132,
  },
  punch: {
    key: 'punch',
    file: '/assets/jaylon/animations/punch.png',
    frameWidth: 132,
    frameHeight: 144,
    frameCount: 3,
    fps: 14,
    loop: false,
    anchorX: 58,
    anchorY: 140,
  },
  kick: {
    key: 'kick',
    file: '/assets/jaylon/animations/kick.png',
    frameWidth: 138,
    frameHeight: 152,
    frameCount: 3,
    fps: 13,
    loop: false,
    anchorX: 50,
    anchorY: 148,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/jaylon/animations/heavy_punch.png',
    frameWidth: 132,
    frameHeight: 140,
    frameCount: 3,
    fps: 13,
    loop: false,
    anchorX: 58,
    anchorY: 136,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/jaylon/animations/heavy_kick.png',
    frameWidth: 138,
    frameHeight: 152,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 50,
    anchorY: 148,
  },
  grab: {
    key: 'grab',
    file: '/assets/jaylon/animations/grab.png',
    frameWidth: 132,
    frameHeight: 144,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 58,
    anchorY: 140,
  },
  throw: {
    key: 'throw',
    file: '/assets/jaylon/animations/throw.png',
    frameWidth: 92,
    frameHeight: 124,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 39,
    anchorY: 120,
  },
  damage: {
    key: 'damage',
    file: '/assets/jaylon/animations/damage.png',
    frameWidth: 116,
    frameHeight: 142,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 61,
    anchorY: 138,
  },
  stun: {
    key: 'stun',
    file: '/assets/jaylon/animations/stun.png',
    frameWidth: 112,
    frameHeight: 144,
    frameCount: 3,
    fps: 6,
    loop: true,
    anchorX: 54,
    anchorY: 140,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/jaylon/animations/knockdown.png',
    frameWidth: 148,
    frameHeight: 100,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 92,
    anchorY: 96,
  },
  getup: {
    key: 'getup',
    file: '/assets/jaylon/animations/getup.png',
    frameWidth: 88,
    frameHeight: 156,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 43,
    anchorY: 152,
  },
  drink: {
    key: 'drink',
    file: '/assets/jaylon/animations/drink.png',
    frameWidth: 94,
    frameHeight: 148,
    frameCount: 2,
    fps: 6,
    loop: false,
    anchorX: 40,
    anchorY: 144,
  },
  smoke: {
    key: 'smoke',
    file: '/assets/jaylon/animations/smoke.png',
    frameWidth: 96,
    frameHeight: 172,
    frameCount: 3,
    fps: 8,
    loop: false,
    anchorX: 39,
    anchorY: 168,
  },
  special_bottle: {
    key: 'special_bottle',
    file: '/assets/jaylon/animations/special_bottle.png',
    frameWidth: 124,
    frameHeight: 124,
    frameCount: 5,
    fps: 13,
    loop: false,
    anchorX: 71,
    anchorY: 120,
  },
  special_vomit: {
    key: 'special_vomit',
    file: '/assets/jaylon/animations/special_vomit.png',
    frameWidth: 120,
    frameHeight: 124,
    frameCount: 3,
    fps: 8,
    loop: false,
    anchorX: 55,
    anchorY: 120,
  },
  special_drink: {
    key: 'special_drink',
    file: '/assets/jaylon/animations/special_drink.png',
    frameWidth: 124,
    frameHeight: 148,
    frameCount: 5,
    fps: 7,
    loop: false,
    anchorX: 59,
    anchorY: 145,
  },
  special_malboro: {
    key: 'special_malboro',
    file: '/assets/jaylon/animations/special_malboro.png',
    frameWidth: 136,
    frameHeight: 136,
    frameCount: 5,
    fps: 9,
    loop: false,
    anchorX: 70,
    anchorY: 133,
  },
  victory: {
    key: 'victory',
    file: '/assets/jaylon/animations/victory.png',
    frameWidth: 122,
    frameHeight: 172,
    frameCount: 4,
    fps: 6,
    loop: false,
    anchorX: 64,
    anchorY: 168,
  },
};

export function mapActionToJaylonSequence(action: FighterAction): JaylonSequenceKey {
  switch (action) {
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
    case 'air_kick':
      return 'kick';
    case 'heavy_punch':
    case 'crouch_punch':
      return 'heavy_punch';
    case 'heavy_kick':
    case 'crouch_kick':
      return 'heavy_kick';
    case 'grab_attempt':
      return 'grab';
    case 'grab_throw':
      return 'throw';
    case 'special1':
      return 'special_bottle';
    case 'special2':
      return 'special_vomit';
    case 'special3':
      return 'special_drink';
    case 'special4':
      return 'special_malboro';
    case 'hitstun':
    case 'grabbed':
      return 'damage';
    case 'stun':
      return 'stun';
    case 'knockdown':
    case 'ko':
      return 'knockdown';
    case 'getup':
      return 'getup';
    case 'victory':
      return 'victory';
    case 'idle':
    default:
      return 'idle';
  }
}

export interface ResolvedJaylonFrame {
  sequence: JaylonSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveJaylonFrame(f: FighterState, globalTime = 0): ResolvedJaylonFrame {
  const seqKey = mapActionToJaylonSequence(f.action);
  const seq = JAYLON_SEQUENCES[seqKey];

  let phase: ResolvedJaylonFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  const alpha = 1;

  if (f.action === 'jump') {
    if (f.vy < -140) frameIndex = 0;
    else if (f.vy < -30) frameIndex = 1;
    else if (f.vy <= 75) frameIndex = 2;
    else frameIndex = 3;
  } else if (f.action === 'special1') {
    // Lança Casco de Cerveja: 0..2 windup, 3 throw/release, 4 follow-through
    const dur = Math.max(0.1, f.actionDuration || 0.44);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'special2') {
    // Ressaca Braba: 0 crouch lean, 1 vomit mouth open, 2 hunched recovery
    if (phase === 'startup') frameIndex = 0;
    else if (phase === 'active') frameIndex = 1;
    else frameIndex = 2;
  } else if (f.action === 'special3') {
    // Gole na Cerveja: 0..3 drinking beer, 4 dizzy wobble leading into stun
    const dur = Math.max(0.1, f.actionDuration || 0.58);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'special4') {
    // Malboro: 0..2 smoke cigarette, 3..4 lean forward & fire breath
    if (phase === 'startup') {
      const startup = Math.max(0.05, f.currentMove?.startup ?? 0.24);
      frameIndex = Math.min(2, Math.floor((f.actionTime / startup) * 3));
    } else if (phase === 'active') {
      frameIndex = 3;
    } else {
      frameIndex = 4;
    }
  } else if (f.action === 'stun') {
    const t = Math.max(0, globalTime + f.slot * 0.2);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'hitstun' || f.action === 'grabbed') {
    const dur = Math.max(0.15, f.actionDuration || 0.35);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
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
