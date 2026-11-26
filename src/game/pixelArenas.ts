import { ARENAS, GROUND_Y, STAGE_HEIGHT, STAGE_WIDTH } from './roster';
import { ArenaId } from './types';

function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, colorA = '#f97316', colorB = '#fde047') {
  // Wall bracket
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(x - 2, y, 4, 14);
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(x - 3, y - 2, 6, 3);

  // Flickering flame pixels
  const flicker = Math.sin(time * 14 + x) * 1.5;
  const h = 8 + Math.round(flicker);
  ctx.fillStyle = colorA;
  ctx.fillRect(x - 3, y - h, 6, h - 1);
  ctx.fillRect(x - 2, y - h - 2, 4, 3);
  ctx.fillStyle = colorB;
  ctx.fillRect(x - 1, y - h + 2, 2, Math.max(2, h - 3));
}

function drawSpectator(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, seed: number, tunic: string) {
  const bob = Math.round(Math.abs(Math.sin(time * 5 + seed)) * 2);
  const py = y - bob;
  // Outline
  ctx.fillStyle = '#09070d';
  ctx.fillRect(x - 4, py - 14, 8, 14);
  // Head
  ctx.fillStyle = '#d6a98a';
  ctx.fillRect(x - 2, py - 13, 4, 4);
  // Hair
  ctx.fillStyle = seed % 2 === 0 ? '#1c1917' : '#78350f';
  ctx.fillRect(x - 2, py - 14, 4, 2);
  // Tunic
  ctx.fillStyle = tunic;
  ctx.fillRect(x - 3, py - 8, 6, 7);
  // Cheering arm occasionally
  if (Math.sin(time * 4 + seed * 1.7) > 0.35) {
    ctx.fillStyle = '#d6a98a';
    ctx.fillRect(x + 3, py - 12, 2, 5);
  }
}

type ShadowTempleAssetKey =
  | 'far'
  | 'mid'
  | 'floor'
  | 'banner_l'
  | 'banner_r'
  | 'chain_l'
  | 'chain_r';

const SHADOW_TEMPLE_FILES: Record<ShadowTempleAssetKey, string> = {
  far: '/assets/arenas/shadow_temple_far.png',
  mid: '/assets/arenas/shadow_temple_mid.png',
  floor: '/assets/arenas/shadow_temple_floor.png',
  banner_l: '/assets/arenas/shadow_temple_banner_l.png',
  banner_r: '/assets/arenas/shadow_temple_banner_r.png',
  chain_l: '/assets/arenas/shadow_temple_chain_l.png',
  chain_r: '/assets/arenas/shadow_temple_chain_r.png',
};

const shadowTempleImages = new Map<ShadowTempleAssetKey, HTMLImageElement>();
let shadowTempleLoaded = false;

function ensureShadowTempleAssets(): void {
  if (shadowTempleLoaded || typeof Image === 'undefined') return;
  shadowTempleLoaded = true;
  for (const [key, src] of Object.entries(SHADOW_TEMPLE_FILES) as [ShadowTempleAssetKey, string][]) {
    const img = new Image();
    img.src = src;
    shadowTempleImages.set(key, img);
  }
}

function getShadowTempleImage(key: ShadowTempleAssetKey): HTMLImageElement | null {
  ensureShadowTempleAssets();
  const img = shadowTempleImages.get(key);
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

interface TempleEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  brazierIndex: number;
}

const BRAZIER_ANCHORS = [
  { x: 238, y: 104, scale: 1.0 },
  { x: 170, y: 96, scale: 0.92 },
  { x: 308, y: 96, scale: 0.92 },
  { x: 7, y: 146, scale: 0.55 },
  { x: 472, y: 146, scale: 0.55 },
];

const templeEmbers: TempleEmber[] = Array.from({ length: 24 }, (_, idx) => {
  const bIdx = idx % BRAZIER_ANCHORS.length;
  const anchor = BRAZIER_ANCHORS[bIdx];
  const maxLife = 1.6 + (idx % 5) * 0.35;
  return {
    x: anchor.x + ((idx * 7) % 10) - 5,
    y: anchor.y - (idx % 4) * 14,
    vx: ((idx % 3) - 1) * 5,
    vy: -(16 + (idx % 4) * 6),
    life: (idx / 24) * maxLife,
    maxLife,
    size: idx % 3 === 0 ? 2 : 1,
    brazierIndex: bIdx,
  };
});

let lastTempleTime: number | null = null;
let cloudDriftX = 0;

function renderShadowTemple(
  ctx: CanvasRenderingContext2D,
  time: number,
  cameraXOffset: number
): boolean {
  const farImg = getShadowTempleImage('far');
  const midImg = getShadowTempleImage('mid');
  const floorImg = getShadowTempleImage('floor');
  if (!farImg || !midImg || !floorImg) {
    return false;
  }

  // Delta-time tracking so clouds and embers advance smoothly at any framerate
  let dt = 1 / 60;
  if (lastTempleTime !== null) {
    const delta = time - lastTempleTime;
    if (delta >= 0 && delta < 0.25) {
      dt = delta;
    }
  }
  lastTempleTime = time;
  cloudDriftX = (cloudDriftX + dt * 4.5) % STAGE_WIDTH;

  for (let i = 0; i < templeEmbers.length; i++) {
    const e = templeEmbers[i];
    e.life += dt;
    if (e.life >= e.maxLife) {
      const b = BRAZIER_ANCHORS[e.brazierIndex];
      e.x = b.x + Math.sin(time * 3.7 + i) * 6;
      e.y = b.y - 2;
      e.vx = Math.sin(time * 2.1 + i * 1.3) * 7;
      e.vy = -(16 + (i % 4) * 6);
      e.life = 0;
    } else {
      e.x += (e.vx + Math.sin(time * 2.4 + i) * 4) * dt;
      e.y += e.vy * dt;
    }
  }

  const PAD_FAR = 20;
  const PAD_MID = 20;
  const PAD_FLOOR = 30;
  const FLOOR_Y = 184;

  const farShift = Math.max(-PAD_FAR, Math.min(PAD_FAR, -cameraXOffset * 0.14));
  const midShift = Math.max(-PAD_MID, Math.min(PAD_MID, -cameraXOffset * 0.45));
  const floorShift = Math.max(-PAD_FLOOR, Math.min(PAD_FLOOR, -cameraXOffset * 0.85));

  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;

  // Layer 1 (Far): Sky, citadel, mountains & purple moon
  ctx.drawImage(farImg, Math.round(-PAD_FAR + farShift), 0);

  // 1. MOON_GLOW: gentle atmospheric pulse around the purple full moon (357, 39)
  const moonX = 357 + farShift;
  const moonY = 39;
  const moonPulse = 0.14 + 0.06 * Math.sin(time * 1.4);
  const moonGrad = ctx.createRadialGradient(moonX, moonY, 16, moonX, moonY, 64);
  moonGrad.addColorStop(0, `rgba(216, 180, 254, ${moonPulse})`);
  moonGrad.addColorStop(0.55, `rgba(147, 51, 234, ${moonPulse * 0.55})`);
  moonGrad.addColorStop(1, 'rgba(88, 28, 135, 0)');
  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 64, 0, Math.PI * 2);
  ctx.fill();

  // 2. MOVING_CLOUDS: slow drifting purple cloud bands across upper sky
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const cx = ((cloudDriftX * (0.65 + i * 0.18) + i * 145) % (STAGE_WIDTH + 160)) - 80;
    const cy = 18 + (i % 3) * 20;
    const cw = 96 + (i % 2) * 34;
    const cGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, cw * 0.5);
    cGrad.addColorStop(0, 'rgba(126, 34, 206, 0.14)');
    cGrad.addColorStop(0.6, 'rgba(59, 7, 100, 0.08)');
    cGrad.addColorStop(1, 'rgba(13, 9, 26, 0)');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw * 0.5, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Layer 2 (Mid): Shrine, seated guardian statues & stone terrace
  ctx.drawImage(midImg, Math.round(-PAD_MID + midShift), 0);

  // 3. BANNERS_WIND: fluttering purple dragon banners pinned at top rod
  const bannerL = getShadowTempleImage('banner_l');
  const bannerR = getShadowTempleImage('banner_r');
  const swayL = Math.sin(time * 2.3) * 0.045;
  const swayR = Math.sin(time * 2.1 + 1.1) * 0.045;
  if (bannerL) {
    ctx.save();
    ctx.translate(Math.round(5 + midShift + bannerL.width * 0.5), 58);
    ctx.transform(1, swayL * 0.25, swayL, 1, 0, 0);
    ctx.drawImage(bannerL, -bannerL.width * 0.5, 0);
    ctx.restore();
  }
  if (bannerR) {
    ctx.save();
    ctx.translate(Math.round(439 + midShift + bannerR.width * 0.5), 58);
    ctx.transform(1, -swayR * 0.25, swayR, 1, 0, 0);
    ctx.drawImage(bannerR, -bannerR.width * 0.5, 0);
    ctx.restore();
  }

  // 4. CHAINS_MOVEMENT: subtle hanging iron chain sway between statues and temple
  const chainL = getShadowTempleImage('chain_l');
  const chainR = getShadowTempleImage('chain_r');
  if (chainL) {
    const chainBobL = Math.sin(time * 1.9) * 1.1;
    ctx.save();
    ctx.translate(Math.round(103 + midShift + chainL.width * 0.5), 121);
    ctx.rotate(Math.sin(time * 1.9) * 0.025);
    ctx.drawImage(chainL, -chainL.width * 0.5, chainBobL);
    ctx.restore();
  }
  if (chainR) {
    const chainBobR = Math.sin(time * 1.85 + 0.8) * 1.1;
    ctx.save();
    ctx.translate(Math.round(337 + midShift + chainR.width * 0.5), 121);
    ctx.rotate(Math.sin(time * 1.85 + 0.8) * 0.025);
    ctx.drawImage(chainR, -chainR.width * 0.5, chainBobR);
    ctx.restore();
  }

  // 5. TEMPLE_FIRE: dynamic flickering glow & flame tongues over braziers
  ctx.save();
  for (let i = 0; i < BRAZIER_ANCHORS.length; i++) {
    const b = BRAZIER_ANCHORS[i];
    const bx = b.x + midShift;
    const by = b.y;
    const flick = 0.85 + 0.15 * Math.sin(time * 14 + i * 2.1);
    const radius = 26 * b.scale * flick;
    const fireGlow = ctx.createRadialGradient(bx, by - 4, 2, bx, by - 4, radius);
    fireGlow.addColorStop(0, 'rgba(254, 240, 138, 0.36)');
    fireGlow.addColorStop(0.45, 'rgba(239, 68, 68, 0.24)');
    fireGlow.addColorStop(1, 'rgba(127, 29, 29, 0)');
    ctx.fillStyle = fireGlow;
    ctx.beginPath();
    ctx.arc(bx, by - 4, radius, 0, Math.PI * 2);
    ctx.fill();

    // Small pixel flame tongue flicker
    const tipH = (7 + Math.sin(time * 17 + i * 1.7) * 3) * b.scale;
    ctx.fillStyle = 'rgba(251, 146, 60, 0.55)';
    ctx.fillRect(Math.round(bx - 2 * b.scale), Math.round(by - tipH - 3), Math.max(2, Math.round(4 * b.scale)), Math.round(tipH));
    ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
    ctx.fillRect(Math.round(bx - 1 * b.scale), Math.round(by - tipH * 0.7 - 2), Math.max(1, Math.round(2 * b.scale)), Math.round(tipH * 0.55));
  }
  ctx.restore();

  // 6. PURPLE_FOG: atmospheric drifting mist behind fighters near shrine base
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const fx = ((time * 9 + i * 135) % (STAGE_WIDTH + 140)) - 70;
    const fy = 166 + (i % 2) * 10;
    const fogGrad = ctx.createRadialGradient(fx, fy, 4, fx, fy, 68);
    fogGrad.addColorStop(0, 'rgba(168, 85, 247, 0.13)');
    fogGrad.addColorStop(0.65, 'rgba(88, 28, 135, 0.06)');
    fogGrad.addColorStop(1, 'rgba(13, 9, 26, 0)');
    ctx.fillStyle = fogGrad;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 74, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Layer 3 (Floor): Detailed gothic stone floor + dragon floor medallion
  ctx.drawImage(floorImg, Math.round(-PAD_FLOOR + floorShift), FLOOR_Y);

  // 7. FLOOR_GLOW: subtle firelight shimmer reflecting off central tiles & medallion
  ctx.save();
  const floorPulse = 0.09 + 0.05 * Math.sin(time * 4.2) + 0.02 * Math.sin(time * 11.3);
  const fGlow = ctx.createRadialGradient(240 + floorShift, 224, 10, 240 + floorShift, 224, 118);
  fGlow.addColorStop(0, `rgba(249, 115, 22, ${floorPulse * 1.4})`);
  fGlow.addColorStop(0.55, `rgba(220, 38, 38, ${floorPulse})`);
  fGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fGlow;
  ctx.fillRect(0, FLOOR_Y, STAGE_WIDTH, STAGE_HEIGHT - FLOOR_Y);
  ctx.restore();

  // 8. EMBER_PARTICLES: rising floating fire embers
  ctx.save();
  for (let i = 0; i < templeEmbers.length; i++) {
    const e = templeEmbers[i];
    const progress = e.life / e.maxLife;
    const alpha = (progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8) * 0.78;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fb923c' : '#ef4444';
    ctx.fillRect(Math.round(e.x + midShift), Math.round(e.y), e.size, e.size);
  }
  ctx.restore();

  ctx.imageSmoothingEnabled = prevSmooth;
  return true;
}

