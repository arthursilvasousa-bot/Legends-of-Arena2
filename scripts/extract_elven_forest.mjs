import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Floresta__lfica_Encantada_sob_a_Lua_71a7f52c.webp';
const OUT_DIR = 'public/assets/arenas';
const CHECK_DIR = '.playwright-cli';

const W = 480;
const H = 270;
const W2 = 960;
const H2 = 540;
const PAD_FAR = 20;   // 520x270
const PAD_MID = 20;   // 520x270
const PAD_FLOOR = 30; // 540x72
const FLOOR_Y = 198;
const FLOOR_H = H - FLOOR_Y; // 72

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(CHECK_DIR, { recursive: true });

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothStep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function writeRgbaPng(buf, w, h, outPath) {
  execFileSync(
    'convert',
    ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', outPath],
    { input: buf, maxBuffer: 64 * 1024 * 1024 }
  );
}

function loadResizedRgba(w, h) {
  return execFileSync(
    'convert',
    [SRC, '-filter', 'Lanczos', '-resize', `${w}x${h}!`, '-alpha', 'on', '-depth', '8', 'rgba:-'],
    { maxBuffer: 64 * 1024 * 1024 }
  );
}

function getPx(buf, w, h, x, y) {
  const cx = clamp(x, 0, w - 1);
  const cy = clamp(y, 0, h - 1);
  const i = (cy * w + cx) * 4;
  return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]];
}

function setPx(buf, w, x, y, r, g, b, a = 255) {
  const i = (y * w + x) * 4;
  buf[i] = clamp(Math.round(r), 0, 255);
  buf[i + 1] = clamp(Math.round(g), 0, 255);
  buf[i + 2] = clamp(Math.round(b), 0, 255);
  buf[i + 3] = clamp(Math.round(a), 0, 255);
}

function padHorizontalClamped(buf, w, h, pad, dimEdges = true) {
  const outW = w + pad * 2;
  const out = Buffer.alloc(outW * h * 4);
  const margin = 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < outW; x++) {
      let sx = x - pad;
      let edgeDist = 0;
      if (sx < 0) {
        edgeDist = -sx;
        const m = (-sx - 1) % (margin * 2);
        sx = m < margin ? m : margin * 2 - 1 - m;
      } else if (sx >= w) {
        edgeDist = sx - (w - 1);
        const m = (sx - w) % (margin * 2);
        const off = m < margin ? m : margin * 2 - 1 - m;
        sx = w - 1 - off;
      }
      sx = clamp(sx, 0, w - 1);
      const si = (y * w + sx) * 4;
      const di = (y * outW + x) * 4;
      const dim = dimEdges && edgeDist > 0 ? Math.max(0.72, 1 - edgeDist * 0.012) : 1;
      out[di] = Math.round(buf[si] * dim);
      out[di + 1] = Math.round(buf[si + 1] * dim);
      out[di + 2] = Math.round(buf[si + 2] * dim);
      out[di + 3] = buf[si + 3];
    }
  }
  return out;
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToPolyEdge(px, py, poly) {
  let minD = 999;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const x1 = poly[j][0], y1 = poly[j][1];
    const x2 = poly[i][0], y2 = poly[i][1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? clamp(((px - x1) * dx + (py - y1) * dy) / len2, 0, 1) : 0;
    const d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    if (d < minD) minD = d;
  }
  return minD;
}

function extractCropFromBuf(srcBuf, srcW, srcH, x0, y0, cw, ch, alphaFn) {
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gx = x0 + x;
      const gy = y0 + y;
      const [r, g, b] = getPx(srcBuf, srcW, srcH, gx, gy);
      const a = alphaFn(gx, gy, r, g, b);
      const di = (y * cw + x) * 4;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = clamp(Math.round(a), 0, 255);
    }
  }
  return out;
}

/**
 * Smooth 2D neighbor-sampled texture infill (avoids horizontal line banding).
 */
