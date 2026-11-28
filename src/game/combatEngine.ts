import {
  CHARACTERS,
  GRAVITY,
  GROUND_Y,
  NORMAL_MOVES,
  STAGE_LEFT_BOUND,
  STAGE_RIGHT_BOUND,
  STAGE_WIDTH,
} from './roster';
import {
  ArenaHazard,
  ArenaId,
  CharacterId,
  Difficulty,
  FighterAction,
  FighterState,
  GameMode,
  InputState,
  MatchState,
  MoveSpec,
  Particle,
  Projectile,
  SpecialSlot,
  VisualEffect,
  VisualEffectKind,
} from './types';
import {
  DONO_ATIVIDADE_ENERGY_GAIN,
  DONO_CAMUFLAGEM_DURATION,
  DONO_MARYJUANA_DURATION,
  DONO_MARYJUANA_SPEED_MULTIPLIER,
  DONO_MAX_AMMO,
  DONO_RELOAD_DURATION,
} from './donoAnimator';
import { ADAO_SPECIAL3_CHARGE_DURATION } from './adaoAnimator';
import {
  JACK_BLEED_DURATION,
  JACK_KNIFE_RECHARGE_SECONDS,
  JACK_MAX_KNIVES,
  JACK_SOUL_EYE_SLOW_DURATION,
  JACK_VULNERABLE_DAMAGE_MULTIPLIER,
  JACK_VULNERABLE_DURATION,
} from './jackAnimator';

const PARTICLE_POOL_SIZE = 180;

export function createEmptyInput(): InputState {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    block: false,
    punchPressed: false,
    kickPressed: false,
    grabPressed: false,
    special1Pressed: false,
    special2Pressed: false,
    special3Pressed: false,
    special3Held: false,
    special4Pressed: false,
  };
}

export function createFighter(slot: 1 | 2, characterId: CharacterId, roundsWon = 0): FighterState {
  const def = CHARACTERS[characterId];
  return {
    slot,
    characterId,
    x: slot === 1 ? 135 : 345,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: slot === 1 ? 1 : -1,
    hp: def.maxHp,
    ghostHp: def.maxHp,
    maxHp: def.maxHp,
    energy: 50,
    action: 'idle',
    actionTime: 0,
    actionDuration: 0,
    currentMove: null,
    hitConnectedThisMove: false,
    multiHitsDone: 0,
    hitstunTime: 0,
    hitFlashTime: 0,
    invulnTime: 0,
    slowTime: 0,
    rootTime: 0,
    shieldTime: 0,
    furyTime: 0,
    furyCooldown: 0,
    furyReverseTime: 0,
    stunTime: 0,
    slipTime: 0,
    specialLockTime: 0,
    special1Cooldown: 0,
    specialCooldowns: {
      special1: 0,
      special2: 0,
      special3: 0,
      special4: 0,
    },
    cageUsesThisRound: 0,
    poisonTime: 0,
    poisonTickTimer: 0,
    poisonSourceSlot: null,
    blockImpactTime: 0,
    landingTime: 0,
    skullHitCooldown: 0,
    donoAmmo: DONO_MAX_AMMO,
    donoReloadTimer: 0,
    donoCamoTime: 0,
    donoSpeedTime: 0,
    donoEnergyGainFlash: 0,
    adaoCopiedCharacterId: null,
    adaoCopiedSpecial: null,
    adaoCopiedSourceSlot: null,
    adaoCopiedUsedThisRound: false,
    adaoChargingSpecial3: false,
    adaoChargeTime: 0,
    adaoChargeCooldownLock: false,
    jackKnives: 0,
    jackKnifeTimer: 0,
    bleedTime: 0,
    bleedTickTimer: 0,
    bleedSourceSlot: null,
    vulnerableTime: 0,
    airAttackKind: 'kick',
    isLowBlock: false,
    comboCount: 0,
    comboTimer: 0,
    roundsWon,
    totalDamageDealt: 0,
    maxComboAchieved: 0,
    squashX: 1,
    squashY: 1,
    walkDistance: 0,
    moveHoldTime: 0,
    moveDir: 0,
    aiCooldown: 0.4,
    aiDecisionTimer: 0,
    aiIntent: 'approach',
  };
}

function createParticlePool(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    pool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 2,
      color: '#ffffff',
      life: 0,
      maxLife: 1,
      gravity: 0,
      kind: 'pixel',
    });
  }
  return pool;
}

export function spawnParticle(
  state: MatchState,
  opts: Partial<Particle> & { x: number; y: number; color: string }
): void {
  const pool = state.particles;
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) {
      p.active = true;
      p.x = opts.x;
      p.y = opts.y;
      p.vx = opts.vx ?? 0;
      p.vy = opts.vy ?? 0;
      p.size = opts.size ?? 3;
      p.color = opts.color;
      p.maxLife = opts.maxLife ?? 0.35;
      p.life = p.maxLife;
      p.gravity = opts.gravity ?? 0;
      p.kind = opts.kind ?? 'pixel';
      p.text = opts.text;
      return;
    }
  }
}

export function spawnBurst(
  state: MatchState,
  x: number,
  y: number,
  color: string,
  secondaryColor: string,
  count: number,
  speed = 110,
  kind: Particle['kind'] = 'spark'
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + ((i % 3) - 1) * 0.22;
    const mag = speed * (0.45 + ((i * 37) % 10) / 14);
    spawnParticle(state, {
      x,
      y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag - 25,
      size: i % 3 === 0 ? 4 : 2,
      color: i % 2 === 0 ? color : secondaryColor,
      maxLife: 0.22 + ((i * 19) % 10) * 0.025,
      gravity: kind === 'smoke' ? -30 : 220,
      kind,
    });
  }
}

export function createMatchState(
  p1Char: CharacterId,
  p2Char: CharacterId,
  arenaId: ArenaId,
  mode: GameMode,
  difficulty: Difficulty,
  skipIntro = false
): MatchState {
  return {
    mode,
    difficulty,
    arenaId,
    roundNumber: 1,
    roundPhase: skipIntro ? 'fighting' : 'intro',
    phaseTimer: skipIntro ? 0 : 1.35,
    roundTimeLeft: 99,
    elapsedMatchTime: 0,
    hitstopTimer: 0,
    shakeTrauma: 0,
    winnerSlot: null,
    roundBannerText: skipIntro ? '' : 'ROUND 1',
    f1: createFighter(1, p1Char, 0),
    f2: createFighter(2, p2Char, 0),
    projectiles: [],
    hazards: [],
    particles: createParticlePool(),
    visualEffects: [],
    nextEntityId: 1,
    events: [],
    finisherTriggered: false,
  };
}

export function spawnVisualEffect(
  state: MatchState,
  opts: {
    kind: VisualEffectKind;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    facing?: 1 | -1;
    scale?: number;
    alpha?: number;
    rotation?: number;
    maxLife?: number;
  }
): void {
  state.visualEffects.push({
    id: state.nextEntityId++,
    kind: opts.kind,
    x: opts.x,
    y: opts.y,
    vx: opts.vx ?? 0,
    vy: opts.vy ?? 0,
    facing: opts.facing ?? 1,
    scale: opts.scale ?? 0.62,
    alpha: opts.alpha ?? 1,
    rotation: opts.rotation ?? 0,
    life: opts.maxLife ?? 0.36,
    maxLife: opts.maxLife ?? 0.36,
  });
}

function resetRoundState(state: MatchState): void {
  const f1Rounds = state.f1.roundsWon;
  const f2Rounds = state.f2.roundsWon;
  const f1Dmg = state.f1.totalDamageDealt;
  const f2Dmg = state.f2.totalDamageDealt;
  const f1Combo = state.f1.maxComboAchieved;
  const f2Combo = state.f2.maxComboAchieved;

  state.f1 = createFighter(1, state.f1.characterId, f1Rounds);
  state.f2 = createFighter(2, state.f2.characterId, f2Rounds);
  state.f1.totalDamageDealt = f1Dmg;
  state.f2.totalDamageDealt = f2Dmg;
  state.f1.maxComboAchieved = f1Combo;
  state.f2.maxComboAchieved = f2Combo;

  state.projectiles = [];
  state.hazards = [];
  state.visualEffects = [];
  state.roundTimeLeft = 99;
  state.roundPhase = 'intro';
  state.phaseTimer = 1.35;
  state.roundBannerText = `ROUND ${state.roundNumber}`;
  state.hitstopTimer = 0;
  state.shakeTrauma = 0;
}

export function getFighterHurtbox(f: FighterState) {
  const def = CHARACTERS[f.characterId];
  const isLow = f.action === 'crouch' || f.action === 'crouch_punch' || f.action === 'crouch_kick' || (f.action === 'block' && f.y >= GROUND_Y);
  const h = isLow ? Math.round(def.height * 0.65) : def.height;
  return {
    x: f.x - def.width / 2,
    y: f.y - h,
    width: def.width,
    height: h,
  };
}

export function getMoveHitbox(f: FighterState, move: MoveSpec) {
  if (move.kind === 'aoe') {
    return {
      x: f.x - move.rangeX,
      y: f.y + move.offsetY - move.rangeY / 2,
      width: move.rangeX * 2,
      height: move.rangeY,
    };
  }
  const startX = f.facing === 1 ? f.x + 2 : f.x - 2 - move.rangeX;
  return {
    x: startX,
    y: f.y + move.offsetY - move.rangeY / 2,
    width: move.rangeX,
    height: move.rangeY,
  };
}

export function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function clampFighterX(x: number, width: number): number {
  const half = width / 2;
  return Math.max(STAGE_LEFT_BOUND + half, Math.min(STAGE_RIGHT_BOUND - half, x));
}

function canAct(f: FighterState): boolean {
  return (
    f.action === 'idle' ||
    f.action === 'walk' ||
    f.action === 'run' ||
    f.action === 'crouch' ||
    f.action === 'standup' ||
    f.action === 'block' ||
    f.action === 'jump'
  );
}

function isAttacking(action: FighterAction): boolean {
  return (
    action === 'punch' ||
    action === 'kick' ||
    action === 'heavy_punch' ||
    action === 'heavy_kick' ||
    action === 'crouch_punch' ||
    action === 'crouch_kick' ||
    action === 'air_kick' ||
    action === 'grab_attempt' ||
    action === 'special1' ||
    action === 'special2' ||
    action === 'special3' ||
    action === 'special4'
  );
}

export function getEffectiveSpecial(f: FighterState, slotKey: SpecialSlot): MoveSpec {
  if (f.characterId === 'adao' && slotKey === 'special2' && f.adaoCopiedSpecial) {
    return f.adaoCopiedSpecial;
  }
  return CHARACTERS[f.characterId].specials[slotKey];
}

const ADAO_COPY_SLOT_MAP: Partial<Record<CharacterId, SpecialSlot>> = {
  ninja: 'special1',
  minotaur: 'special1',
  elf: 'special1',
  necromancer: 'special1',
  priest: 'special1',
  troll: 'special2',
  jaylon: 'special1',
  tesla: 'special1',
  beelzebu: 'special2',
  dono: 'special1',
  adao: 'special1',
  jack: 'special4',
};

function pickCopiedSpecialForAdao(oppCharId: CharacterId): { sourceSlot: SpecialSlot; move: MoveSpec } {
  const sourceSlot: SpecialSlot = ADAO_COPY_SLOT_MAP[oppCharId] ?? 'special1';
  const src = CHARACTERS[oppCharId].specials[sourceSlot];
  return {
    sourceSlot,
    move: {
      ...src,
      id: 'special2',
      name: `Replicação: ${src.name}`,
      energyCost: Math.max(16, Math.min(28, src.energyCost || 20)),
    },
  };
}

function startMove(state: MatchState, f: FighterState, opp: FighterState, move: MoveSpec): void {
  f.action = move.id;
  f.actionTime = 0;
  f.actionDuration = move.startup + move.active + move.recovery;
  f.currentMove = move;
  f.hitConnectedThisMove = false;
  f.multiHitsDone = 0;

  if (f.characterId === 'jack' && move.id === 'special1') {
    const requested = move.jackThrowCount ?? Math.max(1, f.jackKnives);
    const actualCount = Math.max(1, Math.min(JACK_MAX_KNIVES, Math.max(1, f.jackKnives), requested));
    f.jackKnives = Math.max(0, f.jackKnives - actualCount);
    f.currentMove = { ...move, jackThrowCount: actualCount };
  }

  if (move.energyCost > 0) {
    f.energy = Math.max(0, f.energy - move.energyCost);
    if (f.characterId === 'tesla' && move.id === 'special1') {
      f.special1Cooldown = 0.85;
    }
    if (f.characterId === 'tesla' && move.id === 'special4') {
      f.cageUsesThisRound += 1;
    }
    if (
      f.characterId === 'beelzebu' &&
      (move.id === 'special1' || move.id === 'special2' || move.id === 'special3' || move.id === 'special4')
    ) {
      const cdMap: Record<SpecialSlot, number> = {
        special1: 1.6,
        special2: 1.35,
        special3: 2.2,
        special4: 4.5,
      };
      f.specialCooldowns[move.id] = cdMap[move.id];
    }
    state.events.push({
      type: 'special',
      slot: f.slot,
      x: f.x,
      y: f.y - 36,
      label: move.name,
    });
  }

  if (f.characterId === 'dono') {
    if (move.id === 'special1') {
      f.donoAmmo = Math.max(0, f.donoAmmo - 1);
      if (f.x !== opp.x) {
        f.facing = opp.x > f.x ? 1 : -1;
      }
    } else if (move.id === 'special2') {
      f.specialCooldowns.special2 = 2.8;
      state.events.push({
        type: 'special',
        slot: f.slot,
        x: f.x,
        y: f.y - 36,
        label: move.name,
      });
    } else if (move.id === 'special3') {
      f.specialCooldowns.special3 = 4.2;
    } else if (move.id === 'special4') {
      f.specialCooldowns.special4 = 4.8;
    }
  }

  if (f.y >= GROUND_Y) {
    f.vx = 0;
  }

  if (move.kind === 'leap_slam') {
    f.vx = 0;
    f.vy = 0;
  }

  // Face opponent at move start
  if (f.x !== opp.x) {
    f.facing = opp.x > f.x ? 1 : -1;
  }
}