let celestialCathedralImg: HTMLImageElement | null = null;
let celestialCathedralRequested = false;

function getCelestialCathedralImage(): HTMLImageElement | null {
  if (!celestialCathedralRequested && typeof Image !== 'undefined') {
    celestialCathedralRequested = true;
    const img = new Image();
    img.src = '/assets/arenas/celestial_cathedral_bg.png';
    celestialCathedralImg = img;
  }
  if (celestialCathedralImg && celestialCathedralImg.complete && celestialCathedralImg.naturalWidth > 0) {
    return celestialCathedralImg;
  }
  return null;
}

interface CathedralFireAnchor {
  x: number;
  y: number;
  scale: number;
  kind: 'blue' | 'gold';
}

const CATHEDRAL_FIRES: CathedralFireAnchor[] = [
  { x: 141, y: 152, scale: 1.05, kind: 'blue' },   // Left angel blue brazier
  { x: 281, y: 126, scale: 0.55, kind: 'blue' },   // Right altar blue candelabra
  { x: 340, y: 152, scale: 1.05, kind: 'gold' },   // Right angel gold brazier
  { x: 199, y: 130, scale: 0.55, kind: 'gold' },   // Left altar fire candelabra
  { x: 33, y: 118, scale: 0.72, kind: 'gold' },    // Far left pillar torch
  { x: 96, y: 126, scale: 0.58, kind: 'gold' },    // Mid left pillar torch
  { x: 386, y: 126, scale: 0.58, kind: 'gold' },   // Mid right pillar torch
  { x: 448, y: 119, scale: 0.72, kind: 'gold' },   // Far right pillar torch
];

const CATHEDRAL_CANDLES: { x: number; y: number; r: number }[] = [
  // Altar candles
  { x: 216, y: 122, r: 9 },
  { x: 223, y: 124, r: 8 },
  { x: 257, y: 124, r: 8 },
  { x: 264, y: 122, r: 9 },
  // Bottom-left tall candelabra
  { x: 11, y: 198, r: 10 },
  { x: 16, y: 196, r: 10 },
  { x: 21, y: 193, r: 12 },
  { x: 26, y: 196, r: 10 },
  { x: 31, y: 198, r: 10 },
  // Bottom-left pedestal candles
  { x: 58, y: 216, r: 13 },
  { x: 66, y: 222, r: 11 },
  // Bottom-right pedestal candles
  { x: 414, y: 215, r: 13 },
  { x: 422, y: 220, r: 11 },
  { x: 458, y: 225, r: 11 },
  { x: 467, y: 221, r: 13 },
];

interface CathedralEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  anchorIndex: number;
}

const cathedralEmbers: CathedralEmber[] = Array.from({ length: 28 }, (_, idx) => {
  const anchorIndex = idx % CATHEDRAL_FIRES.length;
  const anchor = CATHEDRAL_FIRES[anchorIndex];
  const maxLife = 1.4 + (idx % 5) * 0.32;
  return {
    x: anchor.x + ((idx * 5) % 8) - 4,
    y: anchor.y - (idx % 4) * 10,
    vx: ((idx % 3) - 1) * 4,
    vy: -(14 + (idx % 4) * 5),
    life: (idx / 28) * maxLife,
    maxLife,
    size: idx % 4 === 0 ? 2 : 1,
    anchorIndex,
  };
});

interface CathedralMote {
  baseX: number;
  baseY: number;
  speedY: number;
  phase: number;
  size: number;
}

const cathedralMotes: CathedralMote[] = Array.from({ length: 20 }, (_, idx) => ({
  baseX: 95 + ((idx * 47) % 290),
  baseY: 22 + ((idx * 37) % 155),
  speedY: 4 + (idx % 4) * 1.8,
  phase: idx * 1.37,
  size: idx % 5 === 0 ? 2 : 1,
}));

let lastCathedralTime: number | null = null;

type GlowStampKind =
  | 'blue'
  | 'gold'
  | 'mist'
  | 'blood'
  | 'smoke'
  | 'valley_mist'
  | 'water_foam'
  | 'hell_mist';
const glowStampCache = new Map<GlowStampKind, HTMLCanvasElement>();

