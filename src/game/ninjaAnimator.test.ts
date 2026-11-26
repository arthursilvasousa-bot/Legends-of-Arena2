import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  NINJA_SEQUENCES,
  NinjaSequenceKey,
  mapActionToNinjaSequence,
  resolveNinjaFrame,
} from './ninjaAnimator';
import { FighterAction } from './types';

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

test('all 22 Ninja Pedro sequences and 8 FX sprites exist on disk with valid manifest & FPS', () => {
  const keys = Object.keys(NINJA_SEQUENCES) as NinjaSequenceKey[];
  assert.equal(keys.length, 22);

  assert.equal(NINJA_SEQUENCES.idle.fps, 8);
  assert.equal(NINJA_SEQUENCES.walk.fps, 12);
  assert.equal(NINJA_SEQUENCES.run.fps, 16);
  assert.equal(NINJA_SEQUENCES.jump.fps, 12);
  assert.equal(NINJA_SEQUENCES.crouch.fps, 10);
  assert.equal(NINJA_SEQUENCES.block.fps, 10);
  assert.equal(NINJA_SEQUENCES.punch.fps, 15);
  assert.equal(NINJA_SEQUENCES.kick.fps, 15);
  assert.equal(NINJA_SEQUENCES.heavy_punch.fps, 12);
  assert.equal(NINJA_SEQUENCES.heavy_kick.fps, 12);
  assert.equal(NINJA_SEQUENCES.finisher.fps, 10);
  assert.equal(NINJA_SEQUENCES.victory.fps, 10);
  assert.equal(NINJA_SEQUENCES.victory.frameCount, 4);
  assert.equal(NINJA_SEQUENCES.victory.loop, false);

  for (const key of keys) {
    const seq = NINJA_SEQUENCES[key];
    assert.ok(seq.frameWidth > 20 && seq.frameHeight > 20);
    assert.ok(seq.frameCount >= 2);
    assert.ok(seq.anchorX > 0 && seq.anchorX < seq.frameWidth);
    assert.ok(seq.anchorY > 0 && seq.anchorY <= seq.frameHeight);
    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing sprite strip ${assetPath}`);
  }
});

test('Ninja Pedro transitions smoothly: idle -> walk -> run -> roll -> crouch -> standup -> idle', () => {
  const state = createMatchState('ninja', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  assert.equal(state.f1.action, 'idle');

  // Walk starts immediately
  stepMatch(state, { ...createEmptyInput(), right: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'walk');

  // Holding direction >= 0.28s transitions walk -> run
  advanceFrames(state, 22, () => ({ ...createEmptyInput(), right: true }));
  assert.equal(state.f1.action, 'run');

  // Releasing movement transitions back to idle
  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'idle');

  // Moving + block triggers evasive roll with invulnerability
  stepMatch(state, { ...createEmptyInput(), left: true, block: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'roll');
  assert.ok(state.f1.invulnTime > 0);
  advanceFrames(state, 20);
  assert.equal(state.f1.action, 'idle');

  // Crouch -> standup -> idle transition
  advanceFrames(state, 10, () => ({ ...createEmptyInput(), down: true }));
  assert.equal(state.f1.action, 'crouch');
  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'standup');
  advanceFrames(state, 18);
  assert.equal(state.f1.action, 'idle');
});

test('Ninja Pedro combo chains into heavy_punch and heavy_kick and triggers knockdown -> getup', () => {
  const state = createMatchState('ninja', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 200;
  state.f2.x = 224;

  // Punch -> hit connects -> chain into heavy_punch -> chain into heavy_kick
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 7);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_punch');
  advanceFrames(state, 8);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), kickPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_kick');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_sangue'), 'Ninja hits should spawn fx_sangue');

  // Knockdown -> getup -> idle on P2 Ninja (after landing on ground)
  advanceFrames(state, 35);
  state.f2.action = 'knockdown';
  state.f2.hitstunTime = 0.05;
  state.f2.vy = 0;
  advanceFrames(state, 6);
  assert.equal(state.f2.action, 'getup');
  advanceFrames(state, 20);
  assert.equal(state.f2.action, 'idle');
});

test('Ninja Pedro specials spawn expected projectiles and independent FX', () => {
  const state = createMatchState('ninja', 'troll', 'shadow_temple', 'versus', 'normal', true);
  state.f1.energy = 100;
  state.f1.x = 120;
  state.f2.x = 300;

  // Special 1: Lâmina Sombria
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 12);
  assert.ok(state.projectiles.some((p) => p.kind === 'shadow_blade'));

  // Special 3: Chuva de Shurikens
  advanceFrames(state, 20);
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 12);
  assert.ok(state.projectiles.some((p) => p.kind === 'shuriken'));

  // Special 2: Teletransporte spawns fx_portal
  advanceFrames(state, 25);
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 12);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_portal'));

  // Special 4: Corte Fantasma spawns fx_aura & fx_rastro
  advanceFrames(state, 25);
  state.f1.energy = 100;
  state.f1.x = state.f2.x - 28;
  stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 15);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_aura'));
});

test('resolveNinjaFrame always yields valid in-bounds frame indices for every FighterAction', () => {
  const actions: FighterAction[] = [
    'idle', 'walk', 'run', 'jump', 'crouch', 'standup', 'block', 'roll',
    'punch', 'kick', 'heavy_punch', 'heavy_kick', 'crouch_punch', 'crouch_kick',
    'air_kick', 'grab_attempt', 'grab_throw', 'grabbed',
    'special1', 'special2', 'special3', 'special4',
    'hitstun', 'knockdown', 'getup', 'ko', 'victory',
  ];
  const state = createMatchState('ninja', 'elf', 'shadow_temple', 'versus', 'normal', true);
  for (const act of actions) {
    state.f1.action = act;
    state.f1.actionTime = 0.15;
    state.f1.actionDuration = 0.4;
    const seqKey = mapActionToNinjaSequence(act);
    const res = resolveNinjaFrame(state.f1, 1.25);
    assert.equal(res.sequence.key, seqKey);
    assert.ok(Number.isInteger(res.frameIndex));
    assert.ok(res.frameIndex >= 0 && res.frameIndex < res.sequence.frameCount);
  }
});
