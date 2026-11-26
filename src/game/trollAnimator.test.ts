import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
import { MINOTAUR_RENDER_SCALE, MINOTAUR_SEQUENCES } from './minotaurAnimator';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { CHARACTERS, GROUND_Y, STAGE_LEFT_BOUND, STAGE_RIGHT_BOUND, STAGE_WIDTH } from './roster';
import {
  TROLL_FURY_REVERSE_DURATION,
  TROLL_FURY_SCALE_X,
  TROLL_FURY_SCALE_Y,
  TROLL_RENDER_SCALE,
  TROLL_SEQUENCES,
  TrollSequenceKey,
  mapActionToTrollSequence,
  resolveTrollFrame,
} from './trollAnimator';
import { TROLL_FX_FILES, TROLL_PORTRAIT_FILE } from './trollSpritesLoader';
import { TrollFxKind } from './types';

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

test('all 23 Troll Kawa sequences, 10 FX sprites, and portrait exist on disk with manifest, FPS, and lean scale parity', () => {
  const keys = Object.keys(TROLL_SEQUENCES) as TrollSequenceKey[];
  assert.equal(keys.length, 23);

  const manifestPath = path.join(process.cwd(), 'public/assets/troll_kawa/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing troll_kawa manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const expectedCounts: Record<TrollSequenceKey, number> = {
    idle: 4,
    walk: 5,
    run: 4,
    jump: 4,
    crouch: 2,
    standup: 3,
    block: 3,
    roll: 4,
    knockdown: 3,
    getup: 3,
    punch: 3,
    kick: 3,
    heavy_punch: 3,
    heavy_kick: 2,
    grab: 4,
    throw: 3,
    ground_smash: 3,
    special_pancada_brutal: 7,
    special_salto_esmagador: 6,
    special_arremesso_pedra: 4,
    special_furia_troll: 6,
    fury_idle: 2,
    victory: 6,
  };

  for (const [k, count] of Object.entries(expectedCounts) as [TrollSequenceKey, number][]) {
    const seq = TROLL_SEQUENCES[k];
    assert.equal(seq.frameCount, count, `${k} frameCount mismatch`);
    const mSeq = manifest.sequences[k];
    assert.ok(mSeq, `Missing ${k} in manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} manifest frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} manifest frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} manifest frameHeight mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} manifest anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} manifest anchorY mismatch`);

    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Troll Kawa sprite strip ${assetPath}`);

    // Verify PNG header dimensions match frameWidth * frameCount x frameHeight
    const buf = fs.readFileSync(assetPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch`);
  }

  // Exact FPS checks
  assert.equal(TROLL_SEQUENCES.idle.fps, 6);
  assert.equal(TROLL_SEQUENCES.walk.fps, 12);
  assert.equal(TROLL_SEQUENCES.run.fps, 16);
  assert.equal(TROLL_SEQUENCES.jump.fps, 12);
  assert.equal(TROLL_SEQUENCES.crouch.fps, 10);
  assert.equal(TROLL_SEQUENCES.standup.fps, 10);
  assert.equal(TROLL_SEQUENCES.block.fps, 10);
  assert.equal(TROLL_SEQUENCES.roll.fps, 12);
  assert.equal(TROLL_SEQUENCES.knockdown.fps, 8);
  assert.equal(TROLL_SEQUENCES.getup.fps, 10);
  assert.equal(TROLL_SEQUENCES.punch.fps, 15);
  assert.equal(TROLL_SEQUENCES.kick.fps, 15);
  assert.equal(TROLL_SEQUENCES.heavy_punch.fps, 12);
  assert.equal(TROLL_SEQUENCES.heavy_kick.fps, 12);
  assert.equal(TROLL_SEQUENCES.grab.fps, 12);
  assert.equal(TROLL_SEQUENCES.throw.fps, 12);
  assert.equal(TROLL_SEQUENCES.ground_smash.fps, 15);
  assert.equal(TROLL_SEQUENCES.special_pancada_brutal.fps, 15);
  assert.equal(TROLL_SEQUENCES.special_salto_esmagador.fps, 15);
  assert.equal(TROLL_SEQUENCES.special_arremesso_pedra.fps, 15);
  assert.equal(TROLL_SEQUENCES.special_furia_troll.fps, 15);
  assert.equal(TROLL_SEQUENCES.victory.loop, false);

  // Lean normal height proportional between Ninja & Minotaur
  const trollLeanHeight = TROLL_SEQUENCES.idle.frameHeight * TROLL_RENDER_SCALE;
  const ninjaHeight = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const wallaceHeight = MINOTAUR_SEQUENCES.idle.frameHeight * MINOTAUR_RENDER_SCALE;
  assert.ok(
    trollLeanHeight >= ninjaHeight && trollLeanHeight <= wallaceHeight,
    `Expected lean Kawa (${trollLeanHeight.toFixed(1)}px) between Ninja (${ninjaHeight.toFixed(1)}px) and Wallace (${wallaceHeight.toFixed(1)}px)`
  );

  const fxKeys = Object.keys(TROLL_FX_FILES) as TrollFxKind[];
  assert.equal(fxKeys.length, 10);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', TROLL_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Troll Kawa FX sprite ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', TROLL_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Troll Kawa portrait ${portraitPath}`);
});

test('Troll roster has empty playerName and 4 official specials', () => {
  const t = CHARACTERS.troll;
  assert.equal(t.playerName, '');
  assert.equal(t.specials.special1.name, 'Pancada Brutal');
  assert.equal(t.specials.special2.name, 'Salto Esmagador');
  assert.equal(t.specials.special3.name, 'Arremesso de Pedra');
  assert.equal(t.specials.special4.name, 'Fúria do Troll');
  assert.deepEqual(Object.keys(t.specials), ['special1', 'special2', 'special3', 'special4']);
});

test('Troll Kawa movement & normals: lean idle -> walk -> run -> roll -> crouch -> standup, combo, grab/throw, knockdown -> getup', () => {
  const state = createMatchState('troll', 'ninja', 'troll_lands', 'versus', 'normal', true);
  assert.equal(state.f1.action, 'idle');
  assert.equal(mapActionToTrollSequence('idle', 0, 0), 'idle');

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

  // Punch -> Heavy Punch -> Heavy Kick combo
  state.f1.x = 200;
  state.f2.x = 228;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 8);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_punch');
  advanceFrames(state, 9);
  assert.ok(state.f1.hitConnectedThisMove);

  stepMatch(state, { ...createEmptyInput(), kickPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_kick');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_shockwaves'));

  // Grab & Throw bypass block
  advanceFrames(state, 40);
  state.f1.x = 200;
  state.f2.x = 224;
  const hpBeforeGrab = state.f2.hp;
  stepMatch(
    state,
    { ...createEmptyInput(), grabPressed: true },
    { ...createEmptyInput(), block: true },
    1 / 60
  );
  advanceFrames(state, 35, undefined, () => ({ ...createEmptyInput(), block: true }));
  assert.ok(state.f2.hp < hpBeforeGrab - 70, 'Troll grab/throw should bypass block');

  // Knockdown -> Getup
  advanceFrames(state, 30);
  state.f2.action = 'knockdown';
  state.f2.hitstunTime = 0.05;
  state.f2.vy = 0;
  state.f1.action = 'knockdown';
  state.f1.hitstunTime = 0.05;
  state.f1.vy = 0;
  advanceFrames(state, 6);
  assert.equal(state.f1.action, 'getup');
  advanceFrames(state, 22);
  assert.equal(state.f1.action, 'idle');
});

test('Salto Esmagador (T) deals real HP damage on landing inside radius, hits once, respects block, and misses outside radius', () => {
  for (const dir of [1, -1] as const) {
    // 1. Inside impact radius -> real damage once!
    const state = createMatchState('troll', 'minotaur', 'troll_lands', 'versus', 'normal', true);
    state.f1.x = dir === 1 ? 150 : 330;
    state.f2.x = dir === 1 ? 245 : 235;
    state.f1.facing = dir;
    state.f2.facing = dir === 1 ? -1 : 1;
    state.f1.energy = 100;

    const hpBefore = state.f2.hp;
    stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
    assert.equal(state.f1.action, 'special2');

    // Crouch prep during startup (~0.12s), then airborne
    advanceFrames(state, 4);
    assert.equal(resolveTrollFrame(state.f1).frameIndex, 0, 'Frame 0 prep during startup');
    advanceFrames(state, 18);
    assert.ok(state.f1.y < GROUND_Y, `Kawa must jump into the air during Salto Esmagador (dir=${dir})`);

    // Check landing + recovery frames, then wait for recovery -> idle
    advanceFrames(state, 50);
    const dmg = hpBefore - state.f2.hp;
    assert.equal(
      dmg,
      CHARACTERS.troll.specials.special2.damage,
      `Salto Esmagador must deal exact ${CHARACTERS.troll.specials.special2.damage} damage once (got ${dmg}, dir=${dir})`
    );
    assert.equal(state.f1.y, GROUND_Y, 'Kawa should return cleanly to GROUND_Y');
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_ground_impact'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_earth_explosion'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_shockwaves'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_pebbles'));
    advanceFrames(state, 10);
    assert.equal(state.f1.action, 'idle', 'Kawa should recover cleanly to idle');
  }

  // 2. Outside impact radius -> 0 damage
  const missState = createMatchState('troll', 'minotaur', 'troll_lands', 'versus', 'normal', true);
  missState.f1.x = 80;
  missState.f2.x = 390; // 310px away; max leap distance is 135px + rangeX 64 = 199px
  missState.f1.energy = 100;
  const missHpBefore = missState.f2.hp;
  stepMatch(missState, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(missState, 80);
  assert.equal(missState.f2.hp, missHpBefore, 'Opponent far outside Salto Esmagador radius should take 0 damage');

  // 3. Respects block -> chip damage only
  const blockState = createMatchState('troll', 'minotaur', 'troll_lands', 'versus', 'normal', true);
  blockState.f1.x = 160;
  blockState.f2.x = 240;
  blockState.f1.energy = 100;
  const blockHpBefore = blockState.f2.hp;
  stepMatch(
    blockState,
    { ...createEmptyInput(), special2Pressed: true },
    { ...createEmptyInput(), block: true },
    1 / 60
  );
  advanceFrames(blockState, 80, undefined, () => ({ ...createEmptyInput(), block: true }));
  const blockDmg = blockHpBefore - blockState.f2.hp;
  assert.equal(blockDmg, CHARACTERS.troll.specials.special2.chipDamage, 'Blocked Salto Esmagador should deal chip damage');
});

test('Pancada Brutal (R) and Arremesso de Pedra (Y) work cleanly in both directions with Troll FX', () => {
  for (const dir of [1, -1] as const) {
    const state = createMatchState('troll', 'minotaur', 'troll_lands', 'versus', 'normal', true);
    state.f1.x = dir === 1 ? 160 : 320;
    state.f2.x = dir === 1 ? 205 : 275;
    state.f1.facing = dir;
    state.f2.facing = dir === 1 ? -1 : 1;

    // R: Pancada Brutal
    state.f1.energy = 100;
    const hpBeforeR = state.f2.hp;
    const xBeforeR = state.f2.x;
    stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 22);
    assert.ok(state.f2.hp < hpBeforeR, `Pancada Brutal should deal damage (dir=${dir})`);
    assert.ok(
      dir === 1 ? state.f2.x > xBeforeR : state.f2.x < xBeforeR,
      `Pancada Brutal should apply knockback (dir=${dir})`
    );
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_ground_impact'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_shockwaves'));
    advanceFrames(state, 20);
    assert.equal(state.f1.action, 'idle');

    // Y: Arremesso de Pedra
    advanceFrames(state, 40);
    state.visualEffects = [];
    state.hitstopTimer = 0;
    state.f1.energy = 100;
    state.f1.x = dir === 1 ? 110 : 370;
    state.f2.x = dir === 1 ? 240 : 240;
    const hpBeforeY = state.f2.hp;
    stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(state, 16);
    assert.ok(
      state.projectiles.some((p) => p.kind === 'boulder'),
      `Arremesso de Pedra should spawn boulder projectile (dir=${dir})`
    );
    advanceFrames(state, 32);
    assert.ok(state.f2.hp < hpBeforeY, `Boulder should hit opponent (dir=${dir})`);
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_earth_explosion'));
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_pebbles'));
    assert.ok(state.f1.x >= STAGE_LEFT_BOUND && state.f1.x <= STAGE_RIGHT_BOUND);
  }
});

test('Fúria do Troll (U) transforms lean -> muscular with buff, enforces cooldown, and reverses back to exact lean form', () => {
  const state = createMatchState('troll', 'minotaur', 'troll_lands', 'versus', 'normal', true);
  state.f1.x = 180;
  state.f2.x = 206;

  // Baseline lean check
  const leanFrame = resolveTrollFrame(state.f1, 0);
  assert.equal(leanFrame.sequence.key, 'idle');
  assert.equal(leanFrame.isMuscularForm, false);
  assert.equal(leanFrame.bodyScaleX, 1);
  assert.equal(leanFrame.bodyScaleY, 1);

  // Measure normal punch damage & knockback
  const hpBeforeNormalPunch = state.f2.hp;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 18);
  const normalPunchDmg = hpBeforeNormalPunch - state.f2.hp;
  advanceFrames(state, 35);

  // Activate Fúria do Troll (U)
  state.f1.energy = 100;
  state.f2.x = 206;
  stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special4');
  const startTransform = resolveTrollFrame(state.f1, 0);

  // Progressive transformation mid-way
  advanceFrames(state, 12); // ~0.20s inside special4
  const midTransform = resolveTrollFrame(state.f1, 0.2);
  assert.equal(midTransform.sequence.key, 'special_furia_troll');
  assert.ok(midTransform.frameIndex >= 1 && midTransform.frameIndex <= 5);
  assert.ok(midTransform.bodyScaleX > startTransform.bodyScaleX);

  // Finish activation -> Muscular Fury idle & aura FX & cooldown
  advanceFrames(state, 16);
  assert.equal(state.f1.action, 'idle');
  assert.ok(state.f1.furyTime > 5.0, 'Fury duration (~6s) should be active');
  assert.ok(state.f1.furyCooldown > 9.0, 'Fury cooldown (~10s) should start');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_fury_aura'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_fury_particles'));

  const muscularIdle = resolveTrollFrame(state.f1, 1.0);
  assert.equal(muscularIdle.sequence.key, 'fury_idle');
  assert.equal(muscularIdle.isMuscularForm, true);

  // Muscular scale applies on non-fury actions (e.g. walk/punch)
  state.f1.action = 'walk';
  const muscularWalk = resolveTrollFrame(state.f1, 1.0);
  assert.equal(muscularWalk.bodyScaleX, TROLL_FURY_SCALE_X);
  assert.equal(muscularWalk.bodyScaleY, TROLL_FURY_SCALE_Y);
  state.f1.action = 'idle';

  // Cooldown prevents re-casting Fúria immediately
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.notEqual(state.f1.action, 'special4', 'Should not allow re-triggering Fúria while active/cooldown');

  // Fury punch deals ~35% more damage
  state.f2.x = 206;
  const hpBeforeFuryPunch = state.f2.hp;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 18);
  const furyPunchDmg = hpBeforeFuryPunch - state.f2.hp;
  assert.ok(
    furyPunchDmg > normalPunchDmg * 1.25,
    `Fury punch (${furyPunchDmg}) should significantly exceed normal punch (${normalPunchDmg})`
  );

  // Expire Fury -> triggers reverse transformation back to lean normal form
  advanceFrames(state, 20);
  state.f1.furyTime = 0.02;
  advanceFrames(state, 4); // crosses 0 -> sets furyReverseTime = 0.35
  assert.equal(state.f1.furyTime, 0);
  assert.ok(state.f1.furyReverseTime > 0, 'Expiring Fury should trigger reverse transformation timer');
  const reverseEarly = resolveTrollFrame(state.f1, 7.0);
  assert.equal(reverseEarly.sequence.key, 'special_furia_troll');
  assert.equal(reverseEarly.isReversing, true);
  assert.ok(reverseEarly.frameIndex >= 2, `Reverse transform should start from muscular frame (got ${reverseEarly.frameIndex})`);

  // Finish reverse timer -> back to exact lean form
  advanceFrames(state, Math.ceil(TROLL_FURY_REVERSE_DURATION * 60) + 5);
  assert.equal(state.f1.furyReverseTime, 0);
  const backToLean = resolveTrollFrame(state.f1, 8.0);
  assert.equal(backToLean.sequence.key, 'idle');
  assert.equal(backToLean.isMuscularForm, false);
  assert.equal(backToLean.bodyScaleX, 1);
  assert.equal(backToLean.bodyScaleY, 1);
});

test('Troll Kawa best-of-3 match end triggers centered victory with Fury & Earth FX', () => {
  const state = createMatchState('troll', 'ninja', 'troll_lands', 'versus', 'normal', true);
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
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_fury_aura'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_earth_explosion'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_troll_fury_particles'));
});
