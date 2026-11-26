import { FighterAction, FighterState } from './types';

export type DonoSequenceKey =
  | 'dono_idle'
  | 'dono_walk_forward'
  | 'dono_walk_backward'
  | 'dono_run_forward'
  | 'dono_run_backward'
  | 'dono_jump'
  | 'dono_landing'
  | 'dono_jump_attack'
  | 'dono_jab'
  | 'dono_heavy_punch'
  | 'dono_light_kick'
  | 'dono_front_kick'
  | 'dono_heavy_kick'
  | 'dono_block'
  | 'dono_crouch'
  | 'dono_hit'
  | 'dono_knockdown'
  | 'dono_get_up'
  | 'dono_victory'
  | 'dono_festa_draw'
  | 'dono_festa_aim'
  | 'dono_festa_shoot'
  | 'dono_festa_reload'
  | 'dono_atividade_start'
  | 'dono_atividade_radio'
  | 'dono_atividade_energy'
  | 'dono_atividade_end'
  | 'dono_camuflagem_start'
  | 'dono_camuflagem_change'
  | 'dono_camuflagem_invisible'
  | 'dono_camuflagem_reappear'
  | 'dono_camuflagem_end'
  | 'dono_maryjuana_start'
  | 'dono_maryjuana_smoke'
  | 'dono_maryjuana_boost'
  | 'dono_maryjuana_speed'
  | 'dono_maryjuana_end';

export interface DonoSequenceMeta {
  key: DonoSequenceKey;
  file: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  anchorX: number;
  anchorY: number;
}

// Calibrated to match existing standing fighter heights (~74-76px on the 480x270 stage)
export const DONO_RENDER_SCALE = 0.455;

// Exclusive victory quote & gameplay constants for Dono do Morro
export const DONO_VICTORY_QUOTE = 'Aqui quem manda sou eu!';
export const DONO_MAX_AMMO = 5;
export const DONO_RELOAD_DURATION = 1.0;
export const DONO_ATIVIDADE_LOCK_DURATION = 0.6;
export const DONO_ATIVIDADE_ENERGY_GAIN = 25;
export const DONO_CAMUFLAGEM_DURATION = 1.5;
export const DONO_MARYJUANA_DURATION = 2.0;
export const DONO_MARYJUANA_SPEED_MULTIPLIER = 1.5;

