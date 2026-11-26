import { BEELZEBU_SEQUENCES, BeelzebuSequenceKey } from './beelzebuAnimator';
import { BeelzebuFxKind } from './types';

export const BEELZEBU_FX_FILES: Record<BeelzebuFxKind, string> = {
  beelzebu_malboro_cloud: '/assets/beelzebu/fx/beelzebu_malboro_cloud.png',
  beelzebu_malboro_impact: '/assets/beelzebu/fx/beelzebu_malboro_impact.png',
  beelzebu_veneno_projectile: '/assets/beelzebu/fx/beelzebu_veneno_projectile.png',
  beelzebu_veneno_impact: '/assets/beelzebu/fx/beelzebu_veneno_impact.png',
  beelzebu_cranio_idle: '/assets/beelzebu/fx/beelzebu_cranio_idle.png',
  beelzebu_cranio_attack: '/assets/beelzebu/fx/beelzebu_cranio_attack.png',
  beelzebu_cranio_impact: '/assets/beelzebu/fx/beelzebu_cranio_impact.png',
  beelzebu_dominio_expand: '/assets/beelzebu/fx/beelzebu_dominio_expand.png',
  beelzebu_dominio_active: '/assets/beelzebu/fx/beelzebu_dominio_active.png',
  beelzebu_dominio_explosion: '/assets/beelzebu/fx/beelzebu_dominio_explosion.png',
};

export const BEELZEBU_PORTRAIT_FILE = '/assets/aistudio/b4b3c98019e8f08b24a211c570137317_91927d27.jpg';

class BeelzebuSpriteCache {
  private sequenceImages = new Map<BeelzebuSequenceKey, HTMLImageElement>();
  private fxImages = new Map<BeelzebuFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(BEELZEBU_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(BEELZEBU_FX_FILES) as [BeelzebuFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = BEELZEBU_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: BeelzebuSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: BeelzebuFxKind): HTMLImageElement | null {
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

export const beelzebuSpriteCache = new BeelzebuSpriteCache();
