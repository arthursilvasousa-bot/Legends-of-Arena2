import { JACK_SEQUENCES, JackSequenceKey } from './jackAnimator';
import { JackFxKind } from './types';

export const JACK_PORTRAIT_FILE = '/assets/jack_estripador/portrait/portrait.png';

export const JACK_FX_FILES: Record<JackFxKind | 'jack_knife_single' | 'jack_knife_trail' | 'jack_giant_scissors_closed' | 'jack_blood_wave', string> = {
  jack_knife_single: '/assets/jack_estripador/effects/knife_single.png',
  jack_knife_trail: '/assets/jack_estripador/effects/knife_trail.png',
  jack_knife_burst: '/assets/jack_estripador/effects/knife_burst.png',
  jack_soul_eye: '/assets/jack_estripador/effects/soul_eye/strip.png',
  jack_giant_scissors: '/assets/jack_estripador/effects/giant_scissors_open.png',
  jack_giant_scissors_closed: '/assets/jack_estripador/effects/giant_scissors_closed.png',
  jack_scissor_spin: '/assets/jack_estripador/effects/scissor_spin_slash.png',
  jack_blood_splatter: '/assets/jack_estripador/effects/blood_splatter.png',
  jack_blood_wave: '/assets/jack_estripador/effects/blood_wave.png',
  jack_blood_splash: '/assets/jack_estripador/effects/blood_splash.png',
  jack_blood_eruption: '/assets/jack_estripador/effects/blood_eruption.png',
};

export type JackFxImageKey = keyof typeof JACK_FX_FILES;

class JackSpriteCache {
  private sequenceImages = new Map<JackSequenceKey, HTMLImageElement>();
  private fxImages = new Map<JackFxImageKey, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(JACK_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(JACK_FX_FILES) as [JackFxImageKey, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = JACK_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: JackSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: JackFxImageKey): HTMLImageElement | null {
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

export const jackSpriteCache = new JackSpriteCache();
