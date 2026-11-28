import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ELVEN_BUTTERFLIES,
  ELVEN_GNOME_SPECS,
  computeElvenParallaxShifts,
  computeLanternFlicker,
  computeMushroomPulse,
  evaluateButterflyState,
  evaluateGnomeBehavior,
} from './elvenForestHelpers';

test('computeElvenParallaxShifts preserves depth order and clamps within layer padding', () => {
  const center = computeElvenParallaxShifts(0);
  assert.equal(Math.abs(center.farShift), 0);
  assert.equal(Math.abs(center.castleShift), 0);
  assert.equal(Math.abs(center.midShift), 0);
  assert.equal(Math.abs(center.floorShift), 0);

  const panRight = computeElvenParallaxShifts(60);
  assert.ok(Math.abs(panRight.farShift) < Math.abs(panRight.castleShift));
  assert.ok(Math.abs(panRight.castleShift) < Math.abs(panRight.midShift));
  assert.ok(Math.abs(panRight.midShift) <= Math.abs(panRight.floorShift));

  const extreme = computeElvenParallaxShifts(1000);
  assert.ok(extreme.farShift >= -18 && extreme.farShift <= 18);
  assert.ok(extreme.castleShift >= -19 && extreme.castleShift <= 19);
  assert.ok(extreme.midShift >= -20 && extreme.midShift <= 20);
  assert.ok(extreme.floorShift >= -30 && extreme.floorShift <= 30);
});

test('evaluateGnomeBehavior cycles through hidden, peeking, and fighter-tracking states', () => {
  assert.ok(ELVEN_GNOME_SPECS.length >= 4);

  const hiddenWatcher = ELVEN_GNOME_SPECS.find((g) => g.mode === 'watch_and_hide')!;
  const visValues: number[] = [];
  for (let t = 0; t < hiddenWatcher.cyclePeriod; t += 0.25) {
    const pose = evaluateGnomeBehavior(hiddenWatcher, t, 240);
    assert.ok(pose.visibility >= 0 && pose.visibility <= 1);
    assert.ok(pose.eyeOpen === 0 || pose.eyeOpen === 1);
    visValues.push(pose.visibility);
  }
  assert.ok(Math.min(...visValues) < 0.05, 'watch_and_hide gnome should fully hide at some point');
  assert.ok(Math.max(...visValues) > 0.95, 'watch_and_hide gnome should peek out fully');

  // Tracking fighter movement changes lookDir toward left vs right side of arena
  const bridgeGnome = ELVEN_GNOME_SPECS.find((g) => g.id === 'gnome_bridge_watcher')!;
  const lookLeft = evaluateGnomeBehavior(bridgeGnome, 3.0, 60);
  const lookRight = evaluateGnomeBehavior(bridgeGnome, 3.0, 440);
  assert.ok(lookLeft.lookDir < 0);
  assert.ok(lookRight.lookDir > 0);
});

test('evaluateButterflyState appears occasionally and stays bounded smoothly', () => {
  const b = ELVEN_BUTTERFLIES[0];
  let sawVisible = false;
  let sawHidden = false;
  for (let t = 0; t < b.cyclePeriod; t += 0.4) {
    const state = evaluateButterflyState(b, t);
    if (state.visible) {
      sawVisible = true;
      assert.ok(state.alpha > 0 && state.alpha <= 1);
      assert.ok(state.wingScaleX >= 0.2 && state.wingScaleX <= 1.01);
    } else {
      sawHidden = true;
      assert.equal(state.alpha, 0);
    }
  }
  assert.equal(sawVisible, true);
  assert.equal(sawHidden, true);
});

test('computeLanternFlicker and computeMushroomPulse stay within smooth atmospheric bounds', () => {
  for (let t = 0; t < 10; t += 0.15) {
    const l = computeLanternFlicker(t, 1.2);
    const m = computeMushroomPulse(t, 0.7);
    assert.ok(l >= 0.68 && l <= 1.05);
    assert.ok(m >= 0.3 && m <= 1.0);
  }
});
