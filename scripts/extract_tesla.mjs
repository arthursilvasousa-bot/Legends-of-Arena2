import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC_PORTRAIT = 'public/assets/aistudio/images__1__6246efc3.jpg';
const SRC_SHEET1 = 'public/assets/aistudio/Folha_de_Sprites_do_Tesla_Neon_e2311453.png';
const SRC_GUARD = 'public/assets/aistudio/Her_i_Dourado_em_Guarda_Pixelada_c9d9addf.png';
const SRC_SPECIALS = 'public/assets/aistudio/Sprite_Sheet_de_Ataques_El_tricos_ee8f6793.png';

const OUT_DIR = 'public/assets/tesla';
const ANIM_DIR = path.join(OUT_DIR, 'animations');
const FX_DIR = path.join(OUT_DIR, 'fx');

if (fs.existsSync(OUT_DIR)) {
  for (const entry of fs.readdirSync(OUT_DIR)) {
    fs.rmSync(path.join(OUT_DIR, entry), { recursive: true, force: true });
  }
}
fs.mkdirSync(ANIM_DIR, { recursive: true });
fs.mkdirSync(FX_DIR, { recursive: true });

const W = 1536;
const H = 1024;

function loadRgba(filePath) {
  return execFileSync('convert', [filePath, '-depth', '8', 'rgba:-'], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

const sheet1Buf = loadRgba(SRC_SHEET1);
const guardBuf = loadRgba(SRC_GUARD);
const specialsBuf = loadRgba(SRC_SPECIALS);

function getPx(buf, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0, 0];
  const i = (y * W + x) * 4;
  return [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]];
}

// Flood-fill background removal for Sheet 1 (dark #0c0d0f..#181c28 studio backdrop)
function isSheet1BgColor(r, g, b) {
  const maxc = Math.max(r, g, b);
  const minc = Math.min(r, g, b);
  return maxc <= 34 && maxc - minc <= 18;
}

function extractSheet1Box(box, opts = {}) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const total = bw * bh;
  const rgba = new Uint8ClampedArray(total * 4);
  const fg = new Uint8Array(total);
  const bgMask = new Uint8Array(total);
  const { exclude = null, dropOrphans = 'tiny' } = opts;

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (exclude && exclude(x, y)) continue;
      const [r, g, b, a] = getPx(sheet1Buf, x, y);
      const idx = (y - y1) * bw + (x - x1);
      rgba[idx * 4] = r;
      rgba[idx * 4 + 1] = g;
      rgba[idx * 4 + 2] = b;
      rgba[idx * 4 + 3] = a;
    }
  }

  // BFS flood-fill from box border pixels matching dark backdrop
  const q = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const trySeed = (lx, ly) => {
    if (lx < 0 || ly < 0 || lx >= bw || ly >= bh) return;
    const idx = ly * bw + lx;
    if (bgMask[idx]) return;
    const i4 = idx * 4;
    if (rgba[i4 + 3] === 0 || isSheet1BgColor(rgba[i4], rgba[i4 + 1], rgba[i4 + 2])) {
      bgMask[idx] = 1;
      q[tail++] = idx;
    }
  };
  for (let lx = 0; lx < bw; lx++) {
    trySeed(lx, 0);
    trySeed(lx, bh - 1);
  }
  for (let ly = 0; ly < bh; ly++) {
    trySeed(0, ly);
    trySeed(bw - 1, ly);
  }
  while (head < tail) {
    const cur = q[head++];
    const cx = cur % bw;
    const cy = (cur - cx) / bw;
    const neighbors = [
      [cx - 1, cy],
      [cx + 1, cy],
      [cx, cy - 1],
      [cx, cy + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
      const nIdx = ny * bw + nx;
      if (bgMask[nIdx]) continue;
      const ni = nIdx * 4;
      if (rgba[ni + 3] === 0 || isSheet1BgColor(rgba[ni], rgba[ni + 1], rgba[ni + 2])) {
        bgMask[nIdx] = 1;
        q[tail++] = nIdx;
      }
    }
  }

  // Clear background pixels & soften outer dark-cyan halo fringe touching background
  for (let idx = 0; idx < total; idx++) {
    const i4 = idx * 4;
    if (bgMask[idx]) {
      rgba[i4] = 0;
      rgba[i4 + 1] = 0;
      rgba[i4 + 2] = 0;
      rgba[i4 + 3] = 0;
      continue;
    }
    const r = rgba[i4];
    const g = rgba[i4 + 1];
    const b = rgba[i4 + 2];
    const cx = idx % bw;
    const cy = (idx - cx) / bw;
    let touchesBg = false;
    for (let dy = -1; dy <= 1 && !touchesBg; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh || bgMask[ny * bw + nx]) {
          touchesBg = true;
          break;
        }
      }
    }
    if (touchesBg && Math.max(r, g, b) < 52 && b >= r) {
      const lum = Math.max(r, g, b);
      if (lum < 34) {
        rgba[i4] = 0;
        rgba[i4 + 1] = 0;
        rgba[i4 + 2] = 0;
        rgba[i4 + 3] = 0;
      } else {
        rgba[i4 + 3] = Math.round(((lum - 34) / 18) * 210);
      }
    }
    if (rgba[i4 + 3] > 24) fg[idx] = 1;
  }

  return cleanupOrphans({ bw, bh, rgba }, fg, dropOrphans);
}

