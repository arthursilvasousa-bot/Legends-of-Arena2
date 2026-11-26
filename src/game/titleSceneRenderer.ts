import { QualityProfile } from './settings';
import { IntroPhases } from './titleMenuHelpers';

export const TITLE_WIDTH = 640;
export const TITLE_HEIGHT = 360;

interface Star {
  x: number;
  y: number;
  size: 1 | 2;
  phase: number;
  speed: number;
  color: string;
}

interface CloudInstance {
  x: number;
  y: number;
  spriteIdx: number;
  layer: 0 | 1 | 2; // 0 = high dark storm cloud, 1 = mid moon-crossing wisp, 2 = lower crimson-lit cloud
  speed: number;
  alpha: number;
  scaleX: number;
  scaleY: number;
}

interface TitleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: 1 | 2;
  color: string;
  phase: number;
  alpha: number;
  aroundLogo: boolean;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class TitleSceneRenderer {
  private moonCanvas: HTMLCanvasElement | null = null;
  private moonHaloCanvas: HTMLCanvasElement | null = null;
  private skyCanvas: HTMLCanvasElement | null = null;
  private horizonGlowCanvas: HTMLCanvasElement | null = null;
  private footerVignetteCanvas: HTMLCanvasElement | null = null;
  private cloudSprites: HTMLCanvasElement[] | null = null;

  private stars: Star[] = [];
  private clouds: CloudInstance[] = [];
  private particles: TitleParticle[] = [];

  constructor() {
    this.initProceduralData();
  }

  private initProceduralData(): void {
    const rand = seededRand(20260309);
    const starColors = ['#e0f2fe', '#c7d2fe', '#f5d0fe', '#fef08a'];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.floor(rand() * TITLE_WIDTH),
        y: Math.floor(rand() * 205),
        size: rand() > 0.84 ? 2 : 1,
        phase: rand() * Math.PI * 2,
        speed: 1.2 + rand() * 2.5,
        color: starColors[Math.floor(rand() * starColors.length)],
      });
    }

    // Upper dark storm clouds framing top-left and top-right (leaving center moon bright)
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? 0 : 1;
      const xPos = side === 0 ? -20 + rand() * 210 : 430 + rand() * 220;
      this.clouds.push({
        x: xPos,
        y: 16 + rand() * 92,
        spriteIdx: i % 3,
        layer: 0,
        speed: 2.2 + rand() * 2.4,
        alpha: 0.8 + rand() * 0.14,
        scaleX: 1,
        scaleY: 1,
      });
    }

    // Mid drifting wisps crossing in front of the moon
    for (let i = 0; i < 6; i++) {
      this.clouds.push({
        x: rand() * (TITLE_WIDTH + 180) - 90,
        y: 18 + rand() * 112,
        spriteIdx: 3 + (i % 2),
        layer: 1,
        speed: 5.0 + rand() * 4.5,
        alpha: 0.36 + rand() * 0.2,
        scaleX: 1,
        scaleY: 1,
      });
    }

    // Lower violet/crimson horizon clouds
    for (let i = 0; i < 8; i++) {
      this.clouds.push({
        x: rand() * (TITLE_WIDTH + 180) - 90,
        y: 148 + rand() * 82,
        spriteIdx: 5 + (i % 2),
        layer: 2,
        speed: 3.5 + rand() * 4.0,
        alpha: 0.68 + rand() * 0.22,
        scaleX: 1,
        scaleY: 1,
      });
    }

    // Pooled floating energy particles (around logo & horizon)
    const particleColors = ['#a855f7', '#60a5fa', '#e879f9', '#facc15', '#f472b6'];
    for (let i = 0; i < 64; i++) {
      const aroundLogo = i < 28;
      this.particles.push({
        x: aroundLogo ? 100 + rand() * 440 : rand() * TITLE_WIDTH,
        y: aroundLogo ? 22 + rand() * 155 : 70 + rand() * 260,
        vx: (rand() - 0.5) * 9,
        vy: -(5 + rand() * 13),
        size: rand() > 0.74 ? 2 : 1,
        color: particleColors[Math.floor(rand() * particleColors.length)],
        phase: rand() * Math.PI * 2,
        alpha: 0.4 + rand() * 0.55,
        aroundLogo,
      });
    }
  }

  private ensureSkyCanvas(): HTMLCanvasElement | null {
    if (this.skyCanvas || typeof document === 'undefined') return this.skyCanvas;
    const c = document.createElement('canvas');
    c.width = TITLE_WIDTH;
    c.height = TITLE_HEIGHT;
    const ctx = c.getContext('2d');
    if (!ctx) return null;

    const stops = [
      { y: 0, r: 5, g: 7, b: 24 },
      { y: 78, r: 12, g: 16, b: 56 },
      { y: 156, r: 30, g: 16, b: 78 },
      { y: 218, r: 78, g: 18, b: 98 },
      { y: 256, r: 178, g: 24, b: 92 },
      { y: 282, r: 214, g: 44, b: 84 },
      { y: 312, r: 68, g: 16, b: 68 },
      { y: 360, r: 7, g: 6, b: 18 },
    ];

    const img = ctx.createImageData(TITLE_WIDTH, TITLE_HEIGHT);
    const data = img.data;
    const bayer = [
      [0, 2],
      [3, 1],
    ];

    for (let y = 0; y < TITLE_HEIGHT; y++) {
      let s0 = stops[0];
      let s1 = stops[stops.length - 1];
      for (let k = 0; k < stops.length - 1; k++) {
        if (y >= stops[k].y && y <= stops[k + 1].y) {
          s0 = stops[k];
          s1 = stops[k + 1];
          break;
        }
      }
      const span = Math.max(1, s1.y - s0.y);
      const t = (y - s0.y) / span;
      const quant = Math.floor(t * 10);
      const frac = t * 10 - quant;

      for (let x = 0; x < TITLE_WIDTH; x++) {
        const dither = frac > (bayer[y & 1][x & 1] + 0.5) / 4 ? 1 : 0;
        const qt = Math.min(1, (quant + dither) / 10);
        const idx = (y * TITLE_WIDTH + x) * 4;
        data[idx] = Math.round(s0.r + (s1.r - s0.r) * qt);
        data[idx + 1] = Math.round(s0.g + (s1.g - s0.g) * qt);
        data[idx + 2] = Math.round(s0.b + (s1.b - s0.b) * qt);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.skyCanvas = c;
    return c;
  }

  private ensureMoonCanvas(): HTMLCanvasElement | null {
    if (this.moonCanvas || typeof document === 'undefined') return this.moonCanvas;
    const size = 148;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return null;

    const img = ctx.createImageData(size, size);
    const data = img.data;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 64;

    const craters = [
      { x: -22, y: -12, r: 17, d: 0.26 },
      { x: 18, y: -20, r: 13, d: 0.22 },
      { x: -6, y: 12, r: 20, d: 0.28 },
      { x: 25, y: 15, r: 15, d: 0.24 },
      { x: -30, y: 19, r: 11, d: 0.2 },
      { x: 4, y: -30, r: 12, d: 0.18 },
      { x: -15, y: -3, r: 8, d: 0.34 },
      { x: 11, y: 28, r: 9, d: 0.26 },
    ];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;

        const idx = (y * size + x) * 4;
        const edge = dist / radius;
        let shade = 1.0 - Math.pow(edge, 2.2) * 0.26;

        const px = Math.floor(dx / 2) * 2;
        const py = Math.floor(dy / 2) * 2;
        for (const cr of craters) {
          const cd = Math.sqrt((px - cr.x) * (px - cr.x) + (py - cr.y) * (py - cr.y));
          if (cd < cr.r) {
            const inner = 1 - cd / cr.r;
            shade -= cr.d * (0.5 + 0.5 * inner);
          }
        }
        const hash = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
        const n = hash - Math.floor(hash);
        if (n > 0.72) shade -= 0.08;
        if (n < 0.22) shade += 0.06;

        if (shade > 0.92) {
          data[idx] = 242; data[idx + 1] = 248; data[idx + 2] = 255;
        } else if (shade > 0.78) {
          data[idx] = 206; data[idx + 1] = 225; data[idx + 2] = 255;
        } else if (shade > 0.62) {
          data[idx] = 160; data[idx + 1] = 186; data[idx + 2] = 248;
        } else if (shade > 0.45) {
          data[idx] = 116; data[idx + 1] = 140; data[idx + 2] = 224;
        } else {
          data[idx] = 84; data[idx + 1] = 102; data[idx + 2] = 190;
        }
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    this.moonCanvas = c;
    return c;
  }

  private ensurePrebakedEffects(): void {
    if (typeof document === 'undefined') return;

    if (!this.moonHaloCanvas) {
      const c = document.createElement('canvas');
      c.width = 290;
      c.height = 290;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(145, 145, 52, 145, 145, 145);
        g.addColorStop(0, 'rgba(147, 197, 253, 0.78)');
        g.addColorStop(0.42, 'rgba(59, 130, 246, 0.34)');
        g.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 290, 290);
      }
      this.moonHaloCanvas = c;
    }

    if (!this.horizonGlowCanvas) {
      const c = document.createElement('canvas');
      c.width = TITLE_WIDTH;
      c.height = 220;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(320, 148, 28, 320, 148, 340);
        g.addColorStop(0, 'rgba(244, 63, 94, 0.34)');
        g.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
        g.addColorStop(1, 'rgba(15, 10, 35, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, TITLE_WIDTH, 220);
      }
      this.horizonGlowCanvas = c;
    }

    if (!this.footerVignetteCanvas) {
      const c = document.createElement('canvas');
      c.width = TITLE_WIDTH;
      c.height = 70;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, 70);
        g.addColorStop(0, 'rgba(6, 5, 14, 0)');
        g.addColorStop(1, 'rgba(5, 4, 12, 0.78)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, TITLE_WIDTH, 70);
      }
      this.footerVignetteCanvas = c;
    }
  }

  private ensureCloudSprites(): HTMLCanvasElement[] {
    if (this.cloudSprites || typeof document === 'undefined') return this.cloudSprites ?? [];
    const specs = [
      // 0..2: High dark indigo storm clouds with cobalt rim highlights
      { w: 128, h: 42, body: '#090e2c', mid: '#121f54', rim: '#2a56b8', seed: 11 },
      { w: 152, h: 46, body: '#0a0f32', mid: '#16245e', rim: '#3266d1', seed: 23 },
      { w: 112, h: 38, body: '#080c28', mid: '#111d4f', rim: '#254fa8', seed: 37 },
      // 3..4: Mid moon-crossing wisps
      { w: 136, h: 30, body: '#1f235c', mid: '#384694', rim: '#7ba3f7', seed: 53 },
      { w: 110, h: 26, body: '#1a1d52', mid: '#313d87', rim: '#6d94ed', seed: 71 },
      // 5..6: Lower horizon clouds tinted violet/crimson underneath
      { w: 156, h: 40, body: '#1b0d3e', mid: '#3d1666', rim: '#be185d', seed: 89 },
      { w: 132, h: 36, body: '#210e47', mid: '#4c1873', rim: '#db2777', seed: 103 },
    ];

    this.cloudSprites = specs.map((sp, idx) => {
      const c = document.createElement('canvas');
      c.width = sp.w;
      c.height = sp.h;
      const ctx = c.getContext('2d');
      if (!ctx) return c;

      const rand = seededRand(sp.seed);
      const img = ctx.createImageData(sp.w, sp.h);
      const data = img.data;

      // Build organic billowy cloud mask from irregular overlapping puffs
      const puffs: Array<{ x: number; y: number; rx: number; ry: number }> = [];
      const puffCount = 9;
      for (let i = 0; i < puffCount; i++) {
        const t = i / (puffCount - 1);
        const px = 16 + t * (sp.w - 32);
        const arch = Math.sin(t * Math.PI);
        const py = sp.h * 0.62 - arch * sp.h * 0.28 + (rand() - 0.5) * 9;
        const rx = 11 + arch * 12 + rand() * 9;
        const ry = 6 + arch * 9 + rand() * 5;
        puffs.push({ x: px, y: py, rx, ry });
      }

      const hexToRgb = (hex: string): [number, number, number] => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
      ];
      const cBody = hexToRgb(sp.body);
      const cMid = hexToRgb(sp.mid);
      const cRim = hexToRgb(sp.rim);
      const isHorizonCloud = idx >= 5;

      for (let y = 0; y < sp.h; y++) {
        for (let x = 0; x < sp.w; x++) {
          const qx = (x >> 1) * 2 + 1;
          const qy = (y >> 1) * 2 + 1;
          let maxField = 0;
          for (const pf of puffs) {
            const dx = (qx - pf.x) / pf.rx;
            const dy = (qy - pf.y) / pf.ry;
            const f = 1 - (dx * dx + dy * dy);
            if (f > maxField) maxField = f;
          }
          // Pixel noise edge breakup so clouds look organically dithered, never oval
          const hash = Math.sin(qx * 17.13 + qy * 43.71 + sp.seed) * 43758.5453;
          const noise = hash - Math.floor(hash);
          maxField += (noise - 0.5) * 0.22;
          if (qy > sp.h * 0.74) maxField -= (qy - sp.h * 0.74) * 0.09;
          if (maxField <= 0.14) continue;

          const o = (y * sp.w + x) * 4;
          const relY = qy / sp.h;
          let rgb = cBody;
          if (isHorizonCloud) {
            if (relY > 0.6 || (maxField < 0.28 && relY > 0.45)) rgb = cRim;
            else if (relY > 0.36) rgb = cMid;
          } else {
            if (relY < 0.38 && maxField < 0.46) rgb = cRim;
            else if (relY < 0.58) rgb = cMid;
          }
          data[o] = rgb[0];
          data[o + 1] = rgb[1];
          data[o + 2] = rgb[2];
          data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return c;
    });

    return this.cloudSprites;
  }

  public updateParticles(dt: number, quality: QualityProfile): void {
    const activeCount = Math.round(this.particles.length * quality.particleDensity);
    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i];
      p.x += p.vx * dt + Math.sin(p.phase + p.y * 0.04) * 3 * dt;
      p.y += p.vy * dt;
      if (p.aroundLogo) {
        if (p.y < 14) {
          p.y = 165;
          p.x = 100 + ((p.x + 173) % 440);
        }
      } else if (p.y < 20) {
        p.y = 330;
      }
      if (p.x < 0) p.x += TITLE_WIDTH;
      if (p.x >= TITLE_WIDTH) p.x -= TITLE_WIDTH;
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    time: number,
    parallaxX: number,
    parallaxY: number,
    phases: IntroPhases,
    quality: QualityProfile
  ): void {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#05050d';
    ctx.fillRect(0, 0, TITLE_WIDTH, TITLE_HEIGHT);

    if (phases.sky <= 0.01) return;

    this.ensurePrebakedEffects();

    // 1. Dithered Night Sky
    ctx.save();
    ctx.globalAlpha = phases.sky;
    const sky = this.ensureSkyCanvas();
    if (sky) ctx.drawImage(sky, 0, 0);

    // Pre-baked Horizon energy pulse
    const skyPulse = 0.5 + 0.5 * Math.sin(time * 0.9);
    if (quality.enableGlow && this.horizonGlowCanvas) {
      ctx.globalAlpha = phases.sky * (0.75 + skyPulse * 0.25);
      ctx.drawImage(this.horizonGlowCanvas, 0, 140);
    }

    // Twinkling pixel stars
    const starLimit = Math.min(this.stars.length, quality.starCount);
    for (let i = 0; i < starLimit; i++) {
      const st = this.stars[i];
      const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * st.speed + st.phase));
      ctx.globalAlpha = phases.sky * twinkle;
      ctx.fillStyle = st.color;
      ctx.fillRect(Math.round(st.x + parallaxX * 1.5), st.y, st.size, st.size);
    }
    ctx.restore();

    // 2. Giant Moon (upper center, softly cropped at top)
    if (phases.moon > 0.01) {
      ctx.save();
      const moonX = Math.round(320 + parallaxX * 3);
      const moonY = Math.round(36 + (1 - phases.moon) * 18 + parallaxY * 2);
      const moonPulse = 0.5 + 0.5 * Math.sin(time * 1.3);

      if (quality.enableGlow && this.moonHaloCanvas) {
        ctx.globalAlpha = phases.moon * (0.55 + moonPulse * 0.18);
        ctx.drawImage(
          this.moonHaloCanvas,
          moonX - this.moonHaloCanvas.width / 2,
          moonY - this.moonHaloCanvas.height / 2
        );
      }

      ctx.globalAlpha = phases.moon;
      const moon = this.ensureMoonCanvas();
      if (moon) {
        ctx.drawImage(moon, moonX - moon.width / 2, moonY - moon.height / 2);
      }
      ctx.restore();
    }

    // 3. Organic Pixel Storm Clouds (passing across sky and in front of moon)
    if (phases.sky > 0.05) {
      this.drawClouds(ctx, time, parallaxX, phases.sky, quality);
    }

    // 4. Horizon Mist & Distant Gothic Castle + Spires (parallax 0.3x)
    if (phases.mountains > 0.01) {
      const mAlpha = phases.mountains;
      const mDrop = Math.round((1 - mAlpha) * 26);

      if (quality.enableMist) {
        ctx.save();
        ctx.globalAlpha = mAlpha * 0.24;
        for (let b = 0; b < 5; b++) {
          const mx = ((time * (12 + b * 4) + b * 140) % (TITLE_WIDTH + 220)) - 220;
          const my = 244 + b * 8 + mDrop;
          ctx.fillStyle = b % 2 === 0 ? '#f472b6' : '#a855f7';
          ctx.fillRect(Math.round(mx), my, 180, 3);
          ctx.fillRect(Math.round(mx + 24), my - 2, 110, 2);
        }
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = mAlpha;
      ctx.translate(Math.round(parallaxX * 6), mDrop);
      this.drawCastleAndFarHorizon(ctx);
      ctx.restore();

      // 5. Midground jagged mountains (parallax 0.65x)
      ctx.save();
      ctx.globalAlpha = mAlpha;
      ctx.translate(Math.round(parallaxX * 11), mDrop);
      this.drawMidgroundMountains(ctx);
      ctx.restore();

      // 6. Foreground jagged crystalline/volcanic peaks (parallax 1.0x)
      ctx.save();
      ctx.globalAlpha = mAlpha;
      ctx.translate(Math.round(parallaxX * 18), mDrop);
      this.drawForegroundMountains(ctx);
      ctx.restore();
    }

    // 7. Luminous dust & purple/blue energy particles
    if (quality.particleDensity > 0 && phases.sky > 0.4) {
      const count = Math.round(this.particles.length * quality.particleDensity);
      ctx.save();
      for (let i = 0; i < count; i++) {
        const p = this.particles[i];
        const flicker = 0.45 + 0.55 * Math.sin(time * 3.1 + p.phase);
        ctx.globalAlpha = phases.sky * p.alpha * flicker;
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x + parallaxX * 8), Math.round(p.y + parallaxY * 4), p.size, p.size);
      }
      ctx.restore();
    }

    if (this.footerVignetteCanvas) {
      ctx.drawImage(this.footerVignetteCanvas, 0, TITLE_HEIGHT - 70);
    }
  }

  private drawClouds(
    ctx: CanvasRenderingContext2D,
    time: number,
    parallaxX: number,
    alpha: number,
    quality: QualityProfile
  ): void {
    const sprites = this.ensureCloudSprites();
    if (sprites.length === 0) return;

    const maxLayer = quality.cloudLayers === 1 ? 0 : quality.cloudLayers === 2 ? 1 : 2;
    const span = TITLE_WIDTH + 220;

    for (const c of this.clouds) {
      if (c.layer > maxLayer) continue;
      const sprite = sprites[c.spriteIdx % sprites.length];
      const pxFactor = c.layer === 0 ? 4 : c.layer === 1 ? 7 : 9;
      const rawX = ((c.x + time * c.speed) % span + span) % span - 110 + parallaxX * pxFactor;

      ctx.globalAlpha = alpha * c.alpha;
      ctx.drawImage(sprite, Math.round(rawX - sprite.width / 2), Math.round(c.y - sprite.height / 2));
    }
    ctx.globalAlpha = 1;
  }

  private drawCastleAndFarHorizon(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#1c0f38';
    ctx.beginPath();
    ctx.moveTo(-30, 360);
    const pts: Array<[number, number]> = [
      [-30, 265],
      [25, 250],
      [58, 264],
      [96, 256],
      [135, 240],
      [175, 262],
      [220, 268],
      [265, 262],
      [304, 258],
      [320, 196],
      [334, 258],
      [378, 264],
      [428, 255],
      [485, 262],
      [535, 246],
      [590, 258],
      [670, 245],
      [670, 360],
    ];
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();

    // Left-center Gothic Castle Keep
    ctx.fillStyle = '#140c30';
    ctx.fillRect(114, 232, 46, 36);
    ctx.fillRect(110, 212, 11, 52);
    ctx.beginPath();
    ctx.moveTo(109, 212);
    ctx.lineTo(115, 190);
    ctx.lineTo(122, 212);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(128, 198, 16, 68);
    ctx.beginPath();
    ctx.moveTo(126, 198);
    ctx.lineTo(136, 172);
    ctx.lineTo(146, 198);
    ctx.closePath();
    ctx.fill();

    ctx.fillRect(150, 216, 10, 48);
    ctx.beginPath();
    ctx.moveTo(149, 216);
    ctx.lineTo(155, 196);
    ctx.lineTo(161, 216);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3b2d7a';
    ctx.fillRect(136, 176, 2, 22);
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(134, 210, 2, 3);
    ctx.fillRect(138, 210, 2, 3);
    ctx.fillRect(114, 224, 2, 3);

    // Tall central dark tower behind menu
    ctx.fillStyle = '#130c2e';
    ctx.fillRect(313, 214, 14, 54);
    ctx.beginPath();
    ctx.moveTo(311, 214);
    ctx.lineTo(320, 174);
    ctx.lineTo(329, 214);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4c3896';
    ctx.fillRect(319, 180, 2, 34);
  }

  private drawMidgroundMountains(ctx: CanvasRenderingContext2D): void {
    const peaks: Array<{ pts: Array<[number, number]>; highlight: Array<[number, number]> }> = [
      {
        pts: [[-20, 360], [-20, 282], [28, 240], [72, 294], [110, 272], [156, 360]],
        highlight: [[28, 240], [28, 292], [58, 282]],
      },
      {
        pts: [[175, 360], [214, 230], [248, 296], [282, 360]],
        highlight: [[214, 230], [218, 296], [240, 296]],
      },
      {
        pts: [[378, 360], [420, 258], [452, 294], [488, 360]],
        highlight: [[420, 258], [400, 310], [426, 296]],
      },
      {
        pts: [[560, 360], [608, 254], [665, 298], [665, 360]],
        highlight: [[608, 254], [584, 315], [612, 305]],
      },
    ];

    for (const pk of peaks) {
      ctx.fillStyle = '#0e1436';
      ctx.beginPath();
      pk.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#264196';
      ctx.beginPath();
      pk.highlight.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawForegroundMountains(ctx: CanvasRenderingContext2D): void {
    const drawFacetedPeak = (
      darkPts: Array<[number, number]>,
      midPts: Array<[number, number]>,
      rimPts: Array<[number, number]>
    ) => {
      ctx.fillStyle = '#070a1c';
      ctx.beginPath();
      darkPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#14337d';
      ctx.beginPath();
      midPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      rimPts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fill();
    };

    // Far-left tall spire
    drawFacetedPeak(
      [[-24, 365], [-24, 290], [16, 224], [52, 296], [82, 365]],
      [[16, 224], [38, 302], [18, 336], [-6, 296]],
      [[16, 224], [24, 282], [14, 290]]
    );

    // Left foreground jagged ridge
    drawFacetedPeak(
      [[35, 365], [96, 286], [134, 246], [164, 304], [218, 326], [268, 365]],
      [[134, 246], [148, 306], [116, 338], [84, 314]],
      [[134, 246], [142, 288], [126, 296]]
    );

    // Lower-left secondary crag
    drawFacetedPeak(
      [[-20, 365], [56, 304], [104, 342], [138, 365]],
      [[56, 304], [76, 348], [38, 355]],
      [[56, 304], [64, 332], [50, 336]]
    );

    // Iconic right diagonal spire rising up beside menu
    drawFacetedPeak(
      [[376, 365], [438, 306], [492, 244], [552, 174], [538, 256], [566, 314], [622, 365]],
      [[552, 174], [508, 266], [472, 324], [410, 358], [442, 302], [492, 244]],
      [[552, 174], [518, 248], [486, 292], [476, 284], [506, 240]]
    );

    // Far-right edge spire
    drawFacetedPeak(
      [[550, 365], [596, 298], [626, 248], [666, 304], [666, 365]],
      [[626, 248], [608, 314], [582, 342]],
      [[626, 248], [614, 294], [604, 290]]
    );
  }
}