export const DONO_SEQUENCES: Record<DonoSequenceKey, DonoSequenceMeta> = {
  dono_idle: {
    key: 'dono_idle',
    file: '/assets/dono/animations/dono_idle.png',
    frameWidth: 116,
    frameHeight: 166,
    frameCount: 6,
    fps: 8,
    loop: true,
    anchorX: 58,
    anchorY: 162,
  },
  dono_walk_forward: {
    key: 'dono_walk_forward',
    file: '/assets/dono/animations/dono_walk_forward.png',
    frameWidth: 128,
    frameHeight: 162,
    frameCount: 6,
    fps: 12,
    loop: true,
    anchorX: 65,
    anchorY: 158,
  },
  dono_walk_backward: {
    key: 'dono_walk_backward',
    file: '/assets/dono/animations/dono_walk_backward.png',
    frameWidth: 128,
    frameHeight: 162,
    frameCount: 6,
    fps: 12,
    loop: true,
    anchorX: 65,
    anchorY: 158,
  },
  dono_run_forward: {
    key: 'dono_run_forward',
    file: '/assets/dono/animations/dono_run_forward.png',
    frameWidth: 154,
    frameHeight: 148,
    frameCount: 6,
    fps: 16,
    loop: true,
    anchorX: 77,
    anchorY: 144,
  },
  dono_run_backward: {
    key: 'dono_run_backward',
    file: '/assets/dono/animations/dono_run_backward.png',
    frameWidth: 154,
    frameHeight: 148,
    frameCount: 6,
    fps: 16,
    loop: true,
    anchorX: 77,
    anchorY: 144,
  },
  dono_jump: {
    key: 'dono_jump',
    file: '/assets/dono/animations/dono_jump.png',
    frameWidth: 144,
    frameHeight: 152,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 47,
    anchorY: 148,
  },
  dono_landing: {
    key: 'dono_landing',
    file: '/assets/dono/animations/dono_landing.png',
    frameWidth: 108,
    frameHeight: 146,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 54,
    anchorY: 142,
  },
  dono_jump_attack: {
    key: 'dono_jump_attack',
    file: '/assets/dono/animations/dono_jump_attack.png',
    frameWidth: 148,
    frameHeight: 170,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 50,
    anchorY: 166,
  },
  dono_jab: {
    key: 'dono_jab',
    file: '/assets/dono/animations/dono_jab.png',
    frameWidth: 146,
    frameHeight: 156,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 73,
    anchorY: 152,
  },
  dono_heavy_punch: {
    key: 'dono_heavy_punch',
    file: '/assets/dono/animations/dono_heavy_punch.png',
    frameWidth: 130,
    frameHeight: 156,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 65,
    anchorY: 152,
  },
  dono_light_kick: {
    key: 'dono_light_kick',
    file: '/assets/dono/animations/dono_light_kick.png',
    frameWidth: 132,
    frameHeight: 160,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 50,
    anchorY: 156,
  },
  dono_front_kick: {
    key: 'dono_front_kick',
    file: '/assets/dono/animations/dono_front_kick.png',
    frameWidth: 140,
    frameHeight: 170,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 50,
    anchorY: 166,
  },
  dono_heavy_kick: {
    key: 'dono_heavy_kick',
    file: '/assets/dono/animations/dono_heavy_kick.png',
    frameWidth: 146,
    frameHeight: 170,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 57,
    anchorY: 166,
  },
  dono_block: {
    key: 'dono_block',
    file: '/assets/dono/animations/dono_block.png',
    frameWidth: 114,
    frameHeight: 168,
    frameCount: 6,
    fps: 10,
    loop: false,
    anchorX: 57,
    anchorY: 164,
  },
  dono_crouch: {
    key: 'dono_crouch',
    file: '/assets/dono/animations/dono_crouch.png',
    frameWidth: 132,
    frameHeight: 134,
    frameCount: 6,
    fps: 10,
    loop: false,
    anchorX: 67,
    anchorY: 130,
  },
  dono_hit: {
    key: 'dono_hit',
    file: '/assets/dono/animations/dono_hit.png',
    frameWidth: 118,
    frameHeight: 168,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 60,
    anchorY: 164,
  },
  dono_knockdown: {
    key: 'dono_knockdown',
    file: '/assets/dono/animations/dono_knockdown.png',
    frameWidth: 188,
    frameHeight: 90,
    frameCount: 5,
    fps: 10,
    loop: false,
    anchorX: 81,
    anchorY: 86,
  },
  dono_get_up: {
    key: 'dono_get_up',
    file: '/assets/dono/animations/dono_get_up.png',
    frameWidth: 142,
    frameHeight: 164,
    frameCount: 5,
    fps: 12,
    loop: false,
    anchorX: 65,
    anchorY: 160,
  },
  dono_victory: {
    key: 'dono_victory',
    file: '/assets/dono/animations/dono_victory.png',
    frameWidth: 118,
    frameHeight: 166,
    frameCount: 5,
    fps: 10,
    loop: false,
    anchorX: 59,
    anchorY: 162,
  },
  dono_festa_draw: {
    key: 'dono_festa_draw',
    file: '/assets/dono/animations/dono_festa_draw.png',
    frameWidth: 138,
    frameHeight: 170,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 69,
    anchorY: 166,
  },
  dono_festa_aim: {
    key: 'dono_festa_aim',
    file: '/assets/dono/animations/dono_festa_aim.png',
    frameWidth: 140,
    frameHeight: 166,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 70,
    anchorY: 162,
  },
  dono_festa_shoot: {
    key: 'dono_festa_shoot',
    file: '/assets/dono/animations/dono_festa_shoot.png',
    frameWidth: 162,
    frameHeight: 162,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 81,
    anchorY: 158,
  },
  dono_festa_reload: {
    key: 'dono_festa_reload',
    file: '/assets/dono/animations/dono_festa_reload.png',
    frameWidth: 138,
    frameHeight: 170,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 69,
    anchorY: 166,
  },
  dono_atividade_start: {
    key: 'dono_atividade_start',
    file: '/assets/dono/animations/dono_atividade_start.png',
    frameWidth: 88,
    frameHeight: 168,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 41,
    anchorY: 164,
  },
  dono_atividade_radio: {
    key: 'dono_atividade_radio',
    file: '/assets/dono/animations/dono_atividade_radio.png',
    frameWidth: 142,
    frameHeight: 172,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 66,
    anchorY: 168,
  },
  dono_atividade_energy: {
    key: 'dono_atividade_energy',
    file: '/assets/dono/animations/dono_atividade_energy.png',
    frameWidth: 142,
    frameHeight: 184,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 66,
    anchorY: 180,
  },
  dono_atividade_end: {
    key: 'dono_atividade_end',
    file: '/assets/dono/animations/dono_atividade_end.png',
    frameWidth: 118,
    frameHeight: 168,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 59,
    anchorY: 164,
  },
  dono_camuflagem_start: {
    key: 'dono_camuflagem_start',
    file: '/assets/dono/animations/dono_camuflagem_start.png',
    frameWidth: 94,
    frameHeight: 168,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 48,
    anchorY: 164,
  },
  dono_camuflagem_change: {
    key: 'dono_camuflagem_change',
    file: '/assets/dono/animations/dono_camuflagem_change.png',
    frameWidth: 98,
    frameHeight: 168,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 47,
    anchorY: 164,
  },
  dono_camuflagem_invisible: {
    key: 'dono_camuflagem_invisible',
    file: '/assets/dono/animations/dono_camuflagem_invisible.png',
    frameWidth: 130,
    frameHeight: 152,
    frameCount: 2,
    fps: 15,
    loop: true,
    anchorX: 66,
    anchorY: 148,
  },
  dono_camuflagem_reappear: {
    key: 'dono_camuflagem_reappear',
    file: '/assets/dono/animations/dono_camuflagem_reappear.png',
    frameWidth: 124,
    frameHeight: 168,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 59,
    anchorY: 164,
  },
  dono_camuflagem_end: {
    key: 'dono_camuflagem_end',
    file: '/assets/dono/animations/dono_camuflagem_end.png',
    frameWidth: 94,
    frameHeight: 168,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 48,
    anchorY: 164,
  },
  dono_maryjuana_start: {
    key: 'dono_maryjuana_start',
    file: '/assets/dono/animations/dono_maryjuana_start.png',
    frameWidth: 128,
    frameHeight: 200,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 68,
    anchorY: 196,
  },
  dono_maryjuana_smoke: {
    key: 'dono_maryjuana_smoke',
    file: '/assets/dono/animations/dono_maryjuana_smoke.png',
    frameWidth: 138,
    frameHeight: 200,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 74,
    anchorY: 196,
  },
  dono_maryjuana_boost: {
    key: 'dono_maryjuana_boost',
    file: '/assets/dono/animations/dono_maryjuana_boost.png',
    frameWidth: 138,
    frameHeight: 194,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 74,
    anchorY: 190,
  },
  dono_maryjuana_speed: {
    key: 'dono_maryjuana_speed',
    file: '/assets/dono/animations/dono_maryjuana_speed.png',
    frameWidth: 146,
    frameHeight: 156,
    frameCount: 2,
    fps: 15,
    loop: true,
    anchorX: 73,
    anchorY: 152,
  },
  dono_maryjuana_end: {
    key: 'dono_maryjuana_end',
    file: '/assets/dono/animations/dono_maryjuana_end.png',
    frameWidth: 136,
    frameHeight: 166,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 68,
    anchorY: 162,
  },
};

