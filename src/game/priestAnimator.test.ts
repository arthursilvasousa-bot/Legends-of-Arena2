import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  PRIEST_RENDER_SCALE,
  PRIEST_SEQUENCES,
  PriestSequenceKey,
  mapActionToPriestSequence,
  resolvePriestFrame,
} from './priestAnimator';
import { PRIEST_FX_FILES, PRIEST_PORTRAIT_FILE } from './priestSpritesLoader';
import { FighterAction, PriestFxKind } from './types';

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

test('all 24 Guilherme sequences, 8 FX sprites, and portrait exist on disk with exact counts, FPS, and scale parity', () => {
  const keys = Object.keys(PRIEST_SEQUENCES) as PriestSequenceKey[];
  assert.equal(keys.length, 24);

  const expectedCounts: Record<PriestSequenceKey, number> = {
    idle: 4,
    walk: 4,
    run: 4,
    jump: 3,
    crouch: 3,
    standup: 3,
    block: 3,
    roll: 3,
    knockdown: 2,
    getup: 3,
    punch: 4,
    kick: 3,
    heavy_punch: 3,
    heavy_kick: 3,
    staff_attack: 3,
    staff_slam: 3,
    grab: 3,
    throw: 2,
    special_holy_beam: 4,
    special_holy_shield: 4,
    special_celestial_hammer: 4,
    special_holy_explosion: 3,
    finisher: 11,
    victory: 4,
  };

  for (const [k, count] of Object.entries(expectedCounts) as [PriestSequenceKey, number][]) {
    assert.equal(PRIEST_SEQUENCES[k].frameCount, count, `${k} frameCount mismatch`);
  }

  assert.equal(PRIEST_SEQUENCES.idle.fps, 8);
  assert.equal(PRIEST_SEQUENCES.walk.fps, 12);
  assert.equal(PRIEST_SEQUENCES.run.fps, 16);
  assert.equal(PRIEST_SEQUENCES.jump.fps, 12);
  assert.equal(PRIEST_SEQUENCES.crouch.fps, 10);
  assert.equal(PRIEST_SEQUENCES.standup.fps, 10);
  assert.equal(PRIEST_SEQUENCES.block.fps, 10);
  assert.equal(PRIEST_SEQUENCES.roll.fps, 12);
  assert.equal(PRIEST_SEQUENCES.knockdown.fps, 10);
  assert.equal(PRIEST_SEQUENCES.getup.fps, 10);
  assert.equal(PRIEST_SEQUENCES.punch.fps, 15);
  assert.equal(PRIEST_SEQUENCES.kick.fps, 15);
  assert.equal(PRIEST_SEQUENCES.heavy_punch.fps, 12);
  assert.equal(PRIEST_SEQUENCES.heavy_kick.fps, 12);
  assert.equal(PRIEST_SEQUENCES.staff_attack.fps, 12);
  assert.equal(PRIEST_SEQUENCES.staff_slam.fps, 12);
  assert.equal(PRIEST_SEQUENCES.special_holy_beam.fps, 15);
  assert.equal(PRIEST_SEQUENCES.special_holy_shield.fps, 15);
  assert.equal(PRIEST_SEQUENCES.special_celestial_hammer.fps, 15);
  assert.equal(PRIEST_SEQUENCES.special_holy_explosion.fps, 15);
  assert.equal(PRIEST_SEQUENCES.finisher.fps, 10);
  assert.equal(PRIEST_SEQUENCES.victory.fps, 10);
  assert.equal(PRIEST_SEQUENCES.victory.loop, false);

  // Height parity check against Ninja Pedro (~65.7px) and Ariel (~65.1px)
  const renderedIdleHeight = PRIEST_SEQUENCES.idle.frameHeight * PRIEST_RENDER_SCALE;
  assert.ok(renderedIdleHeight >= 60 && renderedIdleHeight <= 78, `Unexpected height ${renderedIdleHeight}`);

  const manifestPath = path.join(process.cwd(), 'public/assets/priest_guilherme/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const readPngDims = (filePath: string) => {
    const buf = fs.readFileSync(filePath);
    assert.equal(buf.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${filePath} invalid PNG header`);
    return {
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  };

  for (const key of keys) {
    const seq = PRIEST_SEQUENCES[key];
    assert.ok(seq.frameWidth > 20 && seq.frameHeight > 20);
    assert.ok(seq.anchorX > 0 && seq.anchorX < seq.frameWidth);
    assert.ok(seq.anchorY > 0 && seq.anchorY <= seq.frameHeight);
    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Guilherme sprite strip ${assetPath}`);
    const dims = readPngDims(assetPath);
    assert.equal(
      dims.width,
      seq.frameWidth * seq.frameCount,
      `${key} PNG width ${dims.width} !== ${seq.frameWidth} * ${seq.frameCount}`
    );
    assert.equal(dims.height, seq.frameHeight, `${key} PNG height ${dims.height} !== ${seq.frameHeight}`);
    const mSeq = manifest.sequences[key];
    assert.ok(mSeq, `Missing manifest entry for ${key}`);
    assert.equal(mSeq.frameWidth, seq.frameWidth, `${key} manifest frameWidth mismatch`);
    assert.equal(mSeq.frameHeight, seq.frameHeight, `${key} manifest frameHeight mismatch`);
    assert.equal(mSeq.anchorX, seq.anchorX, `${key} manifest anchorX mismatch`);
    assert.equal(mSeq.anchorY, seq.anchorY, `${key} manifest anchorY mismatch`);
  }

  const fxKeys = Object.keys(PRIEST_FX_FILES) as PriestFxKind[];
  assert.equal(fxKeys.length, 8);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', PRIEST_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Guilherme FX sprite ${fxPath}`);
    const dims = readPngDims(fxPath);
    assert.equal(dims.width, manifest.fx[fxKey].width, `${fxKey} FX width mismatch`);
    assert.equal(dims.height, manifest.fx[fxKey].height, `${fxKey} FX height mismatch`);
  }

  const portraitPath = path.join(process.cwd(), 'public', PRIEST_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Guilherme portrait ${portraitPath}`);
});

test('Guilherme transitions smoothly: idle -> walk -> run -> roll -> crouch -> standup -> idle', () => {
  const state = createMatchState('priest', 'minotaur', 'celestial_cathedral', 'versus', 'normal', true);
  assert.equal(state.f1.action, 'idle');

  stepMatch(state, { ...createEmptyInput(), right: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'walk');

  advanceFrames(state, 22, () => ({ ...createEmptyInput(), right: true }));
  assert.equal(state.f1.action, 'run');

  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'idle');

  stepMatch(state, { ...createEmptyInput(), left: true, block: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'roll');
  assert.ok(state.f1.invulnTime > 0);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_particles'));
  advanceFrames(state, 20);
  assert.equal(state.f1.action, 'idle');

  advanceFrames(state, 10, () => ({ ...createEmptyInput(), down: true }));
  assert.equal(state.f1.action, 'crouch');
  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'standup');
  advanceFrames(state, 18);
  assert.equal(state.f1.action, 'idle');
});

test('Guilherme combo chains, staff attacks, and knockdown -> getup', () => {
  const state = createMatchState('priest', 'priest', 'celestial_cathedral', 'versus', 'normal', true);
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
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_particles'));

  advanceFrames(state, 35);
  state.f2.action = 'knockdown';
  state.f2.hitstunTime = 0.05;
  state.f2.vy = 0;
  advanceFrames(state, 6);
  assert.equal(state.f2.action, 'getup');
  advanceFrames(state, 20);
  assert.equal(state.f2.action, 'idle');
});

test('Guilherme all 4 special attacks execute accurately in both facing directions with distinct FX', () => {
  for (const dir of [1, -1] as const) {
    const state = createMatchState('priest', 'troll', 'celestial_cathedral', 'versus', 'normal', true);
    if (dir === 1) {
      state.f1.x = 120;
      state.f2.x = 250;
    } else {
      state.f1.x = 340;
      state.f2.x = 210;
    }
    state.f1.facing = dir;
    state.f2.facing = dir === 1 ? -1 : 1;

    // Special 1: Raio Divino (holy_beam + sigil)
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 15);
    const beam = state.projectiles.find((p) => p.kind === 'holy_beam');
    assert.ok(beam && beam.piercing, `Missing holy_beam for facing=${dir}`);
    assert.equal(Math.sign(beam.vx), dir);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_holy_sigil'));

    // Special 2: Escudo Sagrado (shieldTime + holy_shield + golden_aura)
    advanceFrames(state, 35);
    state.projectiles = [];
    state.visualEffects = [];
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    assert.ok(state.f1.shieldTime > 3, `Expected shieldTime active for facing=${dir}`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_holy_shield'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_golden_aura'));

    // Special 3: Martelo Celestial (hazard + sigil + particles)
    advanceFrames(state, 35);
    state.hazards = [];
    state.visualEffects = [];
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    assert.ok(state.hazards.some((h) => h.kind === 'celestial_hammer'), `Missing celestial_hammer hazard for facing=${dir}`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_holy_sigil'));

    // Special 4: Explosão Sagrada (aoe hazard + golden_aura)
    advanceFrames(state, 35);
    state.hazards = [];
    state.visualEffects = [];
    state.f1.energy = 100;
    state.f2.x = state.f1.x + dir * 40;
    stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 14);
    assert.ok(state.hazards.some((h) => h.kind === 'holy_explosion'), `Missing holy_explosion hazard for facing=${dir}`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_priest_golden_aura'));
  }
});

test('resolvePriestFrame yields valid in-bounds indices for every FighterAction and maps staff & jump frames', () => {
  const actions: FighterAction[] = [
    'idle', 'walk', 'run', 'jump', 'crouch', 'standup', 'block', 'roll',
    'punch', 'kick', 'heavy_punch', 'heavy_kick', 'crouch_punch', 'crouch_kick',
    'air_kick', 'grab_attempt', 'grab_throw', 'grabbed',
    'special1', 'special2', 'special3', 'special4',
    'hitstun', 'knockdown', 'getup', 'ko', 'victory',
  ];
  const state = createMatchState('priest', 'ninja', 'celestial_cathedral', 'versus', 'normal', true);
  for (const act of actions) {
    state.f1.action = act;
    state.f1.actionTime = 0.15;
    state.f1.actionDuration = 0.45;
    const seqKey = mapActionToPriestSequence(act);
    const res = resolvePriestFrame(state.f1, 1.25);
    assert.equal(res.sequence.key, seqKey);
    assert.ok(Number.isInteger(res.frameIndex));
    assert.ok(res.frameIndex >= 0 && res.frameIndex < res.sequence.frameCount);
  }

  assert.equal(mapActionToPriestSequence('crouch_punch'), 'staff_attack');
  assert.equal(mapActionToPriestSequence('crouch_kick'), 'staff_slam');
  assert.equal(mapActionToPriestSequence('air_kick'), 'kick');

  state.f1.action = 'jump';
  const jumpVelocities = [-200, 0, 180];
  const indices = jumpVelocities.map((vy) => {
    state.f1.vy = vy;
    return resolvePriestFrame(state.f1, 0).frameIndex;
  });
  assert.deepEqual(indices, [0, 1, 2]);
});
