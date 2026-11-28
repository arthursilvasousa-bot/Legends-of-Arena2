import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAiInputs,
  createEmptyInput,
  createMatchState,
  stepMatch,
} from './combatEngine';
import {
  ARENA_LIST,
  CHARACTER_LIST,
  GROUND_Y,
  STAGE_LEFT_BOUND,
  STAGE_RIGHT_BOUND,
  STAGE_WIDTH,
} from './roster';
import fs from 'node:fs';
import path from 'node:path';

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

test('roster contains 12 characters with 4 specials each and 6 unique arenas including Favela — Vida Loka', () => {
  assert.equal(CHARACTER_LIST.length, 12);
  assert.equal(ARENA_LIST.length, 6);
  const arenaIds = new Set(ARENA_LIST.map((a) => a.id));
  assert.equal(arenaIds.size, 6);
  assert.ok(!arenaIds.has('realm_of_dead' as never));
  const shadowTemple = ARENA_LIST.find((a) => a.id === 'shadow_temple');
  assert.ok(shadowTemple);
  assert.equal(shadowTemple.name, 'Templo das Sombras');

  const favelaArena = ARENA_LIST.find((a) => a.id === 'favela_vida_loka');
  assert.ok(favelaArena);
  assert.equal(favelaArena.name, 'Favela — Vida Loka');
  const favelaLayers: [string, number, number][] = [
    ['/assets/arenas/favela_far.png', 520, 270],
    ['/assets/arenas/favela_hills.png', 520, 270],
    ['/assets/arenas/favela_mid.png', 520, 270],
    ['/assets/arenas/favela_floor.png', 540, 72],
    ['/assets/arenas/favela_heli.png', 84, 30],
    ['/assets/arenas/favela_flag_l.png', 46, 56],
    ['/assets/arenas/favela_flag_c.png', 92, 66],
    ['/assets/arenas/favela_flag_r.png', 60, 112],
  ];
  for (const [rel, expectedW, expectedH] of favelaLayers) {
    const p = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
    assert.ok(fs.existsSync(p), `Missing Favela layer ${p}`);
    const hdr = fs.readFileSync(p).subarray(0, 24);
    assert.equal(hdr.readUInt32BE(16), expectedW, `Unexpected width for ${rel}`);
    assert.equal(hdr.readUInt32BE(20), expectedH, `Unexpected height for ${rel}`);
  }

  const shadowLayers = [
    '/assets/arenas/shadow_temple_far.png',
    '/assets/arenas/shadow_temple_mid.png',
    '/assets/arenas/shadow_temple_floor.png',
    '/assets/arenas/shadow_temple_banner_l.png',
    '/assets/arenas/shadow_temple_banner_r.png',
    '/assets/arenas/shadow_temple_chain_l.png',
    '/assets/arenas/shadow_temple_chain_r.png',
  ];
  for (const rel of shadowLayers) {
    const p = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
    assert.ok(fs.existsSync(p), `Missing Templo das Sombras layer ${p}`);
  }

  const trollLands = ARENA_LIST.find((a) => a.id === 'troll_lands');
  assert.ok(trollLands);
  assert.equal(trollLands.name, 'Terra dos Trolls');

  const trollLayers: [string, number, number][] = [
    ['/assets/arenas/troll_lands_far.png', 520, 270],
    ['/assets/arenas/troll_lands_mid.png', 520, 270],
    ['/assets/arenas/troll_lands_floor.png', 540, 72],
    ['/assets/arenas/troll_lands_troll_body.png', 144, 104],
    ['/assets/arenas/troll_lands_troll_head.png', 64, 64],
    ['/assets/arenas/troll_lands_banner_l.png', 30, 58],
    ['/assets/arenas/troll_lands_banner_m.png', 52, 32],
    ['/assets/arenas/troll_lands_banner_r.png', 30, 58],
  ];
  for (const [rel, expectedW, expectedH] of trollLayers) {
    const p = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
    assert.ok(fs.existsSync(p), `Missing Terra dos Trolls layer ${p}`);
    const hdr = fs.readFileSync(p).subarray(0, 24);
    assert.equal(hdr.readUInt32BE(16), expectedW, `Unexpected width for ${rel}`);
    assert.equal(hdr.readUInt32BE(20), expectedH, `Unexpected height for ${rel}`);
  }

  const minotaurColiseum = ARENA_LIST.find((a) => a.id === 'minotaur_coliseum');
  assert.ok(minotaurColiseum);
  assert.equal(minotaurColiseum.name, 'Coliseu dos Minotauros');

  const minotaurLayers: [string, number, number][] = [
    ['/assets/arenas/minotaur_coliseum_far.png', 520, 270],
    ['/assets/arenas/minotaur_coliseum_mid.png', 520, 270],
    ['/assets/arenas/minotaur_coliseum_floor.png', 540, 72],
    ['/assets/arenas/minotaur_coliseum_banner_c.png', 38, 80],
    ['/assets/arenas/minotaur_coliseum_chain_l.png', 11, 83],
    ['/assets/arenas/minotaur_coliseum_chain_r.png', 11, 83],
  ];
  for (const [rel, expectedW, expectedH] of minotaurLayers) {
    const p = path.join(process.cwd(), 'public', rel.replace(/^\//, ''));
    assert.ok(fs.existsSync(p), `Missing Coliseu dos Minotauros layer ${p}`);
    const hdr = fs.readFileSync(p).subarray(0, 24);
    assert.equal(hdr.readUInt32BE(16), expectedW, `Unexpected width for ${rel}`);
    assert.equal(hdr.readUInt32BE(20), expectedH, `Unexpected height for ${rel}`);
  }

  for (const ch of CHARACTER_LIST) {
    assert.ok(ch.specials.special1);
    assert.ok(ch.specials.special2);
    assert.ok(ch.specials.special3);
    assert.ok(ch.specials.special4);
  }
});

test('movement, jumping, gravity, and stage boundaries work deterministically', () => {
  const state = createMatchState('ninja', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  const startX = state.f1.x;

  // Walk left toward boundary
  advanceFrames(state, 180, () => ({ ...createEmptyInput(), left: true }));
  assert.ok(state.f1.x < startX);
  assert.ok(state.f1.x >= STAGE_LEFT_BOUND);

  // Walk right toward P2 / right boundary
  state.f1.x = 420;
  state.f2.x = 120;
  advanceFrames(state, 90, () => ({ ...createEmptyInput(), right: true }));
  assert.ok(state.f1.x <= STAGE_RIGHT_BOUND);

  // Jump and land back on GROUND_Y
  stepMatch(state, { ...createEmptyInput(), up: true }, createEmptyInput(), 1 / 60);
  assert.ok(state.f1.y < GROUND_Y);
  advanceFrames(state, 90);
  assert.equal(state.f1.y, GROUND_Y);
});

test('punch and kick connect in range, deal damage, and build combos', () => {
  const state = createMatchState('ninja', 'troll', 'troll_lands', 'versus', 'normal', true);
  state.f1.x = 200;
  state.f2.x = 224;
  const initialHp = state.f2.hp;

  // Punch
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 8);
  assert.ok(state.f2.hp < initialHp, 'Punch should deal damage');

  // Chain into kick while opponent is in hitstun
  const hpAfterPunch = state.f2.hp;
  stepMatch(state, { ...createEmptyInput(), kickPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 20);
  assert.ok(state.f2.hp < hpAfterPunch, 'Kick should deal damage');
  assert.ok(state.f1.maxComboAchieved >= 2, 'Chained hit should count as a 2+ hit combo');
});

test('blocking reduces damage and grabs bypass blocking', () => {
  const state = createMatchState('minotaur', 'priest', 'minotaur_coliseum', 'versus', 'normal', true);
  state.f1.x = 200;
  state.f2.x = 226;

  const hpBeforeBlockedKick = state.f2.hp;
  stepMatch(
    state,
    { ...createEmptyInput(), kickPressed: true },
    { ...createEmptyInput(), block: true },
    1 / 60
  );
  advanceFrames(state, 30, undefined, () => ({ ...createEmptyInput(), block: true }));
  const blockedDmg = hpBeforeBlockedKick - state.f2.hp;
  assert.ok(blockedDmg > 0 && blockedDmg <= 15, `Blocked kick should deal chip damage only, got ${blockedDmg}`);

  // Grab while P2 is blocking at close range
  state.f1.x = 200;
  state.f2.x = 226;
  const hpBeforeGrab = state.f2.hp;
  stepMatch(
    state,
    { ...createEmptyInput(), grabPressed: true },
    { ...createEmptyInput(), block: true },
    1 / 60
  );
  advanceFrames(state, 40, undefined, () => ({ ...createEmptyInput(), block: true }));
  const grabDmg = hpBeforeGrab - state.f2.hp;
  assert.ok(grabDmg >= 80, `Grab should bypass block and deal full throw damage, got ${grabDmg}`);
});

test('character specials apply unique effects (Ninja teleport, Elf freeze, Priest shield, Troll fury, Necromancer root)', () => {
  // Ninja teleport behind opponent
  const ninjaState = createMatchState('ninja', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  ninjaState.f1.x = 120;
  ninjaState.f2.x = 320;
  stepMatch(ninjaState, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(ninjaState, 20);
  assert.ok(ninjaState.f1.x > ninjaState.f2.x, 'Ninja should teleport behind P2');

  // Elf freezing arrow slows opponent
  const elfState = createMatchState('elf', 'troll', 'elven_forest', 'versus', 'normal', true);
  elfState.f1.x = 120;
  elfState.f2.x = 240;
  stepMatch(elfState, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(elfState, 50);
  assert.ok(elfState.f2.slowTime > 0, 'Ice arrow should apply slowTime to opponent');

  // Priest Sacred Shield reduces incoming damage
  const priestState = createMatchState('priest', 'troll', 'celestial_cathedral', 'versus', 'normal', true);
  stepMatch(priestState, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(priestState, 18);
  assert.ok(priestState.f1.shieldTime > 3, 'Sacred Shield should activate');

  // Troll Fury increases speed & damage
  const trollState = createMatchState('troll', 'elf', 'troll_lands', 'versus', 'normal', true);
  stepMatch(trollState, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(trollState, 18);
  assert.ok(trollState.f1.furyTime > 5, 'Troll Fury buff should activate');

  // Necromancer Underworld Hands roots opponent
  const necroState = createMatchState('necromancer', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  necroState.f1.x = 140;
  necroState.f2.x = 300;
  stepMatch(necroState, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(necroState, 40);
  assert.ok(necroState.f2.rootTime > 0, 'Underworld Hands should root opponent');
});

test('best-of-3 round progression keeps Round 1 in idle and triggers centered victory pose on match end for all 6 characters', () => {
  const state = createMatchState('ninja', 'elf', 'shadow_temple', 'versus', 'normal', true);
  // Round 1 KO -> winner stays in idle, not victory
  state.f2.hp = 1;
  state.f1.x = 200;
  state.f2.x = 222;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 15);
  assert.equal(state.f1.roundsWon, 1);
  assert.equal(state.roundPhase, 'round_end');
  assert.equal(state.f1.action, 'idle');

  // Advance through round_end and round 2 intro
  advanceFrames(state, 220);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.roundPhase, 'fighting');

  // Round 2 KO -> triggers finisher -> centered victory -> match_over
  state.f2.hp = 1;
  state.f1.x = 200;
  state.f2.x = 222;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 15);
  assert.equal(state.f1.roundsWon, 2);
  assert.equal(state.roundPhase, 'finisher');
  assert.equal(state.winnerSlot, 1);
  assert.equal(state.f1.action, 'victory');
  assert.equal(state.f1.x, STAGE_WIDTH / 2);
  assert.equal(state.f1.y, GROUND_Y);
  assert.equal(state.f1.facing, 1);

  advanceFrames(state, 170);
  assert.equal(state.roundPhase, 'match_over');

  // Verify every character enters centered 'victory' with particles/FX on match-ending KO and final-round timeout
  for (const ch of CHARACTER_LIST) {
    const koMatch = createMatchState(ch.id, 'ninja', 'shadow_temple', 'versus', 'normal', true);
    koMatch.f1.roundsWon = 1;
    koMatch.f2.hp = 1;
    koMatch.f1.x = 160;
    koMatch.f2.x = 182;
    stepMatch(koMatch, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(koMatch, 15);
    assert.equal(koMatch.roundPhase, 'finisher', `${ch.id} KO match end should enter finisher`);
    assert.equal(koMatch.f1.action, 'victory', `${ch.id} should enter victory action on KO match end`);
    assert.equal(koMatch.f1.x, STAGE_WIDTH / 2, `${ch.id} victory must center horizontally`);
    assert.equal(koMatch.f1.y, GROUND_Y, `${ch.id} victory must sit on ground`);
    assert.equal(koMatch.f1.facing, 1, `${ch.id} victory must face right`);
    assert.ok(koMatch.particles.length > 0, `${ch.id} victory should spawn particles`);

    // Final-round timeout victory
    const timeoutMatch = createMatchState(ch.id, 'troll', 'shadow_temple', 'versus', 'normal', true);
    timeoutMatch.f1.roundsWon = 1;
    timeoutMatch.f1.hp = 900;
    timeoutMatch.f2.hp = 200;
    timeoutMatch.roundTimeLeft = 0.01;
    stepMatch(timeoutMatch, createEmptyInput(), createEmptyInput(), 1 / 60);
    assert.equal(timeoutMatch.roundPhase, 'finisher', `${ch.id} timeout match end should enter finisher`);
    assert.equal(timeoutMatch.f1.action, 'victory', `${ch.id} should enter victory action on timeout match end`);
    assert.equal(timeoutMatch.f1.x, STAGE_WIDTH / 2);
    assert.equal(timeoutMatch.f1.y, GROUND_Y);
    assert.equal(timeoutMatch.f1.facing, 1);
  }
});

test('timeout resolves winner by remaining HP percentage and AI computes valid inputs', () => {
  const state = createMatchState('priest', 'necromancer', 'celestial_cathedral', 'arcade', 'hard', true);
  state.f1.hp = 800;
  state.f2.hp = 300;
  state.roundTimeLeft = 0.01;
  const aiInput = computeAiInputs(state, 1 / 60);
  assert.equal(typeof aiInput.left, 'boolean');
  stepMatch(state, createEmptyInput(), aiInput, 1 / 60);
  assert.equal(state.f1.roundsWon, 1);
});

test('Jaylon Special 1 (Lança Casco de Cerveja) throws bottle projectile that stuns opponent for 0.6s unless blocked', () => {
  // Unblocked hit -> stuns for 0.6s with bottle impact & stars FX
  const state = createMatchState('jaylon', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 120;
  state.f2.x = 240;
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1');

  advanceFrames(state, 16);
  assert.ok(state.projectiles.some((p) => p.kind === 'beer_bottle'), 'Should spawn beer_bottle projectile');

  advanceFrames(state, 30);
  assert.ok(state.f2.hp < hpBefore, 'Bottle projectile should deal damage');
  assert.ok(state.f2.stunTime > 0 && state.f2.stunTime <= 0.6, `Opponent should be stunned for ~0.6s (got ${state.f2.stunTime})`);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_jaylon_bottle_impact'));
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_jaylon_stun_stars'));

  // While stunned, opponent input is ignored
  const stunnedX = state.f2.x;
  stepMatch(state, createEmptyInput(), { ...createEmptyInput(), right: true }, 1 / 60);
  assert.notEqual(state.f2.action, 'walk', 'Stunned opponent must not be able to walk');
  assert.ok(Math.abs(state.f2.x - stunnedX) <= 3);

  // Blocked hit -> chip damage, NO stun
  const blockState = createMatchState('jaylon', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  blockState.f1.x = 120;
  blockState.f2.x = 240;
  blockState.f1.energy = 100;
  stepMatch(blockState, { ...createEmptyInput(), special1Pressed: true }, { ...createEmptyInput(), block: true }, 1 / 60);
  advanceFrames(blockState, 46, undefined, () => ({ ...createEmptyInput(), block: true }));
  assert.equal(blockState.f2.stunTime, 0, 'Blocked beer bottle should not stun opponent');
});

test('Jaylon Special 2 (Ressaca Braba) vomits stream, places puddle ahead of Jaylon, and makes opponent slip', () => {
  const state = createMatchState('jaylon', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 140;
  state.f2.x = 190;
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special2');

  advanceFrames(state, 20);
  assert.ok(state.f2.hp < hpBefore, 'Vomit stream should damage opponent in front');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_jaylon_vomit_stream'));

  const puddle = state.hazards.find((h) => h.kind === 'vomit_puddle');
  assert.ok(puddle, 'Should spawn persistent vomit_puddle hazard');
  assert.ok(
    Math.abs(puddle.x - state.f1.x) >= 48,
    `Jaylon must NOT stand on top of vomit puddle (jaylon=${state.f1.x}, puddle=${puddle.x})`
  );

  // Wait out initial stream/slip recovery + puddle slipCooldown (0.85s), then walk P2 onto puddle from outside -> slips & loses control
  advanceFrames(state, 65);
  state.f2.x = puddle.x + 12;
  state.f2.y = GROUND_Y;
  stepMatch(state, createEmptyInput(), { ...createEmptyInput(), left: true }, 1 / 60);
  assert.ok(state.f2.slipTime > 0.5, 'Opponent stepping on vomit puddle should slip');
  assert.ok(Math.abs(state.f2.vx) > 0, 'Slipping opponent should slide');
  assert.equal(state.f2.action, 'hitstun');
  // Control loss while slipping: walk input is ignored
  stepMatch(state, createEmptyInput(), { ...createEmptyInput(), right: true }, 1 / 60);
  assert.equal(state.f2.action, 'hitstun');
});

test('Jaylon Special 3 (Gole na Cerveja) requires 25 energy, heals 25% maxHp capped at maxHp, and stuns Jaylon for 1s', () => {
  const noEnergyState = createMatchState('jaylon', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  noEnergyState.f1.energy = 24;
  noEnergyState.f1.hp = 500;
  stepMatch(noEnergyState, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  assert.notEqual(noEnergyState.f1.action, 'special3', 'Cannot cast Gole na Cerveja with < 25 energy');

  const state = createMatchState('jaylon', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.energy = 40;
  state.f1.hp = Math.round(state.f1.maxHp * 0.6); // 60% HP -> +25% = 85% HP

  stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special3');
  assert.ok(Math.abs(state.f1.energy - 15) < 0.25, `Should deduct ~25 energy immediately (got ${state.f1.energy})`);

  // Mid-move heals +25% maxHp
  advanceFrames(state, 18);
  assert.equal(state.f1.hp, Math.round(state.f1.maxHp * 0.6) + Math.round(state.f1.maxHp * 0.25));

  // Wait for drink move (~0.58s total) to finish -> triggers 1.0s self-stun
  advanceFrames(state, 24);
  assert.equal(state.f1.action, 'stun', 'Jaylon should enter stun animation after drinking');
  assert.ok(state.f1.stunTime > 0.8 && state.f1.stunTime <= 1.0, `Jaylon should be stunned ~1.0s (got ${state.f1.stunTime})`);

  // Verify cap at maxHp when healing near full HP
  const capState = createMatchState('jaylon', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  capState.f1.energy = 100;
  capState.f1.hp = capState.f1.maxHp - 30;
  stepMatch(capState, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(capState, 22);
  assert.equal(capState.f1.hp, capState.f1.maxHp, 'Healing must never exceed maxHp');
});

test('Jaylon Special 4 (Malboro) releases cigarette smoke and breathes frontal fire damaging enemies', () => {
  const state = createMatchState('jaylon', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 160;
  state.f2.x = 225; // in frontal fire range
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special4');

  advanceFrames(state, 8);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_jaylon_smoke'), 'Should spawn rising cigarette smoke');

  advanceFrames(state, 18);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_jaylon_fire_breath'), 'Should spawn frontal fire breath');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'fx_jaylon_fire_burst'), 'Should spawn fire burst impact on hit');
  assert.ok(state.f2.hp < hpBefore, 'Frontal fire breath should damage enemy');
});

test('Tesla Special 1 (Bola Elétrica) fires electric ball, locks enemy specials for 5s without blocking normals/movement, then unlocks', () => {
  const state = createMatchState('tesla', 'ninja', 'celestial_cathedral', 'versus', 'normal', true);
  state.f1.x = 120;
  state.f2.x = 230;
  state.f1.energy = 100;
  state.f2.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1');
  advanceFrames(state, 16);
  assert.ok(state.projectiles.some((p) => p.kind === 'electric_ball'), 'Should spawn electric_ball projectile');

  advanceFrames(state, 28);
  assert.ok(state.f2.hp < hpBefore, 'Electric ball should deal damage');
  assert.ok(
    state.f2.specialLockTime > 4.2 && state.f2.specialLockTime <= 5.0,
    `Target should have ~5s special lock (got ${state.f2.specialLockTime})`
  );
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'tesla_special1_impact'), 'Should spawn electric impact FX');

  // Wait for hitstun to clear while target is still locked
  advanceFrames(state, 26);
  assert.ok(state.f2.specialLockTime > 3.5);

  // Target CANNOT cast any special (1-4) while locked
  for (const key of ['special1Pressed', 'special2Pressed', 'special3Pressed', 'special4Pressed'] as const) {
    stepMatch(state, createEmptyInput(), { ...createEmptyInput(), [key]: true }, 1 / 60);
    assert.ok(
      !['special1', 'special2', 'special3', 'special4'].includes(state.f2.action),
      `${key} must remain blocked during specialLockTime`
    );
  }

  // Target CAN still punch, walk, jump, and block normally while locked!
  stepMatch(state, createEmptyInput(), { ...createEmptyInput(), punchPressed: true }, 1 / 60);
  assert.equal(state.f2.action, 'punch', 'Normal punch must work while specials are locked');
  advanceFrames(state, 25);
  const preWalkX = state.f2.x;
  advanceFrames(state, 10, undefined, () => ({ ...createEmptyInput(), left: true }));
  assert.ok(state.f2.x < preWalkX, 'Movement must work while specials are locked');

  // Meanwhile Tesla himself can still cast Special 1 once his own short cooldown finishes
  advanceFrames(state, 35);
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1', 'Tesla should still cast Special 1 independently of enemy lock');

  // Advance >5.0s until refreshed lock expires -> enemy specials work again
  advanceFrames(state, 340);
  assert.equal(state.f2.specialLockTime, 0);
  stepMatch(state, createEmptyInput(), { ...createEmptyInput(), special1Pressed: true }, 1 / 60);
  assert.equal(state.f2.action, 'special1', 'Enemy specials must unlock after 5 seconds');
});

test('Tesla Special 2 (Teleporte Elétrico + Soco) teleports behind enemy cleanly from both sides without overlap and knocks far away', () => {
  for (const [teslaX, oppX, oppFacing] of [
    [120, 310, -1],
    [350, 160, 1],
    [160, 446, -1], // near right wall edge case
  ] as const) {
    const state = createMatchState('tesla', 'minotaur', 'celestial_cathedral', 'versus', 'normal', true);
    state.f1.x = teslaX;
    state.f2.x = oppX;
    state.f2.facing = oppFacing;
    state.f1.energy = 100;
    const hpBefore = state.f2.hp;

    stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
    assert.equal(state.f1.action, 'special2');

    // Advance past 0.30s startup into active punch window
    advanceFrames(state, 21);
    assert.ok(state.f1.x >= STAGE_LEFT_BOUND && state.f1.x <= STAGE_RIGHT_BOUND, 'Tesla must stay inside arena');
    assert.ok(Math.abs(state.f1.x - state.f2.x) >= 24, `Tesla must not overlap opponent (dist=${Math.abs(state.f1.x - state.f2.x)})`);
    assert.equal(state.f1.facing, state.f2.x >= state.f1.x ? 1 : -1, 'Tesla must face opponent after teleport');

    // Advance punch impact & heavy knockback
    advanceFrames(state, 18);
    assert.ok(state.f2.hp < hpBefore, 'Electric punch after teleport should deal damage');
    assert.ok(
      state.visualEffects.some((fx) => fx.kind === 'tesla_special2_knockback'),
      'Should spawn tesla_special2_knockback FX'
    );
    assert.ok(Math.abs(state.f2.x - oppX) > 25 || state.f2.y < GROUND_Y, 'Opponent should be knocked back');
  }
});

test('Tesla Special 3 (Feixe de Eletricidade) hits across remaining stage and actively reflects enemy projectiles back without hurting Tesla', () => {
  const state = createMatchState('tesla', 'elf', 'celestial_cathedral', 'versus', 'normal', true);
  state.f1.x = 70;
  state.f2.x = 415; // across nearly entire arena width!
  state.f1.energy = 100;
  state.f2.energy = 100;
  const teslaHpBefore = state.f1.hp;
  const elfHpBefore = state.f2.hp;

  // Elf fires an arrow toward Tesla
  stepMatch(state, createEmptyInput(), { ...createEmptyInput(), special1Pressed: true }, 1 / 60);
  advanceFrames(state, 12);
  const arrow = state.projectiles.find((p) => p.kind === 'fire_arrow');
  assert.ok(arrow, 'Elf should have fired fire_arrow');
  assert.equal(arrow.ownerSlot, 2);

  // Tesla activates Feixe de Eletricidade
  stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 18);

  // Reflected arrow belongs to slot 1, reverses velocity toward Elf, and spawns reflection FX
  assert.ok(
    state.visualEffects.some((fx) => fx.kind === 'tesla_special3_reflection'),
    'Beam should spawn projectile reflection FX'
  );
  assert.equal(state.f1.hp, teslaHpBefore, 'Reflected projectile and beam must never damage Tesla');
  assert.ok(state.f2.hp < elfHpBefore, 'Beam and/or reflected projectile must damage Elf across full remaining stage');
});

test('Tesla Special 4 (Gaiola Elétrica) traps target, shocks on jump or excessive move (not micro idle), enforces 2/round limit, and resets on Round 2', () => {
  // Micro idle/tiny jitter inside cage does NOT continuously damage target
  const idleState = createMatchState('tesla', 'ninja', 'celestial_cathedral', 'versus', 'normal', true);
  idleState.f1.x = 140;
  idleState.f2.x = 260;
  idleState.f1.energy = 100;
  stepMatch(idleState, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(idleState.f1.cageUsesThisRound, 1);
  advanceFrames(idleState, 16);
  const cage = idleState.hazards.find((h) => h.kind === 'electric_cage');
  assert.ok(cage, 'Gaiola Elétrica hazard should spawn around opponent');
  const hpAfterTrap = idleState.f2.hp;
  advanceFrames(idleState, 40); // standing still inside cage
  assert.equal(idleState.f2.hp, hpAfterTrap, 'Standing still inside cage must not shock');

  // Trying to jump OR moving excessively inside cage keeps trapped horizontally and deals electric shock damage
  const hpBeforeShock = idleState.f2.hp;
  stepMatch(idleState, createEmptyInput(), { ...createEmptyInput(), up: true }, 1 / 60);
  advanceFrames(idleState, 10);
  assert.ok(idleState.f2.hp < hpBeforeShock, 'Jumping inside Gaiola Elétrica should deal electric shock damage');
  assert.ok(idleState.visualEffects.some((fx) => fx.kind === 'tesla_special4_electric_damage'));

  // Moving relentlessly toward cage wall keeps enemy horizontally confined
  const hpBeforeMoveShock = idleState.f2.hp;
  advanceFrames(idleState, 50, undefined, () => ({ ...createEmptyInput(), right: true }));
  assert.ok(Math.abs(idleState.f2.x - cage.x) <= cage.width / 2, 'Cage must keep target trapped horizontally');
  assert.ok(idleState.f2.hp < hpBeforeMoveShock, 'Excessive movement inside cage should trigger shock');

  // After cage expires (>3.4s), target can freely leave
  advanceFrames(idleState, 190);
  assert.equal(idleState.hazards.filter((h) => h.kind === 'electric_cage').length, 0);

  // Use #2 succeeds; Attempt #3 in same round is BLOCKED!
  idleState.f1.energy = 100;
  stepMatch(idleState, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(idleState.f1.action, 'special4');
  assert.equal(idleState.f1.cageUsesThisRound, 2);
  advanceFrames(idleState, 45);
  idleState.f1.energy = 100;
  stepMatch(idleState, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
  assert.notEqual(idleState.f1.action, 'special4', '3rd Gaiola Elétrica attempt in same round must be blocked');
  assert.equal(idleState.f1.cageUsesThisRound, 2);

  // Winning Round 1 -> Round 2 resets cageUsesThisRound to 0 (test both versus & arcade)
  for (const mode of ['versus', 'arcade'] as const) {
    const roundMatch = createMatchState('tesla', 'minotaur', 'celestial_cathedral', mode, 'normal', true);
    roundMatch.f1.cageUsesThisRound = 2;
    roundMatch.f2.hp = 1;
    roundMatch.f1.x = 180;
    roundMatch.f2.x = 204;
    stepMatch(roundMatch, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
    advanceFrames(roundMatch, 230);
    assert.equal(roundMatch.roundNumber, 2);
    assert.equal(roundMatch.roundPhase, 'fighting');
    assert.equal(roundMatch.f1.cageUsesThisRound, 0, `${mode} Round 2 must reset Gaiola Elétrica counter to 0/2`);
    roundMatch.f1.energy = 100;
    stepMatch(roundMatch, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
    assert.equal(roundMatch.f1.action, 'special4', `${mode} Round 2 should allow Gaiola Elétrica again`);
  }
});

test('Beelzebu normal combos, air attacks, and individual special cooldowns work cleanly', () => {
  const state = createMatchState('beelzebu', 'minotaur', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 180;
  state.f2.x = 208;
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  // Punch -> Heavy Punch combo cancel
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 10);
  assert.ok(state.f2.hp < hpBefore, 'Beelzebu jab should damage opponent');
  const hpAfterJab = state.f2.hp;
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'heavy_punch', 'Jab hit should chain into heavy_punch');
  advanceFrames(state, 16);
  assert.ok(state.f2.hp < hpAfterJab, 'Beelzebu heavy_punch should damage opponent');

  // Air punch uses jump_attack kind
  advanceFrames(state, 30);
  stepMatch(state, { ...createEmptyInput(), up: true }, createEmptyInput(), 1 / 60);
  advanceFrames(state, 8);
  stepMatch(state, { ...createEmptyInput(), punchPressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'air_kick');
  assert.equal(state.f1.airAttackKind, 'punch');

  // Land on ground -> triggers landing state briefly
  advanceFrames(state, 65);
  assert.equal(state.f1.y, GROUND_Y);

  // Per-special cooldown prevents immediate spam of special2 while special1 remains castable
  state.f1.energy = 100;
  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special2');
  assert.ok(state.f1.specialCooldowns.special2 > 1.0, 'Veneno Mortal should start cooldown');
  advanceFrames(state, 38);
  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.notEqual(state.f1.action, 'special2', 'Veneno Mortal must stay on cooldown immediately after recovery');
  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1', 'Malboro must stay independently castable while Veneno Mortal cools down');
});

test('Beelzebu Special 1 (Malboro) releases finite toxic cloud that deals periodic damage and applies poison DOT', () => {
  const state = createMatchState('beelzebu', 'ninja', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 140;
  state.f2.x = 195;
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special1Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special1');
  advanceFrames(state, 16);

  const cloud = state.hazards.find((h) => h.kind === 'toxic_cloud');
  assert.ok(cloud, 'Malboro should spawn toxic_cloud hazard');

  // Wait for cloud tick & poison application
  advanceFrames(state, 45);
  assert.ok(state.f2.hp < hpBefore, 'Malboro cloud should damage enemy');
  assert.ok(state.f2.poisonTime > 2.0, `Malboro cloud should poison opponent (got ${state.f2.poisonTime})`);
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'beelzebu_malboro_impact'));

  // Move opponent away from cloud and verify poison DOT ticks cleanly and eventually expires
  state.f2.x = 430;
  const hpAfterPoison = state.f2.hp;
  advanceFrames(state, 70);
  assert.ok(state.f2.hp < hpAfterPoison, 'Poison DOT should tick damage over time');

  // After cloud duration + poison duration expire, cloud disappears and poison clears
  advanceFrames(state, 220);
  assert.equal(state.hazards.filter((h) => h.kind === 'toxic_cloud').length, 0, 'Malboro cloud must dissipate');
  assert.equal(state.f2.poisonTime, 0, 'Poison status must expire cleanly');
});

test('Beelzebu Special 2 (Veneno Mortal) fires fast poison lance and poisons enemy', () => {
  const state = createMatchState('beelzebu', 'elf', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 100;
  state.f2.x = 310;
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special2Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special2');
  advanceFrames(state, 15);
  assert.ok(state.projectiles.some((p) => p.kind === 'poison_lance'), 'Should spawn poison_lance projectile');

  advanceFrames(state, 28);
  assert.ok(state.f2.hp < hpBefore, 'Veneno Mortal projectile should deal damage');
  assert.ok(state.f2.poisonTime > 2.5, 'Veneno Mortal should apply poison DOT');
  assert.ok(state.visualEffects.some((fx) => fx.kind === 'beelzebu_veneno_impact'));
});

test('Beelzebu Special 3 (Crânio Invocador) spawns 3 homing skulls that steer toward opponent with staggered impacts', () => {
  const state = createMatchState('beelzebu', 'troll', 'shadow_temple', 'versus', 'normal', true);
  state.f1.x = 110;
  state.f2.x = 340;
  state.f1.energy = 100;
  const hpBefore = state.f2.hp;

  stepMatch(state, { ...createEmptyInput(), special3Pressed: true }, createEmptyInput(), 1 / 60);
  assert.equal(state.f1.action, 'special3');
  advanceFrames(state, 16);

  const skulls = state.projectiles.filter((p) => p.kind === 'homing_skull');
  assert.equal(skulls.length, 3, 'Crânio Invocador should spawn 3 homing skulls');

  // Move opponent upward/backward slightly to verify homing steers cleanly toward target
  let sawCranioImpact = false;
  let prevSkullCount = state.projectiles.filter((p) => p.kind === 'homing_skull').length;
  for (let i = 0; i < 150; i++) {
    const p2In = i < 15 ? { ...createEmptyInput(), right: true } : createEmptyInput();
    stepMatch(state, createEmptyInput(), p2In, 1 / 60);
    if (state.visualEffects.some((fx) => fx.kind === 'beelzebu_cranio_impact')) {
      sawCranioImpact = true;
    }
    const currSkullCount = state.projectiles.filter((p) => p.kind === 'homing_skull').length;
    assert.ok(prevSkullCount - currSkullCount <= 1, 'Skulls must not explode on the exact same tick');
    prevSkullCount = currSkullCount;
  }

  assert.ok(state.f2.hp < hpBefore - 80, 'Homing skulls should track and deal multi-skull damage');
  assert.ok(sawCranioImpact, 'Should spawn beelzebu_cranio_impact FX on impact');
  assert.equal(state.projectiles.filter((p) => p.kind === 'homing_skull').length, 0, 'Impacted skulls must disappear');
});

test('Beelzebu Special 4 (Domínio das Sombras) confines opponent on either side, ticks interval damage, explodes, and releases target', () => {
  for (const [beelX, oppX] of [
    [130, 310],
    [350, 160],
  ] as const) {
    const state = createMatchState('beelzebu', 'ninja', 'shadow_temple', 'versus', 'normal', true);
    state.f1.x = beelX;
    state.f2.x = oppX;
    state.f1.energy = 100;
    const hpBefore = state.f2.hp;

    stepMatch(state, { ...createEmptyInput(), special4Pressed: true }, createEmptyInput(), 1 / 60);
    assert.equal(state.f1.action, 'special4');
    advanceFrames(state, 16);

    const domain = state.hazards.find((h) => h.kind === 'shadow_domain');
    assert.ok(domain, 'Should spawn shadow_domain hazard around opponent');

    //Wait past delay (0.25s) and try running out of domain -> target stays confined
    advanceFrames(state, 65, undefined, () => ({ ...createEmptyInput(), right: true }));
    assert.ok(Math.abs(state.f2.x - domain.x) <= domain.width * 0.45, 'Domínio das Sombras must confine enemy horizontally');
    assert.ok(state.f2.hp < hpBefore, 'Domínio das Sombras must deal periodic damage');

    // Advance until domain finishes (~2.2s active total) -> triggers final dark explosion and releases target
    advanceFrames(state, 95);
    assert.equal(state.hazards.filter((h) => h.kind === 'shadow_domain').length, 0, 'Domain must end cleanly');
    assert.ok(state.visualEffects.some((fx) => fx.kind === 'beelzebu_dominio_explosion'), 'Final dark explosion FX must play');
    assert.ok(state.f2.hp < hpBefore - 90, 'Domain ticks + final explosion should deal substantial damage');
  }
});


