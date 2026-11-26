import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Arena_do_Troll_Gigante_sob_a_Lua_de_Sangue_89ae437e.png';
const OUT_DIR = 'public/assets/arenas';
const CHECK_DIR = '.playwright-cli';

const W = 480;
const H = 270;
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

function writeRgbaPng(buf, w, h, outPath) {
  execFileSync(
    'convert',
    ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', outPath],
    { input: buf, maxBuffer: 32 * 1024 * 1024 }
  );
}

function padHorizontalClamped(buf, w, h, pad) {
  const outW = w + pad * 2;
  const out = Buffer.alloc(outW * h * 4);
  const margin = 8;
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
      const dim = edgeDist > 0 ? Math.max(0.68, 1 - edgeDist * 0.015) : 1;
      out[di] = Math.round(buf[si] * dim);
      out[di + 1] = Math.round(buf[si + 1] * dim);
      out[di + 2] = Math.round(buf[si + 2] * dim);
      out[di + 3] = buf[si + 3];
    }
  }
  return out;
}

const base = execFileSync(
  'convert',
  [SRC, '-filter', 'Lanczos', '-resize', `${W}x${H}!`, '-alpha', 'on', '-depth', '8', 'rgba:-'],
  { maxBuffer: 32 * 1024 * 1024 }
);

function getPx(buf, x, y) {
  const cx = clamp(x, 0, W - 1);
  const cy = clamp(y, 0, H - 1);
  const i = (cy * W + cx) * 4;
  return [buf[i], buf[i + 1], buf[i + 2]];
}

function setPx(buf, x, y, r, g, b, a = 255) {
  const i = (y * W + x) * 4;
  buf[i] = clamp(Math.round(r), 0, 255);
  buf[i + 1] = clamp(Math.round(g), 0, 255);
  buf[i + 2] = clamp(Math.round(b), 0, 255);
  buf[i + 3] = clamp(Math.round(a), 0, 255);
}

function extractCropRGBA(x0, y0, cw, ch, keepFn) {
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gx = x0 + x;
      const gy = y0 + y;
      const si = (gy * W + gx) * 4;
      const di = (y * cw + x) * 4;
      const r = base[si];
      const g = base[si + 1];
      const b = base[si + 2];
      const a = keepFn(gx, gy, r, g, b);
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return out;
}

function isRedBanner(r, g, b) {
  return r > g + 14 && r > b + 6 && r - Math.min(g, b) >= 16;
}

function bannerLAlpha(gx, gy, r, g, b) {
  if (gx < 87 || gx > 110 || gy < 82 || gy > 139) return 0;
  if (gy <= 91 && gx >= 91 && gx <= 108) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 80 || isRedBanner(r, g, b) ? 255 : 0;
  }
  if (isRedBanner(r, g, b)) return 255;
  if (gx >= 90 && gx <= 107 && gy >= 91 && gy <= 136) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 36) return 255;
  }
  return 0;
}

function bannerMAlpha(gx, gy, r, g, b) {
  if (gx < 192 || gx > 243 || gy < 126 || gy > 157) return 0;
  if (isRedBanner(r, g, b)) return 255;
  if (gx >= 198 && gx <= 235 && gy >= 130 && gy <= 155) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 34 && r >= b) return 245;
  }
  return 0;
}

function bannerRAlpha(gx, gy, r, g, b) {
  if (gx < 373 || gx > 396 || gy < 86 || gy > 143) return 0;
  if (gy <= 95 && gx >= 377 && gx <= 394) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum < 80 || isRedBanner(r, g, b) ? 255 : 0;
  }
  if (isRedBanner(r, g, b)) return 255;
  if (gx >= 376 && gx <= 393 && gy >= 95 && gy <= 140) {
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 36) return 255;
  }
  return 0;
}

// --- 1. Extract 3 Nordic Rune Banners cleanly ---
const bannerL = extractCropRGBA(84, 82, 30, 58, bannerLAlpha);
const bannerM = extractCropRGBA(192, 126, 52, 32, bannerMAlpha);
const bannerR = extractCropRGBA(370, 86, 30, 58, bannerRAlpha);

