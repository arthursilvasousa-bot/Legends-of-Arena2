import { ELF_RENDER_SCALE, resolveElfFrame } from './elfAnimator';
import { elfSpriteCache } from './elfSpritesLoader';
import { MINOTAUR_RENDER_SCALE, resolveMinotaurFrame } from './minotaurAnimator';
import { minotaurSpriteCache } from './minotaurSpritesLoader';
import { NECROMANCER_RENDER_SCALE, resolveNecromancerFrame } from './necromancerAnimator';
import { necromancerSpriteCache } from './necromancerSpritesLoader';
import { NINJA_RENDER_SCALE, resolveNinjaFrame } from './ninjaAnimator';
import { ninjaSpriteCache } from './ninjaSpritesLoader';
import { PRIEST_RENDER_SCALE, resolvePriestFrame } from './priestAnimator';
import { priestSpriteCache } from './priestSpritesLoader';
import { JAYLON_RENDER_SCALE, resolveJaylonFrame } from './jaylonAnimator';
import { jaylonSpriteCache } from './jaylonSpritesLoader';
import { TROLL_RENDER_SCALE, resolveTrollFrame } from './trollAnimator';
import { trollSpriteCache } from './trollSpritesLoader';
import { TESLA_RENDER_SCALE, resolveTeslaFrame } from './teslaAnimator';
import { teslaSpriteCache } from './teslaSpritesLoader';
import { BEELZEBU_RENDER_SCALE, resolveBeelzebuFrame } from './beelzebuAnimator';
import { beelzebuSpriteCache } from './beelzebuSpritesLoader';
import { DONO_RENDER_SCALE, resolveDonoFrame } from './donoAnimator';
import { donoSpriteCache } from './donoSpritesLoader';
import { ADAO_RENDER_SCALE, ADAO_SPECIAL3_CHARGE_DURATION, resolveAdaoFrame } from './adaoAnimator';
import { adaoSpriteCache } from './adaoSpritesLoader';
import { JACK_RENDER_SCALE, resolveJackFrame } from './jackAnimator';
import { jackSpriteCache } from './jackSpritesLoader';
import { CHARACTERS, GROUND_Y } from './roster';
import { CharacterId, FighterState } from './types';

function pxRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = '#09070d'
) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  if (outline) {
    ctx.fillStyle = outline;
    ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  }
  ctx.fillStyle = fill;
  ctx.fillRect(rx, ry, rw, rh);
}

function renderSpecialLockOverlay(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  globalTime: number
): void {
  if (f.specialLockTime <= 0 || f.action === 'ko') return;
  const def = CHARACTERS[f.characterId];
  const pulse = 0.65 + 0.35 * Math.sin(globalTime * 14);
  const cx = Math.round(f.x);
  const headTopY = Math.round(f.y - def.height - 20);

  ctx.save();
  // Pulsing electric lock ring around chest/waist
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.45 * pulse;
  ctx.beginPath();
  ctx.ellipse(cx, Math.round(f.y - def.height * 0.48), def.width * 0.72, def.height * 0.44, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Padlock badge above head
  ctx.globalAlpha = 0.95;
  const lx = cx - 6;
  const ly = headTopY;
  // Shackle arc
  ctx.strokeStyle = '#e0f2fe';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, ly + 1, 3.5, Math.PI, 0);
  ctx.stroke();
  // Lock body outline + cyan/navy fill
  ctx.fillStyle = '#09070d';
  ctx.fillRect(lx - 1, ly + 1, 14, 11);
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(lx, ly + 2, 12, 9);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, ly + 4, 2, 4);
  ctx.restore();
}

