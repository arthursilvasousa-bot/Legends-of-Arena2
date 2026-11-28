export type CharacterId =
  | 'ninja'
  | 'minotaur'
  | 'elf'
  | 'necromancer'
  | 'priest'
  | 'troll'
  | 'jaylon'
  | 'tesla'
  | 'beelzebu'
  | 'dono'
  | 'adao'
  | 'jack';

export type ArenaId =
  | 'shadow_temple'
  | 'minotaur_coliseum'
  | 'elven_forest'
  | 'celestial_cathedral'
  | 'troll_lands'
  | 'favela_vida_loka';

export type GameMode = 'arcade' | 'versus';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type AppScreen = 'title' | 'select' | 'stage_select' | 'tournament' | 'playing' | 'paused' | 'gameover';

export type FighterAction =
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
  | 'crouch_punch'
  | 'crouch_kick'
  | 'air_kick'
  | 'grab_attempt'
  | 'grab_throw'
  | 'grabbed'
  | 'special1'
  | 'special2'
  | 'special3'
  | 'special4'
  | 'hitstun'
  | 'stun'
  | 'knockdown'
  | 'getup'
  | 'ko'
  | 'victory';

export type SpecialSlot = 'special1' | 'special2' | 'special3' | 'special4';

export interface MoveSpec {
  id: FighterAction;
  name: string;
  description: string;
  startup: number;   // seconds before hitbox/effect
  active: number;    // seconds active
  recovery: number;  // seconds after active
  damage: number;
  chipDamage: number;
  energyCost: number; // 0 for normals, 15..35 for specials
  knockbackX: number;
  knockbackY: number;
  hitstun: number;
  rangeX: number;
  rangeY: number;
  offsetY: number;   // relative to ground/center
  isLow?: boolean;
  isOverhead?: boolean;
  isMultiHit?: boolean;
  kind:
    | 'melee'
    | 'projectile'
    | 'multi_projectile'
    | 'teleport'
    | 'ground_trap'
    | 'sky_rain'
    | 'rush'
    | 'aoe'
    | 'buff'
    | 'shield'
    | 'leap_slam'
    | 'dash_combo'
    | 'grab_rush'
    | 'fire_breath'
    | 'electric_beam'
    | 'electric_cage'
    | 'toxic_cloud'
    | 'homing_skulls'
    | 'shadow_domain'
    | 'barrage_rush'
    | 'divine_copy'
    | 'charged_ko_fist'
    | 'axe_dash'
    | 'jack_knives'
    | 'soul_eye'
    | 'scissor_spin'
    | 'blood_wave';
  effectColor: string;
  secondaryColor: string;
  projectileSpeed?: number;
  statusEffect?: 'slow' | 'root' | 'shield' | 'fury' | 'stun' | 'special_lock' | 'poison' | 'bleed_vuln';
  jackThrowCount?: number;
}

export interface CharacterPalette {
  skin: string;
  skinShadow: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  glow: string;
  eye: string;
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  playerName: string;
  title: string;
  style: string;
  description: string;
  finisherText: string;
  victoryQuote: string;
  homeArena: ArenaId;
  maxHp: number;
  walkSpeed: number;
  jumpForce: number;
  weight: number;
  width: number;
  height: number;
  stats: {
    power: number;   // 1-5
    speed: number;   // 1-5
    range: number;   // 1-5
    defense: number; // 1-5
  };
  palette: CharacterPalette;
  specials: Record<SpecialSlot, MoveSpec>;
}

export interface ArenaDef {
  id: ArenaId;
  name: string;
  subtitle: string;
  description: string;
  skyTop: string;
  skyBottom: string;
  floorTop: string;
  floorBottom: string;
  accentColor: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  block: boolean;
  punchPressed: boolean;
  kickPressed: boolean;
  grabPressed: boolean;
  special1Pressed: boolean;
  special2Pressed: boolean;
  special3Pressed: boolean;
  special3Held: boolean;
  special4Pressed: boolean;
}