writeRgbaPng(bannerL, 30, 58, path.join(OUT_DIR, 'troll_lands_banner_l.png'));
writeRgbaPng(bannerM, 52, 32, path.join(OUT_DIR, 'troll_lands_banner_m.png'));
writeRgbaPng(bannerR, 30, 58, path.join(OUT_DIR, 'troll_lands_banner_r.png'));

// --- 2. Clean Giant Ancestral Troll Mask using exact traced silhouette polygons ---
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

// Exact Troll Head + hair + crimson-lit nose & jaw traced directly on 3x zoomed 480x270 grid
const TROLL_HEAD_POLY = [
  [184, 13], [193, 6], [202, 4], [211, 5], [219, 10], [225, 16], [227, 23],
  [229, 29], [234, 37], [234, 42], [228, 44], [226, 49], [227, 56], [223, 63],
  [215, 65], [205, 62], [196, 56], [189, 46], [183, 35], [176, 23], [177, 19],
  [183, 17],
];

// Exact Troll Body (hunchback shoulder, arm, massive clawed hand, right shoulder)
const TROLL_BODY_POLY = [
  [184, 15], [205, 14], [221, 24], [227, 45], [233, 55], [241, 68], [248, 84],
  [254, 98], [257, 117], [164, 117], [150, 106], [138, 94], [122, 85], [116, 76],
  [118, 63], [126, 51], [137, 40], [149, 32], [164, 26], [176, 20],
];

// Purple night sky detector ONLY (never strips crimson Blood Moon skin lighting where r >= b!)
function isPurpleNightSky(gx, gy) {
  const [r, g, b] = getPx(base, gx, gy);
  return b - g >= 11 && b >= r + 3;
}

const trollSolid = new Uint8Array(W * H);
for (let y = 3; y <= 118; y++) {
  for (let x = 114; x <= 258; x++) {
    const inH = pointInPoly(x, y, TROLL_HEAD_POLY);
    const inB = pointInPoly(x, y, TROLL_BODY_POLY);
    if (!inH && !inB) continue;
    const edgeDist = Math.min(
      inH ? distToPolyEdge(x, y, TROLL_HEAD_POLY) : 99,
      inB ? distToPolyEdge(x, y, TROLL_BODY_POLY) : 99
    );
    if (edgeDist < 3.5 && isPurpleNightSky(x, y)) continue;
    trollSolid[y * W + x] = 1;
  }
}

// Body cutout (x=114..258, y=14..118 -> cropped neatly to 144x104 at base x=114, y=14)
// Exclude upper head/face/ear interior so head rotation never double-images nose or ear
const trollBody = extractCropRGBA(114, 14, 144, 104, (gx, gy) => {
  if (!pointInPoly(gx, gy, TROLL_BODY_POLY)) return 0;
  if (!trollSolid[gy * W + gx]) return 0;
  if (pointInPoly(gx, gy, TROLL_HEAD_POLY) && gy < 53) {
    const hd = distToPolyEdge(gx, gy, TROLL_HEAD_POLY);
    if (hd > 1.5) return 0;
  }
  const n =
    trollSolid[gy * W + gx - 1] +
    trollSolid[gy * W + gx + 1] +
    trollSolid[(gy - 1) * W + gx] +
    trollSolid[(gy + 1) * W + gx];
  if (n <= 1) return 0;
  const d = distToPolyEdge(gx, gy, TROLL_BODY_POLY);
  if (d < 1.2) return 165;
  if (d < 2.2) return 225;
  return 255;
});

