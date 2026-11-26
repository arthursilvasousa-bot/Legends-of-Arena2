import { PRIEST_SEQUENCES, PriestSequenceKey } from './priestAnimator';
import { PriestFxKind } from './types';

export const PRIEST_FX_FILES: Record<PriestFxKind, string> = {
  fx_priest_holy_beam: '/assets/priest_guilherme/fx_priest_holy_beam.png',
  fx_priest_holy_shield: '/assets/priest_guilherme/fx_priest_holy_shield.png',
  fx_priest_celestial_hammer: '/assets/priest_guilherme/fx_priest_celestial_hammer.png',
  fx_priest_holy_explosion: '/assets/priest_guilherme/fx_priest_holy_explosion.png',
  fx_priest_light_pillar: '/assets/priest_guilherme/fx_priest_light_pillar.png',
  fx_priest_particles: '/assets/priest_guilherme/fx_priest_particles.png',
  fx_priest_holy_sigil: '/assets/priest_guilherme/fx_priest_holy_sigil.png',
  fx_priest_golden_aura: '/assets/priest_guilherme/fx_priest_golden_aura.png',
};

export const PRIEST_PORTRAIT_FILE = '/assets/priest_guilherme/portrait.png';

class PriestSpriteCache {
  private sequenceImages = new Map<PriestSequenceKey, HTMLImageElement>();
  private fxImages = new Map<PriestFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(PRIEST_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(PRIEST_FX_FILES) as [PriestFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = PRIEST_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: PriestSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: PriestFxKind): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.fxImages.get(kind);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getPortraitImage(): HTMLImageElement | null {
    this.ensureLoaded();
    if (this.portraitImage && this.portraitImage.complete && this.portraitImage.naturalWidth > 0) {
      return this.portraitImage;
    }
    return null;
  }
}

export const priestSpriteCache = new PriestSpriteCache();
