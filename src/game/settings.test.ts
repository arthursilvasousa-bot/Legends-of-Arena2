import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  clampVolume,
  computeEffectiveMusicGain,
  computeEffectiveSfxGain,
  getQualityProfile,
  normalizeSettings,
} from './settings';

test('clampVolume clamps values into 0..100 integer range', () => {
  assert.equal(clampVolume(-20), 0);
  assert.equal(clampVolume(145), 100);
  assert.equal(clampVolume(62.6), 63);
  assert.equal(clampVolume(Number.NaN), 0);
});

test('normalizeSettings restores defaults for invalid fields', () => {
  const result = normalizeSettings({
    masterVolume: 200,
    musicEnabled: false,
    graphicsQuality: 'ultra' as unknown as 'high',
  });
  assert.equal(result.masterVolume, 100);
  assert.equal(result.musicEnabled, false);
  assert.equal(result.graphicsQuality, DEFAULT_SETTINGS.graphicsQuality);
  assert.equal(result.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
});

test('computeEffectiveMusicGain and computeEffectiveSfxGain respect toggles and mute', () => {
  const s = normalizeSettings({
    masterVolume: 50,
    musicVolume: 80,
    sfxVolume: 60,
    musicEnabled: true,
    sfxEnabled: true,
  });
  assert.ok(Math.abs(computeEffectiveMusicGain(s, false) - 0.4) < 0.0001);
  assert.ok(Math.abs(computeEffectiveSfxGain(s, false) - 0.3) < 0.0001);
  assert.equal(computeEffectiveMusicGain(s, true), 0);
  assert.equal(computeEffectiveSfxGain({ ...s, sfxEnabled: false }, false), 0);
});

test('getQualityProfile disables particles and glow when toggled off', () => {
  const profile = getQualityProfile({
    ...DEFAULT_SETTINGS,
    graphicsQuality: 'high',
    particlesEnabled: false,
    visualEffectsEnabled: false,
  });
  assert.equal(profile.particleDensity, 0);
  assert.equal(profile.enableGlow, false);
  assert.equal(profile.enableMist, false);
});
