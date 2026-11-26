import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  BEELZEBU_RENDER_SCALE,
  BEELZEBU_SEQUENCES,
  BEELZEBU_VICTORY_QUOTE,
  BeelzebuSequenceKey,
  mapActionToBeelzebuSequence,
  resolveBeelzebuFrame,
} from './beelzebuAnimator';
import { BEELZEBU_FX_FILES, BEELZEBU_PORTRAIT_FILE } from './beelzebuSpritesLoader';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { TESLA_RENDER_SCALE, TESLA_SEQUENCES } from './teslaAnimator';
import { CHARACTERS, GROUND_Y, STAGE_WIDTH } from './roster';
import { BeelzebuFxKind } from './types';

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

test('all 27 Beelzebu sequences, 10 FX strips, and portrait exist on disk matching manifest, exact FPS, and scale parity', () => {
  const keys = Object.keys(BEELZEBU_SEQUENCES) as BeelzebuSequenceKey[];
  assert.equal(keys.length, 27);

  const manifestPath = path.join(process.cwd(), 'public/assets/beelzebu/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing beelzebu manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const k of keys) {
    const seq = BEELZEBU_SEQUENCES[k];
    const mSeq = manifest.animations[k];
    assert.ok(mSeq, `Missing ${k} in beelzebu manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} frameHeight mismatch`);
    assert.equal(seq.fps, mSeq.fps, `${k} fps mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} anchorY mismatch`);

    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Beelzebu sprite strip ${assetPath}`);

    const buf = fs.readFileSync(assetPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch`);
  }

  // Exact FPS targets
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_idle.fps, 8);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_walk_forward.fps, 12);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_walk_backward.fps, 12);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_run_forward.fps, 16);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_run_backward.fps, 16);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_jump.fps, 12);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_jab.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_heavy_punch.fps, 12);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_light_kick.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_front_kick.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_heavy_kick.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_block.fps, 10);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_crouch.fps, 10);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_jump_attack.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_air_kick.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_malboro_start.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_veneno_charge.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_cranio_summon.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_dominio_charge.fps, 15);
  assert.equal(BEELZEBU_SEQUENCES.beelzebu_victory.fps, 10);

  // Proportional standing height matching Ninja / Tesla (~74-78px)
  const beelIdleH = BEELZEBU_SEQUENCES.beelzebu_idle.frameHeight * BEELZEBU_RENDER_SCALE;
  const ninjaIdleH = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const teslaIdleH = TESLA_SEQUENCES.tesla_idle.frameHeight * TESLA_RENDER_SCALE;
  assert.ok(
    Math.abs(beelIdleH - ninjaIdleH) <= 6 && Math.abs(beelIdleH - teslaIdleH) <= 6,
    `Expected Beelzebu idle height (${beelIdleH.toFixed(1)}px) proportional to Ninja (${ninjaIdleH.toFixed(1)}px) & Tesla (${teslaIdleH.toFixed(1)}px)`
  );

  // All 10 FX strips match manifest & exist on disk
  const fxKeys = Object.keys(BEELZEBU_FX_FILES) as BeelzebuFxKind[];
  assert.equal(fxKeys.length, 10);
  for (const fxKey of fxKeys) {
    const mFx = manifest.fx[fxKey];
    assert.ok(mFx, `Missing ${fxKey} in beelzebu manifest.json fx`);
    const fxPath = path.join(process.cwd(), 'public', BEELZEBU_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Beelzebu FX strip ${fxPath}`);
    const buf = fs.readFileSync(fxPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, mFx.frameWidth * mFx.frameCount, `${fxKey} FX PNG width mismatch`);
    assert.equal(pngH, mFx.frameHeight, `${fxKey} FX PNG height mismatch`);
  }

  const portraitPath = path.join(process.cwd(), 'public', BEELZEBU_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Beelzebu portrait ${portraitPath}`);
});