// Head cutout (x=174..238, y=3..67 -> 64x64 at base x=174, y=3) with soft neck feathering
const trollHead = extractCropRGBA(174, 3, 64, 64, (gx, gy) => {
  if (!pointInPoly(gx, gy, TROLL_HEAD_POLY)) return 0;
  if (!trollSolid[gy * W + gx]) return 0;
  const n =
    trollSolid[gy * W + gx - 1] +
    trollSolid[gy * W + gx + 1] +
    trollSolid[(gy - 1) * W + gx] +
    trollSolid[(gy + 1) * W + gx];
  if (n <= 1) return 0;
  const d = distToPolyEdge(gx, gy, TROLL_HEAD_POLY);
  if (gy >= 55) {
    const neckFade = clamp((64 - gy) / 9, 0.25, 1);
    return Math.round(255 * neckFade * clamp(d / 1.8, 0.35, 1));
  }
  if (d < 1.1) return 160;
  if (d < 2.0) return 220;
  return 255;
});

writeRgbaPng(trollBody, 144, 104, path.join(OUT_DIR, 'troll_lands_troll_body.png'));
writeRgbaPng(trollHead, 64, 64, path.join(OUT_DIR, 'troll_lands_troll_head.png'));

// --- 3. Clean FAR layer (Sky + Blood Moon + textured misty mountain/cloud infill behind Troll) ---
const trollDist = new Float32Array(W * H).fill(99);
for (let y = 2; y <= 119; y++) {
  for (let x = 110; x <= 262; x++) {
    if (trollSolid[y * W + x]) {
      trollDist[y * W + x] = 0;
      continue;
    }
    let minD = 99;
    for (let dy = -6; dy <= 6; dy++) {
      for (let dx = -6; dx <= 6; dx++) {
        const ny = clamp(y + dy, 0, H - 1);
        const nx = clamp(x + dx, 0, W - 1);
        if (trollSolid[ny * W + nx]) {
          const d = Math.hypot(dx, dy);
          if (d < minD) minD = d;
        }
      }
    }
    trollDist[y * W + x] = minD;
  }
}

const far = Buffer.from(base);
for (let y = 2; y <= 119; y++) {
  for (let x = 110; x <= 262; x++) {
    const d = trollDist[y * W + x];
    if (d > 6) continue;
    const blend = d <= 2.5 ? 1 : clamp(1 - (d - 2.5) / 3.5, 0, 1);

    const lx = clamp(x - 54, 72, 102);
    const rx = clamp(x + 54, 260, 288);
    const lPx = getPx(base, lx, clamp(y, 4, 62));
    const rPx = getPx(base, rx, clamp(y, 4, 62));
    const tX = clamp((x - 110) / 152, 0, 1);
    const grain = Math.sin(x * 0.43 + y * 0.71) * 4 + Math.cos(x * 0.19 - y * 0.37) * 3;
    const skyR = lPx[0] * (1 - tX) + rPx[0] * tX + grain * 0.4;
    const skyG = lPx[1] * (1 - tX) + rPx[1] * tX + grain * 0.25;
    const skyB = lPx[2] * (1 - tX) + rPx[2] * tX + grain * 0.55;

    const ridgeY = 58 + Math.sin(x * 0.085) * 9 + Math.cos(x * 0.21) * 5;
    let fillR = skyR;
    let fillG = skyG;
    let fillB = skyB;
    if (y >= ridgeY) {
      const depth = clamp((y - ridgeY) / 48, 0, 1);
      fillR = 26 - depth * 12 + grain * 0.5;
      fillG = 14 - depth * 6 + grain * 0.35;
      fillB = 38 - depth * 14 + grain * 0.75;
    }
    const [curR, curG, curB] = getPx(far, x, y);
    setPx(
      far,
      x,
      y,
      curR * (1 - blend) + fillR * blend,
      curG * (1 - blend) + fillG * blend,
      curB * (1 - blend) + fillB * blend,
      255
    );
  }
}

for (let y = 165; y < FLOOR_Y; y++) {
  const tY = (y - 165) / (FLOOR_Y - 165);
  for (let x = 0; x < W; x++) {
    const [cr, cg, cb] = getPx(far, x, y);
    setPx(
      far,
      x,
      y,
      cr * (1 - tY * 0.55) + 24 * tY * 0.55,
      cg * (1 - tY * 0.55) + 14 * tY * 0.55,
      cb * (1 - tY * 0.55) + 36 * tY * 0.55,
      255
    );
  }
}