function getGlowStamp(kind: GlowStampKind): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = glowStampCache.get(kind);
  if (cached) return cached;

  const size = kind === 'mist' || kind === 'valley_mist' || kind === 'hell_mist' ? 96 : 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const gctx = c.getContext('2d');
  if (!gctx) return null;

  const half = size / 2;
  const grad = gctx.createRadialGradient(half, half, 1, half, half, half);
  if (kind === 'blue') {
    grad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
    grad.addColorStop(0.35, 'rgba(56, 189, 248, 0.65)');
    grad.addColorStop(0.7, 'rgba(14, 165, 233, 0.22)');
    grad.addColorStop(1, 'rgba(14, 116, 144, 0)');
  } else if (kind === 'gold') {
    grad.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
    grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.62)');
    grad.addColorStop(0.7, 'rgba(249, 115, 22, 0.22)');
    grad.addColorStop(1, 'rgba(154, 52, 18, 0)');
  } else if (kind === 'blood') {
    grad.addColorStop(0, 'rgba(254, 202, 202, 0.85)');
    grad.addColorStop(0.35, 'rgba(239, 68, 68, 0.48)');
    grad.addColorStop(0.7, 'rgba(185, 28, 28, 0.18)');
    grad.addColorStop(1, 'rgba(127, 29, 29, 0)');
  } else if (kind === 'smoke') {
    grad.addColorStop(0, 'rgba(68, 56, 82, 0.72)');
    grad.addColorStop(0.55, 'rgba(36, 26, 48, 0.34)');
    grad.addColorStop(1, 'rgba(14, 10, 22, 0)');
  } else if (kind === 'valley_mist') {
    grad.addColorStop(0, 'rgba(167, 139, 250, 0.52)');
    grad.addColorStop(0.55, 'rgba(109, 40, 217, 0.2)');
    grad.addColorStop(1, 'rgba(15, 10, 28, 0)');
  } else if (kind === 'water_foam') {
    grad.addColorStop(0, 'rgba(233, 213, 255, 0.85)');
    grad.addColorStop(0.45, 'rgba(167, 139, 250, 0.38)');
    grad.addColorStop(1, 'rgba(30, 27, 75, 0)');
  } else if (kind === 'hell_mist') {
    grad.addColorStop(0, 'rgba(92, 42, 34, 0.58)');
    grad.addColorStop(0.55, 'rgba(44, 18, 16, 0.26)');
    grad.addColorStop(1, 'rgba(14, 6, 6, 0)');
  } else {
    grad.addColorStop(0, 'rgba(203, 213, 225, 0.85)');
    grad.addColorStop(0.55, 'rgba(148, 163, 184, 0.35)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  }
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, size, size);
  glowStampCache.set(kind, c);
  return c;
}

function drawGlowStamp(
  ctx: CanvasRenderingContext2D,
  stamp: HTMLCanvasElement | null,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number
): void {
  if (!stamp || alpha <= 0.005) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(stamp, cx - rx, cy - ry, rx * 2, ry * 2);
}

function renderCelestialCathedral(
  ctx: CanvasRenderingContext2D,
  time: number,
  cameraXOffset: number
): boolean {
  const bgImg = getCelestialCathedralImage();
  if (!bgImg) return false;

  let dt = 1 / 60;
  if (lastCathedralTime !== null) {
    const delta = time - lastCathedralTime;
    if (delta >= 0 && delta < 0.25) dt = delta;
  }
  lastCathedralTime = time;

  for (let i = 0; i < cathedralEmbers.length; i++) {
    const e = cathedralEmbers[i];
    e.life += dt;
    if (e.life >= e.maxLife) {
      const a = CATHEDRAL_FIRES[e.anchorIndex];
      e.x = a.x + Math.sin(time * 4.1 + i) * 4 * a.scale;
      e.y = a.y - 3 * a.scale;
      e.vx = Math.sin(time * 2.3 + i * 1.7) * 6;
      e.vy = -(13 + (i % 4) * 5) * (0.7 + a.scale * 0.3);
      e.life = 0;
    } else {
      e.x += (e.vx + Math.sin(time * 2.7 + i) * 3.5) * dt;
      e.y += e.vy * dt;
    }
  }

  const PAD = 20;
  const bgShift = Math.max(-18, Math.min(18, -cameraXOffset * 0.28));
  const mistShift = Math.max(-24, Math.min(24, -cameraXOffset * 0.42));

  const blueStamp = getGlowStamp('blue');
  const goldStamp = getGlowStamp('gold');
  const mistStamp = getGlowStamp('mist');

  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;

  // Base gothic cathedral nave artwork
  ctx.drawImage(bgImg, Math.round(-PAD + bgShift), 0);

  // 1. Rose Window celestial shimmer & slowly rotating starlight rays
  const roseX = 240 + bgShift;
  const roseY = 70;
  const rosePulse = 0.14 + 0.06 * Math.sin(time * 1.35);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  drawGlowStamp(ctx, blueStamp, roseX, roseY, 64, 64, rosePulse);

  // Clip rotating starlight spokes cleanly inside the stained-glass medallion
  ctx.save();
  ctx.beginPath();
  ctx.arc(roseX, roseY, 42, 0, Math.PI * 2);
  ctx.clip();

  const spokeRot = time * 0.08;
  for (let i = 0; i < 12; i++) {
    const a = spokeRot + (i * Math.PI) / 6;
    const spokeAlpha = 0.045 + 0.03 * Math.sin(time * 1.8 + i * 0.9);
    ctx.fillStyle = i % 2 === 0 ? `rgba(253, 224, 71, ${spokeAlpha})` : `rgba(125, 211, 252, ${spokeAlpha})`;
    ctx.beginPath();
    ctx.moveTo(roseX, roseY);
    ctx.lineTo(roseX + Math.cos(a - 0.065) * 46, roseY + Math.sin(a - 0.065) * 46);
    ctx.lineTo(roseX + Math.cos(a + 0.065) * 46, roseY + Math.sin(a + 0.065) * 46);
    ctx.closePath();
    ctx.fill();
  }

  drawGlowStamp(ctx, goldStamp, roseX, roseY, 18, 18, 0.2 + 0.08 * Math.sin(time * 2.1));
  ctx.restore();

  // 2. Volumetric diagonal god rays from upper windows
  const rayPulseL = 0.065 + 0.03 * Math.sin(time * 0.95);
  const rayGradL = ctx.createLinearGradient(125 + bgShift, 0, 225 + bgShift, 180);
  rayGradL.addColorStop(0, `rgba(254, 243, 199, ${rayPulseL})`);
  rayGradL.addColorStop(1, 'rgba(254, 243, 199, 0)');
  ctx.fillStyle = rayGradL;
  ctx.beginPath();
  ctx.moveTo(118 + bgShift, 0);
  ctx.lineTo(156 + bgShift, 0);
  ctx.lineTo(240 + bgShift, 182);
  ctx.lineTo(185 + bgShift, 182);
  ctx.closePath();
  ctx.fill();

  const rayPulseR = 0.065 + 0.03 * Math.sin(time * 0.95 + 1.4);
  const rayGradR = ctx.createLinearGradient(355 + bgShift, 0, 255 + bgShift, 180);
  rayGradR.addColorStop(0, `rgba(254, 243, 199, ${rayPulseR})`);
  rayGradR.addColorStop(1, 'rgba(254, 243, 199, 0)');
  ctx.fillStyle = rayGradR;
  ctx.beginPath();
  ctx.moveTo(324 + bgShift, 0);
  ctx.lineTo(362 + bgShift, 0);
  ctx.lineTo(295 + bgShift, 182);
  ctx.lineTo(240 + bgShift, 182);
  ctx.closePath();
  ctx.fill();

  // 3. Angel Orbs (Left Cyan Orb & Right Golden Orb)
  const leftOrbX = 187 + bgShift;
  const leftOrbY = 99;
  drawGlowStamp(ctx, blueStamp, leftOrbX, leftOrbY, 18, 18, 0.36 + 0.14 * Math.sin(time * 2.6));

  const rightOrbX = 296 + bgShift;
  const rightOrbY = 99;
  drawGlowStamp(ctx, goldStamp, rightOrbX, rightOrbY, 18, 18, 0.36 + 0.14 * Math.sin(time * 2.6 + 1.8));

  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) {
    const la = time * 2.2 + i * 2.09;
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(Math.round(leftOrbX + Math.cos(la) * 8), Math.round(leftOrbY + Math.sin(la) * 6), 1, 1);

    const ra = -time * 2.0 + i * 2.09;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(Math.round(rightOrbX + Math.cos(ra) * 8), Math.round(rightOrbY + Math.sin(ra) * 6), 1, 1);
  }

  // 4. Braziers & Wall Sconce Torches (Blue magic flames vs Golden sacred fire)
  for (let i = 0; i < CATHEDRAL_FIRES.length; i++) {
    const f = CATHEDRAL_FIRES[i];
    const fx = f.x + bgShift;
    const fy = f.y;
    const flick = 0.86 + 0.14 * Math.sin(time * 13 + i * 2.3) + 0.06 * Math.cos(time * 21 + i);
    const radius = 26 * f.scale * flick;
    drawGlowStamp(
      ctx,
      f.kind === 'blue' ? blueStamp : goldStamp,
      fx,
      fy - 4 * f.scale,
      radius,
      radius,
      0.42
    );

    // Tapered organic flame tongue wisps
    const sway = Math.sin(time * 12 + i * 1.9) * 1.8 * f.scale;
    const tipH = (7 + Math.sin(time * 16 + i * 1.7) * 3) * f.scale;
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = f.kind === 'blue' ? '#38bdf8' : '#fb923c';
    ctx.beginPath();
    ctx.moveTo(fx - 3 * f.scale, fy);
    ctx.lineTo(fx + sway, fy - tipH - 3 * f.scale);
    ctx.lineTo(fx + 3 * f.scale, fy);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.78;
    ctx.fillStyle = f.kind === 'blue' ? '#e0f2fe' : '#fef08a';
    ctx.beginPath();
    ctx.moveTo(fx - 1.4 * f.scale, fy - 1);
    ctx.lineTo(fx + sway * 1.15, fy - tipH * 0.72 - 2);
    ctx.lineTo(fx + 1.4 * f.scale, fy - 1);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Altar & Foreground Candles (gentle warm flicker)
  for (let i = 0; i < CATHEDRAL_CANDLES.length; i++) {
    const c = CATHEDRAL_CANDLES[i];
    const cx = c.x + bgShift;
    const cy = c.y;
    const cFlick = 0.82 + 0.18 * Math.sin(time * 11 + i * 1.7);
    drawGlowStamp(ctx, goldStamp, cx, cy, c.r * cFlick, c.r * cFlick, 0.36);

    const flameDy = Math.round(Math.sin(time * 14 + i * 2.1));
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(Math.round(cx), Math.round(cy - 2 + flameDy * 0.5), 1, 2);
  }

  // 6. Floor elemental reflections (cool cyan left, warm gold right)
  drawGlowStamp(ctx, blueStamp, 141 + bgShift, 192, 46, 14, 0.12 + 0.05 * Math.sin(time * 5.2));
  drawGlowStamp(ctx, goldStamp, 340 + bgShift, 192, 46, 14, 0.12 + 0.05 * Math.sin(time * 5.2 + 1.5));

  ctx.restore();

  // 7. Drifting low cathedral mist along the stone floor horizon
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const mx = ((time * 7.5 + i * 115) % (STAGE_WIDTH + 130)) - 65 + mistShift;
    const my = 180 + (i % 2) * 7;
    drawGlowStamp(ctx, mistStamp, mx, my, 68, 12, 0.14);
  }
  ctx.restore();

  // 8. Floating sunlit dust motes inside the cathedral nave
  ctx.save();
  for (let i = 0; i < cathedralMotes.length; i++) {
    const m = cathedralMotes[i];
    const my = 20 + ((m.baseY + time * m.speedY) % 165);
    const mx = m.baseX + Math.sin(time * 0.9 + m.phase) * 10 + bgShift;
    const alpha = 0.25 + 0.45 * Math.abs(Math.sin(time * 1.4 + m.phase));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 3 === 0 ? '#bae6fd' : '#fef08a';
    ctx.fillRect(Math.round(mx), Math.round(my), m.size, m.size);
  }
  ctx.restore();

  // 9. Rising dual-elemental embers from braziers and sconces
  ctx.save();
  for (let i = 0; i < cathedralEmbers.length; i++) {
    const e = cathedralEmbers[i];
    const progress = e.life / e.maxLife;
    const alpha = (progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8) * 0.82;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    const kind = CATHEDRAL_FIRES[e.anchorIndex].kind;
    if (kind === 'blue') {
      ctx.fillStyle = i % 2 === 0 ? '#e0f2fe' : '#38bdf8';
    } else {
      ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fb923c' : '#ef4444';
    }
    ctx.fillRect(Math.round(e.x + bgShift), Math.round(e.y), e.size, e.size);
  }
  ctx.restore();

  ctx.imageSmoothingEnabled = prevSmooth;
  return true;
}