function inpaintSmooth(buf, w, h, x1, y1, x2, y2, maskFn, verticalWeight = 0.55) {
  const copy = Buffer.from(buf);
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (!maskFn(x, y)) continue;
      // Average small 3-sample neighborhoods on left/right/top/bottom boundaries
      const sampleRow = (sx, sy) => {
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let d = -2; d <= 2; d++) {
          const yy = clamp(sy + d, 0, h - 1);
          const p = getPx(copy, w, h, sx, yy);
          sr += p[0]; sg += p[1]; sb += p[2]; cnt++;
        }
        return [sr / cnt, sg / cnt, sb / cnt];
      };
      const sampleCol = (sx, sy) => {
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let d = -2; d <= 2; d++) {
          const xx = clamp(sx + d, 0, w - 1);
          const p = getPx(copy, w, h, xx, sy);
          sr += p[0]; sg += p[1]; sb += p[2]; cnt++;
        }
        return [sr / cnt, sg / cnt, sb / cnt];
      };

      let lx = x - 1;
      while (lx >= Math.max(0, x1 - 14) && maskFn(lx, y)) lx--;
      let rx = x + 1;
      while (rx <= Math.min(w - 1, x2 + 14) && maskFn(rx, y)) rx++;
      let ty = y - 1;
      while (ty >= Math.max(0, y1 - 14) && maskFn(x, ty)) ty--;
      let by = y + 1;
      while (by <= Math.min(h - 1, y2 + 14) && maskFn(x, by)) by++;

      const lPx = sampleRow(lx, y);
      const rPx = sampleRow(rx, y);
      const tPx = sampleCol(x, ty);
      const bPx = sampleCol(x, by);

      const tx = rx > lx ? (x - lx) / (rx - lx) : 0.5;
      const tyFrac = by > ty ? (y - ty) / (by - ty) : 0.5;

      const hR = lPx[0] * (1 - tx) + rPx[0] * tx;
      const hG = lPx[1] * (1 - tx) + rPx[1] * tx;
      const hB = lPx[2] * (1 - tx) + rPx[2] * tx;

      const vR = tPx[0] * (1 - tyFrac) + bPx[0] * tyFrac;
      const vG = tPx[1] * (1 - tyFrac) + bPx[1] * tyFrac;
      const vB = tPx[2] * (1 - tyFrac) + bPx[2] * tyFrac;

      const grain = Math.sin(x * 0.41 + y * 0.63) * 2.5 + Math.cos(x * 0.23 - y * 0.37) * 2.0;
      setPx(
        buf,
        w,
        x,
        y,
        hR * (1 - verticalWeight) + vR * verticalWeight + grain,
        hG * (1 - verticalWeight) + vG * verticalWeight + grain,
        hB * (1 - verticalWeight) + vB * verticalWeight + grain,
        255
      );
    }
  }
}

console.log('Loading Floresta Élfica reference artwork...');
const base = loadResizedRgba(W, H);
const base2x = loadResizedRgba(W2, H2);

// ==================== 1. POLYGONS ====================
const CASTLE_POLY = [
  [218, 138], [228, 86], [238, 68], [244, 52], [250, 62], [256, 32],
  [264, 52], [270, 20], [276, 6], [283, 28], [287, 14], [292, 6],
  [298, 30], [305, 16], [312, 34], [320, 44], [330, 36], [340, 56],
  [352, 66], [366, 86], [368, 138],
];

const BRIDGE_ARCH_HOLE = [
  [235, 134], [244, 125], [256, 122], [268, 126], [275, 136],
  [277, 152], [266, 150], [250, 149], [236, 151],
];

function midTopCanopyLine(x) {
  if (x < 176) return 999; // Keep full left tree + mossy purple left branch canopy
  if (x < 226) return 38 - ((x - 176) / 50) * 16;
  if (x < 306) return 10;
  if (x < 345) return 10 + ((x - 306) / 39) * 32;
  return 999;
}

function midGroundRidgeLine(x) {
  if (x < 176) return 999;
  if (x < 198) return 114;
  if (x < 236) return 117 - ((x - 198) / 38) * 5;
  if (x < 292) return 112 + ((x - 236) / 56) * 14;
  if (x <= 345) return 126 + ((x - 292) / 53) * 12;
  return 138;
}

