import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  NECROMANCER_RENDER_SCALE,
  NECROMANCER_SEQUENCES,
  NecromancerSequenceKey,
  mapActionToNecromancerSequence,
  resolveNecromancerFrame,
} from './necromancerAnimator';
import { NECROMANCER_FX_FILES, NECROMANCER_PORTRAIT_FILE } from './necromancerSpritesLoader';
import { STAGE_LEFT_BOUND, STAGE_RIGHT_BOUND } from './roster';
import { FighterAction, NecromancerFxKind } from './types';

function advanceFrames(
  state: ReturnType<typeof createMatchState>,
  frames: number,
  p1Fn?: (frame: number) => ReturnType<typeof createEmptyInput>,
  p2Fn?: (frame: number) => ReturnType<typeof createEmptyInput>
) {
  for (let i = 0; i < frames; i++) {
    const p1 = p1Fn ? p1Fn(i) : createEmptyInput();
    const p2 = p2Fn ? p2Fn(i) : createEmptyInput();
    stepMatch(state, p1, p2, 1 / 60);
  }
}

test('all 24 Lucas sequences, 10 FX sprites, and portrait exist on disk with exact counts, FPS, manifest parity, and scale parity', () => {
  const keys = Object.keys(NECROMANCER_SEQUENCES) as NecromancerSequenceKey[];
  assert.equal(keys.length, 24);

  const manifestPath = path.join(process.cwd(), 'public/assets/necromancer_lucas/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const expectedCounts: Record<NecromancerSequenceKey, number> = {
    idle: 4,
    walk: 4,
    run: 3,
    jump: 2,
    crouch: 3,
    standup: 2,
    block: 3,
    roll: 4,
    knockdown: 3,
    getup: 3,
    punch: 3,
    kick: 2,
    heavy_punch: 3,
    heavy_kick: 3,
    staff_attack: 3,
    staff_slam: 2,
    grab: 3,
    throw: 2,
    special_dark_sphere: 6,
    special_underworld_hands: 2,
    special_spectral_army: 2,
    special_shadow_teleport: 4,
    finisher: 10,
    victory: 7,
  };

  for (const [k, count] of Object.entries(expectedCounts) as [NecromancerSequenceKey, number][]) {
    const seq = NECROMANCER_SEQUENCES[k];
    assert.equal(seq.frameCount, count, `${k} frameCount mismatch`);
    const mSeq = manifest.sequences[k];
    assert.ok(mSeq, `Missing ${k} in manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} manifest frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} manifest frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} manifest frameHeight mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} manifest anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} manifest anchorY mismatch`);
  }

  assert.equal(NECROMANCER_SEQUENCES.idle.fps, 6);
  assert.equal(NECROMANCER_SEQUENCES.walk.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.run.fps, 16);
  assert.equal(NECROMANCER_SEQUENCES.jump.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.crouch.fps, 10);
  assert.equal(NECROMANCER_SEQUENCES.standup.fps, 10);
  assert.equal(NECROMANCER_SEQUENCES.block.fps, 10);
  assert.equal(NECROMANCER_SEQUENCES.roll.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.knockdown.fps, 8);
  assert.equal(NECROMANCER_SEQUENCES.getup.fps, 10);
  assert.equal(NECROMANCER_SEQUENCES.punch.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.kick.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.heavy_punch.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.heavy_kick.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.staff_attack.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.staff_slam.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.grab.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.throw.fps, 12);
  assert.equal(NECROMANCER_SEQUENCES.special_dark_sphere.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.special_underworld_hands.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.special_spectral_army.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.special_shadow_teleport.fps, 15);
  assert.equal(NECROMANCER_SEQUENCES.finisher.fps, 10);
  assert.equal(NECROMANCER_SEQUENCES.victory.fps, 10);
  assert.equal(NECROMANCER_SEQUENCES.victory.loop, false);

  // Height parity check against Ninja Pedro (~65.7px), Ariel (~65.1px), Guilherme (~66.8px)
  const renderedIdleHeight = NECROMANCER_SEQUENCES.idle.frameHeight * NECROMANCER_RENDER_SCALE;
  assert.ok(renderedIdleHeight >= 60 && renderedIdleHeight <= 76, `Unexpected height ${renderedIdleHeight}`);

  for (const key of keys) {
    const seq = NECROMANCER_SEQUENCES[key];
    assert.ok(seq.frameWidth > 20 && seq.frameHeight > 20);
    assert.ok(seq.anchorX > 0 && seq.anchorX < seq.frameWidth);
    assert.ok(seq.anchorY > 0 && seq.anchorY <= seq.frameHeight);
    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Lucas sprite strip ${assetPath}`);
  }

  const fxKeys = Object.keys(NECROMANCER_FX_FILES) as NecromancerFxKind[];
  assert.equal(fxKeys.length, 10);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', NECROMANCER_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Lucas FX sprite ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', NECROMANCER_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Lucas portrait ${portraitPath}`);
});

test('Lucas transitions smoothly: idle -> walk -> run -> roll -> crouch -> standup -> idle', () => {
  const state = createMatchState('necromancer', 'minotaur', 'realm_of_dead', 'versus', 'normal', true);
  assert.equal(state.f1.action, 'idle');

  stepMatch(state, { ...createEmptyInput(), right: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'walk');

  advanceFrames(state, 22, () => ({ ...createEmptyInput(), right: true }));
  assert.equal(state.f1.action, 'run');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_smoke'));

  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'idle');

  state.visualEffects = [];
  stepMatch(state, { ...createEmptyInput(), left: true, block: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'roll');
  assert.ok(state.f1.invulnTime > 0);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_smoke'));
  advanceFrames(state, 20);
  assert.equal(state.f1.action, 'idle');

  advanceFrames(state, 10, () => ({ ...createEmptyInput(), down: true }));
  assert.equal(state.f1.action, 'crouch');
  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'standup');
  advanceFrames(state, 18);
  assert.equal(state.f1.action, 'idle');
});