type TrollLandsAssetKey =
  | 'far'
  | 'mid'
  | 'floor'
  | 'troll_body'
  | 'troll_head'
  | 'banner_l'
  | 'banner_m'
  | 'banner_r';

const TROLL_LANDS_FILES: Record<TrollLandsAssetKey, string> = {
  far: '/assets/arenas/troll_lands_far.png',
  mid: '/assets/arenas/troll_lands_mid.png',
  floor: '/assets/arenas/troll_lands_floor.png',
  troll_body: '/assets/arenas/troll_lands_troll_body.png',
  troll_head: '/assets/arenas/troll_lands_troll_head.png',
  banner_l: '/assets/arenas/troll_lands_banner_l.png',
  banner_m: '/assets/arenas/troll_lands_banner_m.png',
  banner_r: '/assets/arenas/troll_lands_banner_r.png',
};

const trollLandsImages = new Map<TrollLandsAssetKey, HTMLImageElement>();
let trollLandsLoaded = false;

function ensureTrollLandsAssets(): void {
  if (trollLandsLoaded || typeof Image === 'undefined') return;
  trollLandsLoaded = true;
  for (const [key, src] of Object.entries(TROLL_LANDS_FILES) as [TrollLandsAssetKey, string][]) {
    const img = new Image();
    img.src = src;
    trollLandsImages.set(key, img);
  }
}

function getTrollLandsImage(key: TrollLandsAssetKey): HTMLImageElement | null {
  ensureTrollLandsAssets();
  const img = trollLandsImages.get(key);
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

const TROLL_BRAZIERS = [
  { x: 29, y: 84 },
  { x: 451, y: 84 },
] as const;

const TROLL_WATERFALLS = [
  { x: 119, y: 106, w: 10, h: 56, splashY: 162 },
  { x: 145, y: 117, w: 15, h: 63, splashY: 179 },
  { x: 321, y: 145, w: 9, h: 38, splashY: 181 },
  { x: 348, y: 117, w: 16, h: 59, splashY: 175 },
] as const;

interface TrollSmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  brazierIdx: number;
}

const trollSmokePuffs: TrollSmokePuff[] = Array.from({ length: 18 }, (_, idx) => {
  const bIdx = idx % TROLL_BRAZIERS.length;
  const anchor = TROLL_BRAZIERS[bIdx];
  const maxLife = 2.0 + (idx % 4) * 0.45;
  return {
    x: anchor.x + ((idx * 5) % 10) - 5,
    y: anchor.y - 6 - (idx % 5) * 11,
    vx: 3.5 + (idx % 3) * 1.6,
    vy: -(13 + (idx % 4) * 3.5),
    life: (idx / 18) * maxLife,
    maxLife,
    brazierIdx: bIdx,
  };
});

interface TrollAshParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  kind: 'ember' | 'ash' | 'dust';
}

const trollAshParticles: TrollAshParticle[] = Array.from({ length: 28 }, (_, idx) => {
  const kind = idx < 12 ? 'ember' : idx < 21 ? 'ash' : 'dust';
  const bAnchor = TROLL_BRAZIERS[idx % 2];
  const maxLife = kind === 'ember' ? 1.8 + (idx % 4) * 0.35 : 3.2 + (idx % 5) * 0.5;
  return {
    x: kind === 'ember' ? bAnchor.x + ((idx * 7) % 14) - 7 : (idx * 39) % STAGE_WIDTH,
    y: kind === 'ember' ? bAnchor.y - (idx % 4) * 12 : 45 + ((idx * 29) % 155),
    vx: kind === 'ember' ? 4 + (idx % 3) * 3 : 6 + (idx % 4) * 2.5,
    vy: kind === 'ember' ? -(16 + (idx % 4) * 5) : -(3.5 + (idx % 3) * 2.2),
    life: (idx / 28) * maxLife,
    maxLife,
    size: idx % 4 === 0 ? 2 : 1,
    kind,
  };
});

let lastTrollTime: number | null = null;
let trollCloudDriftX = 0;