function applyHit(
  state: MatchState,
  attacker: FighterState,
  defender: FighterState,
  opts: {
    damage: number;
    chipDamage: number;
    knockbackX: number;
    knockbackY: number;
    hitstun: number;
    isLow?: boolean;
    isOverhead?: boolean;
    isGrab?: boolean;
    isSpecial?: boolean;
    bypassBlock?: boolean;
    instantKo?: boolean;
    effectColor: string;
    secondaryColor: string;
    statusEffect?: 'slow' | 'root' | 'shield' | 'fury' | 'stun' | 'special_lock' | 'poison' | 'bleed_vuln';
    attackDir: 1 | -1;
  }
): void {
  if (defender.invulnTime > 0 || defender.action === 'ko' || defender.action === 'grabbed') {
    return;
  }

  const defenderDef = CHARACTERS[defender.characterId];
  const furyMul = attacker.furyTime > 0 ? 1.35 : 1;
  const vulnMul = defender.vulnerableTime > 0 ? JACK_VULNERABLE_DAMAGE_MULTIPLIER : 1;
  const rawDamage = Math.round(opts.damage * furyMul * vulnMul);

  // Check blocking (grabs and unblockable attacks bypass block!)
  const isGrounded = defender.y >= GROUND_Y - 1;
  const isBlocking = defender.action === 'block' && isGrounded && !opts.isGrab && !opts.bypassBlock;
  if (isBlocking) {
    const chip = Math.max(1, Math.round(opts.chipDamage));
    defender.hp = Math.max(0, defender.hp - chip);
    defender.vx = opts.attackDir * (opts.knockbackX * 0.42);
    defender.blockImpactTime = 0.24;
    defender.energy = Math.min(100, defender.energy + 4);
    attacker.energy = Math.min(100, attacker.energy + 3);
    attacker.totalDamageDealt += chip;
    state.hitstopTimer = Math.max(state.hitstopTimer, 0.025);
    spawnBurst(state, defender.x, defender.y - 32, '#93c5fd', '#ffffff', 7, 85, 'spark');
    state.events.push({ type: 'block', slot: defender.slot, x: defender.x, y: defender.y - 32 });
    return;
  }

  // Time Transcending Fist instant K.O. (unblockable, clean energy burst with zero gore)
  if (opts.instantKo) {
    const koDamage = Math.max(defender.hp, rawDamage);
    defender.hp = 0;
    defender.adaoChargingSpecial3 = false;
    defender.adaoChargeTime = 0;
    defender.hitFlashTime = 0.12;
    attacker.totalDamageDealt += koDamage;
    attacker.energy = Math.min(100, attacker.energy + 12);
    attacker.comboCount += 1;
    attacker.comboTimer = 1.65;
    if (attacker.comboCount > attacker.maxComboAchieved) {
      attacker.maxComboAchieved = attacker.comboCount;
    }
    const weightDiv = defenderDef.weight;
    defender.vx = opts.attackDir * (opts.knockbackX / weightDiv);
    defender.vy = opts.knockbackY / weightDiv;
    defender.hitstunTime = opts.hitstun;
    defender.action = 'knockdown';
    defender.actionTime = 0;
    defender.actionDuration = opts.hitstun;
    defender.currentMove = null;
    state.hitstopTimer = Math.max(state.hitstopTimer, 0.09);
    state.shakeTrauma = 0.85;
    spawnBurst(state, defender.x, defender.y - 34, '#9333ea', '#e9d5ff', 24, 155, 'spark');
    spawnParticle(state, {
      x: defender.x,
      y: defender.y - 34,
      color: '#a855f7',
      size: 14,
      maxLife: 0.55,
      kind: 'ring',
    });
    spawnParticle(state, {
      x: defender.x,
      y: defender.y - defenderDef.height - 14,
      vy: -24,
      color: '#e9d5ff',
      maxLife: 0.9,
      kind: 'text',
      text: 'TRANSCENDÊNCIA!',
    });
    state.events.push({
      type: 'hit_heavy',
      slot: attacker.slot,
      x: defender.x,
      y: defender.y - 32,
    });
    return;
  }

  // Adão super-armor while charging Special 3: normal hits cannot interrupt charging!
  const armoredCharging =
    defender.characterId === 'adao' && defender.adaoChargingSpecial3 && !opts.isGrab && !opts.isSpecial;
  if (defender.characterId === 'adao' && defender.adaoChargingSpecial3 && (opts.isGrab || opts.isSpecial)) {
    defender.adaoChargingSpecial3 = false;
    defender.adaoChargeTime = 0;
  }

  // Priest Sacred Shield mitigation
  const shieldMul = defender.shieldTime > 0 && !opts.isGrab ? 0.35 : 1;
  const finalDamage = Math.max(1, Math.round(rawDamage * shieldMul));

  defender.hp = Math.max(0, defender.hp - finalDamage);
  defender.hitFlashTime = 0.08;
  if (defender.characterId === 'dono' && defender.donoCamoTime > 0) {
    defender.donoCamoTime = 0;
  }
  attacker.totalDamageDealt += finalDamage;

  // Energy gain
  attacker.energy = Math.min(100, attacker.energy + 8);
  defender.energy = Math.min(100, defender.energy + 5);

  // Combo counter
  if (defender.action === 'hitstun' || defender.action === 'knockdown' || defender.y < GROUND_Y - 2) {
    attacker.comboCount += 1;
  } else {
    attacker.comboCount = 1;
  }
  attacker.comboTimer = 1.65;
  if (attacker.comboCount > attacker.maxComboAchieved) {
    attacker.maxComboAchieved = attacker.comboCount;
  }

  if (attacker.comboCount >= 2) {
    spawnParticle(state, {
      x: defender.x,
      y: defender.y - defenderDef.height - 8,
      vx: 0,
      vy: -24,
      color: attacker.comboCount >= 4 ? '#fde047' : '#fb923c',
      maxLife: 0.75,
      kind: 'text',
      text: `${attacker.comboCount} HITS!`,
    });
  }

  // Status effects
  if (opts.statusEffect === 'slow') {
    defender.slowTime = 3.0;
    spawnBurst(state, defender.x, defender.y - 28, '#38bdf8', '#e0f2fe', 14, 95, 'spark');
  } else if (opts.statusEffect === 'root') {
    defender.rootTime = 1.35;
    spawnBurst(state, defender.x, GROUND_Y - 8, '#c084fc', '#581c87', 12, 80, 'pixel');
  } else if (opts.statusEffect === 'stun') {
    defender.stunTime = Math.max(defender.stunTime, 0.6);
    spawnVisualEffect(state, {
      kind: 'fx_jaylon_stun_stars',
      x: defender.x,
      y: defender.y - defenderDef.height - 12,
      facing: opts.attackDir,
      scale: 0.42,
      maxLife: 0.6,
    });
  } else if (opts.statusEffect === 'special_lock') {
    defender.specialLockTime = 5.0;
    spawnBurst(state, defender.x, defender.y - 30, '#22d3ee', '#ffffff', 14, 100, 'spark');
    spawnParticle(state, {
      x: defender.x,
      y: defender.y - defenderDef.height - 16,
      vy: -22,
      color: '#22d3ee',
      maxLife: 0.9,
      kind: 'text',
      text: 'ESP. BLOQUEADO!',
    });
  } else if (opts.statusEffect === 'poison') {
    defender.poisonTime = 3.6;
    if (defender.poisonTickTimer <= 0) {
      defender.poisonTickTimer = 0.55;
    }
    defender.poisonSourceSlot = attacker.slot;
    spawnBurst(state, defender.x, defender.y - 30, '#a855f7', '#581c87', 14, 90, 'smoke');
    spawnParticle(state, {
      x: defender.x,
      y: defender.y - defenderDef.height - 14,
      vy: -20,
      color: '#c084fc',
      maxLife: 0.85,
      kind: 'text',
      text: 'ENVENENADO!',
    });
  } else if (opts.statusEffect === 'bleed_vuln') {
    defender.bleedTime = JACK_BLEED_DURATION;
    if (defender.bleedTickTimer <= 0) {
      defender.bleedTickTimer = 0.5;
    }
    defender.bleedSourceSlot = attacker.slot;
    defender.vulnerableTime = JACK_VULNERABLE_DURATION;
    spawnBurst(state, defender.x, defender.y - 32, '#dc2626', '#7f1d1d', 16, 105, 'spark');
    spawnVisualEffect(state, {
      kind: 'jack_blood_splatter',
      x: defender.x,
      y: defender.y - 32,
      facing: opts.attackDir,
      scale: 0.38,
      maxLife: 0.34,
    });
    spawnParticle(state, {
      x: defender.x,
      y: defender.y - defenderDef.height - 14,
      vy: -22,
      color: '#f87171',
      maxLife: 0.95,
      kind: 'text',
      text: 'SANGRAMENTO!',
    });
  }

  // Knockback & Hitstun (skipped when Adão has super-armor during Special 3 charging!)
  const weightDiv = defenderDef.weight;
  const kbMul = attacker.furyTime > 0 ? 1.25 : 1;
  const effKbX = opts.knockbackX * kbMul;
  const effKbY = opts.knockbackY < 0 ? opts.knockbackY * kbMul : opts.knockbackY;
  if (armoredCharging) {
    spawnBurst(state, defender.x, defender.y - 32, '#c084fc', '#fde047', 8, 70, 'spark');
  } else if (defender.shieldTime > 0 && !opts.isGrab) {
    defender.vx = opts.attackDir * ((effKbX * 0.3) / weightDiv);
    spawnBurst(state, defender.x, defender.y - 32, '#fde047', '#ffffff', 10, 90, 'spark');
  } else {
    defender.vx = opts.attackDir * (effKbX / weightDiv);
    if (effKbY < 0) {
      defender.vy = effKbY / weightDiv;
    }
    defender.hitstunTime = opts.statusEffect === 'stun' ? Math.max(opts.hitstun, 0.6) : opts.hitstun;
    defender.action =
      opts.statusEffect === 'stun' && defender.characterId === 'jaylon'
        ? 'stun'
        : effKbY <= -130
        ? 'knockdown'
        : 'hitstun';
    defender.actionTime = 0;
    defender.actionDuration = defender.hitstunTime;
    defender.currentMove = null;
    defender.squashX = 1.18;
    defender.squashY = 0.84;
  }

  // Hitstop & Camera Shake
  const isHeavy = finalDamage >= 85 || opts.isGrab;
  state.hitstopTimer = Math.max(state.hitstopTimer, isHeavy ? 0.055 : 0.03);
  state.shakeTrauma = Math.min(1, state.shakeTrauma + (isHeavy ? 0.45 : 0.22));

  spawnBurst(
    state,
    defender.x,
    defender.y - 32,
    opts.effectColor,
    opts.secondaryColor,
    isHeavy ? 16 : 9,
    isHeavy ? 135 : 95,
    'spark'
  );

  if (attacker.characterId === 'ninja') {
    spawnVisualEffect(state, {
      kind: 'fx_sangue',
      x: defender.x,
      y: defender.y - 32,
      facing: opts.attackDir,
      scale: isHeavy ? 0.56 : 0.42,
      maxLife: 0.28,
    });
  } else if (attacker.characterId === 'elf' && opts.statusEffect === 'slow') {
    spawnVisualEffect(state, {
      kind: 'fx_elf_ice_burst',
      x: defender.x,
      y: GROUND_Y - 26,
      facing: opts.attackDir,
      scale: 0.42,
      maxLife: 0.36,
    });
  } else if (attacker.characterId === 'priest' && (isHeavy || opts.isLow)) {
    spawnVisualEffect(state, {
      kind: 'fx_priest_particles',
      x: defender.x,
      y: defender.y - 32,
      facing: opts.attackDir,
      scale: 0.48,
      maxLife: 0.28,
    });
  } else if (attacker.characterId === 'necromancer' && (isHeavy || opts.isLow)) {
    spawnVisualEffect(state, {
      kind: isHeavy ? 'fx_necro_soul_explosion' : 'fx_necro_skulls',
      x: defender.x,
      y: defender.y - 32,
      facing: opts.attackDir,
      scale: isHeavy ? 0.46 : 0.42,
      maxLife: 0.3,
    });
  } else if (attacker.characterId === 'minotaur' && (isHeavy || opts.isLow)) {
    spawnVisualEffect(state, {
      kind: 'fx_minotaur_sparks',
      x: defender.x,
      y: defender.y - 32,
      facing: opts.attackDir,
      scale: isHeavy ? 0.56 : 0.44,
      maxLife: 0.28,
    });
    if (opts.knockbackX >= 170) {
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_shockwave',
        x: defender.x - opts.attackDir * 12,
        y: defender.y - 28,
        facing: opts.attackDir,
        scale: 0.52,
        maxLife: 0.26,
      });
    }
  } else if (attacker.characterId === 'troll' && (isHeavy || opts.isLow || attacker.furyTime > 0)) {
    spawnVisualEffect(state, {
      kind: 'fx_troll_shockwaves',
      x: defender.x - opts.attackDir * 8,
      y: defender.y - 28,
      facing: opts.attackDir,
      scale: isHeavy ? 0.5 : 0.38,
      maxLife: 0.26,
    });
    spawnVisualEffect(state, {
      kind: 'fx_troll_dust',
      x: defender.x,
      y: Math.min(GROUND_Y - 8, defender.y - 12),
      facing: opts.attackDir,
      scale: 0.4,
      maxLife: 0.26,
    });
    if (attacker.furyTime > 0) {
      spawnVisualEffect(state, {
        kind: 'fx_troll_fury_particles',
        x: defender.x,
        y: defender.y - 34,
        facing: opts.attackDir,
        scale: 0.44,
        maxLife: 0.3,
      });
    }
  } else if (attacker.characterId === 'jack' && (isHeavy || opts.isSpecial || opts.isLow) && opts.statusEffect !== 'bleed_vuln') {
    spawnVisualEffect(state, {
      kind: 'jack_blood_splatter',
      x: defender.x,
      y: defender.y - 32,
      facing: opts.attackDir,
      scale: isHeavy ? 0.36 : 0.28,
      maxLife: 0.28,
    });
  }

  state.events.push({
    type: isHeavy ? 'hit_heavy' : 'hit_light',
    slot: attacker.slot,
    x: defender.x,
    y: defender.y - 32,
  });
}