test('Beelzebu identity, exclusive victory quote, specials, and action-to-sequence mappings work', () => {
  const b = CHARACTERS.beelzebu;
  assert.equal(b.name, 'Belze');
  assert.equal(b.title, 'O Senhor das Moscas');
  assert.equal(
    b.description,
    'Um homem envolto em mistério, portador de um poder além da compreensão. Beelzebu utiliza veneno, caveiras, ossos e sombras para dominar seus adversários.'
  );
  assert.equal(b.victoryQuote, BEELZEBU_VICTORY_QUOTE);
  assert.equal(b.victoryQuote, 'A morte... é só o começo.');
  assert.equal(b.specials.special1.name, 'Malboro');
  assert.equal(b.specials.special2.name, 'Veneno Mortal');
  assert.equal(b.specials.special3.name, 'Crânio Invocador');
  assert.equal(b.specials.special4.name, 'Domínio das Sombras');

  // Ensure victory quote is exclusive to Beelzebu
  for (const other of Object.values(CHARACTERS)) {
    if (other.id !== 'beelzebu') {
      assert.notEqual(other.victoryQuote, BEELZEBU_VICTORY_QUOTE);
    }
  }

  assert.equal(mapActionToBeelzebuSequence('idle'), 'beelzebu_idle');
  assert.equal(mapActionToBeelzebuSequence('idle', false, { landing: true }), 'beelzebu_landing');
  assert.equal(mapActionToBeelzebuSequence('walk', false), 'beelzebu_walk_forward');
  assert.equal(mapActionToBeelzebuSequence('walk', true), 'beelzebu_walk_backward');
  assert.equal(mapActionToBeelzebuSequence('run', false), 'beelzebu_run_forward');
  assert.equal(mapActionToBeelzebuSequence('run', true), 'beelzebu_run_backward');
  assert.equal(mapActionToBeelzebuSequence('jump'), 'beelzebu_jump');
  assert.equal(mapActionToBeelzebuSequence('crouch'), 'beelzebu_crouch');
  assert.equal(mapActionToBeelzebuSequence('block', false, { blockImpact: false }), 'beelzebu_block');
  assert.equal(mapActionToBeelzebuSequence('block', false, { blockImpact: true }), 'beelzebu_block_impact');
  assert.equal(mapActionToBeelzebuSequence('punch'), 'beelzebu_jab');
  assert.equal(mapActionToBeelzebuSequence('heavy_punch'), 'beelzebu_heavy_punch');
  assert.equal(mapActionToBeelzebuSequence('crouch_kick'), 'beelzebu_light_kick');
  assert.equal(mapActionToBeelzebuSequence('kick'), 'beelzebu_front_kick');
  assert.equal(mapActionToBeelzebuSequence('heavy_kick'), 'beelzebu_heavy_kick');
  assert.equal(mapActionToBeelzebuSequence('air_kick', false, { airAttackKind: 'punch' }), 'beelzebu_jump_attack');
  assert.equal(mapActionToBeelzebuSequence('air_kick', false, { airAttackKind: 'kick' }), 'beelzebu_air_kick');
  assert.equal(mapActionToBeelzebuSequence('victory'), 'beelzebu_victory');
});

test('Beelzebu resolves multi-phase Malboro, Domínio das Sombras, air attack, block impact, and centered victory pose cleanly', () => {
  const state = createMatchState('beelzebu', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_idle');

  // Backward run selects beelzebu_run_backward
  state.f1.action = 'run';
  state.f1.facing = 1;
  state.f1.vx = -220;
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_run_backward');

  // Block impact switches to beelzebu_block_impact
  state.f1.action = 'block';
  state.f1.blockImpactTime = 0.18;
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_block_impact');
  state.f1.blockImpactTime = 0;

  // Air punch vs air kick
  state.f1.action = 'air_kick';
  state.f1.airAttackKind = 'punch';
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_jump_attack');
  state.f1.airAttackKind = 'kick';
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_air_kick');

  // Special 1 (Malboro) switches from beelzebu_malboro_start -> beelzebu_malboro_smoke
  state.f1.action = 'idle';
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_malboro_start');
  advanceFrames(state, 16);
  assert.equal(resolveBeelzebuFrame(state.f1, 0.28).sequence.key, 'beelzebu_malboro_smoke');

  // Wait for Special 1 recovery, then test Special 4 (Domínio das Sombras) charge -> end
  advanceFrames(state, 35);
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(resolveBeelzebuFrame(state.f1, 0).sequence.key, 'beelzebu_dominio_charge');
  advanceFrames(state, 36);
  assert.equal(resolveBeelzebuFrame(state.f1, 0.6).sequence.key, 'beelzebu_dominio_end');

  // Match-ending KO puts Beelzebu centered in victory pose
  const koMatch = createMatchState('beelzebu', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  koMatch.f1.roundsWon = 1;
  koMatch.f2.hp = 1;
  koMatch.f1.x = 180;
  koMatch.f2.x = 204;
  stepMatch(koMatch, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(koMatch, 15);
  assert.equal(koMatch.roundPhase, 'finisher');
  assert.equal(koMatch.f1.action, 'victory');
  assert.equal(koMatch.f1.x, STAGE_WIDTH / 2);
  assert.equal(koMatch.f1.y, GROUND_Y);
  assert.equal(koMatch.f1.facing, 1);
  assert.equal(resolveBeelzebuFrame(koMatch.f1, 1.0).sequence.key, 'beelzebu_victory');
});
