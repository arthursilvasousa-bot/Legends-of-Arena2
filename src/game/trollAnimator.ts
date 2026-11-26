import { FighterAction, FighterState } from './types';

export type TrollSequenceKey =
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
  | 'ground_smash'
  | 'special_pancada_brutal'
  | 'special_salto_esmagador'
  | 'special_arremesso_pedra'
  | 'special_furia_troll'
  | 'fury_idle'
  | 'victory';

export interface TrollSequenceMeta {
  key: TrollSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

// Lean normal Troll Kawa scale (~74px standing vs ~72px Ninja / ~79px Minotaur)
export const TROLL_RENDER_SCALE = 0.68;
export const TROLL_FURY_SCALE_X = 1.24;
export const TROLL_FURY_SCALE_Y = 1.1;
export const TROLL_FURY_REVERSE_DURATION = 0.35;

// Animation speeds & frame metadata matching /public/assets/troll_kawa/manifest.json
export const TROLL_SEQUENCES: Record<TrollSequenceKey, TrollSequenceMeta> = {
  idle: {
    key: 'idle',
    file: '/assets/troll_kawa/idle.png',
    frameWidth: 72,
    frameHeight: 109,
    frameCount: 4,
    fps: 6,
    loop: true,
    anchorX: 38,
    anchorY: 106,
  },
  walk: {
    key: 'walk',
    file: '/assets/troll_kawa/walk.png',
    frameWidth: 73,
    frameHeight: 107,
    frameCount: 5,
    fps: 12,
    loop: true,
    anchorX: 37,
    anchorY: 104,
  },
  run: {
    key: 'run',
    file: '/assets/troll_kawa/run.png',
    frameWidth: 95,
    frameHeight: 110,
    frameCount: 4,
    fps: 16,
    loop: true,
    anchorX: 47,
    anchorY: 107,
  },
  jump: {
    key: 'jump',
    file: '/assets/troll_kawa/jump.png',
    frameWidth: 80,
    frameHeight: 108,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 35,
    anchorY: 105,
  },
  crouch: {
    key: 'crouch',
    file: '/assets/troll_kawa/crouch.png',
    frameWidth: 81,
    frameHeight: 67,
    frameCount: 2,
    fps: 10,
    loop: false,
    anchorX: 42,
    anchorY: 64,
  },
  standup: {
    key: 'standup',
    file: '/assets/troll_kawa/standup.png',
    frameWidth: 52,
    frameHeight: 88,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 26,
    anchorY: 85,
  },
  block: {
    key: 'block',
    file: '/assets/troll_kawa/block.png',
    frameWidth: 95,
    frameHeight: 106,
    frameCount: 3,
    fps: 10,
    loop: true,
    anchorX: 45,
    anchorY: 103,
  },
  roll: {
    key: 'roll',
    file: '/assets/troll_kawa/roll.png',
    frameWidth: 97,
    frameHeight: 83,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 49,
    anchorY: 80,
  },
  knockdown: {
    key: 'knockdown',
    file: '/assets/troll_kawa/knockdown.png',
    frameWidth: 132,
    frameHeight: 67,
    frameCount: 3,
    fps: 8,
    loop: false,
    anchorX: 68,
    anchorY: 64,
  },
  getup: {
    key: 'getup',
    file: '/assets/troll_kawa/getup.png',
    frameWidth: 81,
    frameHeight: 98,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 33,
    anchorY: 95,
  },
  punch: {
    key: 'punch',
    file: '/assets/troll_kawa/punch.png',
    frameWidth: 84,
    frameHeight: 100,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 40,
    anchorY: 97,
  },
  kick: {
    key: 'kick',
    file: '/assets/troll_kawa/kick.png',
    frameWidth: 65,
    frameHeight: 96,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 36,
    anchorY: 93,
  },
  heavy_punch: {
    key: 'heavy_punch',
    file: '/assets/troll_kawa/heavy_punch.png',
    frameWidth: 106,
    frameHeight: 109,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 52,
    anchorY: 106,
  },
  heavy_kick: {
    key: 'heavy_kick',
    file: '/assets/troll_kawa/heavy_kick.png',
    frameWidth: 139,
    frameHeight: 101,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 55,
    anchorY: 98,
  },
  grab: {
    key: 'grab',
    file: '/assets/troll_kawa/grab.png',
    frameWidth: 98,
    frameHeight: 113,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 52,
    anchorY: 110,
  },
  throw: {
    key: 'throw',
    file: '/assets/troll_kawa/throw.png',
    frameWidth: 102,
    frameHeight: 114,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 46,
    anchorY: 111,
  },
  ground_smash: {
    key: 'ground_smash',
    file: '/assets/troll_kawa/ground_smash.png',
    frameWidth: 170,
    frameHeight: 110,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 86,
    anchorY: 107,
  },
  special_pancada_brutal: {
    key: 'special_pancada_brutal',
    file: '/assets/troll_kawa/special_pancada_brutal.png',
    frameWidth: 159,
    frameHeight: 141,
    frameCount: 7,
    fps: 15,
    loop: false,
    anchorX: 67,
    anchorY: 138,
  },
  special_salto_esmagador: {
    key: 'special_salto_esmagador',
    file: '/assets/troll_kawa/special_salto_esmagador.png',
    frameWidth: 240,
    frameHeight: 135,
    frameCount: 6,
    fps: 15,
    loop: false,
    anchorX: 121,
    anchorY: 132,
  },
  special_arremesso_pedra: {
    key: 'special_arremesso_pedra',
    file: '/assets/troll_kawa/special_arremesso_pedra.png',
    frameWidth: 127,
    frameHeight: 144,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 52,
    anchorY: 141,
  },
  special_furia_troll: {
    key: 'special_furia_troll',
    file: '/assets/troll_kawa/special_furia_troll.png',
    frameWidth: 138,
    frameHeight: 168,
    frameCount: 6,
    fps: 15,
    loop: false,
    anchorX: 69,
    anchorY: 165,
  },
  fury_idle: {
    key: 'fury_idle',
    file: '/assets/troll_kawa/fury_idle.png',
    frameWidth: 138,
    frameHeight: 168,
    frameCount: 2,
    fps: 6,
    loop: true,
    anchorX: 69,
    anchorY: 165,
  },
  victory: {
    key: 'victory',
    file: '/assets/troll_kawa/victory.png',
    frameWidth: 138,
    frameHeight: 168,
    frameCount: 6,
    fps: 10,
    loop: false,
    anchorX: 69,
    anchorY: 165,
  },
};

export function mapActionToTrollSequence(
  action: FighterAction,
  furyTime = 0,
  furyReverseTime = 0
): TrollSequenceKey {
  if (action === 'idle') {
    if (furyTime > 0) return 'fury_idle';
    if (furyReverseTime > 0) return 'special_furia_troll';
    return 'idle';
  }
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
      return 'kick';
    case 'heavy_punch':
    case 'crouch_punch':
      return furyTime > 0 ? 'ground_smash' : 'heavy_punch';
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
      return 'special_pancada_brutal';
    case 'special2':
      return 'special_salto_esmagador';
    case 'special3':
      return 'special_arremesso_pedra';
    case 'special4':
      return 'special_furia_troll';
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

export interface ResolvedTrollFrame {
  sequence: TrollSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
  isMuscularForm: boolean;
  isTransforming: boolean;
  isReversing: boolean;
  bodyScaleX: number;
  bodyScaleY: number;
}

export function resolveTrollFrame(f: FighterState, globalTime = 0): ResolvedTrollFrame {
  const isTransforming = f.action === 'special4';
  const isReversing = !isTransforming && f.furyTime <= 0 && f.furyReverseTime > 0;
  const seqKey = mapActionToTrollSequence(f.action, f.furyTime, f.furyReverseTime);
  const seq = TROLL_SEQUENCES[seqKey];

  let phase: ResolvedTrollFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  let frameIndex = 0;
  const alpha = 1;

  if (f.action === 'jump') {
    if (f.vy < -150) frameIndex = 0;
    else if (f.vy < -35) frameIndex = 1;
    else if (f.vy <= 75) frameIndex = 2;
    else frameIndex = 3;
  } else if (f.action === 'special2') {
    // T - Salto Esmagador: 0=prep/launch, 1=rising, 2=apex, 3=descend, 4=ground impact, 5=explosion/recovery
    const startup = f.currentMove?.startup ?? 0.12;
    if (f.actionTime < startup) {
      frameIndex = 0;
    } else if (!f.hitConnectedThisMove) {
      if (f.vy < -130) frameIndex = 1;
      else if (f.vy <= 75) frameIndex = 2;
      else frameIndex = 3;
    } else {
      const recovery = f.currentMove?.recovery ?? 0.24;
      const elapsedAfterImpact = Math.max(0, f.actionDuration - f.actionTime);
      frameIndex = elapsedAfterImpact > recovery * 0.48 ? 4 : 5;
    }
  } else if (f.action === 'special4') {
    // Progressive transformation frames 0..5 over actionDuration
    const dur = Math.max(0.1, f.actionDuration || 0.42);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (isReversing && seq.key === 'special_furia_troll') {
    // Reverse transformation back to lean body: frames 5 -> 4 -> 3 -> 2 -> 1 -> 0
    const t = Math.max(0, Math.min(0.9999, f.furyReverseTime / TROLL_FURY_REVERSE_DURATION));
    frameIndex = Math.floor(t * seq.frameCount);
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

  // Body proportions: lean (1.0, 1.0) in normal form; muscular (1.24, 1.10) ONLY during Fury.
  // Row 4 Fury Frame 0 body height is 111px vs Row 0 lean Idle 100-103px, so normalize baseScale to 0.90 on Frame 0
  // and expand smoothly to (0.96, 0.92) in full Fury (where spiked muscular frame is ~144-153px tall).
  const alreadyMuscularSprite = seqKey === 'fury_idle' || seqKey === 'special_furia_troll' || seqKey === 'victory';
  let furyRatio = 0;
  let isMuscularForm = false;

  if (isTransforming) {
    const dur = Math.max(0.1, f.actionDuration || 0.42);
    furyRatio = Math.max(0, Math.min(1, f.actionTime / dur));
    isMuscularForm = furyRatio >= 0.4;
  } else if (f.furyTime > 0) {
    furyRatio = 1;
    isMuscularForm = true;
  } else if (isReversing) {
    furyRatio = Math.max(0, Math.min(1, f.furyReverseTime / TROLL_FURY_REVERSE_DURATION));
    isMuscularForm = furyRatio >= 0.35;
  }

  const baseScaleX = alreadyMuscularSprite ? 0.9 : 1;
  const baseScaleY = alreadyMuscularSprite ? 0.9 : 1;
  const targetScaleX = alreadyMuscularSprite ? 0.96 : TROLL_FURY_SCALE_X;
  const targetScaleY = alreadyMuscularSprite ? 0.92 : TROLL_FURY_SCALE_Y;
  const bodyScaleX = baseScaleX + (targetScaleX - baseScaleX) * furyRatio;
  const bodyScaleY = baseScaleY + (targetScaleY - baseScaleY) * furyRatio;

  return {
    sequence: seq,
    frameIndex,
    alpha,
    phase,
    isMuscularForm,
    isTransforming,
    isReversing,
    bodyScaleX,
    bodyScaleY,
  };
}
