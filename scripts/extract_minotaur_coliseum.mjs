import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Arena_Infernal_do_Minotauro_c47401b2.png';
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

function padHorizontalRockEdge(buf, w, h, pad) {
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

// Clean tiny watermark/UI specks on the raw base copy before slicing
const cleanBase = Buffer.from(base);
// Bottom-left tiny emblem (x=4..22, y=254..269)
for (let y = 254; y < H; y++) {
  for (let x = 4; x <= 22; x++) {
    const [r, g, b] = getPx(base, x, y);
    const [refR, refG, refB] = getPx(base, x + 22, y - 4);
    const diff = Math.abs(r - refR) + Math.abs(g - refG) + Math.abs(b - refB);
    if (diff > 36 || (x >= 10 && x <= 18 && y >= 256 && y <= 265)) {
      const n = getPx(base, clamp(x + 20, 0, W - 1), y);
      setPx(cleanBase, x, y, n[0] * 0.85, n[1] * 0.85, n[2] * 0.85, 255);
    }
  }
}
// Bottom-right tiny watermark glyphs (x=418..476, y=256..269)
for (let y = 256; y < H; y++) {
  for (let x = 418; x <= 476; x++) {
    const [r, g, b] = getPx(base, x, y);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 46 && x >= 420 && y >= 258) {
      const n = getPx(base, x - 34, y);
      setPx(cleanBase, x, y, n[0] * 0.88, n[1] * 0.88, n[2] * 0.88, 255);
    }
  }
}
// Top-right tiny UI icon (x=464..479, y=0..12)
for (let y = 0; y <= 12; y++) {
  for (let x = 464; x < W; x++) {
    const [r, g, b] = getPx(base, x, y);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 42) {
      const n = getPx(base, x - 16, y);
      setPx(cleanBase, x, y, n[0], n[1], n[2], 255);
    }
  }
}

function extractCropRGBA(srcBuf, x0, y0, cw, ch, keepFn) {
  const out = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const gx = x0 + x;
      const gy = y0 + y;
      const si = (gy * W + gx) * 4;
      const di = (y * cw + x) * 4;
      const r = srcBuf[si];
      const g = srcBuf[si + 1];
      const b = srcBuf[si + 2];
      const a = keepFn(gx, gy, r, g, b);
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = a;
    }
  }
  return out;
}

function isCrimsonBanner(r, g, b) {
  return r > g + 16 && r > b + 16;
}

// --- 1. Extract Giant Central Horned Minotaur Banner & Hanging Iron Chains cleanly ---
function bannerCAlpha(gx, gy, r, g, b) {
  if (gx < 222 || gx > 258 || gy < 28 || gy > 107) return 0;
  if (gy <= 31) return 245;
  if (isCrimsonBanner(r, g, b)) return 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (gx >= 224 && gx <= 256 && gy >= 31 && gy <= 90 && lum < 52) return 255;
  return 0;
}

function chainLAlpha(gx, gy, r, g, b) {
  if (gx < 208 || gx > 218 || gy < 30 || gy > 112) return 0;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (r - b <= 24 && lum < 75) return 255;
  return 0;
}

function chainRAlpha(gx, gy, r, g, b) {
  if (gx < 262 || gx > 272 || gy < 30 || gy > 112) return 0;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  if (r - b <= 24 && lum < 75) return 255;
  return 0;
}

const bannerC = extractCropRGBA(cleanBase, 221, 28, 38, 80, bannerCAlpha);
const chainL = extractCropRGBA(cleanBase, 208, 30, 11, 83, chainLAlpha);
const chainR = extractCropRGBA(cleanBase, 262, 30, 11, 83, chainRAlpha);

writeRgbaPng(bannerC, 38, 80, path.join(OUT_DIR, 'minotaur_coliseum_banner_c.png'));
writeRgbaPng(chainL, 11, 83, path.join(OUT_DIR, 'minotaur_coliseum_chain_l.png'));
writeRgbaPng(chainR, 11, 83, path.join(OUT_DIR, 'minotaur_coliseum_chain_r.png'));