export interface FighterState {
  slot: 1 | 2;
  characterId: CharacterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1; // 1 = right, -1 = left
  hp: number;
  ghostHp: number; // trailing damage bar
  maxHp: number;
  energy: number; // 0..100 special gauge
  action: FighterAction;
  actionTime: number;
  actionDuration: number;
  currentMove: MoveSpec | null;
  hitConnectedThisMove: boolean;
  multiHitsDone: number;
  hitstunTime: number;
  hitFlashTime: number;
  invulnTime: number;
  slowTime: number;
  rootTime: number;
  shieldTime: number;
  furyTime: number;
  furyCooldown: number;
  furyReverseTime: number;
  stunTime: number;
  slipTime: number;
  specialLockTime: number;
  special1Cooldown: number;
  specialCooldowns: Record<SpecialSlot, number>;
  cageUsesThisRound: number;
  poisonTime: number;
  poisonTickTimer: number;
  poisonSourceSlot: 1 | 2 | null;
  blockImpactTime: number;
  landingTime: number;
  skullHitCooldown: number;
  donoAmmo: number;
  donoReloadTimer: number;
  donoCamoTime: number;
  donoSpeedTime: number;
  donoEnergyGainFlash: number;
  adaoCopiedCharacterId: CharacterId | null;
  adaoCopiedSpecial: MoveSpec | null;
  adaoCopiedSourceSlot: SpecialSlot | null;
  adaoCopiedUsedThisRound: boolean;
  adaoChargingSpecial3: boolean;
  adaoChargeTime: number;
  adaoChargeCooldownLock: boolean;
  jackKnives: number;
  jackKnifeTimer: number;
  bleedTime: number;
  bleedTickTimer: number;
  bleedSourceSlot: 1 | 2 | null;
  vulnerableTime: number;
  airAttackKind: 'punch' | 'kick';
  isLowBlock: boolean;
  comboCount: number;     // hits currently landed ON this fighter OR by this fighter
  comboTimer: number;
  roundsWon: number;
  totalDamageDealt: number;
  maxComboAchieved: number;
  squashX: number;
  squashY: number;
  walkDistance: number;
  moveHoldTime: number;
  moveDir: -1 | 0 | 1;
  aiCooldown: number;
  aiDecisionTimer: number;
  aiIntent: 'approach' | 'retreat' | 'block' | 'idle' | 'rush';
}

export interface Projectile {
  id: number;
  ownerSlot: 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  width: number;
  height: number;
  damage: number;
  chipDamage: number;
  knockbackX: number;
  knockbackY: number;
  hitstun: number;
  kind:
    | 'shadow_blade'
    | 'shuriken'
    | 'fire_arrow'
    | 'ice_arrow'
    | 'rain_arrow'
    | 'arcane_arrow'
    | 'dark_orb'
    | 'specter'
    | 'holy_beam'
    | 'boulder'
    | 'beer_bottle'
    | 'electric_ball'
    | 'poison_lance'
    | 'homing_skull'
    | 'pistol_bullet'
    | 'jack_knife'
    | 'blood_wave';
  color: string;
  secondaryColor: string;
  statusEffect?: 'slow' | 'root' | 'stun' | 'special_lock' | 'poison' | 'bleed_vuln';
  life: number;
  maxLife: number;
  piercing?: boolean;
  homingTargetSlot?: 1 | 2;
  homingDelay?: number;
  homingSpeed?: number;
  rotation?: number;
  hitTargets: number[];
}

export interface ArenaHazard {
  id: number;
  ownerSlot: 1 | 2;
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number;      // telegraph windup before hitbox becomes active
  activeTime: number; // remaining active time
  totalTime: number;
  damage: number;
  chipDamage: number;
  knockbackX: number;
  knockbackY: number;
  kind:
    | 'seismic_wave'
    | 'underworld_hands'
    | 'celestial_hammer'
    | 'holy_explosion'
    | 'ice_spikes'
    | 'dragon_burst'
    | 'vomit_puddle'
    | 'electric_cage'
    | 'toxic_cloud'
    | 'shadow_domain';
  color: string;
  secondaryColor: string;
  statusEffect?: 'slow' | 'root' | 'slip' | 'shock' | 'poison';
  hasHit: boolean;
  slipCooldown?: number;
  cageLastX?: number;
  cageMoveAccum?: number;
  cageShockCooldown?: number;
  vx?: number;
  tickTimer?: number;
  exploded?: boolean;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
  kind: 'pixel' | 'spark' | 'smoke' | 'ring' | 'text';
  text?: string;
}

export type RoundPhase = 'intro' | 'fighting' | 'round_end' | 'finisher' | 'match_over';

export interface MatchEvent {
  type:
    | 'hit_light'
    | 'hit_heavy'
    | 'block'
    | 'grab'
    | 'jump'
    | 'land'
    | 'special'
    | 'teleport'
    | 'ko'
    | 'round_start'
    | 'victory';
  slot: 1 | 2;
  x: number;
  y: number;
  label?: string;
}

export type NinjaFxKind =
  | 'fx_rajada'
  | 'fx_portal'
  | 'fx_shuriken'
  | 'fx_sangue'
  | 'fx_explosao'
  | 'fx_fumaca'
  | 'fx_rastro'
  | 'fx_aura';

export type ElfFxKind =
  | 'fx_elf_fire_arrow'
  | 'fx_elf_ice_arrow'
  | 'fx_elf_rain_arrow'
  | 'fx_elf_arcane_arrow'
  | 'fx_elf_green_burst'
  | 'fx_elf_green_slash'
  | 'fx_elf_ice_wave'
  | 'fx_elf_ice_burst'
  | 'fx_elf_arcane_portal'
  | 'fx_elf_arcane_explosion'
  | 'fx_elf_gold_beam'
  | 'fx_elf_gold_crescent'
  | 'fx_elf_trail';

