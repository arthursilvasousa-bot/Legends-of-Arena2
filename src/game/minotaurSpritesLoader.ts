import { MINOTAUR_SEQUENCES, MinotaurSequenceKey } from './minotaurAnimator';
import { MinotaurFxKind } from './types';

export const MINOTAUR_FX_FILES: Record<MinotaurFxKind, string> = {
  fx_minotaur_earth_impact: '/assets/minotaur_wallace/fx_minotaur_earth_impact.png',
  fx_minotaur_shockwave: '/assets/minotaur_wallace/fx_minotaur_shockwave.png',
  fx_minotaur_dust_trail: '/assets/minotaur_wallace/fx_minotaur_dust_trail.png',
  fx_minotaur_sparks: '/assets/minotaur_wallace/fx_minotaur_sparks.png',
  fx_minotaur_rocks: '/assets/minotaur_wallace/fx_minotaur_rocks.png',
  fx_minotaur_fury_aura: '/assets/minotaur_wallace/fx_minotaur_fury_aura.png',
};

export const MINOTAUR_PORTRAIT_FILE = '/assets/minotaur_wallace/portrait.png';

class MinotaurSpriteCache {
  private sequenceImages = new Map<MinotaurSequenceKey, HTMLImageElement>();
  private fxImages = new Map<MinotaurFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(MINOTAUR_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(MINOTAUR_FX_FILES) as [MinotaurFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = MINOTAUR_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: MinotaurSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: MinotaurFxKind): HTMLImageElement | null {
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

export const minotaurSpriteCache = new MinotaurSpriteCache();