test('Lucas combo chains, staff attacks, and knockdown -> getup', () => {
  const state = createMatchState('necromancer', 'necromancer', 'realm_of_dead', 'versus', 'normal', true);
  state.f1.x = 200;
  state.f2.x = 224;

  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 7);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_punch');
  advanceFrames(state, 8);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), kickPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_kick');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_skulls'));

  advanceFrames(state, 35);
  state.f2.action = 'knockdown';
  state.f2.hitstunTime = 0.05;
  state.f2.vy = 0;
  advanceFrames(state, 6);
  assert.equal(state.f2.action, 'getup');
  advanceFrames(state, 20);
  assert.equal(state.f2.action, 'idle');
});

test('Lucas all 4 special attacks execute accurately in both facing directions within bounds', () => {
  for (const dir of [1, -1] as const) {
    const state = createMatchState('necromancer', 'troll', 'realm_of_dead', 'versus', 'normal', true);
    if (dir === 1) {
      state.f1.x = 120;
      state.f2.x = 260;
    } else {
      state.f1.x = 340;
      state.f2.x = 200;
    }
    state.f1.facing = dir;
    state.f2.facing = dir === 1 ? -1 : 1;

    // Special 1 (R): Esfera das Trevas
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 15);
    const orb = state.projectiles.find((p) => p.kind === 'dark_orb');
    assert.ok(orb, `Missing dark_orb for facing=${dir}`);
    assert.equal(Math.sign(orb.vx), dir);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_sigils'));

    // Special 2 (T): Mãos do Submundo (hazard + root + sigils/aura)
    advanceFrames(state, 35);
    state.projectiles = [];
    state.hazards = [];
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 30);
    assert.ok(state.f2.rootTime > 0, `Expected rootTime active for facing=${dir}`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_sigils'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_aura'));

    // Special 3 (Y): Exército Espectral (2 specter projectiles + sigils + aura)
    advanceFrames(state, 40);
    state.projectiles = [];
    state.hazards = [];
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 18);
    const specters = state.projectiles.filter((p) => p.kind === 'specter');
    assert.equal(specters.length, 2, `Expected 2 specter projectiles for facing=${dir}`);
    for (const sp of specters) {
      assert.equal(Math.sign(sp.vx), dir);
    }
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_sigils'));

    // Special 4 (U): Teleporte Sombrio (teleports behind opp within stage bounds + portal FX)
    advanceFrames(state, 40);
    state.projectiles = [];
    state.hazards = [];
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    state.f1.x = dir === 1 ? 110 : 370;
    state.f2.x = dir === 1 ? 300 : 180;
    const prevX = state.f1.x;
    stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    assert.notEqual(state.f1.x, prevX);
    assert.ok(state.f1.x >= STAGE_LEFT_BOUND && state.f1.x <= STAGE_RIGHT_BOUND);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_portal'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_aura'));
  }
});

test('Lucas best-of-3 victory triggers Ritual da Morte finisher FX and KO prone posture', () => {
  const state = createMatchState('necromancer', 'ninja', 'realm_of_dead', 'versus', 'normal', true);
  state.f1.roundsWon = 1;
  state.f2.hp = 1;
  state.f1.x = 200;
  state.f2.x = 222;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 15);
  assert.equal(state.roundPhase, 'finisher');
  assert.equal(state.f1.action, 'victory');
  assert.equal(state.f2.action, 'ko');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_aura'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_soul_explosion'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_necro_skulls'));

  const koFrame = resolveNecromancerFrame({ ...state.f1, action: 'ko' }, 0);
  assert.equal(koFrame.sequence.key, 'knockdown');
  assert.equal(koFrame.frameIndex, koFrame.sequence.frameCount - 1);
});

test('resolveNecromancerFrame yields valid in-bounds indices for every FighterAction and maps staff & jump frames', () => {
  const actions: FighterAction[] = [
    'idle', 'walk', 'run', 'jump', 'crouch', 'standup', 'block', 'roll',
    'punch', 'kick', 'heavy_punch', 'heavy_kick', 'crouch_punch', 'crouch_kick',
    'air_kick', 'grab_attempt', 'grab_throw', 'grabbed',
    'special1', 'special2', 'special3', 'special4',
    'hitstun', 'knockdown', 'getup', 'ko', 'victory',
  ];
  const state = createMatchState('necromancer', 'ninja', 'realm_of_dead', 'versus', 'normal', true);
  for (const act of actions) {
    state.f1.action = act;
    state.f1.actionTime = 0.15;
    state.f1.actionDuration = 0.45;
    const seqKey = mapActionToNecromancerSequence(act);
    const res = resolveNecromancerFrame(state.f1, 1.25);
    assert.equal(res.sequence.key, seqKey);
    assert.ok(Number.isInteger(res.frameIndex));
    assert.ok(res.frameIndex >= 0 && res.frameIndex < res.sequence.frameCount);
  }

  assert.equal(mapActionToNecromancerSequence('crouch_punch'), 'staff_attack');
  assert.equal(mapActionToNecromancerSequence('crouch_kick'), 'staff_slam');
  assert.equal(mapActionToNecromancerSequence('air_kick'), 'kick');

  state.f1.action = 'jump';
  const jumpVelocities = [-180, 140];
  const indices = jumpVelocities.map((vy) => {
    state.f1.vy = vy;
    return resolveNecromancerFrame(state.f1, 0).frameIndex;
  });
  assert.deepEqual(indices, [0, 1]);
});