function renderTrollLands(
  ctx: CanvasRenderingContext2D,
  time: number,
  cameraXOffset: number
): boolean {
  const farImg = getTrollLandsImage('far');
  const midImg = getTrollLandsImage('mid');
  const floorImg = getTrollLandsImage('floor');
  if (!farImg || !midImg || !floorImg) {
    return false;
  }

  let dt = 1 / 60;
  if (lastTrollTime !== null) {
    const delta = time - lastTrollTime;
    if (delta >= 0 && delta < 0.25) dt = delta;
  }
  lastTrollTime = time;
  trollCloudDriftX = (trollCloudDriftX + dt * 4.2) % (STAGE_WIDTH + 180);

  for (let i = 0; i < trollSmokePuffs.length; i++) {
    const p = trollSmokePuffs[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      const b = TROLL_BRAZIERS[p.brazierIdx];
      p.x = b.x + Math.sin(time * 3.4 + i) * 5;
      p.y = b.y - 6;
      p.vx = 3.2 + Math.sin(time * 1.9 + i * 1.4) * 2.5;
      p.vy = -(13 + (i % 4) * 3.2);
      p.life = 0;
    } else {
      p.x += (p.vx + Math.sin(time * 1.8 + i) * 2.8) * dt;
      p.y += p.vy * dt;
    }
  }

  for (let i = 0; i < trollAshParticles.length; i++) {
    const a = trollAshParticles[i];
    a.life += dt;
    if (a.life >= a.maxLife) {
      if (a.kind === 'ember') {
        const b = TROLL_BRAZIERS[i % 2];
        a.x = b.x + Math.sin(time * 4.3 + i) * 7;
        a.y = b.y - 3;
        a.vx = 3 + Math.sin(time * 2.5 + i) * 6;
        a.vy = -(16 + (i % 4) * 5.5);
      } else {
        a.x = (i * 43 + time * 19) % STAGE_WIDTH;
        a.y = 185 - (i % 5) * 18;
        a.vx = 5 + (i % 4) * 2.2;
        a.vy = -(4 + (i % 3) * 2.1);
      }
      a.life = 0;
    } else {
      a.x += (a.vx + Math.sin(time * 2.1 + i * 1.3) * 4.5) * dt;
      a.y += a.vy * dt;
    }
  }

  const PAD_FAR = 20;
  const PAD_MID = 20;
  const PAD_FLOOR = 30;
  const FLOOR_Y = 198;

  const farShift = Math.max(-PAD_FAR, Math.min(PAD_FAR, -cameraXOffset * 0.12));
  const trollShift = Math.max(-PAD_FAR, Math.min(PAD_FAR, -cameraXOffset * 0.24));
  const midShift = Math.max(-PAD_MID, Math.min(PAD_MID, -cameraXOffset * 0.45));
  const floorShift = Math.max(-PAD_FLOOR, Math.min(PAD_FLOOR, -cameraXOffset * 0.85));

  const bloodStamp = getGlowStamp('blood');
  const goldStamp = getGlowStamp('gold');
  const smokeStamp = getGlowStamp('smoke');
  const valleyMistStamp = getGlowStamp('valley_mist');
  const foamStamp = getGlowStamp('water_foam');

  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;

  // Layer 1 (Far): Rocky mountains, dark pine forest, cabin, crimson Blood Moon
  ctx.drawImage(farImg, Math.round(-PAD_FAR + farShift), 0);

  // 1. Blood Moon eerie pulse + drifting crimson/indigo storm clouds across the sky & moon
  const moonX = 326 + farShift;
  const moonY = 42;
  const moonPulse = 0.22 + 0.08 * Math.sin(time * 1.25);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  drawGlowStamp(ctx, bloodStamp, moonX, moonY, 64, 64, moonPulse);
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const cx = ((trollCloudDriftX * (0.65 + (i % 3) * 0.22) + i * 115) % (STAGE_WIDTH + 180)) - 90;
    const cy = 14 + (i % 4) * 14;
    const rx = 56 + (i % 3) * 18;
    const ry = 11 + (i % 2) * 4;
    drawGlowStamp(ctx, smokeStamp, cx, cy, rx, ry, 0.34);
    drawGlowStamp(ctx, valleyMistStamp, cx + 14, cy + 3, rx * 0.72, ry * 0.7, 0.14);
  }
  ctx.restore();

  // Layer 2: Giant Ancestral Nordic Troll (breathing torso + subtle menacing head tilt)
  const trollBody = getTrollLandsImage('troll_body');
  const trollHead = getTrollLandsImage('troll_head');
  const breath = Math.sin(time * 0.85);
  const breathScaleY = 1 + breath * 0.022;
  const breathScaleX = 1 - breath * 0.006;
  const bodyLiftY = -breath * 0.85;

  if (trollBody) {
    const anchorX = 114 + 72 + trollShift;
    const anchorY = 14 + 104;
    ctx.save();
    ctx.translate(anchorX, anchorY + bodyLiftY);
    ctx.scale(breathScaleX, breathScaleY);
    ctx.drawImage(trollBody, -72, -104);
    ctx.restore();
  }

  if (trollHead) {
    const neckPivotX = 174 + 30 + trollShift;
    const neckPivotY = 3 + 56;
    const headTilt = Math.sin(time * 0.52) * 0.026;
    const headBobY = -breath * 1.5 + Math.sin(time * 1.05 + 0.7) * 0.75;
    const headSwayX = Math.sin(time * 0.38) * 0.65;
    ctx.save();
    ctx.translate(neckPivotX + headSwayX, neckPivotY + headBobY);
    ctx.rotate(headTilt);
    ctx.drawImage(trollHead, -30, -56);

    // Subtle Blood Moon eye glint on Troll's eye pixel (global 212, 23 => local +8, -36)
    const eyeGlow = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.7));
    ctx.globalCompositeOperation = 'lighter';
    drawGlowStamp(ctx, bloodStamp, 8, -36, 4.5, 4.5, eyeGlow);
    ctx.globalAlpha = eyeGlow;
    ctx.fillStyle = '#fecaca';
    ctx.fillRect(8, -36, 1, 1);
    ctx.restore();
  }

  // Upper chasm drifting mist behind cliffs/bridge
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const mx = ((time * 8.5 + i * 145) % (STAGE_WIDTH + 160)) - 80;
    const my = 126 + (i % 2) * 14;
    drawGlowStamp(ctx, valleyMistStamp, mx, my, 76, 15, 0.2);
  }
  ctx.restore();

  // Layer 3 (Mid): Foreground stone torch pillars, cliffs, bridge, waterfalls, skulls
  ctx.drawImage(midImg, Math.round(-PAD_MID + midShift), 0);

  // 3. Waterfalls: organic tapered cascading pixel streams & churning foam mist at plunge bases
  ctx.save();
  const wfTick = time * 44;
  for (let i = 0; i < TROLL_WATERFALLS.length; i++) {
    const wf = TROLL_WATERFALLS[i];
    const wx = wf.x + midShift;

    // Scrolling multi-lane water foam streaks tapered cleanly at top & bottom (zero hard rectangle!)
    const lanes = Math.max(3, Math.floor(wf.w / 3));
    for (let l = 0; l < lanes; l++) {
      const lx = Math.round(wx + 1 + (l * (wf.w - 2)) / lanes);
      const speed = 1 + (l % 2) * 0.35;
      const offset = (wfTick * speed + l * 6.5 + i * 9) % 14;
      for (let sy = wf.y + offset; sy < wf.y + wf.h - 4; sy += 14) {
        const relY = (sy - wf.y) / wf.h;
        const taper = Math.sin(Math.max(0.05, Math.min(0.95, relY)) * Math.PI);
        ctx.globalAlpha = (l % 2 === 0 ? 0.38 : 0.24) * taper;
        ctx.fillStyle = l % 2 === 0 ? '#ede9fe' : '#c4b5fd';
        ctx.fillRect(lx, Math.round(sy), 1, 5);
        ctx.fillRect(lx + 1, Math.round(sy + 3), 1, 3);
      }
    }

    // Churning base mist & spray at plunge pool
    const splashPulse = 0.2 + 0.07 * Math.sin(time * 6.5 + i * 1.4);
    drawGlowStamp(ctx, foamStamp, wx + wf.w * 0.5, wf.splashY, wf.w * 0.85, 7, splashPulse);
  }
  ctx.restore();

  // 4. Fluttering Ancient Crimson Rune Banners (pinned at top/pole, swaying smoothly in wind)
  const bannerL = getTrollLandsImage('banner_l');
  const bannerM = getTrollLandsImage('banner_m');
  const bannerR = getTrollLandsImage('banner_r');

  if (bannerL) {
    const swayL = Math.sin(time * 2.45) * 0.055 + Math.sin(time * 5.1) * 0.014;
    ctx.save();
    ctx.translate(Math.round(84 + 15 + midShift), 85);
    ctx.transform(1, swayL * 0.22, swayL, 1, 0, 0);
    ctx.drawImage(bannerL, -15, -3);
    ctx.restore();
  }
  if (bannerM) {
    const flutterM = Math.sin(time * 3.1 + 0.6) * 0.06 + Math.sin(time * 6.2) * 0.02;
    ctx.save();
    ctx.translate(Math.round(196 + midShift), 130);
    ctx.rotate(flutterM * 0.55);
    ctx.transform(1, flutterM * 0.45, 0, 1 + Math.cos(time * 4.4) * 0.04, 0, 0);
    ctx.drawImage(bannerM, -4, -4);
    ctx.restore();
  }
  if (bannerR) {
    const swayR = Math.sin(time * 2.3 + 1.3) * 0.055 + Math.sin(time * 4.9 + 0.5) * 0.014;
    ctx.save();
    ctx.translate(Math.round(370 + 15 + midShift), 89);
    ctx.transform(1, -swayR * 0.22, swayR, 1, 0, 0);
    ctx.drawImage(bannerR, -15, -3);
    ctx.restore();
  }

  // 5. Lower Chasm Drifting Mist
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const fx = ((time * 10.5 + i * 112) % (STAGE_WIDTH + 150)) - 75 + midShift * 0.3;
    const fy = 176 + (i % 2) * 9;
    drawGlowStamp(ctx, valleyMistStamp, fx, fy, 74, 14, 0.2);
  }
  ctx.restore();

  // 6. Brazier Flames, Glowing Pillar Runes & Rising Torch Smoke
  // Smoke plumes rendered behind flame tongues so fire lights up smoke base
  ctx.save();
  for (let i = 0; i < trollSmokePuffs.length; i++) {
    const p = trollSmokePuffs[i];
    const prog = p.life / p.maxLife;
    const alpha = (prog < 0.15 ? prog / 0.15 : 1 - (prog - 0.15) / 0.85) * 0.46;
    const r = 10 + prog * 18;
    drawGlowStamp(ctx, smokeStamp, p.x + midShift, p.y, r, r * 0.82, Math.max(0, alpha));
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < TROLL_BRAZIERS.length; i++) {
    const b = TROLL_BRAZIERS[i];
    const bx = b.x + midShift;
    const by = b.y;
    const flick = 0.86 + 0.14 * Math.sin(time * 13.5 + i * 2.2) + 0.05 * Math.cos(time * 21 + i);

    drawGlowStamp(ctx, goldStamp, bx, by - 6, 30 * flick, 28 * flick, 0.42);
    drawGlowStamp(ctx, bloodStamp, bx, by - 4, 38 * flick, 32 * flick, 0.24);

    // Subtle pixel-art flame wisps blending organically with the brazier fire
    const sway = Math.round(Math.sin(time * 12 + i * 2.1) * 2);
    const tipH = Math.round(7 + Math.sin(time * 16 + i * 1.7) * 3);
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(Math.round(bx - 3 + sway * 0.5), Math.round(by - tipH), 6, tipH);
    ctx.fillRect(Math.round(bx - 1 + sway), Math.round(by - tipH - 3), 2, 3);
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(Math.round(bx - 1 + sway * 0.4), Math.round(by - Math.round(tipH * 0.65)), 3, Math.max(2, Math.round(tipH * 0.55)));

    // Glowing carved runes on stone pillars
    const runePulse = 0.18 + 0.1 * Math.sin(time * 3.6 + i * 1.2);
    drawGlowStamp(ctx, bloodStamp, bx, 134, 15, 24, runePulse);
  }
  ctx.restore();

  // Layer 4 (Floor): Horizontal Nordic stone flagstone platform (feet sit crisply at GROUND_Y = 216)
  ctx.drawImage(floorImg, Math.round(-PAD_FLOOR + floorShift), FLOOR_Y);

  // Subtle torchlight & Blood Moon shimmer grazing left/right edges of stone floor
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const torchReflect = 0.12 + 0.05 * Math.sin(time * 6.4);
  drawGlowStamp(ctx, goldStamp, 38 + floorShift, 224, 52, 16, torchReflect);
  drawGlowStamp(ctx, goldStamp, 442 + floorShift, 224, 52, 16, torchReflect * 0.95);
  drawGlowStamp(ctx, bloodStamp, 240 + floorShift, 214, 96, 12, 0.09 + 0.04 * Math.sin(time * 1.8));
  ctx.restore();

  // Layer 5: Floating Dust, Ash & Ember Particles across the battlefield
  ctx.save();
  for (let i = 0; i < trollAshParticles.length; i++) {
    const a = trollAshParticles[i];
    const prog = a.life / a.maxLife;
    const fade = prog < 0.2 ? prog / 0.2 : 1 - (prog - 0.2) / 0.8;
    ctx.globalAlpha = Math.max(0, Math.min(1, fade * (a.kind === 'ember' ? 0.85 : 0.58)));
    if (a.kind === 'ember') {
      ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fb923c' : '#ef4444';
    } else if (a.kind === 'ash') {
      ctx.fillStyle = '#cbd5e1';
    } else {
      ctx.fillStyle = '#d8b4fe';
    }
    const shift = a.kind === 'ember' ? midShift : floorShift * 0.65;
    ctx.fillRect(Math.round(((a.x + shift) % STAGE_WIDTH + STAGE_WIDTH) % STAGE_WIDTH), Math.round(a.y), a.size, a.size);
  }
  ctx.restore();

  ctx.imageSmoothingEnabled = prevSmooth;
  return true;
}

