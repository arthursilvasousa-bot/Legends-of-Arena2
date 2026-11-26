import { NINJA_SEQUENCES, NinjaSequenceKey } from './ninjaAnimator';
import { NinjaFxKind } from './types';

export const NINJA_FX_FILES: Record<NinjaFxKind, string> = {
  fx_rajada: '/assets/ninja_pedro/fx_rajada.png',
  fx_portal: '/assets/ninja_pedro/fx_portal.png',
  fx_shuriken: '/assets/ninja_pedro/fx_shuriken.png',
  fx_sangue: '/assets/ninja_pedro/fx_sangue.png',
  fx_explosao: '/assets/ninja_pedro/fx_explosao.png',
  fx_fumaca: '/assets/ninja_pedro/fx_fumaca.png',
  fx_rastro: '/assets/ninja_pedro/fx_rastro.png',
  fx_aura: '/assets/ninja_pedro/fx_aura.png',
};

export const NINJA_PORTRAIT_FILE = '/assets/ninja_pedro/portrait.png';

class NinjaSpriteCache {
  private sequenceImages = new Map<NinjaSequenceKey, HTMLImageElement>();
  private fxImages = new Map<NinjaFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(NINJA_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(NINJA_FX_FILES) as [NinjaFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = NINJA_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: NinjaSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: NinjaFxKind): HTMLImageElement | null {
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

export const ninjaSpriteCache = new NinjaSpriteCache();
