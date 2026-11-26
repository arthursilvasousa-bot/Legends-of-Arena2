import { elfSpriteCache } from './elfSpritesLoader';
import { minotaurSpriteCache } from './minotaurSpritesLoader';
import { necromancerSpriteCache } from './necromancerSpritesLoader';
import { ninjaSpriteCache } from './ninjaSpritesLoader';
import { jaylonSpriteCache } from './jaylonSpritesLoader';
import { priestSpriteCache } from './priestSpritesLoader';
import { trollSpriteCache } from './trollSpritesLoader';
import { teslaSpriteCache } from './teslaSpritesLoader';
import { beelzebuSpriteCache } from './beelzebuSpritesLoader';
import { donoSpriteCache } from './donoSpritesLoader';
import { GROUND_Y, STAGE_HEIGHT, STAGE_LEFT_BOUND, STAGE_RIGHT_BOUND, STAGE_WIDTH } from './roster';
import {
  BeelzebuFxKind,
  DonoFxKind,
  ElfFxKind,
  JaylonFxKind,
  MatchState,
  MinotaurFxKind,
  NecromancerFxKind,
  NinjaFxKind,
  PriestFxKind,
  TeslaFxKind,
  TrollFxKind,
  VisualEffectKind,
} from './types';

function resolveFxSpriteImage(kind: VisualEffectKind): HTMLImageElement | null {
  if (kind.startsWith('fx_elf_')) {
    return elfSpriteCache.getFxImage(kind as ElfFxKind);
  }
  if (kind.startsWith('fx_priest_')) {
    return priestSpriteCache.getFxImage(kind as PriestFxKind);
  }
  if (kind.startsWith('fx_necro_')) {
    return necromancerSpriteCache.getFxImage(kind as NecromancerFxKind);
  }
  if (kind.startsWith('fx_minotaur_')) {
    return minotaurSpriteCache.getFxImage(kind as MinotaurFxKind);
  }
  if (kind.startsWith('fx_troll_')) {
    return trollSpriteCache.getFxImage(kind as TrollFxKind);
  }
  if (kind.startsWith('fx_jaylon_')) {
    return jaylonSpriteCache.getFxImage(kind as JaylonFxKind);
  }
  if (kind.startsWith('tesla_')) {
    return teslaSpriteCache.getFxImage(kind as TeslaFxKind);
  }
  if (kind.startsWith('beelzebu_')) {
    return beelzebuSpriteCache.getFxImage(kind as BeelzebuFxKind);
  }
  if (kind.startsWith('dono_')) {
    return donoSpriteCache.getFxImage(kind as DonoFxKind);
  }
  return ninjaSpriteCache.getFxImage(kind as NinjaFxKind);
}