// ==================== 2. LAYER 1: FAR (Twilight Sky & Distant Mist, 520x270) ====================
const far = Buffer.from(base);
// Smooth twilight sky gradient replacing castle spires so parallax has zero double-spires & zero banding
for (let y = 4; y <= 136; y++) {
  for (let x = 216; x <= 372; x++) {
    if (!pointInPoly(x, y, CASTLE_POLY)) continue;
    const edgeD = distToPolyEdge(x, y, CASTLE_POLY);
    const blend = edgeD < 3 ? clamp(edgeD / 3, 0, 1) : 1;
    const ty = clamp((y - 4) / 132, 0, 1);
    const tx = clamp((x - 216) / 156, 0, 1);
    // Moonlit cloud glow centered around (242, 34) fading to deep midnight blue on right
    const moonDist = Math.hypot((x - 242) * 0.75, y - 34);
    const cloudGlow = Math.max(0, 1 - moonDist / 72);
    const wisp = Math.sin(x * 0.08 + y * 0.14) * 7 + Math.cos(x * 0.15 - y * 0.09) * 5;
    const skyR = 32 + cloudGlow * 54 + (1 - tx) * 18 - ty * 14 + wisp * 0.5;
    const skyG = 58 + cloudGlow * 66 + (1 - tx) * 20 - ty * 18 + wisp * 0.6;
    const skyB = 132 + cloudGlow * 78 - ty * 34 + wisp * 0.9;
    const [curR, curG, curB] = getPx(far, W, H, x, y);
    setPx(
      far,
      W,
      x,
      y,
      curR * (1 - blend) + skyR * blend,
      curG * (1 - blend) + skyG * blend,
      curB * (1 - blend) + skyB * blend,
      255
    );
  }
}
const farPadded = padHorizontalClamped(far, W, H, PAD_FAR, true);
writeRgbaPng(farPadded, W + PAD_FAR * 2, H, path.join(OUT_DIR, 'elven_forest_far.png'));

// ==================== 3. LAYER 2: CASTLE & DISTANT TERRACE ONLY (520x270) ====================
// Strictly excludes foreground waterfalls & stone bridge (which live on MID)!
const castleRaw = Buffer.alloc(W * H * 4);
for (let y = 4; y <= 154; y++) {
  for (let x = 188; x <= 382; x++) {
    const inCastle = pointInPoly(x, y, CASTLE_POLY);
    // Lower terrace/archway under the castle (stops above bridge ridge, plus distant glow inside bridge arch)
    const inTerrace = y >= 82 && y <= 132 && x >= 192 && x <= 376;
    const inArchGlow = pointInPoly(x, y, BRIDGE_ARCH_HOLE);
    if (!inCastle && !inTerrace && !inArchGlow) continue;

    const [r, g, b] = getPx(base, W, H, x, y);
    let alpha = 255;

    if (inCastle) {
      const edgeD = distToPolyEdge(x, y, CASTLE_POLY);
      if (y < 68 && edgeD < 2.6) {
        const isSky = b > r + 24 && b > 170 && r < 145;
        alpha = isSky ? 0 : Math.round(255 * clamp(edgeD / 2.6, 0.35, 1));
      }
    } else if (inArchGlow) {
      alpha = 240;
    } else {
      const topFade = smoothStep(82, 98, y);
      const sideFade = smoothStep(192, 218, x) * (1 - smoothStep(352, 376, x));
      const botFade = 1 - smoothStep(120, 132, y);
      alpha = Math.round(255 * topFade * sideFade * botFade);
    }

    if (!inCastle && !inArchGlow && y < 82) alpha = 0;
    setPx(castleRaw, W, x, y, r, g, b, alpha);
  }
}
const castlePadded = padHorizontalClamped(castleRaw, W, H, PAD_FAR, false);
writeRgbaPng(castlePadded, W + PAD_FAR * 2, H, path.join(OUT_DIR, 'elven_forest_castle.png'));

