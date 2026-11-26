import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  MINOTAUR_RENDER_SCALE,
  MINOTAUR_SEQUENCES,
  MinotaurSequenceKey,
  mapActionToMinotaurSequence,
  resolveMinotaurFrame,
} from './minotaurAnimator';
import { MINOTAUR_FX_FILES, MINOTAUR_PORTRAIT_FILE } from './minotaurSpritesLoader';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { CHARACTERS, GROUND_Y, STAGE_LEFT_BOUND, STAGE_RIGHT_BOUND, STAGE_WIDTH } from './roster';
import { FighterAction, MinotaurFxKind } from './types';

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

test('all 22 Wallace sequences, 6 FX sprites, and portrait exist on disk with manifest & heavy colossus scale parity', () => {
  const keys = Object.keys(MINOTAUR_SEQUENCES) as MinotaurSequenceKey[];
  assert.equal(keys.length, 22);

  const manifestPath = path.join(process.cwd(), 'public/assets/minotaur_wallace/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing minotaur_wallace manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const expectedCounts: Record<MinotaurSequenceKey, number> = {
    idle: 4,
    walk: 4,
    run: 4,
    jump: 3,
    crouch: 3,
    standup: 3,
    block: 3,
    roll: 2,
    knockdown: 2,
    getup: 3,
    punch: 3,
    kick: 3,
    heavy_punch: 3,
    heavy_kick: 3,
    grab: 2,
    throw: 2,
    special_brutal_rush: 4,
    special_seismic_stomp: 4,
    special_devastating_horn: 3,
    special_coliseum_throw: 4,
    finisher: 5,
    victory: 5,
  };

  for (const [k, count] of Object.entries(expectedCounts) as [MinotaurSequenceKey, number][]) {
    const seq = MINOTAUR_SEQUENCES[k];
    assert.equal(seq.frameCount, count, `${k} frameCount mismatch`);
    const mSeq = manifest.sequences[k];
    assert.ok(mSeq, `Missing ${k} in manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} manifest frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} manifest frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} manifest frameHeight mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} manifest anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} manifest anchorY mismatch`);

    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Wallace sprite strip ${assetPath}`);
  }

  assert.equal(MINOTAUR_SEQUENCES.victory.loop, false);

  // Heavy colossus scale: noticeably taller/heavier than Ninja Pedro
  const wallaceHeight = MINOTAUR_SEQUENCES.idle.frameHeight * MINOTAUR_RENDER_SCALE;
  const ninjaHeight = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  assert.ok(wallaceHeight > ninjaHeight + 4, `Expected Wallace (${wallaceHeight.toFixed(1)}px) > Ninja (${ninjaHeight.toFixed(1)}px)`);

  const fxKeys = Object.keys(MINOTAUR_FX_FILES) as MinotaurFxKind[];
  assert.equal(fxKeys.length, 6);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', MINOTAUR_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Wallace FX sprite ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', MINOTAUR_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Wallace portrait ${portraitPath}`);
});

test('Minotauro roster has empty playerName and 4 official specials', () => {
  const m = CHARACTERS.minotaur;
  assert.equal(m.playerName, '');
  assert.equal(m.specials.special1.name, 'Investida Brutal');
  assert.equal(m.specials.special2.name, 'Pisão Sísmico');
  assert.equal(m.specials.special3.name, 'Chifrada Devastadora');
  assert.equal(m.specials.special4.name, 'Arremesso do Coliseu');
  assert.deepEqual(Object.keys(m.specials), ['special1', 'special2', 'special3', 'special4']);
});

test('Wallace transitions smoothly: idle -> walk -> run -> roll -> crouch -> standup -> idle', () => {
  const state = createMatchState('minotaur', 'ninja', 'minotaur_coliseum', 'versus', 'normal', true);
  assert.equal(state.f1.action, 'idle');

  stepMatch(state, { ...createEmptyInput(), right: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'walk');

  advanceFrames(state, 24, () => ({ ...createEmptyInput(), right: true }));
  assert.equal(state.f1.action, 'run');

  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'idle');

  stepMatch(state, { ...createEmptyInput(), left: true, block: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'roll');
  assert.ok(state.f1.invulnTime > 0);
  advanceFrames(state, 24);
  assert.equal(state.f1.action, 'idle');

  advanceFrames(state, 10, () => ({ ...createEmptyInput(), down: true }));
  assert.equal(state.f1.action, 'crouch');
  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'standup');
  advanceFrames(state, 20);
  assert.equal(state.f1.action, 'idle');
});

test('Wallace combo chains into heavy_punch and heavy_kick and triggers knockdown -> getup', () => {
  const state = createMatchState('minotaur', 'minotaur', 'minotaur_coliseum', 'versus', 'normal', true);
  state.f1.x = 200;
  state.f2.x = 228;

  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 7);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_punch');
  advanceFrames(state, 8);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), kickPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_kick');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_sparks'));

  advanceFrames(state, 35);
  state.f2.action = 'knockdown';
  state.f2.hitstunTime = 0.05;
  state.f2.vy = 0;
  advanceFrames(state, 6);
  assert.equal(state.f2.action, 'getup');
  advanceFrames(state, 22);
  assert.equal(state.f2.action, 'idle');
});