// Erase banners from far layer too so parallax separation between far and mid never exposes static banner ghosts!
for (let y = 80; y <= 158; y++) {
  for (let x = 85; x <= 400; x++) {
    const [r, g, b] = getPx(far, x, y);
    if (x >= 86 && x <= 112 && y >= 82 && y <= 140) {
      if (bannerLAlpha(x, y, r, g, b) > 0 || isRedBanner(r, g, b)) {
        const lPx = getPx(base, 83, y);
        const rPx = getPx(base, 114, y);
        const t = clamp((x - 85) / 27, 0, 1);
        setPx(far, x, y, lPx[0] * (1 - t) + rPx[0] * t, lPx[1] * (1 - t) + rPx[1] * t, lPx[2] * (1 - t) + rPx[2] * t, 255);
      }
    } else if (x >= 192 && x <= 244 && y >= 126 && y <= 157) {
      if (bannerMAlpha(x, y, r, g, b) > 0 || isRedBanner(r, g, b)) {
        const lPx = getPx(base, 189, y);
        const rPx = getPx(base, 246, y);
        const t = clamp((x - 192) / 52, 0, 1);
        setPx(far, x, y, lPx[0] * (1 - t) + rPx[0] * t, lPx[1] * (1 - t) + rPx[1] * t, lPx[2] * (1 - t) + rPx[2] * t, 255);
      }
    } else if (x >= 371 && x <= 398 && y >= 86 && y <= 144) {
      if (bannerRAlpha(x, y, r, g, b) > 0 || isRedBanner(r, g, b)) {
        const lPx = getPx(base, 368, y);
        const rPx = getPx(base, 400, y);
        const t = clamp((x - 371) / 27, 0, 1);
        setPx(far, x, y, lPx[0] * (1 - t) + rPx[0] * t, lPx[1] * (1 - t) + rPx[1] * t, lPx[2] * (1 - t) + rPx[2] * t, 255);
      }
    }
  }
}

const farPadded = padHorizontalClamped(far, W, H, PAD_FAR);
writeRgbaPng(farPadded, W + PAD_FAR * 2, H, path.join(OUT_DIR, 'troll_lands_far.png'));