export function renderProjectilesAndHazards(
  ctx: CanvasRenderingContext2D,
  state: MatchState,
  globalTime: number
): void {
  // 1. Arena Hazards (Seismic waves, Underworld Hands, Celestial Hammer, Holy Explosion, Toxic Cloud, Shadow Domain)
  for (const h of state.hazards) {
    if (h.delay > 0) {
      if (h.kind === 'shadow_domain') {
        const expandImg = beelzebuSpriteCache.getFxImage('beelzebu_dominio_expand');
        ctx.save();
        const progress = Math.max(0.15, 1 - h.delay / 0.25);
        ctx.globalAlpha = 0.65 + 0.25 * Math.sin(globalTime * 24);
        if (expandImg) {
          const prevSmooth = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = true;
          const dw = expandImg.width * 0.36 * (0.65 + progress * 0.35);
          const dh = expandImg.height * 0.36 * (0.65 + progress * 0.35);
          ctx.drawImage(expandImg, Math.round(h.x - dw * 0.5), Math.round(GROUND_Y - dh + 6), dw, dh);
          ctx.imageSmoothingEnabled = prevSmooth;
        }
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(Math.round(h.x), GROUND_Y - 2, h.width * 0.48, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      // Visible telegraph warning!
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(globalTime * 28);
      ctx.strokeStyle = h.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(h.x - h.width / 2), GROUND_Y - 6, h.width, 6);
      ctx.fillStyle = h.color;
      ctx.fillRect(Math.round(h.x - 2), GROUND_Y - 18, 4, 12);
      ctx.restore();
      continue;
    }

    const t = 1 - Math.max(0, h.activeTime / Math.max(0.01, h.totalTime));
    ctx.save();

    if (h.kind === 'seismic_wave') {
      const impactImg = minotaurSpriteCache.getFxImage('fx_minotaur_earth_impact');
      const shockImg = minotaurSpriteCache.getFxImage('fx_minotaur_shockwave');
      const rocksImg = minotaurSpriteCache.getFxImage('fx_minotaur_rocks');
      if (impactImg || shockImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const emerge = Math.min(1, t * 3.2);
        if (shockImg) {
          const sw = shockImg.width * (0.45 + t * 0.25);
          const sh = shockImg.height * (0.45 + t * 0.25);
          ctx.globalAlpha = Math.max(0.25, 0.9 * (1 - t * 0.55));
          ctx.drawImage(shockImg, Math.round(h.x - sw * 0.5), Math.round(GROUND_Y - sh * 0.72), sw, sh);
        }
        if (impactImg) {
          const iw = impactImg.width * 0.52;
          const ih = impactImg.height * 0.52 * emerge;
          ctx.globalAlpha = Math.min(1, 1.05 - t * 0.4);
          ctx.drawImage(impactImg, Math.round(h.x - iw * 0.5), Math.round(GROUND_Y - ih + 3), iw, ih);
        }
        if (rocksImg) {
          const rw = rocksImg.width * 0.52;
          const rh = rocksImg.height * 0.52;
          const lift = Math.sin(Math.min(1, t * 1.4) * Math.PI) * 14;
          ctx.globalAlpha = Math.max(0.2, 0.95 * (1 - t * 0.5));
          ctx.drawImage(rocksImg, Math.round(h.x - rw * 0.5), Math.round(GROUND_Y - rh * 0.8 - lift), rw, rh);
        }
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        // Fallback jagged stone/fire ground spikes erupting
        const spikes = 5;
        const step = h.width / spikes;
        for (let i = 0; i < spikes; i++) {
          const sx = Math.round(h.x - h.width / 2 + i * step);
          const sh = Math.round(h.height * (0.65 + 0.35 * Math.sin(i + globalTime * 22)));
          ctx.fillStyle = '#09070d';
          ctx.fillRect(sx, GROUND_Y - sh - 1, step - 1, sh + 2);
          ctx.fillStyle = h.secondaryColor;
          ctx.fillRect(sx + 1, GROUND_Y - sh, step - 3, sh);
          ctx.fillStyle = h.color;
          ctx.fillRect(sx + 2, GROUND_Y - sh, step - 5, 5);
        }
      }
    } else if (h.kind === 'underworld_hands') {
      const handImg = necromancerSpriteCache.getFxImage('fx_necro_hand');
      const chainsImg = necromancerSpriteCache.getFxImage('fx_necro_chains');
      const auraImg = necromancerSpriteCache.getFxImage('fx_necro_aura');
      if (handImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const emerge = Math.min(1, t * 2.8);
        if (auraImg) {
          const aw = auraImg.width * 0.56;
          const ah = auraImg.height * 0.42;
          ctx.globalAlpha = Math.max(0.25, 0.85 * (1 - t * 0.45));
          ctx.drawImage(auraImg, Math.round(h.x - aw * 0.5), GROUND_Y - ah * 0.62, aw, ah);
        }
        if (chainsImg) {
          const cw = chainsImg.width * 0.52;
          const ch = chainsImg.height * 0.52;
          ctx.globalAlpha = Math.max(0.25, 0.9 * (1 - t * 0.4));
          ctx.drawImage(chainsImg, Math.round(h.x - cw * 0.5), GROUND_Y - ch * emerge + 2, cw, ch);
        }
        const hw = handImg.width * 0.54;
        const hh = handImg.height * 0.54;
        const drawH = hh * emerge;
        ctx.globalAlpha = Math.min(1, 1.1 - t * 0.45);
        ctx.drawImage(
          handImg,
          0,
          0,
          handImg.width,
          Math.max(1, Math.round(handImg.height * emerge)),
          Math.round(h.x - hw * 0.5),
          Math.round(GROUND_Y - drawH + 2),
          hw,
          drawH
        );
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        // Fallback pixel skeletal hands
        for (let i = -1; i <= 1; i++) {
          const hx = Math.round(h.x + i * 13);
          const rise = Math.round(h.height * Math.min(1, t * 2.6));
          ctx.fillStyle = '#09070d';
          ctx.fillRect(hx - 5, GROUND_Y - rise - 1, 10, rise + 2);
          ctx.fillStyle = h.secondaryColor;
          ctx.fillRect(hx - 4, GROUND_Y - rise, 8, rise);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(hx - 4, GROUND_Y - rise, 2, 8);
          ctx.fillRect(hx - 1, GROUND_Y - rise - 2, 2, 10);
          ctx.fillRect(hx + 2, GROUND_Y - rise, 2, 8);
        }
      }
    } else if (h.kind === 'celestial_hammer') {
      const hammerImg = priestSpriteCache.getFxImage('fx_priest_celestial_hammer');
      const pillarImg = priestSpriteCache.getFxImage('fx_priest_light_pillar');
      if (hammerImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        if (pillarImg) {
          const pw = pillarImg.width * 0.72;
          const ph = pillarImg.height * 0.78;
          ctx.globalAlpha = Math.max(0.25, 0.85 * (1 - t * 0.55));
          ctx.drawImage(pillarImg, Math.round(h.x - pw * 0.5), GROUND_Y - ph + 4, pw, ph);
        }
        const hw = hammerImg.width * 0.68;
        const hh = hammerImg.height * 0.68;
        const slamY = GROUND_Y - hh * 0.78 - Math.max(0, 1 - t * 3.2) * 32;
        ctx.globalAlpha = Math.min(1, 1.15 - t * 0.45);
        ctx.drawImage(hammerImg, Math.round(h.x - hw * 0.5), Math.round(slamY), hw, hh);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        // Fallback pixel hammer
        const dropY = GROUND_Y - 26;
        ctx.fillStyle = '#09070d';
        ctx.fillRect(Math.round(h.x - 18), dropY - 22, 36, 22);
        ctx.fillStyle = h.color;
        ctx.fillRect(Math.round(h.x - 16), dropY - 20, 32, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(h.x - 14), dropY - 18, 28, 5);
        ctx.fillStyle = h.secondaryColor;
        ctx.fillRect(Math.round(h.x - 3), dropY - 52, 6, 32);
        ctx.fillStyle = h.color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(Math.round(h.x - h.width / 2), GROUND_Y - 8, h.width, 8);
      }
    } else if (h.kind === 'holy_explosion') {
      const explImg = priestSpriteCache.getFxImage('fx_priest_holy_explosion');
      const sigilImg = priestSpriteCache.getFxImage('fx_priest_holy_sigil');
      if (explImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const scaleGrow = 0.8 + t * 0.42;
        ctx.globalAlpha = Math.max(0, Math.min(1, 1.05 - t * 0.65));
        if (sigilImg) {
          const sw = sigilImg.width * 0.9 * scaleGrow;
          const sh = sigilImg.height * 0.9 * scaleGrow;
          ctx.drawImage(sigilImg, Math.round(h.x - sw * 0.5), GROUND_Y - sh * 0.72, sw, sh);
        }
        const ew = explImg.width * 0.85 * scaleGrow;
        const eh = explImg.height * 0.85 * scaleGrow;
        ctx.drawImage(explImg, Math.round(h.x - ew * 0.5), GROUND_Y - eh + 4, ew, eh);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        const r = Math.round((h.width / 2) * (0.55 + t * 0.5));
        ctx.globalAlpha = 0.72 * (1 - t * 0.6);
        ctx.fillStyle = h.color;
        ctx.beginPath();
        ctx.arc(Math.round(h.x), GROUND_Y - 24, r, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else if (h.kind === 'vomit_puddle') {
      const puddleImg = jaylonSpriteCache.getFxImage('fx_jaylon_vomit_puddle');
      const fadeOut = h.activeTime < 0.45 ? Math.max(0.15, h.activeTime / 0.45) : 0.96;
      ctx.globalAlpha = fadeOut;
      if (puddleImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const pw = puddleImg.width * 0.36;
        const ph = puddleImg.height * 0.36;
        ctx.drawImage(puddleImg, Math.round(h.x - pw * 0.5), Math.round(GROUND_Y - ph + 4), pw, ph);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.ellipse(Math.round(h.x), GROUND_Y - 1, h.width * 0.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (h.kind === 'electric_cage') {
      const cageImg = teslaSpriteCache.getFxImage('tesla_special4_cage');
      const fadeOut = h.activeTime < 0.35 ? Math.max(0.2, h.activeTime / 0.35) : 0.96;
      ctx.globalAlpha = fadeOut;
      if (cageImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const frameCount = 5;
        const fw = Math.round(cageImg.width / frameCount);
        const fh = cageImg.height;
        const elapsed = Math.max(0, h.totalTime - h.delay - h.activeTime);
        const frameIdx = Math.floor(elapsed * 15) % frameCount;
        const scale = 0.42;
        const dw = fw * scale;
        const dh = fh * scale;
        ctx.drawImage(
          cageImg,
          frameIdx * fw,
          0,
          fw,
          fh,
          Math.round(h.x - dw * 0.5),
          Math.round(GROUND_Y - dh + 4),
          dw,
          dh
        );
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.strokeRect(Math.round(h.x - h.width / 2), GROUND_Y - h.height, h.width, h.height);
      }
    } else if (h.kind === 'toxic_cloud') {
      const cloudImg = beelzebuSpriteCache.getFxImage('beelzebu_malboro_cloud');
      const fadeOut = h.activeTime < 0.45 ? Math.max(0.15, h.activeTime / 0.45) : 0.94;
      ctx.globalAlpha = fadeOut;
      if (cloudImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const frameCount = 3;
        const fw = Math.round(cloudImg.width / frameCount);
        const fh = cloudImg.height;
        const elapsed = Math.max(0, h.totalTime - h.delay - h.activeTime);
        const frameIdx = Math.floor(elapsed * 12) % frameCount;
        const scale = 0.42;
        const dw = fw * scale;
        const dh = fh * scale;
        ctx.drawImage(
          cloudImg,
          frameIdx * fw,
          0,
          fw,
          fh,
          Math.round(h.x - dw * 0.5),
          Math.round(GROUND_Y - dh + 6),
          dw,
          dh
        );
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#9333ea';
        ctx.beginPath();
        ctx.arc(Math.round(h.x), GROUND_Y - 36, h.width * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (h.kind === 'shadow_domain') {
      const domainImg = beelzebuSpriteCache.getFxImage('beelzebu_dominio_active');
      const fadeOut = h.activeTime < 0.3 ? Math.max(0.2, h.activeTime / 0.3) : 0.96;

      // Darken arena floor & atmosphere while Domínio das Sombras is active
      ctx.save();
      const grad = ctx.createRadialGradient(
        Math.round(h.x),
        GROUND_Y - 40,
        24,
        Math.round(h.x),
        GROUND_Y - 40,
        STAGE_WIDTH * 0.72
      );
      grad.addColorStop(0, 'rgba(30, 8, 52, 0.25)');
      grad.addColorStop(1, 'rgba(6, 3, 14, 0.52)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = fadeOut;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
      ctx.restore();

      ctx.globalAlpha = fadeOut;
      if (domainImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const pulse = 0.40 + 0.02 * Math.sin(globalTime * 11);
        const dw = domainImg.width * pulse;
        const dh = domainImg.height * pulse;
        ctx.drawImage(
          domainImg,
          Math.round(h.x - dw * 0.5),
          Math.round(GROUND_Y - dh + 6),
          dw,
          dh
        );
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Math.round(h.x), GROUND_Y - 42, h.width * 0.5, Math.PI, 0);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // 1b. Active Tesla Special 3 Continuous Electric Beam (chest to remaining arena edge)
  for (const caster of [state.f1, state.f2]) {
    if (
      caster.characterId === 'tesla' &&
      caster.action === 'special3' &&
      caster.currentMove?.kind === 'electric_beam' &&
      caster.actionTime >= caster.currentMove.startup &&
      caster.actionTime <= caster.currentMove.startup + caster.currentMove.active + 0.04
    ) {
      const originX = caster.x + caster.facing * 18;
      const edgeX = caster.facing === 1 ? STAGE_RIGHT_BOUND + 14 : STAGE_LEFT_BOUND - 14;
      const spanW = Math.max(16, Math.abs(edgeX - originX));
      const beamY = caster.y - 34;
      const beamImg = teslaSpriteCache.getFxImage('tesla_special3_beam');
      ctx.save();
      ctx.globalAlpha = 0.88 + 0.12 * Math.sin(globalTime * 48);
      if (beamImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const beamH = beamImg.height * 0.34;
        ctx.translate(Math.round(originX), Math.round(beamY));
        ctx.scale(caster.facing, 1);
        ctx.drawImage(beamImg, 0, -beamH * 0.5, spanW, beamH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        const left = caster.facing === 1 ? originX : edgeX;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(Math.round(left), Math.round(beamY - 6), Math.round(spanW), 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(left), Math.round(beamY - 2), Math.round(spanW), 4);
      }
      ctx.restore();
    }
  }

  // 2. Projectiles
  for (const p of state.projectiles) {
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    const dir = p.vx >= 0 ? 1 : -1;

    ctx.save();
    if (p.kind === 'shadow_blade') {
      const fxImg = ninjaSpriteCache.getFxImage('fx_rajada');
      if (fxImg) {
        const drawW = fxImg.width * 0.38;
        const drawH = fxImg.height * 0.38;
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(fxImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(px - 10, py - 14, 20, 28);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 8, py - 12, 16, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + dir * 3, py - 10, 4, 20);
      }
    } else if (p.kind === 'shuriken') {
      const fxImg = ninjaSpriteCache.getFxImage('fx_shuriken');
      ctx.translate(px, py);
      ctx.rotate(globalTime * 22);
      if (fxImg) {
        const drawW = fxImg.width * 0.62;
        const drawH = fxImg.height * 0.62;
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(fxImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-2, -6, 4, 12);
        ctx.fillStyle = p.color;
        ctx.fillRect(-5, -1, 10, 2);
        ctx.fillRect(-1, -5, 2, 10);
        ctx.fillStyle = p.secondaryColor;
        ctx.fillRect(-1, -1, 2, 2);
      }
    } else if (p.kind === 'fire_arrow' || p.kind === 'ice_arrow' || p.kind === 'arcane_arrow') {
      const fxKind: ElfFxKind =
        p.kind === 'fire_arrow'
          ? 'fx_elf_fire_arrow'
          : p.kind === 'ice_arrow'
          ? 'fx_elf_ice_arrow'
          : 'fx_elf_arcane_arrow';
      const arrowImg = elfSpriteCache.getFxImage(fxKind);
      if (arrowImg) {
        const scale = p.kind === 'ice_arrow' ? 0.44 : 0.62;
        const drawW = arrowImg.width * scale;
        const drawH = arrowImg.height * scale;
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(arrowImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(px - 13, py - 4, 26, 8);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 12, py - 3, 24, 6);
        ctx.fillStyle = p.secondaryColor;
        ctx.fillRect(px - 10, py - 1, 20, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + dir * 9, py - 4, 4, 8);
      }
    } else if (p.kind === 'rain_arrow') {
      const rainImg = elfSpriteCache.getFxImage('fx_elf_rain_arrow');
      if (rainImg) {
        const drawW = rainImg.width * 0.72;
        const drawH = rainImg.height * 0.72;
        ctx.translate(px, py);
        // fx_elf_rain_arrow raw sprite points down-right (~72 deg). Flip horizontally if moving left.
        ctx.scale(dir, 1);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(rainImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(px - 3, py - 10, 6, 20);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 2, py - 9, 4, 18);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 2, py + 6, 4, 4);
      }
    } else if (p.kind === 'dark_orb') {
      const orbImg = necromancerSpriteCache.getFxImage('fx_necro_dark_sphere');
      if (orbImg) {
        const pulse = 0.36 + 0.04 * Math.sin(globalTime * 18);
        const drawW = orbImg.width * pulse;
        const drawH = orbImg.height * pulse;
        ctx.translate(px, py);
        ctx.rotate(globalTime * 6 * dir);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(orbImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.beginPath();
        ctx.arc(px, py, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 3, py - 3, 6, 6);
      }
    } else if (p.kind === 'specter') {
      const specterImg = necromancerSpriteCache.getFxImage('fx_necro_specter');
      if (specterImg) {
        const drawW = specterImg.width * 0.44;
        const drawH = specterImg.height * 0.44;
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        ctx.globalAlpha = 0.85 + 0.14 * Math.sin(globalTime * 16 + p.id);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(specterImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(px - 10, py - 9, 20, 18);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 8, py - 7, 16, 14);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px + dir * 2, py - 4, 3, 3);
      }
    } else if (p.kind === 'holy_beam') {
      const beamImg = priestSpriteCache.getFxImage('fx_priest_holy_beam');
      if (beamImg) {
        const drawW = beamImg.width * 0.54;
        const drawH = beamImg.height * 0.54;
        ctx.translate(px, py);
        ctx.scale(dir, 1);
        // Raw beam points upward-right (~26 deg); rotate clockwise so beam travels crisp & horizontal
        ctx.rotate(0.45);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(beamImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(px - 18, py - 7, 36, 14);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 16, py - 5, 32, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 14, py - 2, 28, 4);
      }
    } else if (p.kind === 'boulder') {
      const boulderImg = trollSpriteCache.getFxImage('fx_troll_boulder_large');
      if (boulderImg) {
        const drawW = boulderImg.width * 0.44;
        const drawH = boulderImg.height * 0.44;
        ctx.translate(px, py);
        ctx.rotate(globalTime * 7 * dir);
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(boulderImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(px - 12, py - 12, 24, 24);
        ctx.fillStyle = p.secondaryColor;
        ctx.fillRect(px - 10, py - 10, 20, 20);
        ctx.fillStyle = p.color;
        ctx.fillRect(px - 8, py - 8, 12, 10);
      }
    } else if (p.kind === 'beer_bottle') {
      const bottleImg = jaylonSpriteCache.getFxImage('fx_jaylon_bottle_spin');
      ctx.translate(px, py);
      ctx.rotate(globalTime * 16 * dir);
      if (bottleImg) {
        const drawW = bottleImg.width * 0.52;
        const drawH = bottleImg.height * 0.52;
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(bottleImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(-8, -4, 16, 8);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-7, -3, 14, 6);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2, -2, 5, 4);
      }
    } else if (p.kind === 'electric_ball') {
      const ballImg = teslaSpriteCache.getFxImage('tesla_special1_projectile');
      ctx.translate(px, py);
      ctx.scale(dir, 1);
      if (ballImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const frameCount = 4;
        const fw = Math.round(ballImg.width / frameCount);
        const fh = ballImg.height;
        const elapsed = Math.max(0, p.maxLife - p.life);
        const frameIdx = Math.floor(elapsed * 15) % frameCount;
        const scale = 0.28;
        const dw = fw * scale;
        const dh = fh * scale;
        ctx.drawImage(ballImg, frameIdx * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.kind === 'poison_lance') {
      const lanceImg = beelzebuSpriteCache.getFxImage('beelzebu_veneno_projectile');
      ctx.translate(px, py);
      ctx.scale(dir, 1);
      if (lanceImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const frameCount = 3;
        const fw = Math.round(lanceImg.width / frameCount);
        const fh = lanceImg.height;
        const elapsed = Math.max(0, p.maxLife - p.life);
        const frameIdx = Math.floor(elapsed * 15) % frameCount;
        const scale = 0.30;
        const dw = fw * scale;
        const dh = fh * scale;
        ctx.drawImage(lanceImg, frameIdx * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#7e22ce';
        ctx.fillRect(-16, -5, 32, 10);
        ctx.fillStyle = '#e879f9';
        ctx.fillRect(-10, -2, 24, 4);
      }
    } else if (p.kind === 'homing_skull') {
      const isIdle = (p.homingDelay ?? 0) > 0;
      const skullImg = beelzebuSpriteCache.getFxImage(isIdle ? 'beelzebu_cranio_idle' : 'beelzebu_cranio_attack');
      ctx.translate(px, py);
      ctx.scale(dir, 1);
      ctx.rotate(Math.sin(p.rotation ?? 0) * 0.16);
      if (skullImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const frameCount = isIdle ? 2 : 3;
        const fps = isIdle ? 12 : 15;
        const fw = Math.round(skullImg.width / frameCount);
        const fh = skullImg.height;
        const elapsed = Math.max(0, p.maxLife - p.life);
        const frameIdx = Math.floor(elapsed * fps) % frameCount;
        const scale = 0.42;
        const dw = fw * scale;
        const dh = fh * scale;
        ctx.drawImage(skullImg, frameIdx * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f5d0fe';
        ctx.beginPath();
        ctx.arc(0, -1, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p.kind === 'pistol_bullet') {
      const bulletImg = donoSpriteCache.getFxImage('dono_festa_projectile');
      ctx.translate(px, py);
      ctx.scale(dir, 1);
      if (bulletImg) {
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        const frameCount = 3;
        const fw = Math.round(bulletImg.width / frameCount);
        const fh = bulletImg.height;
        const elapsed = Math.max(0, p.maxLife - p.life);
        const frameIdx = Math.floor(elapsed * 18) % frameCount;
        const scale = 0.65;
        const dw = fw * scale;
        const dh = fh * scale;
        ctx.drawImage(bulletImg, frameIdx * fw, 0, fw, fh, -dw * 0.5, -dh * 0.5, dw, dh);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else {
        ctx.fillStyle = '#09070d';
        ctx.fillRect(-9, -2.5, 18, 5);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-8, -1.5, 12, 3);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(0, -1.5, 7, 3);
      }
    }
    ctx.restore();
  }

  // 3. Independent Sprite Visual Effects (Ninja, Elf, Priest, Necro, Minotaur, Troll, Jaylon, Tesla, Beelzebu, Dono & Adão FX)
  for (const fx of state.visualEffects) {
    const progress = 1 - Math.max(0, Math.min(1, fx.life / Math.max(0.01, fx.maxLife)));
    const fade = progress < 0.18 ? progress / 0.18 : 1 - (progress - 0.18) / 0.82;

    if (fx.kind === 'adao_jab_spark') {
      ctx.save();
      ctx.translate(Math.round(fx.x), Math.round(fx.y));
      ctx.scale(fx.facing, 1);
      ctx.globalAlpha = Math.max(0, Math.min(1, fx.alpha * fade));
      const len = Math.round((14 + progress * 12) * fx.scale * 2);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(-4, -3, len, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, -1, Math.round(len * 0.85), 2);
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(Math.round(len * 0.45), -6, 3, 12);
      ctx.restore();
      continue;
    }

    if (fx.kind === 'adao_copy_aura') {
      ctx.save();
      ctx.translate(Math.round(fx.x), Math.round(fx.y));
      ctx.globalAlpha = Math.max(0, Math.min(1, fx.alpha * fade));
      const r1 = (18 + progress * 28) * fx.scale;
      const r2 = (10 + progress * 18) * fx.scale;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r2, 0, Math.PI * 2);
      ctx.stroke();
      // Twin crimson eye-glint flare
      ctx.fillStyle = '#fecaca';
      ctx.fillRect(fx.facing * 4 - 8, -14, 16, 2);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(fx.facing * 4 - 2, -18, 4, 10);
      ctx.restore();
      continue;
    }

    if (fx.kind === 'adao_time_fist_flash') {
      ctx.save();
      ctx.translate(Math.round(fx.x), Math.round(fx.y));
      ctx.scale(fx.facing, 1);
      ctx.globalAlpha = Math.max(0, Math.min(1, fx.alpha * fade));
      const rx = (28 + progress * 72) * fx.scale;
      const ry = (18 + progress * 26) * fx.scale;
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, rx);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      grad.addColorStop(0.35, 'rgba(216, 180, 254, 0.78)');
      grad.addColorStop(0.75, 'rgba(147, 51, 234, 0.45)');
      grad.addColorStop(1, 'rgba(88, 28, 135, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5d0fe';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx * 0.75, ry * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const img = resolveFxSpriteImage(fx.kind);
    if (!img) continue;
    const isBurst =
      fx.kind === 'fx_explosao' ||
      fx.kind === 'fx_sangue' ||
      fx.kind === 'fx_elf_green_burst' ||
      fx.kind === 'fx_elf_ice_burst' ||
      fx.kind === 'fx_elf_arcane_explosion' ||
      fx.kind === 'fx_priest_holy_explosion' ||
      fx.kind === 'fx_priest_particles' ||
      fx.kind === 'fx_necro_soul_explosion' ||
      fx.kind === 'fx_necro_skulls' ||
      fx.kind === 'fx_necro_chains' ||
      fx.kind === 'fx_minotaur_earth_impact' ||
      fx.kind === 'fx_minotaur_shockwave' ||
      fx.kind === 'fx_minotaur_sparks' ||
      fx.kind === 'fx_minotaur_rocks' ||
      fx.kind === 'fx_troll_ground_impact' ||
      fx.kind === 'fx_troll_earth_explosion' ||
      fx.kind === 'fx_troll_shockwaves' ||
      fx.kind === 'fx_troll_pebbles' ||
      fx.kind === 'fx_troll_fury_particles' ||
      fx.kind === 'fx_jaylon_bottle_impact' ||
      fx.kind === 'fx_jaylon_fire_burst' ||
      fx.kind === 'tesla_special1_impact' ||
      fx.kind === 'tesla_special2_knockback' ||
      fx.kind === 'tesla_special3_reflection' ||
      fx.kind === 'tesla_special4_electric_damage' ||
      fx.kind === 'beelzebu_malboro_impact' ||
      fx.kind === 'beelzebu_veneno_impact' ||
      fx.kind === 'beelzebu_cranio_impact' ||
      fx.kind === 'beelzebu_dominio_explosion' ||
      fx.kind === 'dono_festa_muzzle_flash' ||
      fx.kind === 'dono_festa_impact' ||
      fx.kind === 'dono_atividade_wave';
    const scaleBoost = isBurst
      ? fx.scale * (0.85 + progress * 0.35)
      : fx.kind === 'fx_fumaca' ||
        fx.kind === 'fx_necro_smoke' ||
        fx.kind === 'fx_minotaur_dust_trail' ||
        fx.kind === 'fx_troll_dust' ||
        fx.kind === 'fx_troll_trail' ||
        fx.kind === 'fx_troll_rock_trail' ||
        fx.kind === 'fx_jaylon_smoke' ||
        fx.kind === 'dono_camuflagem_smoke' ||
        fx.kind === 'dono_maryjuana_cloud'
      ? fx.scale * (0.9 + progress * 0.28)
      : fx.scale;

    const stripFrames =
      fx.kind === 'beelzebu_malboro_impact' || fx.kind === 'beelzebu_cranio_impact'
        ? 2
        : fx.kind === 'dono_festa_muzzle_flash'
        ? 3
        : fx.kind === 'dono_festa_impact' ||
          fx.kind === 'dono_atividade_wave' ||
          fx.kind === 'dono_camuflagem_smoke' ||
          fx.kind === 'dono_maryjuana_cloud'
        ? 4
        : 1;

    ctx.save();
    ctx.translate(Math.round(fx.x), Math.round(fx.y));
    ctx.scale(fx.facing, 1);
    if (fx.rotation !== 0) ctx.rotate(fx.rotation);
    ctx.globalAlpha = Math.max(0, Math.min(1, fx.alpha * fade));
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    if (stripFrames > 1) {
      const fw = Math.round(img.width / stripFrames);
      const fh = img.height;
      const frameIdx = Math.min(stripFrames - 1, Math.floor(progress * stripFrames));
      const drawW = fw * scaleBoost;
      const drawH = fh * scaleBoost;
      ctx.drawImage(img, frameIdx * fw, 0, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      const drawW = img.width * scaleBoost;
      const drawH = img.height * scaleBoost;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.restore();
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  state: MatchState
): void {
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (!p.active) continue;
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;

    if (p.kind === 'text' && p.text) {
      ctx.font = 'bold 10px "Silkscreen", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#09070d';
      ctx.fillText(p.text, Math.round(p.x) + 1, Math.round(p.y) + 1);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
    } else if (p.kind === 'smoke') {
      const sz = Math.round(p.size * (1.2 + (1 - alpha) * 1.4));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    } else if (p.kind === 'ring') {
      const radius = Math.max(2, p.size * (1 + (1 - alpha) * 2.2));
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#09070d';
      ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), p.size + 2, p.size + 2);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }

    ctx.restore();
  }
}
