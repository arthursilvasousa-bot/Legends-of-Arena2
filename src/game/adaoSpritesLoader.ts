import { ADAO_SEQUENCES, AdaoSequenceKey } from './adaoAnimator';

export const ADAO_PORTRAIT_FILE = '/assets/aistudio/images_07c958f3.jpeg';

class AdaoSpriteCache {
  private sequenceImages = new Map<AdaoSequenceKey, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(ADAO_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    const p = new Image();
    p.src = ADAO_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: AdaoSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
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

export const adaoSpriteCache = new AdaoSpriteCache();