// --- 2. Connected Infernal Sky Detection (bright red/crimson sky pockets ONLY — never dark stone pillars!) ---
const isSky = new Uint8Array(W * H);
const qx = [];
const qy = [];

function isSkyColor(x, y) {
  if (y > 76) return false;
  if (x >= 204 && x <= 276 && y >= 24) return false;
  if (x >= 68 && x <= 82 && y >= 12 && y <= 34) return false;
  if (x >= 398 && x <= 412 && y >= 12 && y <= 34) return false;
  if (x >= 146 && x <= 162 && y >= 36 && y <= 50) return false;
  if (x >= 318 && x <= 334 && y >= 36 && y <= 50) return false;
  const [r, g, b] = getPx(cleanBase, x, y);
  return r >= 68 && r - b >= 38 && r - g >= 24 && g < 92;
}

for (let x = 0; x < W; x++) {
  if (isSkyColor(x, 0)) {
    isSky[x] = 1;
    qx.push(x);
    qy.push(0);
  }
}
for (const [sx, sy] of [
  [42, 24], [58, 10], [92, 18], [166, 12], [240, 12], [314, 12], [388, 18], [422, 10], [438, 24],
]) {
  if (!isSky[sy * W + sx] && isSkyColor(sx, sy)) {
    isSky[sy * W + sx] = 1;
    qx.push(sx);
    qy.push(sy);
  }
}

let head = 0;
while (head < qx.length) {
  const x = qx[head];
  const y = qy[head];
  head++;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= W || ny < 0 || ny > 76) continue;
    const idx = ny * W + nx;
    if (isSky[idx]) continue;
    if (isSkyColor(nx, ny)) {
      isSky[idx] = 1;
      qx.push(nx);
      qy.push(ny);
    }
  }
}

// --- 3. Build FAR Layer (Seamless continuous crimson storm sky with 2D cloud texture) ---
const far = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  const sampleY = clamp(y, 0, 52);
  let rowSamples = [];
  for (let x = 0; x < W; x++) {
    if (isSky[sampleY * W + x]) rowSamples.push(x);
  }
  for (let x = 0; x < W; x++) {
    if (y <= 76 && isSky[y * W + x]) {
      const [r, g, b] = getPx(cleanBase, x, y);
      setPx(far, x, y, r, g, b, 255);
    } else if (y < 145) {
      const cloudTex = Math.sin(x * 0.08 + y * 0.14) * 14 + Math.cos(x * 0.15 - y * 0.09) * 9;
      if (rowSamples.length > 0 && y <= 54) {
        let lx = rowSamples[0];
        let rx = rowSamples[rowSamples.length - 1];
        for (let k = 0; k < rowSamples.length; k++) {
          if (rowSamples[k] <= x) lx = rowSamples[k];
          if (rowSamples[k] >= x) { rx = rowSamples[k]; break; }
        }
        const lPx = getPx(cleanBase, lx, sampleY);
        const rPx = getPx(cleanBase, rx, sampleY);
        const t = rx > lx ? (x - lx) / (rx - lx) : 0;
        setPx(
          far,
          x,
          y,
          lPx[0] * (1 - t) + rPx[0] * t + cloudTex * 0.65,
          lPx[1] * (1 - t) + rPx[1] * t + cloudTex * 0.15,
          lPx[2] * (1 - t) + rPx[2] * t + cloudTex * 0.08,
          255
        );
      } else {
        const t = clamp((y - 45) / 100, 0, 1);
        setPx(far, x, y, 118 - t * 84 + cloudTex * 0.5, 18 - t * 10 + cloudTex * 0.12, 8, 255);
      }
    } else {
      setPx(far, x, y, 22, 8, 8, 255);
    }
  }
}

