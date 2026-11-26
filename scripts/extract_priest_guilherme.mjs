import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Gemini_Generated_Image_7164wp7164wp7164_78803b75.jpeg';
const OUT_DIR = 'public/assets/priest_guilherme';
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1264;
const H = 843;
const srcBuf = execFileSync('convert', [SRC, '-depth', '8', 'rgb:-'], {
  maxBuffer: 32 * 1024 * 1024,
});

function getRgb(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0];
  const i = (y * W + x) * 3;
  return [srcBuf[i], srcBuf[i + 1], srcBuf[i + 2]];
}

// Neutral gray checkerboard detection (JPEG baked tiles ~68..94 plus edge tolerance)
function isCheckerGray(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  return diff <= 14 && max >= 44 && max <= 112;
}

// Exact header text rectangles [x1, y1, x2, y2] to erase cleanly before flood-fill
const LABEL_RECTS = [
  // Row 1 sub-labels
  [265, 30, 320, 61],   // PARADO (Idle)
  [516, 30, 562, 61],   // ANDAR (Walk)
  [780, 30, 822, 61],   // CORRER (Run)
  [1060, 30, 1108, 62], // PULAR (Jump)
  // Row 2 sub-labels
  [265, 164, 330, 195], // AGACHAR (Crouch)
  [425, 164, 496, 195], // LEVANTAR (Stand Up)
  [591, 164, 650, 195], // DEFESA (Block)
  [780, 164, 830, 195], // ROLAR (Roll)
  [957, 164, 1035, 195], // QUEDA (Knockdown)
  [1118, 164, 1232, 195], // LEVANTAR DO CHÃO (Get Up)
  // Row 3 labels
  [10, 316, 62, 350],   // SOCO (Punch)
  [237, 316, 286, 350], // CHUTE (Kick)
  [451, 316, 534, 349], // SOCO FORTE (Heavy Punch)
  [653, 316, 738, 349], // CHUTE FORTE (Heavy Kick)
  [856, 316, 922, 349], // AGARRÃO (Grab)
  [1060, 316, 1136, 348], // ARREMESSO (Throw)
  // Row 4 special titles (all end by y=471)
  [10, 454, 124, 472],   // FLECHA DIVINA (R)
  [372, 454, 502, 472],  // ESCUDO SAGRADO (T)
  [693, 454, 856, 472],  // MARTELO CELESTIAL (Y)
  [996, 454, 1138, 472], // EXPLOSÃO SAGRADA (U)
];

function inLabelRect(x, y) {
  for (let i = 0; i < LABEL_RECTS.length; i++) {
    const r = LABEL_RECTS[i];
    if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
  }
  return false;
}

/**
 * Extract a clean RGBA buffer for a single frame box [x1, y1, x2, y2],
 * stripping the baked checkerboard background via exterior flood-fill + interior pocket cleanup.
 */
