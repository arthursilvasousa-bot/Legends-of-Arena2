import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeAiInputs,
  createEmptyInput,
  createMatchState,
  stepMatch,
} from './combatEngine';
import {
  JACK_BLEED_DURATION,
  JACK_KNIFE_RECHARGE_SECONDS,
  JACK_MAX_KNIVES,
  JACK_RENDER_SCALE,
  JACK_SEQUENCES,
  JACK_SOUL_EYE_SLOW_DURATION,
  JACK_VICTORY_QUOTE,
  JACK_VULNERABLE_DAMAGE_MULTIPLIER,
  JACK_VULNERABLE_DURATION,
  JackSequenceKey,
  mapActionToJackSequence,
  resolveJackFrame,
} from './jackAnimator';
import { JACK_FX_FILES, JACK_FX_FILES as _fx, JACK_PORTRAIT_FILE } from './jackSpritesLoader';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { TROLL_RENDER_SCALE, TROLL_SEQUENCES } from './trollAnimator';
import { CHARACTERS, GROUND_Y, STAGE_WIDTH } from './roster';

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

test('all 22 Jack sequences, individual frames, FX assets, and portrait exist with valid PNG RGBA dimensions and FPS ranges', () => {
  const keys = Object.keys(JACK_SEQUENCES) as JackSequenceKey[];
  assert.equal(keys.length, 22);

  const manifestPath = path.join(process.cwd(), 'public/assets/jack_estripador/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing jack_estripador manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const mAnims = manifest.animations;
  assert.ok(mAnims, 'Missing animations map in jack_estripador manifest.json');

  for (const k of keys) {
    const seq = JACK_SEQUENCES[k];
    const mKey = k.replace(/^jack_/, '');
    const mSeq = mAnims[mKey] ?? mAnims[k];
    assert.ok(mSeq, `Missing ${k} (${mKey}) in manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} frameHeight mismatch`);
    assert.equal(seq.fps, mSeq.fps, `${k} fps mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} anchorY mismatch`);

    const stripPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(stripPath), `Missing Jack sprite strip ${stripPath}`);

    const buf = fs.readFileSync(stripPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    const colorType = buf[25];
    assert.equal(colorType, 6, `${k} PNG must be RGBA (colorType 6) for true alpha transparency`);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch (${pngW} vs ${seq.frameWidth * seq.frameCount})`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch (${pngH} vs ${seq.frameHeight})`);

    // Verify individual numbered frame_00N.png files also exist
    assert.equal(mSeq.frames.length, seq.frameCount);
    for (const frameRel of mSeq.frames as string[]) {
      const fPath = path.join(process.cwd(), 'public', frameRel.replace(/^\//, ''));
      assert.ok(fs.existsSync(fPath), `Missing numbered frame ${fPath}`);
    }
  }

  // FPS specifications: normal moves 10-12, normal attacks 12-15, specials 15-20
  for (const k of ['jack_idle', 'jack_walk', 'jack_run', 'jack_jump', 'jack_crouch', 'jack_standup', 'jack_block', 'jack_dodge', 'jack_getup', 'jack_victory'] as JackSequenceKey[]) {
    assert.ok(JACK_SEQUENCES[k].fps >= 10 && JACK_SEQUENCES[k].fps <= 12, `${k} FPS ${JACK_SEQUENCES[k].fps} must be 10..12`);
  }
  for (const k of ['jack_punch', 'jack_heavy_punch', 'jack_kick', 'jack_heavy_kick', 'jack_crouch_kick', 'jack_combo'] as JackSequenceKey[]) {
    assert.ok(JACK_SEQUENCES[k].fps >= 12 && JACK_SEQUENCES[k].fps <= 15, `${k} FPS ${JACK_SEQUENCES[k].fps} must be 12..15`);
  }
  for (const k of ['jack_special1_knives', 'jack_special2_soul_eye', 'jack_special3_giant_scissors', 'jack_special4_gods_hands'] as JackSequenceKey[]) {
    assert.ok(JACK_SEQUENCES[k].fps >= 15 && JACK_SEQUENCES[k].fps <= 20, `${k} FPS ${JACK_SEQUENCES[k].fps} must be 15..20`);
  }

  // Standing scale proportional to roster
  const jackIdleH = JACK_SEQUENCES.jack_idle.frameHeight * JACK_RENDER_SCALE;
  const ninjaIdleH = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const trollIdleH = TROLL_SEQUENCES.idle.frameHeight * TROLL_RENDER_SCALE;
  assert.ok(
    jackIdleH >= ninjaIdleH - 4 && jackIdleH <= trollIdleH + 8,
    `Expected Jack idle height (${jackIdleH.toFixed(1)}px) proportional to Ninja (${ninjaIdleH.toFixed(1)}px) & Troll (${trollIdleH.toFixed(1)}px)`
  );

  for (const fxPathRel of Object.values(JACK_FX_FILES)) {
    const fxPath = path.join(process.cwd(), 'public', fxPathRel.replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Jack FX sprite ${fxPath}`);
    const fxBuf = fs.readFileSync(fxPath);
    assert.equal(fxBuf[25], 6, `Jack FX ${fxPathRel} must be RGBA (colorType 6)`);
  }

  const portraitPath = path.join(process.cwd(), 'public', JACK_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Jack portrait ${portraitPath}`);
});

test('Jack Estripador roster metadata, specials, and action sequence mappings match spec', () => {
  const j = CHARACTERS.jack;
  assert.equal(j.name, 'Jack Estripador');
  assert.equal(j.victoryQuote, JACK_VICTORY_QUOTE);
  assert.equal(j.specials.special1.name, 'Lançar Facas');
  assert.equal(j.specials.special2.name, 'Olho da Alma');
  assert.equal(j.specials.special3.name, 'Tesoura Gigante');
  assert.equal(j.specials.special4.name, 'Mãos de Deus');

  assert.equal(mapActionToJackSequence('idle'), 'jack_idle');
  assert.equal(mapActionToJackSequence('walk'), 'jack_walk');
  assert.equal(mapActionToJackSequence('run'), 'jack_run');
  assert.equal(mapActionToJackSequence('jump'), 'jack_jump');
  assert.equal(mapActionToJackSequence('crouch'), 'jack_crouch');
  assert.equal(mapActionToJackSequence('standup'), 'jack_standup');
  assert.equal(mapActionToJackSequence('block'), 'jack_block');
  assert.equal(mapActionToJackSequence('roll'), 'jack_dodge');
  assert.equal(mapActionToJackSequence('punch'), 'jack_punch');
  assert.equal(mapActionToJackSequence('heavy_punch'), 'jack_heavy_punch');
  assert.equal(mapActionToJackSequence('kick'), 'jack_kick');
  assert.equal(mapActionToJackSequence('crouch_kick'), 'jack_crouch_kick');
  assert.equal(mapActionToJackSequence('heavy_kick'), 'jack_heavy_kick');
  assert.equal(mapActionToJackSequence('special1'), 'jack_special1_knives');
  assert.equal(mapActionToJackSequence('special2'), 'jack_special2_soul_eye');
  assert.equal(mapActionToJackSequence('special3'), 'jack_special3_giant_scissors');
  assert.equal(mapActionToJackSequence('special4'), 'jack_special4_gods_hands');
  assert.equal(mapActionToJackSequence('hitstun'), 'jack_hitstun');
  assert.equal(mapActionToJackSequence('knockdown'), 'jack_knockdown');
  assert.equal(mapActionToJackSequence('getup'), 'jack_getup');
  assert.equal(mapActionToJackSequence('victory'), 'jack_victory');
});

test('Special 1 (Lançar Facas) accumulates 1 knife every 3s up to 8, supports single/multi throw with exact deduction, and auto-throws at 8', () => {
  const state = createMatchState('jack', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 120;
  state.f2.x = 340;
  state.f1.energy = 100;
  assert.equal(state.f1.jackKnives, 0);

  // Blocked when 0 knives
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.notEqual(state.f1.action, 'special1');

  // Advance 3.0s -> 1 knife; 6.0s -> 2 knives; 9.0s -> 3 knives
  advanceFrames(state, Math.round(JACK_KNIFE_RECHARGE_SECONDS * 60) + 1);
  assert.equal(state.f1.jackKnives, 1);
  advanceFrames(state, Math.round(JACK_KNIFE_RECHARGE_SECONDS * 2 * 60) + 2);
  assert.equal(state.f1.jackKnives, 3);

  // Down + Special 1 throws exactly 1 knife -> 2 knives remain
  stepMatch(state, { ...createEmptyInput(), down: true, special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1');
  assert.equal(state.f1.jackKnives, 2);
  advanceFrames(state, 10);
  const singleThrowCount = state.projectiles.filter((p) => p.kind === 'jack_knife').length;
  assert.equal(singleThrowCount, 1, 'Down + Special 1 must spawn exactly 1 jack_knife projectile');

  // Wait for throw recovery & projectile cleanup
  advanceFrames(state, 55);
  state.f1.energy = 100;

  // Regular Special 1 throws all currently available knives (2) -> 0 remain
  const prevHp = state.f2.hp;
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1');
  assert.equal(state.f1.jackKnives, 0);
  advanceFrames(state, 10);
  const multiThrowCount = state.projectiles.filter((p) => p.kind === 'jack_knife').length;
  assert.equal(multiThrowCount, 2, 'Special 1 must throw exact accumulated knife count (2)');
  advanceFrames(state, 55);
  assert.ok(state.f2.hp < prevHp, 'Thrown knives must collide with and damage opponent');

  // Accumulate up to 8 knives -> automatic launch of all 8 knives and reset to 0
  state.f1.jackKnives = 7;
  state.f1.jackKnifeTimer = JACK_KNIFE_RECHARGE_SECONDS - 0.1;
  state.f1.energy = 0;
  advanceFrames(state, 10);
  assert.equal(state.f1.action, 'special1', 'Reaching 8 knives must automatically launch Special 1');
  assert.equal(state.f1.jackKnives, 0, 'Auto-throw at 8 must deduct all 8 knives');
  advanceFrames(state, 12);
  const autoThrowCount = state.projectiles.filter((p) => p.kind === 'jack_knife').length;
  assert.equal(autoThrowCount, JACK_MAX_KNIVES, 'Auto-throw at 8 must launch 8 independent knives');

  // Accumulation restarts cleanly after auto-throw
  advanceFrames(state, Math.round(JACK_KNIFE_RECHARGE_SECONDS * 60) + 2);
  assert.equal(state.f1.jackKnives, 1);
});

test('Special 2 (Olho da Alma) spawns crimson eye FX, slows opponent, and drains 50% of opponent energy', () => {
  const state = createMatchState('jack', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 150;
  state.f2.x = 290;
  state.f1.energy = 100;
  state.f2.energy = 80;

  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special2');
  advanceFrames(state, 14);

  assert.ok(state.visualEffects.some((fx) => fx.kind === 'jack_soul_eye'), 'Should spawn jack_soul_eye FX');
  assert.ok(
    state.f2.slowTime > 2.8 && state.f2.slowTime <= JACK_SOUL_EYE_SLOW_DURATION,
    `Expected slowTime ~${JACK_SOUL_EYE_SLOW_DURATION}s, got ${state.f2.slowTime}`
  );
  assert.ok(
    state.f2.energy >= 39.5 && state.f2.energy <= 42.0,
    `Olho da Alma must drain 50% of opponent energy (80 -> ~40 plus passive tick), got ${state.f2.energy}`
  );
});

test('Special 3 (Tesoura Gigante) spins forward dealing multi-hit damage with independent scissor & rotation FX', () => {
  const state = createMatchState('jack', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 180;
  state.f2.x = 232;
  state.f1.energy = 100;
  const initHp = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special3');

  let sawSpinFx = false;
  let sawScissorsFx = false;
  for (let i = 0; i < 42; i++) {
    stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
    if (state.visualEffects.some((fx) => fx.kind === 'jack_scissor_spin')) sawSpinFx = true;
    if (state.visualEffects.some((fx) => fx.kind === 'jack_giant_scissors')) sawScissorsFx = true;
  }

  assert.ok(sawSpinFx, 'Should spawn independent jack_scissor_spin rotation FX');
  assert.ok(sawScissorsFx, 'Should spawn independent jack_giant_scissors FX');
  assert.ok(state.f1.x > 180, 'Tesoura Gigante must advance Jack horizontally while spinning');
  assert.ok(state.f2.hp < initHp, 'Tesoura Gigante must damage opponent');
  assert.ok(state.f1.multiHitsDone >= 2, `Expected multi-hit strikes, got ${state.f1.multiHitsDone}`);
});

test('Special 4 (Mãos de Deus) launches blood wave applying progressive bleed DoT and +30% vulnerability', () => {
  const state = createMatchState('jack', 'troll', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 140;
  state.f2.x = 260;
  state.f1.energy = 100;

  stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special4');

  let sawBloodWave = false;
  let sawBloodSplash = false;
  for (let i = 0; i < 40; i++) {
    stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
    if (state.projectiles.some((p) => p.kind === 'blood_wave')) sawBloodWave = true;
    if (state.visualEffects.some((fx) => fx.kind === 'jack_blood_splash')) sawBloodSplash = true;
  }
  assert.ok(sawBloodWave, 'Should spawn blood_wave projectile');
  assert.ok(sawBloodSplash, 'Should spawn jack_blood_splash FX');
  assert.ok(state.f2.bleedTime > 3.0 && state.f2.bleedTime <= JACK_BLEED_DURATION);
  assert.ok(state.f2.vulnerableTime > 3.5 && state.f2.vulnerableTime <= JACK_VULNERABLE_DURATION);

  // Verify progressive bleed DoT ticks reduce HP over time
  const hpAfterWave = state.f2.hp;
  advanceFrames(state, 90); // 1.5s -> 3 bleed ticks of 10 dmg
  assert.ok(state.f2.hp <= hpAfterWave - 20, `Bleed DoT should progressively damage opponent (${state.f2.hp} vs ${hpAfterWave})`);

  // Verify +30% vulnerability multiplier on subsequent hit
  const vulnState = createMatchState('jack', 'troll', 'shadow_temple', 'versus', 'normal', true);
  const baseState = createMatchState('jack', 'troll', 'shadow_temple', 'versus', 'normal', true);
  vulnState.f1.x = 180;
  vulnState.f2.x = 204;
  baseState.f1.x = 180;
  baseState.f2.x = 204;
  vulnState.f2.vulnerableTime = 3.0;

  const baseInitHp = baseState.f2.hp;
  const vulnInitHp = vulnState.f2.hp;
  stepMatch(baseState, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  stepMatch(vulnState, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(baseState, 12);
  advanceFrames(vulnState, 12);

  const baseDmg = baseInitHp - baseState.f2.hp;
  const vulnDmg = vulnInitHp - vulnState.f2.hp;
  assert.equal(
    vulnDmg,
    Math.round(baseDmg * JACK_VULNERABLE_DAMAGE_MULTIPLIER),
    `Vulnerable opponent must take +30% damage (${vulnDmg} vs expected ${Math.round(baseDmg * JACK_VULNERABLE_DAMAGE_MULTIPLIER)})`
  );
});

test('Jack combos, P2 mirror/AI operation, round reset, and victory pose work cleanly', () => {
  // Combo cancel: punch -> heavy_punch -> heavy_kick
  const cState = createMatchState('jack', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  cState.f1.x = 180;
  cState.f2.x = 204;
  stepMatch(cState, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(cState, 6);
  stepMatch(cState, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(cState.f1.action, 'heavy_punch');
  advanceFrames(cState, 7);
  stepMatch(cState, { ...createEmptyInput(), kickPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(cState.f1.action, 'heavy_kick');

  // P2 Jack AI & facing
  const aiState = createMatchState('ninja', 'jack', 'shadow_temple', 'arcade', 'normal', true);
  assert.equal(aiState.f2.facing, -1);
  for (let i = 0; i < 60; i++) {
    const aiIn = computeAiInputs(aiState, 1 / 60);
    stepMatch(aiState, createEmptyInput(), aiIn, 1 / 60);
  }
  assert.ok(aiState.f2.x >= 0 && aiState.f2.x <= STAGE_WIDTH);

  // Round reset & Victory
  const rState = createMatchState('jack', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  rState.f1.jackKnives = 4;
  rState.f2.bleedTime = 2.0;
  rState.f2.vulnerableTime = 2.0;
  rState.f2.hp = 1;
  rState.f1.x = 180;
  rState.f2.x = 204;
  stepMatch(rState, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(rState, 230);
  assert.equal(rState.roundNumber, 2);
  assert.equal(rState.f1.jackKnives, 0);
  assert.equal(rState.f2.bleedTime, 0);
  assert.equal(rState.f2.vulnerableTime, 0);

  rState.f2.hp = 1;
  rState.f1.x = 180;
  rState.f2.x = 204;
  stepMatch(rState, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(rState, 15);
  assert.equal(rState.roundPhase, 'finisher');
  assert.equal(rState.f1.action, 'victory');
  assert.equal(rState.f1.x, STAGE_WIDTH / 2);
  assert.equal(rState.f1.y, GROUND_Y);
  assert.equal(resolveJackFrame(rState.f1, 0.5).sequence.key, 'jack_victory');
});
