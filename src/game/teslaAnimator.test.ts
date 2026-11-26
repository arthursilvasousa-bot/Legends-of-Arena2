import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  TESLA_RENDER_SCALE,
  TESLA_SEQUENCES,
  TESLA_VICTORY_QUOTE,
  TeslaSequenceKey,
  mapActionToTeslaSequence,
  resolveTeslaFrame,
} from './teslaAnimator';
import { TESLA_FX_FILES, TESLA_PORTRAIT_FILE } from './teslaSpritesLoader';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { TROLL_RENDER_SCALE, TROLL_SEQUENCES } from './trollAnimator';
import { CHARACTERS, GROUND_Y, STAGE_WIDTH } from './roster';
import { TeslaFxKind } from './types';

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

test('all 28 Tesla sequences, 7 FX strips, and portrait exist on disk matching manifest, exact FPS, and scale parity', () => {
  const keys = Object.keys(TESLA_SEQUENCES) as TeslaSequenceKey[];
  assert.equal(keys.length, 28);

  const manifestPath = path.join(process.cwd(), 'public/assets/tesla/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing tesla manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const k of keys) {
    const seq = TESLA_SEQUENCES[k];
    const mSeq = manifest.sequences[k];
    assert.ok(mSeq, `Missing ${k} in tesla manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} frameHeight mismatch`);
    assert.equal(seq.fps, mSeq.fps, `${k} fps mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} anchorY mismatch`);

    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Tesla sprite strip ${assetPath}`);

    const buf = fs.readFileSync(assetPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch`);
  }

  // Exact FPS targets specified in prompt
  assert.equal(TESLA_SEQUENCES.tesla_idle.fps, 8);
  assert.equal(TESLA_SEQUENCES.tesla_walk_forward.fps, 12);
  assert.equal(TESLA_SEQUENCES.tesla_walk_backward.fps, 12);
  assert.equal(TESLA_SEQUENCES.tesla_run_forward.fps, 16);
  assert.equal(TESLA_SEQUENCES.tesla_run_backward.fps, 16);
  assert.equal(TESLA_SEQUENCES.tesla_jump.fps, 12);
  assert.equal(TESLA_SEQUENCES.tesla_jab.fps, 15);
  assert.equal(TESLA_SEQUENCES.tesla_heavy_punch.fps, 12);
  assert.equal(TESLA_SEQUENCES.tesla_front_kick.fps, 15);
  assert.equal(TESLA_SEQUENCES.tesla_high_kick.fps, 15);
  assert.equal(TESLA_SEQUENCES.tesla_block.fps, 10);
  assert.equal(TESLA_SEQUENCES.tesla_low_block.fps, 10);
  assert.equal(TESLA_SEQUENCES.tesla_crouch.fps, 10);
  assert.equal(TESLA_SEQUENCES.tesla_victory.fps, 10);
  assert.equal(TESLA_SEQUENCES.tesla_special1_charge.fps, 15);
  assert.equal(TESLA_SEQUENCES.tesla_special2_teleport.fps, 18);
  assert.equal(TESLA_SEQUENCES.tesla_special2_punch.fps, 18);
  assert.equal(TESLA_SEQUENCES.tesla_special3_charge.fps, 15);
  assert.equal(TESLA_SEQUENCES.tesla_special4_charge.fps, 15);

  // Proportional height matching Ninja / Troll
  const teslaIdleH = TESLA_SEQUENCES.tesla_idle.frameHeight * TESLA_RENDER_SCALE;
  const ninjaIdleH = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const trollIdleH = TROLL_SEQUENCES.idle.frameHeight * TROLL_RENDER_SCALE;
  assert.ok(
    teslaIdleH >= ninjaIdleH - 2 && teslaIdleH <= trollIdleH + 6,
    `Expected Tesla idle height (${teslaIdleH.toFixed(1)}px) proportional to Ninja (${ninjaIdleH.toFixed(1)}px) & Troll (${trollIdleH.toFixed(1)}px)`
  );

  const fxKeys = Object.keys(TESLA_FX_FILES) as TeslaFxKind[];
  assert.equal(fxKeys.length, 7);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', TESLA_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Tesla FX strip ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', TESLA_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Tesla portrait ${portraitPath}`);
});

test('Tesla identity, victory quote, forward/backward movement mapping, and low-block mapping work', () => {
  const t = CHARACTERS.tesla;
  assert.equal(t.name, 'Nikola Tesla');
  assert.equal(t.title, 'O Gênio da Eletricidade');
  assert.equal(
    t.description,
    'Cientista e inventor que utiliza tecnologia elétrica avançada para dominar o campo de batalha.'
  );
  assert.equal(t.victoryQuote, TESLA_VICTORY_QUOTE);
  assert.equal(t.victoryQuote, '“Mágica? Não, odeio essa palavra, isso é ciência!”');

  // Ensure victory quote is exclusive to Nikola Tesla
  for (const other of Object.values(CHARACTERS)) {
    if (other.id !== 'tesla') {
      assert.notEqual(other.victoryQuote, TESLA_VICTORY_QUOTE);
    }
  }

  assert.equal(mapActionToTeslaSequence('idle'), 'tesla_idle');
  assert.equal(mapActionToTeslaSequence('walk', false), 'tesla_walk_forward');
  assert.equal(mapActionToTeslaSequence('walk', true), 'tesla_walk_backward');
  assert.equal(mapActionToTeslaSequence('run', false), 'tesla_run_forward');
  assert.equal(mapActionToTeslaSequence('run', true), 'tesla_run_backward');
  assert.equal(mapActionToTeslaSequence('jump'), 'tesla_jump');
  assert.equal(mapActionToTeslaSequence('punch'), 'tesla_jab');
  assert.equal(mapActionToTeslaSequence('heavy_punch'), 'tesla_heavy_punch');
  assert.equal(mapActionToTeslaSequence('kick'), 'tesla_front_kick');
  assert.equal(mapActionToTeslaSequence('heavy_kick'), 'tesla_high_kick');
  assert.equal(mapActionToTeslaSequence('block', false, false), 'tesla_block');
  assert.equal(mapActionToTeslaSequence('block', false, true), 'tesla_low_block');
  assert.equal(mapActionToTeslaSequence('crouch'), 'tesla_crouch');
  assert.equal(mapActionToTeslaSequence('victory'), 'tesla_victory');
});

test('Tesla resolves multi-phase special animations and centered victory pose cleanly', () => {
  const state = createMatchState('tesla', 'minotaur', 'celestial_cathedral', 'versus', 'normal', true);
  assert.equal(resolveTeslaFrame(state.f1, 0).sequence.key, 'tesla_idle');

  // Walking backward selects tesla_walk_backward
  state.f1.action = 'walk';
  state.f1.facing = 1;
  state.f1.vx = -120;
  assert.equal(resolveTeslaFrame(state.f1, 0).sequence.key, 'tesla_walk_backward');

  // Low block selects tesla_low_block
  state.f1.action = 'block';
  state.f1.isLowBlock = true;
  assert.equal(resolveTeslaFrame(state.f1, 0).sequence.key, 'tesla_low_block');

  // Special 2 switches from tesla_special2_teleport (startup) -> tesla_special2_punch (active)
  state.f1.action = 'idle';
  state.f1.isLowBlock = false;
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(resolveTeslaFrame(state.f1, 0).sequence.key, 'tesla_special2_teleport');
  advanceFrames(state, 20);
  assert.equal(resolveTeslaFrame(state.f1, 0.35).sequence.key, 'tesla_special2_punch');

  // Match-ending KO puts Tesla centered in victory pose
  const koMatch = createMatchState('tesla', 'minotaur', 'celestial_cathedral', 'versus', 'normal', true);
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
  assert.equal(resolveTeslaFrame(koMatch.f1, 1.0).sequence.key, 'tesla_victory');
});
