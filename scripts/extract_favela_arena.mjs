import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Arena_de_Favela_em_Pixel_Art_e87a02fa.png';
const OUT_DIR = 'public/assets/arenas';
const CHECK_DIR = '.playwright-cli';

const W = 480;
const H = 270;
const W2 = 960;
const H2 = 540;
const PAD_FAR = 20;   // 520x270
const PAD_HILLS = 20; // 520x270
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

function loadResizedRgba(w, h, filter = 'Box') {
  return execFileSync(
    'convert',
    [SRC, '-filter', filter, '-resize', `${w}x${h}!`, '-alpha', 'on', '-depth', '8', 'rgba:-'],
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
      const dim = dimEdges && edgeDist > 0 ? Math.max(0.78, 1 - edgeDist * 0.01) : 1;
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

function extractCropFromBuf(srcBuf, srcW, srcH, x0, y0, cw, ch, alphaFn) {
  const out = Buffer.alloc(cw * ch * 4);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      const sx = x0 + cx;
      const sy = y0 + cy;
      if (sx < 0 || sx >= srcW || sy < 0 || sy >= srcH) continue;
      const [r, g, b] = getPx(srcBuf, srcW, srcH, sx, sy);
      const a = alphaFn ? alphaFn(sx, sy, r, g, b) : 255;
      if (a > 0) setPx(out, cw, cx, cy, r, g, b, a);
    }
  }
  return out;
}

const base = loadResizedRgba(W, H, 'Box');
const hi = loadResizedRgba(W2, H2, 'Box');

// =========================================================================
// 1. FAR SKY LAYER (520x270) — Sky, clouds, distant ridges, Cristo Redentor,
//    distant white city buildings. Cleanly removes helicopter & extends sky
//    behind left awning/tree and right buildings/pole.
// =========================================================================
const farBuf = Buffer.from(base);

// Cleanly inpaint helicopter out of sky (x: 141..188, y: 42..68)
for (let y = 42; y <= 68; y++) {
  for (let x = 141; x <= 188; x++) {
    const [rL, gL, bL] = getPx(base, W, H, 139, y);
    const [rR, gR, bR] = getPx(base, W, H, 190, y);
    const t = (x - 141) / 47;
    const wEdge = Math.min(
      smoothStep(141, 144, x),
      1 - smoothStep(185, 188, x),
      smoothStep(42, 45, y),
      1 - smoothStep(65, 68, y)
    );
    const [origR, origG, origB] = getPx(base, W, H, x, y);
    setPx(
      farBuf,
      W,
      x,
      y,
      origR * (1 - wEdge) + (rL * (1 - t) + rR * t) * wEdge,
      origG * (1 - wEdge) + (gL * (1 - t) + gR * t) * wEdge,
      origB * (1 - wEdge) + (bL * (1 - t) + bR * t) * wEdge,
      255
    );
  }
}

// Also cleanly remove static crowd silhouettes from farBuf (x: 132..245, y: 120..145)
// so distant city towers extend smoothly down to y=145 without dark ghost blobs!
for (let y = 120; y < 146; y++) {
  for (let x = 132; x < 260; x++) {
    const [r, g, b] = getPx(farBuf, W, H, x, y);
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (lum < 85 || y >= 134) {
      const sy = clamp(y - 16, 108, 121);
      const [cr, cg, cb] = getPx(base, W, H, clamp(x, 148, 250), sy);
      setPx(farBuf, W, x, y, cr * 0.92, cg * 0.92, cb * 0.96, 255);
    }
  }
}

// Fill smoothly behind left tree/awning (x: 0..144) and right building/pole (x: 386..480)
for (let y = 0; y < 146; y++) {
  for (let x = 0; x < 144; x++) {
    // Stretch and softly average nearby open sky/city (x: 146..210) so no mirror crease forms
    const u = (143 - x) / 143;
    const sx = Math.round(146 + u * 56);
    const sx2 = Math.round(150 + ((u * 40 + 18) % 52));
    const [r1, g1, b1] = getPx(farBuf, W, H, sx, clamp(y, 0, 128));
    const [r2, g2, b2] = getPx(farBuf, W, H, sx2, clamp(y, 0, 128));
    setPx(farBuf, W, x, y, r1 * 0.65 + r2 * 0.35, g1 * 0.65 + g2 * 0.35, b1 * 0.65 + b2 * 0.35, 255);
  }
  for (let x = 386; x < W; x++) {
    const u = (x - 386) / (W - 386);
    const sx = Math.round(384 - u * 34);
    const [r, g, b] = getPx(farBuf, W, H, sx, clamp(y, 0, 96));
    setPx(farBuf, W, x, y, r, g, b, 255);
  }
}

