import { TROLL_SEQUENCES, TrollSequenceKey } from './trollAnimator';
import { TrollFxKind } from './types';

export const TROLL_FX_FILES: Record<TrollFxKind, string> = {
  fx_troll_ground_impact: '/assets/troll_kawa/fx_troll_ground_impact.png',
  fx_troll_boulder_large: '/assets/troll_kawa/fx_troll_boulder_large.png',
  fx_troll_pebbles: '/assets/troll_kawa/fx_troll_pebbles.png',
  fx_troll_rock_trail: '/assets/troll_kawa/fx_troll_rock_trail.png',
  fx_troll_earth_explosion: '/assets/troll_kawa/fx_troll_earth_explosion.png',
  fx_troll_fury_aura: '/assets/troll_kawa/fx_troll_fury_aura.png',
  fx_troll_dust: '/assets/troll_kawa/fx_troll_dust.png',
  fx_troll_fury_particles: '/assets/troll_kawa/fx_troll_fury_particles.png',
  fx_troll_shockwaves: '/assets/troll_kawa/fx_troll_shockwaves.png',
  fx_troll_trail: '/assets/troll_kawa/fx_troll_trail.png',
};

export const TROLL_PORTRAIT_FILE = '/assets/troll_kawa/portrait.png';

class TrollSpriteCache {
  private sequenceImages = new Map<TrollSequenceKey, HTMLImageElement>();
  private fxImages = new Map<TrollFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(TROLL_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(TROLL_FX_FILES) as [TrollFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = TROLL_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: TrollSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: TrollFxKind): HTMLImageElement | null {
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

export const trollSpriteCache = new TrollSpriteCache();