test('Wallace all 4 official specials execute cleanly in both directions with expected FX and mechanics', () => {
  for (const dir of [1, -1] as const) {
    const state = createMatchState('minotaur', 'troll', 'minotaur_coliseum', 'versus', 'normal', true);
    state.f1.x = dir === 1 ? 150 : 330;
    state.f2.x = dir === 1 ? 210 : 270;
    state.f1.facing = dir;
    state.f2.facing = dir === 1 ? -1 : 1;

    // R: Investida Brutal (rush + dust trail + knockback + earth impact / sparks)
    state.f1.energy = 100;
    const prevOppX = state.f2.x;
    const prevOppHp = state.f2.hp;
    stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 22);
    assert.ok(state.f2.hp < prevOppHp, `Investida Brutal should hit opponent (dir=${dir})`);
    assert.ok(
      dir === 1 ? state.f2.x > prevOppX : state.f2.x < prevOppX,
      `Investida Brutal should push opponent back (dir=${dir})`
    );
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_dust_trail'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_sparks'));

    // T: Pisão Sísmico (seismic_wave hazard + earth_impact + shockwave + rocks)
    advanceFrames(state, 45);
    state.hazards = [];
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    state.f1.x = dir === 1 ? 140 : 340;
    state.f2.x = dir === 1 ? 210 : 270;
    stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    assert.ok(state.hazards.some((h) => h.kind === 'seismic_wave'), `Missing seismic_wave hazard (dir=${dir})`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_earth_impact'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_shockwave'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_rocks'));

    // Y: Chifrada Devastadora (upward launch + shockwave + sparks)
    advanceFrames(state, 45);
    state.hazards = [];
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    state.f1.x = dir === 1 ? 180 : 300;
    state.f2.x = dir === 1 ? 206 : 274;
    state.f2.y = GROUND_Y;
    stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 14);
    assert.ok(state.f2.vy < 0 || state.f2.y < GROUND_Y, `Chifrada Devastadora should launch opponent upward (dir=${dir})`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_shockwave'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_sparks'));

    // U: Arremesso do Coliseu (rush grab -> overhead lift -> ground slam -> knockdown + earth impact & rocks)
    advanceFrames(state, 55);
    state.hazards = [];
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    state.f1.x = dir === 1 ? 180 : 300;
    state.f2.x = dir === 1 ? 210 : 270;
    state.f2.y = GROUND_Y;
    stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
    // Advance into overhead lift window
    advanceFrames(state, 16);
    assert.equal(state.f2.action, 'grabbed', `Opponent should be grabbed during Arremesso lift (dir=${dir})`);
    assert.ok(state.f2.y < GROUND_Y, `Opponent should be lifted overhead (dir=${dir})`);
    // Advance to slam moment
    advanceFrames(state, 18);
    assert.equal(state.f2.action, 'knockdown', `Opponent should enter knockdown after slam (dir=${dir})`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_earth_impact'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_rocks'));
    assert.ok(state.f1.x >= STAGE_LEFT_BOUND && state.f1.x <= STAGE_RIGHT_BOUND);
  }
});

test('Wallace best-of-3 match end triggers centered victory with Fúria da Arena FX', () => {
  const state = createMatchState('minotaur', 'ninja', 'minotaur_coliseum', 'versus', 'normal', true);
  state.f1.roundsWon = 1;
  state.f2.hp = 1;
  state.f1.x = 180;
  state.f2.x = 205;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 15);
  assert.equal(state.roundPhase, 'finisher');
  assert.equal(state.f1.action, 'victory');
  assert.equal(state.f1.x, STAGE_WIDTH / 2);
  assert.equal(state.f1.y, GROUND_Y);
  assert.equal(state.f1.facing, 1);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_earth_impact'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_shockwave'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_rocks'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_minotaur_fury_aura'));
});

test('resolveMinotaurFrame yields valid in-bounds indices for every FighterAction and clamps victory', () => {
  const actions: FighterAction[] = [
    'idle', 'walk', 'run', 'jump', 'crouch', 'standup', 'block', 'roll',
    'punch', 'kick', 'heavy_punch', 'heavy_kick', 'crouch_punch', 'crouch_kick',
    'air_kick', 'grab_attempt', 'grab_throw', 'grabbed',
    'special1', 'special2', 'special3', 'special4',
    'hitstun', 'knockdown', 'getup', 'ko', 'victory',
  ];
  const state = createMatchState('minotaur', 'elf', 'minotaur_coliseum', 'versus', 'normal', true);
  for (const act of actions) {
    state.f1.action = act;
    state.f1.actionTime = 0.15;
    state.f1.actionDuration = 0.45;
    const seqKey = mapActionToMinotaurSequence(act);
    const res = resolveMinotaurFrame(state.f1, 1.25);
    assert.equal(res.sequence.key, seqKey);
    assert.ok(Number.isInteger(res.frameIndex));
    assert.ok(res.frameIndex >= 0 && res.frameIndex < res.sequence.frameCount);
  }

  // Victory holds on final frame after playing once
  state.f1.action = 'victory';
  state.f1.actionTime = 5.0;
  const vicRes = resolveMinotaurFrame(state.f1, 10.0);
  assert.equal(vicRes.sequence.key, 'victory');
  assert.equal(vicRes.frameIndex, vicRes.sequence.frameCount - 1);
});