function renderPoisonOverlay(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  globalTime: number
): void {
  if (f.poisonTime <= 0 || f.action === 'ko') return;
  const def = CHARACTERS[f.characterId];
  const cx = Math.round(f.x);
  const pulse = 0.55 + 0.35 * Math.sin(globalTime * 10 + f.slot);

  ctx.save();
  ctx.strokeStyle = '#c026d3';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.45 * pulse;
  ctx.beginPath();
  ctx.ellipse(cx, Math.round(f.y - def.height * 0.48), def.width * 0.68, def.height * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Rising purple poison bubbles
  for (let i = 0; i < 4; i++) {
    const t = (globalTime * 1.4 + i * 0.25) % 1;
    const bx = Math.round(cx + Math.sin(globalTime * 5 + i * 2.1) * (def.width * 0.45));
    const by = Math.round(f.y - 12 - t * (def.height + 10));
    ctx.globalAlpha = Math.max(0, (1 - t) * 0.8);
    ctx.fillStyle = i % 2 === 0 ? '#a855f7' : '#d946ef';
    ctx.fillRect(bx - 1, by - 1, 3, 3);
  }
  ctx.restore();
}

function renderBleedAndVulnerableOverlay(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  globalTime: number
): void {
  if ((f.bleedTime <= 0 && f.vulnerableTime <= 0) || f.action === 'ko') return;
  const def = CHARACTERS[f.characterId];
  const cx = Math.round(f.x);
  const pulse = 0.6 + 0.35 * Math.sin(globalTime * 12 + f.slot);

  ctx.save();
  if (f.bleedTime > 0) {
    // Stylized crimson aura outline
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.55 * pulse;
    ctx.beginPath();
    ctx.ellipse(cx, Math.round(f.y - def.height * 0.48), def.width * 0.7, def.height * 0.46, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Stylized dripping blood droplets
    for (let i = 0; i < 5; i++) {
      const t = (globalTime * 1.6 + i * 0.21) % 1;
      const bx = Math.round(cx + Math.sin(i * 2.4 + f.slot) * (def.width * 0.42));
      const by = Math.round(f.y - def.height * 0.8 + t * (def.height * 0.78));
      ctx.globalAlpha = Math.max(0, (1 - t * 0.75) * 0.88);
      ctx.fillStyle = i % 2 === 0 ? '#ef4444' : '#991b1b';
      ctx.fillRect(bx - 1, by - 2, 2, 4);
    }
  }

  if (f.vulnerableTime > 0) {
    // Crimson vulnerability diamond marker above head
    const vy = Math.round(f.y - def.height - 14 + Math.sin(globalTime * 9) * 1.5);
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#09070d';
    ctx.beginPath();
    ctx.moveTo(cx, vy - 6);
    ctx.lineTo(cx + 6, vy);
    ctx.lineTo(cx, vy + 6);
    ctx.lineTo(cx - 6, vy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(cx, vy - 4);
    ctx.lineTo(cx + 4, vy);
    ctx.lineTo(cx, vy + 4);
    ctx.lineTo(cx - 4, vy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function renderFighter(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  globalTime: number
): void {
  drawFighterBody(ctx, f, globalTime);
  renderBleedAndVulnerableOverlay(ctx, f, globalTime);
  renderPoisonOverlay(ctx, f, globalTime);
  renderSpecialLockOverlay(ctx, f, globalTime);
}

function drawFighterBody(
  ctx: CanvasRenderingContext2D,
  f: FighterState,
  globalTime: number
): void {
  const def = CHARACTERS[f.characterId];
  const pal = def.palette;

  // Ground drop shadow
  const distFromGround = Math.max(0, GROUND_Y - f.y);
  const shadowScale = Math.max(0.45, 1 - distFromGround / 160);
  ctx.fillStyle = 'rgba(9, 7, 13, 0.55)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND_Y + 2, (def.width * 0.65) * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Status auras behind fighter
  if (f.furyTime > 0 && f.characterId !== 'troll') {
    const pulse = Math.sin(globalTime * 18) * 2;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      Math.round(f.x - def.width * 0.6 - pulse),
      Math.round(f.y - def.height - 4 - pulse),
      Math.round(def.width * 1.2 + pulse * 2),
      Math.round(def.height + 6 + pulse)
    );
  }

  if (f.slowTime > 0) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(Math.round(f.x - def.width * 0.55), Math.round(f.y - def.height), Math.round(def.width * 1.1), def.height);
  }

  // Ninja Pedro high-detail MK3 segmented sprite renderer
  if (f.characterId === 'ninja') {
    const resolved = resolveNinjaFrame(f, globalTime);
    const stripImg = ninjaSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * NINJA_RENDER_SCALE;
      const drawH = sh * NINJA_RENDER_SCALE;
      const dx = -seq.anchorX * NINJA_RENDER_SCALE;
      const dy = -seq.anchorY * NINJA_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(190deg) saturate(1.4)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      // Keep Priest Sacred Shield / Necromancer Root visual overlays readable if applied to Ninja
      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Elfo Arqueiro (Ariel) high-detail segmented sprite renderer
  if (f.characterId === 'elf') {
    const resolved = resolveElfFrame(f, globalTime);
    const stripImg = elfSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * ELF_RENDER_SCALE;
      const drawH = sh * ELF_RENDER_SCALE;
      const dx = -seq.anchorX * ELF_RENDER_SCALE;
      const dy = -seq.anchorY * ELF_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.4)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Sacerdote (Guilherme) high-detail segmented sprite renderer
  if (f.characterId === 'priest') {
    const resolved = resolvePriestFrame(f, globalTime);
    const stripImg = priestSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * PRIEST_RENDER_SCALE;
      const drawH = sh * PRIEST_RENDER_SCALE;
      const dx = -seq.anchorX * PRIEST_RENDER_SCALE;
      const dy = -seq.anchorY * PRIEST_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(185deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        const shieldFx = priestSpriteCache.getFxImage('fx_priest_holy_shield');
        ctx.globalAlpha = 0.48 + Math.sin(globalTime * 10) * 0.14;
        if (shieldFx) {
          const swFx = shieldFx.width * 0.72;
          const shFx = shieldFx.height * 0.72;
          ctx.drawImage(shieldFx, -swFx * 0.5 + 4, -def.height * 0.58 - shFx * 0.5, swFx, shFx);
        } else {
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, -def.height / 2, def.width * 0.85, def.height * 0.65, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Necromante (Lucas) high-detail segmented sprite renderer
  if (f.characterId === 'necromancer') {
    const resolved = resolveNecromancerFrame(f, globalTime);
    const stripImg = necromancerSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * NECROMANCER_RENDER_SCALE;
      const drawH = sh * NECROMANCER_RENDER_SCALE;
      const dx = -seq.anchorX * NECROMANCER_RENDER_SCALE;
      const dy = -seq.anchorY * NECROMANCER_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Minotauro (Wallace) high-detail segmented colossus sprite renderer
  if (f.characterId === 'minotaur') {
    const resolved = resolveMinotaurFrame(f, globalTime);
    const stripImg = minotaurSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * MINOTAUR_RENDER_SCALE;
      const drawH = sh * MINOTAUR_RENDER_SCALE;
      const dx = -seq.anchorX * MINOTAUR_RENDER_SCALE;
      const dy = -seq.anchorY * MINOTAUR_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.furyTime > 0 || f.action === 'victory') {
        const auraImg = minotaurSpriteCache.getFxImage('fx_minotaur_fury_aura');
        if (auraImg) {
          const auraPulse = 0.62 + Math.sin(globalTime * 10) * 0.05;
          const aw = auraImg.width * auraPulse;
          const ah = auraImg.height * auraPulse;
          ctx.save();
          ctx.globalAlpha = f.action === 'victory' ? 0.55 : 0.72;
          ctx.drawImage(auraImg, -aw * 0.5, -ah + 6, aw, ah);
          ctx.restore();
        }
      }

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(180deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -14, -14, 5, 14, '#c084fc');
        pxRect(ctx, 9, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Troll (Kawa) high-detail segmented sprite renderer (Lean Normal Form <-> Muscular Fury Form)
  if (f.characterId === 'troll') {
    const resolved = resolveTrollFrame(f, globalTime);
    const stripImg = trollSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * TROLL_RENDER_SCALE;
      const drawH = sh * TROLL_RENDER_SCALE;
      const dx = -seq.anchorX * TROLL_RENDER_SCALE;
      const dy = -seq.anchorY * TROLL_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX * resolved.bodyScaleX, f.squashY * resolved.bodyScaleY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (resolved.isMuscularForm || f.action === 'victory') {
        const auraImg = trollSpriteCache.getFxImage('fx_troll_fury_aura');
        if (auraImg) {
          const auraPulse = 0.44 + Math.sin(globalTime * 11) * 0.04;
          const aw = auraImg.width * auraPulse;
          const ah = auraImg.height * auraPulse;
          ctx.save();
          ctx.globalAlpha = f.action === 'victory' ? 0.52 : 0.72;
          ctx.drawImage(auraImg, -aw * 0.5, -ah + 6, aw, ah);
          ctx.restore();
        }
      }

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -14, -14, 5, 14, '#c084fc');
        pxRect(ctx, 9, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Jaylon high-detail pixel-art sprite renderer
  if (f.characterId === 'jaylon') {
    const resolved = resolveJaylonFrame(f, globalTime);
    const stripImg = jaylonSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * JAYLON_RENDER_SCALE;
      const drawH = sh * JAYLON_RENDER_SCALE;
      const dx = -seq.anchorX * JAYLON_RENDER_SCALE;
      const dy = -seq.anchorY * JAYLON_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      return;
    }
  }

  // Nikola Tesla high-detail pixel-art sprite renderer
  if (f.characterId === 'tesla') {
    const resolved = resolveTeslaFrame(f, globalTime);
    const stripImg = teslaSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * TESLA_RENDER_SCALE;
      const drawH = sh * TESLA_RENDER_SCALE;
      const dx = -seq.anchorX * TESLA_RENDER_SCALE;
      const dy = -seq.anchorY * TESLA_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Beelzebu high-detail pixel-art sprite renderer
  if (f.characterId === 'beelzebu') {
    const resolved = resolveBeelzebuFrame(f, globalTime);
    const stripImg = beelzebuSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * BEELZEBU_RENDER_SCALE;
      const drawH = sh * BEELZEBU_RENDER_SCALE;
      const dx = -seq.anchorX * BEELZEBU_RENDER_SCALE;
      const dy = -seq.anchorY * BEELZEBU_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Dono do Morro high-detail pixel-art sprite renderer
  if (f.characterId === 'dono') {
    const resolved = resolveDonoFrame(f, globalTime);
    const stripImg = donoSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * DONO_RENDER_SCALE;
      const drawH = sh * DONO_RENDER_SCALE;
      const dx = -seq.anchorX * DONO_RENDER_SCALE;
      const dy = -seq.anchorY * DONO_RENDER_SCALE;

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = resolved.alpha;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Adão high-detail pixel-art sprite renderer
  if (f.characterId === 'adao') {
    const resolved = resolveAdaoFrame(f, globalTime);
    const stripImg = adaoSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * ADAO_RENDER_SCALE;
      const drawH = sh * ADAO_RENDER_SCALE;
      const dx = -seq.anchorX * ADAO_RENDER_SCALE;
      const dy = -seq.anchorY * ADAO_RENDER_SCALE;

      // Ground glow ring when holding a copied skill or charging Time Transcending Fist
      if (f.adaoChargingSpecial3) {
        const pct = Math.min(1, f.adaoChargeTime / ADAO_SPECIAL3_CHARGE_DURATION);
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.28 * Math.sin(globalTime * 22);
        const rad = 22 + pct * 14;
        const grad = ctx.createRadialGradient(Math.round(f.x), Math.round(f.y - 34), 4, Math.round(f.x), Math.round(f.y - 34), rad);
        grad.addColorStop(0, 'rgba(233, 213, 255, 0.72)');
        grad.addColorStop(0.55, 'rgba(147, 51, 234, 0.48)');
        grad.addColorStop(1, 'rgba(147, 51, 234, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(Math.round(f.x), Math.round(f.y - 34), rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (f.adaoCopiedCharacterId && f.action !== 'ko') {
        ctx.save();
        ctx.globalAlpha = 0.35 + 0.15 * Math.sin(globalTime * 10);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(Math.round(f.x), GROUND_Y + 1, 16, 4.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = 1;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();

      // Overhead 2.0s Time Transcending Fist charge bar
      if (f.adaoChargingSpecial3) {
        const pct = Math.max(0, Math.min(1, f.adaoChargeTime / ADAO_SPECIAL3_CHARGE_DURATION));
        const barW = 34;
        const barH = 5;
        const bx = Math.round(f.x - barW * 0.5);
        const by = Math.round(f.y - def.height - 15);
        ctx.save();
        ctx.fillStyle = '#09070d';
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = '#2e1065';
        ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = pct >= 0.85 ? '#fde047' : '#a855f7';
        ctx.fillRect(bx, by, Math.round(barW * pct), barH);
        ctx.restore();
      }

      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Jack Estripador high-detail pixel-art sprite renderer
  if (f.characterId === 'jack') {
    const resolved = resolveJackFrame(f, globalTime);
    const stripImg = jackSpriteCache.getSequenceImage(resolved.sequence.key);
    if (stripImg) {
      const seq = resolved.sequence;
      const sx = resolved.frameIndex * seq.frameWidth;
      const sy = 0;
      const sw = seq.frameWidth;
      const sh = seq.frameHeight;
      const drawW = sw * JACK_RENDER_SCALE;
      const drawH = sh * JACK_RENDER_SCALE;
      const dx = -seq.anchorX * JACK_RENDER_SCALE;
      const dy = -seq.anchorY * JACK_RENDER_SCALE;

      // Dark crimson aura during Olho da Alma (Special 2)
      if (f.action === 'special2') {
        ctx.save();
        const pulse = 0.42 + 0.25 * Math.sin(globalTime * 22);
        ctx.globalAlpha = pulse;
        const grad = ctx.createRadialGradient(
          Math.round(f.x),
          Math.round(f.y - 38),
          6,
          Math.round(f.x),
          Math.round(f.y - 38),
          36
        );
        grad.addColorStop(0, 'rgba(220, 38, 38, 0.85)');
        grad.addColorStop(0.55, 'rgba(127, 29, 29, 0.48)');
        grad.addColorStop(1, 'rgba(127, 29, 29, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(Math.round(f.x), Math.round(f.y - 38), 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(Math.round(f.x), Math.round(f.y));
      ctx.scale(f.facing * f.squashX, f.squashY);
      ctx.globalAlpha = 1;
      const prevSmooth = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = true;

      if (f.hitFlashTime > 0) {
        ctx.filter = 'brightness(2.4) contrast(1.2)';
      } else if (f.slowTime > 0) {
        ctx.filter = 'hue-rotate(175deg) saturate(1.35)';
      }

      ctx.drawImage(stripImg, sx, sy, sw, sh, dx, dy, drawW, drawH);

      ctx.filter = 'none';
      ctx.imageSmoothingEnabled = prevSmooth;

      // Glowing crimson Soul Eye glint on Jack's eye during Special 2
      if (f.action === 'special2' && f.hitFlashTime <= 0) {
        const eyeX = 5;
        const eyeY = -63.5;
        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.55)';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fecaca';
        ctx.beginPath();
        ctx.moveTo(eyeX - 3.4, eyeY);
        ctx.lineTo(eyeX, eyeY - 0.55);
        ctx.lineTo(eyeX + 3.4, eyeY);
        ctx.lineTo(eyeX, eyeY + 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY - 2.2);
        ctx.lineTo(eyeX + 0.5, eyeY);
        ctx.lineTo(eyeX, eyeY + 2.2);
        ctx.lineTo(eyeX - 0.5, eyeY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      if (f.shieldTime > 0) {
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
        ctx.beginPath();
        ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (f.rootTime > 0) {
        pxRect(ctx, -12, -14, 5, 14, '#c084fc');
        pxRect(ctx, 7, -14, 5, 14, '#c084fc');
      }

      ctx.restore();
      if (f.stunTime > 0) {
        const starsImg = jaylonSpriteCache.getFxImage('fx_jaylon_stun_stars');
        if (starsImg) {
          const swS = starsImg.width * 0.4;
          const shS = starsImg.height * 0.4;
          const bob = Math.sin(globalTime * 10) * 2;
          ctx.drawImage(starsImg, Math.round(f.x - swS * 0.5), Math.round(f.y - def.height - 24 + bob), swS, shS);
        }
      }
      return;
    }
  }

  // Victory Finisher background cinematic elements (before fighter draw)
  if (f.action === 'victory') {
    if (f.characterId === 'necromancer') {
      // Colossal spectral creature rising behind Lucas!
      const rise = Math.min(1, f.actionTime / 0.8);
      const specH = Math.round(86 * rise);
      const sx = Math.round(f.x - f.facing * 6);
      const sy = Math.round(f.y - specH - 12);
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(sx - 24, sy, 48, specH);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(sx - 18, sy + 6, 36, specH - 10);
      // Giant horned skull head
      ctx.fillStyle = '#1e1030';
      ctx.fillRect(sx - 14, sy - 16, 28, 22);
      ctx.fillStyle = '#e879f9';
      ctx.fillRect(sx - 8, sy - 9, 5, 4);
      ctx.fillRect(sx + 3, sy - 9, 5, 4);
      // Spectral claws
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(sx - 34, sy + 16, 10, 26);
      ctx.fillRect(sx + 24, sy + 16, 10, 26);
      ctx.restore();
    } else if (f.characterId === 'priest') {
      // Celestial column of light
      const beamW = 28 + Math.round(Math.sin(globalTime * 16) * 4);
      ctx.save();
      ctx.globalAlpha = 0.48;
      ctx.fillStyle = '#fde047';
      ctx.fillRect(Math.round(f.x - beamW / 2), 0, beamW, GROUND_Y);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(f.x - beamW / 4), 0, Math.round(beamW / 2), GROUND_Y);
      ctx.restore();
    } else if (f.characterId === 'ninja' && f.actionTime < 0.55) {
      // Smoke cloud vanish at start of ninja finisher
      ctx.save();
      ctx.globalAlpha = 0.75 * (1 - f.actionTime / 0.55);
      ctx.fillStyle = '#cbd5e1';
      for (let i = 0; i < 6; i++) {
        const ang = i + globalTime * 6;
        ctx.fillRect(
          Math.round(f.x + Math.cos(ang) * 14 - 8),
          Math.round(f.y - 26 + Math.sin(ang) * 14 - 8),
          16,
          16
        );
      }
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(Math.round(f.x), Math.round(f.y));
  ctx.scale(f.facing * f.squashX * 1.24, f.squashY * 1.24);

  // Knockdown / KO lie-down rotation
  if (f.action === 'ko' || f.action === 'knockdown') {
    ctx.translate(0, -10);
    ctx.rotate(-Math.PI / 2.2);
  }

  const isCrouch = f.action === 'crouch' || f.action === 'crouch_punch' || f.action === 'crouch_kick';
  const isHit = f.action === 'hitstun' || f.action === 'grabbed';
  const isBlock = f.action === 'block';
  const isBig = f.characterId === 'minotaur' || f.characterId === 'troll';

  const bodyW = isBig ? 20 : 14;
  const bodyH = isCrouch ? (isBig ? 16 : 13) : isBig ? 24 : 20;
  const legH = isCrouch ? 10 : isBig ? 18 : 16;
  const headSize = isBig ? 13 : 11;

  const breath = f.action === 'idle' ? Math.round(Math.sin(globalTime * 6 + f.slot) * 1) : 0;
  const stride = f.action === 'walk' ? Math.sin(f.walkDistance * 0.28) : 0;
  const crouchDrop = isCrouch ? 11 : 0;

  const hipY = -legH + crouchDrop * 0.35;
  const torsoTop = hipY - bodyH + breath;
  const headTop = torsoTop - headSize - 1;

  // Hit flash override
  const flash = f.hitFlashTime > 0;
  const cSkin = flash ? '#ffffff' : pal.skin;
  const cPrim = flash ? '#ffffff' : pal.primary;
  const cSec = flash ? '#ffffff' : pal.secondary;
  const cAcc = flash ? '#ffffff' : pal.accent;

  // Ninja smoke flicker during vanish
  if (f.characterId === 'ninja' && f.action === 'victory' && f.actionTime < 0.35) {
    ctx.globalAlpha = 0.25;
  }

  // Cape / Headband / Hair trailing behind
  if (f.characterId === 'ninja') {
    const wave = Math.round(Math.sin(globalTime * 10) * 2);
    pxRect(ctx, -14, headTop + 2 + wave, 8, 3, cSec);
    pxRect(ctx, -18, headTop + 4 - wave, 6, 2, cSec);
  } else if (f.characterId === 'necromancer') {
    pxRect(ctx, -11, torsoTop + 2, 7, bodyH + 10, pal.primaryDark);
  } else if (f.characterId === 'elf') {
    pxRect(ctx, -9, headTop + 2, 5, 13, '#fde047'); // long golden hair
    pxRect(ctx, -10, torsoTop + 2, 6, bodyH + 4, pal.primaryDark); // ranger cloak
  } else if (f.characterId === 'priest') {
    pxRect(ctx, -9, torsoTop + 2, 6, bodyH + 8, cSec); // gold stole/cape
  }

  // Legs (back leg then front leg)
  const legW = isBig ? 7 : 5;
  const backLegX = -Math.round(bodyW * 0.36) - Math.round(stride * 5);
  const frontLegX = Math.round(bodyW * 0.1) + Math.round(stride * 5);

  if (f.action === 'kick' || f.action === 'crouch_kick' || f.action === 'air_kick') {
    // Planted back leg + extended kicking front leg!
    pxRect(ctx, -4, hipY, legW, legH, pal.primaryDark);
    const kickY = f.action === 'crouch_kick' ? -6 : f.action === 'air_kick' ? -18 : -22;
    pxRect(ctx, 4, kickY, 18, 6, cPrim);
    pxRect(ctx, 18, kickY - 1, 6, 7, cSec);
  } else {
    pxRect(ctx, backLegX, hipY, legW, legH - crouchDrop * 0.3, pal.primaryDark);
    pxRect(ctx, frontLegX, hipY, legW, legH - crouchDrop * 0.3, cPrim);
    // Boots / Hooves
    pxRect(ctx, backLegX - 1, -4, legW + 2, 4, isBig ? '#292524' : cSec);
    pxRect(ctx, frontLegX - 1, -4, legW + 2, 4, isBig ? '#292524' : cSec);
  }

  // Torso
  const torsoTilt = isHit ? -3 : f.action === 'special1' || f.currentMove?.kind === 'rush' ? 3 : 0;
  pxRect(ctx, -bodyW / 2 + torsoTilt, torsoTop, bodyW, bodyH, cPrim);

  // Character-specific torso details
  if (f.characterId === 'minotaur') {
    // Gladiator shoulder pad & golden belt
    pxRect(ctx, -bodyW / 2 - 2 + torsoTilt, torsoTop, 8, 8, cSec);
    pxRect(ctx, -bodyW / 2 + torsoTilt, hipY - 4, bodyW, 4, cAcc);
  } else if (f.characterId === 'troll') {
    // Muscular green chest & diagonal bone strap
    pxRect(ctx, -bodyW / 2 + torsoTilt, torsoTop, bodyW, bodyH - 4, cSkin);
    pxRect(ctx, -bodyW / 2 + torsoTilt, torsoTop + 2, bodyW, 4, '#a8a29e');
    pxRect(ctx, -bodyW / 2 + torsoTilt, hipY - 5, bodyW, 5, pal.primaryDark);
  } else if (f.characterId === 'priest') {
    // White vestments & golden cross emblem
    pxRect(ctx, -2 + torsoTilt, torsoTop + 3, 4, bodyH - 6, cSec);
    pxRect(ctx, -5 + torsoTilt, torsoTop + 6, 10, 3, cSec);
  } else if (f.characterId === 'ninja') {
    // Crimson sash
    pxRect(ctx, -bodyW / 2 + torsoTilt, hipY - 4, bodyW, 3, cSec);
    pxRect(ctx, -2 + torsoTilt, torsoTop + 3, 4, bodyH - 7, cSec);
  } else if (f.characterId === 'elf') {
    // Emerald tunic & gold trim
    pxRect(ctx, -bodyW / 2 + torsoTilt, hipY - 3, bodyW, 3, cSec);
  } else if (f.characterId === 'necromancer') {
    // Purple glowing chest rune
    pxRect(ctx, -2 + torsoTilt, torsoTop + 5, 4, 6, cAcc);
  }

  // Head
  const headX = -headSize / 2 + torsoTilt;
  if (f.characterId === 'minotaur') {
    pxRect(ctx, headX, headTop, headSize, headSize, cSkin);
    // Snout & nose ring
    pxRect(ctx, headX + 6, headTop + 6, 8, 6, pal.skinShadow);
    pxRect(ctx, headX + 11, headTop + 10, 3, 3, '#fbbf24');
    // Huge curved ivory horns!
    pxRect(ctx, headX - 5, headTop - 5, 5, 7, '#fef3c7');
    pxRect(ctx, headX + headSize - 1, headTop - 6, 5, 8, '#fef3c7');
    pxRect(ctx, headX + headSize + 2, headTop - 9, 3, 5, '#fef3c7');
  } else if (f.characterId === 'troll') {
    pxRect(ctx, headX, headTop, headSize, headSize, cSkin);
    // Heavy brow & protruding tusks!
    pxRect(ctx, headX + 2, headTop - 2, headSize - 2, 4, pal.skinShadow);
    pxRect(ctx, headX + 8, headTop + 8, 3, 4, '#fef3c7');
    pxRect(ctx, headX + 11, headTop + 7, 2, 4, '#fef3c7');
  } else if (f.characterId === 'ninja') {
    pxRect(ctx, headX, headTop, headSize, headSize, cPrim);
    pxRect(ctx, headX, headTop + 2, headSize, 3, cSec); // headband
    pxRect(ctx, headX + 3, headTop + 5, 7, 3, cSkin); // eye slit
  } else if (f.characterId === 'necromancer') {
    pxRect(ctx, headX - 1, headTop - 1, headSize + 2, headSize + 2, cPrim);
    pxRect(ctx, headX + 2, headTop + 3, headSize - 2, headSize - 3, '#09070d'); // hood shadow
  } else if (f.characterId === 'elf') {
    pxRect(ctx, headX, headTop, headSize, headSize, cSkin);
    pxRect(ctx, headX - 1, headTop - 1, headSize + 1, 4, '#fde047'); // golden hair crown
    pxRect(ctx, headX - 4, headTop + 3, 4, 3, cSkin); // pointed elf ear
  } else if (f.characterId === 'priest') {
    pxRect(ctx, headX, headTop, headSize, headSize, cSkin);
    pxRect(ctx, headX - 1, headTop - 3, headSize + 2, 4, cSec); // golden circlet/mitre
  }

  // Glowing / sharp eyes
  if (!flash) {
    ctx.fillStyle = pal.eye;
    ctx.fillRect(Math.round(headX + headSize - 4), Math.round(headTop + 5), 2, 2);
    if (f.characterId === 'necromancer') {
      ctx.fillRect(Math.round(headX + headSize - 7), Math.round(headTop + 5), 2, 2);
    }
  }

  // Arms & Weapons based on action
  const armW = isBig ? 6 : 4;
  const armY = torsoTop + 3;

  if (isBlock) {
    // Raised defensive guard arms + shield glint
    pxRect(ctx, 3, armY - 4, 6, 14, cSec);
    ctx.strokeStyle = f.characterId === 'priest' ? '#fde047' : '#93c5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(10, armY + 4, 14, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  } else if (f.action === 'punch' || f.action === 'crouch_punch' || f.action === 'grab_attempt' || f.action === 'grab_throw') {
    // Extended punching arm!
    pxRect(ctx, 2, armY, 17, armW, cSkin);
    pxRect(ctx, 16, armY - 1, 5, armW + 2, cSec);
  } else if (f.characterId === 'troll' && f.action === 'victory') {
    // Unique play-once Troll victory: feral chest-beat (0..0.7s) into mighty roar pose (0.7s+)
    const t = Math.max(0, f.actionTime);
    if (t < 0.72) {
      const beatPhase = Math.floor(t * 9) % 2;
      const leftUp = beatPhase === 0 ? -2 : 4;
      const rightUp = beatPhase === 1 ? -2 : 4;
      pxRect(ctx, -2, armY + leftUp, 8, armW + 1, cSkin);
      pxRect(ctx, -8, armY + rightUp, 8, armW + 1, pal.skinShadow);
    } else {
      // Triumphant raised roar holding final frame
      pxRect(ctx, 4, armY - 14, armW + 1, 16, cSkin);
      pxRect(ctx, -10, armY - 14, armW + 1, 16, pal.skinShadow);
      // Roaring jaw highlight
      pxRect(ctx, headX + 7, headTop + 8, 6, 4, '#7f1d1d');
      pxRect(ctx, headX + 8, headTop + 7, 2, 4, '#fef3c7');
      pxRect(ctx, headX + 11, headTop + 7, 2, 4, '#fef3c7');
    }
  } else if (
    f.action === 'special1' ||
    f.action === 'special2' ||
    f.action === 'special3' ||
    f.action === 'special4' ||
    f.action === 'victory'
  ) {
    // Raised casting / weapon strike pose
    const poseUp = f.action === 'victory' ? -10 : -4;
    pxRect(ctx, 2, armY + poseUp, 13, armW, cSkin);

    // Character weapon/prop!
    if (f.characterId === 'elf') {
      // Glowing curved bow!
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(12, armY + poseUp + 2, 12, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
    } else if (f.characterId === 'necromancer') {
      // Skull-topped staff
      pxRect(ctx, 13, armY + poseUp - 16, 3, 30, '#475569');
      pxRect(ctx, 11, armY + poseUp - 20, 7, 6, '#e2e8f0');
      pxRect(ctx, 13, armY + poseUp - 18, 3, 2, '#a855f7');
    } else if (f.characterId === 'priest') {
      // Radiant golden staff
      pxRect(ctx, 13, armY + poseUp - 16, 3, 30, '#eab308');
      pxRect(ctx, 11, armY + poseUp - 21, 7, 7, '#fef08a');
    } else if (f.characterId === 'ninja') {
      // Shinobi blade
      pxRect(ctx, 13, armY + poseUp - 2, 14, 3, '#e2e8f0');
    }
  } else {
    // Guard stance / weapon carry
    pxRect(ctx, 1, armY + 2, 9, armW, cSkin);
    pxRect(ctx, -7, armY + 3, 6, armW, pal.skinShadow);
    if (f.characterId === 'necromancer') {
      pxRect(ctx, 8, armY - 12, 2, 26, '#475569');
      pxRect(ctx, 7, armY - 15, 5, 4, '#c084fc');
    } else if (f.characterId === 'priest') {
      pxRect(ctx, 8, armY - 12, 2, 26, '#eab308');
      pxRect(ctx, 7, armY - 15, 5, 4, '#fef08a');
    } else if (f.characterId === 'elf') {
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(9, armY + 2, 9, -Math.PI * 0.4, Math.PI * 0.4);
      ctx.stroke();
    }
  }

  // Priest Sacred Shield active barrier
  if (f.shieldTime > 0) {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.72 + Math.sin(globalTime * 12) * 0.2;
    ctx.beginPath();
    ctx.ellipse(0, -def.height / 2, def.width * 0.78, def.height * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.14)';
    ctx.fill();
  }

  // Necromancer Underworld Root visual shackles
  if (f.rootTime > 0) {
    pxRect(ctx, -12, -14, 5, 14, '#c084fc');
    pxRect(ctx, 7, -14, 5, 14, '#c084fc');
  }

  ctx.restore();
}

export function renderPortrait(
  ctx: CanvasRenderingContext2D,
  charId: CharacterId,
  flip = false
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const def = CHARACTERS[charId];
  const pal = def.palette;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  // Dark gradient backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, pal.primaryDark);
  bg.addColorStop(1, '#09070d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Diagonal dramatic highlight stripe
  ctx.fillStyle = pal.secondary;
  ctx.globalAlpha = 0.28;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.65, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w * 0.35, h);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw crisp 32x32 pixel bust scaled cleanly to canvas
  const unit = w / 32;
  ctx.save();
  if (flip) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  const p = (x: number, y: number, pw: number, ph: number, col: string, outline = true) => {
    if (outline) {
      ctx.fillStyle = '#09070d';
      ctx.fillRect(Math.floor((x - 1) * unit), Math.floor((y - 1) * unit), Math.ceil((pw + 2) * unit), Math.ceil((ph + 2) * unit));
    }
    ctx.fillStyle = col;
    ctx.fillRect(Math.floor(x * unit), Math.floor(y * unit), Math.ceil(pw * unit), Math.ceil(ph * unit));
  };

  // Shoulders
  p(5, 22, 22, 10, pal.primary);
  p(8, 22, 16, 4, pal.secondary, false);

  // Head
  p(9, 8, 14, 14, pal.skin);

  if (charId === 'ninja') {
    p(9, 8, 14, 14, pal.primary);
    p(8, 10, 16, 3, pal.secondary); // headband
    p(12, 13, 9, 4, pal.skin, false); // mask opening
    p(14, 14, 2, 2, pal.eye, false);
    p(18, 14, 2, 2, pal.eye, false);
  } else if (charId === 'minotaur') {
    p(4, 4, 4, 7, '#fef3c7'); // left horn
    p(24, 4, 4, 7, '#fef3c7'); // right horn
    p(8, 9, 16, 13, pal.skin);
    p(12, 16, 10, 6, pal.skinShadow, false);
    p(15, 20, 4, 3, '#fbbf24', false); // nose ring
    p(12, 12, 2, 2, pal.eye, false);
    p(19, 12, 2, 2, pal.eye, false);
  } else if (charId === 'elf') {
    p(7, 7, 4, 16, '#fde047'); // long hair
    p(9, 6, 14, 5, '#fde047');
    p(6, 12, 3, 3, pal.skin); // elf ear
    p(13, 13, 2, 2, pal.eye, false);
    p(18, 13, 2, 2, pal.eye, false);
  } else if (charId === 'necromancer') {
    p(7, 6, 18, 17, pal.primary);
    p(10, 10, 12, 11, '#09070d', false);
    p(13, 14, 2, 2, pal.eye, false);
    p(18, 14, 2, 2, pal.eye, false);
  } else if (charId === 'priest') {
    p(8, 5, 16, 5, pal.secondary); // golden crown
    p(14, 3, 4, 3, '#fef08a');
    p(13, 13, 2, 2, pal.eye, false);
    p(18, 13, 2, 2, pal.eye, false);
  } else if (charId === 'troll') {
    p(8, 7, 16, 15, pal.skin);
    p(9, 7, 14, 4, pal.skinShadow, false);
    p(11, 18, 3, 5, '#fef3c7'); // left tusk
    p(19, 18, 3, 5, '#fef3c7'); // right tusk
    p(13, 12, 2, 2, pal.eye, false);
    p(18, 12, 2, 2, pal.eye, false);
  }

  ctx.restore();
}
