import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Arena_G_tica_sob_a_Lua_P_rpura_3fd769b4.png';
const OUT_DIR = 'public/assets/arenas';
const CHECK_DIR = '.playwright-cli';

const W = 480;
const H = 270;
const PAD_FAR = 20;   // far layer width = 520
const PAD_MID = 20;   // mid layer width = 520
const PAD_FLOOR = 30; // floor layer width = 540
const FLOOR_Y = 184;
const FLOOR_H = H - FLOOR_Y; // 86

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

function mirrorPadHorizontal(buf, w, h, pad) {
  const outW = w + pad * 2;
  const out = Buffer.alloc(outW * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < outW; x++) {
      let sx = x - pad;
      if (sx < 0) sx = -sx;
      else if (sx >= w) sx = 2 * w - 2 - sx;
      sx = clamp(sx, 0, w - 1);
      const si = (y * w + sx) * 4;
      const di = (y * outW + x) * 4;
      out[di] = buf[si];
      out[di + 1] = buf[si + 1];
      out[di + 2] = buf[si + 2];
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
      const si = ((y0 + y) * W + (x0 + x)) * 4;
      const di = (y * cw + x) * 4;
      const r = base[si];
      const g = base[si + 1];
      const b = base[si + 2];
      const a = keepFn(x0 + x, y0 + y, r, g, b);
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return out;
}

// --- 1. Tight Banners & Chains ---
const bannerL = extractCropRGBA(5, 58, 36, 70, (gx, gy, r, g, b) => {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (gy <= 62 && gx >= 5 && gx <= 39) return lum < 96 ? 255 : 0;
  if (gx < 11 || gx > 35) return 0;
  if (gy <= 114) return 255;
  if (b > g + 16 && lum > 56) return 0;
  if (r > g + 12 && b > g + 14 && lum < 82) return 255;
  return lum < 48 ? 255 : 0;
});

const bannerR = extractCropRGBA(439, 58, 36, 70, (gx, gy, r, g, b) => {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (gy <= 62 && gx >= 440 && gx <= 474) return lum < 96 ? 255 : 0;
  if (gx < 444 || gx > 468) return 0;
  if (gy <= 114) return 255;
  if (b > g + 16 && lum > 56) return 0;
  if (r > g + 12 && b > g + 14 && lum < 82) return 255;
  return lum < 48 ? 255 : 0;
});

// Tight chain spans strictly between statue edge and brazier edge (no side stone chunks)
const chainKeep = (_gx, _gy, r, g, b) => {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (lum < 38) return 255;
  if (lum < 50 && b - g < 18) return 190;
  return 0;
};
const chainL = extractCropRGBA(103, 121, 40, 18, chainKeep);
const chainR = extractCropRGBA(337, 121, 40, 18, chainKeep);

writeRgbaPng(bannerL, 36, 70, path.join(OUT_DIR, 'shadow_temple_banner_l.png'));
writeRgbaPng(bannerR, 36, 70, path.join(OUT_DIR, 'shadow_temple_banner_r.png'));
writeRgbaPng(chainL, 40, 18, path.join(OUT_DIR, 'shadow_temple_chain_l.png'));
writeRgbaPng(chainR, 40, 18, path.join(OUT_DIR, 'shadow_temple_chain_r.png'));

// --- 2. Build clean FAR sky/citadel/moon layer using vertical atmospheric mist fill (zero horizontal bands) ---
const far = Buffer.from(base);

function fillMistBox(x1, y1, x2, y2, blendEdge = 10) {
  for (let y = y1; y <= y2; y++) {
    const tY = (y - y1) / Math.max(1, y2 - y1);
    for (let x = x1; x <= x2; x++) {
      const topPx = getPx(base, x, y1 - 2);
      // Clamp top sample brightness so moon edge never creates bright vertical curtains
      const topLum = 0.299 * topPx[0] + 0.587 * topPx[1] + 0.114 * topPx[2];
      const topScale = Math.min(1, 68 / Math.max(1, topLum));
      const tR = topPx[0] * topScale;
      const tG = topPx[1] * topScale;
      const tB = topPx[2] * topScale;

      // Deep misty purple horizon target
      const botR = 46;
      const botG = 24;
      const botB = 72;

      const wave =
        Math.sin(x * 0.06 + y * 0.05) * 4 +
        Math.cos(x * 0.03 - y * 0.08) * 3;

      const mR = tR * (1 - tY) + botR * tY + wave * 0.4;
      const mG = tG * (1 - tY) + botG * tY + wave * 0.25;
      const mB = tB * (1 - tY) + botB * tY + wave * 0.7;

      const dEdge = Math.min(x - x1, x2 - x, y - y1);
      const w = clamp(dEdge / blendEdge, 0, 1);
      const [curR, curG, curB] = getPx(far, x, y);
      setPx(
        far,
        x,
        y,
        curR * (1 - w) + mR * w,
        curG * (1 - w) + mG * w,
        curB * (1 - w) + mB * w,
        255
      );
    }
  }
}

// Replace banners, chains, statues, and central temple with smooth vertical mist clouds
fillMistBox(3, 55, 42, 134, 6);
fillMistBox(437, 55, 477, 134, 6);
fillMistBox(100, 118, 152, 144, 6);
fillMistBox(328, 118, 380, 144, 6);
fillMistBox(40, 44, 104, 146, 8);
fillMistBox(376, 44, 440, 146, 8);
fillMistBox(148, 8, 332, 150, 14);

for (let y = 144; y < FLOOR_Y; y++) {
  const tY = (y - 144) / (FLOOR_Y - 144);
  for (let x = 0; x < W; x++) {
    setPx(far, x, y, 28 - tY * 10, 15 - tY * 5, 48 - tY * 16, 255);
  }
}

const farPadded = mirrorPadHorizontal(far, W, H, PAD_FAR);
writeRgbaPng(farPadded, W + PAD_FAR * 2, H, path.join(OUT_DIR, 'shadow_temple_far.png'));

// --- 3. Build crisp MID layer RGBA (intact statue armor + clean temple silhouettes) ---
// Helper: seated knight statue silhouette in centered coords (dx = |x - center|, y = 44..145)
function inStatueSilhouette(dx, y) {
  if (y >= 44 && y <= 50) return dx <= 5; // helmet peak
  if (y > 50 && y <= 58) return dx <= 9; // helmet/neck
  if (y > 58 && y <= 76) return dx <= 20; // pauldrons & cloak shoulders
  if (y > 76 && y <= 112) return dx <= 24; // seated arms & sword
  if (y > 112 && y <= 145) return dx <= 29; // throne & legs base
  return false;
}

const midRaw = Buffer.alloc(W * H * 4);
for (let y = 0; y < FLOOR_Y; y++) {
  for (let x = 0; x < W; x++) {
    const si = (y * W + x) * 4;
    const r = base[si];
    const g = base[si + 1];
    const b = base[si + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    const inWall = y >= 145;
    const inLeftOuterBrazier = x <= 20 && y >= 134;
    const inRightOuterBrazier = x >= 460 && y >= 134;
    const inLeftStat = inStatueSilhouette(Math.abs(x - 73), y);
    const inRightStat = inStatueSilhouette(Math.abs(x - 407), y);

    // Central shrine stepped silhouette: finials at 14..32, roof & pillars 32..56, spires & braziers 56..145
    const inRoofPeak = y >= 14 && y < 32 && ((x >= 194 && x <= 212) || (x >= 268 && x <= 286));
    const inTempleRoof = y >= 30 && y < 56 && x >= 170 && x <= 310;
    const inTempleBody = y >= 56 && y < 145 && x >= 152 && x <= 328;

    const keep = inWall || inLeftOuterBrazier || inRightOuterBrazier || inLeftStat || inRightStat || inRoofPeak || inTempleRoof || inTempleBody;
    if (!keep) continue;

    // Trim ONLY obvious sky corners around roof eaves & spires (bright purple/violet sky, NOT dark stone or fire!)
    const isBrightVioletSky = b >= g + 22 && b >= r + 8 && lum > 34;
    const isDarkPurpleSky = y < 44 && b >= g + 12 && lum > 16 && !(r > g + 12);
    let alpha = 255;
    if ((inRoofPeak || inTempleRoof) && (isDarkPurpleSky || isBrightVioletSky)) {
      alpha = 0;
    } else if (inTempleBody && y < 94 && (x < 184 || x > 296) && isBrightVioletSky) {
      alpha = 0;
    } else if ((inLeftStat || inRightStat) && y < 74 && isBrightVioletSky) {
      alpha = 0;
    } else if ((inLeftOuterBrazier || inRightOuterBrazier) && y < 145 && isBrightVioletSky) {
      alpha = 0;
    }

    midRaw[si] = r;
    midRaw[si + 1] = g;
    midRaw[si + 2] = b;
    midRaw[si + 3] = alpha;
  }
}

const midPadded = mirrorPadHorizontal(midRaw, W, H, PAD_MID);
writeRgbaPng(midPadded, W + PAD_MID * 2, H, path.join(OUT_DIR, 'shadow_temple_mid.png'));

// --- 4. Floor layer ---
const floorSlice = base.subarray(FLOOR_Y * W * 4, H * W * 4);
const floorPadded = mirrorPadHorizontal(floorSlice, W, FLOOR_H, PAD_FLOOR);
writeRgbaPng(floorPadded, W + PAD_FLOOR * 2, FLOOR_H, path.join(OUT_DIR, 'shadow_temple_floor.png'));

// --- 5. Visual inspection sheet ---
execFileSync('convert', [
  '(', path.join(OUT_DIR, 'shadow_temple_far.png'), '-crop', `${W}x${H}+${PAD_FAR}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'shadow_temple_mid.png'), '-crop', `${W}x${H}+${PAD_MID}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'shadow_temple_floor.png'), '-crop', `${W}x${FLOOR_H}+${PAD_FLOOR}+0`, '+repage', ')',
  '-append',
  path.join(CHECK_DIR, 'shadow_temple_layers_check.png'),
]);

console.log('Extracted Templo das Sombras layers cleanly v3!');
