import { JAYLON_SEQUENCES, JaylonSequenceKey } from './jaylonAnimator';
import { JaylonFxKind } from './types';

export const JAYLON_FX_FILES: Record<JaylonFxKind, string> = {
  fx_jaylon_bottle_spin: '/assets/jaylon/fx/fx_jaylon_bottle_spin.png',
  fx_jaylon_bottle_impact: '/assets/jaylon/fx/fx_jaylon_bottle_impact.png',
  fx_jaylon_stun_stars: '/assets/jaylon/fx/fx_jaylon_stun_stars.png',
  fx_jaylon_vomit_stream: '/assets/jaylon/fx/fx_jaylon_vomit_stream.png',
  fx_jaylon_vomit_puddle: '/assets/jaylon/fx/fx_jaylon_vomit_puddle.png',
  fx_jaylon_smoke: '/assets/jaylon/fx/fx_jaylon_smoke.png',
  fx_jaylon_fire_breath: '/assets/jaylon/fx/fx_jaylon_fire_breath.png',
  fx_jaylon_fire_burst: '/assets/jaylon/fx/fx_jaylon_fire_burst.png',
};

export const JAYLON_PORTRAIT_FILE = '/assets/jaylon/portrait.png';

class JaylonSpriteCache {
  private sequenceImages = new Map<JaylonSequenceKey, HTMLImageElement>();
  private fxImages = new Map<JaylonFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(JAYLON_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(JAYLON_FX_FILES) as [JaylonFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = JAYLON_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: JaylonSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: JaylonFxKind): HTMLImageElement | null {
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

export const jaylonSpriteCache = new JaylonSpriteCache();
