import { TESLA_SEQUENCES, TeslaSequenceKey } from './teslaAnimator';
import { TeslaFxKind } from './types';

export const TESLA_FX_FILES: Record<TeslaFxKind, string> = {
  tesla_special1_projectile: '/assets/tesla/fx/tesla_special1_projectile.png',
  tesla_special1_impact: '/assets/tesla/fx/tesla_special1_impact.png',
  tesla_special2_knockback: '/assets/tesla/fx/tesla_special2_knockback.png',
  tesla_special3_beam: '/assets/tesla/fx/tesla_special3_beam.png',
  tesla_special3_reflection: '/assets/tesla/fx/tesla_special3_reflection.png',
  tesla_special4_cage: '/assets/tesla/fx/tesla_special4_cage.png',
  tesla_special4_electric_damage: '/assets/tesla/fx/tesla_special4_electric_damage.png',
};

export const TESLA_PORTRAIT_FILE = '/assets/tesla/portrait.png';

class TeslaSpriteCache {
  private sequenceImages = new Map<TeslaSequenceKey, HTMLImageElement>();
  private fxImages = new Map<TeslaFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(TESLA_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(TESLA_FX_FILES) as [TeslaFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = TESLA_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: TeslaSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: TeslaFxKind): HTMLImageElement | null {
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

export const teslaSpriteCache = new TeslaSpriteCache();