function extractTransparentBox(buf, box, opts = {}) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const total = bw * bh;
  const rgba = new Uint8ClampedArray(total * 4);
  const fg = new Uint8Array(total);
  const { exclude = null, keepOnly = null, alphaTransform = null, dropOrphans = 'tiny' } = opts;

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (exclude && exclude(x, y)) continue;
      const [r, g, b, a] = getPx(buf, x, y);
      if (a <= 20) continue;
      if (exclude && exclude(x, y, r, g, b, a)) continue;
      if (keepOnly && !keepOnly(x, y, r, g, b, a)) continue;
      const na = alphaTransform ? alphaTransform(x, y, r, g, b, a) : a;
      if (na <= 14) continue;
      const idx = (y - y1) * bw + (x - x1);
      rgba[idx * 4] = r;
      rgba[idx * 4 + 1] = g;
      rgba[idx * 4 + 2] = b;
      rgba[idx * 4 + 3] = na;
      fg[idx] = 1;
    }
  }
  return cleanupOrphans({ bw, bh, rgba }, fg, dropOrphans);
}

function cleanupOrphans(frame, fg, mode) {
  if (!mode) return frame;
  const { bw, bh, rgba } = frame;
  const total = bw * bh;
  const vis = new Uint8Array(total);
  const q = new Int32Array(total);
  const comps = [];
  for (let i = 0; i < total; i++) {
    if (!fg[i] || vis[i]) continue;
    let head = 0;
    let tail = 0;
    vis[i] = 1;
    q[tail++] = i;
    const pixels = [];
    let minLx = bw;
    let maxLx = 0;
    let minLy = bh;
    let maxLy = 0;
    while (head < tail) {
      const cur = q[head++];
      pixels.push(cur);
      const cx = cur % bw;
      const cy = (cur - cx) / bw;
      if (cx < minLx) minLx = cx;
      if (cx > maxLx) maxLx = cx;
      if (cy < minLy) minLy = cy;
      if (cy > maxLy) maxLy = cy;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
          const n = ny * bw + nx;
          if (fg[n] && !vis[n]) {
            vis[n] = 1;
            q[tail++] = n;
          }
        }
      }
    }
    comps.push({ pixels, count: pixels.length, minLx, maxLx, minLy, maxLy });
  }
  const maxCount = Math.max(0, ...comps.map((c) => c.count));
  for (const c of comps) {
    if (c.count === maxCount) continue;
    if (mode === 'single') {
      for (const idx of c.pixels) {
        rgba[idx * 4] = 0;
        rgba[idx * 4 + 1] = 0;
        rgba[idx * 4 + 2] = 0;
        rgba[idx * 4 + 3] = 0;
      }
    } else if (mode === 'tiny') {
      if (c.count < 10) {
        for (const idx of c.pixels) {
          rgba[idx * 4] = 0;
          rgba[idx * 4 + 1] = 0;
          rgba[idx * 4 + 2] = 0;
          rgba[idx * 4 + 3] = 0;
        }
      }
    }
  }
  return frame;
}

function resizeFrameRgba(frame, scale) {
  const newW = Math.max(2, Math.round(frame.bw * scale));
  const newH = Math.max(2, Math.round(frame.bh * scale));
  const resized = execFileSync(
    'convert',
    [
      '-size',
      `${frame.bw}x${frame.bh}`,
      '-depth',
      '8',
      'rgba:-',
      '-filter',
      'Lanczos',
      '-resize',
      `${newW}x${newH}!`,
      '-depth',
      '8',
      'rgba:-',
    ],
    { input: Buffer.from(frame.rgba), maxBuffer: 32 * 1024 * 1024 }
  );
  return { bw: newW, bh: newH, rgba: new Uint8ClampedArray(resized) };
}

