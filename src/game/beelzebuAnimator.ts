import { FighterAction, FighterState } from './types';

export type BeelzebuSequenceKey =
  | 'beelzebu_idle'
  | 'beelzebu_walk_forward'
  | 'beelzebu_walk_backward'
  | 'beelzebu_run_forward'
  | 'beelzebu_run_backward'
  | 'beelzebu_jump'
  | 'beelzebu_jump_attack'
  | 'beelzebu_landing'
  | 'beelzebu_crouch'
  | 'beelzebu_block'
  | 'beelzebu_block_impact'
  | 'beelzebu_jab'
  | 'beelzebu_heavy_punch'
  | 'beelzebu_light_kick'
  | 'beelzebu_front_kick'
  | 'beelzebu_heavy_kick'
  | 'beelzebu_air_kick'
  | 'beelzebu_hit'
  | 'beelzebu_knockdown'
  | 'beelzebu_get_up'
  | 'beelzebu_victory'
  | 'beelzebu_malboro_start'
  | 'beelzebu_malboro_smoke'
  | 'beelzebu_veneno_charge'
  | 'beelzebu_cranio_summon'
  | 'beelzebu_dominio_charge'
  | 'beelzebu_dominio_end';

export interface BeelzebuSequenceMeta {
  key: BeelzebuSequenceKey;
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
export const BEELZEBU_RENDER_SCALE = 0.49;

// Exact victory quote exclusive to Beelzebu
export const BEELZEBU_VICTORY_QUOTE = 'A morte... é só o começo.';

// Animation speeds & frame metadata matching /public/assets/beelzebu/manifest.json
export const BEELZEBU_SEQUENCES: Record<BeelzebuSequenceKey, BeelzebuSequenceMeta> = {
  beelzebu_idle: {
    key: 'beelzebu_idle',
    file: '/assets/beelzebu/animations/beelzebu_idle.png',
    frameWidth: 126,
    frameHeight: 156,
    frameCount: 4,
    fps: 8,
    loop: true,
    anchorX: 58,
    anchorY: 152,
  },
  beelzebu_walk_forward: {
    key: 'beelzebu_walk_forward',
    file: '/assets/beelzebu/animations/beelzebu_walk_forward.png',
    frameWidth: 122,
    frameHeight: 162,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 55,
    anchorY: 157,
  },
  beelzebu_walk_backward: {
    key: 'beelzebu_walk_backward',
    file: '/assets/beelzebu/animations/beelzebu_walk_backward.png',
    frameWidth: 122,
    frameHeight: 162,
    frameCount: 4,
    fps: 12,
    loop: true,
    anchorX: 55,
    anchorY: 157,
  },
  beelzebu_run_forward: {
    key: 'beelzebu_run_forward',
    file: '/assets/beelzebu/animations/beelzebu_run_forward.png',
    frameWidth: 218,
    frameHeight: 130,
    frameCount: 5,
    fps: 16,
    loop: true,
    anchorX: 60,
    anchorY: 125,
  },
  beelzebu_run_backward: {
    key: 'beelzebu_run_backward',
    file: '/assets/beelzebu/animations/beelzebu_run_backward.png',
    frameWidth: 218,
    frameHeight: 130,
    frameCount: 5,
    fps: 16,
    loop: true,
    anchorX: 60,
    anchorY: 125,
  },
  beelzebu_jump: {
    key: 'beelzebu_jump',
    file: '/assets/beelzebu/animations/beelzebu_jump.png',
    frameWidth: 138,
    frameHeight: 144,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 54,
    anchorY: 139,
  },
  beelzebu_jump_attack: {
    key: 'beelzebu_jump_attack',
    file: '/assets/beelzebu/animations/beelzebu_jump_attack.png',
    frameWidth: 182,
    frameHeight: 166,
    frameCount: 6,
    fps: 15,
    loop: false,
    anchorX: 58,
    anchorY: 161,
  },
  beelzebu_landing: {
    key: 'beelzebu_landing',
    file: '/assets/beelzebu/animations/beelzebu_landing.png',
    frameWidth: 132,
    frameHeight: 126,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 74,
    anchorY: 121,
  },
  beelzebu_crouch: {
    key: 'beelzebu_crouch',
    file: '/assets/beelzebu/animations/beelzebu_crouch.png',
    frameWidth: 128,
    frameHeight: 104,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 61,
    anchorY: 99,
  },
  beelzebu_block: {
    key: 'beelzebu_block',
    file: '/assets/beelzebu/animations/beelzebu_block.png',
    frameWidth: 130,
    frameHeight: 144,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 63,
    anchorY: 139,
  },
  beelzebu_block_impact: {
    key: 'beelzebu_block_impact',
    file: '/assets/beelzebu/animations/beelzebu_block_impact.png',
    frameWidth: 124,
    frameHeight: 140,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 59,
    anchorY: 136,
  },
  beelzebu_jab: {
    key: 'beelzebu_jab',
    file: '/assets/beelzebu/animations/beelzebu_jab.png',
    frameWidth: 160,
    frameHeight: 140,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 76,
    anchorY: 135,
  },
  beelzebu_heavy_punch: {
    key: 'beelzebu_heavy_punch',
    file: '/assets/beelzebu/animations/beelzebu_heavy_punch.png',
    frameWidth: 178,
    frameHeight: 144,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 85,
    anchorY: 139,
  },
  beelzebu_light_kick: {
    key: 'beelzebu_light_kick',
    file: '/assets/beelzebu/animations/beelzebu_light_kick.png',
    frameWidth: 156,
    frameHeight: 162,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 52,
    anchorY: 157,
  },
  beelzebu_front_kick: {
    key: 'beelzebu_front_kick',
    file: '/assets/beelzebu/animations/beelzebu_front_kick.png',
    frameWidth: 180,
    frameHeight: 164,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 67,
    anchorY: 159,
  },
  beelzebu_heavy_kick: {
    key: 'beelzebu_heavy_kick',
    file: '/assets/beelzebu/animations/beelzebu_heavy_kick.png',
    frameWidth: 162,
    frameHeight: 184,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 63,
    anchorY: 180,
  },
  beelzebu_air_kick: {
    key: 'beelzebu_air_kick',
    file: '/assets/beelzebu/animations/beelzebu_air_kick.png',
    frameWidth: 178,
    frameHeight: 166,
    frameCount: 4,
    fps: 15,
    loop: false,
    anchorX: 54,
    anchorY: 161,
  },
  beelzebu_hit: {
    key: 'beelzebu_hit',
    file: '/assets/beelzebu/animations/beelzebu_hit.png',
    frameWidth: 218,
    frameHeight: 142,
    frameCount: 3,
    fps: 12,
    loop: false,
    anchorX: 114,
    anchorY: 138,
  },
  beelzebu_knockdown: {
    key: 'beelzebu_knockdown',
    file: '/assets/beelzebu/animations/beelzebu_knockdown.png',
    frameWidth: 218,
    frameHeight: 142,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 114,
    anchorY: 138,
  },
  beelzebu_get_up: {
    key: 'beelzebu_get_up',
    file: '/assets/beelzebu/animations/beelzebu_get_up.png',
    frameWidth: 164,
    frameHeight: 126,
    frameCount: 4,
    fps: 12,
    loop: false,
    anchorX: 78,
    anchorY: 121,
  },
  beelzebu_victory: {
    key: 'beelzebu_victory',
    file: '/assets/beelzebu/animations/beelzebu_victory.png',
    frameWidth: 160,
    frameHeight: 158,
    frameCount: 4,
    fps: 10,
    loop: false,
    anchorX: 77,
    anchorY: 154,
  },
  beelzebu_malboro_start: {
    key: 'beelzebu_malboro_start',
    file: '/assets/beelzebu/animations/beelzebu_malboro_start.png',
    frameWidth: 122,
    frameHeight: 144,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 62,
    anchorY: 139,
  },
  beelzebu_malboro_smoke: {
    key: 'beelzebu_malboro_smoke',
    file: '/assets/beelzebu/animations/beelzebu_malboro_smoke.png',
    frameWidth: 192,
    frameHeight: 152,
    frameCount: 2,
    fps: 15,
    loop: false,
    anchorX: 81,
    anchorY: 148,
  },
  beelzebu_veneno_charge: {
    key: 'beelzebu_veneno_charge',
    file: '/assets/beelzebu/animations/beelzebu_veneno_charge.png',
    frameWidth: 144,
    frameHeight: 126,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 70,
    anchorY: 121,
  },
  beelzebu_cranio_summon: {
    key: 'beelzebu_cranio_summon',
    file: '/assets/beelzebu/animations/beelzebu_cranio_summon.png',
    frameWidth: 152,
    frameHeight: 166,
    frameCount: 5,
    fps: 15,
    loop: false,
    anchorX: 72,
    anchorY: 161,
  },
  beelzebu_dominio_charge: {
    key: 'beelzebu_dominio_charge',
    file: '/assets/beelzebu/animations/beelzebu_dominio_charge.png',
    frameWidth: 160,
    frameHeight: 158,
    frameCount: 3,
    fps: 15,
    loop: false,
    anchorX: 77,
    anchorY: 154,
  },
  beelzebu_dominio_end: {
    key: 'beelzebu_dominio_end',
    file: '/assets/beelzebu/animations/beelzebu_dominio_end.png',
    frameWidth: 160,
    frameHeight: 158,
    frameCount: 2,
    fps: 12,
    loop: false,
    anchorX: 77,
    anchorY: 154,
  },
};

export function mapActionToBeelzebuSequence(
  action: FighterAction,
  isBackward = false,
  options?: { blockImpact?: boolean; landing?: boolean; airAttackKind?: 'punch' | 'kick' }
): BeelzebuSequenceKey {
  switch (action) {
    case 'walk':
      return isBackward ? 'beelzebu_walk_backward' : 'beelzebu_walk_forward';
    case 'run':
    case 'roll':
      return isBackward ? 'beelzebu_run_backward' : 'beelzebu_run_forward';
    case 'jump':
      return 'beelzebu_jump';
    case 'crouch':
      return 'beelzebu_crouch';
    case 'standup':
    case 'getup':
      return 'beelzebu_get_up';
    case 'block':
      return options?.blockImpact ? 'beelzebu_block_impact' : 'beelzebu_block';
    case 'punch':
    case 'crouch_punch':
    case 'grab_attempt':
      return 'beelzebu_jab';
    case 'heavy_punch':
    case 'grab_throw':
      return 'beelzebu_heavy_punch';
    case 'kick':
      return 'beelzebu_front_kick';
    case 'crouch_kick':
      return 'beelzebu_light_kick';
    case 'heavy_kick':
      return 'beelzebu_heavy_kick';
    case 'air_kick':
      return options?.airAttackKind === 'punch' ? 'beelzebu_jump_attack' : 'beelzebu_air_kick';
    case 'special1':
      return 'beelzebu_malboro_start';
    case 'special2':
      return 'beelzebu_veneno_charge';
    case 'special3':
      return 'beelzebu_cranio_summon';
    case 'special4':
      return 'beelzebu_dominio_charge';
    case 'hitstun':
    case 'grabbed':
    case 'stun':
      return 'beelzebu_hit';
    case 'knockdown':
    case 'ko':
      return 'beelzebu_knockdown';
    case 'victory':
      return 'beelzebu_victory';
    case 'idle':
    default:
      return options?.landing ? 'beelzebu_landing' : 'beelzebu_idle';
  }
}

export interface ResolvedBeelzebuFrame {
  sequence: BeelzebuSequenceMeta;
  frameIndex: number;
  alpha: number;
  phase: 'startup' | 'active' | 'recovery' | 'neutral';
}

export function resolveBeelzebuFrame(f: FighterState, globalTime = 0): ResolvedBeelzebuFrame {
  const isBackward = f.vx * f.facing < -1;
  const blockImpact = f.blockImpactTime > 0;
  const landing = f.action === 'idle' && f.landingTime > 0;

  let seqKey = mapActionToBeelzebuSequence(f.action, isBackward, {
    blockImpact,
    landing,
    airAttackKind: f.airAttackKind,
  });

  let phase: ResolvedBeelzebuFrame['phase'] = 'neutral';
  if (f.currentMove) {
    if (f.actionTime < f.currentMove.startup) phase = 'startup';
    else if (f.actionTime <= f.currentMove.startup + f.currentMove.active) phase = 'active';
    else phase = 'recovery';
  }

  // Special 1 (Malboro): startup -> beelzebu_malboro_start, active/recovery -> beelzebu_malboro_smoke
  if (f.action === 'special1') {
    const startup = Math.max(0.06, f.currentMove?.startup ?? 0.2);
    if (phase === 'startup') {
      const seq = BEELZEBU_SEQUENCES.beelzebu_malboro_start;
      const prog = Math.max(0, Math.min(0.9999, f.actionTime / startup));
      return {
        sequence: seq,
        frameIndex: Math.floor(prog * seq.frameCount),
        alpha: 1,
        phase,
      };
    }
    const seq = BEELZEBU_SEQUENCES.beelzebu_malboro_smoke;
    const postDur = Math.max(0.1, (f.actionDuration || 0.64) - startup);
    const postProg = Math.max(0, Math.min(0.9999, (f.actionTime - startup) / postDur));
    return {
      sequence: seq,
      frameIndex: Math.floor(postProg * seq.frameCount),
      alpha: 1,
      phase,
    };
  }

  // Special 4 (Domínio das Sombras): startup/active -> beelzebu_dominio_charge, recovery -> beelzebu_dominio_end
  if (f.action === 'special4') {
    if (phase === 'recovery') {
      const seq = BEELZEBU_SEQUENCES.beelzebu_dominio_end;
      const activeEnd = Math.max(0.1, (f.currentMove?.startup ?? 0.22) + (f.currentMove?.active ?? 0.32));
      const recDur = Math.max(0.1, (f.actionDuration || 0.82) - activeEnd);
      const recProg = Math.max(0, Math.min(0.9999, (f.actionTime - activeEnd) / recDur));
      return {
        sequence: seq,
        frameIndex: Math.floor(recProg * seq.frameCount),
        alpha: 1,
        phase,
      };
    }
    const seq = BEELZEBU_SEQUENCES.beelzebu_dominio_charge;
    const activeEnd = Math.max(0.1, (f.currentMove?.startup ?? 0.22) + (f.currentMove?.active ?? 0.32));
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / activeEnd));
    return {
      sequence: seq,
      frameIndex: Math.floor(prog * seq.frameCount),
      alpha: 1,
      phase,
    };
  }

  const seq = BEELZEBU_SEQUENCES[seqKey];
  let frameIndex = 0;

  if (f.action === 'jump') {
    if (f.vy < -150) frameIndex = 0;
    else if (f.vy < -30) frameIndex = 1;
    else if (f.vy <= 90) frameIndex = 2;
    else frameIndex = 3;
  } else if (f.action === 'block' && blockImpact) {
    const prog = Math.max(0, Math.min(0.9999, 1 - f.blockImpactTime / 0.24));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (landing) {
    const prog = Math.max(0, Math.min(0.9999, 1 - f.landingTime / 0.22));
    frameIndex = Math.floor(prog * seq.frameCount);
  } else if (f.action === 'special2' || f.action === 'special3') {
    const dur = Math.max(0.12, f.actionDuration || 0.56);
    const prog = Math.max(0, Math.min(0.9999, f.actionTime / dur));
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
    alpha: 1,
    phase,
  };
}