// Lower backdrop behind hills/fence (y >= 145) — natural shaded concrete alley tones
for (let y = 145; y < FLOOR_Y; y++) {
  const u = clamp((y - 145) / 53, 0, 1);
  for (let x = 0; x < W; x++) {
    setPx(farBuf, W, x, y, 58 + u * 26, 66 + u * 24, 86 + u * 22, 255);
  }
}

const farPadded = padHorizontalClamped(farBuf, W, H, PAD_FAR, true);
writeRgbaPng(farPadded, W + PAD_FAR * 2, H, path.join(OUT_DIR, 'favela_far.png'));

// =========================================================================
// 2. HILLSIDE FAVELA LAYER (520x270) — Mid-distant colorful community houses,
//    palm tree, clothesline & sunlit yard behind the metal fence & crowd.
// =========================================================================
const hillsBuf = Buffer.alloc(W * H * 4);

// Hugs ONLY the colorful favela houses + hillside greenery + palm tree (x: 158..404)
// leaving open blue sky/Cristo/city visible above & to the left!
const hillsPoly = [
  [212, 198],
  [212, 116],
  [234, 112],
  [254, 102],
  [268, 92],
  [282, 80],
  [298, 72],
  [316, 64],
  [330, 56],
  [338, 34],
  [376, 34],
  [380, 54],
  [394, 48],
  [404, 48],
  [404, 198],
];

for (let y = 34; y < FLOOR_Y; y++) {
  for (let x = 144; x <= 404; x++) {
    // Sunlit favela alley ground visible behind chain-link fence (matches warm/cool tones of ref)
    if (y >= 145 && x >= 144 && x <= 404) {
      const alleyT = clamp((y - 145) / 52, 0, 1);
      const sunStrip = smoothStep(165, 178, y) * (1 - smoothStep(182, 192, y)) * 22;
      const tile = ((Math.floor(x / 10) + Math.floor(y / 5)) % 2) * 3;
      setPx(
        hillsBuf,
        W,
        x,
        y,
        62 + alleyT * 42 + sunStrip + tile,
        64 + alleyT * 38 + sunStrip * 0.9 + tile,
        78 + alleyT * 28 + sunStrip * 0.65 + tile,
        255
      );
      continue;
    }

    if (!pointInPoly(x, y, hillsPoly)) continue;
    const [r, g, b] = getPx(base, W, H, x, y);

    // Keep palm fronds crisp over transparent sky
    if (y < 70 && x >= 332 && x <= 382) {
      const isSky = (b > 168 && b - r > 38) || (r > 162 && g > 178 && b > 202);
      if (isSky) continue;
    }

    // Keep open sky gaps between distant hillside rooftops (y < 120) transparent
    if (y < 120 && b > 170 && b - r > 42 && r < 158) continue;

    // Cleanly remove static crowd silhouettes (y: 120..145) by extending sunlit house facades
    // directly above (without painting flat grey rectangles on the left)
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    if (y >= 120 && y < 145) {
      if (lum < 76 || (x < 245 && y >= 125)) {
        if (x < 212) continue;
        const sy = clamp(y - 22, 96, 117);
        const [hr, hg, hb] = getPx(base, W, H, clamp(x, 215, 392), sy);
        setPx(hillsBuf, W, x, y, hr * 0.9, hg * 0.9, hb * 0.92, 255);
        continue;
      }
    }

    setPx(hillsBuf, W, x, y, r, g, b, 255);
  }
}

const hillsPadded = padHorizontalClamped(hillsBuf, W, H, PAD_HILLS, false);
writeRgbaPng(hillsPadded, W + PAD_HILLS * 2, H, path.join(OUT_DIR, 'favela_hills.png'));

// =========================================================================
// 3. MID FOREGROUND STRUCTURES LAYER (520x270) — Left building + awning roof +
//    tree + speakers + FAVELA wall, Right building + pole + VIDA LOKA wall,
//    Center chain-link fence with crisp transparent diamond mesh.
// =========================================================================
const midBuf = Buffer.alloc(W * H * 4);

const inLeftFlag = (x, y) => x >= 94 && x <= 118 && y >= 100 && y <= 135;
const inCenterFlag = (x, y) => x >= 221 && x <= 269 && y >= 148 && y <= 185;
const inRightFlag = (x, y) => x >= 428 && x <= 459 && y >= 38 && y <= 100;

const isSkyOrCloud = (r, g, b) =>
  (b > 165 && b - r > 36) || (r > 158 && g > 175 && b > 200);