function tightBoundsFromRgba(frame, alphaThresh = 24) {
  const { bw, bh, rgba } = frame;
  let minX = bw;
  let minY = bh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (rgba[(y * bw + x) * 4 + 3] > alphaThresh) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { ...frame, x1: 0, y1: 0, x2: bw - 1, y2: bh - 1, w: bw, h: bh };
  return { ...frame, x1: minX, y1: minY, x2: maxX, y2: maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function footBottomY(f) {
  const { bw, rgba, x1, y1, x2, y2 } = f;
  for (let y = y2; y >= y1; y--) {
    let opaque = 0;
    for (let x = x1; x <= x2; x++) {
      if (rgba[(y * bw + x) * 4 + 3] > 140) opaque++;
    }
    if (opaque >= 4) return y;
  }
  return y2;
}

function bodyCenterX(f) {
  const { bw, rgba, x1, y1, x2, y2 } = f;
  const w = x2 - x1 + 1;
  const colWeights = new Array(w).fill(0);
  for (let x = x1; x <= x2; x++) {
    let cw = 0;
    for (let y = y1; y <= y2; y++) {
      const idx = (y * bw + x) * 4;
      const r = rgba[idx];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      if (a > 160) {
        const isWarmBody = r > 120 && r >= b + 20;
        cw += isWarmBody ? 2.2 : 0.6;
      }
    }
    colWeights[x - x1] = cw;
  }
  const win = Math.min(46, w);
  let bestSum = -1;
  let bestStart = 0;
  let curSum = 0;
  for (let i = 0; i < w; i++) {
    curSum += colWeights[i];
    if (i >= win) curSum -= colWeights[i - win];
    if (i >= win - 1 && curSum > bestSum) {
      bestSum = curSum;
      bestStart = i - win + 1;
    }
  }
  let num = 0;
  let den = 0;
  for (let i = bestStart; i < Math.min(w, bestStart + win); i++) {
    num += (x1 + i) * colWeights[i];
    den += colWeights[i];
  }
  return den > 0 ? Math.round(num / den) : Math.round((x1 + x2) / 2);
}

// =========================================================================
// POSE DEFINITIONS across Sheet 1, Guard Sheet, & Specials Sheet
// =========================================================================
const POSES = {};

// --- Sheet 1 Row 1: idle (4), walk_forward (6), walk_backward (6) ---
const s1R1Idle = [
  [22, 40, 112, 205],
  [118, 40, 205, 205],
  [206, 40, 302, 205],
  [303, 40, 394, 205],
];
s1R1Idle.forEach((box, i) => (POSES[`idle_${i}`] = { src: 's1', box }));

const s1R1WalkF = [
  [462, 40, 553, 205],
  [554, 40, 643, 205],
  [645, 40, 731, 205],
  [733, 40, 833, 205],
  [834, 40, 910, 205],
  [910, 40, 1020, 205],
];
s1R1WalkF.forEach((box, i) => (POSES[`walk_f_${i}`] = { src: 's1', box }));

const s1R1WalkB = [
  [1056, 40, 1138, 205],
  [1142, 40, 1218, 205],
  [1220, 40, 1296, 205],
  [1298, 40, 1378, 205],
  [1380, 40, 1447, 205],
  [1448, 40, 1528, 205],
];
s1R1WalkB.forEach((box, i) => (POSES[`walk_b_${i}`] = { src: 's1', box }));

// --- Sheet 1 Row 2: run_forward (7) with exact knee/toe overlap split, run_backward (5), jump (5) ---
POSES.run_f_0 = {
  src: 's1',
  box: [8, 243, 108, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => x >= 94 && y >= 344,
};
POSES.run_f_1 = {
  src: 's1',
  box: [94, 243, 214, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => (x <= 108 && y <= 343) || (x >= 198 && y >= 344),
};
POSES.run_f_2 = {
  src: 's1',
  box: [198, 243, 313, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => (x <= 214 && y <= 343) || (x >= 288 && y >= 344),
};
POSES.run_f_3 = {
  src: 's1',
  box: [288, 243, 412, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => (x <= 312 && y <= 343) || (x >= 395 && y >= 344),
};
POSES.run_f_4 = {
  src: 's1',
  box: [395, 243, 509, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => (x <= 412 && y <= 343) || (x >= 488 && y >= 344),
};
POSES.run_f_5 = {
  src: 's1',
  box: [488, 243, 598, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => (x <= 509 && y <= 343) || (x >= 582 && y >= 344),
};
POSES.run_f_6 = {
  src: 's1',
  box: [582, 243, 694, 393],
  dropOrphans: 'tiny',
  exclude: (x, y) => x <= 598 && y <= 343,
};

const s1R2RunB = [
  [702, 243, 795, 393],
  [796, 243, 867, 393],
  [868, 243, 938, 393],
  [938, 243, 1008, 393],
  [1008, 243, 1078, 393],
];
s1R2RunB.forEach((box, i) => (POSES[`run_b_${i}`] = { src: 's1', box, dropOrphans: 'tiny' }));

// Note jump_2 reaches up to y=216!
const s1R2Jump = [
  [1080, 243, 1182, 393],
  [1182, 234, 1272, 370],
  [1272, 216, 1364, 345],
  [1360, 243, 1442, 393],
  [1445, 243, 1528, 393],
];
s1R2Jump.forEach((box, i) => (POSES[`jump_${i}`] = { src: 's1', box, dropOrphans: 'tiny' }));

// --- Sheet 1 Row 3 (y1=428 skips blue header underline cleanly, hkick_2/3 go higher to 412/410) ---
POSES.jab_0 = { src: 's1', box: [8, 428, 98, 558] };
POSES.jab_1 = { src: 's1', box: [100, 428, 195, 558] };
POSES.jab_2 = {
  src: 's1',
  box: [198, 428, 273, 558],
  exclude: (x, y) => x >= 267 && y >= 520,
};
POSES.jab_3 = {
  src: 's1',
  box: [267, 428, 384, 558],
  exclude: (x, y) => x <= 274 && y <= 495,
};

POSES.hpunch_0 = { src: 's1', box: [386, 428, 485, 558] };
POSES.hpunch_1 = {
  src: 's1',
  box: [486, 428, 570, 558],
  exclude: (x, y) => x >= 564 && y >= 520,
};
POSES.hpunch_2 = {
  src: 's1',
  box: [564, 428, 659, 558],
  exclude: (x, y) => (x <= 571 && y <= 495) || (x >= 650 && y >= 520),
};
POSES.hpunch_3 = {
  src: 's1',
  box: [648, 428, 742, 558],
  exclude: (x, y) => x <= 660 && y <= 495,
};

const s1R3FKick = [
  [758, 428, 848, 558],
  [848, 428, 934, 558],
  [935, 428, 1016, 558],
  [1020, 428, 1132, 558],
];
s1R3FKick.forEach((box, i) => (POSES[`fkick_${i}`] = { src: 's1', box }));

POSES.hkick_0 = { src: 's1', box: [1144, 428, 1225, 558] };
POSES.hkick_1 = { src: 's1', box: [1225, 428, 1300, 558] };
POSES.hkick_2 = { src: 's1', box: [1308, 412, 1411, 558] };
POSES.hkick_3 = { src: 's1', box: [1412, 410, 1520, 558] };

// --- Sheet 1 Row 4 (y1=597 skips header underline cleanly while keeping victory_0 raised hand at x<1094 & victory_3 at 588) ---
const s1R4Block = [
  [12, 597, 103, 738],
  [111, 597, 196, 738],
  [207, 597, 292, 738],
  [300, 597, 388, 738],
];
s1R4Block.forEach((box, i) => (POSES[`block_${i}`] = { src: 's1', box }));

const s1R4LowBlock = [
  [420, 597, 523, 738],
  [525, 597, 615, 738],
  [619, 597, 722, 738],
];
s1R4LowBlock.forEach((box, i) => (POSES[`lblock_${i}`] = { src: 's1', box }));

const s1R4Crouch = [
  [745, 597, 842, 738],
  [853, 597, 949, 738],
  [958, 597, 1049, 738],
];
s1R4Crouch.forEach((box, i) => (POSES[`crouch_${i}`] = { src: 's1', box }));

POSES.victory_0 = {
  src: 's1',
  box: [1065, 588, 1172, 738],
  exclude: (x, y) => x >= 1094 && y <= 597,
};
POSES.victory_1 = { src: 's1', box: [1178, 597, 1262, 738] };
POSES.victory_2 = { src: 's1', box: [1274, 597, 1378, 738] };
POSES.victory_3 = { src: 's1', box: [1394, 588, 1516, 738] };

// --- Guard Sheet (scaled to 0.385x so height matches ~164px standing sprite!) ---
const guardBoxes = [
  [80, 28, 388, 458],
  [442, 28, 745, 458],
  [806, 30, 1116, 458],
  [1168, 32, 1480, 458],
  [55, 538, 384, 966],
  [448, 544, 750, 962],
  [815, 540, 1121, 962],
  [1186, 534, 1492, 963],
];
guardBoxes.forEach((box, i) => (POSES[`guard_${i}`] = { src: 'guard', box, scale: 0.385 }));

// --- Sheet 3 (Specials) Character poses ---
const sp1Char = [
  [12, 44, 110, 208],
  [115, 44, 212, 208],
  [215, 44, 312, 208],
  [313, 44, 395, 208],
  [408, 44, 513, 208],
  [514, 44, 619, 208],
  [622, 44, 720, 208],
];
sp1Char.forEach((box, i) => (POSES[`sp1_${i}`] = { src: 'sp', box }));

POSES.sp2_0 = { src: 'sp', box: [10, 266, 106, 426] };
POSES.sp2_1 = { src: 'sp', box: [108, 266, 202, 426] };
POSES.sp2_2 = { src: 'sp', box: [204, 266, 300, 426] };
POSES.sp2_3 = { src: 'sp', box: [301, 266, 392, 426] };
POSES.sp2_4 = { src: 'sp', box: [394, 256, 498, 426] };
POSES.sp2_5 = { src: 'sp', box: [502, 256, 626, 426] };
POSES.sp2_6 = { src: 'sp', box: [627, 264, 730, 426] };
POSES.sp2_7 = { src: 'sp', box: [806, 264, 914, 426] };
POSES.sp2_8 = {
  src: 'sp',
  box: [915, 252, 1094, 426],
  alphaTransform: (x, y, r, g, b, a) => {
    if (x > 1076) {
      const t = Math.max(0, 1 - (x - 1076) / 18);
      return Math.round(a * t);
    }
    return a;
  },
};

POSES.sp3_0 = { src: 'sp', box: [10, 482, 108, 642] };
POSES.sp3_1 = { src: 'sp', box: [108, 482, 192, 642] };
POSES.sp3_2 = {
  src: 'sp',
  box: [192, 482, 344, 642],
  alphaTransform: (x, y, r, g, b, a) => {
    if (x > 320) {
      const t = Math.max(0, 1 - (x - 320) / 24);
      return Math.round(a * t);
    }
    return a;
  },
};

POSES.sp4_0 = { src: 'sp', box: [14, 698, 102, 845] };
POSES.sp4_1 = { src: 'sp', box: [103, 698, 185, 845] };
POSES.sp4_2 = { src: 'sp', box: [10, 846, 114, 998] };
POSES.sp4_3 = { src: 'sp', box: [118, 846, 224, 998] };
POSES.sp4_4 = { src: 'sp', box: [224, 846, 334, 998] };
POSES.sp4_end = {
  src: 'sp',
  box: [1372, 846, 1448, 998],
  exclude: (x, y) => x >= 1422 && y <= 965,
};

// =========================================================================
// EXTRACT & CACHE ALL POSES
// =========================================================================
const poseCache = {};
for (const [name, cfg] of Object.entries(POSES)) {
  let raw;
  const dropMode = cfg.dropOrphans || 'tiny';
  if (cfg.src === 's1') {
    raw = extractSheet1Box(cfg.box, { exclude: cfg.exclude, dropOrphans: dropMode });
  } else if (cfg.src === 'guard') {
    raw = extractTransparentBox(guardBuf, cfg.box, { exclude: cfg.exclude, dropOrphans: 'tiny' });
    if (cfg.scale) {
      raw = resizeFrameRgba(raw, cfg.scale);
    }
  } else {
    raw = extractTransparentBox(specialsBuf, cfg.box, {
      exclude: cfg.exclude,
      alphaTransform: cfg.alphaTransform || null,
      dropOrphans: dropMode,
    });
  }
  const f = tightBoundsFromRgba(raw, 24);
  const fy = footBottomY(f);
  const bcx = bodyCenterX(f);
  poseCache[name] = {
    ...f,
    footY: fy,
    bodyCenterX: bcx,
    leftReach: bcx - f.x1,
    rightReach: f.x2 - bcx,
  };
}

// =========================================================================
// BUILD SEQUENCES WITH USER-REQUESTED NAMES & EXACT FPS
// =========================================================================
const SEQUENCES = {
  tesla_idle: { fps: 8, loop: true, alignMode: 'feet', frames: ['idle_0', 'idle_1', 'idle_2', 'idle_3'] },
  tesla_walk_forward: { fps: 12, loop: true, alignMode: 'feet', frames: ['walk_f_0', 'walk_f_1', 'walk_f_2', 'walk_f_3', 'walk_f_4', 'walk_f_5'] },
  tesla_walk_backward: { fps: 12, loop: true, alignMode: 'feet', frames: ['walk_b_0', 'walk_b_1', 'walk_b_2', 'walk_b_3', 'walk_b_4', 'walk_b_5'] },
  tesla_run_forward: { fps: 16, loop: true, alignMode: 'feet', frames: ['run_f_0', 'run_f_1', 'run_f_2', 'run_f_3', 'run_f_4', 'run_f_5', 'run_f_6'] },
  tesla_run_backward: { fps: 16, loop: true, alignMode: 'feet', frames: ['run_b_0', 'run_b_1', 'run_b_2', 'run_b_3', 'run_b_4'] },
  tesla_jump: { fps: 12, loop: false, alignMode: 'center', frames: ['jump_0', 'jump_1', 'jump_2', 'jump_3', 'jump_4'] },
  tesla_jab: { fps: 15, loop: false, alignMode: 'feet', frames: ['jab_0', 'jab_1', 'jab_2', 'jab_3'] },
  tesla_heavy_punch: { fps: 12, loop: false, alignMode: 'feet', frames: ['hpunch_0', 'hpunch_1', 'hpunch_2', 'hpunch_3'] },
  tesla_front_kick: { fps: 15, loop: false, alignMode: 'feet', frames: ['fkick_0', 'fkick_1', 'fkick_2', 'fkick_3'] },
  tesla_high_kick: { fps: 15, loop: false, alignMode: 'feet', frames: ['hkick_0', 'hkick_1', 'hkick_2', 'hkick_3'] },
  tesla_block: { fps: 10, loop: true, alignMode: 'feet', frames: ['block_0', 'block_1', 'block_2', 'block_3'] },
  tesla_low_block: { fps: 10, loop: true, alignMode: 'feet', frames: ['lblock_0', 'lblock_1', 'lblock_2'] },
  tesla_crouch: { fps: 10, loop: false, alignMode: 'feet', frames: ['crouch_0', 'crouch_1', 'crouch_2'] },
  tesla_standup: { fps: 12, loop: false, alignMode: 'feet', frames: ['crouch_2', 'crouch_1', 'idle_0'] },
  tesla_roll: { fps: 15, loop: true, alignMode: 'feet', frames: ['crouch_1', 'run_f_2', 'crouch_2'] },
  tesla_damage: { fps: 12, loop: false, alignMode: 'feet', frames: ['walk_b_0', 'run_b_2', 'block_2'] },
  tesla_knockdown: { fps: 10, loop: false, alignMode: 'feet', frames: ['run_b_3', 'crouch_1', 'crouch_2'] },
  tesla_getup: { fps: 12, loop: false, alignMode: 'feet', frames: ['crouch_2', 'crouch_0', 'idle_0'] },
  tesla_grab: { fps: 12, loop: false, alignMode: 'feet', frames: ['jab_1', 'jab_3'] },
  tesla_throw: { fps: 14, loop: false, alignMode: 'feet', frames: ['hpunch_1', 'hpunch_3'] },
  tesla_victory: { fps: 10, loop: false, alignMode: 'feet', frames: ['victory_0', 'victory_1', 'victory_2', 'victory_3'] },
  tesla_guard_gold: { fps: 10, loop: true, alignMode: 'feet', frames: ['guard_0', 'guard_1', 'guard_2', 'guard_3', 'guard_4', 'guard_5', 'guard_6', 'guard_7'] },

  // Special pose animations
  tesla_special1_charge: { fps: 15, loop: false, alignMode: 'feet', frames: ['sp1_0', 'sp1_1', 'sp1_2', 'sp1_3', 'sp1_4', 'sp1_5', 'sp1_6'] },
  tesla_special2_teleport: { fps: 18, loop: false, alignMode: 'feet', frames: ['sp2_0', 'sp2_1', 'sp2_2', 'sp2_3', 'sp2_4', 'sp2_5', 'sp2_6'] },
  tesla_special2_punch: { fps: 18, loop: false, alignMode: 'feet', frames: ['sp2_7', 'sp2_8'] },
  tesla_special3_charge: { fps: 15, loop: false, alignMode: 'feet', frames: ['sp3_0', 'sp3_1', 'sp3_2'] },
  tesla_special4_charge: { fps: 15, loop: false, alignMode: 'feet', frames: ['sp4_0', 'sp4_1', 'sp4_2', 'sp4_3', 'sp4_4'] },
  tesla_special4_end: { fps: 12, loop: false, alignMode: 'feet', frames: ['sp4_end'] },
};

function writeRgbaPng(rgba, width, height, outPath) {
  execFileSync(
    'convert',
    ['-size', `${width}x${height}`, '-depth', '8', 'rgba:-', outPath],
    { input: rgba, maxBuffer: 64 * 1024 * 1024 }
  );
}

const manifest = {
  sources: [SRC_PORTRAIT, SRC_SHEET1, SRC_GUARD, SRC_SPECIALS],
  portrait: '/assets/tesla/portrait.png',
  sequences: {},
  fx: {},
};

const previewRows = [];

for (const [seqName, seq] of Object.entries(SEQUENCES)) {
  const frames = seq.frames.map((pName) => poseCache[pName]);
  const maxLeftReach = Math.max(...frames.map((f) => f.leftReach)) + 4;
  const maxRightReach = Math.max(...frames.map((f) => f.rightReach)) + 4;
  const frameW = Math.ceil((maxLeftReach + maxRightReach) / 2) * 2;
  const anchorX = maxLeftReach;

  const maxAboveFoot = Math.max(...frames.map((f) => f.footY - f.y1));
  const maxBelowFoot = Math.max(...frames.map((f) => f.y2 - f.footY));
  const frameH = Math.ceil((maxAboveFoot + maxBelowFoot + 6) / 2) * 2;
  const anchorY = frameH - 3 - maxBelowFoot;

  const stripW = frameW * frames.length;
  const stripH = frameH;
  const out = Buffer.alloc(stripW * stripH * 4, 0);

  frames.forEach((f, idx) => {
    const destXStart = idx * frameW + (anchorX - f.leftReach);
    const destYStart =
      seq.alignMode === 'center'
        ? Math.floor((frameH - f.h) / 2)
        : anchorY - (f.footY - f.y1);

    for (let sy = f.y1; sy <= f.y2; sy++) {
      const dy = destYStart + (sy - f.y1);
      if (dy < 0 || dy >= stripH) continue;
      for (let sx = f.x1; sx <= f.x2; sx++) {
        const dx = destXStart + (sx - f.x1);
        if (dx < idx * frameW || dx >= (idx + 1) * frameW) continue;
        const si = (sy * f.bw + sx) * 4;
        const a = f.rgba[si + 3];
        if (a <= 14) continue;
        const di = (dy * stripW + dx) * 4;
        out[di] = f.rgba[si];
        out[di + 1] = f.rgba[si + 1];
        out[di + 2] = f.rgba[si + 2];
        out[di + 3] = a;
      }
    }
  });

  const outFile = `${seqName}.png`;
  writeRgbaPng(out, stripW, stripH, path.join(ANIM_DIR, outFile));
  manifest.sequences[seqName] = {
    file: `/assets/tesla/animations/${outFile}`,
    frameWidth: frameW,
    frameHeight: stripH,
    frameCount: frames.length,
    fps: seq.fps,
    loop: seq.loop,
    anchorX,
    anchorY,
  };

  previewRows.push({ name: seqName, w: stripW, h: stripH, buf: out });
}

// =========================================================================
// CLEAN PROCEDURAL & EXTRACTED FX HELPERS (NO DUMMY SILHOUETTES OR HARD CUTS)
// =========================================================================
function isDummyOrNavyShadow(r, g, b) {
  // Dark silhouette navy/black or dull grey-blue silhouette outline
  const maxc = Math.max(r, g, b);
  const sat = maxc - Math.min(r, g, b);
  if (r < 95 && g < 135 && b < 225) return true;
  if (maxc < 185 && sat < 45 && b >= r) return true;
  return false;
}

const FX_SPECS = {
  // SP1: 4-frame electric ball projectile strip (orb 4 trimmed before starburst)
  tesla_special1_projectile: {
    fps: 15,
    boxes: [
      [760, 70, 854, 180],
      [856, 70, 970, 180],
      [971, 70, 1094, 180],
      [1095, 54, 1246, 200],
    ],
    dropOrphans: false,
  },
  // SP1: Pure electric starburst impact (dummy silhouette 100% cleared & filled with bright cyan-white starburst!)
  tesla_special1_impact: {
    fps: 15,
    boxes: [[1248, 44, 1442, 204]],
    dropOrphans: 'tiny',
    alphaTransform: (x, y, r, g, b, a) => {
      const dx = (x - 1356) / 52;
      const dy = (y - 134) / 64;
      const d = Math.hypot(dx, dy);
      if (d < 0.85) return 0;
      if (d < 1.15) {
        const t = (d - 0.85) / 0.3;
        if (r < 120 && g < 185) return 0;
        return Math.round(a * t * t);
      }
      if (r < 85 && g < 145) return 0;
      let edgeFade = 1;
      if (y < 54) edgeFade *= Math.max(0, (y - 44) / 10);
      if (y > 194) edgeFade *= Math.max(0, (204 - y) / 10);
      if (x > 1426) edgeFade *= Math.max(0, (1442 - x) / 16);
      return Math.round(a * edgeFade);
    },
    postProcess: (frame) => {
      const cx = frame.bw * 0.56;
      const cy = frame.bh * 0.52;
      for (let ly = 0; ly < frame.bh; ly++) {
        for (let lx = 0; lx < frame.bw; lx++) {
          const rx = lx - cx;
          const ry = ly - cy;
          const d = Math.hypot(rx / 72, ry / 74);
          if (d >= 1) continue;
          const angle = Math.atan2(ry, rx);
          const spike = Math.pow(Math.abs(Math.cos(angle * 4)) * 0.5 + Math.abs(Math.sin(angle * 7 + 0.5)) * 0.5, 2.2);
          const radial = Math.max(0, 1 - d) * (0.68 + 0.52 * spike);
          const glow = Math.min(1, Math.pow(radial, 1.3));
          const i = (ly * frame.bw + lx) * 4;
          const addA = Math.round(glow * 245);
          const oldA = frame.rgba[i + 3];
          if (addA <= 8 && oldA <= 8) continue;
          const na = Math.min(255, Math.max(oldA, addA));
          const core = Math.max(0, 1 - d * 1.9);
          // Keep RGB saturated bright cyan/white so edge fade never turns grey/muddy
          const cr = Math.min(255, Math.round(90 + 165 * core));
          const cg = Math.min(255, Math.round(215 + 40 * core));
          const cb = 255;
          if (oldA > 40) {
            frame.rgba[i] = Math.max(frame.rgba[i], cr);
            frame.rgba[i + 1] = Math.max(frame.rgba[i + 1], cg);
            frame.rgba[i + 2] = Math.max(frame.rgba[i + 2], cb);
          } else {
            frame.rgba[i] = cr;
            frame.rgba[i + 1] = cg;
            frame.rgba[i + 2] = cb;
          }
          frame.rgba[i + 3] = na;
        }
      }
    },
  },
  // SP2: Electric punch shockwave burst (without fist or dummy, smoothly feathered edges)
  tesla_special2_knockback: {
    fps: 18,
    boxes: [[1088, 254, 1345, 426]],
    dropOrphans: false,
    alphaTransform: (x, y, r, g, b, a) => {
      if (x >= 1285 && isDummyOrNavyShadow(r, g, b)) return 0;
      if (r < 45 && g < 80 && b < 170) return 0;
      let fade = 1;
      if (x < 1106) fade *= Math.max(0, (x - 1088) / 18);
      if (x > 1315) fade *= Math.max(0, (1345 - x) / 30);
      if (y < 270) fade *= Math.max(0, (y - 254) / 16);
      if (y > 410) fade *= Math.max(0, (426 - y) / 16);
      return Math.round(a * fade);
    },
  },
  // SP3: Continuous electric beam (feathered top/bottom/sides so no flat cut lines)
  tesla_special3_beam: {
    fps: 15,
    boxes: [[332, 484, 978, 642]],
    dropOrphans: false,
    alphaTransform: (x, y, r, g, b, a) => {
      let fade = 1;
      if (y < 496) fade *= Math.max(0, (y - 484) / 12);
      if (y > 630) fade *= Math.max(0, (642 - y) / 12);
      if (x < 344) fade *= Math.max(0, (x - 332) / 12);
      if (x > 966) fade *= Math.max(0, (978 - x) / 12);
      return Math.round(a * fade);
    },
  },
  // SP3: Radial electric reflection starburst (clean glowing spark from beam muzzle, not cropped arrow)
  tesla_special3_reflection: {
    fps: 15,
    boxes: [[274, 514, 356, 610]],
    dropOrphans: false,
    alphaTransform: (x, y, r, g, b, a) => {
      const d = Math.hypot((x - 315) / 40, (y - 562) / 46);
      if (d >= 1) return 0;
      const fade = Math.pow(1 - d, 0.85);
      return Math.round(a * fade);
    },
  },
  // SP4: 5-frame hollow electric cage (100% dummy-free interior, pure electric cage + orange shock sparks!)
  tesla_special4_cage: {
    fps: 15,
    boxes: [
      [344, 846, 576, 998],
      [584, 846, 754, 998],
      [760, 846, 970, 998],
      [974, 846, 1188, 998],
      [1190, 846, 1370, 998],
    ],
    dropOrphans: false,
    alphaTransform: (x, y, r, g, b, a) => {
      // Interior boxes [xMin, xMax, yMin, yMax] inside the cage bars where the dummy was drawn
      const interiors = [
        [344, 576, 405, 514, 874, 972],
        [584, 754, 626, 718, 874, 970],
        [760, 970, 814, 922, 874, 972],
        [974, 1188, 1024, 1138, 874, 972],
        [1190, 1370, 1226, 1334, 874, 972],
      ];
      let edgeFade = 1;
      if (y < 854) edgeFade *= Math.max(0, (y - 846) / 8);
      if (y > 990) edgeFade *= Math.max(0, (998 - y) / 8);

      for (const [bx1, bx2, ix1, ix2, iy1, iy2] of interiors) {
        if (x >= bx1 && x <= bx2) {
          if (x >= ix1 && x <= ix2 && y >= iy1 && y <= iy2) {
            // Preserve crisp warm orange/yellow shock sparks ONLY (strip white/grey dummy outlines)
            const isWarmZap = r > 175 && r - b >= 24 && r >= g;
            if (isWarmZap) return Math.round(a * edgeFade);
            return 0;
          }
          break;
        }
      }
      if (r < 60 && g < 110) return 0;
      return Math.round(a * edgeFade);
    },
  },
  // SP4: Pure orange/white electric shock zap spark (no grey dummy pixels!)
  tesla_special4_electric_damage: {
    fps: 15,
    boxes: [[1064, 924, 1110, 968]],
    dropOrphans: false,
    alphaTransform: (x, y, r, g, b, a) => {
      const isWarmZap = r > 170 && r > b + 20;
      if (!isWarmZap) return 0;
      const d = Math.hypot((x - 1087) / 21, (y - 946) / 20);
      if (d >= 1) return 0;
      return Math.round(a * Math.max(0, 1 - d * 0.3));
    },
  },
};

const fxPreview = [];
for (const [fxName, spec] of Object.entries(FX_SPECS)) {
  const frames = spec.boxes.map((b) => {
    const raw = extractTransparentBox(specialsBuf, b, {
      exclude: spec.exclude || null,
      alphaTransform: spec.alphaTransform || null,
      dropOrphans: spec.dropOrphans ?? false,
    });
    if (spec.postProcess) spec.postProcess(raw);
    return tightBoundsFromRgba(raw, 20);
  });
  const maxW = Math.max(...frames.map((f) => f.w));
  const maxH = Math.max(...frames.map((f) => f.h));
  const frameW = Math.ceil((maxW + 4) / 2) * 2;
  const frameH = Math.ceil((maxH + 4) / 2) * 2;
  const stripW = frameW * frames.length;
  const out = Buffer.alloc(stripW * frameH * 4, 0);

  frames.forEach((f, idx) => {
    const destX = idx * frameW + Math.floor((frameW - f.w) / 2);
    const destY = Math.floor((frameH - f.h) / 2);
    for (let sy = f.y1; sy <= f.y2; sy++) {
      for (let sx = f.x1; sx <= f.x2; sx++) {
        const si = (sy * f.bw + sx) * 4;
        const a = f.rgba[si + 3];
        if (a <= 14) continue;
        const dx = destX + (sx - f.x1);
        const dy = destY + (sy - f.y1);
        const di = (dy * stripW + dx) * 4;
        out[di] = f.rgba[si];
        out[di + 1] = f.rgba[si + 1];
        out[di + 2] = f.rgba[si + 2];
        out[di + 3] = a;
      }
    }
  });

  const outFile = `${fxName}.png`;
  writeRgbaPng(out, stripW, frameH, path.join(FX_DIR, outFile));
  manifest.fx[fxName] = {
    file: `/assets/tesla/fx/${outFile}`,
    frameWidth: frameW,
    frameHeight: frameH,
    frameCount: frames.length,
    fps: spec.fps,
  };
  fxPreview.push({ name: fxName, w: stripW, h: frameH, buf: out });
}

// Extract Portrait (`images__1__6246efc3.jpg` -> 240x240 square PNG)
execFileSync('convert', [
  SRC_PORTRAIT,
  '-resize',
  '240x240^',
  '-gravity',
  'center',
  '-extent',
  '240x240',
  path.join(OUT_DIR, 'portrait.png'),
]);

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Write visual contact sheets in .playwright-cli/
const sheetW = Math.max(960, ...previewRows.map((r) => r.w + 20));
const sheetH = previewRows.reduce((acc, r) => acc + r.h + 10, 20);
const sheet = Buffer.alloc(sheetW * sheetH * 4, 0);
for (let y = 0; y < sheetH; y++) {
  for (let x = 0; x < sheetW; x++) {
    const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 28 : 42;
    const i = (y * sheetW + x) * 4;
    sheet[i] = checker;
    sheet[i + 1] = checker + 4;
    sheet[i + 2] = checker + 14;
    sheet[i + 3] = 255;
  }
}
let curY = 10;
for (const row of previewRows) {
  for (let y = 0; y < row.h; y++) {
    for (let x = 0; x < Math.min(row.w, sheetW - 20); x++) {
      const si = (y * row.w + x) * 4;
      const a = row.buf[si + 3] / 255;
      if (a <= 0) continue;
      const di = ((curY + y) * sheetW + (10 + x)) * 4;
      sheet[di] = Math.round(row.buf[si] * a + sheet[di] * (1 - a));
      sheet[di + 1] = Math.round(row.buf[si + 1] * a + sheet[di + 1] * (1 - a));
      sheet[di + 2] = Math.round(row.buf[si + 2] * a + sheet[di + 2] * (1 - a));
    }
  }
  curY += row.h + 10;
}
fs.mkdirSync('.playwright-cli', { recursive: true });
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/tesla_anims_check.png');

const fxW = Math.max(960, ...fxPreview.map((r) => r.w + 20));
const fxH = fxPreview.reduce((acc, r) => acc + r.h + 12, 20);
const fxSheet = Buffer.alloc(fxW * fxH * 4, 0);
for (let y = 0; y < fxH; y++) {
  for (let x = 0; x < fxW; x++) {
    const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 28 : 42;
    const i = (y * fxW + x) * 4;
    fxSheet[i] = checker;
    fxSheet[i + 1] = checker + 4;
    fxSheet[i + 2] = checker + 14;
    fxSheet[i + 3] = 255;
  }
}
let fxY = 10;
for (const fx of fxPreview) {
  for (let y = 0; y < fx.h; y++) {
    for (let x = 0; x < Math.min(fx.w, fxW - 20); x++) {
      const si = (y * fx.w + x) * 4;
      const a = fx.buf[si + 3] / 255;
      if (a <= 0) continue;
      const di = ((fxY + y) * fxW + (10 + x)) * 4;
      fxSheet[di] = Math.round(fx.buf[si] * a + fxSheet[di] * (1 - a));
      fxSheet[di + 1] = Math.round(fx.buf[si + 1] * a + fxSheet[di + 1] * (1 - a));
      fxSheet[di + 2] = Math.round(fx.buf[si + 2] * a + fxSheet[di + 2] * (1 - a));
    }
  }
  fxY += fx.h + 12;
}
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/tesla_fx_check.png');

console.log(
  'Extracted Tesla:',
  Object.keys(SEQUENCES).length,
  'sequences,',
  Object.keys(FX_SPECS).length,
  'FX strips, and portrait.png'
);