// ==================== 4. CRISP LANTERN CUTOUTS (2x) ====================
function extractLanternTight(x1, y1, x2, y2, name, isCoolEdge = false) {
  const lx1 = x1 * 2, ly1 = y1 * 2, lx2 = x2 * 2, ly2 = y2 * 2;
  const cw = lx2 - lx1 + 1;
  const ch = ly2 - ly1 + 1;
  const out = extractCropFromBuf(base2x, W2, H2, lx1, ly1, cw, ch, (gx, gy, r, g, b) => {
    const nx = (gx - lx1) / (cw - 1);
    const ny = (gy - ly1) / (ch - 1);
    const distC = Math.abs(nx - 0.5);

    // Top suspension chain (continuous all the way to lantern roof!)
    if (ny < 0.32) {
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return distC < 0.09 && lum < 130 ? 245 : 0;
    }

    // Tight iron frame & glass body silhouette
    let maxHalfW = 0.34;
    if (ny < 0.42) {
      maxHalfW = 0.1 + ((ny - 0.32) / 0.1) * 0.3; // roof cone
    } else if (ny < 0.46) {
      maxHalfW = 0.41; // roof eaves
    } else if (ny < 0.77) {
      maxHalfW = 0.32 - ((ny - 0.46) / 0.31) * 0.05; // tapered glass cage
    } else if (ny < 0.85) {
      maxHalfW = 0.31 - ((ny - 0.77) / 0.08) * 0.17; // base cap
    } else {
      maxHalfW = Math.max(0.04, 0.12 * (1 - (ny - 0.85) / 0.15)); // bottom spike
    }

    if (distC > maxHalfW + 0.03) return 0;
    if (isCoolEdge && (ny < 0.45 ? distC > 0.12 && b > r + 8 : distC > maxHalfW - 0.07 && b > r + 12)) return 0;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const isLanternPixel = r >= b - 4 || lum < 72 || (r > 180 && g > 170);
    if (!isLanternPixel && distC > maxHalfW * 0.65) return 0;

    const feather = clamp(1 - (distC - (maxHalfW - 0.04)) / 0.07, 0, 1);
    return 255 * feather;
  });
  writeRgbaPng(out, cw, ch, path.join(OUT_DIR, name));
}

extractLanternTight(90, 22, 106, 60, 'elven_forest_lantern_l.png', false);
extractLanternTight(362, 54, 376, 84, 'elven_forest_lantern_r1.png', true);
extractLanternTight(396, 68, 412, 100, 'elven_forest_lantern_r2.png', true);

// ==================== 5. CLEAN GNOME SPRITE CUTOUTS (2x) ====================
// Gnome 1 (Left tree trunk): keep bright warm mustache! Strip ONLY dark/saturated blue backdrop (r < 120 && b > r + 22)
const GNOME1_POLY_2X = [
  [3, 127], [11, 115], [21, 114], [30, 121], [35, 133], [38, 146],
  [44, 152], [41, 161], [43, 174], [36, 184], [18, 188], [2, 186],
];
const gnome1Buf = extractCropFromBuf(base2x, W2, H2, 0, 110, 48, 80, (gx, gy, r, g, b) => {
  if (!pointInPoly(gx, gy, GNOME1_POLY_2X)) return 0;
  // Strip ONLY blue sky/foliage behind hat/ear (preserve white-blue mustache at gx=10..32, gy=152..172)
  const inMustache = gx >= 8 && gx <= 34 && gy >= 149 && gy <= 174;
  const isBlueForestBg = !inMustache && b > r + 26 && r < 110 && g < 160;
  if (isBlueForestBg) return 0;
  const d = distToPolyEdge(gx, gy, GNOME1_POLY_2X);
  if (gx <= 2) return 255;
  return d < 2.0 ? 255 * (d / 2.0) : 255;
});
writeRgbaPng(gnome1Buf, 48, 80, path.join(OUT_DIR, 'elven_forest_gnome_1.png'));

// Gnome 2 (Right lower rock): tight polygon directly on red cap, pointed ears, white beard, green tunic
const GNOME2_POLY_2X = [
  [795, 338], [801, 336], [807, 344], [810, 355], [816, 360],
  [813, 372], [805, 377], [794, 376], [789, 367], [788, 357], [793, 346],
];
const gnome2Buf = extractCropFromBuf(base2x, W2, H2, 786, 334, 34, 46, (gx, gy, r, g, b) => {
  if (!pointInPoly(gx, gy, GNOME2_POLY_2X)) return 0;
  const d = distToPolyEdge(gx, gy, GNOME2_POLY_2X);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (d < 4.0 && lum < 44 && r <= b + 10) return 0;
  return d < 1.8 ? 255 * (d / 1.8) : 255;
});
writeRgbaPng(gnome2Buf, 34, 46, path.join(OUT_DIR, 'elven_forest_gnome_2.png'));

// Gnome 3 (Right trunk/boulder): tight polygon strictly hugging his red cap, face & beard (no left bark!)
const GNOME3_POLY_2X = [
  [879, 257], [883, 263], [886, 276], [892, 282], [891, 297],
  [887, 310], [870, 310], [866, 297], [867, 286], [874, 279], [877, 267],
];
const gnome3Buf = extractCropFromBuf(base2x, W2, H2, 862, 254, 34, 60, (gx, gy, r, g, b) => {
  if (!pointInPoly(gx, gy, GNOME3_POLY_2X)) return 0;
  const d = distToPolyEdge(gx, gy, GNOME3_POLY_2X);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (d < 3.6 && lum < 44 && r <= g + 14) return 0;
  return d < 1.8 ? 255 * (d / 1.8) : 255;
});
writeRgbaPng(gnome3Buf, 34, 60, path.join(OUT_DIR, 'elven_forest_gnome_3.png'));