type MinotaurColiseumAssetKey =
  | 'far'
  | 'mid'
  | 'floor'
  | 'banner_c'
  | 'chain_l'
  | 'chain_r';

const MINOTAUR_COLISEUM_FILES: Record<MinotaurColiseumAssetKey, string> = {
  far: '/assets/arenas/minotaur_coliseum_far.png',
  mid: '/assets/arenas/minotaur_coliseum_mid.png',
  floor: '/assets/arenas/minotaur_coliseum_floor.png',
  banner_c: '/assets/arenas/minotaur_coliseum_banner_c.png',
  chain_l: '/assets/arenas/minotaur_coliseum_chain_l.png',
  chain_r: '/assets/arenas/minotaur_coliseum_chain_r.png',
};

const minotaurColiseumImages = new Map<MinotaurColiseumAssetKey, HTMLImageElement>();
let minotaurColiseumLoaded = false;

function ensureMinotaurColiseumAssets(): void {
  if (minotaurColiseumLoaded || typeof Image === 'undefined') return;
  minotaurColiseumLoaded = true;
  for (const [key, src] of Object.entries(MINOTAUR_COLISEUM_FILES) as [MinotaurColiseumAssetKey, string][]) {
    const img = new Image();
    img.src = src;
    minotaurColiseumImages.set(key, img);
  }
}

function getMinotaurColiseumImage(key: MinotaurColiseumAssetKey): HTMLImageElement | null {
  ensureMinotaurColiseumAssets();
  const img = minotaurColiseumImages.get(key);
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

const COLISEUM_BRAZIERS = [
  { x: 38, y: 108, scale: 1.25 },
  { x: 442, y: 108, scale: 1.25 },
  { x: 191, y: 130, scale: 0.92 },
  { x: 289, y: 130, scale: 0.92 },
  { x: 154, y: 158, scale: 0.52 },
  { x: 326, y: 158, scale: 0.52 },
  { x: 75, y: 24, scale: 0.58 },
  { x: 405, y: 24, scale: 0.58 },
  { x: 221, y: 134, scale: 0.36 },
  { x: 259, y: 134, scale: 0.36 },
] as const;

const COLISEUM_SPECTATORS: { x: number; y: number; phase: number; color: string; headColor: string }[] = [
  // Left curved amphitheater stands (tucked between outer wall, hanging banner, and left Minotaur statue)
  ...[9, 14, 19, 24, 85, 90, 95, 100].map((x, idx) => ({
    x,
    y: Math.round(66 + (x / 180) * 6 + (idx % 2)),
    phase: idx * 0.95,
    color: idx % 3 === 0 ? '#6b2020' : idx % 2 === 0 ? '#5c3828' : '#3a2b28',
    headColor: idx % 4 === 0 ? '#8c6252' : '#634942',
  })),
  ...[8, 13, 18, 23, 84, 89, 94, 99, 168, 174, 180].map((x, idx) => ({
    x,
    y: Math.round(97 + (x / 180) * 5 + (idx % 2)),
    phase: idx * 1.25 + 0.6,
    color: idx % 3 === 0 ? '#732522' : idx % 2 === 0 ? '#693f2b' : '#40312d',
    headColor: idx % 4 === 0 ? '#946a58' : '#6b4e45',
  })),
  // Right curved amphitheater stands (symmetrical)
  ...[380, 385, 390, 395, 456, 461, 466, 471].map((x, idx) => ({
    x,
    y: Math.round(66 + ((480 - x) / 180) * 6 + (idx % 2)),
    phase: idx * 1.1 + 1.8,
    color: idx % 3 === 0 ? '#6b2020' : idx % 2 === 0 ? '#5c3828' : '#3a2b28',
    headColor: idx % 4 === 0 ? '#8c6252' : '#634942',
  })),
  ...[300, 306, 312, 381, 386, 391, 396, 457, 462, 467, 472].map((x, idx) => ({
    x,
    y: Math.round(97 + ((480 - x) / 180) * 5 + (idx % 2)),
    phase: idx * 1.4 + 2.3,
    color: idx % 3 === 0 ? '#732522' : idx % 2 === 0 ? '#693f2b' : '#40312d',
    headColor: idx % 4 === 0 ? '#946a58' : '#6b4e45',
  })),
];

interface ColiseumSmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  brazierIdx: number;
}

const coliseumSmokePuffs: ColiseumSmokePuff[] = Array.from({ length: 18 }, (_, idx) => {
  const bIdx = idx % 4;
  const anchor = COLISEUM_BRAZIERS[bIdx];
  const maxLife = 1.9 + (idx % 4) * 0.4;
  return {
    x: anchor.x + ((idx * 5) % 8) - 4,
    y: anchor.y - 10 - (idx % 5) * 10,
    vx: ((idx % 3) - 1) * 3.5,
    vy: -(14 + (idx % 4) * 4),
    life: (idx / 18) * maxLife,
    maxLife,
    brazierIdx: bIdx,
  };
});

interface ColiseumEmber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  brazierIdx: number;
}

const coliseumEmbers: ColiseumEmber[] = Array.from({ length: 30 }, (_, idx) => {
  const bIdx = idx % 6;
  const anchor = COLISEUM_BRAZIERS[bIdx];
  const maxLife = 1.6 + (idx % 5) * 0.35;
  return {
    x: anchor.x + ((idx * 7) % 12) - 6,
    y: anchor.y - (idx % 4) * 14,
    vx: ((idx % 3) - 1) * 5,
    vy: -(16 + (idx % 4) * 6),
    life: (idx / 30) * maxLife,
    maxLife,
    size: idx % 3 === 0 ? 2 : 1,
    brazierIdx: bIdx,
  };
});

let lastColiseumTime: number | null = null;
let coliseumCloudDriftX = 0;

