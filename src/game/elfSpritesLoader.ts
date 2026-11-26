import { ELF_SEQUENCES, ElfSequenceKey } from './elfAnimator';
import { ElfFxKind } from './types';

export const ELF_FX_FILES: Record<ElfFxKind, string> = {
  fx_elf_fire_arrow: '/assets/elf_ariel/fx_elf_fire_arrow.png',
  fx_elf_ice_arrow: '/assets/elf_ariel/fx_elf_ice_arrow.png',
  fx_elf_rain_arrow: '/assets/elf_ariel/fx_elf_rain_arrow.png',
  fx_elf_arcane_arrow: '/assets/elf_ariel/fx_elf_arcane_arrow.png',
  fx_elf_green_burst: '/assets/elf_ariel/fx_elf_green_burst.png',
  fx_elf_green_slash: '/assets/elf_ariel/fx_elf_green_slash.png',
  fx_elf_ice_wave: '/assets/elf_ariel/fx_elf_ice_wave.png',
  fx_elf_ice_burst: '/assets/elf_ariel/fx_elf_ice_burst.png',
  fx_elf_arcane_portal: '/assets/elf_ariel/fx_elf_arcane_portal.png',
  fx_elf_arcane_explosion: '/assets/elf_ariel/fx_elf_arcane_explosion.png',
  fx_elf_gold_beam: '/assets/elf_ariel/fx_elf_gold_beam.png',
  fx_elf_gold_crescent: '/assets/elf_ariel/fx_elf_gold_crescent.png',
  fx_elf_trail: '/assets/elf_ariel/fx_elf_trail.png',
};

export const ELF_PORTRAIT_FILE = '/assets/elf_ariel/portrait.png';

class ElfSpriteCache {
  private sequenceImages = new Map<ElfSequenceKey, HTMLImageElement>();
  private fxImages = new Map<ElfFxKind, HTMLImageElement>();
  private portraitImage: HTMLImageElement | null = null;
  private started = false;

  ensureLoaded(): void {
    if (this.started || typeof Image === 'undefined') return;
    this.started = true;

    for (const seq of Object.values(ELF_SEQUENCES)) {
      const img = new Image();
      img.src = seq.file;
      this.sequenceImages.set(seq.key, img);
    }

    for (const [kind, src] of Object.entries(ELF_FX_FILES) as [ElfFxKind, string][]) {
      const img = new Image();
      img.src = src;
      this.fxImages.set(kind, img);
    }

    const p = new Image();
    p.src = ELF_PORTRAIT_FILE;
    this.portraitImage = p;
  }

  getSequenceImage(key: ElfSequenceKey): HTMLImageElement | null {
    this.ensureLoaded();
    const img = this.sequenceImages.get(key);
    if (img && img.complete && img.naturalWidth > 0) return img;
    return null;
  }

  getFxImage(kind: ElfFxKind): HTMLImageElement | null {
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

export const elfSpriteCache = new ElfSpriteCache();
