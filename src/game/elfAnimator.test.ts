import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  ELF_SEQUENCES,
  ElfSequenceKey,
  mapActionToElfSequence,
  resolveElfFrame,
} from './elfAnimator';
import { ELF_FX_FILES, ELF_PORTRAIT_FILE } from './elfSpritesLoader';
import { ElfFxKind, FighterAction } from './types';

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

test('all 22 Ariel sequences, 13 FX sprites, and portrait exist on disk with exact frame counts & FPS', () => {
  const keys = Object.keys(ELF_SEQUENCES) as ElfSequenceKey[];
  assert.equal(keys.length, 22);

  const expectedCounts: Record<ElfSequenceKey, number> = {
    idle: 6,
    walk: 8,
    run: 8,
    jump: 8,
    crouch: 4,
    standup: 4,
    block: 4,
    roll: 6,
    knockdown: 6,
    getup: 6,
    punch: 5,
    kick: 5,
    heavy_punch: 6,
    heavy_kick: 6,
    grab: 8,
    throw: 8,
    special_flamejante: 10,
    special_congelante: 10,
    special_chuva: 12,
    special_arcana: 12,
    finisher: 10,
    victory: 5,
  };

  for (const [k, count] of Object.entries(expectedCounts) as [ElfSequenceKey, number][]) {
    assert.equal(ELF_SEQUENCES[k].frameCount, count, `${k} frameCount mismatch`);
  }

  assert.equal(ELF_SEQUENCES.idle.fps, 8);
  assert.equal(ELF_SEQUENCES.walk.fps, 12);
  assert.equal(ELF_SEQUENCES.run.fps, 16);
  assert.equal(ELF_SEQUENCES.jump.fps, 12);
  assert.equal(ELF_SEQUENCES.crouch.fps, 10);
  assert.equal(ELF_SEQUENCES.standup.fps, 10);
  assert.equal(ELF_SEQUENCES.block.fps, 10);
  assert.equal(ELF_SEQUENCES.punch.fps, 15);
  assert.equal(ELF_SEQUENCES.kick.fps, 15);
  assert.equal(ELF_SEQUENCES.heavy_punch.fps, 12);
  assert.equal(ELF_SEQUENCES.heavy_kick.fps, 12);
  assert.equal(ELF_SEQUENCES.special_flamejante.fps, 15);
  assert.equal(ELF_SEQUENCES.special_congelante.fps, 15);
  assert.equal(ELF_SEQUENCES.special_chuva.fps, 15);
  assert.equal(ELF_SEQUENCES.special_arcana.fps, 15);
  assert.equal(ELF_SEQUENCES.finisher.fps, 10);
  assert.equal(ELF_SEQUENCES.victory.fps, 10);
  assert.equal(ELF_SEQUENCES.victory.loop, false);

  for (const key of keys) {
    const seq = ELF_SEQUENCES[key];
    assert.ok(seq.frameWidth > 20 && seq.frameHeight > 20);
    assert.ok(seq.anchorX > 0 && seq.anchorX < seq.frameWidth);
    assert.ok(seq.anchorY > 0 && seq.anchorY <= seq.frameHeight);
    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Ariel sprite strip ${assetPath}`);
  }

  const fxKeys = Object.keys(ELF_FX_FILES) as ElfFxKind[];
  assert.equal(fxKeys.length, 13);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', ELF_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Ariel FX sprite ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', ELF_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Ariel portrait ${portraitPath}`);
});

test('Ariel transitions smoothly: idle -> walk -> run -> roll -> crouch -> standup -> idle', () => {
  const state = createMatchState('elf', 'minotaur', 'elven_forest', 'versus', 'normal', true);
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
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_trail'));
  advanceFrames(state, 20);
  assert.equal(state.f1.action, 'idle');

  advanceFrames(state, 10, () => ({ ...createEmptyInput(), down: true }));
  assert.equal(state.f1.action, 'crouch');
  stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'standup');
  advanceFrames(state, 18);
  assert.equal(state.f1.action, 'idle');
});

test('Ariel combo chains into heavy_punch and heavy_kick with fx_elf_green_slash and knockdown -> getup', () => {
  const state = createMatchState('elf', 'elf', 'elven_forest', 'versus', 'normal', true);
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
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_green_slash'));

  advanceFrames(state, 35);
  state.f2.action = 'knockdown';
  state.f2.hitstunTime = 0.05;
  state.f2.vy = 0;
  advanceFrames(state, 6);
  assert.equal(state.f2.action, 'getup');
  advanceFrames(state, 20);
  assert.equal(state.f2.action, 'idle');
});