// Gnome 4 (Clean emerald-capped flipped variant of Gnome 2 for left signpost bush / bridge)
const gnome4Buf = Buffer.alloc(34 * 46 * 4);
for (let y = 0; y < 46; y++) {
  for (let x = 0; x < 34; x++) {
    const sx = 33 - x;
    const si = (y * 34 + sx) * 4;
    const di = (y * 34 + x) * 4;
    const r = gnome2Buf[si], g = gnome2Buf[si + 1], b = gnome2Buf[si + 2], a = gnome2Buf[si + 3];
    if (r > g + 22 && r > b + 18 && y < 22) {
      gnome4Buf[di] = Math.round(g * 0.72 + 16);
      gnome4Buf[di + 1] = Math.min(255, Math.round(r * 0.92 + 14));
      gnome4Buf[di + 2] = Math.min(255, Math.round(b * 1.15 + 34));
    } else {
      gnome4Buf[di] = r;
      gnome4Buf[di + 1] = g;
      gnome4Buf[di + 2] = b;
    }
    gnome4Buf[di + 3] = a;
  }
}
writeRgbaPng(gnome4Buf, 34, 46, path.join(OUT_DIR, 'elven_forest_gnome_4.png'));

// ==================== 6. LAYER 3: MID (Trees, Bridge, Waterfalls, Mushrooms, 520x270) ====================
const midRaw = Buffer.from(base);

// Smooth 2D inpaint behind extracted lanterns & gnomes
inpaintSmooth(midRaw, W, H, 90, 23, 106, 59, (x, y) => x >= 91 && x <= 105 && y >= 24 && y <= 58, 0.55);
inpaintSmooth(midRaw, W, H, 363, 55, 375, 83, (x, y) => x >= 364 && x <= 374 && y >= 56 && y <= 82, 0.55);
inpaintSmooth(midRaw, W, H, 396, 69, 411, 99, (x, y) => x >= 397 && x <= 410 && y >= 70 && y <= 98, 0.55);

inpaintSmooth(midRaw, W, H, 0, 56, 25, 93, (x, y) => x >= 0 && x <= 23 && y >= 57 && y <= 92, 0.5);
inpaintSmooth(midRaw, W, H, 391, 166, 412, 189, (x, y) => x >= 392 && x <= 410 && y >= 167 && y <= 188, 0.5);
inpaintSmooth(midRaw, W, H, 428, 127, 449, 157, (x, y) => x >= 429 && x <= 447 && y >= 128 && y <= 155, 0.5);

// Organic open sky/castle window & bridge arch cutout in MID
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const si = (y * W + x) * 4;
    if (y >= FLOOR_Y) {
      midRaw[si + 3] = 0;
      continue;
    }

    if (pointInPoly(x, y, BRIDGE_ARCH_HOLE)) {
      const d = distToPolyEdge(x, y, BRIDGE_ARCH_HOLE);
      const keepStone = d < 1.8 ? 255 * (1 - d / 1.8) : 0;
      midRaw[si + 3] = Math.round(keepStone);
      continue;
    }

    if (x >= 176 && x <= 345) {
      const topLim = midTopCanopyLine(x);
      const botLim = midGroundRidgeLine(x);
      if (y > topLim && y < botLim) {
        const [r, g, b] = getPx(midRaw, W, H, x, y);
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        // Preserve organic dark foreground foliage & purple tree leaves near edges!
        const nearLeftFoliage = x < 238 && y < 96 && lum < 52;
        const nearRightFoliage = x > 304 && y < 96 && lum < 56;
        const isDarkHangingVine = y < topLim + 24 && lum < 40;
        if (!nearLeftFoliage && !nearRightFoliage && !isDarkHangingVine) {
          const fadeTop = clamp((topLim + 6 - y) / 6, 0, 1);
          const fadeBot = clamp((y - (botLim - 5)) / 5, 0, 1);
          const fadeSide = clamp(Math.min((x - 176) / 14, (345 - x) / 14), 0, 1);
          const windowAlpha = Math.max(fadeTop, fadeBot, 1 - fadeSide);
          midRaw[si + 3] = Math.round(windowAlpha * 255);
        }
      }
    }
  }
}