function isLeftForeground(x, y) {
  if (y >= FLOOR_Y) return false;
  // Upper-left tree canopy (keep sky & bright cloud edges transparent)
  if (x <= 146 && y <= 63) {
    const [r, g, b] = getPx(base, W, H, x, y);
    if (!isSkyOrCloud(r, g, b)) return true;
  }
  // Left watchtower & sloped terracotta awning roof + porch lintel (y: 48..107)
  // Anything not sky/cloud here is watchtower, terracotta shingles, or shaded eaves!
  if (x <= 134 && y >= 48 && y <= 107) {
    const [r, g, b] = getPx(base, W, H, x, y);
    if (!isSkyOrCloud(r, g, b)) return true;
  }
  // Left concrete speaker building & wall (x <= 58)
  if (x <= 58) return true;
  // Left concrete balcony wall with FAVELA graffiti (x: 0..144, y: 145..198; top ledge at y=144..145)
  if (x <= 144 && y >= 145) return true;
  return false;
}

function isRightForeground(x, y) {
  if (y >= FLOOR_Y) return false;
  // Utility pole & streetlamp & overhead power wires
  if (x >= 416 && x <= 429) return true;
  if (x >= 379 && x <= 424 && y >= 14 && y <= 34) {
    const [r, g, b] = getPx(base, W, H, x, y);
    if (b - r < 42 && r < 145) return true;
  }
  if (x >= 332 && y <= 38) {
    const [r, g, b] = getPx(base, W, H, x, y);
    if (r < 95 && g < 115 && b < 155) return true;
  }
  // Right houses, awning roof, barrels & VIDA LOKA wall (x >= 394; keep crowd heads at x=394..398 clear above y=144)
  if (x >= 398) return true;
  if (x >= 394 && y >= 145) return true;
  // Right terracotta roof tip overhang (x: 382..398, y: 112..126) — keep roof tiles only, never dark crowd heads
  if (x >= 382 && x <= 398 && y >= 112 && y <= 126) {
    const [r, g, b] = getPx(base, W, H, x, y);
    if (r > b + 6 || (r > 70 && r >= g)) return true;
  }
  return false;
}

for (let y = 0; y < FLOOR_Y; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = getPx(base, W, H, x, y);

    if (isLeftForeground(x, y)) {
      if (inLeftFlag(x, y)) continue;
      setPx(midBuf, W, x, y, r, g, b, 255);
      continue;
    }

    if (isRightForeground(x, y)) {
      if (inRightFlag(x, y)) {
        // Smoothly interpolate clean stucco wall (y < 76) & terracotta roof slope (y >= 76)
        // from horizontal non-periodic references so there are zero vertical stripe artifacts
        const t = clamp((x - 428) / 31, 0, 1);
        const [lr, lg, lb] = getPx(base, W, H, 408 + Math.floor(t * 7), clamp(y - 10, 34, 96));
        const [rr, rg, rb] = getPx(base, W, H, 466 + Math.floor(t * 8), clamp(y + 4, 38, 102));
        setPx(
          midBuf,
          W,
          x,
          y,
          (lr * (1 - t) + rr * t) * 0.84,
          (lg * (1 - t) + rg * t) * 0.84,
          (lb * (1 - t) + rb * t) * 0.88,
          255
        );
      } else {
        setPx(midBuf, W, x, y, r, g, b, 255);
      }
      continue;
    }

    // Center metal chain-link fence (x: 144..394, top steel rail at y: 148..150)
    if (x >= 144 && x <= 394 && y >= 148) {
      if (y <= 150) {
        // Clean steel top bar across entire span (no static head silhouettes!)
        setPx(midBuf, W, x, y, y === 149 ? 114 : 88, y === 149 ? 124 : 98, y === 149 ? 148 : 122, 255);
        continue;
      }
      if (y >= 187) {
        setPx(midBuf, W, x, y, r, g, b, 255);
        continue;
      }
      const isPost =
        (x >= 144 && x <= 147) ||
        (x >= 207 && x <= 210) ||
        (x >= 280 && x <= 283) ||
        (x >= 354 && x <= 357) ||
        (x >= 391 && x <= 394);
      if (isPost) {
        setPx(midBuf, W, x, y, r, g, b, 255);
        continue;
      }

      // Crisp pixel-art diamond chain-link wire mesh (5px diagonal pitch) with true alpha openings
      const d1 = (x + y) % 5;
      const d2 = ((x - y) % 5 + 5) % 5;
      if (d1 === 0 || d2 === 0) {
        if (d1 === 0 && d2 === 0) {
          setPx(midBuf, W, x, y, 146, 158, 180, 225);
        } else {
          setPx(midBuf, W, x, y, 86, 96, 118, 175);
        }
      }
    }
  }
}

const midPadded = padHorizontalClamped(midBuf, W, H, PAD_MID, false);
writeRgbaPng(midPadded, W + PAD_MID * 2, H, path.join(OUT_DIR, 'favela_mid.png'));