export type PriestFxKind =
  | 'fx_priest_holy_beam'
  | 'fx_priest_holy_shield'
  | 'fx_priest_celestial_hammer'
  | 'fx_priest_holy_explosion'
  | 'fx_priest_light_pillar'
  | 'fx_priest_particles'
  | 'fx_priest_holy_sigil'
  | 'fx_priest_golden_aura';

export type NecromancerFxKind =
  | 'fx_necro_dark_sphere'
  | 'fx_necro_portal'
  | 'fx_necro_chains'
  | 'fx_necro_soul_explosion'
  | 'fx_necro_skulls'
  | 'fx_necro_smoke'
  | 'fx_necro_aura'
  | 'fx_necro_sigils'
  | 'fx_necro_hand'
  | 'fx_necro_specter';

export type MinotaurFxKind =
  | 'fx_minotaur_earth_impact'
  | 'fx_minotaur_shockwave'
  | 'fx_minotaur_dust_trail'
  | 'fx_minotaur_sparks'
  | 'fx_minotaur_rocks'
  | 'fx_minotaur_fury_aura';

export type TrollFxKind =
  | 'fx_troll_ground_impact'
  | 'fx_troll_boulder_large'
  | 'fx_troll_pebbles'
  | 'fx_troll_rock_trail'
  | 'fx_troll_earth_explosion'
  | 'fx_troll_fury_aura'
  | 'fx_troll_dust'
  | 'fx_troll_fury_particles'
  | 'fx_troll_shockwaves'
  | 'fx_troll_trail';

export type JaylonFxKind =
  | 'fx_jaylon_bottle_spin'
  | 'fx_jaylon_bottle_impact'
  | 'fx_jaylon_stun_stars'
  | 'fx_jaylon_vomit_stream'
  | 'fx_jaylon_vomit_puddle'
  | 'fx_jaylon_smoke'
  | 'fx_jaylon_fire_breath'
  | 'fx_jaylon_fire_burst';

export type TeslaFxKind =
  | 'tesla_special1_projectile'
  | 'tesla_special1_impact'
  | 'tesla_special2_knockback'
  | 'tesla_special3_beam'
  | 'tesla_special3_reflection'
  | 'tesla_special4_cage'
  | 'tesla_special4_electric_damage';

export type BeelzebuFxKind =
  | 'beelzebu_malboro_cloud'
  | 'beelzebu_malboro_impact'
  | 'beelzebu_veneno_projectile'
  | 'beelzebu_veneno_impact'
  | 'beelzebu_cranio_idle'
  | 'beelzebu_cranio_attack'
  | 'beelzebu_cranio_impact'
  | 'beelzebu_dominio_expand'
  | 'beelzebu_dominio_active'
  | 'beelzebu_dominio_explosion';

export type DonoFxKind =
  | 'dono_festa_muzzle_flash'
  | 'dono_festa_projectile'
  | 'dono_festa_impact'
  | 'dono_atividade_wave'
  | 'dono_camuflagem_smoke'
  | 'dono_maryjuana_cloud';

export type AdaoFxKind =
  | 'adao_jab_spark'
  | 'adao_copy_aura'
  | 'adao_time_fist_flash';

export type JackFxKind =
  | 'jack_knife_burst'
  | 'jack_soul_eye'
  | 'jack_giant_scissors'
  | 'jack_scissor_spin'
  | 'jack_blood_splatter'
  | 'jack_blood_splash'
  | 'jack_blood_eruption';

export type VisualEffectKind =
  | NinjaFxKind
  | ElfFxKind
  | PriestFxKind
  | NecromancerFxKind
  | MinotaurFxKind
  | TrollFxKind
  | JaylonFxKind
  | TeslaFxKind
  | BeelzebuFxKind
  | DonoFxKind
  | AdaoFxKind
  | JackFxKind;

export interface VisualEffect {
  id: number;
  kind: VisualEffectKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  scale: number;
  alpha: number;
  rotation: number;
  life: number;
  maxLife: number;
}

export interface MatchState {
  mode: GameMode;
  difficulty: Difficulty;
  arenaId: ArenaId;
  roundNumber: number;
  roundPhase: RoundPhase;
  phaseTimer: number;
  roundTimeLeft: number; // 99 down to 0
  elapsedMatchTime: number;
  hitstopTimer: number;
  shakeTrauma: number;
  winnerSlot: 1 | 2 | null;
  roundBannerText: string;
  f1: FighterState;
  f2: FighterState;
  projectiles: Projectile[];
  hazards: ArenaHazard[];
  particles: Particle[];
  visualEffects: VisualEffect[];
  nextEntityId: number;
  events: MatchEvent[];
  finisherTriggered: boolean;
}