function executeSpecialEffect(state: MatchState, f: FighterState, opp: FighterState, move: MoveSpec): void {
  const def = CHARACTERS[f.characterId];
  const effectiveCharId: CharacterId =
    f.characterId === 'adao' && move.id === 'special2' && f.adaoCopiedCharacterId
      ? f.adaoCopiedCharacterId
      : f.characterId;
  const effectiveSlotId =
    f.characterId === 'adao' && move.id === 'special2' && f.adaoCopiedSourceSlot
      ? f.adaoCopiedSourceSlot
      : move.id;
  const idBase = state.nextEntityId;

  if (move.kind === 'divine_copy') {
    if (f.characterId === 'adao' && !f.adaoCopiedUsedThisRound) {
      const picked = pickCopiedSpecialForAdao(opp.characterId);
      f.adaoCopiedUsedThisRound = true;
      f.adaoCopiedCharacterId = opp.characterId;
      f.adaoCopiedSourceSlot = picked.sourceSlot;
      f.adaoCopiedSpecial = picked.move;
      f.hitConnectedThisMove = true;
      spawnVisualEffect(state, {
        kind: 'adao_copy_aura',
        x: f.x,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.72,
        maxLife: 0.55,
      });
      spawnBurst(state, f.x, f.y - 42, '#ef4444', '#a855f7', 18, 110, 'spark');
      spawnParticle(state, {
        x: f.x,
        y: f.y - def.height - 12,
        vy: -22,
        color: '#f87171',
        maxLife: 1.0,
        kind: 'text',
        text: `COPIADO: ${picked.move.name.replace('Replicação: ', '').toUpperCase()}!`,
      });
    }
    return;
  }

  if (move.kind === 'projectile') {
    let kind: Projectile['kind'] = 'shadow_blade';
    let gravity = 0;
    let vy = 0;
    if (effectiveCharId === 'ninja') kind = 'shadow_blade';
    else if (effectiveCharId === 'elf') {
      if (effectiveSlotId === 'special1') kind = 'fire_arrow';
      else if (effectiveSlotId === 'special2') kind = 'ice_arrow';
      else kind = 'arcane_arrow';
    } else if (effectiveCharId === 'necromancer') kind = 'dark_orb';
    else if (effectiveCharId === 'priest') kind = 'holy_beam';
    else if (effectiveCharId === 'troll') {
      kind = 'boulder';
      gravity = 320;
      vy = -125;
    } else if (effectiveCharId === 'jaylon') {
      kind = 'beer_bottle';
      gravity = 65;
      vy = -14;
    } else if (effectiveCharId === 'tesla') {
      kind = 'electric_ball';
    } else if (effectiveCharId === 'beelzebu') {
      kind = 'poison_lance';
    } else if (effectiveCharId === 'dono') {
      kind = 'pistol_bullet';
      if (f.x !== opp.x) {
        f.facing = opp.x > f.x ? 1 : -1;
      }
    }

    state.projectiles.push({
      id: idBase,
      ownerSlot: f.slot,
      x: f.x + f.facing * (def.width / 2 + 8),
      y: f.y + move.offsetY,
      vx: f.facing * (move.projectileSpeed ?? 230),
      vy,
      gravity,
      width: move.rangeX,
      height: move.rangeY,
      damage: move.damage,
      chipDamage: move.chipDamage,
      knockbackX: move.knockbackX,
      knockbackY: move.knockbackY,
      hitstun: move.hitstun,
      kind,
      color: move.effectColor,
      secondaryColor: move.secondaryColor,
      statusEffect:
        move.statusEffect === 'slow' ||
        move.statusEffect === 'root' ||
        move.statusEffect === 'stun' ||
        move.statusEffect === 'special_lock' ||
        move.statusEffect === 'poison'
          ? move.statusEffect
          : undefined,
      life: 2.2,
      maxLife: 2.2,
      piercing: kind === 'arcane_arrow' || kind === 'holy_beam',
      hitTargets: [],
    });
    state.nextEntityId += 1;
    if (effectiveCharId === 'dono') {
      spawnVisualEffect(state, {
        kind: 'dono_festa_muzzle_flash',
        x: f.x + f.facing * 26,
        y: f.y - 44,
        facing: f.facing,
        scale: 0.45,
        maxLife: 0.16,
      });
      if (f.characterId === 'dono' && f.donoAmmo <= 0 && f.donoReloadTimer <= 0) {
        f.donoReloadTimer = DONO_RELOAD_DURATION;
        spawnParticle(state, {
          x: f.x,
          y: f.y - def.height - 12,
          vy: -18,
          color: '#fbbf24',
          maxLife: 0.85,
          kind: 'text',
          text: 'RECARGA 1.0s',
        });
      }
    }
    if (effectiveCharId !== 'priest') {
      spawnBurst(state, f.x + f.facing * 18, f.y + move.offsetY, move.effectColor, move.secondaryColor, 8, 70, 'spark');
    }
    if (effectiveCharId === 'ninja') {
      spawnVisualEffect(state, {
        kind: 'fx_rastro',
        x: f.x + f.facing * 20,
        y: f.y - 32,
        facing: f.facing,
        scale: 0.5,
        maxLife: 0.22,
      });
    } else if (effectiveCharId === 'elf') {
      if (kind === 'ice_arrow') {
        spawnVisualEffect(state, {
          kind: 'fx_elf_ice_wave',
          x: f.x + f.facing * 22,
          y: f.y - 34,
          facing: f.facing,
          scale: 0.44,
          maxLife: 0.28,
        });
      } else if (kind === 'arcane_arrow') {
        spawnVisualEffect(state, {
          kind: 'fx_elf_arcane_portal',
          x: f.x + f.facing * 20,
          y: f.y - 34,
          facing: f.facing,
          scale: 0.46,
          maxLife: 0.32,
        });
      } else if (kind === 'fire_arrow') {
        spawnVisualEffect(state, {
          kind: 'fx_elf_trail',
          x: f.x + f.facing * 20,
          y: f.y - 34,
          facing: f.facing,
          scale: 0.36,
          maxLife: 0.2,
        });
      }
    } else if (effectiveCharId === 'priest') {
      spawnVisualEffect(state, {
        kind: 'fx_priest_holy_sigil',
        x: f.x + f.facing * 20,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.44,
        maxLife: 0.28,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_particles',
        x: f.x + f.facing * 26,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.42,
        maxLife: 0.26,
      });
    } else if (effectiveCharId === 'necromancer') {
      spawnVisualEffect(state, {
        kind: 'fx_necro_sigils',
        x: f.x + f.facing * 20,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.42,
        maxLife: 0.28,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_smoke',
        x: f.x + f.facing * 24,
        y: f.y - 30,
        facing: f.facing,
        scale: 0.38,
        maxLife: 0.24,
      });
    } else if (effectiveCharId === 'troll') {
      spawnVisualEffect(state, {
        kind: 'fx_troll_rock_trail',
        x: f.x + f.facing * 24,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.48,
        maxLife: 0.3,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_dust',
        x: f.x + f.facing * 12,
        y: GROUND_Y - 12,
        facing: f.facing,
        scale: 0.44,
        maxLife: 0.28,
      });
    }
  } else if (move.kind === 'multi_projectile') {
    if (effectiveCharId === 'ninja') {
      const angles = [-0.18, 0, 0.18];
      angles.forEach((ang, idx) => {
        const spd = move.projectileSpeed ?? 255;
        state.projectiles.push({
          id: state.nextEntityId++,
          ownerSlot: f.slot,
          x: f.x + f.facing * 16,
          y: f.y - 34 + (idx - 1) * 4,
          vx: f.facing * Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          gravity: 0,
          width: 12,
          height: 12,
          damage: move.damage,
          chipDamage: move.chipDamage,
          knockbackX: move.knockbackX,
          knockbackY: move.knockbackY,
          hitstun: move.hitstun,
          kind: 'shuriken',
          color: move.effectColor,
          secondaryColor: move.secondaryColor,
          life: 1.8,
          maxLife: 1.8,
          hitTargets: [],
        });
      });
      spawnVisualEffect(state, {
        kind: 'fx_rastro',
        x: f.x + f.facing * 18,
        y: f.y - 36,
        facing: f.facing,
        scale: 0.42,
        maxLife: 0.2,
      });
    } else if (f.characterId === 'necromancer') {
      [-24, -44].forEach((yOff, idx) => {
        state.projectiles.push({
          id: state.nextEntityId++,
          ownerSlot: f.slot,
          x: f.x + f.facing * (18 + idx * 14),
          y: f.y + yOff,
          vx: f.facing * ((move.projectileSpeed ?? 200) + idx * 25),
          vy: 0,
          gravity: 0,
          width: 22,
          height: 20,
          damage: move.damage,
          chipDamage: move.chipDamage,
          knockbackX: move.knockbackX,
          knockbackY: move.knockbackY,
          hitstun: move.hitstun,
          kind: 'specter',
          color: move.effectColor,
          secondaryColor: move.secondaryColor,
          life: 2.1,
          maxLife: 2.1,
          hitTargets: [],
        });
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_sigils',
        x: f.x + f.facing * 22,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.46,
        maxLife: 0.34,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_aura',
        x: f.x,
        y: GROUND_Y - 22,
        facing: f.facing,
        scale: 0.54,
        maxLife: 0.36,
      });
    }
  } else if (move.kind === 'sky_rain') {
    const offsets = [-46, -22, 0, 22, 46];
    offsets.forEach((off, idx) => {
      const targetX = clampFighterX(opp.x + off, 16);
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: targetX,
        y: 8 - idx * 20,
        vx: f.facing * (24 + (idx - 2) * 14),
        vy: (move.projectileSpeed ?? 255) + (idx % 2) * 25,
        gravity: 110,
        width: 14,
        height: 18,
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        hitstun: move.hitstun,
        kind: 'rain_arrow',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        life: 1.7,
        maxLife: 1.7,
        hitTargets: [],
      });
    });
    spawnBurst(state, f.x + f.facing * 10, f.y - 48, move.effectColor, move.secondaryColor, 12, 85, 'spark');
  } else if (move.kind === 'teleport') {
    const originX = f.x;
    spawnBurst(state, originX, f.y - 28, move.effectColor, move.secondaryColor, 14, 95, 'smoke');
    if (f.characterId === 'ninja') {
      spawnVisualEffect(state, {
        kind: 'fx_portal',
        x: originX,
        y: GROUND_Y - 34,
        facing: f.facing,
        scale: 0.65,
        maxLife: 0.34,
      });
      spawnVisualEffect(state, {
        kind: 'fx_fumaca',
        x: originX,
        y: GROUND_Y - 28,
        facing: f.facing,
        scale: 0.62,
        maxLife: 0.38,
      });
    } else if (f.characterId === 'necromancer') {
      spawnVisualEffect(state, {
        kind: 'fx_necro_portal',
        x: originX,
        y: GROUND_Y - 34,
        facing: f.facing,
        scale: 0.56,
        maxLife: 0.34,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_smoke',
        x: originX,
        y: GROUND_Y - 28,
        facing: f.facing,
        scale: 0.54,
        maxLife: 0.34,
      });
    }
    let destX = opp.x - opp.facing * 38;
    if (f.characterId === 'tesla') {
      const oppWidth = CHARACTERS[opp.characterId].width;
      const minSep = (def.width + oppWidth) * 0.5 + 8;
      destX = clampFighterX(opp.x - opp.facing * 36, def.width);
      if (Math.abs(destX - opp.x) < minSep) {
        destX = clampFighterX(opp.x + opp.facing * 36, def.width);
      }
      if (Math.abs(destX - opp.x) < minSep) {
        const pushSide = destX >= opp.x ? 1 : -1;
        destX = clampFighterX(opp.x + pushSide * minSep, def.width);
      }
    } else if (destX < STAGE_LEFT_BOUND + 20 || destX > STAGE_RIGHT_BOUND - 20) {
      destX = opp.x + opp.facing * 42;
    }
    f.x = clampFighterX(destX, def.width);
    f.y = GROUND_Y;
    f.vy = 0;
    f.facing = opp.x >= f.x ? 1 : -1;
    f.invulnTime = f.characterId === 'tesla' ? 0.14 : 0.12;
    spawnBurst(state, f.x, f.y - 28, move.effectColor, move.secondaryColor, 14, 95, f.characterId === 'tesla' ? 'spark' : 'smoke');
    if (f.characterId === 'ninja') {
      spawnVisualEffect(state, {
        kind: 'fx_portal',
        x: f.x,
        y: GROUND_Y - 34,
        facing: f.facing,
        scale: 0.68,
        maxLife: 0.36,
      });
      spawnVisualEffect(state, {
        kind: 'fx_explosao',
        x: f.x,
        y: GROUND_Y - 30,
        facing: f.facing,
        scale: 0.52,
        maxLife: 0.28,
      });
    } else if (f.characterId === 'necromancer') {
      spawnVisualEffect(state, {
        kind: 'fx_necro_portal',
        x: f.x,
        y: GROUND_Y - 34,
        facing: f.facing,
        scale: 0.6,
        maxLife: 0.36,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_aura',
        x: f.x,
        y: GROUND_Y - 22,
        facing: f.facing,
        scale: 0.58,
        maxLife: 0.36,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_smoke',
        x: f.x,
        y: GROUND_Y - 28,
        facing: f.facing,
        scale: 0.54,
        maxLife: 0.32,
      });
    }
    state.events.push({ type: 'teleport', slot: f.slot, x: f.x, y: f.y - 28 });

    // Teleport delivers a surprise close-range strike on arrival
    if (f.characterId === 'ninja' || f.characterId === 'necromancer') {
      const hb = getMoveHitbox(f, move);
      const hurt = getFighterHurtbox(opp);
      if (rectsOverlap(hb, hurt)) {
        applyHit(state, f, opp, {
          damage: move.damage,
          chipDamage: move.chipDamage,
          knockbackX: move.knockbackX,
          knockbackY: move.knockbackY,
          hitstun: move.hitstun,
          effectColor: move.effectColor,
          secondaryColor: move.secondaryColor,
          attackDir: f.facing,
        });
        if (f.characterId === 'necromancer') {
          spawnVisualEffect(state, {
            kind: 'fx_necro_soul_explosion',
            x: opp.x,
            y: opp.y - 30,
            facing: f.facing,
            scale: 0.44,
            maxLife: 0.3,
          });
        }
      }
    }
  } else if (move.kind === 'electric_cage') {
    const cageWidth = move.rangeX;
    const minCageX = STAGE_LEFT_BOUND + cageWidth / 2;
    const maxCageX = STAGE_RIGHT_BOUND - cageWidth / 2;
    const cageX = Math.max(minCageX, Math.min(maxCageX, opp.x));
    state.hazards.push({
      id: state.nextEntityId++,
      ownerSlot: f.slot,
      x: cageX,
      y: GROUND_Y,
      width: cageWidth,
      height: move.rangeY,
      delay: 0.04,
      activeTime: 3.4,
      totalTime: 3.44,
      damage: move.damage,
      chipDamage: move.chipDamage,
      knockbackX: 0,
      knockbackY: 0,
      kind: 'electric_cage',
      color: move.effectColor,
      secondaryColor: move.secondaryColor,
      statusEffect: 'shock',
      hasHit: false,
      cageLastX: opp.x,
      cageMoveAccum: 0,
      cageShockCooldown: 0,
    });
    spawnBurst(state, cageX, GROUND_Y - 28, move.effectColor, move.secondaryColor, 14, 105, 'spark');
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.3);
  } else if (move.kind === 'toxic_cloud') {
    const cloudWidth = move.rangeX;
    const cloudX = clampFighterX(f.x + f.facing * 42, cloudWidth);
    state.hazards.push({
      id: state.nextEntityId++,
      ownerSlot: f.slot,
      x: cloudX,
      y: GROUND_Y,
      width: cloudWidth,
      height: move.rangeY,
      delay: 0.02,
      activeTime: 2.3,
      totalTime: 2.32,
      damage: move.damage,
      chipDamage: move.chipDamage,
      knockbackX: move.knockbackX,
      knockbackY: move.knockbackY,
      kind: 'toxic_cloud',
      color: move.effectColor,
      secondaryColor: move.secondaryColor,
      statusEffect: 'poison',
      hasHit: false,
      vx: f.facing * 118,
      tickTimer: 0,
    });
    spawnBurst(state, f.x + f.facing * 26, GROUND_Y - 30, '#a855f7', '#581c87', 16, 95, 'smoke');
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.22);
  } else if (move.kind === 'homing_skulls') {
    const delays = [0.12, 0.28, 0.44];
    const yOffsets = [-52, -38, -24];
    delays.forEach((delay, idx) => {
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: clampFighterX(f.x + f.facing * (18 + idx * 9), 18),
        y: f.y + yOffsets[idx],
        vx: f.facing * 52,
        vy: -26 + idx * 14,
        gravity: 0,
        width: move.rangeX,
        height: move.rangeY,
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        hitstun: move.hitstun,
        kind: 'homing_skull',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        life: 3.4,
        maxLife: 3.4,
        homingTargetSlot: opp.slot,
        homingDelay: delay,
        homingSpeed: move.projectileSpeed ?? 195,
        rotation: 0,
        hitTargets: [],
      });
    });
    spawnBurst(state, f.x + f.facing * 20, f.y - 42, '#c084fc', '#e879f9', 16, 90, 'spark');
  } else if (move.kind === 'shadow_domain') {
    const domWidth = move.rangeX;
    const minDomX = STAGE_LEFT_BOUND + domWidth / 2;
    const maxDomX = STAGE_RIGHT_BOUND - domWidth / 2;
    const domX = Math.max(minDomX, Math.min(maxDomX, opp.x));
    state.hazards.push({
      id: state.nextEntityId++,
      ownerSlot: f.slot,
      x: domX,
      y: GROUND_Y,
      width: domWidth,
      height: move.rangeY,
      delay: 0.16,
      activeTime: 2.2,
      totalTime: 2.36,
      damage: move.damage,
      chipDamage: move.chipDamage,
      knockbackX: move.knockbackX,
      knockbackY: move.knockbackY,
      kind: 'shadow_domain',
      color: move.effectColor,
      secondaryColor: move.secondaryColor,
      hasHit: false,
      tickTimer: 0.16,
      exploded: false,
    });
    spawnBurst(state, domX, GROUND_Y - 32, '#9333ea', '#1e1030', 18, 115, 'smoke');
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.35);
  } else if (move.kind === 'ground_trap') {
    if (f.characterId === 'minotaur') {
      // Sweeping seismic wave + earth impact FX
      state.hazards.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: f.x + f.facing * 52,
        y: GROUND_Y,
        width: 84,
        height: 26,
        delay: 0.05,
        activeTime: 0.25,
        totalTime: 0.3,
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        kind: 'seismic_wave',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        hasHit: false,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_earth_impact',
        x: f.x + f.facing * 24,
        y: GROUND_Y - 12,
        facing: f.facing,
        scale: 0.54,
        maxLife: 0.4,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_shockwave',
        x: f.x + f.facing * 42,
        y: GROUND_Y - 14,
        facing: f.facing,
        scale: 0.56,
        maxLife: 0.36,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_rocks',
        x: f.x + f.facing * 48,
        y: GROUND_Y - 20,
        facing: f.facing,
        scale: 0.52,
        maxLife: 0.42,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_dust_trail',
        x: f.x + f.facing * 18,
        y: GROUND_Y - 10,
        facing: f.facing,
        scale: 0.48,
        maxLife: 0.34,
      });
      state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.45);
    } else if (f.characterId === 'necromancer') {
      state.hazards.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: opp.x,
        y: GROUND_Y,
        width: 44,
        height: 44,
        delay: 0.16,
        activeTime: 0.32,
        totalTime: 0.48,
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        kind: 'underworld_hands',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        statusEffect: 'root',
        hasHit: false,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_sigils',
        x: opp.x,
        y: GROUND_Y - 12,
        facing: f.facing,
        scale: 0.5,
        maxLife: 0.42,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_aura',
        x: opp.x,
        y: GROUND_Y - 10,
        facing: f.facing,
        scale: 0.52,
        maxLife: 0.46,
      });
    } else if (f.characterId === 'priest') {
      state.hazards.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: opp.x,
        y: GROUND_Y,
        width: 46,
        height: 70,
        delay: 0.2,
        activeTime: 0.22,
        totalTime: 0.42,
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        kind: 'celestial_hammer',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        hasHit: false,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_holy_sigil',
        x: opp.x,
        y: GROUND_Y - 12,
        facing: f.facing,
        scale: 0.56,
        maxLife: 0.42,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_particles',
        x: opp.x,
        y: GROUND_Y - 36,
        facing: f.facing,
        scale: 0.52,
        maxLife: 0.4,
      });
    } else if (f.characterId === 'jaylon') {
      // Ressaca Braba: vomit stream in front + persistent puddle placed clearly ahead of Jaylon (never under his feet)
      const puddleWidth = 68;
      const puddleX = clampFighterX(f.x + f.facing * 64, puddleWidth);
      if (Math.abs(puddleX - f.x) < 48) {
        f.x = clampFighterX(puddleX - f.facing * 52, def.width);
      }

      spawnVisualEffect(state, {
        kind: 'fx_jaylon_vomit_stream',
        x: f.x + f.facing * 26,
        y: GROUND_Y - 22,
        facing: f.facing,
        scale: 0.52,
        maxLife: 0.34,
      });

      const streamBox = {
        x: f.facing === 1 ? f.x + 6 : f.x - 6 - move.rangeX,
        y: GROUND_Y - 38,
        width: move.rangeX,
        height: 36,
      };
      if (rectsOverlap(streamBox, getFighterHurtbox(opp))) {
        applyHit(state, f, opp, {
          damage: move.damage,
          chipDamage: move.chipDamage,
          knockbackX: move.knockbackX,
          knockbackY: move.knockbackY,
          hitstun: move.hitstun,
          isLow: true,
          effectColor: move.effectColor,
          secondaryColor: move.secondaryColor,
          attackDir: f.facing,
        });
      }

      state.hazards.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: puddleX,
        y: GROUND_Y,
        width: puddleWidth,
        height: 18,
        delay: 0.04,
        activeTime: 4.0,
        totalTime: 4.04,
        damage: 0,
        chipDamage: 0,
        knockbackX: 0,
        knockbackY: 0,
        kind: 'vomit_puddle',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        statusEffect: 'slip',
        hasHit: false,
        slipCooldown: 0,
      });
    }
  } else if (move.kind === 'aoe') {
    state.hazards.push({
      id: state.nextEntityId++,
      ownerSlot: f.slot,
      x: f.x,
      y: GROUND_Y,
      width: move.rangeX * 2,
      height: move.rangeY + 14,
      delay: 0.02,
      activeTime: 0.24,
      totalTime: 0.26,
      damage: move.damage,
      chipDamage: move.chipDamage,
      knockbackX: move.knockbackX,
      knockbackY: move.knockbackY,
      kind: 'holy_explosion',
      color: move.effectColor,
      secondaryColor: move.secondaryColor,
      hasHit: false,
    });
    if (f.characterId === 'priest') {
      spawnVisualEffect(state, {
        kind: 'fx_priest_golden_aura',
        x: f.x,
        y: GROUND_Y - 34,
        facing: f.facing,
        scale: 0.72,
        maxLife: 0.42,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_particles',
        x: f.x,
        y: GROUND_Y - 36,
        facing: f.facing,
        scale: 0.68,
        maxLife: 0.4,
      });
    }
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.35);
  } else if (move.kind === 'shield') {
    f.shieldTime = 4.2;
    if (f.characterId === 'priest') {
      spawnVisualEffect(state, {
        kind: 'fx_priest_holy_shield',
        x: f.x,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.68,
        maxLife: 0.55,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_golden_aura',
        x: f.x,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.74,
        maxLife: 0.65,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_particles',
        x: f.x,
        y: f.y - 34,
        facing: f.facing,
        scale: 0.56,
        maxLife: 0.5,
      });
    } else {
      spawnBurst(state, f.x, f.y - 30, '#fde047', '#ffffff', 16, 100, 'spark');
    }
    spawnParticle(state, {
      x: f.x,
      y: f.y - 58,
      vy: -20,
      color: '#fde047',
      maxLife: 0.9,
      kind: 'text',
      text: 'ESCUDO!',
    });
  } else if (move.kind === 'buff') {
    if (f.characterId === 'jaylon') {
      // Gole na Cerveja: heals 25% of maxHp (clamped to maxHp); post-drink 1s stun triggers as drink finishes
      const prevHp = f.hp;
      const healAmount = Math.round(f.maxHp * 0.25);
      f.hp = Math.min(f.maxHp, f.hp + healAmount);
      const gained = f.hp - prevHp;
      f.hitConnectedThisMove = true;
      spawnBurst(state, f.x, f.y - 34, '#facc15', '#4ade80', 14, 95, 'spark');
      spawnParticle(state, {
        x: f.x,
        y: f.y - 60,
        vy: -22,
        color: '#4ade80',
        maxLife: 0.9,
        kind: 'text',
        text: gained > 0 ? `+${gained} HP` : 'HP CHEIO!',
      });
      return;
    }

    if (f.characterId === 'dono') {
      if (move.id === 'special2') {
        // Atividade: +25% energy clamped to 100
        const prevEnergy = f.energy;
        f.energy = Math.min(100, f.energy + DONO_ATIVIDADE_ENERGY_GAIN);
        const gained = Math.round(f.energy - prevEnergy);
        f.donoEnergyGainFlash = 0.85;
        f.hitConnectedThisMove = true;
        spawnVisualEffect(state, {
          kind: 'dono_atividade_wave',
          x: f.x,
          y: f.y - 42,
          facing: f.facing,
          scale: 0.72,
          maxLife: 0.42,
        });
        spawnBurst(state, f.x, f.y - 36, '#a855f7', '#e9d5ff', 14, 90, 'spark');
        spawnParticle(state, {
          x: f.x,
          y: f.y - 64,
          vy: -20,
          color: '#e879f9',
          maxLife: 0.85,
          kind: 'text',
          text: gained > 0 ? `+${gained}% ENERGIA` : 'ENERGIA 100%',
        });
        return;
      }
      if (move.id === 'special3') {
        // Camuflagem de Cria: 1.5s invisibility
        f.donoCamoTime = DONO_CAMUFLAGEM_DURATION;
        f.hitConnectedThisMove = true;
        spawnVisualEffect(state, {
          kind: 'dono_camuflagem_smoke',
          x: f.x,
          y: f.y - 36,
          facing: f.facing,
          scale: 0.68,
          maxLife: 0.4,
        });
        spawnBurst(state, f.x, f.y - 34, '#64748b', '#94a3b8', 14, 85, 'smoke');
        spawnParticle(state, {
          x: f.x,
          y: f.y - 62,
          vy: -20,
          color: '#cbd5e1',
          maxLife: 0.85,
          kind: 'text',
          text: 'CAMUFLAGEM!',
        });
        return;
      }
      if (move.id === 'special4') {
        // Onda da MaryJuana: 2.0s non-stacking 1.5x speed boost
        f.donoSpeedTime = DONO_MARYJUANA_DURATION;
        f.hitConnectedThisMove = true;
        spawnVisualEffect(state, {
          kind: 'dono_maryjuana_cloud',
          x: f.x,
          y: f.y - 44,
          vx: f.facing * 10,
          vy: -18,
          facing: f.facing,
          scale: 0.66,
          maxLife: 0.55,
        });
        spawnBurst(state, f.x, f.y - 34, '#22c55e', '#dcfce7', 16, 100, 'smoke');
        spawnParticle(state, {
          x: f.x,
          y: f.y - 62,
          vy: -22,
          color: '#4ade80',
          maxLife: 0.9,
          kind: 'text',
          text: 'VELOCIDADE 1.5x!',
        });
        return;
      }
    }

    f.furyTime = 6.0;
    f.furyCooldown = 10.0;
    f.furyReverseTime = 0;
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.35);
    if (f.characterId === 'troll') {
      spawnVisualEffect(state, {
        kind: 'fx_troll_fury_aura',
        x: f.x,
        y: GROUND_Y - 34,
        facing: f.facing,
        scale: 0.62,
        maxLife: 0.65,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_fury_particles',
        x: f.x,
        y: f.y - 36,
        facing: f.facing,
        scale: 0.6,
        maxLife: 0.58,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_shockwaves',
        x: f.x,
        y: GROUND_Y - 26,
        facing: f.facing,
        scale: 0.56,
        maxLife: 0.36,
      });
    }
    spawnBurst(state, f.x, f.y - 32, '#ef4444', '#f97316', 18, 120, 'spark');
    spawnParticle(state, {
      x: f.x,
      y: f.y - 62,
      vy: -20,
      color: '#ef4444',
      maxLife: 0.9,
      kind: 'text',
      text: 'FÚRIA!',
    });
  } else if (move.kind === 'jack_knives') {
    const count = Math.max(1, Math.min(JACK_MAX_KNIVES, move.jackThrowCount ?? 1));
    const speed = move.projectileSpeed ?? 335;
    for (let i = 0; i < count; i++) {
      const fanRatio = count === 1 ? 0 : i / (count - 1) - 0.5;
      const yOffset = move.offsetY + fanRatio * 28;
      const vy = fanRatio * 48;
      const vx = f.facing * (speed + (i % 3) * 18);
      state.projectiles.push({
        id: state.nextEntityId++,
        ownerSlot: f.slot,
        x: f.x + f.facing * (def.width / 2 + 8 + (i % 2) * 6),
        y: f.y + yOffset,
        vx,
        vy,
        gravity: 0,
        width: move.rangeX,
        height: move.rangeY,
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        hitstun: move.hitstun,
        kind: 'jack_knife',
        color: move.effectColor,
        secondaryColor: move.secondaryColor,
        life: 1.8,
        maxLife: 1.8,
        hitTargets: [],
      });
    }
    spawnBurst(state, f.x + f.facing * 20, f.y - 36, '#c084fc', '#e2e8f0', 8 + count, 90, 'spark');
  } else if (move.kind === 'soul_eye') {
    spawnBurst(state, f.x + f.facing * 8, f.y - 52, '#dc2626', '#7f1d1d', 16, 100, 'spark');
    spawnVisualEffect(state, {
      kind: 'jack_soul_eye',
      x: opp.x,
      y: opp.y - 36,
      facing: f.facing,
      scale: 0.44,
      maxLife: 0.55,
    });
    const inRange =
      Math.abs(opp.x - f.x) <= move.rangeX &&
      Math.abs(opp.y - f.y) <= move.rangeY;
    if (inRange) {
      const preHitEnergy = opp.energy;
      const wasBlocked = opp.action === 'block' && opp.y >= GROUND_Y - 1;
      const canLand = opp.invulnTime <= 0 && opp.action !== 'ko' && opp.action !== 'grabbed';
      applyHit(state, f, opp, {
        damage: move.damage,
        chipDamage: move.chipDamage,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        hitstun: move.hitstun,
        isSpecial: true,
        effectColor: move.effectColor,
        secondaryColor: move.secondaryColor,
        statusEffect: 'slow',
        attackDir: opp.x >= f.x ? 1 : -1,
      });
      if (canLand && !wasBlocked) {
        f.hitConnectedThisMove = true;
        opp.slowTime = JACK_SOUL_EYE_SLOW_DURATION;
        const drained = Math.round(preHitEnergy * 0.5);
        opp.energy = Math.max(0, preHitEnergy - drained);
        spawnParticle(state, {
          x: opp.x,
          y: opp.y - CHARACTERS[opp.characterId].height - 16,
          vy: -22,
          color: '#f87171',
          maxLife: 0.95,
          kind: 'text',
          text: `OLHO DA ALMA! -${drained} EN`,
        });
      }
    }
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.25);
  } else if (move.kind === 'blood_wave') {
    spawnVisualEffect(state, {
      kind: 'jack_blood_splash',
      x: f.x + f.facing * 20,
      y: f.y - 38,
      facing: f.facing,
      scale: 0.34,
      maxLife: 0.34,
    });
    state.projectiles.push({
      id: state.nextEntityId++,
      ownerSlot: f.slot,
      x: f.x + f.facing * (def.width / 2 + 12),
      y: f.y + move.offsetY,
      vx: f.facing * (move.projectileSpeed ?? 280),
      vy: 0,
      gravity: 0,
      width: move.rangeX,
      height: move.rangeY,
      damage: move.damage,
      chipDamage: move.chipDamage,
      knockbackX: move.knockbackX,
      knockbackY: move.knockbackY,
      hitstun: move.hitstun,
      kind: 'blood_wave',
      color: move.effectColor,
      secondaryColor: move.secondaryColor,
      statusEffect: 'bleed_vuln',
      life: 1.9,
      maxLife: 1.9,
      hitTargets: [],
    });
    spawnBurst(state, f.x + f.facing * 24, f.y - 36, '#dc2626', '#7f1d1d', 14, 100, 'spark');
    state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.28);
  }
}