export function mapActionToDonoSequence(
  action: FighterAction,
  isBackward = false,
  options?: { landing?: boolean; reloading?: boolean; speedBuffActive?: boolean }
): DonoSequenceKey {
  switch (action) {
    case 'walk':
      if (options?.speedBuffActive && !isBackward) return 'dono_maryjuana_speed';
      return isBackward ? 'dono_walk_backward' : 'dono_walk_forward';
    case 'run':
    case 'roll':
      if (options?.speedBuffActive && !isBackward) return 'dono_maryjuana_speed';
      return isBackward ? 'dono_run_backward' : 'dono_run_forward';
    case 'jump':
      return 'dono_jump';
    case 'crouch':
      return 'dono_crouch';
    case 'standup':
    case 'getup':
      return 'dono_get_up';
    case 'block':
      return 'dono_block';
    case 'punch':
    case 'crouch_punch':
    case 'grab_attempt':
      return 'dono_jab';
    case 'heavy_punch':
    case 'grab_throw':
      return 'dono_heavy_punch';
    case 'kick':
      return 'dono_front_kick';
    case 'crouch_kick':
      return 'dono_light_kick';
    case 'heavy_kick':
      return 'dono_heavy_kick';
    case 'air_kick':
      return 'dono_jump_attack';
    case 'special1':
      return options?.reloading ? 'dono_festa_reload' : 'dono_festa_draw';
    case 'special2':
      return 'dono_atividade_start';
    case 'special3':
      return 'dono_camuflagem_start';
    case 'special4':
      return 'dono_maryjuana_start';
    case 'hitstun':
    case 'grabbed':
    case 'stun':
      return 'dono_hit';
    case 'knockdown':
    case 'ko':
      return 'dono_knockdown';
    case 'victory':
      return 'dono_victory';
    case 'idle':
    default:
      return options?.landing ? 'dono_landing' : 'dono_idle';
  }
}

