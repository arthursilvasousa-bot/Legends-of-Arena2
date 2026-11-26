export type GraphicsQuality = 'high' | 'medium' | 'low';

export interface GameSettings {
  masterVolume: number; // 0..100
  musicVolume: number; // 0..100
  sfxVolume: number; // 0..100
  musicEnabled: boolean;
  sfxEnabled: boolean;
  graphicsQuality: GraphicsQuality;
  particlesEnabled: boolean;
  visualEffectsEnabled: boolean;
}

export const SETTINGS_STORAGE_KEY = 'legends_arena_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 80,
  musicVolume: 70,
  sfxVolume: 85,
  musicEnabled: true,
  sfxEnabled: true,
  graphicsQuality: 'high',
  particlesEnabled: true,
  visualEffectsEnabled: true,
};

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeSettings(partial?: Partial<GameSettings> | null): GameSettings {
  if (!partial || typeof partial !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }
  const quality: GraphicsQuality =
    partial.graphicsQuality === 'low' || partial.graphicsQuality === 'medium' || partial.graphicsQuality === 'high'
      ? partial.graphicsQuality
      : DEFAULT_SETTINGS.graphicsQuality;

  return {
    masterVolume:
      typeof partial.masterVolume === 'number'
        ? clampVolume(partial.masterVolume)
        : DEFAULT_SETTINGS.masterVolume,
    musicVolume:
      typeof partial.musicVolume === 'number'
        ? clampVolume(partial.musicVolume)
        : DEFAULT_SETTINGS.musicVolume,
    sfxVolume:
      typeof partial.sfxVolume === 'number'
        ? clampVolume(partial.sfxVolume)
        : DEFAULT_SETTINGS.sfxVolume,
    musicEnabled:
      typeof partial.musicEnabled === 'boolean'
        ? partial.musicEnabled
        : DEFAULT_SETTINGS.musicEnabled,
    sfxEnabled:
      typeof partial.sfxEnabled === 'boolean'
        ? partial.sfxEnabled
        : DEFAULT_SETTINGS.sfxEnabled,
    graphicsQuality: quality,
    particlesEnabled:
      typeof partial.particlesEnabled === 'boolean'
        ? partial.particlesEnabled
        : DEFAULT_SETTINGS.particlesEnabled,
    visualEffectsEnabled:
      typeof partial.visualEffectsEnabled === 'boolean'
        ? partial.visualEffectsEnabled
        : DEFAULT_SETTINGS.visualEffectsEnabled,
  };
}

export function computeEffectiveMusicGain(settings: GameSettings, muted: boolean): number {
  if (muted || !settings.musicEnabled) return 0;
  return (clampVolume(settings.masterVolume) / 100) * (clampVolume(settings.musicVolume) / 100);
}

export function computeEffectiveSfxGain(settings: GameSettings, muted: boolean): number {
  if (muted || !settings.sfxEnabled) return 0;
  return (clampVolume(settings.masterVolume) / 100) * (clampVolume(settings.sfxVolume) / 100);
}

export interface QualityProfile {
  targetFps: number;
  particleDensity: number; // multiplier 0..1
  starCount: number;
  cloudLayers: number;
  enableGlow: boolean;
  enableMist: boolean;
}

export function getQualityProfile(settings: GameSettings): QualityProfile {
  const base =
    settings.graphicsQuality === 'low'
      ? { targetFps: 30, particleDensity: 0.35, starCount: 24, cloudLayers: 1, enableGlow: false, enableMist: false }
      : settings.graphicsQuality === 'medium'
      ? { targetFps: 45, particleDensity: 0.65, starCount: 44, cloudLayers: 2, enableGlow: true, enableMist: true }
      : { targetFps: 60, particleDensity: 1.0, starCount: 72, cloudLayers: 3, enableGlow: true, enableMist: true };

  return {
    ...base,
    particleDensity: settings.particlesEnabled ? base.particleDensity : 0,
    enableGlow: settings.visualEffectsEnabled && base.enableGlow,
    enableMist: settings.visualEffectsEnabled && base.enableMist,
  };
}

export function loadSettings(): GameSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return normalizeSettings(JSON.parse(raw) as Partial<GameSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: GameSettings): GameSettings {
  const normalized = normalizeSettings(settings);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage quota errors
    }
  }
  return normalized;
}
