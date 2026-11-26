import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ADAO_RENDER_SCALE,
  ADAO_SEQUENCES,
  ADAO_SPECIAL3_CHARGE_DURATION,
  ADAO_VICTORY_QUOTE,
  AdaoSequenceKey,
  mapActionToAdaoSequence,
  resolveAdaoFrame,
} from './adaoAnimator';
import { ADAO_PORTRAIT_FILE } from './adaoSpritesLoader';
import { createEmptyInput, createMatchState, stepMatch } from './combatEngine';
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

test('all 22 Adão sequences, manifest, and portrait exist on disk without Jaylon naming leaks', () => {
  const keys = Object.keys(ADAO_SEQUENCES) as AdaoSequenceKey[];
  assert.equal(keys.length, 22);

  const manifestPath = path.join(process.cwd(), 'public/characters/adao/manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'Missing adao manifest.json');
  const rawManifest = fs.readFileSync(manifestPath, 'utf8');
  assert.equal(rawManifest.toLowerCase().includes('jaylon'), false, 'Adão manifest must never reference Jaylon');
  const manifest = JSON.parse(rawManifest);
  const mAnims = manifest.animations ?? manifest.sequences;

  for (const k of keys) {
    const seq = ADAO_SEQUENCES[k];
    const mSeq = mAnims?.[k];
    assert.ok(mSeq, `Missing ${k} in adao manifest.json`);
    assert.equal(seq.frameCount, mSeq.frameCount, `${k} frameCount mismatch`);
    assert.equal(seq.frameWidth, mSeq.frameWidth, `${k} frameWidth mismatch`);
    assert.equal(seq.frameHeight, mSeq.frameHeight, `${k} frameHeight mismatch`);
    assert.equal(seq.anchorX, mSeq.anchorX, `${k} anchorX mismatch`);
    assert.equal(seq.anchorY, mSeq.anchorY, `${k} anchorY mismatch`);

    const stripPath = path.join(process.cwd(), 'public', seq.file.replace(/^\//, ''));
    assert.ok(fs.existsSync(stripPath), `Missing Adão sprite strip ${stripPath}`);

    const buf = fs.readFileSync(stripPath);
    const pngW = buf.readUInt32BE(16);
    const pngH = buf.readUInt32BE(20);
    assert.equal(pngW, seq.frameWidth * seq.frameCount, `${k} PNG width mismatch`);
    assert.equal(pngH, seq.frameHeight, `${k} PNG height mismatch`);
  }

  const portraitPath = path.join(process.cwd(), 'public', ADAO_PORTRAIT_FILE.replace(/^\//, ''));
  assert.ok(fs.existsSync(portraitPath), `Missing Adão portrait ${portraitPath}`);

  const adaoIdleH = ADAO_SEQUENCES.adao_idle.frameHeight * ADAO_RENDER_SCALE;
  const ninjaIdleH = NINJA_SEQUENCES.idle.frameHeight * NINJA_RENDER_SCALE;
  const trollIdleH = TROLL_SEQUENCES.idle.frameHeight * TROLL_RENDER_SCALE;
  assert.ok(
    adaoIdleH >= ninjaIdleH - 2 && adaoIdleH <= trollIdleH + 12,
    `Expected Adão height (${adaoIdleH.toFixed(1)}px) proportional to Ninja (${ninjaIdleH.toFixed(1)}px) & Troll (${trollIdleH.toFixed(1)}px)`
  );
});

test('Adão roster identity, victory quote, and action mappings match specification', () => {
  const adao = CHARACTERS.adao;
  assert.equal(adao.name, 'Adão');
  assert.equal(adao.playerName, '');
  assert.equal(adao.title, 'O Primeiro Homem');
  assert.equal(adao.victoryQuote, ADAO_VICTORY_QUOTE);
  assert.equal(adao.victoryQuote, 'Mágica? Não, odeio essa palavra. Isso é ciência!');
  assert.equal(JSON.stringify(adao).toLowerCase().includes('jaylon'), false);

  assert.equal(adao.specials.special1.name, 'Jabs de Meteoro');
  assert.equal(adao.specials.special2.name, 'Replicação Divina');
  assert.equal(adao.specials.special3.name, 'Time Transcending Fist');
  assert.equal(adao.specials.special4.name, 'Machado Divino');

  assert.equal(mapActionToAdaoSequence('idle'), 'adao_idle');
  assert.equal(mapActionToAdaoSequence('walk'), 'adao_walk');
  assert.equal(mapActionToAdaoSequence('run'), 'adao_run');
  assert.equal(mapActionToAdaoSequence('jump'), 'adao_jump');
  assert.equal(mapActionToAdaoSequence('block'), 'adao_guard');
  assert.equal(mapActionToAdaoSequence('crouch'), 'adao_crouch');
  assert.equal(mapActionToAdaoSequence('roll'), 'adao_evade');
  assert.equal(mapActionToAdaoSequence('punch'), 'adao_punch');
  assert.equal(mapActionToAdaoSequence('heavy_punch'), 'adao_heavy_punch');
  assert.equal(mapActionToAdaoSequence('kick'), 'adao_kick');
  assert.equal(mapActionToAdaoSequence('crouch_kick'), 'adao_low_kick');
  assert.equal(mapActionToAdaoSequence('heavy_kick'), 'adao_heavy_kick');
  assert.equal(mapActionToAdaoSequence('air_kick'), 'adao_high_kick');
  assert.equal(mapActionToAdaoSequence('hitstun'), 'adao_hit');
  assert.equal(mapActionToAdaoSequence('knockdown'), 'adao_knockdown');
  assert.equal(mapActionToAdaoSequence('getup'), 'adao_getup');
  assert.equal(mapActionToAdaoSequence('victory'), 'adao_victory');
  assert.equal(mapActionToAdaoSequence('special3', { chargingSpecial3: true }), 'adao_special3_charge');
  assert.equal(mapActionToAdaoSequence('special3', { chargingSpecial3: false }), 'adao_special3_blast');
});

test('Jabs de Meteoro and Machado Divino execute multi-hit advancing combos', () => {
  const s1 = createMatchState('adao', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  s1.f1.x = 180;
  s1.f2.x = 228;
  s1.f1.energy = 100;
  const hpBeforeS1 = s1.f2.hp;
  stepMatch(s1, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(s1.f1.action, 'special1');
  advanceFrames(s1, 35);
  assert.ok(s1.f2.hp < hpBeforeS1, 'Jabs de Meteoro must deal damage');
  assert.ok(s1.f1.totalDamageDealt >= 100, `Expected multi-hit barrage damage, got ${s1.f1.totalDamageDealt}`);

  const s4 = createMatchState('adao', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  s4.f1.x = 160;
  s4.f2.x = 225;
  s4.f1.energy = 100;
  const hpBeforeS4 = s4.f2.hp;
  stepMatch(s4, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(s4.f1.action, 'special4');
  advanceFrames(s4, 34);
  assert.ok(s4.f2.hp < hpBeforeS4, 'Machado Divino must deal multi-hit dash damage');
  assert.ok(s4.f1.x > 160, 'Machado Divino must advance forward like a dash');
});

test('Replicação Divina copies opponent ability once per round, executes it, and resets on Round 2', () => {
  const state = createMatchState('adao', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 140;
  state.f2.x = 320;
  state.f1.energy = 100;

  // Cast Special 2 to copy Ninja's signature skill
  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special2');
  advanceFrames(state, 40);

  assert.equal(state.f1.adaoCopiedUsedThisRound, true);
  assert.equal(state.f1.adaoCopiedCharacterId, 'ninja');
  assert.ok(state.f1.adaoCopiedSpecial, 'Adão must hold copied special move');
  assert.ok(state.f1.adaoCopiedSpecial!.name.startsWith('Replicação:'));

  // Subsequent Special 2 casts execute the copied shadow_blade projectile without re-copying
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 20);
  assert.ok(
    state.projectiles.some((p) => p.ownerSlot === 1 && p.kind === 'shadow_blade'),
    'Copied Special 2 must spawn Ninja shadow_blade projectile'
  );
  assert.equal(state.f1.adaoCopiedCharacterId, 'ninja');

  // Win Round 1 -> Round 2 resets copied state automatically
  state.f2.hp = 1;
  state.f1.x = 180;
  state.f2.x = 204;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 230);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.roundPhase, 'fighting');
  assert.equal(state.f1.adaoCopiedUsedThisRound, false);
  assert.equal(state.f1.adaoCopiedCharacterId, null);
  assert.equal(state.f1.adaoCopiedSpecial, null);
});

test('Time Transcending Fist requires immobile 2.0s hold, cancels early without firing, resists normal hits, bypasses block, and deals instant K.O.', () => {
  // 1. Releasing before 2.0s cancels without firing or spending energy
  const cancelState = createMatchState('adao', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  cancelState.f1.x = 180;
  cancelState.f2.x = 240;
  cancelState.f1.energy = 80;
  const oppStartHp = cancelState.f2.hp;

  stepMatch(cancelState, { ...createEmptyInput(), special3Pressed: true, special3Held: true }, createEmptyInput(), 1 / 60);
  assert.equal(cancelState.f1.adaoChargingSpecial3, true);
  const chargeStartX = cancelState.f1.x;

  // Hold for ~1.0s while trying to move -> remains completely immobile
  advanceFrames(cancelState, 60, () => ({ ...createEmptyInput(), special3Held: true, right: true, up: true }));
  assert.equal(cancelState.f1.adaoChargingSpecial3, true);
  assert.equal(cancelState.f1.x, chargeStartX, 'Adão must remain completely stationary while charging Special 3');
  assert.equal(cancelState.f1.y, GROUND_Y);

  // Release at ~1.0s (< 2.0s) -> cancels cleanly, does not spend energy, opponent untouched
  stepMatch(cancelState, { ...createEmptyInput(), special3Held: false }, createEmptyInput(), 1 / 60);
  assert.equal(cancelState.f1.adaoChargingSpecial3, false);
  assert.notEqual(cancelState.f1.currentMove?.kind, 'charged_ko_fist');
  assert.ok(cancelState.f1.energy >= 80, 'Early cancel must not spend Special 3 energy');
  assert.equal(cancelState.f2.hp, oppStartHp);

  // 2. Normal hit during charge deals damage WITHOUT interrupting charge, and full 2.0s hold fires unblockable instant K.O.
  const koState = createMatchState('adao', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  koState.f1.x = 180;
  koState.f2.x = 204;
  koState.f1.energy = 100;
  const adaoStartHp = koState.f1.hp;

  // Start holding Special 3 while opponent throws a normal punch
  stepMatch(
    koState,
    { ...createEmptyInput(), special3Pressed: true, special3Held: true },
    { ...createEmptyInput(), punchPressed: true },
    1 / 60
  );
  // Hold for 1.0s while opponent jabs once and then holds block
  advanceFrames(
    koState,
    60,
    () => ({ ...createEmptyInput(), special3Held: true }),
    () => ({ ...createEmptyInput(), block: true })
  );
  assert.ok(koState.f1.hp < adaoStartHp, 'Normal hit should still deal damage during charge');
  assert.equal(koState.f1.adaoChargingSpecial3, true, 'Normal hit must NOT interrupt Time Transcending Fist charge');

  // Continue holding past 2.0s while opponent holds block -> auto-fires once, bypasses block, instant K.O. (match-winning round)!
  koState.f1.roundsWon = 1;
  let fired = false;
  for (let i = 0; i < 80; i++) {
    stepMatch(
      koState,
      { ...createEmptyInput(), special3Held: true },
      { ...createEmptyInput(), block: true },
      1 / 60
    );
    if (koState.f1.currentMove?.kind === 'charged_ko_fist') fired = true;
    if (koState.f2.hp === 0) break;
  }

  assert.ok(fired, 'Holding Special 3 for 2.0s must auto-fire charged_ko_fist');
  assert.equal(koState.f1.adaoChargingSpecial3, false);
  assert.equal(koState.f1.adaoChargeCooldownLock, true, 'Must lock re-trigger until key is released');
  assert.equal(koState.f2.hp, 0, 'Time Transcending Fist must bypass block and cause instant K.O.');
  assert.equal(koState.roundPhase, 'finisher');
  assert.equal(koState.f1.action, 'victory');
  assert.equal(koState.f1.x, STAGE_WIDTH / 2);
  assert.equal(resolveAdaoFrame(koState.f1, 0.5).sequence.key, 'adao_victory');

  // Releasing key (after hitstop clears) unlocks adaoChargeCooldownLock cleanly
  advanceFrames(koState, 8, () => ({ ...createEmptyInput(), special3Held: false }));
  assert.equal(koState.f1.adaoChargeCooldownLock, false);
});
