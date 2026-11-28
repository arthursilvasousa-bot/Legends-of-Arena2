import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAVELA_CROWD_SPECS,
  computeFlagWaveOffset,
  computeFavelaParallaxShifts,
  computeSpeakerPulse,
  evaluateFavelaSpectator,
  evaluateHelicopterState,
} from './favelaHelpers';

test('computeFavelaParallaxShifts clamps all layers strictly inside pad margins', () => {
  const extremeLeft = computeFavelaParallaxShifts(999);
  assert.ok(extremeLeft.farShift >= -18 && extremeLeft.farShift <= 18);
  assert.ok(extremeLeft.hillsShift >= -19 && extremeLeft.hillsShift <= 19);
  assert.ok(extremeLeft.crowdShift >= -20 && extremeLeft.crowdShift <= 20);
  assert.ok(extremeLeft.midShift >= -20 && extremeLeft.midShift <= 20);
  assert.ok(extremeLeft.floorShift >= -30 && extremeLeft.floorShift <= 30);

  const extremeRight = computeFavelaParallaxShifts(-999);
  assert.ok(extremeRight.farShift >= -18 && extremeRight.farShift <= 18);
  assert.ok(extremeRight.floorShift >= -30 && extremeRight.floorShift <= 30);

  const center = computeFavelaParallaxShifts(0);
  assert.equal(Math.abs(center.farShift), 0);
  assert.equal(Math.abs(center.floorShift), 0);
});

test('FAVELA_CROWD_SPECS covers both balcony and fence zones behind fighters', () => {
  const balcony = FAVELA_CROWD_SPECS.filter((s) => s.zone === 'balcony');
  const fence = FAVELA_CROWD_SPECS.filter((s) => s.zone === 'fence');
  assert.ok(balcony.length >= 4);
  assert.ok(fence.length >= 12);

  for (const spec of FAVELA_CROWD_SPECS) {
    assert.ok(spec.baseY < 198, 'crowd must stand behind concrete wall / fence above floor');
    const poseA = evaluateFavelaSpectator(spec, 0.4);
    const poseB = evaluateFavelaSpectator(spec, 1.9);
    assert.ok(poseA.leftArmRaise >= 0 && poseA.leftArmRaise <= 1);
    assert.ok(poseA.rightArmRaise >= 0 && poseA.rightArmRaise <= 1);
    assert.ok(poseB.jumpOffset >= 0 && poseB.jumpOffset <= 4.2);
    if (spec.zone === 'fence') {
      assert.ok(poseA.headY < 142, `fence spectator ${spec.id} head should rise above fence rail`);
    }
  }
});

test('evaluateHelicopterState keeps helicopter in sky bounds with spinning rotor', () => {
  const s1 = evaluateHelicopterState(0.5);
  const s2 = evaluateHelicopterState(4.2);
  assert.ok(s1.x >= 95 && s1.x <= 220);
  assert.ok(s1.y >= 40 && s1.y <= 68);
  assert.ok(s2.x >= 95 && s2.x <= 220);
  assert.ok(s1.rotorSpanHalf >= 6 && s1.rotorSpanHalf <= 24);
  assert.ok(s1.tailPulse >= 0.45 && s1.tailPulse <= 1);
});

test('computeFlagWaveOffset keeps top rod anchored at rowNorm=0 and waves lower cloth', () => {
  assert.equal(computeFlagWaveOffset(2.5, 0, 1.1), 0);
  assert.equal(computeFlagWaveOffset(8.3, -0.2, 0.4), 0);
  const mid = computeFlagWaveOffset(1.4, 0.5, 0.8);
  const bottom = computeFlagWaveOffset(1.4, 1.0, 0.8);
  assert.ok(Math.abs(mid) <= 3);
  assert.ok(Math.abs(bottom) <= 3);
});

test('computeSpeakerPulse stays cleanly normalized in [0, 1]', () => {
  for (let t = 0; t < 3; t += 0.05) {
    const p = computeSpeakerPulse(t);
    assert.ok(p >= 0 && p <= 1);
  }
});