export interface ResolvedDonoFrame {
  sequence: DonoSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveDonoFrame(f: FighterState, globalTime = 0): ResolvedDonoFrame {
  const isBackward = f.vx * f.facing < -1;
  const landing = f.action === 'idle' && f.landingTime > 0;
  const reloading = f.donoReloadTimer > 0;
  const speedBuffActive = f.donoSpeedTime > 0;
  const camoAlpha = f.donoCamoTime > 0 && f.action !== 'ko' && f.action !== 'victory' ? 0.22 : 1;

  let phase: ResolvedDonoFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  // Special 1: Festa na Favela (draw -> aim -> shoot -> reload if last bullet)
  if (f.action === 'special1') {
    const dur = Math.max(0.24, f.actionDuration || 0.3);
    const t = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    let seq: DonoSequenceMeta;
    let subT: number;
    if (t < 0.22) {
      seq = DONO_SEQUENCES.dono_festa_draw;
      subT = t / 0.22;
    } else if (t < 0.42) {
      seq = DONO_SEQUENCES.dono_festa_aim;
      subT = (t - 0.22) / 0.2;
    } else if (t < 0.8 || !reloading) {
      seq = DONO_SEQUENCES.dono_festa_shoot;
      subT = Math.min(0.9999, (t - 0.42) / 0.58);
    } else {
      seq = DONO_SEQUENCES.dono_festa_reload;
      subT = (t - 0.8) / 0.2;
    }
    return {
      sequence: seq,
      frameIndex: Math.min(seq.frameCount - 1, Math.floor(subT * seq.frameCount)),
      alpha: camoAlpha,
      phase,
    };
  }

  // Special 2: Atividade (0.60s radio lock + energy boost)
  if (f.action === 'special2') {
    const dur = Math.max(0.3, f.actionDuration || DONO_ATIVIDADE_LOCK_DURATION);
    const t = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    let seq: DonoSequenceMeta;
    let subT: number;
    if (t < 0.28) {
      seq = DONO_SEQUENCES.dono_atividade_start;
      subT = t / 0.28;
    } else if (t < 0.52) {
      seq = DONO_SEQUENCES.dono_atividade_radio;
      subT = (t - 0.28) / 0.24;
    } else if (t < 0.84) {
      seq = DONO_SEQUENCES.dono_atividade_energy;
      subT = (t - 0.52) / 0.32;
    } else {
      seq = DONO_SEQUENCES.dono_atividade_end;
      subT = (t - 0.84) / 0.16;
    }
    return {
      sequence: seq,
      frameIndex: Math.min(seq.frameCount - 1, Math.floor(subT * seq.frameCount)),
      alpha: camoAlpha,
      phase,
    };
  }

  // Special 3: Camuflagem de Cria (put on military camo -> turn ghosted invisible)
  if (f.action === 'special3') {
    const dur = Math.max(0.24, f.actionDuration || 0.36);
    const t = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    let seq: DonoSequenceMeta;
    let subT: number;
    let alpha = 1;
    if (t < 0.3) {
      seq = DONO_SEQUENCES.dono_camuflagem_start;
      subT = t / 0.3;
    } else if (t < 0.65) {
      seq = DONO_SEQUENCES.dono_camuflagem_change;
      subT = (t - 0.3) / 0.35;
    } else {
      seq = DONO_SEQUENCES.dono_camuflagem_invisible;
      subT = (t - 0.65) / 0.35;
      alpha = 0.72;
    }
    return {
      sequence: seq,
      frameIndex: Math.min(seq.frameCount - 1, Math.floor(subT * seq.frameCount)),
      alpha,
      phase,
    };
  }

  // Special 4: Onda da MaryJuana (smoke -> green aura -> sprint boost)
  if (f.action === 'special4') {
    const dur = Math.max(0.24, f.actionDuration || 0.4);
    const t = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    let seq: DonoSequenceMeta;
    let subT: number;
    if (t < 0.32) {
      seq = DONO_SEQUENCES.dono_maryjuana_start;
      subT = t / 0.32;
    } else if (t < 0.68) {
      seq = DONO_SEQUENCES.dono_maryjuana_smoke;
      subT = (t - 0.32) / 0.36;
    } else {
      seq = DONO_SEQUENCES.dono_maryjuana_boost;
      subT = (t - 0.68) / 0.32;
    }
    return {
      sequence: seq,
      frameIndex: Math.min(seq.frameCount - 1, Math.floor(subT * seq.frameCount)),
      alpha: camoAlpha,
      phase,
    };
  }

  // If actively camouflaged while idling, preserve ghosted military camo stealth silhouette
  if (f.donoCamoTime > 0 && f.action === 'idle' && !landing) {
    const seq = DONO_SEQUENCES.dono_camuflagem_invisible;
    const t = Math.max(0, globalTime + f.slot * 0.2);
    return {
      sequence: seq,
      frameIndex: Math.floor(t * seq.fps) % seq.frameCount,
      alpha: 0.58,
      phase,
    };
  }

  const seqKey = mapActionToDonoSequence(f.action, isBackward, {
    landing,
    reloading,
    speedBuffActive,
  });
  const seq = DONO_SEQUENCES[seqKey];
  let frameIndex = 0;

  if (f.action === 'jump') {
    if (f.vy < -140) frameIndex = 0;
    else if (f.vy < -25) frameIndex = 1;
    else if (f.vy <= 90) frameIndex = 2;
    else frameIndex = 3;
  } else if (landing) {
    const prog = Math.max(0, Math.min(0.9999, 1 - f.landingTime / 0.22));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'hitstun' || f.action === 'grabbed' || f.action === 'stun') {
    const dur = Math.max(0.15, f.actionDuration || 0.35);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'ko') {
    frameIndex = seq.frameCount - 1;
  } else if (f.action === 'walk' || f.action === 'run' || f.action === 'roll') {
    frameIndex = Math.floor(Math.max(0, f.actionTime) * seq.fps) % seq.frameCount;
  } else if (f.action === 'idle') {
    const t = Math.max(0, globalTime + f.slot * 0.25);
    frameIndex = Math.floor(t * seq.fps) % seq.frameCount;
  } else if (f.action === 'victory') {
    const rawIdx = Math.floor(Math.max(0, f.actionTime) * seq.fps);
    frameIndex = Math.min(seq.frameCount - 1, rawIdx);
  } else if (seq.loop) {
    frameIndex = Math.floor(Math.max(0, f.actionTime) * seq.fps) % seq.frameCount;
  } else if (f.actionDuration > 0 && (f.currentMove || f.action === 'grab_throw' || f.action === 'getup' || f.action === 'standup')) {
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
    alpha: camoAlpha,
    phase,
  };
}
