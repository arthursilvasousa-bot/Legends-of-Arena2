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
  // Dark low-saturation backdrop or deep dark teal border noise
  return maxc <= 36 && maxc - minc <= 18;
}

function extractSheet1Box(box, opts = {}) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const total = bw * bh;
  const rgba = new Uint8ClampedArray(total * 4);
  const fg = new Uint8Array(total);
  const bgMask = new Uint8Array(total);
  const { exclude = null, dropOrphans = 'bodyAndFx' } = opts;

  // Copy raw RGB inside box
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
    if (touchesBg && Math.max(r, g, b) < 58 && b >= r) {
      // Soft faint edge halo into transparent cyan/slate
      const lum = Math.max(r, g, b);
      if (lum < 38) {
        rgba[i4] = 0;
        rgba[i4 + 1] = 0;
        rgba[i4 + 2] = 0;
        rgba[i4 + 3] = 0;
      } else {
        rgba[i4 + 3] = Math.round(((lum - 38) / 20) * 210);
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
  const { exclude = null, keepOnly = null, dropOrphans = 'bodyAndFx' } = opts;

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (exclude && exclude(x, y)) continue;
      const [r, g, b, a] = getPx(buf, x, y);
      if (a <= 20) continue;
      if (exclude && exclude(x, y, r, g, b, a)) continue;
      if (keepOnly && !keepOnly(x, y, r, g, b, a)) continue;
      const idx = (y - y1) * bw + (x - x1);
      rgba[idx * 4] = r;
      rgba[idx * 4 + 1] = g;
      rgba[idx * 4 + 2] = b;
      rgba[idx * 4 + 3] = a;
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
    } else if (mode === 'bodyAndFx') {
      const touchesEdge = c.minLx <= 2 || c.maxLx >= bw - 3;
      const isBottomCornerClip = c.minLy >= bh * 0.55 && (c.minLx <= 20 || c.maxLx >= bw - 21) && c.count < 600;
      if (c.count < 14 || (touchesEdge && c.count < 280) || isBottomCornerClip) {
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
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      if (a > 160) {
        // Weight gold/orange armor & warm skin higher than cyan outer lightning aura
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

// Key out dark blue/black dummy silhouettes inside electric FX (Special 1 impact, Special 2 blast, Special 4 cages)
function isDarkDummyPixel(r, g, b) {
  const maxc = Math.max(r, g, b);
  return r < 45 && g < 85 && maxc < 145 && !(g > 110 && b > 160);
}

// =========================================================================
// POSE DEFINITIONS across Sheet 1, Guard Sheet, & Specials Sheet
// =========================================================================
const POSES = {};

// --- Sheet 1 Row 1: idle (4), walk_forward (6), walk_backward (6) ---
const s1R1Idle = [[24, 46, 109, 204], [122, 46, 203, 204], [206, 46, 301, 204], [303, 46, 392, 204]];
s1R1Idle.forEach((box, i) => (POSES[`idle_${i}`] = { src: 's1', box }));

const s1R1WalkF = [[468, 46, 553, 204], [554, 46, 642, 204], [645, 46, 728, 204], [734, 46, 826, 204], [835, 46, 908, 204], [910, 46, 1016, 204]];
s1R1WalkF.forEach((box, i) => (POSES[`walk_f_${i}`] = { src: 's1', box }));

const s1R1WalkB = [[1058, 46, 1136, 204], [1144, 46, 1216, 204], [1220, 46, 1296, 204], [1300, 46, 1378, 204], [1380, 46, 1447, 204], [1448, 46, 1524, 204]];
s1R1WalkB.forEach((box, i) => (POSES[`walk_b_${i}`] = { src: 's1', box }));

// --- Sheet 1 Row 2 (y >= 246 skips blue header underline cleanly): run_forward (7), run_backward (5), jump (5) ---
const s1R2RunF = [
  [10, 246, 113, 392],
  [120, 246, 215, 392],
  [217, 246, 319, 392],
  [321, 246, 417, 392],
  [419, 246, 509, 392],
  [511, 246, 603, 392],
  [605, 246, 695, 392],
];
s1R2RunF.forEach((box, i) => (POSES[`run_f_${i}`] = { src: 's1', box, dropOrphans: 'single' }));

const s1R2RunB = [
  [706, 246, 795, 392],
  [797, 246, 866, 392],
  [868, 246, 937, 392],
  [939, 246, 1007, 392],
  [1008, 246, 1076, 392],
];
s1R2RunB.forEach((box, i) => (POSES[`run_b_${i}`] = { src: 's1', box, dropOrphans: 'single' }));

const s1R2Jump = [
  [1082, 246, 1182, 392],
  [1183, 246, 1270, 392],
  [1272, 246, 1359, 392],
  [1361, 246, 1435, 392],
  [1448, 246, 1526, 392],
];
s1R2Jump.forEach((box, i) => (POSES[`jump_${i}`] = { src: 's1', box }));

// --- Sheet 1 Row 3 (y >= 431 skips header underline): jab (4), heavy_punch (4), front_kick (4), high_kick (4) ---
const s1R3Jab = [
  [8, 431, 98, 566],
  [100, 431, 197, 566],
  [199, 431, 269, 566],
  [269, 431, 383, 566],
];
s1R3Jab.forEach((box, i) => (POSES[`jab_${i}`] = { src: 's1', box }));

const s1R3HeavyP = [
  [386, 431, 485, 566],
  [485, 431, 565, 566],
  [565, 431, 653, 566],
  [653, 431, 735, 566],
];
s1R3HeavyP.forEach((box, i) => (POSES[`hpunch_${i}`] = { src: 's1', box }));

const s1R3FKick = [
  [757, 431, 841, 566],
  [844, 431, 933, 566],
  [934, 431, 1011, 566],
  [1018, 431, 1129, 566],
];
s1R3FKick.forEach((box, i) => (POSES[`fkick_${i}`] = { src: 's1', box }));

const s1R3HKick = [
  [1138, 431, 1229, 566],
  [1229, 431, 1294, 566],
  [1310, 431, 1409, 566],
  [1411, 431, 1513, 566],
];
s1R3HKick.forEach((box, i) => (POSES[`hkick_${i}`] = { src: 's1', box }));

// --- Sheet 1 Row 4 (y >= 596 skips header underline, y <= 737 trims divider line): block (4), low_block (3), crouch (3), victory (4) ---
const s1R4Block = [
  [12, 596, 102, 737],
  [112, 596, 195, 737],
  [208, 596, 291, 737],
  [300, 596, 386, 737],
];
s1R4Block.forEach((box, i) => (POSES[`block_${i}`] = { src: 's1', box }));

const s1R4LowBlock = [
  [422, 596, 522, 742],
  [526, 596, 613, 742],
  [619, 596, 720, 742],
];
s1R4LowBlock.forEach((box, i) => (POSES[`lblock_${i}`] = { src: 's1', box }));

const s1R4Crouch = [
  [746, 596, 840, 742],
  [854, 596, 947, 742],
  [958, 596, 1047, 742],
];
s1R4Crouch.forEach((box, i) => (POSES[`crouch_${i}`] = { src: 's1', box }));

const s1R4Victory = [
  [1068, 596, 1170, 742],
  [1180, 596, 1258, 742],
  [1276, 596, 1372, 742],
  [1398, 596, 1512, 742],
];
s1R4Victory.forEach((box, i) => (POSES[`victory_${i}`] = { src: 's1', box }));

// --- Guard Sheet (Herói Dourado em Guarda Pixelada, 8 high-res frames scaled proportionally at runtime) ---
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
guardBoxes.forEach((box, i) => (POSES[`guard_${i}`] = { src: 'guard', box }));

// --- Sheet 3 (Specials) Character poses ---
const sp1Char = [
  [12, 44, 110, 208],
  [115, 44, 212, 208],
  [215, 44, 312, 208],
  [313, 44, 395, 208],
  [408, 44, 513, 208],
  [513, 44, 619, 208],
  [622, 44, 728, 208],
];
sp1Char.forEach((box, i) => (POSES[`sp1_${i}`] = { src: 'sp', box }));

const sp2Char = [
  [10, 266, 106, 426],
  [108, 266, 202, 426],
  [203, 266, 300, 426],
  [301, 266, 390, 426],
  [391, 266, 514, 426],
  [516, 266, 626, 426],
  [626, 266, 730, 426],
  [802, 266, 918, 426],
  [918, 266, 1066, 426],
];
sp2Char.forEach((box, i) => (POSES[`sp2_${i}`] = { src: 'sp', box }));

const sp3Char = [
  [10, 484, 108, 642],
  [108, 484, 192, 642],
  [192, 484, 336, 642],
];
sp3Char.forEach((box, i) => (POSES[`sp3_${i}`] = { src: 'sp', box }));

const sp4Char = [
  [14, 702, 102, 845],
  [103, 702, 198, 845],
  [10, 846, 114, 998],
  [118, 846, 222, 998],
  [222, 846, 332, 998],
];
sp4Char.forEach((box, i) => (POSES[`sp4_${i}`] = { src: 'sp', box }));
POSES.sp4_end = {
  src: 'sp',
  box: [1372, 846, 1468, 998],
  // Exclude the "Gaiola Ativa" UI text card on the right cleanly
  exclude: (x, y) => x >= 1428 && y <= 955,
};

// =========================================================================
// EXTRACT & CACHE ALL POSES
// =========================================================================
const poseCache = {};
for (const [name, cfg] of Object.entries(POSES)) {
  let raw;
  const dropMode = cfg.dropOrphans || 'bodyAndFx';
  if (cfg.src === 's1') {
    raw = extractSheet1Box(cfg.box, { exclude: cfg.exclude, dropOrphans: dropMode });
  } else if (cfg.src === 'guard') {
    raw = extractTransparentBox(guardBuf, cfg.box, { exclude: cfg.exclude, dropOrphans: 'single' });
  } else {
    raw = extractTransparentBox(specialsBuf, cfg.box, { exclude: cfg.exclude, dropOrphans: dropMode });
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

  // Scale down guard_gold slightly in contact sheet so preview fits comfortably
  if (seqName !== 'tesla_guard_gold') {
    previewRows.push({ name: seqName, w: stripW, h: stripH, buf: out });
  }
}

// =========================================================================
// EXTRACT FX SPRITES & MULTI-FRAME FX STRIPS
// =========================================================================
const FX_SPECS = {
  // SP1: 4-frame electric ball projectile strip
  tesla_special1_projectile: {
    fps: 15,
    boxes: [
      [764, 72, 854, 178],
      [856, 72, 970, 178],
      [971, 72, 1094, 178],
      [1095, 58, 1252, 198],
    ],
    dropOrphans: false,
  },
  // SP1: Electric orb impact burst (outer starburst clean, inner dummy smoothly feathered out)
  tesla_special1_impact: {
    fps: 15,
    boxes: [[1248, 44, 1438, 208]],
    dropOrphans: false,
    exclude: (x, y, r, g, b) => isDarkDummyPixel(r, g, b),
    alphaTransform: (x, y, r, g, b, a) => {
      const dx = (x - 1360) / 42;
      const dy = (y - 156) / 52;
      const d = Math.hypot(dx, dy);
      if (d < 1.15 && !(r > 195 && g > 235)) {
        const t = Math.max(0, Math.min(1, (d - 0.65) / 0.5));
        return Math.round(a * t * t);
      }
      return a;
    },
  },
  // SP2: Electric punch shockwave burst (pure shockwave without fist or dummy)
  tesla_special2_knockback: {
    fps: 18,
    boxes: [[1074, 266, 1340, 426]],
    dropOrphans: false,
    exclude: (x, y, r, g, b) => x >= 1312 && isDarkDummyPixel(r, g, b),
  },
  // SP3: Continuous electric beam (pure 642px continuous lightning without any arrow illustrations)
  tesla_special3_beam: {
    fps: 15,
    boxes: [[336, 485, 978, 640]],
    dropOrphans: false,
  },
  // SP3: Clean reflection burst spark
  tesla_special3_reflection: {
    fps: 15,
    boxes: [[1142, 488, 1232, 524]],
    dropOrphans: false,
  },
  // SP4: 5-frame square electric cage (hollow center with orange electric shock sparks preserved, smoothly feathered cavity)
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
    exclude: (x, y, r, g, b) => isDarkDummyPixel(r, g, b),
    alphaTransform: (x, y, r, g, b, a) => {
      const interiors = [
        [344, 576, 460, 926, 54, 46],
        [584, 754, 673, 924, 38, 44],
        [760, 970, 868, 926, 48, 44],
        [974, 1188, 1082, 926, 50, 44],
        [1190, 1370, 1280, 926, 44, 44],
      ];
      for (const [bx1, bx2, cx, cy, rx, ry] of interiors) {
        if (x >= bx1 && x <= bx2) {
          const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
          if (d < 1.15) {
            const isWarmZap = r > 125 && r >= b * 0.72;
            if (isWarmZap) return a;
            const t = Math.max(0, Math.min(1, (d - 0.72) / 0.43));
            return Math.round(a * t * t);
          }
          break;
        }
      }
      return a;
    },
  },
  // SP4: Electric shock zap spark (bright orange/cyan zap from cage shock frame)
  tesla_special4_electric_damage: {
    fps: 15,
    boxes: [[1064, 924, 1110, 968]],
    dropOrphans: false,
    exclude: (x, y, r, g, b) => isDarkDummyPixel(r, g, b),
  },
};

const fxPreview = [];
for (const [fxName, spec] of Object.entries(FX_SPECS)) {
  const frames = spec.boxes.map((b) => {
    const raw = extractTransparentBox(specialsBuf, b, {
      exclude: spec.exclude || null,
      dropOrphans: spec.dropOrphans ?? false,
    });
    if (spec.alphaTransform) {
      const [bx1, by1] = b;
      for (let ly = 0; ly < raw.bh; ly++) {
        for (let lx = 0; lx < raw.bw; lx++) {
          const i = (ly * raw.bw + lx) * 4;
          const a = raw.rgba[i + 3];
          if (a === 0) continue;
          const na = spec.alphaTransform(bx1 + lx, by1 + ly, raw.rgba[i], raw.rgba[i + 1], raw.rgba[i + 2], a);
          raw.rgba[i + 3] = na;
          if (na === 0) {
            raw.rgba[i] = 0;
            raw.rgba[i + 1] = 0;
            raw.rgba[i + 2] = 0;
          }
        }
      }
    }
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