const farPadded = padHorizontalRockEdge(far, W, H, PAD_FAR);
writeRgbaPng(farPadded, W + PAD_FAR * 2, H, path.join(OUT_DIR, 'minotaur_coliseum_far.png'));

// --- 4. Build MID Layer (Monumental Coliseum Stands, Towers, Statues, Throne, Stairs & Foreground Pillars) ---
const midRaw = Buffer.alloc(W * H * 4);
for (let y = 0; y < FLOOR_Y; y++) {
  for (let x = 0; x < W; x++) {
    if (isSky[y * W + x]) continue;

    let [r, g, b] = getPx(cleanBase, x, y);
    let a = 255;

    if (y > 0 && y < 76) {
      const skyAdj =
        (x > 0 && isSky[y * W + x - 1] ? 1 : 0) +
        (x < W - 1 && isSky[y * W + x + 1] ? 1 : 0) +
        (y > 0 && isSky[(y - 1) * W + x] ? 1 : 0) +
        (isSky[(y + 1) * W + x] ? 1 : 0);
      if (skyAdj >= 2) a = 195;
    }

    // Seamlessly replace bannerC and hanging chains on MID with smooth recessed stone archway behind the throne
    const isBan = bannerCAlpha(x, y, r, g, b) > 0;
    const isChL = chainLAlpha(x, y, r, g, b) > 0;
    const isChR = chainRAlpha(x, y, r, g, b) > 0;
    if (isBan || isChL || isChR) {
      const depth = clamp((y - 28) / 80, 0, 1);
      const grain = Math.sin(x * 0.65 + y * 0.35) * 3 + Math.cos(y * 0.9) * 2;
      r = 62 * (1 - depth) + 20 * depth + grain;
      g = 17 * (1 - depth) + 12 * depth + grain * 0.45;
      b = 14 * (1 - depth) + 14 * depth + grain * 0.45;
    }

    const di = (y * W + x) * 4;
    midRaw[di] = clamp(Math.round(r), 0, 255);
    midRaw[di + 1] = clamp(Math.round(g), 0, 255);
    midRaw[di + 2] = clamp(Math.round(b), 0, 255);
    midRaw[di + 3] = a;
  }
}

const midPadded = padHorizontalRockEdge(midRaw, W, H, PAD_MID);
writeRgbaPng(midPadded, W + PAD_MID * 2, H, path.join(OUT_DIR, 'minotaur_coliseum_mid.png'));

// --- 5. Build FLOOR Layer (y=198..270 -> 540x72) ---
const floorSlice = cleanBase.subarray(FLOOR_Y * W * 4, H * W * 4);
const floorPadded = padHorizontalRockEdge(floorSlice, W, FLOOR_H, PAD_FLOOR);
writeRgbaPng(floorPadded, W + PAD_FLOOR * 2, FLOOR_H, path.join(OUT_DIR, 'minotaur_coliseum_floor.png'));

// --- 6. Visual inspection composites ---
execFileSync('convert', [
  '(', path.join(OUT_DIR, 'minotaur_coliseum_far.png'), '-crop', `${W}x${H}+${PAD_FAR}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'minotaur_coliseum_mid.png'), '-crop', `${W}x${H}+${PAD_MID}+0`, '+repage', ')',
  '(', path.join(OUT_DIR, 'minotaur_coliseum_floor.png'), '-crop', `${W}x${FLOOR_H}+${PAD_FLOOR}+0`, '+repage', ')',
  '-append',
  path.join(CHECK_DIR, 'minotaur_layers_check.png'),
]);

execFileSync('convert', [
  path.join(OUT_DIR, 'minotaur_coliseum_chain_l.png'),
  path.join(OUT_DIR, 'minotaur_coliseum_banner_c.png'),
  path.join(OUT_DIR, 'minotaur_coliseum_chain_r.png'),
  '+append',
  path.join(CHECK_DIR, 'minotaur_parts_check.png'),
]);

console.log('Extracted Coliseu dos Minotauros v2 cleanly!');