test('Ariel all 4 special attacks fire accurately in both facing directions with distinct FX', () => {
  for (const dir of [1, -1] as const) {
    const state = createMatchState('elf', 'troll', 'elven_forest', 'versus', 'normal', true);
    if (dir === 1) {
      state.f1.x = 120;
      state.f2.x = 280;
    } else {
      state.f1.x = 340;
      state.f2.x = 180;
    }
    state.f1.facing = dir;
    state.f2.facing = dir === 1 ? -1 : 1;

    // Special 1: Flecha Flamejante
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 15);
    const fireArrow = state.projectiles.find((p) => p.kind === 'fire_arrow');
    assert.ok(fireArrow, `Missing fire_arrow for facing=${dir}`);
    assert.equal(Math.sign(fireArrow.vx), dir);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_trail'));

    // Special 2: Flecha Congelante (ice_wave + ice_arrow + slow + ice_burst on hit)
    advanceFrames(state, 35);
    state.projectiles = [];
    state.visualEffects = [];
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_ice_wave'));
    assert.ok(state.projectiles.some((p) => p.kind === 'ice_arrow'));
    advanceFrames(state, 35);
    assert.ok(state.f2.slowTime > 0, `Expected slowTime on target for facing=${dir}`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_ice_burst'));

    // Special 3: Chuva de Flechas (5 rain_arrow projectiles + green burst on hit/ground)
    advanceFrames(state, 35);
    state.projectiles = [];
    state.visualEffects = [];
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    const rainArrows = state.projectiles.filter((p) => p.kind === 'rain_arrow');
    assert.equal(rainArrows.length, 5, `Expected 5 rain_arrow projectiles for facing=${dir}`);
    const distinctVx = new Set(rainArrows.map((p) => Math.round(p.vx)));
    assert.ok(distinctVx.size >= 3, 'Rain arrows should spread across horizontal velocities');
    advanceFrames(state, 45);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_green_burst'));

    // Special 4: Flecha Arcana (portal + piercing arcane_arrow + arcane explosion)
    advanceFrames(state, 35);
    state.projectiles = [];
    state.visualEffects = [];
    state.f1.energy = 100;
    stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 18);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_arcane_portal'));
    const arcane = state.projectiles.find((p) => p.kind === 'arcane_arrow');
    assert.ok(arcane && arcane.piercing);
    assert.equal(Math.sign(arcane.vx), dir);
    advanceFrames(state, 35);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_elf_arcane_explosion'));
  }
});

test('resolveElfFrame yields valid in-bounds indices for every FighterAction and maps jump velocities', () => {
  const actions: FighterAction[] = [
    'idle', 'walk', 'run', 'jump', 'crouch', 'standup', 'block', 'roll',
    'punch', 'kick', 'heavy_punch', 'heavy_kick', 'crouch_punch', 'crouch_kick',
    'air_kick', 'grab_attempt', 'grab_throw', 'grabbed',
    'special1', 'special2', 'special3', 'special4',
    'hitstun', 'knockdown', 'getup', 'ko', 'victory',
  ];
  const state = createMatchState('elf', 'ninja', 'elven_forest', 'versus', 'normal', true);
  for (const act of actions) {
    state.f1.action = act;
    state.f1.actionTime = 0.15;
    state.f1.actionDuration = 0.45;
    const seqKey = mapActionToElfSequence(act);
    const res = resolveElfFrame(state.f1, 1.25);
    assert.equal(res.sequence.key, seqKey);
    assert.ok(Number.isInteger(res.frameIndex));
    assert.ok(res.frameIndex >= 0 && res.frameIndex < res.sequence.frameCount);
  }

  // Verify jump covers rising, apex, and falling frames cleanly across 8 frames
  state.f1.action = 'jump';
  const jumpVelocities = [-260, -160, -80, 0, 50, 120, 200, 280];
  const indices = jumpVelocities.map((vy) => {
    state.f1.vy = vy;
    return resolveElfFrame(state.f1, 0).frameIndex;
  });
  assert.deepEqual(indices, [0, 1, 2, 3, 4, 5, 6, 7]);
});
