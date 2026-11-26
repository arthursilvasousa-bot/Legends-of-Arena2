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
  DONO_ATIVIDADE_ENERGY_GAIN,
  DONO_ATIVIDADE_LOCK_DURATION,
  DONO_CAMUFLAGEM_DURATION,
  DONO_MARYJUANA_DURATION,
  DONO_MARYJUANA_SPEED_MULTIPLIER,
  DONO_MAX_AMMO,
  DONO_RELOAD_DURATION,
  DONO_RENDER_SCALE,
  DONO_SEQUENCES,
  DONO_VICTORY_QUOTE,
  DonoSequenceKey,
  mapActionToDonoSequence,
  resolveDonoFrame,
} from './donoAnimator';
import { DONO_FX_FILES, DONO_PORTRAIT_FILE } from './donoSpritesLoader';
import { NINJA_RENDER_SCALE, NINJA_SEQUENCES } from './ninjaAnimator';
import { TROLL_RENDER_SCALE, TROLL_SEQUENCES } from './trollAnimator';
import { CHARACTERS, GROUND_Y, STAGE_WIDTH } from './roster';
import { DonoFxKind } from './types';

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

test('all 37 Dono sequences, 6 FX strips, and portrait exist on disk matching manifest, scale, and FPS', () => {
  const keys = Object.keys(DONO_SEQUENCES) as DonoSequenceKey[];
  assert.equal(keys.length, 37);

  const manifestPath = path.join(process.cwd(), 'public/assets/dono/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing dono manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const mAnims = manifest.animations ?? manifest.sequences;
  assert.ok(mAnims, 'Missing animations map in dono manifest.json');

  for (const k of keys) {
    const seq = DONO_SEQUENCES[k];
    const mSeq = mAnims[k];
    assert.ok(mSeq, `Missing ${k} in dono manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} frameHeight mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} anchorY mismatch`);

    const assetPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(assetPath), `Missing Dono sprite strip ${assetPath}`);

    const buf = fs.readFileSync(assetPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch (${pngW} vs ${seq.frameWidth * seq.frameCount})`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch (${pngH} vs ${seq.frameHeight})`);
  }

  // Exact FPS assertions
  assert.equal(DONO_SEQUENCES.dono_idle.fps, 8);
  assert.equal(DONO_SEQUENCES.dono_walk_forward.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_walk_backward.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_run_forward.fps, 16);
  assert.equal(DONO_SEQUENCES.dono_run_backward.fps, 16);
  assert.equal(DONO_SEQUENCES.dono_jump.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_jab.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_heavy_punch.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_light_kick.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_front_kick.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_heavy_kick.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_block.fps, 10);
  assert.equal(DONO_SEQUENCES.dono_crouch.fps, 10);
  assert.equal(DONO_SEQUENCES.dono_festa_draw.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_festa_aim.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_festa_shoot.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_festa_reload.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_atividade_start.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_atividade_radio.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_atividade_energy.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_atividade_end.fps, 12);
  assert.equal(DONO_SEQUENCES.dono_camuflagem_start.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_camuflagem_change.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_camuflagem_invisible.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_camuflagem_reappear.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_camuflagem_end.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_maryjuana_start.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_maryjuana_smoke.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_maryjuana_boost.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_maryjuana_speed.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_maryjuana_end.fps, 15);
  assert.equal(DONO_SEQUENCES.dono_victory.fps, 10);

  // Standing height parity with existing roster
  const donoIdleH = DONO_SEQUENCES.dono_idle.frameHeight * DONO_RENDER_SCALE;
  const ninjaIdleH = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const trollIdleH = TROLL_SEQUENCES.idle.frameHeight * TROLL_RENDER_SCALE;
  assert.ok(
    donoIdleH >= ninjaIdleH - 2 && donoIdleH <= trollIdleH + 10,
    `Expected Dono idle height (${donoIdleH.toFixed(1)}px) proportional to Ninja (${ninjaIdleH.toFixed(1)}px) & Troll (${trollIdleH.toFixed(1)}px)`
  );

  const fxKeys = Object.keys(DONO_FX_FILES) as DonoFxKind[];
  assert.equal(fxKeys.length, 6);
  for (const fxKey of fxKeys) {
    const fxPath = path.join(process.cwd(), 'public', DONO_FX_FILES[fxKey].replace(/^\//, ''));
    assert.ok(fs.existsSync(fxPath), `Missing Dono FX sprite ${fxPath}`);
  }

  const portraitPath = path.join(process.cwd(), 'public', DONO_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Dono portrait ${portraitPath}`);
});

test('Dono roster identity, exclusive victory quote, and action mappings match specification', () => {
  const d = CHARACTERS.dono;
  assert.equal(d.name, 'Dono do Morro');
  assert.equal(d.title, 'O Chefe da Quebrada');
  assert.equal(d.victoryQuote, DONO_VICTORY_QUOTE);
  assert.equal(d.victoryQuote, 'Aqui quem manda sou eu!');
  assert.equal(d.specials.special1.name, 'Festa na Favela');
  assert.equal(d.specials.special2.name, 'Atividade');
  assert.equal(d.specials.special3.name, 'Camuflagem de Cria');
  assert.equal(d.specials.special4.name, 'Onda da MaryJuana');

  assert.equal(mapActionToDonoSequence('idle'), 'dono_idle');
  assert.equal(mapActionToDonoSequence('walk', false), 'dono_walk_forward');
  assert.equal(mapActionToDonoSequence('walk', true), 'dono_walk_backward');
  assert.equal(mapActionToDonoSequence('run', false), 'dono_run_forward');
  assert.equal(mapActionToDonoSequence('run', true), 'dono_run_backward');
  assert.equal(mapActionToDonoSequence('jump'), 'dono_jump');
  assert.equal(mapActionToDonoSequence('crouch'), 'dono_crouch');
  assert.equal(mapActionToDonoSequence('block'), 'dono_block');
  assert.equal(mapActionToDonoSequence('punch'), 'dono_jab');
  assert.equal(mapActionToDonoSequence('heavy_punch'), 'dono_heavy_punch');
  assert.equal(mapActionToDonoSequence('crouch_kick'), 'dono_light_kick');
  assert.equal(mapActionToDonoSequence('kick'), 'dono_front_kick');
  assert.equal(mapActionToDonoSequence('heavy_kick'), 'dono_heavy_kick');
  assert.equal(mapActionToDonoSequence('hitstun'), 'dono_hit');
  assert.equal(mapActionToDonoSequence('knockdown'), 'dono_knockdown');
  assert.equal(mapActionToDonoSequence('getup'), 'dono_get_up');
  assert.equal(mapActionToDonoSequence('victory'), 'dono_victory');
});

test('Festa na Favela fires 5 pistol bullets, blocks at 0 ammo, reloads automatically in 1.0s, and spawns real colliding projectiles', () => {
  const state = createMatchState('dono', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 120;
  state.f2.x = 280;
  assert.equal(state.f1.donoAmmo, DONO_MAX_AMMO);

  const initialHp = state.f2.hp;
  let sawBullet = false;
  let sawMuzzle = false;
  let sawImpact = false;

  // Fire 5 consecutive shots
  for (let shot = 0; shot < DONO_MAX_AMMO; shot++) {
    state.f1.energy = 100;
    state.f2.hp = initialHp;
    state.f2.action = 'idle';
    state.f2.hitstunTime = 0;
    stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
    assert.equal(state.f1.action, 'special1', `Shot #${shot + 1} should start special1`);
    assert.equal(state.f1.donoAmmo, DONO_MAX_AMMO - shot - 1);

    for (let f = 0; f < 26; f++) {
      stepMatch(state, createEmptyInput(), createEmptyInput(), 1 / 60);
      if (state.projectiles.some((p) => p.kind === 'pistol_bullet')) sawBullet = true;
      if (state.visualEffects.some((fx) => fx.kind === 'dono_festa_muzzle_flash')) sawMuzzle = true;
      if (state.visualEffects.some((fx) => fx.kind === 'dono_festa_impact')) sawImpact = true;
    }
    assert.ok(state.f2.hp < initialHp, `Shot #${shot + 1} bullet should hit & damage opponent`);
  }

  assert.ok(sawBullet, 'Should spawn pistol_bullet projectile');
  assert.ok(sawMuzzle, 'Should spawn dono_festa_muzzle_flash FX');
  assert.ok(sawImpact, 'Should spawn dono_festa_impact FX on hit');

  // After 5th shot completes, reload timer starts cleanly at ~1.0s and blocks 6th shot
  assert.equal(state.f1.donoAmmo, 0);
  assert.ok(state.f1.donoReloadTimer > 0 && state.f1.donoReloadTimer <= DONO_RELOAD_DURATION);

  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.notEqual(state.f1.action, 'special1', 'Festa na Favela must be blocked at 0 ammo / while reloading');

  // Advance through exact 1.0s reload -> restores 5/5 ammo
  advanceFrames(state, 65);
  assert.equal(state.f1.donoReloadTimer, 0);
  assert.equal(state.f1.donoAmmo, DONO_MAX_AMMO);

  // Can fire again after reload completes
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1');
  assert.equal(state.f1.donoAmmo, DONO_MAX_AMMO - 1);

  // Defensive safeguard: if Dono's 5th shot startup is interrupted before active frame, reload still triggers cleanly
  const intState = createMatchState('dono', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  intState.f1.x = 180;
  intState.f2.x = 205;
  intState.f1.donoAmmo = 1;
  intState.f1.energy = 100;
  stepMatch(intState, { ...createEmptyInput(), special1Pressed: true }, { ...createEmptyInput(), punchPressed: true }, 1 / 60);
  assert.equal(intState.f1.donoAmmo, 0);
  advanceFrames(intState, 12);
  assert.ok(intState.f1.donoReloadTimer > 0, 'Interrupted 0-ammo Dono must still enter reload instead of soft-locking');
});

test('Atividade locks Dono completely immobile for 0.6s and restores +25% energy clamped to 100', () => {
  const state = createMatchState('dono', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 180;
  state.f2.x = 340;
  state.f1.energy = 50;

  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special2');
  assert.ok(
    Math.abs(state.f1.actionDuration - DONO_ATIVIDADE_LOCK_DURATION) < 1e-6,
    `Expected ~0.6s actionDuration, got ${state.f1.actionDuration}`
  );

  const lockStartX = state.f1.x;
  // Hold movement, jump, punch, kick during first 0.50s (30 frames) -> must stay completely immobile
  for (let i = 0; i < 30; i++) {
    stepMatch(
      state,
      {
        ...createEmptyInput(),
        right: true,
        up: true,
        punchPressed: i === 5,
        kickPressed: i === 10,
      },
      createEmptyInput(),
      1 / 60
    );
    assert.equal(state.f1.action, 'special2', `Dono must remain locked in Atividade at frame ${i}`);
    assert.equal(state.f1.x, lockStartX, 'Dono must not move horizontally during Atividade lock');
    assert.equal(state.f1.y, GROUND_Y, 'Dono must not jump during Atividade lock');
  }

  assert.ok(state.visualEffects.some((fx) => fx.kind === 'dono_atividade_wave'), 'Should spawn dono_atividade_wave FX');
  assert.ok(state.f1.energy >= 50 + DONO_ATIVIDADE_ENERGY_GAIN - 0.5, 'Should recover +25% energy');

  // Finish remaining frames of 0.6s lock -> recovers cleanly into idle & accepts input
  advanceFrames(state, 10);
  assert.notEqual(state.f1.action, 'special2');
  stepMatch(state, { ...createEmptyInput(), right: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'walk');

  // Verify clamp at 100 energy
  const clampState = createMatchState('dono', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  clampState.f1.energy = 90;
  stepMatch(clampState, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(clampState, 38);
  assert.equal(clampState.f1.energy, 100, 'Atividade energy recovery must clamp cleanly at 100');
});

test('Camuflagem de Cria lasts 1.5s, disrupts AI targeting, and breaks immediately if Dono takes an unblocked hit', () => {
  const state = createMatchState('dono', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 160;
  state.f2.x = 260;
  state.f1.energy = 100;

  stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special3');

  // Advance until active frame applies 1.5s camo
  advanceFrames(state, 10);
  assert.ok(
    state.f1.donoCamoTime > 1.35 && state.f1.donoCamoTime <= DONO_CAMUFLAGEM_DURATION,
    `Expected ~1.5s donoCamoTime, got ${state.f1.donoCamoTime}`
  );
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'dono_camuflagem_smoke'));

  // While invisible, AI loses targeting (never approaches or attacks)
  for (let i = 0; i < 15; i++) {
    const aiIn = computeAiInputs(state, 1 / 60);
    assert.equal(aiIn.punchPressed, false);
    assert.equal(aiIn.kickPressed, false);
    assert.equal(aiIn.special1Pressed, false);
    assert.equal(aiIn.left, false, 'AI on right must not approach invisible Dono on left');
  }

  // Wait full 1.5s -> camo clears automatically
  advanceFrames(state, 92);
  assert.equal(state.f1.donoCamoTime, 0, 'Camuflagem must expire cleanly after 1.5s');

  // Taking an unblocked hit breaks camo immediately (NOT invulnerable)
  const hitState = createMatchState('dono', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  hitState.f1.x = 180;
  hitState.f2.x = 204;
  hitState.f1.energy = 100;
  stepMatch(hitState, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(hitState, 22);
  assert.ok(hitState.f1.donoCamoTime > 1.0);
  const donoHpBeforeHit = hitState.f1.hp;
  stepMatch(hitState, createEmptyInput(), { ...createEmptyInput(), punchPressed: true }, 1 / 60);
  advanceFrames(hitState, 12);
  assert.ok(hitState.f1.hp < donoHpBeforeHit, 'Stealthed Dono must still take damage from attacks (no invulnerability)');
  assert.equal(hitState.f1.donoCamoTime, 0, 'Unblocked hit must reveal Dono immediately');
});

test('Onda da MaryJuana applies exact 1.5x horizontal movement speed for 2.0s without multiplicative stacking', () => {
  const baseState = createMatchState('dono', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  baseState.f1.x = 100;
  baseState.f2.x = 420;
  advanceFrames(baseState, 30, () => ({ ...createEmptyInput(), right: true }));
  const baseDeltaX = baseState.f1.x - 100;

  const buffState = createMatchState('dono', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  buffState.f1.x = 100;
  buffState.f2.x = 420;
  buffState.f1.energy = 100;

  stepMatch(buffState, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(buffState.f1.action, 'special4');
  advanceFrames(buffState, 26); // finish special4 startup/recovery -> 2.0s speed boost active
  assert.ok(
    buffState.f1.donoSpeedTime > 1.7 && buffState.f1.donoSpeedTime <= DONO_MARYJUANA_DURATION,
    `Expected ~2.0s donoSpeedTime, got ${buffState.f1.donoSpeedTime}`
  );
  assert.ok(buffState.visualEffects.some((fx) => fx.kind === 'dono_maryjuana_cloud'));

  const startBuffX = buffState.f1.x;
  advanceFrames(buffState, 30, () => ({ ...createEmptyInput(), right: true }));
  const buffDeltaX = buffState.f1.x - startBuffX;
  const ratio = buffDeltaX / baseDeltaX;
  assert.ok(
    Math.abs(ratio - DONO_MARYJUANA_SPEED_MULTIPLIER) < 0.05,
    `Expected 1.5x walk speed ratio, got ${ratio.toFixed(3)} (${buffDeltaX.toFixed(2)} vs ${baseDeltaX.toFixed(2)})`
  );

  // Recasting while active refreshes duration cleanly without stacking speed (>1.5x)
  buffState.f1.energy = 100;
  stepMatch(buffState, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(buffState, 26);
  const startRecastX = buffState.f1.x;
  advanceFrames(buffState, 30, () => ({ ...createEmptyInput(), right: true }));
  const recastDeltaX = buffState.f1.x - startRecastX;
  assert.ok(
    Math.abs(recastDeltaX - buffDeltaX) < 1.5,
    `Speed boost must not stack multiplicatively (${recastDeltaX.toFixed(2)} vs ${buffDeltaX.toFixed(2)})`
  );

  // Advance past 2.0s -> speed expires cleanly back to 1.0x
  advanceFrames(buffState, 105);
  assert.equal(buffState.f1.donoSpeedTime, 0);
  const postExpireStartX = buffState.f1.x;
  advanceFrames(buffState, 30, () => ({ ...createEmptyInput(), left: true }));
  const postExpireDeltaX = postExpireStartX - buffState.f1.x;
  assert.ok(
    Math.abs(postExpireDeltaX - baseDeltaX) < 1.5,
    `Expected speed to revert to 1.0x after 2.0s (${postExpireDeltaX.toFixed(2)} vs ${baseDeltaX.toFixed(2)})`
  );
});

test('Dono round reset restores 5/5 ammo and clears timers cleanly and match end enters centered victory', () => {
  const state = createMatchState('dono', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.donoAmmo = 0;
  state.f1.donoReloadTimer = 0.7;
  state.f1.donoCamoTime = 1.2;
  state.f1.donoSpeedTime = 1.5;

  // Win Round 1 -> advance to Round 2
  state.f2.hp = 1;
  state.f1.x = 180;
  state.f2.x = 204;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 230);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.roundPhase, 'fighting');
  assert.equal(state.f1.donoAmmo, DONO_MAX_AMMO);
  assert.equal(state.f1.donoReloadTimer, 0);
  assert.equal(state.f1.donoCamoTime, 0);
  assert.equal(state.f1.donoSpeedTime, 0);

  // Win Round 2 -> centered victory pose with victory sequence
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
  assert.equal(resolveDonoFrame(state.f1, 0.5).sequence.key, 'dono_victory');
});
