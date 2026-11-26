import { DONO_SEQUENCES, DonoSequenceKey } from './donoAnimator';
import { DonoFxKind } from './types';

export const DONO_FX_FILES: Record<DonoFxKind, string> = {
  dono_festa_muzzle_flash: '/assets/dono/fx/dono_festa_muzzle_flash.png',
  dono_festa_projectile: '/assets/dono/fx/dono_festa_projectile.png',
  dono_festa_impact: '/assets/dono/fx/dono_festa_impact.png',
  dono_atividade_wave: '/assets/dono/fx/dono_atividade_wave.png',
  dono_camuflagem_smoke: '/assets/dono/fx/dono_camuflagem_smoke.png',
  dono_maryjuana_cloud: '/assets/dono/fx/dono_maryjuana_cloud.png',
};

export const DONO_PORTRAIT_FILE = '/assets/dono/portrait.png';

class DonoSpriteCache {
  private sequenceImages = new Map<DonoSequenceKey, HTMLImageElement>();
  private fxImages = new Map<DonoFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(DONO_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(DONO_FX_FILES) as [DonoFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = DONO_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: DonoSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: DonoFxKind): HTMLImageElement | null {
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

export const donoSpriteCache = new DonoSpriteCache();