// --- 4. Clean MID layer (Solid stone pillars, cliffs, waterfalls, bridge, skulls & ruins) ---
const midRaw = Buffer.alloc(W * H * 4);
for (let y = 84; y < FLOOR_Y; y++) {
  for (let x = 0; x < W; x++) {
    const si = (y * W + x) * 4;
    let r = base[si];
    let g = base[si + 1];
    let b = base[si + 2];

    let topEdge = 114;
    if (x <= 50) {
      topEdge = 88;
    } else if (x < 94) {
      const t = (x - 50) / 44;
      topEdge = 104 + t * 10;
    } else if (x < 148) {
      const t = (x - 94) / 54;
      topEdge = 114 + t * 1;
    } else if (x <= 332) {
      const t = (x - 148) / 184;
      topEdge = 115 + Math.sin(t * Math.PI) * 7;
    } else if (x < 386) {
      const t = (x - 332) / 54;
      topEdge = 115 - t * 1;
    } else if (x < 430) {
      const t = (x - 386) / 44;
      topEdge = 114 - t * 10;
    } else {
      topEdge = 88;
    }

    if (y < topEdge) continue;

    // Erase the FULL banner silhouette (cloth + dark runes + 1px halo) from mid so fluttering banners never double-image
    const hitL = bannerLAlpha(x, y, r, g, b) > 0 || (x >= 87 && x <= 110 && y >= 88 && y <= 139 && (isRedBanner(r, g, b) || bannerLAlpha(clamp(x - 1, 0, W - 1), y, ...getPx(base, x - 1, y)) > 0 || bannerLAlpha(clamp(x + 1, 0, W - 1), y, ...getPx(base, x + 1, y)) > 0));
    const hitM = bannerMAlpha(x, y, r, g, b) > 0 || (x >= 195 && x <= 241 && y >= 127 && y <= 156 && (isRedBanner(r, g, b) || bannerMAlpha(clamp(x - 1, 0, W - 1), y, ...getPx(base, x - 1, y)) > 0 || bannerMAlpha(clamp(x + 1, 0, W - 1), y, ...getPx(base, x + 1, y)) > 0));
    const hitR = bannerRAlpha(x, y, r, g, b) > 0 || (x >= 373 && x <= 396 && y >= 90 && y <= 143 && (isRedBanner(r, g, b) || bannerRAlpha(clamp(x - 1, 0, W - 1), y, ...getPx(base, x - 1, y)) > 0 || bannerRAlpha(clamp(x + 1, 0, W - 1), y, ...getPx(base, x + 1, y)) > 0));

    if (hitL) {
      const lPx = getPx(base, 84, y);
      const rPx = getPx(base, 113, y);
      const t = clamp((x - 86) / 26, 0, 1);
      r = lPx[0] * (1 - t) + rPx[0] * t;
      g = lPx[1] * (1 - t) + rPx[1] * t;
      b = lPx[2] * (1 - t) + rPx[2] * t;
    } else if (hitM) {
      const lPx = getPx(base, 190, y);
      const rPx = getPx(base, 245, y);
      const t = clamp((x - 193) / 50, 0, 1);
      r = lPx[0] * (1 - t) + rPx[0] * t;
      g = lPx[1] * (1 - t) + rPx[1] * t;
      b = lPx[2] * (1 - t) + rPx[2] * t;
    } else if (hitR) {
      const lPx = getPx(base, 369, y);
      const rPx = getPx(base, 399, y);
      const t = clamp((x - 371) / 26, 0, 1);
      r = lPx[0] * (1 - t) + rPx[0] * t;
      g = lPx[1] * (1 - t) + rPx[1] * t;
      b = lPx[2] * (1 - t) + rPx[2] * t;
    }

    midRaw[si] = r;
    midRaw[si + 1] = g;
    midRaw[si + 2] = b;
    midRaw[si + 3] = y - topEdge < 1.5 ? 200 : 255;
  }
}

const midPadded = padHorizontalClamped(midRaw, W, H, PAD_MID);
writeRgbaPng(midPadded, W + PAD_MID * 2, H, path.join(OUT_DIR, 'troll_lands_mid.png'));

// --- 5. Stone Combat Platform Floor Layer (y = 198..270 -> 540x72) ---
const floorSlice = base.subarray(FLOOR_Y * W * 4, H * W * 4);
const floorPadded = padHorizontalClamped(floorSlice, W, FLOOR_H, PAD_FLOOR);
writeRgbaPng(floorPadded, W + PAD_FLOOR * 2, FLOOR_H, path.join(OUT_DIR, 'troll_lands_floor.png'));

// --- 6. Visual inspection sheets ---
execFileSync('convert', [
  '(', path.join(OUT_DIR, 'troll_lands_far.png'), '-crop', `${W}x${H}+${PAD_FAR}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'troll_lands_mid.png'), '-crop', `${W}x${H}+${PAD_MID}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'troll_lands_floor.png'), '-crop', `${W}x${FLOOR_H}+${PAD_FLOOR}+0`, '+repage', ')',
  '-append',
  path.join(CHECK_DIR, 'troll_lands_layers_check.png'),
]);

execFileSync('convert', [
  path.join(OUT_DIR, 'troll_lands_troll_head.png'),
  path.join(OUT_DIR, 'troll_lands_troll_body.png'),
  path.join(OUT_DIR, 'troll_lands_banner_l.png'),
  path.join(OUT_DIR, 'troll_lands_banner_m.png'),
  path.join(OUT_DIR, 'troll_lands_banner_r.png'),
  '+append',
  path.join(CHECK_DIR, 'troll_lands_parts_check.png'),
]);

console.log('Extracted Terra dos Trolls v5 cleanly!');