function updateFighter(
  state: MatchState,
  f: FighterState,
  opp: FighterState,
  input: InputState,
  dt: number
): void {
  const def = CHARACTERS[f.characterId];

  // Timers
  if (f.hitFlashTime > 0) f.hitFlashTime = Math.max(0, f.hitFlashTime - dt);
  if (f.invulnTime > 0) f.invulnTime = Math.max(0, f.invulnTime - dt);
  if (f.slowTime > 0) f.slowTime = Math.max(0, f.slowTime - dt);
  if (f.rootTime > 0) f.rootTime = Math.max(0, f.rootTime - dt);
  if (f.shieldTime > 0) f.shieldTime = Math.max(0, f.shieldTime - dt);
  if (f.stunTime > 0) f.stunTime = Math.max(0, f.stunTime - dt);
  if (f.slipTime > 0) f.slipTime = Math.max(0, f.slipTime - dt);
  if (f.specialLockTime > 0) f.specialLockTime = Math.max(0, f.specialLockTime - dt);
  if (f.vulnerableTime > 0) f.vulnerableTime = Math.max(0, f.vulnerableTime - dt);
  if (f.special1Cooldown > 0) f.special1Cooldown = Math.max(0, f.special1Cooldown - dt);
  for (const slotKey of ['special1', 'special2', 'special3', 'special4'] as const) {
    if (f.specialCooldowns[slotKey] > 0) {
      f.specialCooldowns[slotKey] = Math.max(0, f.specialCooldowns[slotKey] - dt);
    }
  }
  if (f.blockImpactTime > 0) f.blockImpactTime = Math.max(0, f.blockImpactTime - dt);
  if (f.landingTime > 0) f.landingTime = Math.max(0, f.landingTime - dt);
  if (f.skullHitCooldown > 0) f.skullHitCooldown = Math.max(0, f.skullHitCooldown - dt);
  if (f.donoEnergyGainFlash > 0) f.donoEnergyGainFlash = Math.max(0, f.donoEnergyGainFlash - dt);
  if (f.characterId === 'dono') {
    if (f.donoReloadTimer > 0) {
      f.donoReloadTimer = Math.max(0, f.donoReloadTimer - dt);
      if (f.donoReloadTimer === 0) {
        f.donoAmmo = DONO_MAX_AMMO;
        spawnBurst(state, f.x, f.y - 40, '#facc15', '#ffffff', 8, 70, 'spark');
        spawnParticle(state, {
          x: f.x,
          y: f.y - def.height - 10,
          vy: -18,
          color: '#fde047',
          maxLife: 0.7,
          kind: 'text',
          text: '5/5 PRONTA!',
        });
      }
    } else if (f.donoAmmo <= 0 && f.action !== 'special1') {
      f.donoReloadTimer = DONO_RELOAD_DURATION;
    }
    if (f.donoCamoTime > 0) {
      if (f.action === 'ko') {
        f.donoCamoTime = 0;
      } else {
        f.donoCamoTime = Math.max(0, f.donoCamoTime - dt);
        if (f.donoCamoTime === 0) {
          spawnVisualEffect(state, {
            kind: 'dono_camuflagem_smoke',
            x: f.x,
            y: f.y - 34,
            facing: f.facing,
            scale: 0.54,
            maxLife: 0.32,
          });
        }
      }
    }
    if (f.donoSpeedTime > 0) {
      if (f.action === 'ko') {
        f.donoSpeedTime = 0;
      } else {
        f.donoSpeedTime = Math.max(0, f.donoSpeedTime - dt);
        if (
          Math.abs(f.vx) > 25 &&
          Math.floor(f.donoSpeedTime * 6) !== Math.floor((f.donoSpeedTime + dt) * 6)
        ) {
          spawnVisualEffect(state, {
            kind: 'dono_maryjuana_cloud',
            x: f.x - f.facing * 10,
            y: f.y - 26,
            vx: -f.facing * 18,
            vy: -14,
            facing: f.facing,
            scale: 0.42,
            maxLife: 0.34,
          });
        }
      }
    }
  }
  if (f.poisonTime > 0 && f.action !== 'ko') {
    f.poisonTime = Math.max(0, f.poisonTime - dt);
    f.poisonTickTimer -= dt;
    if (f.poisonTickTimer <= 0) {
      f.poisonTickTimer = 0.55;
      const dotDamage = 12;
      f.hp = Math.max(0, f.hp - dotDamage);
      f.hitFlashTime = 0.05;
      if (f.poisonSourceSlot === 1) {
        state.f1.totalDamageDealt += dotDamage;
      } else if (f.poisonSourceSlot === 2) {
        state.f2.totalDamageDealt += dotDamage;
      }
      spawnBurst(state, f.x, f.y - 30, '#a855f7', '#4c1d95', 7, 65, 'smoke');
      spawnParticle(state, {
        x: f.x,
        y: f.y - def.height - 8,
        vy: -18,
        color: '#c084fc',
        maxLife: 0.55,
        kind: 'text',
        text: `-${dotDamage}`,
      });
    }
    if (f.poisonTime <= 0) {
      f.poisonSourceSlot = null;
      f.poisonTickTimer = 0;
    }
  }
  if (f.bleedTime > 0 && f.action !== 'ko') {
    f.bleedTime = Math.max(0, f.bleedTime - dt);
    f.bleedTickTimer -= dt;
    if (f.bleedTickTimer <= 0) {
      f.bleedTickTimer = 0.5;
      const dotDamage = 10;
      f.hp = Math.max(0, f.hp - dotDamage);
      f.hitFlashTime = 0.05;
      if (f.bleedSourceSlot === 1) {
        state.f1.totalDamageDealt += dotDamage;
      } else if (f.bleedSourceSlot === 2) {
        state.f2.totalDamageDealt += dotDamage;
      }
      spawnBurst(state, f.x, f.y - 30, '#dc2626', '#7f1d1d', 7, 70, 'pixel');
      spawnParticle(state, {
        x: f.x,
        y: f.y - def.height - 8,
        vy: -18,
        color: '#f87171',
        maxLife: 0.55,
        kind: 'text',
        text: `-${dotDamage}`,
      });
    }
    if (f.bleedTime <= 0) {
      f.bleedSourceSlot = null;
      f.bleedTickTimer = 0;
    }
  }
  if (state.roundPhase === 'fighting' && f.characterId === 'jack' && f.action !== 'ko') {
    if (f.jackKnives < JACK_MAX_KNIVES) {
      f.jackKnifeTimer += dt;
      while (f.jackKnifeTimer >= JACK_KNIFE_RECHARGE_SECONDS && f.jackKnives < JACK_MAX_KNIVES) {
        f.jackKnifeTimer -= JACK_KNIFE_RECHARGE_SECONDS;
        f.jackKnives += 1;
        spawnBurst(state, f.x, f.y - 44, '#c084fc', '#e2e8f0', 6, 60, 'spark');
        spawnParticle(state, {
          x: f.x,
          y: f.y - def.height - 10,
          vy: -18,
          color: f.jackKnives >= JACK_MAX_KNIVES ? '#f87171' : '#e2e8f0',
          maxLife: 0.7,
          kind: 'text',
          text: `+1 FACA (${f.jackKnives}/${JACK_MAX_KNIVES})`,
        });
      }
      if (f.jackKnives >= JACK_MAX_KNIVES) {
        f.jackKnifeTimer = 0;
      }
    } else {
      f.jackKnifeTimer = 0;
    }
  }
  if (f.action !== 'block') f.isLowBlock = false;
  const prevFury = f.furyTime;
  if (f.furyTime > 0) f.furyTime = Math.max(0, f.furyTime - dt);
  if (f.furyCooldown > 0) f.furyCooldown = Math.max(0, f.furyCooldown - dt);
  if (f.furyReverseTime > 0) f.furyReverseTime = Math.max(0, f.furyReverseTime - dt);
  if (prevFury > 0 && f.furyTime === 0 && f.characterId === 'troll') {
    f.furyReverseTime = 0.35;
    spawnVisualEffect(state, {
      kind: 'fx_troll_fury_particles',
      x: f.x,
      y: f.y - 34,
      facing: f.facing,
      scale: 0.48,
      maxLife: 0.36,
    });
    spawnVisualEffect(state, {
      kind: 'fx_troll_dust',
      x: f.x,
      y: GROUND_Y - 12,
      facing: f.facing,
      scale: 0.42,
      maxLife: 0.3,
    });
  }
  if (
    f.characterId === 'troll' &&
    f.furyTime > 0 &&
    f.action !== 'ko' &&
    Math.floor(f.furyTime * 4) !== Math.floor((f.furyTime + dt) * 4)
  ) {
    spawnVisualEffect(state, {
      kind: 'fx_troll_fury_particles',
      x: f.x + ((Math.floor(f.furyTime * 10) % 3) - 1) * 8,
      y: f.y - 34,
      facing: f.facing,
      scale: 0.46,
      maxLife: 0.35,
    });
  }

  if (f.comboTimer > 0) {
    f.comboTimer -= dt;
    if (f.comboTimer <= 0) {
      f.comboCount = 0;
    }
  }

  // Smooth ghost HP bar catch-up
  if (f.ghostHp > f.hp) {
    f.ghostHp = Math.max(f.hp, f.ghostHp - 260 * dt);
  } else {
    f.ghostHp = f.hp;
  }

  // Squash & stretch recovery
  f.squashX += (1 - f.squashX) * Math.min(1, dt * 16);
  f.squashY += (1 - f.squashY) * Math.min(1, dt * 16);

  // Passive special energy gain during fight
  if (state.roundPhase === 'fighting') {
    f.energy = Math.min(100, f.energy + 4.8 * dt);
  }

  const isGrounded = f.y >= GROUND_Y - 0.5;
  if (!input.special3Held) {
    f.adaoChargeCooldownLock = false;
  }

  // Handle hitstun / knockdown / grabbed / ko / victory
  if (f.action === 'ko' || f.action === 'victory') {
    f.actionTime += dt;
    if (!isGrounded) {
      f.vy += GRAVITY * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        f.vy = 0;
        f.vx *= 0.4;
      }
    } else {
      f.vx *= Math.pow(0.05, dt);
    }
    f.x = clampFighterX(f.x, def.width);
    return;
  }

  if (f.action === 'grabbed') {
    f.actionTime += dt;
    if (f.actionTime >= f.actionDuration) {
      f.action = 'knockdown';
      f.actionTime = 0;
      f.actionDuration = 0.45;
    }
    return;
  }

  if (f.stunTime > 0) {
    f.actionTime += dt;
    f.hitstunTime = Math.max(0, f.hitstunTime - dt);
    f.action = f.characterId === 'jaylon' ? 'stun' : 'hitstun';
    f.currentMove = null;
    if (!isGrounded) {
      f.vy += GRAVITY * dt;
    } else {
      f.vx *= Math.pow(0.03, dt);
    }
    f.x = clampFighterX(f.x + f.vx * dt, def.width);
    f.y += f.vy * dt;
    if (f.y >= GROUND_Y) {
      f.y = GROUND_Y;
      f.vy = 0;
    }
    return;
  }

  if (f.action === 'stun') {
    f.action = 'idle';
    f.actionTime = 0;
    f.vx = 0;
  }

  if (f.action === 'hitstun' || f.action === 'knockdown') {
    f.actionTime += dt;
    f.hitstunTime -= dt;
    if (!isGrounded) {
      f.vy += GRAVITY * dt;
    } else {
      f.vx *= Math.pow(f.slipTime > 0 ? 0.28 : 0.03, dt);
    }
    f.x = clampFighterX(f.x + f.vx * dt, def.width);
    f.y += f.vy * dt;
    if (f.y >= GROUND_Y) {
      if (f.vy > 120) {
        spawnBurst(state, f.x, GROUND_Y, '#9ca3af', '#52525b', 6, 65, 'smoke');
        f.squashX = 1.24;
        f.squashY = 0.76;
      }
      f.y = GROUND_Y;
      f.vy = 0;
    }
    if (!input.special3Held) {
      f.adaoChargeCooldownLock = false;
    }

    if (f.hitstunTime <= 0 && f.slipTime <= 0 && f.y >= GROUND_Y - 0.5) {
      const wasKnockdown = f.action === 'knockdown';
      if (
        wasKnockdown &&
        (f.characterId === 'ninja' ||
          f.characterId === 'elf' ||
          f.characterId === 'priest' ||
          f.characterId === 'necromancer' ||
          f.characterId === 'minotaur' ||
          f.characterId === 'troll' ||
          f.characterId === 'jaylon' ||
          f.characterId === 'tesla' ||
          f.characterId === 'beelzebu' ||
          f.characterId === 'dono' ||
          f.characterId === 'adao' ||
          f.characterId === 'jack')
      ) {
        f.action = 'getup';
        f.actionTime = 0;
        f.actionDuration = 0.28;
        f.invulnTime = 0.28;
      } else {
        f.action = 'idle';
        f.actionTime = 0;
        if (wasKnockdown) {
          f.invulnTime = 0.12;
        }
      }
    }
    return;
  }

  if (f.action === 'getup') {
    f.actionTime += dt;
    f.vx *= Math.pow(0.05, dt);
    if (f.actionTime >= f.actionDuration) {
      f.action = 'idle';
      f.actionTime = 0;
    }
    return;
  }

  if (f.action === 'roll') {
    f.actionTime += dt;
    f.x = clampFighterX(f.x + f.vx * dt, def.width);
    if (Math.floor(f.actionTime * 30) > Math.floor((f.actionTime - dt) * 30)) {
      spawnVisualEffect(state, {
        kind:
          f.characterId === 'elf'
            ? 'fx_elf_trail'
            : f.characterId === 'priest'
            ? 'fx_priest_particles'
            : f.characterId === 'necromancer'
            ? 'fx_necro_smoke'
            : f.characterId === 'minotaur'
            ? 'fx_minotaur_dust_trail'
            : f.characterId === 'troll'
            ? 'fx_troll_trail'
            : 'fx_rastro',
        x: f.x - Math.sign(f.vx || f.facing) * 14,
        y: GROUND_Y - 26,
        facing: (f.vx >= 0 ? 1 : -1) as 1 | -1,
        scale:
          f.characterId === 'elf'
            ? 0.34
            : f.characterId === 'priest'
            ? 0.36
            : f.characterId === 'necromancer'
            ? 0.36
            : f.characterId === 'minotaur'
            ? 0.38
            : f.characterId === 'troll'
            ? 0.38
            : 0.44,
        maxLife: 0.18,
      });
    }
    if (f.actionTime >= f.actionDuration) {
      f.action = 'idle';
      f.actionTime = 0;
      f.vx = 0;
    }
    return;
  }

  // Grab throw execution (with Arremesso do Coliseu overhead lift -> brutal slam for Minotaur)
  if (f.action === 'grab_throw') {
    f.actionTime += dt;
    const isColiseumThrow = f.characterId === 'minotaur' && f.currentMove?.id === 'special4';
    if (isColiseumThrow && !f.hitConnectedThisMove && f.actionTime < 0.24) {
      opp.x = clampFighterX(f.x + f.facing * 8, CHARACTERS[opp.characterId].width);
      opp.y = GROUND_Y - 46;
    }
    const releaseTime = isColiseumThrow ? 0.26 : 0.22;
    if (f.actionTime >= releaseTime && !f.hitConnectedThisMove) {
      f.hitConnectedThisMove = true;
      const move = f.currentMove ?? NORMAL_MOVES.grab_attempt;
      if (isColiseumThrow) {
        opp.x = clampFighterX(f.x + f.facing * 32, CHARACTERS[opp.characterId].width);
        opp.y = GROUND_Y;
        state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.55);
        spawnVisualEffect(state, {
          kind: 'fx_minotaur_earth_impact',
          x: opp.x,
          y: GROUND_Y - 12,
          facing: f.facing,
          scale: 0.58,
          maxLife: 0.4,
        });
        spawnVisualEffect(state, {
          kind: 'fx_minotaur_rocks',
          x: opp.x,
          y: GROUND_Y - 18,
          facing: f.facing,
          scale: 0.54,
          maxLife: 0.38,
        });
        spawnVisualEffect(state, {
          kind: 'fx_minotaur_dust_trail',
          x: opp.x,
          y: GROUND_Y - 10,
          facing: f.facing,
          scale: 0.5,
          maxLife: 0.35,
        });
      }
      opp.action = 'hitstun';
      applyHit(state, f, opp, {
        damage: move.damage,
        chipDamage: 0,
        knockbackX: move.knockbackX,
        knockbackY: move.knockbackY,
        hitstun: move.hitstun,
        isGrab: true,
        effectColor: move.effectColor,
        secondaryColor: move.secondaryColor,
        attackDir: f.facing,
      });
      state.events.push({ type: 'grab', slot: f.slot, x: opp.x, y: opp.y - 36 });
    }
    if (f.actionTime >= f.actionDuration) {
      f.action = 'idle';
      f.currentMove = null;
      f.actionTime = 0;
    }
    return;
  }

  // Active attack state progression
  if (isAttacking(f.action) && f.currentMove) {
    const move = f.currentMove;
    const prevTime = f.actionTime;
    f.actionTime += dt;

    // Dash/rush horizontal movement during active window
    const inActive = f.actionTime >= move.startup && f.actionTime <= move.startup + move.active;
    const justEnteredActive = prevTime < move.startup && f.actionTime >= move.startup;

    if (move.kind === 'rush' || move.kind === 'grab_rush') {
      f.vx = inActive ? f.facing * (move.kind === 'rush' ? 285 : 240) : 0;
      if (
        f.characterId === 'minotaur' &&
        inActive &&
        Math.floor(f.actionTime * 18) > Math.floor(prevTime * 18)
      ) {
        spawnVisualEffect(state, {
          kind: 'fx_minotaur_dust_trail',
          x: f.x - f.facing * 18,
          y: GROUND_Y - 12,
          facing: f.facing,
          scale: 0.44,
          maxLife: 0.24,
        });
      }
    } else if (move.kind === 'dash_combo') {
      f.vx = inActive ? f.facing * 265 : 0;
      if (f.characterId === 'ninja' && justEnteredActive) {
        spawnVisualEffect(state, {
          kind: 'fx_aura',
          x: f.x,
          y: GROUND_Y - 30,
          facing: f.facing,
          scale: 0.65,
          maxLife: 0.34,
        });
      }
      if (
        f.characterId === 'ninja' &&
        inActive &&
        Math.floor(f.actionTime * 18) > Math.floor(prevTime * 18)
      ) {
        spawnVisualEffect(state, {
          kind: 'fx_rastro',
          x: f.x - f.facing * 12,
          y: GROUND_Y - 30,
          facing: f.facing,
          scale: 0.48,
          maxLife: 0.18,
        });
      }
    } else if (move.kind === 'barrage_rush') {
      f.vx = inActive ? f.facing * 125 : 0;
      if (inActive && Math.floor(f.actionTime * 16) > Math.floor(prevTime * 16)) {
        spawnVisualEffect(state, {
          kind: 'adao_jab_spark',
          x: f.x + f.facing * 28,
          y: GROUND_Y - 36 + ((Math.floor(f.actionTime * 20) % 3) - 1) * 6,
          facing: f.facing,
          scale: 0.48,
          maxLife: 0.16,
        });
      }
    } else if (move.kind === 'axe_dash') {
      f.vx = inActive ? f.facing * 245 : 0;
      if (inActive && Math.floor(f.actionTime * 16) > Math.floor(prevTime * 16)) {
        spawnBurst(state, f.x + f.facing * 20, GROUND_Y - 32, '#e2e8f0', '#a855f7', 5, 85, 'spark');
      }
    } else if (move.kind === 'scissor_spin') {
      f.vx = inActive ? f.facing * 205 : 0;
      if (justEnteredActive) {
        spawnVisualEffect(state, {
          kind: 'jack_giant_scissors',
          x: f.x + f.facing * 24,
          y: f.y - 40,
          facing: f.facing,
          scale: 0.4,
          maxLife: 0.24,
        });
      }
      if (inActive && Math.floor(f.actionTime * 12) > Math.floor(prevTime * 12)) {
        spawnVisualEffect(state, {
          kind: 'jack_scissor_spin',
          x: f.x,
          y: f.y - 34,
          facing: f.facing,
          scale: 0.42,
          rotation: ((f.actionTime * 11) % (Math.PI * 2)),
          maxLife: 0.16,
        });
      }
    } else if (move.kind === 'charged_ko_fist') {
      f.vx = 0;
      if (justEnteredActive) {
        spawnVisualEffect(state, {
          kind: 'adao_time_fist_flash',
          x: f.x + f.facing * 52,
          y: GROUND_Y - 36,
          facing: f.facing,
          scale: 0.85,
          maxLife: 0.36,
        });
        spawnBurst(state, f.x + f.facing * 36, GROUND_Y - 36, '#9333ea', '#e9d5ff', 22, 150, 'spark');
        state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.5);
      }
    }

    if (justEnteredActive && f.characterId === 'minotaur' && f.action === 'special3') {
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_shockwave',
        x: f.x + f.facing * 26,
        y: GROUND_Y - 38,
        facing: f.facing,
        rotation: -0.55,
        scale: 0.52,
        maxLife: 0.28,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_sparks',
        x: f.x + f.facing * 28,
        y: GROUND_Y - 40,
        facing: f.facing,
        scale: 0.44,
        maxLife: 0.25,
      });
    }

    if (justEnteredActive && f.characterId === 'troll' && f.action === 'special1') {
      f.x = clampFighterX(f.x + f.facing * 12, def.width);
      spawnVisualEffect(state, {
        kind: 'fx_troll_trail',
        x: f.x - f.facing * 6,
        y: GROUND_Y - 30,
        facing: f.facing,
        scale: 0.48,
        maxLife: 0.28,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_ground_impact',
        x: f.x + f.facing * 32,
        y: GROUND_Y - 14,
        facing: f.facing,
        scale: 0.56,
        maxLife: 0.36,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_dust',
        x: f.x + f.facing * 24,
        y: GROUND_Y - 12,
        facing: f.facing,
        scale: 0.48,
        maxLife: 0.32,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_shockwaves',
        x: f.x + f.facing * 34,
        y: GROUND_Y - 24,
        facing: f.facing,
        scale: 0.5,
        maxLife: 0.28,
      });
      state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.38);
    }

    if (move.kind === 'fire_breath') {
      if (prevTime < 0.12 && f.actionTime >= 0.12) {
        spawnVisualEffect(state, {
          kind: 'fx_jaylon_smoke',
          x: f.x + f.facing * 18,
          y: f.y - 46,
          vx: f.facing * 16,
          vy: -26,
          facing: f.facing,
          scale: 0.46,
          maxLife: 0.44,
        });
      }
      if (justEnteredActive) {
        spawnVisualEffect(state, {
          kind: 'fx_jaylon_fire_breath',
          x: f.x + f.facing * 72,
          y: f.y - 34,
          facing: f.facing,
          scale: 0.44,
          maxLife: 0.34,
        });
        spawnBurst(state, f.x + f.facing * 24, f.y - 34, '#f97316', '#a855f7', 12, 115, 'smoke');
        state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.28);
      }
    }

    // Trigger non-melee special effect once at start of active frames
    if (
      justEnteredActive &&
      move.kind !== 'melee' &&
      move.kind !== 'rush' &&
      move.kind !== 'grab_rush' &&
      move.kind !== 'dash_combo' &&
      move.kind !== 'barrage_rush' &&
      move.kind !== 'axe_dash' &&
      move.kind !== 'scissor_spin' &&
      move.kind !== 'charged_ko_fist' &&
      move.kind !== 'leap_slam' &&
      move.kind !== 'fire_breath' &&
      move.kind !== 'electric_beam'
    ) {
      executeSpecialEffect(state, f, opp, move);
    }

    // Troll Salto Esmagador physics & landing shockwave
    if (move.kind === 'leap_slam') {
      if (justEnteredActive) {
        const flightTime = (2 * 275) / GRAVITY;
        const dist = Math.abs(opp.x - f.x);
        const desiredDist = Math.min(135, Math.max(24, dist));
        f.vy = -275;
        f.vx = f.facing * (desiredDist / flightTime);
        f.squashX = 0.84;
        f.squashY = 1.2;
        spawnVisualEffect(state, {
          kind: 'fx_troll_dust',
          x: f.x,
          y: GROUND_Y - 10,
          facing: f.facing,
          scale: 0.46,
          maxLife: 0.3,
        });
        spawnBurst(state, f.x, GROUND_Y - 4, move.effectColor, move.secondaryColor, 8, 70, 'smoke');
      }

      if (f.actionTime >= move.startup && !f.hitConnectedThisMove) {
        f.vy += GRAVITY * dt;
        f.x = clampFighterX(f.x + f.vx * dt, def.width);
        f.y += f.vy * dt;
        if (f.y >= GROUND_Y && f.vy >= 0) {
          f.y = GROUND_Y;
          f.vy = 0;
          f.vx = 0;
          f.squashX = 1.28;
          f.squashY = 0.72;
          f.hitConnectedThisMove = true;
          f.actionDuration = f.actionTime + move.recovery;
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.58);
          state.events.push({ type: 'land', slot: f.slot, x: f.x, y: GROUND_Y });
          spawnBurst(state, f.x, GROUND_Y - 4, move.effectColor, move.secondaryColor, 16, 140, 'smoke');
          spawnVisualEffect(state, {
            kind: 'fx_troll_ground_impact',
            x: f.x,
            y: GROUND_Y - 16,
            facing: f.facing,
            scale: 0.68,
            maxLife: 0.42,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_earth_explosion',
            x: f.x,
            y: GROUND_Y - 22,
            facing: f.facing,
            scale: 0.62,
            maxLife: 0.4,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_shockwaves',
            x: f.x,
            y: GROUND_Y - 18,
            facing: f.facing,
            scale: 0.66,
            maxLife: 0.34,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_pebbles',
            x: f.x,
            y: GROUND_Y - 28,
            facing: f.facing,
            scale: 0.56,
            maxLife: 0.38,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_dust',
            x: f.x,
            y: GROUND_Y - 10,
            facing: f.facing,
            scale: 0.56,
            maxLife: 0.36,
          });
          const slamBox = {
            x: f.x - move.rangeX,
            y: GROUND_Y - move.rangeY,
            width: move.rangeX * 2,
            height: move.rangeY,
          };
          if (rectsOverlap(slamBox, getFighterHurtbox(opp))) {
            applyHit(state, f, opp, {
              damage: move.damage,
              chipDamage: move.chipDamage,
              knockbackX: move.knockbackX,
              knockbackY: move.knockbackY,
              hitstun: move.hitstun,
              isOverhead: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: opp.x >= f.x ? 1 : -1,
            });
          }
        }
      }
    } else {
      // Standard airborne/rush movement during attack
      if (!isGrounded) {
        f.vy += GRAVITY * dt;
      }
      f.x = clampFighterX(f.x + f.vx * dt, def.width);
      f.y += f.vy * dt;
      if (f.y >= GROUND_Y) {
        f.y = GROUND_Y;
        f.vy = 0;
        if (f.action === 'air_kick') {
          f.vx = 0;
          f.action = 'idle';
          f.actionTime = 0;
          f.currentMove = null;
          f.squashX = 1.18;
          f.squashY = 0.82;
          if (f.characterId === 'beelzebu') {
            f.landingTime = 0.22;
          }
          return;
        }
      }
    }

    // Melee / Rush / Grab / Multi-hit collision checks during active frames
    if (inActive) {
      if (move.id === 'grab_attempt' || move.kind === 'grab_rush') {
        const hb = getMoveHitbox(f, move);
        const hurt = getFighterHurtbox(opp);
        if (!f.hitConnectedThisMove && rectsOverlap(hb, hurt) && opp.y >= GROUND_Y - 12 && opp.invulnTime <= 0) {
          const throwDur = f.characterId === 'minotaur' && move.id === 'special4' ? 0.44 : 0.36;
          f.action = 'grab_throw';
          f.actionTime = 0;
          f.actionDuration = throwDur;
          f.hitConnectedThisMove = false;
          f.vx = 0;
          opp.action = 'grabbed';
          opp.actionTime = 0;
          opp.actionDuration = throwDur;
          opp.vx = 0;
          opp.vy = 0;
          opp.x = clampFighterX(f.x + f.facing * 26, CHARACTERS[opp.characterId].width);
          return;
        }
      } else if (move.kind === 'dash_combo') {
        const hitInterval = move.active / 3;
        const expectedHits = Math.min(3, Math.floor((f.actionTime - move.startup) / hitInterval) + 1);
        if (expectedHits > f.multiHitsDone) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.multiHitsDone = expectedHits;
            const isFinal = expectedHits === 3;
            applyHit(state, f, opp, {
              damage: Math.round(move.damage / 3),
              chipDamage: Math.round(move.chipDamage / 3),
              knockbackX: isFinal ? move.knockbackX : 30,
              knockbackY: isFinal ? move.knockbackY : -20,
              hitstun: isFinal ? move.hitstun : 0.28,
              isSpecial: move.id.startsWith('special'),
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
            if (isFinal && f.characterId === 'ninja') {
              spawnVisualEffect(state, {
                kind: 'fx_explosao',
                x: opp.x,
                y: opp.y - 32,
                facing: f.facing,
                scale: 0.56,
                maxLife: 0.32,
              });
            }
          }
        }
      } else if (move.kind === 'barrage_rush') {
        const hitCount = 5;
        const hitInterval = move.active / hitCount;
        const expectedHits = Math.min(hitCount, Math.floor((f.actionTime - move.startup) / hitInterval) + 1);
        if (expectedHits > f.multiHitsDone) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.multiHitsDone = expectedHits;
            const isFinal = expectedHits === hitCount;
            applyHit(state, f, opp, {
              damage: Math.round(move.damage / hitCount),
              chipDamage: Math.round(move.chipDamage / hitCount),
              knockbackX: isFinal ? move.knockbackX : 14,
              knockbackY: isFinal ? move.knockbackY : -10,
              hitstun: isFinal ? move.hitstun : 0.22,
              isSpecial: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
          }
        }
      } else if (move.kind === 'axe_dash') {
        const hitCount = 4;
        const hitInterval = move.active / hitCount;
        const expectedHits = Math.min(hitCount, Math.floor((f.actionTime - move.startup) / hitInterval) + 1);
        if (expectedHits > f.multiHitsDone) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.multiHitsDone = expectedHits;
            const isFinal = expectedHits === hitCount;
            applyHit(state, f, opp, {
              damage: Math.round(move.damage / hitCount),
              chipDamage: Math.round(move.chipDamage / hitCount),
              knockbackX: isFinal ? move.knockbackX : 26,
              knockbackY: isFinal ? move.knockbackY : -16,
              hitstun: isFinal ? move.hitstun : 0.25,
              isSpecial: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
          }
        }
      } else if (move.kind === 'scissor_spin') {
        const hitCount = 4;
        const hitInterval = move.active / hitCount;
        const expectedHits = Math.min(hitCount, Math.floor((f.actionTime - move.startup) / hitInterval) + 1);
        if (expectedHits > f.multiHitsDone) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.multiHitsDone = expectedHits;
            const isFinal = expectedHits === hitCount;
            applyHit(state, f, opp, {
              damage: Math.round(move.damage / hitCount),
              chipDamage: Math.round(move.chipDamage / hitCount),
              knockbackX: isFinal ? move.knockbackX : 28,
              knockbackY: isFinal ? move.knockbackY : -14,
              hitstun: isFinal ? move.hitstun : 0.25,
              isSpecial: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
            if (isFinal) {
              spawnVisualEffect(state, {
                kind: 'jack_giant_scissors',
                x: opp.x,
                y: opp.y - 34,
                facing: f.facing,
                scale: 0.44,
                maxLife: 0.28,
              });
            }
          }
        }
      } else if (move.kind === 'charged_ko_fist') {
        if (!f.hitConnectedThisMove) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.hitConnectedThisMove = true;
            applyHit(state, f, opp, {
              damage: move.damage,
              chipDamage: 0,
              knockbackX: move.knockbackX,
              knockbackY: move.knockbackY,
              hitstun: move.hitstun,
              isSpecial: true,
              bypassBlock: true,
              instantKo: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
          }
        }
      } else if (move.kind === 'teleport' && f.characterId === 'tesla') {
        if (!f.hitConnectedThisMove) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.hitConnectedThisMove = true;
            applyHit(state, f, opp, {
              damage: move.damage,
              chipDamage: move.chipDamage,
              knockbackX: move.knockbackX,
              knockbackY: move.knockbackY,
              hitstun: move.hitstun,
              isSpecial: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
            spawnVisualEffect(state, {
              kind: 'tesla_special2_knockback',
              x: opp.x,
              y: opp.y - 32,
              facing: f.facing,
              scale: 0.46,
              maxLife: 0.38,
            });
          }
        }
      } else if (move.kind === 'electric_beam') {
        if (!f.hitConnectedThisMove) {
          const originX = f.x + f.facing * 18;
          const edgeX = f.facing === 1 ? STAGE_RIGHT_BOUND : STAGE_LEFT_BOUND;
          const beamBox = {
            x: f.facing === 1 ? originX : edgeX,
            y: f.y - 46,
            width: Math.max(10, Math.abs(edgeX - originX)),
            height: 36,
          };
          if (rectsOverlap(beamBox, getFighterHurtbox(opp))) {
            f.hitConnectedThisMove = true;
            applyHit(state, f, opp, {
              damage: move.damage,
              chipDamage: move.chipDamage,
              knockbackX: move.knockbackX,
              knockbackY: move.knockbackY,
              hitstun: move.hitstun,
              isSpecial: true,
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
            state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.34);
          }
        }
      } else if (move.kind === 'melee' || move.kind === 'rush' || move.kind === 'fire_breath') {
        if (!f.hitConnectedThisMove) {
          const hb = getMoveHitbox(f, move);
          if (rectsOverlap(hb, getFighterHurtbox(opp))) {
            f.hitConnectedThisMove = true;
            applyHit(state, f, opp, {
              damage: move.damage,
              chipDamage: move.chipDamage,
              knockbackX: move.knockbackX,
              knockbackY: move.knockbackY,
              hitstun: move.hitstun,
              isLow: move.isLow,
              isOverhead: move.isOverhead,
              isSpecial: move.id.startsWith('special'),
              effectColor: move.effectColor,
              secondaryColor: move.secondaryColor,
              attackDir: f.facing,
            });
            if (move.kind === 'fire_breath' && f.characterId === 'jaylon') {
              spawnVisualEffect(state, {
                kind: 'fx_jaylon_fire_burst',
                x: opp.x,
                y: opp.y - 32,
                facing: f.facing,
                scale: 0.48,
                maxLife: 0.34,
              });
            }
          }
        }
      }
    }

    // Hit-cancel: allow canceling a landed punch into heavy punch, kick/heavy_kick, or specials!
    if (
      f.hitConnectedThisMove &&
      isGrounded &&
      (f.action === 'punch' || f.action === 'heavy_punch' || f.action === 'crouch_punch' || f.action === 'kick')
    ) {
      const tryCancelSpecial = (slotKey: SpecialSlot): boolean => {
        if (f.specialLockTime > 0) {
          return false;
        }
        if (f.characterId === 'tesla' && slotKey === 'special1' && f.special1Cooldown > 0) {
          return false;
        }
        if (f.characterId === 'tesla' && slotKey === 'special4' && f.cageUsesThisRound >= 2) {
          return false;
        }
        if (f.characterId === 'troll' && slotKey === 'special4' && (f.furyTime > 0 || f.furyCooldown > 0)) {
          return false;
        }
        if (f.characterId === 'beelzebu' && f.specialCooldowns[slotKey] > 0) {
          return false;
        }
        if (f.characterId === 'dono') {
          // Atividade locks all actions cleanly for its full 0.6s
          if (f.action === 'special2') return false;
          if (slotKey === 'special1' && (f.donoAmmo <= 0 || f.donoReloadTimer > 0)) return false;
          if (slotKey !== 'special1' && f.specialCooldowns[slotKey] > 0) return false;
        }
        if (f.characterId === 'jack' && slotKey === 'special1' && f.jackKnives <= 0) {
          return false;
        }
        const sp = getEffectiveSpecial(f, slotKey);
        if (f.characterId === 'adao' && slotKey === 'special3') {
          return false;
        }
        if (f.energy >= sp.energyCost) {
          const moveToStart =
            f.characterId === 'jack' && slotKey === 'special1'
              ? { ...sp, jackThrowCount: input.down ? 1 : Math.min(JACK_MAX_KNIVES, f.jackKnives) }
              : sp;
          startMove(state, f, opp, moveToStart);
          return true;
        }
        return false;
      };
      if (input.special4Pressed && tryCancelSpecial('special4')) return;
      if (input.special3Pressed && tryCancelSpecial('special3')) return;
      if (input.special2Pressed && tryCancelSpecial('special2')) return;
      if (input.special1Pressed && tryCancelSpecial('special1')) return;
      if (
        (f.characterId === 'ninja' ||
          f.characterId === 'elf' ||
          f.characterId === 'priest' ||
          f.characterId === 'necromancer' ||
          f.characterId === 'minotaur' ||
          f.characterId === 'troll' ||
          f.characterId === 'jaylon' ||
          f.characterId === 'tesla' ||
          f.characterId === 'beelzebu' ||
          f.characterId === 'dono' ||
          f.characterId === 'adao' ||
          f.characterId === 'jack') &&
        f.action === 'punch' &&
        input.punchPressed
      ) {
        startMove(state, f, opp, NORMAL_MOVES.heavy_punch);
        return;
      }
      if ((f.action === 'punch' || f.action === 'heavy_punch' || f.action === 'crouch_punch') && input.kickPressed) {
        const kickMove = input.down
          ? NORMAL_MOVES.crouch_kick
          : f.characterId === 'ninja' ||
            f.characterId === 'elf' ||
            f.characterId === 'priest' ||
            f.characterId === 'necromancer' ||
            f.characterId === 'minotaur' ||
            f.characterId === 'troll' ||
            f.characterId === 'jaylon' ||
            f.characterId === 'tesla' ||
            f.characterId === 'beelzebu' ||
            f.characterId === 'dono' ||
            f.characterId === 'adao' ||
            f.characterId === 'jack'
          ? NORMAL_MOVES.heavy_kick
          : NORMAL_MOVES.kick;
        startMove(state, f, opp, kickMove);
        if (kickMove.id === 'heavy_kick' && f.characterId === 'elf') {
          spawnVisualEffect(state, {
            kind: 'fx_elf_green_slash',
            x: f.x + f.facing * 24,
            y: f.y - 30,
            facing: f.facing,
            scale: 0.5,
            maxLife: 0.28,
          });
        } else if (kickMove.id === 'heavy_kick' && f.characterId === 'priest') {
          spawnVisualEffect(state, {
            kind: 'fx_priest_particles',
            x: f.x + f.facing * 24,
            y: f.y - 30,
            facing: f.facing,
            scale: 0.45,
            maxLife: 0.26,
          });
        } else if (kickMove.id === 'heavy_kick' && f.characterId === 'necromancer') {
          spawnVisualEffect(state, {
            kind: 'fx_necro_skulls',
            x: f.x + f.facing * 24,
            y: f.y - 30,
            facing: f.facing,
            scale: 0.42,
            maxLife: 0.28,
          });
        } else if (kickMove.id === 'heavy_kick' && f.characterId === 'minotaur') {
          spawnVisualEffect(state, {
            kind: 'fx_minotaur_sparks',
            x: f.x + f.facing * 24,
            y: f.y - 30,
            facing: f.facing,
            scale: 0.44,
            maxLife: 0.26,
          });
        } else if (kickMove.id === 'heavy_kick' && f.characterId === 'troll') {
          spawnVisualEffect(state, {
            kind: 'fx_troll_shockwaves',
            x: f.x + f.facing * 24,
            y: f.y - 30,
            facing: f.facing,
            scale: 0.4,
            maxLife: 0.24,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_dust',
            x: f.x + f.facing * 16,
            y: GROUND_Y - 12,
            facing: f.facing,
            scale: 0.36,
            maxLife: 0.24,
          });
        }
        return;
      }
    }

    if (
      f.actionTime >= f.actionDuration &&
      (move.kind !== 'leap_slam' || (f.y >= GROUND_Y - 0.5 && f.hitConnectedThisMove))
    ) {
      if (f.characterId === 'jaylon' && f.action === 'special3') {
        // Post-drink 1.0s self-stun for Gole na Cerveja
        f.stunTime = 1.0;
        f.hitstunTime = 1.0;
        f.action = 'stun';
        f.currentMove = null;
        f.actionTime = 0;
        f.actionDuration = 1.0;
        f.vx = 0;
        spawnParticle(state, {
          x: f.x,
          y: f.y - def.height - 10,
          vy: -16,
          color: '#fde047',
          maxLife: 0.85,
          kind: 'text',
          text: 'TONTO!',
        });
        return;
      }
      f.action = isGrounded ? 'idle' : 'jump';
      f.currentMove = null;
      f.actionTime = 0;
      f.vx = 0;
    }
    return;
  }

  // If intro/round_end/match_over, cancel any active Adão charge cleanly
  if (state.roundPhase !== 'fighting') {
    f.adaoChargingSpecial3 = false;
    f.adaoChargeTime = 0;
    f.vx = 0;
    f.action = 'idle';
    f.actionTime += dt;
    return;
  }

  // Adão Special 3 (Time Transcending Fist) 2.0s hold-to-charge state
  if (f.characterId === 'adao' && f.adaoChargingSpecial3) {
    if (!isGrounded) {
      f.adaoChargingSpecial3 = false;
      f.adaoChargeTime = 0;
      f.action = 'jump';
      f.actionTime = 0;
      return;
    }
    if (!input.special3Held) {
      const hadCharge = f.adaoChargeTime >= 0.25;
      f.adaoChargingSpecial3 = false;
      f.adaoChargeTime = 0;
      f.action = 'idle';
      f.actionTime = 0;
      f.vx = 0;
      if (hadCharge) {
        spawnBurst(state, f.x, f.y - 34, '#9333ea', '#6b21a8', 6, 55, 'smoke');
        spawnParticle(state, {
          x: f.x,
          y: f.y - def.height - 10,
          vy: -18,
          color: '#c084fc',
          maxLife: 0.6,
          kind: 'text',
          text: 'CANCELADO',
        });
      }
      return;
    }

    f.vx = 0;
    f.vy = 0;
    f.facing = opp.x >= f.x ? 1 : -1;
    const prevCharge = f.adaoChargeTime;
    f.adaoChargeTime += dt;
    f.action = 'special3';
    f.actionTime = f.adaoChargeTime;

    if (Math.floor(f.adaoChargeTime * 7) > Math.floor(prevCharge * 7)) {
      spawnBurst(state, f.x, f.y - 26, '#a855f7', '#e9d5ff', 4, 55, 'spark');
    }

    if (f.adaoChargeTime >= ADAO_SPECIAL3_CHARGE_DURATION) {
      f.adaoChargingSpecial3 = false;
      f.adaoChargeTime = 0;
      f.adaoChargeCooldownLock = true;
      startMove(state, f, opp, def.specials.special3);
    }
    return;
  }

  // Neutral / Movement / Action Triggers
  if (canAct(f)) {
    // Auto-face opponent when grounded
    if (isGrounded && f.x !== opp.x) {
      f.facing = opp.x > f.x ? 1 : -1;
    }

    // Jack Estripador: automatic 8-knife barrage upon reaching max capacity
    if (
      f.characterId === 'jack' &&
      f.jackKnives >= JACK_MAX_KNIVES &&
      isGrounded &&
      f.specialLockTime <= 0 &&
      f.action !== 'block' &&
      f.action !== 'crouch'
    ) {
      startMove(state, f, opp, {
        ...def.specials.special1,
        energyCost: 0,
        jackThrowCount: JACK_MAX_KNIVES,
      });
      return;
    }

    // Start Adão Time Transcending Fist hold charge when Special 3 is held/pressed
    if (
      f.characterId === 'adao' &&
      isGrounded &&
      f.specialLockTime <= 0 &&
      (input.special3Held || input.special3Pressed) &&
      !f.adaoChargeCooldownLock &&
      f.energy >= def.specials.special3.energyCost
    ) {
      f.adaoChargingSpecial3 = true;
      f.adaoChargeTime = 0;
      f.action = 'special3';
      f.actionTime = 0;
      f.currentMove = null;
      f.vx = 0;
      f.vy = 0;
      f.moveHoldTime = 0;
      spawnBurst(state, f.x, f.y - 24, '#9333ea', '#e9d5ff', 8, 65, 'spark');
      return;
    }

    // Simultaneous Punch + Kick triggers Grab!
    const wantGrab = input.grabPressed || (input.punchPressed && input.kickPressed);

    // Check Special Moves first
    const trySpecial = (slotKey: SpecialSlot): boolean => {
      if (f.specialLockTime > 0) {
        return false;
      }
      if (f.characterId === 'adao' && slotKey === 'special3') {
        return false;
      }
      if (f.characterId === 'tesla' && slotKey === 'special1' && f.special1Cooldown > 0) {
        return false;
      }
      if (f.characterId === 'tesla' && slotKey === 'special4' && f.cageUsesThisRound >= 2) {
        return false;
      }
      if (f.characterId === 'troll' && slotKey === 'special4' && (f.furyTime > 0 || f.furyCooldown > 0)) {
        return false;
      }
      if (f.characterId === 'beelzebu' && f.specialCooldowns[slotKey] > 0) {
        return false;
      }
      if (f.characterId === 'dono') {
        if (slotKey === 'special1' && (f.donoAmmo <= 0 || f.donoReloadTimer > 0)) {
          return false;
        }
        if (slotKey !== 'special1' && f.specialCooldowns[slotKey] > 0) {
          return false;
        }
      }
      if (f.characterId === 'jack' && slotKey === 'special1' && f.jackKnives <= 0) {
        return false;
      }
      const move = getEffectiveSpecial(f, slotKey);
      if (f.energy >= move.energyCost && isGrounded) {
        const moveToStart =
          f.characterId === 'jack' && slotKey === 'special1'
            ? { ...move, jackThrowCount: input.down ? 1 : Math.min(JACK_MAX_KNIVES, f.jackKnives) }
            : move;
        startMove(state, f, opp, moveToStart);
        return true;
      }
      return false;
    };

    if (input.special4Pressed && trySpecial('special4')) return;
    if (input.special3Pressed && trySpecial('special3')) return;
    if (input.special2Pressed && trySpecial('special2')) return;
    if (input.special1Pressed && trySpecial('special1')) return;

    if (wantGrab && isGrounded) {
      startMove(state, f, opp, NORMAL_MOVES.grab_attempt);
      return;
    }

    if (input.punchPressed) {
      if (!isGrounded) {
        f.airAttackKind = 'punch';
        startMove(state, f, opp, NORMAL_MOVES.air_kick);
      } else if (input.down) {
        startMove(state, f, opp, NORMAL_MOVES.crouch_punch);
      } else {
        startMove(state, f, opp, NORMAL_MOVES.punch);
      }
      return;
    }

    if (input.kickPressed) {
      if (!isGrounded) {
        f.airAttackKind = 'kick';
        startMove(state, f, opp, NORMAL_MOVES.air_kick);
      } else if (input.down) {
        startMove(state, f, opp, NORMAL_MOVES.crouch_kick);
      } else {
        startMove(state, f, opp, NORMAL_MOVES.kick);
      }
      return;
    }

    const moveDir = ((input.right ? 1 : 0) - (input.left ? 1 : 0)) as -1 | 0 | 1;

    // Evasive Roll for Ninja, Elf, Priest, Necromancer, Minotaur & Troll when blocking while moving horizontally
    if (
      (f.characterId === 'ninja' ||
        f.characterId === 'elf' ||
        f.characterId === 'priest' ||
        f.characterId === 'necromancer' ||
        f.characterId === 'minotaur' ||
        f.characterId === 'troll' ||
        f.characterId === 'jaylon' ||
        f.characterId === 'tesla' ||
        f.characterId === 'beelzebu' ||
        f.characterId === 'dono' ||
        f.characterId === 'adao' ||
        f.characterId === 'jack') &&
      input.block &&
      moveDir !== 0 &&
      isGrounded &&
      f.rootTime <= 0
    ) {
      f.action = 'roll';
      f.actionTime = 0;
      f.actionDuration = 0.28;
      f.vx = moveDir * 230;
      f.invulnTime = 0.18;
      f.moveHoldTime = 0;
      spawnVisualEffect(state, {
        kind:
          f.characterId === 'elf'
            ? 'fx_elf_trail'
            : f.characterId === 'priest'
            ? 'fx_priest_particles'
            : f.characterId === 'necromancer'
            ? 'fx_necro_smoke'
            : f.characterId === 'minotaur'
            ? 'fx_minotaur_dust_trail'
            : f.characterId === 'troll'
            ? 'fx_troll_trail'
            : 'fx_fumaca',
        x: f.x,
        y: GROUND_Y - 22,
        facing: moveDir,
        scale:
          f.characterId === 'elf'
            ? 0.42
            : f.characterId === 'priest'
            ? 0.45
            : f.characterId === 'necromancer'
            ? 0.45
            : f.characterId === 'minotaur'
            ? 0.44
            : f.characterId === 'troll'
            ? 0.44
            : 0.5,
        maxLife: 0.28,
      });
      return;
    }

    // Blocking
    if (input.block && isGrounded) {
      f.action = 'block';
      f.isLowBlock = Boolean(input.down);
      f.vx = 0;
      f.moveHoldTime = 0;
      f.actionTime += dt;
      return;
    }

    // Crouching
    if (input.down && isGrounded) {
      if (f.action !== 'crouch') {
        f.actionTime = 0;
      }
      f.action = 'crouch';
      f.vx = 0;
      f.moveHoldTime = 0;
      f.actionTime += dt;
      return;
    }

    // Smooth Crouch -> StandUp transition for Ninja, Elf, Priest, Necromancer, Minotaur & Troll when releasing Down
    if (
      (f.characterId === 'ninja' ||
        f.characterId === 'elf' ||
        f.characterId === 'priest' ||
        f.characterId === 'necromancer' ||
        f.characterId === 'minotaur' ||
        f.characterId === 'troll' ||
        f.characterId === 'jaylon' ||
        f.characterId === 'tesla' ||
        f.characterId === 'beelzebu' ||
        f.characterId === 'dono' ||
        f.characterId === 'adao' ||
        f.characterId === 'jack') &&
      f.action === 'crouch' &&
      isGrounded &&
      !input.down &&
      moveDir === 0 &&
      !input.up
    ) {
      f.action = 'standup';
      f.actionTime = 0;
      f.actionDuration = 0.24;
      f.vx = 0;
      return;
    }

    // Speed modifiers (ice arrow slow, troll fury, necromancer root, Dono MaryJuana 1.5x)
    const speedMul =
      (f.rootTime > 0 ? 0 : 1) *
      (f.slowTime > 0 ? 0.55 : 1) *
      (f.furyTime > 0 ? 1.3 : 1);
    const groundSpeedMul =
      speedMul * (f.characterId === 'dono' && f.donoSpeedTime > 0 ? DONO_MARYJUANA_SPEED_MULTIPLIER : 1);

    // Jumping
    if (input.up && isGrounded && f.rootTime <= 0) {
      f.vy = -def.jumpForce;
      f.vx = moveDir * def.walkSpeed * (f.action === 'run' ? 1.15 : 0.92) * speedMul;
      f.action = 'jump';
      f.actionTime = 0;
      f.moveHoldTime = 0;
      f.squashX = 0.84;
      f.squashY = 1.18;
      spawnBurst(state, f.x, GROUND_Y, '#cbd5e1', '#64748b', 5, 55, 'smoke');
      state.events.push({ type: 'jump', slot: f.slot, x: f.x, y: GROUND_Y });
    } else if (isGrounded) {
      if (moveDir !== 0 && f.rootTime <= 0) {
        if (f.moveDir === moveDir) {
          f.moveHoldTime += dt;
        } else {
          f.moveDir = moveDir;
          f.moveHoldTime = dt;
        }
        const shouldRun =
          (f.characterId === 'ninja' ||
            f.characterId === 'elf' ||
            f.characterId === 'priest' ||
            f.characterId === 'necromancer' ||
            f.characterId === 'minotaur' ||
            f.characterId === 'troll' ||
            f.characterId === 'jaylon' ||
            f.characterId === 'tesla' ||
            f.characterId === 'beelzebu' ||
            f.characterId === 'dono' ||
            f.characterId === 'adao' ||
            f.characterId === 'jack') &&
          f.moveHoldTime >= 0.28;
        const nextAction: FighterAction = shouldRun ? 'run' : 'walk';
        if (f.action !== nextAction) {
          f.action = nextAction;
          f.actionTime = 0;
        }
        const runMul = shouldRun ? 1.42 : 1;
        f.vx = moveDir * def.walkSpeed * runMul * groundSpeedMul;
        f.walkDistance += Math.abs(f.vx) * dt;

        if (shouldRun && Math.floor(f.actionTime * 10) > Math.floor((f.actionTime - dt) * 10)) {
          spawnVisualEffect(state, {
            kind:
              f.characterId === 'elf'
                ? 'fx_elf_trail'
                : f.characterId === 'priest'
                ? 'fx_priest_particles'
                : f.characterId === 'necromancer'
                ? 'fx_necro_smoke'
                : f.characterId === 'minotaur'
                ? 'fx_minotaur_dust_trail'
                : f.characterId === 'troll'
                ? 'fx_troll_trail'
                : 'fx_rastro',
            x: f.x - moveDir * 14,
            y: GROUND_Y - 30,
            facing: moveDir,
            scale:
              f.characterId === 'elf'
                ? 0.32
                : f.characterId === 'priest'
                ? 0.34
                : f.characterId === 'necromancer'
                ? 0.34
                : f.characterId === 'minotaur'
                ? 0.36
                : f.characterId === 'troll'
                ? 0.36
                : 0.42,
            maxLife: 0.16,
          });
        }
      } else {
        f.moveDir = 0;
        f.moveHoldTime = 0;
        f.vx = 0;
        if (f.action === 'standup') {
          if (f.actionTime >= f.actionDuration) {
            f.action = 'idle';
            f.actionTime = 0;
          }
        } else {
          if (f.action !== 'idle') {
            f.actionTime = 0;
          }
          f.action = 'idle';
        }
      }
    } else {
      // Airborne drift
      if (moveDir !== 0) {
        f.vx += moveDir * 240 * dt;
        const maxAir = def.walkSpeed * 1.05;
        f.vx = Math.max(-maxAir, Math.min(maxAir, f.vx));
      }
    }

    f.actionTime += dt;
  }

  // Gravity & Position Integration
  if (!isGrounded || f.vy < 0) {
    f.vy += GRAVITY * dt;
  }
  f.x = clampFighterX(f.x + f.vx * dt, def.width);
  f.y += f.vy * dt;

  if (f.y >= GROUND_Y) {
    if (f.vy > 100) {
      f.squashX = 1.2;
      f.squashY = 0.8;
      spawnBurst(state, f.x, GROUND_Y, '#94a3b8', '#475569', 5, 50, 'smoke');
      state.events.push({ type: 'land', slot: f.slot, x: f.x, y: GROUND_Y });
    }
    f.y = GROUND_Y;
    f.vy = 0;
    if (f.action === 'jump') {
      f.action = 'idle';
      f.actionTime = 0;
      if (f.characterId === 'beelzebu') {
        f.landingTime = 0.22;
      }
    }
  }
}