function extractFrameRgba(box, excludeFn = null, dropOrphans = true, glowZoneFn = null) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const total = bw * bh;
  const bgMask = new Uint8Array(total); // 1 = erased background
  const rgba = new Uint8ClampedArray(total * 4);

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      const idx = (y - y1) * bw + (x - x1);
      if (inLabelRect(x, y) || (excludeFn && excludeFn(x, y))) {
        bgMask[idx] = 1;
        continue;
      }
      const [r, g, b] = getRgb(x, y);
      rgba[idx * 4] = r;
      rgba[idx * 4 + 1] = g;
      rgba[idx * 4 + 2] = b;
      rgba[idx * 4 + 3] = 255;
    }
  }

  // 1. Exterior BFS flood fill from all 4 borders (and excluded boundary pixels)
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const trySeed = (lx, ly) => {
    if (lx < 0 || ly < 0 || lx >= bw || ly >= bh) return;
    const idx = ly * bw + lx;
    if (bgMask[idx]) return;
    const r = rgba[idx * 4];
    const g = rgba[idx * 4 + 1];
    const b = rgba[idx * 4 + 2];
    if (isCheckerGray(r, g, b)) {
      bgMask[idx] = 1;
      queue[tail++] = idx;
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
  // Also seed adjacent to excluded pixels
  for (let ly = 0; ly < bh; ly++) {
    for (let lx = 0; lx < bw; lx++) {
      const idx = ly * bw + lx;
      if (!bgMask[idx]) continue;
      trySeed(lx - 1, ly);
      trySeed(lx + 1, ly);
      trySeed(lx, ly - 1);
      trySeed(lx, ly + 1);
    }
  }

  while (head < tail) {
    const idx = queue[head++];
    const lx = idx % bw;
    const ly = (idx - lx) / bw;
    if (lx > 0) trySeed(lx - 1, ly);
    if (lx + 1 < bw) trySeed(lx + 1, ly);
    if (ly > 0) trySeed(lx, ly - 1);
    if (ly + 1 < bh) trySeed(lx, ly + 1);
  }

  // 2. Clean enclosed checkerboard pockets (between legs, between staff & robe, inside shield rings)
  const visited = new Uint8Array(total);
  const compQueue = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    if (bgMask[i] || visited[i]) continue;
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min > 15 || max < 54 || max > 108) continue;

    let ch = 0;
    let ct = 0;
    visited[i] = 1;
    compQueue[ct++] = i;
    while (ch < ct) {
      const cur = compQueue[ch++];
      const cx = cur % bw;
      const cy = (cur - cx) / bw;
      const neighbors = [
        cx > 0 ? cur - 1 : -1,
        cx + 1 < bw ? cur + 1 : -1,
        cy > 0 ? cur - bw : -1,
        cy + 1 < bh ? cur + bw : -1,
      ];
      for (const n of neighbors) {
        if (n < 0 || bgMask[n] || visited[n]) continue;
        const nr = rgba[n * 4];
        const ng = rgba[n * 4 + 1];
        const nb = rgba[n * 4 + 2];
        const nmax = Math.max(nr, ng, nb);
        const nmin = Math.min(nr, ng, nb);
        if (nmax - nmin <= 15 && nmax >= 52 && nmax <= 110) {
          visited[n] = 1;
          compQueue[ct++] = n;
        }
      }
    }
    if (ct >= 2) {
      for (let k = 0; k < ct; k++) {
        bgMask[compQueue[k]] = 1;
      }
    }
  }

  // 2b. Drop tiny orphan foreground specks disconnected from the main body (e.g. text/border lint)
  if (dropOrphans) {
    const fgVisited = new Uint8Array(total);
    const fgQueue = new Int32Array(total);
    for (let i = 0; i < total; i++) {
      if (bgMask[i] || fgVisited[i]) continue;
      let ch = 0;
      let ct = 0;
      fgVisited[i] = 1;
      fgQueue[ct++] = i;
      let minLy = bh;
      let maxLy = 0;
      while (ch < ct) {
        const cur = fgQueue[ch++];
        const cx = cur % bw;
        const cy = (cur - cx) / bw;
        if (cy < minLy) minLy = cy;
        if (cy > maxLy) maxLy = cy;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
            const n = ny * bw + nx;
            if (!bgMask[n] && !fgVisited[n]) {
              fgVisited[n] = 1;
              fgQueue[ct++] = n;
            }
          }
        }
      }
      // Small stray fragments (text ascenders/descenders or frame corners)
      if (ct < 45 && (minLy <= 12 || maxLy >= bh - 6)) {
        for (let k = 0; k < ct; k++) {
          bgMask[fgQueue[k]] = 1;
        }
      }
    }
  }

  // 3. Apply transparency + soften warm golden glow / neutral JPEG edge fringe
  for (let i = 0; i < total; i++) {
    if (bgMask[i]) {
      rgba[i * 4] = 0;
      rgba[i * 4 + 1] = 0;
      rgba[i * 4 + 2] = 0;
      rgba[i * 4 + 3] = 0;
      continue;
    }

    const lx = i % bw;
    const ly = (i - lx) / bw;
    const touchesBg =
      (lx > 0 && bgMask[i - 1]) ||
      (lx + 1 < bw && bgMask[i + 1]) ||
      (ly > 0 && bgMask[i - bw]) ||
      (ly + 1 < bh && bgMask[i + bw]);

    const sx = x1 + lx;
    const sy = y1 + ly;
    if (glowZoneFn && glowZoneFn(sx, sy)) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      const warmth = Math.max(0, r - b);
      if (max <= 104 && diff <= 24) {
        rgba[i * 4 + 3] = 0;
      } else {
        const signal = Math.max(max - 94, warmth * 1.15 - 14);
        if (signal <= 0) {
          rgba[i * 4 + 3] = 0;
        } else {
          const alpha = Math.max(0, Math.min(255, Math.round((signal / 142) * 255)));
          const aNorm = Math.max(0.25, alpha / 255);
          rgba[i * 4] = Math.max(0, Math.min(255, Math.round((r - 82 * (1 - aNorm)) / aNorm)));
          rgba[i * 4 + 1] = Math.max(0, Math.min(255, Math.round((g - 82 * (1 - aNorm)) / aNorm)));
          rgba[i * 4 + 2] = Math.max(0, Math.min(255, Math.round((b - 82 * (1 - aNorm)) / aNorm)));
          rgba[i * 4 + 3] = alpha;
        }
      }
      continue;
    }

    if (touchesBg) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      // Neutral gray edge pixel leaked through anti-aliasing
      if (diff <= 16 && max >= 42 && max <= 116) {
        rgba[i * 4] = 0;
        rgba[i * 4 + 1] = 0;
        rgba[i * 4 + 2] = 0;
        rgba[i * 4 + 3] = 0;
      } else if (r > b && r - b < 34 && max < 130) {
        // Soften outer golden halo pixels blending into former gray checkerboard
        rgba[i * 4 + 3] = Math.max(30, Math.min(255, Math.round(((r - b - 6) / 28) * 235)));
      }
    }
  }

  return { bw, bh, rgba };
}