function renderMinotaurColiseum(
  ctx: CanvasRenderingContext2D,
  time: number,
  cameraXOffset: number
): boolean {
  const farImg = getMinotaurColiseumImage('far');
  const midImg = getMinotaurColiseumImage('mid');
  const floorImg = getMinotaurColiseumImage('floor');
  if (!farImg || !midImg || !floorImg) {
    return false;
  }

  let dt = 1 / 60;
  if (lastColiseumTime !== null) {
    const delta = time - lastColiseumTime;
    if (delta >= 0 && delta < 0.25) dt = delta;
  }
  lastColiseumTime = time;
  coliseumCloudDriftX = (coliseumCloudDriftX + dt * 5.2) % (STAGE_WIDTH + 180);

  for (let i = 0; i < coliseumSmokePuffs.length; i++) {
    const p = coliseumSmokePuffs[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      const b = COLISEUM_BRAZIERS[p.brazierIdx];
      p.x = b.x + Math.sin(time * 3.8 + i) * 5 * b.scale;
      p.y = b.y - 8 * b.scale;
      p.vx = Math.sin(time * 2.1 + i * 1.3) * 4.5;
      p.vy = -(13 + (i % 4) * 3.5);
      p.life = 0;
    } else {
      p.x += (p.vx + Math.sin(time * 2.3 + i) * 3) * dt;
      p.y += p.vy * dt;
    }
  }

  for (let i = 0; i < coliseumEmbers.length; i++) {
    const e = coliseumEmbers[i];
    e.life += dt;
    if (e.life >= e.maxLife) {
      const b = COLISEUM_BRAZIERS[e.brazierIdx];
      e.x = b.x + Math.sin(time * 4.2 + i) * 7 * b.scale;
      e.y = b.y - 3;
      e.vx = Math.sin(time * 2.4 + i * 1.6) * 7;
      e.vy = -(16 + (i % 4) * 5.5);
      e.life = 0;
    } else {
      e.x += (e.vx + Math.sin(time * 2.6 + i) * 5) * dt;
      e.y += e.vy * dt;
    }
  }

  const PAD_FAR = 20;
  const PAD_MID = 20;
  const PAD_FLOOR = 30;
  const FLOOR_Y = 198;

  const farShift = Math.max(-6, Math.min(6, -cameraXOffset * 0.08));
  const midShift = Math.max(-7, Math.min(7, -cameraXOffset * 0.18));
  const floorShift = Math.max(-16, Math.min(16, -cameraXOffset * 0.45));

  const goldStamp = getGlowStamp('gold');
  const bloodStamp = getGlowStamp('blood');
  const smokeStamp = getGlowStamp('smoke');
  const hellMistStamp = getGlowStamp('hell_mist');

  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;

  // Layer 1 (Far): Infernal crimson storm sky + drifting dark storm clouds + fiery sky pulse
  ctx.drawImage(farImg, Math.round(-PAD_FAR + farShift), 0);

  ctx.save();
  for (let i = 0; i < 6; i++) {
    const cx = ((coliseumCloudDriftX * (0.65 + (i % 3) * 0.2) + i * 110) % (STAGE_WIDTH + 180)) - 90;
    const cy = 12 + (i % 4) * 11;
    const rx = 58 + (i % 3) * 18;
    const ry = 10 + (i % 2) * 4;
    drawGlowStamp(ctx, hellMistStamp, cx, cy, rx, ry, 0.34);
  }
  ctx.globalCompositeOperation = 'lighter';
  const skyFlash = 0.08 + 0.05 * Math.sin(time * 2.1) + 0.03 * Math.sin(time * 7.3);
  drawGlowStamp(ctx, bloodStamp, 240 + farShift, 34, 140, 32, skyFlash);
  ctx.restore();

  // Layer 2 (Mid): Black obsidian temple pillars, Minotaur statues, throne, stairs, stands & skulls
  ctx.drawImage(midImg, Math.round(-PAD_MID + midShift), 0);

  // Subtle side shadow vignette so corner camera pans blend naturally into dark coliseum walls
  ctx.save();
  const leftEdgeGrad = ctx.createLinearGradient(0, 0, 14, 0);
  leftEdgeGrad.addColorStop(0, 'rgba(8, 3, 4, 0.58)');
  leftEdgeGrad.addColorStop(1, 'rgba(8, 3, 4, 0)');
  ctx.fillStyle = leftEdgeGrad;
  ctx.fillRect(0, 0, 14, FLOOR_Y);
  const rightEdgeGrad = ctx.createLinearGradient(STAGE_WIDTH - 14, 0, STAGE_WIDTH, 0);
  rightEdgeGrad.addColorStop(0, 'rgba(8, 3, 4, 0)');
  rightEdgeGrad.addColorStop(1, 'rgba(8, 3, 4, 0.58)');
  ctx.fillStyle = rightEdgeGrad;
  ctx.fillRect(STAGE_WIDTH - 14, 0, 14, FLOOR_Y);
  ctx.restore();

  // 1. Reacting Stadium Crowd in shadowed left & right tiered stands (pixel-scale silhouettes & cheering fists)
  ctx.save();
  for (let i = 0; i < COLISEUM_SPECTATORS.length; i++) {
    const sp = COLISEUM_SPECTATORS[i];
    const wave = Math.sin(time * 5.2 + sp.phase);
    const jump = wave > 0.25 ? 1 : 0;
    const sx = Math.round(sp.x + midShift);
    const sy = sp.y - jump;
    ctx.globalAlpha = 0.56;
    ctx.fillStyle = sp.color;
    ctx.fillRect(sx, sy - 2, 2, 2);
    ctx.fillStyle = sp.headColor;
    ctx.fillRect(sx, sy - 3, 1, 1);
    if (Math.sin(time * 4.4 + sp.phase * 1.7) > 0.42) {
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = i % 5 === 0 ? '#c2410c' : '#785a4d';
      ctx.fillRect(sx + 1, sy - 4, 1, 2);
    }
  }
  ctx.restore();

  // 2. Swaying Hanging Iron Chains flanking central banner
  const chainL = getMinotaurColiseumImage('chain_l');
  const chainR = getMinotaurColiseumImage('chain_r');
  if (chainL) {
    const rotL = Math.sin(time * 1.8) * 0.028;
    ctx.save();
    ctx.translate(Math.round(213 + midShift), 30);
    ctx.rotate(rotL);
    ctx.drawImage(chainL, -5, 0);
    ctx.restore();
  }
  if (chainR) {
    const rotR = Math.sin(time * 1.75 + 0.9) * 0.028;
    ctx.save();
    ctx.translate(Math.round(267 + midShift), 30);
    ctx.rotate(rotR);
    ctx.drawImage(chainR, -5, 0);
    ctx.restore();
  }

  // 3. Fluttering Giant Central Minotaur Banner
  const bannerC = getMinotaurColiseumImage('banner_c');
  if (bannerC) {
    const swayC = Math.sin(time * 2.2) * 0.036 + Math.sin(time * 4.7) * 0.01;
    ctx.save();
    ctx.translate(Math.round(240 + midShift), 29);
    ctx.transform(1, swayC * 0.16, swayC, 1, 0, 0);
    ctx.drawImage(bannerC, -19, -1);
    ctx.restore();
  }

  // 4. Trembling Orange-Crimson Firelight on Stone Walls, Minotaur Statues & Throne
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const wallFlickL = 0.12 + 0.06 * Math.sin(time * 11.5) + 0.03 * Math.cos(time * 19.2);
  const wallFlickR = 0.12 + 0.06 * Math.sin(time * 11.2 + 1.4) + 0.03 * Math.cos(time * 18.7);
  drawGlowStamp(ctx, goldStamp, 132 + midShift, 78, 42, 48, wallFlickL * 0.85);
  drawGlowStamp(ctx, goldStamp, 348 + midShift, 78, 42, 48, wallFlickR * 0.85);
  drawGlowStamp(ctx, goldStamp, 189 + midShift, 94, 24, 46, wallFlickL);
  drawGlowStamp(ctx, goldStamp, 291 + midShift, 94, 24, 46, wallFlickR);
  drawGlowStamp(ctx, bloodStamp, 240 + midShift, 128, 36, 26, 0.11 + 0.04 * Math.sin(time * 7.8));
  ctx.restore();

  // 5. Rising Brazier Smoke Plumes
  ctx.save();
  for (let i = 0; i < coliseumSmokePuffs.length; i++) {
    const p = coliseumSmokePuffs[i];
    const prog = p.life / p.maxLife;
    const alpha = (prog < 0.18 ? prog / 0.18 : 1 - (prog - 0.18) / 0.82) * 0.44;
    const r = 9 + prog * 17;
    drawGlowStamp(ctx, smokeStamp, p.x + midShift, p.y, r, r * 0.85, Math.max(0, alpha));
  }
  ctx.restore();

  // 6. Intense Flickering Torch Flames & Glow Halos
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < COLISEUM_BRAZIERS.length; i++) {
    const b = COLISEUM_BRAZIERS[i];
    const bx = b.x + midShift;
    const by = b.y;
    const flick = 0.85 + 0.15 * Math.sin(time * 14.5 + i * 2.3) + 0.06 * Math.cos(time * 22 + i);
    const radius = 26 * b.scale * flick;

    drawGlowStamp(ctx, goldStamp, bx, by - 6 * b.scale, radius, radius * 0.92, 0.36);
    drawGlowStamp(ctx, bloodStamp, bx, by - 4 * b.scale, radius * 1.25, radius, 0.2);

    // Pixel flame wisps over brazier bowl
    const sway = Math.round(Math.sin(time * 13 + i * 1.9) * 2 * b.scale);
    const tipH = Math.round((7 + Math.sin(time * 17 + i * 1.7) * 3) * b.scale);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#fb923c';
    ctx.fillRect(
      Math.round(bx - 3 * b.scale + sway * 0.5),
      Math.round(by - tipH),
      Math.max(2, Math.round(6 * b.scale)),
      Math.max(2, tipH)
    );
    ctx.fillRect(
      Math.round(bx - 1 * b.scale + sway),
      Math.round(by - tipH - 3 * b.scale),
      Math.max(1, Math.round(2 * b.scale)),
      Math.max(1, Math.round(3 * b.scale))
    );
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(
      Math.round(bx - 1 * b.scale + sway * 0.4),
      Math.round(by - Math.round(tipH * 0.65)),
      Math.max(1, Math.round(3 * b.scale)),
      Math.max(2, Math.round(tipH * 0.55))
    );
  }
  ctx.restore();

  // 7. Slowly Drifting Dark Atmospheric Mist along Lower Parapet & Stairs Base
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const mx = ((time * 7.8 + i * 105) % (STAGE_WIDTH + 160)) - 80 + midShift * 0.35;
    const my = 188 + (i % 2) * 8;
    drawGlowStamp(ctx, hellMistStamp, mx, my, 76, 15, 0.32);
  }
  ctx.restore();

  // Layer 3 (Floor): Cracked black stone combat platform + bloodstains + carved Minotaur skulls
  ctx.drawImage(floorImg, Math.round(-PAD_FLOOR + floorShift), FLOOR_Y);

  // 8. Orange Torchlight Trembling Reflection Across Stone Platform & Blood Emblem
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fFlickL = 0.14 + 0.06 * Math.sin(time * 9.5) + 0.02 * Math.sin(time * 17.3);
  const fFlickR = 0.14 + 0.06 * Math.sin(time * 9.3 + 1.8) + 0.02 * Math.sin(time * 16.9);
  drawGlowStamp(ctx, goldStamp, 46 + floorShift, 220, 62, 18, fFlickL);
  drawGlowStamp(ctx, goldStamp, 434 + floorShift, 220, 62, 18, fFlickR);
  drawGlowStamp(ctx, goldStamp, 188 + floorShift, 210, 48, 12, fFlickL * 0.72);
  drawGlowStamp(ctx, goldStamp, 292 + floorShift, 210, 48, 12, fFlickR * 0.72);
  drawGlowStamp(ctx, bloodStamp, 240 + floorShift, 218, 92, 14, 0.1 + 0.04 * Math.sin(time * 2.5));
  ctx.restore();

  // 9. Floating Fire Embers Drifting Across the Coliseum
  ctx.save();
  for (let i = 0; i < coliseumEmbers.length; i++) {
    const e = coliseumEmbers[i];
    const progress = e.life / e.maxLife;
    const alpha = (progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8) * 0.82;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = i % 3 === 0 ? '#fef08a' : i % 2 === 0 ? '#fb923c' : '#ef4444';
    ctx.fillRect(Math.round(e.x + midShift), Math.round(e.y), e.size, e.size);
  }
  ctx.restore();

  ctx.imageSmoothingEnabled = prevSmooth;
  return true;
}