// =========================================================================
// 4. FLOOR LAYER (540x72, FLOOR_Y = 198, PAD_FLOOR = 30)
// =========================================================================
const floorCrop = Buffer.alloc(W * FLOOR_H * 4);
for (let y = 0; y < FLOOR_H; y++) {
  for (let x = 0; x < W; x++) {
    const [r, g, b] = getPx(base, W, H, x, FLOOR_Y + y);
    setPx(floorCrop, W, x, y, r, g, b, 255);
  }
}
const floorPadded = padHorizontalClamped(floorCrop, W, FLOOR_H, PAD_FLOOR, false);
writeRgbaPng(floorPadded, W + PAD_FLOOR * 2, FLOOR_H, path.join(OUT_DIR, 'favela_floor.png'));

// =========================================================================
// 5. ANIMATED 2x SPRITE CUTOUTS: HELICOPTER + 3 CROWN FLAGS
// =========================================================================
{
  const hx0 = 286, hy0 = 104, hw = 84, hh = 30;
  const heli = extractCropFromBuf(hi, W2, H2, hx0, hy0, hw, hh, (sx, sy, r, g, b) => {
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    return lum < 126 ? 255 : 0;
  });
  writeRgbaPng(heli, hw, hh, path.join(OUT_DIR, 'favela_heli.png'));
}

{
  const fx0 = 190, fy0 = 202, fw = 46, fh = 56;
  const flagPoly = [
    [190, 202],
    [235, 205],
    [235, 255],
    [212, 257],
    [190, 255],
  ];
  const flagL = extractCropFromBuf(hi, W2, H2, fx0, fy0, fw, fh, (sx, sy) => {
    return pointInPoly(sx, sy, flagPoly) ? 255 : 0;
  });
  writeRgbaPng(flagL, fw, fh, path.join(OUT_DIR, 'favela_flag_l.png'));
}

{
  const fx0 = 444, fy0 = 300, fw = 92, fh = 66;
  const flagPoly = [
    [445, 300],
    [535, 300],
    [535, 355],
    [490, 365],
    [445, 355],
  ];
  const flagC = extractCropFromBuf(hi, W2, H2, fx0, fy0, fw, fh, (sx, sy) => {
    return pointInPoly(sx, sy, flagPoly) ? 255 : 0;
  });
  writeRgbaPng(flagC, fw, fh, path.join(OUT_DIR, 'favela_flag_c.png'));
}

{
  const fx0 = 858, fy0 = 78, fw = 60, fh = 112;
  const flagPoly = [
    [861, 82],
    [915, 78],
    [915, 184],
    [860, 188],
  ];
  const flagR = extractCropFromBuf(hi, W2, H2, fx0, fy0, fw, fh, (sx, sy) => {
    return pointInPoly(sx, sy, flagPoly) ? 255 : 0;
  });
  writeRgbaPng(flagR, fw, fh, path.join(OUT_DIR, 'favela_flag_r.png'));
}

// =========================================================================
// 6. COMPOSITE VERIFICATION SHEETS
// =========================================================================
const comp = Buffer.alloc(W * H * 4);
function blitOver(dst, src, sxOff, dstY = 0, srcW = W, srcH = H) {
  for (let y = 0; y < srcH; y++) {
    const dy = dstY + y;
    if (dy < 0 || dy >= H) continue;
    for (let x = 0; x < W; x++) {
      const sx = x + sxOff;
      if (sx < 0 || sx >= srcW) continue;
      const si = (y * srcW + sx) * 4;
      const a = src[si + 3] / 255;
      if (a <= 0) continue;
      const di = (dy * W + x) * 4;
      dst[di] = Math.round(dst[di] * (1 - a) + src[si] * a);
      dst[di + 1] = Math.round(dst[di + 1] * (1 - a) + src[si + 1] * a);
      dst[di + 2] = Math.round(dst[di + 2] * (1 - a) + src[si + 2] * a);
      dst[di + 3] = 255;
    }
  }
}

blitOver(comp, farPadded, PAD_FAR, 0, W + PAD_FAR * 2, H);
blitOver(comp, hillsPadded, PAD_HILLS, 0, W + PAD_HILLS * 2, H);
blitOver(comp, midPadded, PAD_MID, 0, W + PAD_MID * 2, H);
blitOver(comp, floorPadded, PAD_FLOOR, FLOOR_Y, W + PAD_FLOOR * 2, FLOOR_H);
writeRgbaPng(comp, W, H, path.join(CHECK_DIR, 'favela_layers_check.png'));

console.log('Extracted Favela layers & parts v4 successfully.');