function tightBoundsFromRgba(frame, alphaThresh = 24) {
  const { bw, bh, rgba } = frame;
  let minX = bw;
  let minY = bh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const a = rgba[(y * bw + x) * 4 + 3];
      if (a > alphaThresh) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { ...frame, x1: 0, y1: 0, x2: bw - 1, y2: bh - 1, w: bw, h: bh };
  return {
    ...frame,
    x1: minX,
    y1: minY,
    x2: maxX,
    y2: maxY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function footBottomY(f) {
  const { bw, rgba, x1, y1, x2, y2 } = f;
  for (let y = y2; y >= y1; y--) {
    let opaque = 0;
    for (let x = x1; x <= x2; x++) {
      const idx = (y * bw + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      // Ignore pure golden spark pixels at very bottom, prioritize solid boot/robe pixels
      const isSoftSpark = a < 210 && r > 180 && g > 130 && b < 90;
      if (a > 160 && !isSoftSpark) opaque++;
    }
    if (opaque >= 3) return y;
  }
  return y2;
}

// Find horizontal center of Guilherme's solid body core (ignoring wide golden beams/shields/staff tips)
function bodyCenterX(f) {
  const { bw, rgba, x1, y1, x2, y2 } = f;
  const w = x2 - x1 + 1;
  const colWeights = new Array(w).fill(0);
  for (let x = x1; x <= x2; x++) {
    let colWeight = 0;
    for (let y = y1; y <= y2; y++) {
      const idx = (y * bw + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      if (a > 190) {
        // Bright saturated gold/yellow FX weighs less than solid white vestments & dark armor/skin
        const isBrightGoldGlow = r > 185 && g > 130 && b < 95 && r - b > 95;
        colWeight += isBrightGoldGlow ? 0.22 : 1;
      }
    }
    colWeights[x - x1] = colWeight;
  }

  const win = Math.min(28, w);
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

const SEQUENCES = {
  idle: {
    fps: 8,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [265, 57, 317, 150] },
      { box: [318, 57, 373, 150] },
      { box: [376, 57, 434, 150] },
      { box: [435, 57, 496, 150] },
    ],
  },
  walk: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [516, 57, 575, 150] },
      { box: [576, 57, 631, 150] },
      { box: [632, 57, 689, 150] },
      { box: [690, 57, 754, 150] },
    ],
  },
  run: {
    fps: 16,
    loop: true,
    alignMode: 'row_top',
    frames: [
      { box: [780, 58, 843, 150] },
      { box: [843, 58, 922, 150] },
      { box: [922, 58, 983, 150] },
      { box: [983, 58, 1042, 150] },
    ],
  },
  jump: {
    fps: 12,
    loop: false,
    alignMode: 'center',
    frames: [
      { box: [1060, 52, 1116, 150] },
      { box: [1120, 52, 1185, 150], exclude: (x, y) => x >= 1180 && y >= 106 },
      { box: [1182, 52, 1252, 150], exclude: (x, y) => x <= 1190 && y <= 98 },
    ],
  },
  crouch: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [265, 196, 314, 279] },
      { box: [315, 196, 359, 279] },
      { box: [360, 196, 412, 279] },
    ],
  },
  standup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [425, 195, 479, 279], exclude: (x, y) => x >= 471 && y >= 248 },
      { box: [471, 195, 522, 279], exclude: (x, y) => (x <= 478 && y <= 238) || (x >= 518 && y >= 248) },
      { box: [518, 195, 574, 279], exclude: (x, y) => x <= 523 && y <= 235 },
    ],
  },
  block: {
    fps: 10,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [591, 195, 650, 279] },
      { box: [653, 195, 707, 279] },
      { box: [708, 195, 762, 279] },
    ],
  },
  roll: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [779, 196, 847, 279] },
      { box: [847, 196, 913, 279] },
      { box: [913, 196, 944, 279] },
    ],
  },
  knockdown: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [957, 196, 1025, 279] },
      { box: [1025, 196, 1102, 279] },
    ],
  },
  getup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1118, 195, 1166, 279] },
      { box: [1166, 195, 1215, 279] },
      { box: [1215, 195, 1253, 279] },
    ],
  },
  punch: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [12, 344, 68, 417] },
      { box: [70, 344, 118, 417] },
      { box: [119, 344, 169, 417] },
      { box: [170, 344, 225, 417] },
    ],
  },
  kick: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [238, 344, 285, 417] },
      { box: [288, 344, 355, 417], exclude: (x, y) => x >= 338 && y <= 362 },
      { box: [338, 344, 434, 417], exclude: (x, y) => x <= 358 && y >= 362 },
    ],
  },
  heavy_punch: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [452, 344, 504, 417] },
      { box: [504, 344, 577, 417] },
      { box: [577, 344, 642, 417] },
    ],
  },
  heavy_kick: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [654, 344, 704, 417] },
      { box: [704, 344, 755, 417] },
      { box: [755, 336, 842, 417] },
    ],
  },
  staff_attack: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [452, 344, 504, 417] },
      { box: [577, 344, 642, 417] },
      { box: [857, 344, 938, 417] },
    ],
  },
  staff_slam: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [857, 344, 938, 417] },
      { box: [694, 474, 767, 549] },
      { box: [836, 474, 912, 549] },
    ],
  },
  grab: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [857, 344, 938, 417] },
      { box: [942, 344, 987, 417] },
      { box: [987, 344, 1038, 417] },
    ],
  },
  throw: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    // Exclude the thrown dummy opponent on the right/upper-right of ARREMESSO
    frames: [
      { box: [1061, 346, 1138, 417] },
      {
        box: [1142, 338, 1190, 417],
        exclude: (x, y) => (x >= 1179 && y <= 363) || (x >= 1148 && y <= 347),
      },
    ],
  },
  special_holy_beam: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [12, 473, 80, 549] },
      { box: [80, 473, 144, 549] },
      { box: [148, 473, 200, 549] },
      { box: [202, 473, 358, 549], glowZone: (x) => x >= 254 },
    ],
  },
  special_holy_shield: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [373, 473, 434, 549] },
      { box: [435, 473, 495, 549] },
      { box: [495, 473, 579, 549], glowZone: (x) => x >= 534 },
      { box: [579, 473, 678, 549], glowZone: (x) => x >= 632 },
    ],
  },
  special_celestial_hammer: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [694, 474, 767, 549] },
      { box: [767, 474, 836, 549] },
      { box: [836, 474, 911, 549] },
      { box: [911, 474, 984, 549], glowZone: (x) => x >= 954 },
    ],
  },
  special_holy_explosion: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [997, 474, 1075, 549] },
      { box: [1075, 468, 1151, 549], glowZone: (x) => x >= 1118 },
      { box: [1151, 466, 1252, 549], glowZone: (x) => x >= 1192 },
    ],
  },
  finisher: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [10, 594, 80, 689], dropOrphans: false },
      { box: [88, 594, 148, 689], dropOrphans: false },
      { box: [154, 594, 228, 689], dropOrphans: false },
      { box: [234, 594, 305, 689], dropOrphans: false },
      { box: [305, 594, 379, 689], dropOrphans: false },
      { box: [379, 594, 456, 689], dropOrphans: false },
      { box: [10, 715, 96, 821], dropOrphans: false },
      { box: [96, 715, 186, 821], dropOrphans: false },
      { box: [186, 715, 290, 821], dropOrphans: false },
      { box: [290, 715, 464, 821], dropOrphans: false, glowZone: (x) => x >= 342 },
      { box: [465, 715, 558, 821], dropOrphans: false },
    ],
  },
  victory: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [10, 715, 96, 821], dropOrphans: false },
      { box: [96, 715, 186, 821], dropOrphans: false },
      { box: [186, 715, 290, 821], dropOrphans: false },
      { box: [478, 715, 558, 821], dropOrphans: false, exclude: (x, y) => x >= 544 && y >= 808 },
    ],
  },
};

