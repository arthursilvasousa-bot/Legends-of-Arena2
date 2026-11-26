import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import {
  JAYLON_RENDER_SCALE,
  JAYLON_SEQUENCES,
  JaylonSequenceKey,
  mapActionToJaylonSequence,
  resolveJaylonFrame,
} from './jaylonAnimator';
import { JAYLON_FX_FILES, JAYLON_PORTRAIT_FILE } from './jaylonSpritesLoader';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { TROLL_RENDER_SCALE, TROLL_SEQUENCES } from './trollAnimator';
import { CHARACTERS, GROUND_Y, STAGE_WIDTH } from './roster';
import { JaylonFxKind } from './types';

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

test('all 25 Jaylon sequences, 8 FX sprites, and portrait exist on disk matching manifest and scale parity', () => {
  const keys = Object.keys(JAYLON_SEQUENCES) as JaylonSequenceKey[];
  assert.equal(keys.length, 25);

  const manifestPath = path.join(process.cwd(), 'public/assets/jaylon/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing jaylon manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  for (const k of keys) {
    const seq = JAYLON_SEQUENCES[k];
    const mSeq = manifest.sequences[k];
    assert.ok(mSeq, `Missing ${k} in jaylon manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} frameHeight mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} anchorY mismatch`);

    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Jaylon sprite strip ${assetPath}`);

    const buf = fs.readFileSync(assetPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch`);
  }

  // Idle height matches existing fighters cleanly (~70-78px)
  const jaylonIdleH = JAYLON_SEQUENCES.idle.frameHeight * JAYLON_RENDER_SCALE;
  const ninjaIdleH = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const trollIdleH = TROLL_SEQUENCES.idle.frameHeight * TROLL_RENDER_SCALE;
  assert.ok(
    jaylonIdleH >= ninjaIdleH - 2 && jaylonIdleH <= trollIdleH + 6,
    `Expected Jaylon idle height (${jaylonIdleH.toFixed(1)}px) proportional to Ninja (${ninjaIdleH.toFixed(1)}px) & Troll (${trollIdleH.toFixed(1)}px)`
  );

  const fxKeys = Object.keys(JAYLON_FX_FILES) as JaylonFxKind[];
  assert.equal(fxKeys.length, 8);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', JAYLON_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Jaylon FX sprite ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', JAYLON_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Jaylon portrait ${portraitPath}`);
});

test('Jaylon roster definition has expected specials and action mappings', () => {
  const j = CHARACTERS.jaylon;
  assert.equal(j.name, 'Jaylon');
  assert.equal(j.specials.special1.name, 'Lança Casco de Cerveja');
  assert.equal(j.specials.special2.name, 'Ressaca Braba');
  assert.equal(j.specials.special3.name, 'Gole na Cerveja');
  assert.equal(j.specials.special3.energyCost, 25);
  assert.equal(j.specials.special4.name, 'Malboro');

  assert.equal(mapActionToJaylonSequence('idle'), 'idle');
  assert.equal(mapActionToJaylonSequence('walk'), 'walk');
  assert.equal(mapActionToJaylonSequence('run'), 'run');
  assert.equal(mapActionToJaylonSequence('jump'), 'jump');
  assert.equal(mapActionToJaylonSequence('crouch'), 'crouch');
  assert.equal(mapActionToJaylonSequence('standup'), 'standup');
  assert.equal(mapActionToJaylonSequence('block'), 'block');
  assert.equal(mapActionToJaylonSequence('punch'), 'punch');
  assert.equal(mapActionToJaylonSequence('kick'), 'kick');
  assert.equal(mapActionToJaylonSequence('hitstun'), 'damage');
  assert.equal(mapActionToJaylonSequence('stun'), 'stun');
  assert.equal(mapActionToJaylonSequence('knockdown'), 'knockdown');
  assert.equal(mapActionToJaylonSequence('getup'), 'getup');
  assert.equal(mapActionToJaylonSequence('special1'), 'special_bottle');
  assert.equal(mapActionToJaylonSequence('special2'), 'special_vomit');
  assert.equal(mapActionToJaylonSequence('special3'), 'special_drink');
  assert.equal(mapActionToJaylonSequence('special4'), 'special_malboro');
  assert.equal(mapActionToJaylonSequence('victory'), 'victory');
});

test('Jaylon resolves all animation phases & ends match cleanly in centered victory', () => {
  const state = createMatchState('jaylon', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  assert.equal(resolveJaylonFrame(state.f1, 0).sequence.key, 'idle');

  state.f1.roundsWon = 1;
  state.f2.hp = 1;
  state.f1.x = 180;
  state.f2.x = 204;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 15);
  assert.equal(state.roundPhase, 'finisher');
  assert.equal(state.f1.action, 'victory');
  assert.equal(state.f1.x, STAGE_WIDTH / 2);
  assert.equal(state.f1.y, GROUND_Y);
  assert.equal(state.f1.facing, 1);
  assert.ok(resolveJaylonFrame(state.f1, 1.0).sequence.key === 'victory');
});