export function renderArena(
  ctx: CanvasRenderingContext2D,
  arenaId: ArenaId,
  time: number,
  cameraXOffset = 0
): void {
  if (arenaId === 'shadow_temple') {
    if (renderShadowTemple(ctx, time, cameraXOffset)) {
      return;
    }
  }
  if (arenaId === 'minotaur_coliseum') {
    if (renderMinotaurColiseum(ctx, time, cameraXOffset)) {
      return;
    }
  }
  if (arenaId === 'celestial_cathedral') {
    if (renderCelestialCathedral(ctx, time, cameraXOffset)) {
      return;
    }
  }
  if (arenaId === 'troll_lands') {
    if (renderTrollLands(ctx, time, cameraXOffset)) {
      return;
    }
  }

  const def = ARENAS[arenaId];

  // 1. Sky gradient bands (pixel-art stepped bands!)
  const bands = 8;
  const skyHeight = GROUND_Y;
  const bandH = Math.ceil(skyHeight / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    ctx.fillStyle = t < 0.5 ? def.skyTop : def.skyBottom;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, i * bandH, STAGE_WIDTH, bandH);
  }

  // Smooth pixel dither transition between skyTop and skyBottom
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, def.skyTop);
  skyGrad.addColorStop(1, def.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, STAGE_WIDTH, GROUND_Y);

  const pxShift = Math.round(cameraXOffset * 0.2);

  if (arenaId === 'shadow_temple') {
    // Lightweight fallback while Templo das Sombras textures decode on first frame
    ctx.fillStyle = '#e9d5ff';
    ctx.beginPath();
    ctx.arc(357 - pxShift, 39, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b122b';
    ctx.fillRect(145, 74, 190, GROUND_Y - 74);
  } else if (arenaId === 'minotaur_coliseum') {
    // Lightweight dark-stone & crimson-sky fallback while Coliseu dos Minotauros textures decode on frame 1
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, 0, STAGE_WIDTH, 76);
    ctx.fillStyle = '#1c1412';
    ctx.fillRect(175, 22, 130, GROUND_Y - 22);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(221, 28, 38, 80);
  } else if (arenaId === 'elven_forest') {
    // Pale full moon
    ctx.fillStyle = '#d1fae5';
    ctx.fillRect(220 - pxShift, 22, 28, 28);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(224 - pxShift, 26, 20, 20);

    // Distant waterfall
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(310, 88, 28, GROUND_Y - 88);
    const waterOffset = Math.floor(time * 24) % 8;
    ctx.fillStyle = '#67e8f9';
    for (let wy = 90 + waterOffset; wy < GROUND_Y; wy += 12) {
      ctx.fillRect(314, wy, 4, 6);
      ctx.fillRect(326, wy - 4, 4, 6);
    }

    // Giant ancient trees
    const treeXs = [28, 128, 250, 390];
    treeXs.forEach((tx, idx) => {
      ctx.fillStyle = '#0a291e';
      ctx.fillRect(tx, 20, 42 + (idx % 2) * 14, GROUND_Y - 20);
      ctx.fillStyle = '#144533';
      ctx.fillRect(tx + 6, 20, 12, GROUND_Y - 20);
      // Canopy leaves
      ctx.fillStyle = '#064e3b';
      ctx.fillRect(tx - 24, 0, 96, 58);
      ctx.fillStyle = '#047857';
      ctx.fillRect(tx - 14, 12, 72, 34);
    });

    // Floating emerald fireflies
    for (let i = 0; i < 16; i++) {
      const fx = (i * 33 + Math.sin(time * 1.3 + i) * 18) % STAGE_WIDTH;
      const fy = 70 + ((i * 29) % 130) + Math.cos(time * 2 + i) * 8;
      ctx.fillStyle = i % 2 === 0 ? '#86efac' : '#fde047';
      ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(time * 3 + i));
      ctx.fillRect(Math.round(fx), Math.round(fy), 2, 2);
    }
    ctx.globalAlpha = 1;
  } else if (arenaId === 'realm_of_dead') {
    // Eerie purple moon
    ctx.fillStyle = '#e9d5ff';
    ctx.fillRect(100 - pxShift, 24, 24, 24);
    ctx.fillStyle = '#7e22ce';
    ctx.globalAlpha = 0.22;
    ctx.fillRect(92 - pxShift, 16, 40, 40);
    ctx.globalAlpha = 1;

    // Jagged obsidian spires & ruined crypts
    const spires = [34, 110, 210, 290, 396];
    spires.forEach((sx, i) => {
      const h = 75 + (i % 3) * 28;
      ctx.fillStyle = '#160b24';
      ctx.fillRect(sx, GROUND_Y - h, 26, h);
      ctx.fillStyle = '#3b0764';
      ctx.fillRect(sx + 4, GROUND_Y - h + 8, 6, h - 12);
      // Glowing rune
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(sx + 11, GROUND_Y - h + 18, 4, 8);
    });

    // Drifting ground mist & floating spectral wisps
    const mistShift = Math.round(time * 14) % 48;
    ctx.fillStyle = '#9333ea';
    ctx.globalAlpha = 0.18;
    for (let x = -48; x < STAGE_WIDTH + 48; x += 48) {
      ctx.fillRect(x + mistShift, GROUND_Y - 14, 38, 14);
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < 8; i++) {
      const wx = (i * 64 + time * 16 * (i % 2 === 0 ? 1 : -1) + 480) % STAGE_WIDTH;
      const wy = 90 + Math.sin(time * 2.2 + i) * 24 + (i % 3) * 20;
      ctx.fillStyle = '#2dd4bf';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(Math.round(wx), Math.round(wy), 5, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(wx) + 1, Math.round(wy) + 1, 1, 1);
      ctx.fillRect(Math.round(wx) + 3, Math.round(wy) + 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  } else if (arenaId === 'celestial_cathedral') {
    // Lightweight fallback while Catedral Celestial texture decodes on first frame
    ctx.fillStyle = '#182038';
    ctx.fillRect(0, 34, STAGE_WIDTH, GROUND_Y - 34);
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath();
    ctx.arc(240 - pxShift, 70, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#334155';
    [12, 114, 348, 448].forEach((px) => {
      ctx.fillRect(px, 28, 20, GROUND_Y - 28);
    });
  } else if (arenaId === 'troll_lands') {
    // Lightweight Nordic Blood Moon fallback while Terra dos Trolls textures decode on first frame
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(326 - pxShift, 42, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#190f24';
    ctx.fillRect(0, 108, STAGE_WIDTH, GROUND_Y - 108);
    ctx.fillStyle = '#291f30';
    ctx.fillRect(150, 32, 92, 92);
  }

  // 2. Arena Floor with 90s perspective tile stripes
  const floorGrad = ctx.createLinearGradient(0, GROUND_Y, 0, STAGE_HEIGHT);
  floorGrad.addColorStop(0, def.floorTop);
  floorGrad.addColorStop(1, def.floorBottom);
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, STAGE_HEIGHT - GROUND_Y);

  // Crisp top horizon border
  ctx.fillStyle = '#09070d';
  ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, 2);
  ctx.fillStyle = def.accentColor;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, GROUND_Y + 2, STAGE_WIDTH, 1);
  ctx.globalAlpha = 1;

  // Perspective flagstones
  ctx.strokeStyle = 'rgba(9, 7, 13, 0.45)';
  ctx.lineWidth = 1;
  for (let i = -6; i <= 6; i++) {
    const topX = STAGE_WIDTH / 2 + i * 38;
    const botX = STAGE_WIDTH / 2 + i * 54;
    ctx.beginPath();
    ctx.moveTo(topX, GROUND_Y + 2);
    ctx.lineTo(botX, STAGE_HEIGHT);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(9, 7, 13, 0.28)';
  ctx.fillRect(0, GROUND_Y + 14, STAGE_WIDTH, 1);
  ctx.fillRect(0, GROUND_Y + 30, STAGE_WIDTH, 1);
}