const FX_BOXES = {
  fx_priest_holy_beam: { box: [582, 609, 684, 693], removeCenterSilhouette: false },
  fx_priest_holy_shield: { box: [700, 609, 789, 693], removeCenterSilhouette: false },
  fx_priest_celestial_hammer: { box: [806, 609, 897, 693], removeCenterSilhouette: false },
  fx_priest_holy_explosion: { box: [913, 609, 1033, 693], removeCenterSilhouette: false },
  fx_priest_light_pillar: { box: [582, 722, 684, 824], removeCenterSilhouette: false },
  fx_priest_particles: { box: [700, 722, 789, 824], removeCenterSilhouette: false },
  fx_priest_holy_sigil: { box: [806, 722, 897, 824], removeCenterSilhouette: false },
  fx_priest_golden_aura: { box: [913, 722, 1033, 824], removeCenterSilhouette: true },
};

function writeRgbaPng(rgba, width, height, outPath) {
  execFileSync(
    'convert',
    ['-size', `${width}x${height}`, '-depth', '8', 'rgba:-', outPath],
    { input: rgba, maxBuffer: 32 * 1024 * 1024 }
  );
}

const manifest = {
  sequences: {},
  fx: {},
};

const previewRows = [];

for (const [seqName, seq] of Object.entries(SEQUENCES)) {
  const frames = seq.frames.map(({ box, exclude, dropOrphans = true, glowZone = null }) => {
    const raw = extractFrameRgba(box, exclude || null, dropOrphans, glowZone);
    const f = tightBoundsFromRgba(raw, 26);
    const fy = footBottomY(f);
    const bcx = bodyCenterX(f);
    return {
      ...f,
      footY: fy,
      bodyCenterX: bcx,
      leftReach: bcx - f.x1,
      rightReach: f.x2 - bcx,
    };
  });

  const maxLeftReach = Math.max(...frames.map((f) => f.leftReach)) + 4;
  const maxRightReach = Math.max(...frames.map((f) => f.rightReach)) + 4;
  const frameW = Math.ceil((maxLeftReach + maxRightReach) / 2) * 2;
  const anchorX = maxLeftReach;

  let frameH;
  let anchorY;
  const rowMinY = Math.min(...frames.map((f) => f.y1));

  if (seq.alignMode === 'row_top') {
    const maxRelBottom = Math.max(...frames.map((f) => f.y2 - rowMinY));
    frameH = Math.ceil((maxRelBottom + 6) / 2) * 2;
    const groundedFoot = Math.max(...frames.slice(0, 3).map((f) => f.footY - rowMinY));
    anchorY = 3 + groundedFoot;
  } else {
    const maxAboveFoot = Math.max(...frames.map((f) => f.footY - f.y1));
    const maxBelowFoot = Math.max(...frames.map((f) => f.y2 - f.footY));
    frameH = Math.ceil((maxAboveFoot + maxBelowFoot + 6) / 2) * 2;
    anchorY = frameH - 3 - maxBelowFoot;
  }

  const stripW = frameW * frames.length;
  const stripH = frameH;
  const out = Buffer.alloc(stripW * stripH * 4, 0);

  frames.forEach((f, idx) => {
    const destXStart = idx * frameW + (anchorX - f.leftReach);
    let destYStart;
    if (seq.alignMode === 'center') {
      destYStart = Math.floor((frameH - f.h) / 2);
    } else if (seq.alignMode === 'row_top') {
      destYStart = 3 + (f.y1 - rowMinY);
    } else {
      destYStart = anchorY - (f.footY - f.y1);
    }

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
  writeRgbaPng(out, stripW, stripH, path.join(OUT_DIR, outFile));
  manifest.sequences[seqName] = {
    file: `/assets/priest_guilherme/${outFile}`,
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

// Extract luminous golden FX sprites cleanly with smooth glow transparency
const fxPreview = [];
for (const [fxName, cfg] of Object.entries(FX_BOXES)) {
  const [x1, y1, x2, y2] = cfg.box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const rawRgba = new Uint8ClampedArray(bw * bh * 4);

  for (let sy = y1; sy <= y2; sy++) {
    for (let sx = x1; sx <= x2; sx++) {
      let [r, g, b] = getRgb(sx, sy);

      // For GOLDEN_AURA, remove the central warrior silhouette smoothly via alpha fade (preserving bright gold ring)
      let extraFade = 1;
      if (cfg.removeCenterSilhouette && sy >= 746 && sy <= 818 && sx >= 948 && sx <= 1012) {
        const dx = (sx - 979) / 25;
        const dy = (sy - 783) / 33;
        const r2 = dx * dx + dy * dy;
        if (r2 < 1.28) {
          const maxC = Math.max(r, g, b);
          const warmC = r - b;
          if (maxC < 175 || warmC < 26 || r2 < 0.78 || (sy >= 804 && sx >= 954 && sx <= 1004 && maxC < 210)) {
            continue;
          }
          extraFade = Math.max(0, Math.min(1, (r2 - 0.78) / 0.5));
        }
      }

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      const warmth = Math.max(0, r - b);

      // Erase baked checkerboard tiles & warm-tinted checkerboard haze completely
      if (max <= 104 && diff <= 24) continue;

      const signal = Math.max(max - 94, warmth * 1.15 - 14);
      if (signal <= 0) continue;

      const alpha = Math.max(0, Math.min(255, Math.round((signal / 142) * 255 * extraFade)));
      if (alpha <= 14) continue;

      // Un-blend light against baked gray ~82 so translucent glow has pure luminous gold RGB (zero dark blotches)
      const aNorm = Math.max(0.25, alpha / 255);
      const nr = Math.max(0, Math.min(255, Math.round((r - 82 * (1 - aNorm)) / aNorm)));
      const ng = Math.max(0, Math.min(255, Math.round((g - 82 * (1 - aNorm)) / aNorm)));
      const nb = Math.max(0, Math.min(255, Math.round((b - 82 * (1 - aNorm)) / aNorm)));

      const di = ((sy - y1) * bw + (sx - x1)) * 4;
      rawRgba[di] = nr;
      rawRgba[di + 1] = ng;
      rawRgba[di + 2] = nb;
      rawRgba[di + 3] = alpha;
    }
  }

  const tight = tightBoundsFromRgba({ bw, bh, rgba: rawRgba }, 16);
  const fw = tight.w;
  const fh = tight.h;
  const out = Buffer.alloc(fw * fh * 4, 0);
  for (let sy = tight.y1; sy <= tight.y2; sy++) {
    for (let sx = tight.x1; sx <= tight.x2; sx++) {
      const si = (sy * bw + sx) * 4;
      const di = ((sy - tight.y1) * fw + (sx - tight.x1)) * 4;
      out[di] = rawRgba[si];
      out[di + 1] = rawRgba[si + 1];
      out[di + 2] = rawRgba[si + 2];
      out[di + 3] = rawRgba[si + 3];
    }
  }

  const outFile = `${fxName}.png`;
  writeRgbaPng(out, fw, fh, path.join(OUT_DIR, outFile));
  manifest.fx[fxName] = {
    file: `/assets/priest_guilherme/${outFile}`,
    width: fw,
    height: fh,
  };
  fxPreview.push({ name: fxName, w: fw, h: fh, buf: out });
}

// Extract clean Guilherme Portrait bust above "GUILHERME (SACERDOTE)" text (x: 8..244, y: 8..224 -> centered 240x240)
const px1 = 8;
const py1 = 8;
const pw = 236;
const ph = 216;
const pSize = 240;
const pRaw = Buffer.alloc(pw * ph * 4, 0);
for (let sy = 0; sy < ph; sy++) {
  for (let sx = 0; sx < pw; sx++) {
    const [r, g, b] = getRgb(px1 + sx, py1 + sy);
    const di = (sy * pw + sx) * 4;
    pRaw[di] = r;
    pRaw[di + 1] = g;
    pRaw[di + 2] = b;
    pRaw[di + 3] = 255;
  }
}
execFileSync(
  'convert',
  [
    '-size',
    `${pw}x${ph}`,
    '-depth',
    '8',
    'rgba:-',
    '-resize',
    `${pSize}x${pSize}^`,
    '-gravity',
    'north',
    '-extent',
    `${pSize}x${pSize}`,
    path.join(OUT_DIR, 'portrait.png'),
  ],
  { input: pRaw, maxBuffer: 32 * 1024 * 1024 }
);
manifest.portrait = '/assets/priest_guilherme/portrait.png';

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Contact sheet for animation strips
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
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/priest_extracted_check.png');

// Contact sheet for FX sprites
const fxW = fxPreview.reduce((acc, r) => acc + r.w + 16, 16);
const fxH = Math.max(...fxPreview.map((r) => r.h)) + 20;
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
let fxX = 10;
for (const fx of fxPreview) {
  for (let y = 0; y < fx.h; y++) {
    for (let x = 0; x < fx.w; x++) {
      const si = (y * fx.w + x) * 4;
      const a = fx.buf[si + 3] / 255;
      if (a <= 0) continue;
      const di = ((10 + y) * fxW + (fxX + x)) * 4;
      fxSheet[di] = Math.round(fx.buf[si] * a + fxSheet[di] * (1 - a));
      fxSheet[di + 1] = Math.round(fx.buf[si + 1] * a + fxSheet[di + 1] * (1 - a));
      fxSheet[di + 2] = Math.round(fx.buf[si + 2] * a + fxSheet[di + 2] * (1 - a));
    }
  }
  fxX += fx.w + 16;
}
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/priest_fx_check.png');

console.log(
  'Extracted Priest Guilherme!',
  Object.keys(SEQUENCES).length,
  'sequences and',
  Object.keys(FX_BOXES).length,
  'FX'
);
