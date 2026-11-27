import { FighterAction, FighterState } from './types';

export type AdaoSequenceKey =
  | 'adao_idle'
  | 'adao_walk'
  | 'adao_run'
  | 'adao_jump'
  | 'adao_guard'
  | 'adao_crouch'
  | 'adao_evade'
  | 'adao_hit'
  | 'adao_knockdown'
  | 'adao_getup'
  | 'adao_punch'
  | 'adao_heavy_punch'
  | 'adao_kick'
  | 'adao_high_kick'
  | 'adao_low_kick'
  | 'adao_heavy_kick'
  | 'adao_special1'
  | 'adao_special2'
  | 'adao_special3_charge'
  | 'adao_special3_blast'
  | 'adao_special4'
  | 'adao_victory';

export interface AdaoSequenceMeta {
  key: AdaoSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

export const ADAO_RENDER_SCALE = 0.371;
export const ADAO_VICTORY_QUOTE = 'Existe algum homem que precise de um motivo para proteger os próprios filhos?';
export const ADAO_SPECIAL3_CHARGE_DURATION = 2.0;

export const ADAO_SEQUENCES: Record<AdaoSequenceKey, AdaoSequenceMeta> = {
  adao_idle: {
    key: 'adao_idle',
    file: '/characters/adao/idle/strip.png',
    frameWidth: 102,
    frameHeight: 218,
    frameCount: 4,
    fps: 7,
    loop: true,
    anchorX: 51,
    anchorY: 214,
  },
  adao_walk: {
    key: 'adao_walk',
    file: '/characters/adao/walk/strip.png',
    frameWidth: 134,
    frameHeight: 212,
    frameCount: 5,
    fps: 11,
    loop: true,
    anchorX: 67,
    anchorY: 208,
  },
  adao_run: {
    key: 'adao_run',
    file: '/characters/adao/run/strip.png',
    frameWidth: 168,
    frameHeight: 200,
    frameCount: 4,
    fps: 14,
    loop: true,
    anchorX: 84,
    anchorY: 196,
  },
  adao_jump: {
    key: 'adao_jump',
    file: '/characters/adao/jump/strip.png',
    frameWidth: 144,
    frameHeight: 176,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 72,
    anchorY: 172,
  },
  adao_guard: {
    key: 'adao_guard',
    file: '/characters/adao/defense/guard_strip.png',
    frameWidth: 130,
    frameHeight: 202,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 65,
    anchorY: 198,
  },
  adao_crouch: {
    key: 'adao_crouch',
    file: '/characters/adao/defense/crouch_strip.png',
    frameWidth: 96,
    frameHeight: 148,
    frameCount: 2,
    fps: 10,
    loop: false,
    anchorX: 48,
    anchorY: 144,
  },
  adao_evade: {
    key: 'adao_evade',
    file: '/characters/adao/defense/evade_strip.png',
    frameWidth: 178,
    frameHeight: 186,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 89,
    anchorY: 182,
  },
  adao_hit: {
    key: 'adao_hit',
    file: '/characters/adao/defense/hit_strip.png',
    frameWidth: 108,
    frameHeight: 174,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 54,
    anchorY: 170,
  },
  adao_knockdown: {
    key: 'adao_knockdown',
    file: '/characters/adao/defense/knockdown_strip.png',
    frameWidth: 212,
    frameHeight: 174,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 106,
    anchorY: 170,
  },
  adao_getup: {
    key: 'adao_getup',
    file: '/characters/adao/defense/getup_strip.png',
    frameWidth: 128,
    frameHeight: 172,
    frameCount: 3,
    fps: 10,
    loop: false,
    anchorX: 64,
    anchorY: 168,
  },
  adao_punch: {
    key: 'adao_punch',
    file: '/characters/adao/punch/punch_strip.png',
    frameWidth: 142,
    frameHeight: 198,
    frameCount: 5,
    fps: 16,
    loop: false,
    anchorX: 71,
    anchorY: 194,
  },
  adao_heavy_punch: {
    key: 'adao_heavy_punch',
    file: '/characters/adao/punch/heavy_punch_strip.png',
    frameWidth: 148,
    frameHeight: 192,
    frameCount: 3,
    fps: 14,
    loop: false,
    anchorX: 74,
    anchorY: 188,
  },
  adao_kick: {
    key: 'adao_kick',
    file: '/characters/adao/kick/kick_strip.png',
    frameWidth: 186,
    frameHeight: 202,
    frameCount: 5,
    fps: 16,
    loop: false,
    anchorX: 93,
    anchorY: 198,
  },
  adao_high_kick: {
    key: 'adao_high_kick',
    file: '/characters/adao/kick/high_kick_strip.png',
    frameWidth: 150,
    frameHeight: 206,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 75,
    anchorY: 202,
  },
  adao_low_kick: {
    key: 'adao_low_kick',
    file: '/characters/adao/kick/low_kick_strip.png',
    frameWidth: 192,
    frameHeight: 176,
    frameCount: 2,
    fps: 14,
    loop: false,
    anchorX: 96,
    anchorY: 172,
  },
  adao_heavy_kick: {
    key: 'adao_heavy_kick',
    file: '/characters/adao/kick/heavy_kick_strip.png',
    frameWidth: 144,
    frameHeight: 208,
    frameCount: 3,
    fps: 14,
    loop: false,
    anchorX: 72,
    anchorY: 204,
  },
  adao_special1: {
    key: 'adao_special1',
    file: '/characters/adao/special_1_meteor_jabs/strip.png',
    frameWidth: 304,
    frameHeight: 238,
    frameCount: 11,
    fps: 20,
    loop: false,
    anchorX: 142,
    anchorY: 234,
  },
  adao_special2: {
    key: 'adao_special2',
    file: '/characters/adao/special_2_divine_replication/strip.png',
    frameWidth: 452,
    frameHeight: 234,
    frameCount: 7,
    fps: 12,
    loop: false,
    anchorX: 192,
    anchorY: 230,
  },
  adao_special3_charge: {
    key: 'adao_special3_charge',
    file: '/characters/adao/special_3_time_transcending_fist/charge_strip.png',
    frameWidth: 318,
    frameHeight: 254,
    frameCount: 3,
    fps: 8,
    loop: false,
    anchorX: 150,
    anchorY: 250,
  },
  adao_special3_blast: {
    key: 'adao_special3_blast',
    file: '/characters/adao/special_3_time_transcending_fist/blast_strip.png',
    frameWidth: 972,
    frameHeight: 264,
    frameCount: 1,
    fps: 12,
    loop: false,
    anchorX: 192,
    anchorY: 260,
  },
  adao_special4: {
    key: 'adao_special4',
    file: '/characters/adao/special_4_divine_axe/strip.png',
    frameWidth: 320,
    frameHeight: 274,
    frameCount: 10,
    fps: 18,
    loop: false,
    anchorX: 116,
    anchorY: 270,
  },
  adao_victory: {
    key: 'adao_victory',
    file: '/characters/adao/victory/strip.png',
    frameWidth: 278,
    frameHeight: 230,
    frameCount: 4,
    fps: 6,
    loop: false,
    anchorX: 163,
    anchorY: 226,
  },
};

export function mapActionToAdaoSequence(
  action: FighterAction,
  options?: { chargingSpecial3?: boolean; copiedCast?: boolean }
): AdaoSequenceKey {
  if (options?.chargingSpecial3) return 'adao_special3_charge';
  switch (action) {
    case 'walk':
      return 'adao_walk';
    case 'run':
      return 'adao_run';
    case 'jump':
      return 'adao_jump';
    case 'crouch':
      return 'adao_crouch';
    case 'standup':
    case 'getup':
      return 'adao_getup';
    case 'block':
      return 'adao_guard';
    case 'roll':
      return 'adao_evade';
    case 'punch':
    case 'crouch_punch':
    case 'grab_attempt':
      return 'adao_punch';
    case 'heavy_punch':
    case 'grab_throw':
      return 'adao_heavy_punch';
    case 'kick':
      return 'adao_kick';
    case 'crouch_kick':
      return 'adao_low_kick';
    case 'heavy_kick':
      return 'adao_heavy_kick';
    case 'air_kick':
      return 'adao_high_kick';
    case 'special1':
      return 'adao_special1';
    case 'special2':
      return options?.copiedCast ? 'adao_special2' : 'adao_special2';
    case 'special3':
      return 'adao_special3_blast';
    case 'special4':
      return 'adao_special4';
    case 'hitstun':
    case 'grabbed':
    case 'stun':
      return 'adao_hit';
    case 'knockdown':
    case 'ko':
      return 'adao_knockdown';
    case 'victory':
      return 'adao_victory';
    case 'idle':
    default:
      return 'adao_idle';
  }
}

export interface ResolvedAdaoFrame {
  sequence: AdaoSequenceMeta;
  frameIndex: number;
  flipHorizontal: boolean;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveAdaoFrame(f: FighterState, globalTime = 0): ResolvedAdaoFrame {
  const isBackward = (f.action === 'walk' || f.action === 'run') && f.vx * f.facing < -1;
  let phase: ResolvedAdaoFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  // Charging Time Transcending Fist (0.0s .. 2.0s)
  if (f.adaoChargingSpecial3) {
    const seq = ADAO_SEQUENCES.adao_special3_charge;
    const t = Math.max(0, f.adaoChargeTime);
    let frameIndex = 0;
    if (t >= 1.15) frameIndex = 2;
    else if (t >= 0.4) frameIndex = 1;
    else frameIndex = 0;
    return { sequence: seq, frameIndex, flipHorizontal: false, phase: 'startup' };
  }

  // Firing Time Transcending Fist blast
  if (f.action === 'special3') {
    if (f.currentMove && f.actionTime < f.currentMove.startup) {
      return {
        sequence: ADAO_SEQUENCES.adao_special3_charge,
        frameIndex: 2,
        flipHorizontal: false,
        phase,
      };
    }
    return {
      sequence: ADAO_SEQUENCES.adao_special3_blast,
      frameIndex: 0,
      flipHorizontal: false,
      phase,
    };
  }

  // Executing copied ability via Special 2: play shadow-dash frames cleanly
  if (f.action === 'special2' && f.adaoCopiedCharacterId && f.currentMove && f.currentMove.kind !== 'divine_copy') {
    const seq = ADAO_SEQUENCES.adao_special2;
    const dur = Math.max(0.24, f.actionDuration || 0.45);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    // Focus on shadow double & dash strike frames (4, 5, 6)
    const idx = prog < 0.35 ? 4 : prog < 0.7 ? 5 : 6;
    return { sequence: seq, frameIndex: idx, flipHorizontal: false, phase };
  }

  const seqKey = mapActionToAdaoSequence(f.action, {
    chargingSpecial3: f.adaoChargingSpecial3,
    copiedCast: Boolean(f.adaoCopiedCharacterId),
  });
  const seq = ADAO_SEQUENCES[seqKey];
  let frameIndex = 0;

  if (f.action === 'jump') {
    if (f.vy < -90) frameIndex = 0;
    else if (f.vy <= 90) frameIndex = 1;
    else frameIndex = 2;
  } else if (f.action === 'ko') {
    frameIndex = seq.frameCount - 1;
  } else if (f.action === 'idle') {
    const t = Math.max(0, globalTime + f.slot * 0.25);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'walk' || f.action === 'run') {
    const t = Math.max(0, f.actionTime);
    const raw = Math.floor(t * seq.fps) % seq.frameCount;
    frameIndex = isBackward ? (seq.frameCount - 1 - raw) : raw;
  } else if (f.action === 'crouch' || f.action === 'block') {
    frameIndex = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
  } else if (f.action === 'victory') {
    frameIndex = Math.min(seq.frameCount - 1, Math.floor(Math.max(0, f.actionTime) * seq.fps));
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