const midPadded = padHorizontalClamped(midRaw, W, H, PAD_MID, true);
writeRgbaPng(midPadded, W + PAD_MID * 2, H, path.join(OUT_DIR, 'elven_forest_mid.png'));

// ==================== 7. FOREGROUND OCCLUSION MASKS ====================
const occLTrunk = extractCropFromBuf(base, W, H, 14, 54, 28, 48, (gx, gy) => {
  if (gx < 17) return 0;
  const ridgeX = 22 - ((gy - 54) / 48) * 5;
  if (gx < ridgeX) return 0;
  return 255 * clamp((gx - ridgeX) / 2.5, 0, 1);
});
writeRgbaPng(occLTrunk, 28, 48, path.join(OUT_DIR, 'elven_forest_occ_l_trunk.png'));

const occRRock = extractCropFromBuf(base, W, H, 384, 176, 42, 22, (gx, gy) => {
  const topLip = 183 + Math.sin(((gx - 384) / 42) * Math.PI) * 3;
  if (gy < topLip) return 0;
  return 255 * clamp((gy - topLip) / 2, 0, 1);
});
writeRgbaPng(occRRock, 42, 22, path.join(OUT_DIR, 'elven_forest_occ_r_rock.png'));

const occRBoulder = extractCropFromBuf(base, W, H, 420, 144, 36, 22, (gx, gy) => {
  const lip = 152 - ((gx - 420) / 36) * 5;
  if (gy < lip) return 0;
  return 255 * clamp((gy - lip) / 2, 0, 1);
});
writeRgbaPng(occRBoulder, 36, 22, path.join(OUT_DIR, 'elven_forest_occ_r_boulder.png'));

const occLBush = extractCropFromBuf(base, W, H, 64, 166, 34, 24, (gx, gy) => {
  const lip = 171 + Math.cos(((gx - 64) / 34) * Math.PI) * 2;
  if (gy < lip) return 0;
  return 255 * clamp((gy - lip) / 2, 0, 1);
});
writeRgbaPng(occLBush, 34, 24, path.join(OUT_DIR, 'elven_forest_occ_l_bush.png'));

// ==================== 8. LAYER 6: FLOOR (540x72 at FLOOR_Y = 198) ====================
const floorSlice = base.subarray(FLOOR_Y * W * 4, H * W * 4);
const floorPadded = padHorizontalClamped(floorSlice, W, FLOOR_H, PAD_FLOOR, true);
writeRgbaPng(floorPadded, W + PAD_FLOOR * 2, FLOOR_H, path.join(OUT_DIR, 'elven_forest_floor.png'));

// ==================== 9. VISUAL INSPECTION SHEETS ====================
execFileSync('convert', [
  '(', path.join(OUT_DIR, 'elven_forest_far.png'), '-crop', `${W}x${H}+${PAD_FAR}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'elven_forest_castle.png'), '-crop', `${W}x${H}+${PAD_FAR}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'elven_forest_mid.png'), '-crop', `${W}x${H}+${PAD_MID}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'elven_forest_floor.png'), '-crop', `${W}x${FLOOR_H}+${PAD_FLOOR}+0`, '+repage', ')',
  '-background', '#111827',
  '-append',
  path.join(CHECK_DIR, 'elven_layers_check.png'),
]);

execFileSync('convert', [
  path.join(OUT_DIR, 'elven_forest_gnome_1.png'),
  path.join(OUT_DIR, 'elven_forest_gnome_2.png'),
  path.join(OUT_DIR, 'elven_forest_gnome_3.png'),
  path.join(OUT_DIR, 'elven_forest_gnome_4.png'),
  path.join(OUT_DIR, 'elven_forest_lantern_l.png'),
  path.join(OUT_DIR, 'elven_forest_lantern_r1.png'),
  path.join(OUT_DIR, 'elven_forest_lantern_r2.png'),
  '-background', '#1e293b',
  '+append',
  '-filter', 'Point',
  '-resize', '200%',
  path.join(CHECK_DIR, 'elven_parts_check.png'),
]);

console.log('Elven Forest layered assets v2 extracted successfully!');