function resolvePushboxes(f1: FighterState, f2: FighterState): void {
  // Prevent standing/crouching fighters from walking straight through each other
  if (f1.action === 'grabbed' || f2.action === 'grabbed') return;
  if (Math.abs(f1.y - f2.y) > 34) return;

  const w1 = CHARACTERS[f1.characterId].width;
  const w2 = CHARACTERS[f2.characterId].width;
  const minSep = (w1 + w2) * 0.44;
  const dx = f2.x - f1.x;
  const absDx = Math.abs(dx);
  if (absDx < minSep) {
    const push = (minSep - absDx) * 0.5;
    const dir = dx >= 0 ? 1 : -1;
    f1.x = clampFighterX(f1.x - dir * push, w1);
    f2.x = clampFighterX(f2.x + dir * push, w2);
  }
}

function updateProjectiles(state: MatchState, dt: number): void {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.life -= dt;
    if (p.kind === 'homing_skull') {
      const targetSlot = p.homingTargetSlot ?? (p.ownerSlot === 1 ? 2 : 1);
      const tgt = targetSlot === 1 ? state.f1 : state.f2;
      if ((p.homingDelay ?? 0) > 0) {
        p.homingDelay = Math.max(0, (p.homingDelay ?? 0) - dt);
      } else if (tgt.action !== 'ko') {
        const tx = tgt.x;
        const ty = tgt.y - 28;
        const dx = tx - p.x;
        const dy = ty - p.y;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = p.homingSpeed ?? 195;
        const desiredVx = (dx / dist) * speed;
        const desiredVy = (dy / dist) * speed;
        const steer = Math.min(1, dt * 11);
        p.vx += (desiredVx - p.vx) * steer;
        p.vy += (desiredVy - p.vy) * steer;
      }
      p.rotation = (p.rotation ?? 0) + dt * 9 * (p.vx >= 0 ? 1 : -1);
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Trail particle
    if (p.kind === 'boulder' && Math.floor(p.life * 16) > Math.floor((p.life - dt) * 16)) {
      spawnVisualEffect(state, {
        kind: 'fx_troll_pebbles',
        x: p.x - Math.sign(p.vx || 1) * 10,
        y: p.y,
        facing: (p.vx >= 0 ? 1 : -1) as 1 | -1,
        scale: 0.3,
        maxLife: 0.22,
      });
    } else if (Math.floor(p.life * 40) % 2 === 0) {
      spawnParticle(state, {
        x: p.x,
        y: p.y,
        vx: -p.vx * 0.1,
        vy: -12,
        size: 2,
        color: p.color,
        maxLife: 0.16,
        kind: 'pixel',
      });
    }

    // Tesla Special 3 (Feixe de Eletricidade) reflects enemy projectiles on contact
    const pBox = {
      x: p.x - p.width / 2,
      y: p.y - p.height / 2,
      width: p.width,
      height: p.height,
    };
    let reflectedThisTick = false;
    for (const caster of [state.f1, state.f2]) {
      if (
        p.ownerSlot !== caster.slot &&
        caster.characterId === 'tesla' &&
        caster.action === 'special3' &&
        caster.currentMove?.kind === 'electric_beam' &&
        caster.actionTime >= caster.currentMove.startup &&
        caster.actionTime <= caster.currentMove.startup + caster.currentMove.active
      ) {
        const originX = caster.x + caster.facing * 8;
        const edgeX = caster.facing === 1 ? STAGE_RIGHT_BOUND : STAGE_LEFT_BOUND;
        const beamBox = {
          x: caster.facing === 1 ? originX : edgeX,
          y: caster.y - 48,
          width: Math.max(12, Math.abs(edgeX - originX)),
          height: 44,
        };
        if (rectsOverlap(pBox, beamBox)) {
          p.ownerSlot = caster.slot;
          p.vx = caster.facing * Math.max(Math.abs(p.vx), 260);
          p.vy = -p.vy * 0.2;
          p.hitTargets = [];
          p.life = Math.max(p.life, 1.8);
          p.maxLife = Math.max(p.maxLife, 1.8);
          spawnVisualEffect(state, {
            kind: 'tesla_special3_reflection',
            x: p.x,
            y: p.y,
            facing: caster.facing,
            scale: 0.45,
            maxLife: 0.28,
          });
          spawnBurst(state, p.x, p.y, '#38bdf8', '#ffffff', 10, 100, 'spark');
          spawnParticle(state, {
            x: p.x,
            y: p.y - 18,
            vy: -20,
            color: '#38bdf8',
            maxLife: 0.65,
            kind: 'text',
            text: 'REFLETIDO!',
          });
          reflectedThisTick = true;
          break;
        }
      }
    }
    if (reflectedThisTick) {
      continue;
    }

    const target = p.ownerSlot === 1 ? state.f2 : state.f1;
    const owner = p.ownerSlot === 1 ? state.f1 : state.f2;

    if (!p.hitTargets.includes(target.slot)) {
      const box = {
        x: p.x - p.width / 2,
        y: p.y - p.height / 2,
        width: p.width,
        height: p.height,
      };
      if (rectsOverlap(box, getFighterHurtbox(target))) {
        if (p.kind === 'homing_skull' && target.skullHitCooldown > 0) {
          // Hover just outside target during hit interval so waiting skulls do not overshoot
          p.x -= p.vx * dt * 0.9;
          p.y -= p.vy * dt * 0.9 + 24 * dt;
          continue;
        }
        p.hitTargets.push(target.slot);
        if (p.kind === 'homing_skull') {
          target.skullHitCooldown = 0.22;
        }
        applyHit(state, owner, target, {
          damage: p.damage,
          chipDamage: p.chipDamage,
          knockbackX: p.knockbackX,
          knockbackY: p.knockbackY,
          hitstun: p.hitstun,
          isOverhead: p.kind === 'rain_arrow',
          isSpecial: true,
          effectColor: p.color,
          secondaryColor: p.secondaryColor,
          statusEffect: p.statusEffect,
          attackDir: p.vx >= 0 ? 1 : -1,
        });
        if (p.kind === 'arcane_arrow') {
          spawnVisualEffect(state, {
            kind: 'fx_elf_arcane_explosion',
            x: target.x,
            y: GROUND_Y - 26,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.48,
            maxLife: 0.36,
          });
        } else if (p.kind === 'rain_arrow') {
          spawnVisualEffect(state, {
            kind: 'fx_elf_green_burst',
            x: p.x,
            y: GROUND_Y - 14,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.48,
            maxLife: 0.28,
          });
        } else if (p.kind === 'dark_orb') {
          spawnVisualEffect(state, {
            kind: 'fx_necro_soul_explosion',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.48,
            maxLife: 0.34,
          });
        } else if (p.kind === 'specter') {
          spawnVisualEffect(state, {
            kind: 'fx_necro_skulls',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.44,
            maxLife: 0.32,
          });
          spawnVisualEffect(state, {
            kind: 'fx_necro_soul_explosion',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.42,
            maxLife: 0.3,
          });
        } else if (p.kind === 'boulder') {
          spawnVisualEffect(state, {
            kind: 'fx_troll_earth_explosion',
            x: target.x,
            y: Math.min(GROUND_Y - 12, p.y),
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.5,
            maxLife: 0.34,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_pebbles',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.46,
            maxLife: 0.34,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_ground_impact',
            x: target.x,
            y: GROUND_Y - 12,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.48,
            maxLife: 0.32,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.35);
        } else if (p.kind === 'beer_bottle') {
          spawnVisualEffect(state, {
            kind: 'fx_jaylon_bottle_impact',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.46,
            maxLife: 0.34,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.28);
        } else if (p.kind === 'electric_ball') {
          spawnVisualEffect(state, {
            kind: 'tesla_special1_impact',
            x: target.x,
            y: target.y - 28,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.45,
            maxLife: 0.42,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.3);
        } else if (p.kind === 'poison_lance') {
          spawnVisualEffect(state, {
            kind: 'beelzebu_veneno_impact',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.42,
            maxLife: 0.36,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.28);
        } else if (p.kind === 'homing_skull') {
          spawnVisualEffect(state, {
            kind: 'beelzebu_cranio_impact',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.36,
            maxLife: 0.34,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.22);
        } else if (p.kind === 'pistol_bullet') {
          spawnVisualEffect(state, {
            kind: 'dono_festa_impact',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.45,
            maxLife: 0.26,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.22);
        } else if (p.kind === 'jack_knife') {
          spawnVisualEffect(state, {
            kind: 'jack_knife_burst',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.28,
            maxLife: 0.24,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.14);
        } else if (p.kind === 'blood_wave') {
          spawnVisualEffect(state, {
            kind: 'jack_blood_splatter',
            x: target.x,
            y: p.y,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.36,
            maxLife: 0.32,
          });
          spawnVisualEffect(state, {
            kind: 'jack_blood_eruption',
            x: target.x,
            y: GROUND_Y - 26,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.36,
            maxLife: 0.38,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.3);
        }
        if (!p.piercing) {
          state.projectiles.splice(i, 1);
          continue;
        }
      }
    }

    if (
      p.life <= 0 ||
      p.x < -30 ||
      p.x > STAGE_WIDTH + 30 ||
      p.y > GROUND_Y + 8
    ) {
      if (p.y > GROUND_Y && (p.kind === 'boulder' || p.kind === 'rain_arrow' || p.kind === 'beer_bottle')) {
        spawnBurst(state, p.x, GROUND_Y, p.color, p.secondaryColor, 6, 70, 'smoke');
        if (p.kind === 'boulder') {
          spawnVisualEffect(state, {
            kind: 'fx_troll_earth_explosion',
            x: p.x,
            y: GROUND_Y - 14,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.5,
            maxLife: 0.34,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_pebbles',
            x: p.x,
            y: GROUND_Y - 20,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.44,
            maxLife: 0.32,
          });
          spawnVisualEffect(state, {
            kind: 'fx_troll_ground_impact',
            x: p.x,
            y: GROUND_Y - 12,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.48,
            maxLife: 0.32,
          });
          state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.32);
        } else if (p.kind === 'rain_arrow') {
          spawnVisualEffect(state, {
            kind: 'fx_elf_green_burst',
            x: p.x,
            y: GROUND_Y - 12,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.42,
            maxLife: 0.25,
          });
        } else if (p.kind === 'beer_bottle') {
          spawnVisualEffect(state, {
            kind: 'fx_jaylon_bottle_impact',
            x: p.x,
            y: GROUND_Y - 14,
            facing: p.vx >= 0 ? 1 : -1,
            scale: 0.42,
            maxLife: 0.3,
          });
        }
      }
      state.projectiles.splice(i, 1);
    }
  }
}

function updateHazards(state: MatchState, dt: number): void {
  for (let i = state.hazards.length - 1; i >= 0; i--) {
    const h = state.hazards[i];
    if (h.delay > 0) {
      h.delay -= dt;
      continue;
    }
    h.activeTime -= dt;

    if (h.kind === 'vomit_puddle') {
      h.slipCooldown = Math.max(0, (h.slipCooldown ?? 0) - dt);
      const target = h.ownerSlot === 1 ? state.f2 : state.f1;
      const box = {
        x: h.x - h.width / 2,
        y: h.y - h.height,
        width: h.width,
        height: h.height,
      };
      if (
        (h.slipCooldown ?? 0) <= 0 &&
        target.y >= GROUND_Y - 6 &&
        target.invulnTime <= 0 &&
        target.action !== 'ko' &&
        target.action !== 'grabbed' &&
        rectsOverlap(box, getFighterHurtbox(target))
      ) {
        h.slipCooldown = 0.85;
        const slideDir = target.vx !== 0 ? Math.sign(target.vx) : target.x >= h.x ? 1 : -1;
        target.slipTime = 0.75;
        target.hitstunTime = Math.max(target.hitstunTime, 0.75);
        target.vx = slideDir * 165;
        target.action = 'hitstun';
        target.actionTime = 0;
        target.actionDuration = 0.75;
        target.currentMove = null;
        target.squashX = 1.24;
        target.squashY = 0.78;
        spawnBurst(state, target.x, GROUND_Y - 6, h.color, h.secondaryColor, 10, 90, 'spark');
        spawnParticle(state, {
          x: target.x,
          y: target.y - 46,
          vy: -22,
          color: '#a3e635',
          maxLife: 0.75,
          kind: 'text',
          text: 'ESCORREGOU!',
        });
      }
    } else if (h.kind === 'electric_cage') {
      h.cageShockCooldown = Math.max(0, (h.cageShockCooldown ?? 0) - dt);
      const target = h.ownerSlot === 1 ? state.f2 : state.f1;
      const owner = h.ownerSlot === 1 ? state.f1 : state.f2;
      if (target.action !== 'ko' && target.action !== 'grabbed') {
        const oppDef = CHARACTERS[target.characterId];
        const oppHalf = oppDef.width * 0.45;
        const leftWall = h.x - h.width / 2 + oppHalf;
        const rightWall = h.x + h.width / 2 - oppHalf;
        const hitWallBeforeClamp = target.x < leftWall || target.x > rightWall;
        target.x = Math.max(leftWall, Math.min(rightWall, target.x));
        if (target.y < GROUND_Y - 34) {
          target.y = GROUND_Y - 34;
          target.vy = Math.max(target.vy, 40);
        }

        const isJumping = target.y < GROUND_Y - 3 || target.vy < -25;
        const dx = Math.abs(target.x - (h.cageLastX ?? target.x));
        h.cageLastX = target.x;
        if (dx > 0.35) {
          h.cageMoveAccum = (h.cageMoveAccum ?? 0) + dx;
        } else {
          h.cageMoveAccum = Math.max(0, (h.cageMoveAccum ?? 0) - 24 * dt);
        }
        const pushingWall =
          (hitWallBeforeClamp || Math.abs(target.x - h.x) >= h.width * 0.5 - oppHalf - 1.5) &&
          Math.abs(target.vx) > 15;

        if ((isJumping || (h.cageMoveAccum ?? 0) >= 16 || pushingWall) && (h.cageShockCooldown ?? 0) <= 0) {
          h.cageShockCooldown = 0.52;
          h.cageMoveAccum = 0;
          applyHit(state, owner, target, {
            damage: h.damage,
            chipDamage: h.chipDamage,
            knockbackX: 0,
            knockbackY: 0,
            hitstun: 0.22,
            effectColor: h.color,
            secondaryColor: h.secondaryColor,
            attackDir: target.facing,
          });
          spawnVisualEffect(state, {
            kind: 'tesla_special4_electric_damage',
            x: target.x,
            y: target.y - 28,
            facing: target.facing,
            scale: 0.75,
            maxLife: 0.34,
          });
          spawnBurst(state, target.x, target.y - 28, '#22d3ee', '#f97316', 10, 85, 'spark');
          spawnParticle(state, {
            x: target.x,
            y: target.y - oppDef.height - 10,
            vy: -20,
            color: '#22d3ee',
            maxLife: 0.65,
            kind: 'text',
            text: 'CHOQUE!',
          });
        }
      }
    } else if (h.kind === 'toxic_cloud') {
      h.x = clampFighterX(h.x + (h.vx ?? 0) * dt, h.width * 0.65);
      h.vx = (h.vx ?? 0) * Math.pow(0.28, dt);
      h.tickTimer = Math.max(0, (h.tickTimer ?? 0) - dt);
      const target = h.ownerSlot === 1 ? state.f2 : state.f1;
      const owner = h.ownerSlot === 1 ? state.f1 : state.f2;
      const box = {
        x: h.x - h.width / 2,
        y: h.y - h.height,
        width: h.width,
        height: h.height,
      };
      if ((h.tickTimer ?? 0) <= 0 && target.action !== 'ko' && rectsOverlap(box, getFighterHurtbox(target))) {
        h.tickTimer = 0.46;
        applyHit(state, owner, target, {
          damage: h.damage,
          chipDamage: h.chipDamage,
          knockbackX: h.knockbackX,
          knockbackY: h.knockbackY,
          hitstun: 0.22,
          effectColor: h.color,
          secondaryColor: h.secondaryColor,
          statusEffect: 'poison',
          attackDir: target.x >= h.x ? 1 : -1,
        });
        spawnVisualEffect(state, {
          kind: 'beelzebu_malboro_impact',
          x: target.x,
          y: target.y - 26,
          facing: target.x >= h.x ? 1 : -1,
          scale: 0.38,
          maxLife: 0.3,
        });
      }
    } else if (h.kind === 'shadow_domain') {
      h.tickTimer = Math.max(0, (h.tickTimer ?? 0) - dt);
      const target = h.ownerSlot === 1 ? state.f2 : state.f1;
      const owner = h.ownerSlot === 1 ? state.f1 : state.f2;
      if (target.action !== 'ko' && target.action !== 'grabbed') {
        const oppDef = CHARACTERS[target.characterId];
        const oppHalf = oppDef.width * 0.45;
        const leftWall = h.x - h.width / 2 + oppHalf;
        const rightWall = h.x + h.width / 2 - oppHalf;
        target.x = Math.max(leftWall, Math.min(rightWall, target.x));
        if (target.y < GROUND_Y - 52) {
          target.y = GROUND_Y - 52;
          target.vy = Math.max(target.vy, 30);
        }

        if ((h.tickTimer ?? 0) <= 0 && h.activeTime > 0.1) {
          h.tickTimer = 0.52;
          applyHit(state, owner, target, {
            damage: h.damage,
            chipDamage: h.chipDamage,
            knockbackX: 0,
            knockbackY: 0,
            hitstun: 0.22,
            effectColor: h.color,
            secondaryColor: h.secondaryColor,
            attackDir: target.x >= h.x ? 1 : -1,
          });
          spawnBurst(state, target.x, target.y - 28, '#9333ea', '#1e1030', 8, 75, 'smoke');
        }
      }

      if (h.activeTime <= 0 && !h.exploded) {
        h.exploded = true;
        spawnVisualEffect(state, {
          kind: 'beelzebu_dominio_explosion',
          x: h.x,
          y: GROUND_Y - 46,
          facing: 1,
          scale: 0.46,
          maxLife: 0.45,
        });
        spawnBurst(state, h.x, GROUND_Y - 32, '#c084fc', '#3b0764', 20, 145, 'spark');
        state.shakeTrauma = Math.min(1, state.shakeTrauma + 0.55);
        const box = {
          x: h.x - h.width / 2 - 10,
          y: h.y - h.height - 12,
          width: h.width + 20,
          height: h.height + 16,
        };
        if (target.action !== 'ko' && rectsOverlap(box, getFighterHurtbox(target))) {
          applyHit(state, owner, target, {
            damage: 52,
            chipDamage: 12,
            knockbackX: h.knockbackX,
            knockbackY: h.knockbackY,
            hitstun: 0.46,
            effectColor: h.color,
            secondaryColor: h.secondaryColor,
            attackDir: target.x >= h.x ? 1 : -1,
          });
        }
      }
    } else if (!h.hasHit) {
      const target = h.ownerSlot === 1 ? state.f2 : state.f1;
      const owner = h.ownerSlot === 1 ? state.f1 : state.f2;
      const box = {
        x: h.x - h.width / 2,
        y: h.y - h.height,
        width: h.width,
        height: h.height,
      };
      if (rectsOverlap(box, getFighterHurtbox(target))) {
        h.hasHit = true;
        applyHit(state, owner, target, {
          damage: h.damage,
          chipDamage: h.chipDamage,
          knockbackX: h.knockbackX,
          knockbackY: h.knockbackY,
          hitstun: 0.42,
          isLow: h.kind === 'seismic_wave' || h.kind === 'underworld_hands',
          isOverhead: h.kind === 'celestial_hammer',
          isSpecial: true,
          effectColor: h.color,
          secondaryColor: h.secondaryColor,
          statusEffect: h.statusEffect === 'slow' || h.statusEffect === 'root' ? h.statusEffect : undefined,
          attackDir: target.x >= h.x ? 1 : -1,
        });
      }
    }

    if (h.activeTime <= 0) {
      state.hazards.splice(i, 1);
    }
  }
}

function updateParticles(state: MatchState, dt: number): void {
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
}

function updateVisualEffects(state: MatchState, dt: number): void {
  for (let i = state.visualEffects.length - 1; i >= 0; i--) {
    const fx = state.visualEffects[i];
    fx.life -= dt;
    if (fx.life <= 0) {
      state.visualEffects.splice(i, 1);
      continue;
    }
    fx.x += fx.vx * dt;
    fx.y += fx.vy * dt;
  }
}

export function computeAiInputs(state: MatchState, dt: number): InputState {
  const input = createEmptyInput();
  if (state.roundPhase !== 'fighting') return input;

  const ai = state.f2;
  const player = state.f1;
  ai.aiCooldown = Math.max(0, ai.aiCooldown - dt);
  ai.aiDecisionTimer = Math.max(0, ai.aiDecisionTimer - dt);

  const dx = player.x - ai.x;
  const absDx = Math.abs(dx);
  const towardLeft = dx < 0;

  // Keep holding Time Transcending Fist if AI Adão is mid-charge and player stays nearby
  if (ai.characterId === 'adao' && ai.adaoChargingSpecial3) {
    if (absDx < 135 && player.action !== 'ko') {
      input.special3Held = true;
    }
    return input;
  }

  // Difficulty knobs
  const reactionInterval =
    state.difficulty === 'easy' ? 0.34 : state.difficulty === 'normal' ? 0.17 : 0.08;
  const blockChance =
    state.difficulty === 'easy' ? 0.18 : state.difficulty === 'normal' ? 0.48 : 0.76;
  const specialChance =
    state.difficulty === 'easy' ? 0.18 : state.difficulty === 'normal' ? 0.45 : 0.72;

  // Camuflagem de Cria real gameplay disruption: AI loses visual lock when player is invisible
  if (player.characterId === 'dono' && player.donoCamoTime > 0) {
    if (ai.aiDecisionTimer <= 0) {
      ai.aiDecisionTimer = reactionInterval * 2.2;
      ai.aiIntent = Math.random() < 0.72 ? 'idle' : 'retreat';
    }
    if (ai.aiIntent === 'retreat') {
      if (towardLeft) input.right = true;
      else input.left = true;
    }
    return input;
  }

  const incomingThreat =
    isAttacking(player.action) ||
    state.projectiles.some((p) => p.ownerSlot === 1 && Math.abs(p.x - ai.x) < 95);

  if (ai.aiDecisionTimer <= 0) {
    ai.aiDecisionTimer = reactionInterval;

    if (incomingThreat && absDx < 110 && Math.random() < blockChance) {
      ai.aiIntent = 'block';
    } else if (absDx > 135) {
      ai.aiIntent = Math.random() < 0.78 ? 'approach' : 'idle';
    } else if (absDx < 45) {
      ai.aiIntent = Math.random() < 0.2 ? 'retreat' : 'rush';
    } else {
      ai.aiIntent = Math.random() < 0.65 ? 'approach' : 'retreat';
    }
  }

  // Movement from intent
  if (ai.aiIntent === 'block') {
    input.block = true;
  } else if (ai.aiIntent === 'approach' || ai.aiIntent === 'rush') {
    if (towardLeft) input.left = true;
    else input.right = true;
  } else if (ai.aiIntent === 'retreat') {
    if (towardLeft) input.right = true;
    else input.left = true;
  }

  // Jump over projectiles occasionally on Normal/Hard
  if (
    state.difficulty !== 'easy' &&
    state.projectiles.some((p) => p.ownerSlot === 1 && Math.abs(p.x - ai.x) < 60 && p.y > GROUND_Y - 50) &&
    Math.random() < 0.12
  ) {
    input.up = true;
  }

  // Keep opening 2.2s of Round 1 approachable
  if (state.roundNumber === 1 && state.elapsedMatchTime < 2.2) {
    if (absDx > 80) {
      if (towardLeft) input.left = true;
      else input.right = true;
    }
    return input;
  }

  // Offensive actions
  if (ai.aiCooldown <= 0 && canAct(ai)) {
    const def = CHARACTERS[ai.characterId];
    const roll = Math.random();
    const canAnySpecial = ai.specialLockTime <= 0;
    const canAiSpecial1 =
      canAnySpecial &&
      (ai.characterId !== 'tesla' || ai.special1Cooldown <= 0) &&
      (ai.characterId !== 'beelzebu' || ai.specialCooldowns.special1 <= 0) &&
      (ai.characterId !== 'dono' || (ai.donoAmmo > 0 && ai.donoReloadTimer <= 0)) &&
      (ai.characterId !== 'jack' || ai.jackKnives >= 1);
    const canAiSpecial2 =
      canAnySpecial &&
      (ai.characterId !== 'beelzebu' || ai.specialCooldowns.special2 <= 0) &&
      (ai.characterId !== 'dono' || (ai.specialCooldowns.special2 <= 0 && ai.energy < 80));
    const canAiSpecial3 =
      canAnySpecial &&
      (ai.characterId !== 'jaylon' || ai.hp < ai.maxHp * 0.72) &&
      (ai.characterId !== 'beelzebu' || ai.specialCooldowns.special3 <= 0) &&
      (ai.characterId !== 'dono' || ai.specialCooldowns.special3 <= 0);
    const canAiSpecial4 =
      canAnySpecial &&
      (ai.characterId !== 'troll' || (ai.furyTime <= 0 && ai.furyCooldown <= 0)) &&
      (ai.characterId !== 'tesla' || ai.cageUsesThisRound < 2) &&
      (ai.characterId !== 'beelzebu' || ai.specialCooldowns.special4 <= 0) &&
      (ai.characterId !== 'dono' || ai.specialCooldowns.special4 <= 0);

    if (absDx <= 40) {
      // Close range: grab if player blocks, or punch/kick/special4
      if (player.action === 'block' && roll < (state.difficulty === 'hard' ? 0.65 : 0.3)) {
        input.grabPressed = true;
      } else if (canAiSpecial4 && ai.energy >= def.specials.special4.energyCost && roll < specialChance * 0.42) {
        input.special4Pressed = true;
      } else if (roll < 0.6) {
        input.punchPressed = true;
      } else {
        input.kickPressed = true;
      }
      ai.aiCooldown = state.difficulty === 'easy' ? 0.78 : state.difficulty === 'normal' ? 0.44 : 0.22;
    } else if (absDx <= 115) {
      // Mid range: rush, ground trap, special 2/3, or kick
      if (canAiSpecial2 && ai.energy >= getEffectiveSpecial(ai, 'special2').energyCost && roll < specialChance * 0.48) {
        input.special2Pressed = true;
      } else if (canAiSpecial3 && ai.energy >= def.specials.special3.energyCost && roll < specialChance * 0.85) {
        if (ai.characterId === 'adao') {
          input.special3Held = true;
        } else {
          input.special3Pressed = true;
        }
      } else if (absDx < 58 && roll < 0.7) {
        input.kickPressed = true;
      }
      ai.aiCooldown = state.difficulty === 'easy' ? 0.85 : state.difficulty === 'normal' ? 0.5 : 0.28;
    } else {
      // Far range: projectiles / buffs / teleport
      if (canAiSpecial1 && ai.energy >= def.specials.special1.energyCost && roll < specialChance * 0.6) {
        input.special1Pressed = true;
      } else if (canAiSpecial3 && ai.energy >= def.specials.special3.energyCost && roll < specialChance * 0.9) {
        if (ai.characterId === 'adao') {
          if (absDx < 120) input.special3Held = true;
        } else {
          input.special3Pressed = true;
        }
      } else if (
        canAnySpecial &&
        (ai.characterId === 'ninja' || ai.characterId === 'necromancer' || ai.characterId === 'tesla') &&
        ai.energy >= def.specials.special2.energyCost &&
        state.difficulty !== 'easy' &&
        roll < 0.3
      ) {
        input.special2Pressed = true;
      }
      ai.aiCooldown = state.difficulty === 'easy' ? 0.98 : state.difficulty === 'normal' ? 0.6 : 0.35;
    }
  }

  return input;
}

function finishRound(state: MatchState, winner: 1 | 2): void {
  const winFighter = winner === 1 ? state.f1 : state.f2;
  const loseFighter = winner === 1 ? state.f2 : state.f1;

  winFighter.roundsWon += 1;
  loseFighter.action = 'ko';
  loseFighter.actionTime = 0;
  loseFighter.vx = -loseFighter.facing * 120;
  loseFighter.vy = -170;

  state.hitstopTimer = 0.08;
  state.shakeTrauma = 0.7;
  state.events.push({
    type: 'ko',
    slot: winner,
    x: loseFighter.x,
    y: GROUND_Y - 30,
  });

  const winDef = CHARACTERS[winFighter.characterId];

  if (winFighter.roundsWon >= 2) {
    // Match End: center the victor prominently on screen to play their unique 'victory' pose once with particle FX
    const centerX = STAGE_WIDTH / 2;
    winFighter.action = 'victory';
    winFighter.actionTime = 0;
    winFighter.currentMove = null;
    winFighter.x = centerX;
    winFighter.y = GROUND_Y;
    winFighter.vx = 0;
    winFighter.vy = 0;
    winFighter.facing = 1;

    if (Math.abs(loseFighter.x - centerX) < 120) {
      loseFighter.x = loseFighter.x <= centerX ? 96 : 384;
    }

    state.winnerSlot = winner;
    state.roundPhase = 'finisher';
    state.phaseTimer = 2.4;
    state.finisherTriggered = true;
    state.roundBannerText = `${winDef.name.toUpperCase()} VENCEU!`;

    if (winFighter.characterId === 'ninja') {
      spawnVisualEffect(state, {
        kind: 'fx_fumaca',
        x: winFighter.x,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.78,
        maxLife: 0.75,
      });
      spawnVisualEffect(state, {
        kind: 'fx_explosao',
        x: winFighter.x,
        y: GROUND_Y - 32,
        facing: winFighter.facing,
        scale: 0.72,
        maxLife: 0.6,
      });
      spawnVisualEffect(state, {
        kind: 'fx_aura',
        x: winFighter.x,
        y: GROUND_Y - 32,
        facing: winFighter.facing,
        scale: 0.7,
        maxLife: 1.4,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 32, '#ef4444', '#a855f7', 18, 130, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 30,
        color: '#ef4444',
        size: 10,
        maxLife: 0.55,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'elf') {
      spawnVisualEffect(state, {
        kind: 'fx_elf_gold_crescent',
        x: winFighter.x + winFighter.facing * 18,
        y: GROUND_Y - 36,
        facing: winFighter.facing,
        scale: 0.65,
        maxLife: 0.75,
      });
      spawnVisualEffect(state, {
        kind: 'fx_elf_gold_beam',
        x: winFighter.x + winFighter.facing * 145,
        y: GROUND_Y - 36,
        vx: winFighter.facing * 110,
        facing: winFighter.facing,
        scale: 0.56,
        maxLife: 1.35,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#fde047', '#4ade80', 18, 125, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 32,
        color: '#4ade80',
        size: 10,
        maxLife: 0.55,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'priest') {
      spawnVisualEffect(state, {
        kind: 'fx_priest_golden_aura',
        x: winFighter.x,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.78,
        maxLife: 1.35,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_holy_sigil',
        x: winFighter.x + winFighter.facing * 24,
        y: GROUND_Y - 36,
        facing: winFighter.facing,
        scale: 0.74,
        maxLife: 1.15,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_light_pillar',
        x: winFighter.x + winFighter.facing * 32,
        y: GROUND_Y - 40,
        facing: winFighter.facing,
        scale: 0.85,
        maxLife: 1.3,
      });
      spawnVisualEffect(state, {
        kind: 'fx_priest_particles',
        x: winFighter.x + winFighter.facing * 16,
        y: GROUND_Y - 38,
        facing: winFighter.facing,
        scale: 0.72,
        maxLife: 1.1,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#fde047', '#ffffff', 18, 125, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 34,
        color: '#fde047',
        size: 11,
        maxLife: 0.6,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'necromancer') {
      spawnVisualEffect(state, {
        kind: 'fx_necro_aura',
        x: winFighter.x,
        y: GROUND_Y - 22,
        facing: winFighter.facing,
        scale: 0.78,
        maxLife: 1.4,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_sigils',
        x: winFighter.x + winFighter.facing * 24,
        y: GROUND_Y - 38,
        facing: winFighter.facing,
        scale: 0.72,
        maxLife: 1.25,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_portal',
        x: winFighter.x - winFighter.facing * 22,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.62,
        maxLife: 1.2,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_chains',
        x: winFighter.x + winFighter.facing * 42,
        y: GROUND_Y - 36,
        facing: winFighter.facing,
        scale: 0.56,
        maxLife: 1.15,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_skulls',
        x: winFighter.x + winFighter.facing * 36,
        y: GROUND_Y - 46,
        facing: winFighter.facing,
        scale: 0.66,
        maxLife: 1.2,
      });
      spawnVisualEffect(state, {
        kind: 'fx_necro_soul_explosion',
        x: winFighter.x + winFighter.facing * 42,
        y: GROUND_Y - 32,
        facing: winFighter.facing,
        scale: 0.74,
        maxLife: 0.95,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#c084fc', '#581c87', 18, 125, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 32,
        color: '#c084fc',
        size: 11,
        maxLife: 0.6,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'minotaur') {
      state.shakeTrauma = 0.85;
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_fury_aura',
        x: winFighter.x,
        y: GROUND_Y - 36,
        facing: winFighter.facing,
        scale: 0.72,
        maxLife: 1.45,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_earth_impact',
        x: winFighter.x,
        y: GROUND_Y - 14,
        facing: winFighter.facing,
        scale: 0.66,
        maxLife: 1.0,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_shockwave',
        x: winFighter.x + winFighter.facing * 18,
        y: GROUND_Y - 22,
        facing: winFighter.facing,
        scale: 0.64,
        maxLife: 0.9,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_rocks',
        x: winFighter.x,
        y: GROUND_Y - 28,
        facing: winFighter.facing,
        scale: 0.6,
        maxLife: 0.95,
      });
      spawnVisualEffect(state, {
        kind: 'fx_minotaur_sparks',
        x: winFighter.x,
        y: GROUND_Y - 38,
        facing: winFighter.facing,
        scale: 0.62,
        maxLife: 0.85,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 32, '#fbbf24', '#ea580c', 22, 135, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 24,
        color: '#f59e0b',
        size: 12,
        maxLife: 0.62,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'troll') {
      state.shakeTrauma = 0.8;
      spawnVisualEffect(state, {
        kind: 'fx_troll_fury_aura',
        x: winFighter.x,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.68,
        maxLife: 1.45,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_earth_explosion',
        x: winFighter.x,
        y: GROUND_Y - 18,
        facing: winFighter.facing,
        scale: 0.66,
        maxLife: 0.95,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_shockwaves',
        x: winFighter.x,
        y: GROUND_Y - 22,
        facing: winFighter.facing,
        scale: 0.64,
        maxLife: 0.85,
      });
      spawnVisualEffect(state, {
        kind: 'fx_troll_fury_particles',
        x: winFighter.x,
        y: GROUND_Y - 38,
        facing: winFighter.facing,
        scale: 0.66,
        maxLife: 1.15,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 32, '#ef4444', '#f97316', 22, 135, 'spark');
      spawnBurst(state, winFighter.x, GROUND_Y - 10, '#f97316', '#78716c', 12, 95, 'smoke');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 28,
        color: '#ef4444',
        size: 12,
        maxLife: 0.62,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'jaylon') {
      spawnVisualEffect(state, {
        kind: 'fx_jaylon_smoke',
        x: winFighter.x + winFighter.facing * 12,
        y: GROUND_Y - 58,
        vx: winFighter.facing * 10,
        vy: -22,
        facing: winFighter.facing,
        scale: 0.52,
        maxLife: 1.25,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 34, '#ec4899', '#facc15', 20, 125, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 28,
        color: '#facc15',
        size: 11,
        maxLife: 0.6,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'tesla') {
      spawnVisualEffect(state, {
        kind: 'tesla_special1_impact',
        x: winFighter.x,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.52,
        maxLife: 0.95,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#22d3ee', '#f59e0b', 22, 135, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 30,
        color: '#38bdf8',
        size: 12,
        maxLife: 0.65,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'beelzebu') {
      spawnVisualEffect(state, {
        kind: 'beelzebu_dominio_active',
        x: winFighter.x,
        y: GROUND_Y - 46,
        facing: winFighter.facing,
        scale: 0.46,
        maxLife: 1.25,
      });
      spawnVisualEffect(state, {
        kind: 'beelzebu_cranio_impact',
        x: winFighter.x + winFighter.facing * 12,
        y: GROUND_Y - 36,
        facing: winFighter.facing,
        scale: 0.44,
        maxLife: 0.9,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#a855f7', '#581c87', 22, 130, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 30,
        color: '#c084fc',
        size: 12,
        maxLife: 0.65,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'dono') {
      spawnVisualEffect(state, {
        kind: 'dono_atividade_wave',
        x: winFighter.x,
        y: GROUND_Y - 42,
        facing: winFighter.facing,
        scale: 0.68,
        maxLife: 0.95,
      });
      spawnVisualEffect(state, {
        kind: 'dono_maryjuana_cloud',
        x: winFighter.x + winFighter.facing * 10,
        y: GROUND_Y - 54,
        vx: winFighter.facing * 8,
        vy: -16,
        facing: winFighter.facing,
        scale: 0.56,
        maxLife: 1.1,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#facc15', '#a855f7', 22, 130, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 30,
        color: '#facc15',
        size: 12,
        maxLife: 0.65,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'adao') {
      spawnVisualEffect(state, {
        kind: 'adao_copy_aura',
        x: winFighter.x,
        y: GROUND_Y - 36,
        facing: winFighter.facing,
        scale: 0.78,
        maxLife: 1.35,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#a855f7', '#fde047', 22, 135, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 32,
        color: '#c084fc',
        size: 13,
        maxLife: 0.7,
        kind: 'ring',
      });
    } else if (winFighter.characterId === 'jack') {
      spawnVisualEffect(state, {
        kind: 'jack_soul_eye',
        x: winFighter.x,
        y: GROUND_Y - 46,
        facing: winFighter.facing,
        scale: 0.46,
        maxLife: 1.25,
      });
      spawnVisualEffect(state, {
        kind: 'jack_blood_splash',
        x: winFighter.x + winFighter.facing * 14,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.42,
        maxLife: 0.9,
      });
      spawnVisualEffect(state, {
        kind: 'jack_scissor_spin',
        x: winFighter.x,
        y: GROUND_Y - 34,
        facing: winFighter.facing,
        scale: 0.42,
        maxLife: 0.8,
      });
      spawnBurst(state, winFighter.x, GROUND_Y - 36, '#dc2626', '#a855f7', 22, 135, 'spark');
      spawnParticle(state, {
        x: winFighter.x,
        y: GROUND_Y - 32,
        color: '#dc2626',
        size: 13,
        maxLife: 0.7,
        kind: 'ring',
      });
    }

    state.events.push({
      type: 'victory',
      slot: winner,
      x: winFighter.x,
      y: winFighter.y - 40,
    });
  } else {
    // Round 1 win stays in 'idle' until best-of-3 match finishes
    winFighter.action = 'idle';
    winFighter.actionTime = 0;
    winFighter.currentMove = null;
    state.roundPhase = 'round_end';
    state.phaseTimer = 1.9;
    state.roundBannerText = `K.O.! ${winDef.name.toUpperCase()}`;
  }
}

export function stepMatch(
  state: MatchState,
  p1Input: InputState,
  p2Input: InputState,
  rawDt: number
): void {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  state.events = [];

  // Decay trauma & particles/FX in real time even during hitstop
  state.shakeTrauma = Math.max(0, state.shakeTrauma - dt * 1.9);
  updateParticles(state, dt);
  updateVisualEffects(state, dt);

  if (state.hitstopTimer > 0) {
    state.hitstopTimer = Math.max(0, state.hitstopTimer - dt);
    return;
  }

  // Phase machine
  if (state.roundPhase === 'intro') {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0.45 && state.roundBannerText !== 'LUTE!') {
      state.roundBannerText = 'LUTE!';
      state.events.push({ type: 'round_start', slot: 1, x: 240, y: 120 });
    }
    if (state.phaseTimer <= 0) {
      state.roundPhase = 'fighting';
      state.roundBannerText = '';
    }
    updateFighter(state, state.f1, state.f2, createEmptyInput(), dt);
    updateFighter(state, state.f2, state.f1, createEmptyInput(), dt);
    return;
  }

  if (state.roundPhase === 'round_end') {
    state.phaseTimer -= dt;
    updateFighter(state, state.f1, state.f2, createEmptyInput(), dt);
    updateFighter(state, state.f2, state.f1, createEmptyInput(), dt);
    if (state.phaseTimer <= 0) {
      state.roundNumber += 1;
      resetRoundState(state);
    }
    return;
  }

  if (state.roundPhase === 'finisher') {
    state.phaseTimer -= dt;
    updateFighter(state, state.f1, state.f2, createEmptyInput(), dt);
    updateFighter(state, state.f2, state.f1, createEmptyInput(), dt);
    if (state.phaseTimer <= 0) {
      state.roundPhase = 'match_over';
    }
    return;
  }

  if (state.roundPhase === 'match_over') {
    return;
  }

  // Active Fighting Phase
  state.elapsedMatchTime += dt;
  state.roundTimeLeft = Math.max(0, state.roundTimeLeft - dt);

  updateFighter(state, state.f1, state.f2, p1Input, dt);
  updateFighter(state, state.f2, state.f1, p2Input, dt);
  resolvePushboxes(state.f1, state.f2);
  updateProjectiles(state, dt);
  updateHazards(state, dt);

  // Check KO / Timeout
  if (state.f1.hp <= 0 && state.f2.hp <= 0) {
    finishRound(state, state.f1.totalDamageDealt >= state.f2.totalDamageDealt ? 1 : 2);
  } else if (state.f2.hp <= 0) {
    finishRound(state, 1);
  } else if (state.f1.hp <= 0) {
    finishRound(state, 2);
  } else if (state.roundTimeLeft <= 0) {
    const p1Pct = state.f1.hp / state.f1.maxHp;
    const p2Pct = state.f2.hp / state.f2.maxHp;
    finishRound(state, p1Pct >= p2Pct ? 1 : 2);
  }
}
