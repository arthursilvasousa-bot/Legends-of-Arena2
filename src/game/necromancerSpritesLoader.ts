import { NECROMANCER_SEQUENCES, NecromancerSequenceKey } from './necromancerAnimator';
import { NecromancerFxKind } from './types';

export const NECROMANCER_FX_FILES: Record<NecromancerFxKind, string> = {
  fx_necro_dark_sphere: '/assets/necromancer_lucas/fx_necro_dark_sphere.png',
  fx_necro_portal: '/assets/necromancer_lucas/fx_necro_portal.png',
  fx_necro_chains: '/assets/necromancer_lucas/fx_necro_chains.png',
  fx_necro_soul_explosion: '/assets/necromancer_lucas/fx_necro_soul_explosion.png',
  fx_necro_skulls: '/assets/necromancer_lucas/fx_necro_skulls.png',
  fx_necro_smoke: '/assets/necromancer_lucas/fx_necro_smoke.png',
  fx_necro_aura: '/assets/necromancer_lucas/fx_necro_aura.png',
  fx_necro_sigils: '/assets/necromancer_lucas/fx_necro_sigils.png',
  fx_necro_hand: '/assets/necromancer_lucas/fx_necro_hand.png',
  fx_necro_specter: '/assets/necromancer_lucas/fx_necro_specter.png',
};

export const NECROMANCER_PORTRAIT_FILE = '/assets/necromancer_lucas/portrait.png';

class NecromancerSpriteCache {
  private sequenceImages = new Map<NecromancerSequenceKey, HTMLImageElement>();
  private fxImages = new Map<NecromancerFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(NECROMANCER_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(NECROMANCER_FX_FILES) as [NecromancerFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = NECROMANCER_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: NecromancerSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: NecromancerFxKind): HTMLImageElement | null {
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

export const necromancerSpriteCache = new NecromancerSpriteCache();
