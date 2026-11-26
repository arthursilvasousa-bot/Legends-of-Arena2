import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/image_a40a2383.png';
const OUT_DIR = 'public/assets/minotaur_wallace';
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1024;
const H = 765;
const srcBuf = execFileSync('convert', [SRC, '-depth', '8', 'rgb:-'], {
  maxBuffer: 32 * 1024 * 1024,
});

function getRgb(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0];
  const i = (y * W + x) * 3;
  return [srcBuf[i], srcBuf[i + 1], srcBuf[i + 2]];
}

// Neutral gray checkerboard detection (calibrated for Minotaur sheet: dark ~76..90, light ~114..126)
function isCheckerGray(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  return diff <= 14 && max >= 58 && max <= 134;
}

// Exact header text & panel border rectangles [x1, y1, x2, y2] to erase cleanly
const LABEL_RECTS = [
  // Row 1 sub-labels
  [218, 25, 434, 52],   // PARADO
  [434, 25, 639, 52],   // ANDAR
  [639, 25, 862, 52],   // CORRER
  [862, 25, 1020, 49],  // PULAR
  // Row 2 sub-labels
  [218, 150, 375, 177], // AGACHAR
  [375, 150, 520, 177], // LEVANTAR
  [520, 150, 640, 177], // DEFESA
  [640, 150, 744, 177], // ROLAR
  [744, 150, 891, 177], // QUEDA
  [891, 150, 1020, 177],// LEVANTAR DO CHÃO
  // Row 3 sub-labels
  [5, 281, 200, 304],   // SOCO
  [200, 281, 365, 304], // CHUTE
  [365, 281, 530, 304], // SOCO FORTE
  [530, 281, 712, 304], // CHUTE FORTE
  [712, 281, 854, 304], // AGARRÃO
  [854, 281, 1020, 300],// ARREMESSO (lifted boulder reaches y~290 at x=940..970, handled below)
  // Row 4 special labels
  [5, 407, 313, 430],   // INVESTIDA BRUTAL (R)
  [313, 407, 571, 428], // PISÃO SÍSMICO (T)
  [571, 407, 774, 426], // CHIFRADA DEVASTADORA (Y)
  [774, 407, 1020, 429],// ARREMESSO DO COLISEU (U)
  // Row 5 label
  [5, 511, 508, 532],   // CORTE FANTASMA (U)
  // Row 6 label
  [5, 600, 508, 623],   // FINALIZAÇÃO - FÚRIA DA ARENA
];

function inLabelRect(x, y) {
  // Preserve lifted stone in ARREMESSO frame 2
  if (x >= 936 && x <= 972 && y >= 285 && y <= 304) return false;
  for (let i = 0; i < LABEL_RECTS.length; i++) {
    const r = LABEL_RECTS[i];
    if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
  }
  return false;
}

function extractFrameRgba(box, excludeFn = null, dropOrphans = true, glowZoneFn = null) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const total = bw * bh;
  const bgMask = new Uint8Array(total);
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

  // 1. Exterior BFS flood fill from all 4 borders & excluded pixels
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

  // 2. Clean enclosed checkerboard pockets (between legs, horns, tail, arms)
  const visited = new Uint8Array(total);
  const compQueue = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    if (bgMask[i] || visited[i]) continue;
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min > 11 || max < 66 || max > 128) continue;

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
        if (nmax - nmin <= 11 && nmax >= 64 && nmax <= 128) {
          visited[n] = 1;
          compQueue[ct++] = n;
        }
      }
    }
    if (ct >= 6) {
      for (let k = 0; k < ct; k++) {
        bgMask[compQueue[k]] = 1;
      }
    }
  }

  // 2b. Drop tiny orphan fragments near edges (panel frame remnants / text tips)
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
      let minLx = bw;
      let maxLx = 0;
      while (ch < ct) {
        const cur = fgQueue[ch++];
        const cx = cur % bw;
        const cy = (cur - cx) / bw;
        if (cy < minLy) minLy = cy;
        if (cy > maxLy) maxLy = cy;
        if (cx < minLx) minLx = cx;
        if (cx > maxLx) maxLx = cx;
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
      if (ct < 38 && (minLy <= 8 || maxLy >= bh - 4 || minLx <= 1 || maxLx >= bw - 2)) {
        for (let k = 0; k < ct; k++) {
          bgMask[fgQueue[k]] = 1;
        }
      }
    }
  }

  // 3. Apply alpha & clean checkerboard edge fringe
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
      if (max <= 122 && diff <= 18) {
        rgba[i * 4 + 3] = 0;
      } else {
        const signal = Math.max(max - 98, warmth * 1.15 - 14);
        if (signal <= 0) {
          rgba[i * 4 + 3] = 0;
        } else {
          const alpha = Math.max(0, Math.min(255, Math.round((signal / 138) * 255)));
          const aNorm = Math.max(0.28, alpha / 255);
          rgba[i * 4] = Math.max(0, Math.min(255, Math.round((r - 92 * (1 - aNorm)) / aNorm)));
          rgba[i * 4 + 1] = Math.max(0, Math.min(255, Math.round((g - 92 * (1 - aNorm)) / aNorm)));
          rgba[i * 4 + 2] = Math.max(0, Math.min(255, Math.round((b - 92 * (1 - aNorm)) / aNorm)));
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
      if (diff <= 15 && max >= 52 && max <= 134) {
        rgba[i * 4] = 0;
        rgba[i * 4 + 1] = 0;
        rgba[i * 4 + 2] = 0;
        rgba[i * 4 + 3] = 0;
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
      const isDustGlow = a < 210 && r > 140 && g > 110 && r - b > 35;
      if (a > 165 && !isDustGlow) opaque++;
    }
    if (opaque >= 3) return y;
  }
  return y2;
}

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
        const isBrightFx = r > 180 && g > 130 && b < 110 && r - b > 65;
        colWeight += isBrightFx ? 0.25 : 1;
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
    fps: 7,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [223, 52, 274, 145] },
      { box: [275, 52, 324, 145] },
      { box: [326, 52, 376, 145] },
      { box: [377, 52, 428, 145] },
    ],
  },
  walk: {
    fps: 10,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [438, 52, 491, 145] },
      { box: [491, 52, 540, 145] },
      { box: [542, 52, 590, 145] },
      { box: [590, 52, 634, 145] },
    ],
  },
  run: {
    fps: 14,
    loop: true,
    alignMode: 'row_top',
    frames: [
      { box: [644, 52, 705, 145], exclude: (x, y) => x >= 701 && y >= 116 },
      { box: [704, 52, 767, 145], exclude: (x, y) => x <= 706 && y <= 104 },
      { box: [767, 52, 816, 145] },
      { box: [816, 52, 858, 145] },
    ],
  },
  jump: {
    fps: 12,
    loop: false,
    alignMode: 'center',
    frames: [
      { box: [869, 49, 914, 145] },
      { box: [915, 49, 962, 145] },
      { box: [964, 49, 1011, 145] },
    ],
  },
  crouch: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [223, 174, 274, 252] },
      { box: [276, 174, 322, 252] },
      { box: [323, 174, 370, 252] },
    ],
  },
  standup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [381, 174, 427, 252] },
      { box: [428, 174, 476, 252] },
      { box: [478, 174, 515, 252] },
    ],
  },
  block: {
    fps: 10,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [524, 174, 561, 252] },
      { box: [562, 174, 598, 252] },
      { box: [600, 174, 634, 252] },
    ],
  },
  roll: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [643, 174, 691, 252] },
      { box: [692, 174, 739, 252] },
    ],
  },
  knockdown: {
    fps: 8,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [748, 174, 819, 252] },
      { box: [820, 174, 888, 252] },
    ],
  },
  getup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [897, 174, 943, 252] },
      { box: [943, 174, 979, 252] },
      { box: [981, 174, 1015, 252] },
    ],
  },
  punch: {
    fps: 14,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [9, 304, 56, 381] },
      { box: [56, 304, 113, 381], exclude: (x, y) => x <= 59 && y >= 342 },
      { box: [113, 304, 195, 381], exclude: (x, y) => x <= 116 && y >= 338 },
    ],
  },
  kick: {
    fps: 14,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [205, 304, 245, 381] },
      { box: [248, 304, 309, 381], exclude: (x, y) => x >= 298 && y <= 338 },
      { box: [298, 304, 358, 381], exclude: (x, y) => x <= 306 && y >= 342 },
    ],
  },
  heavy_punch: {
    fps: 11,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [369, 304, 410, 381] },
      { box: [410, 304, 466, 381] },
      { box: [468, 304, 524, 381] },
    ],
  },
  heavy_kick: {
    fps: 11,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [535, 304, 579, 381] },
      { box: [579, 304, 639, 381] },
      { box: [641, 304, 702, 381] },
    ],
  },
  grab: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [730, 304, 790, 381] },
      { box: [793, 304, 842, 381] },
    ],
  },
  throw: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [872, 304, 932, 381] },
      { box: [933, 285, 984, 381] },
    ],
  },
  // 4 Official Minotaur Wallace Specials
  special_brutal_rush: {
    fps: 14,
    loop: false,
    alignMode: 'feet',
    // Sequence: crouch windup -> rushing horn ram (no dummy victim or rectangular dust patch) -> heavy follow-through
    frames: [
      { box: [11, 430, 70, 507] },
      { box: [704, 52, 767, 145], exclude: (x, y) => x <= 706 && y <= 104 },
      {
        box: [182, 428, 248, 507],
        exclude: (x, y) => {
          if (x >= 247) return true;
          if (x <= 185 && y >= 470) return true;
          const [r, g, b] = getRgb(x, y);
          // Strip bright beige rectangular dust cloud & speed-line box behind rushing body, keep dark brown minotaur & hooves
          const isPaleDust = r > 128 && g > 110 && b > 82 && r - b <= 54;
          if (isPaleDust && (x <= 205 || y >= 490 || y <= 445)) return true;
          return false;
        },
        glowZone: (x, y) => x <= 198 && y <= 468,
      },
      { box: [223, 52, 274, 145] },
    ],
  },
  special_seismic_stomp: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    // Sequence: brace -> raised rear leg -> violent ground stomp (strip wide pale dust triangle) -> recovery
    frames: [
      { box: [322, 430, 377, 507] },
      { box: [915, 49, 962, 145] },
      {
        box: [420, 424, 498, 505],
        exclude: (x, y) => {
          if (y >= 484 && (x <= 434 || x >= 478)) return true;
          const [r, g, b] = getRgb(x, y);
          const isPaleDust = r > 142 && g > 122 && b > 92 && r - b <= 58;
          if (isPaleDust && y >= 472) return true;
          return false;
        },
        dropOrphans: false,
      },
      { box: [322, 430, 377, 507] },
    ],
  },
  special_devastating_horn: {
    fps: 14,
    loop: false,
    alignMode: 'feet',
    // Sequence: low lean -> violent upward horn gore + golden arc (dummy victim on far right excluded) -> follow-through
    frames: [
      { box: [586, 428, 659, 507] },
      {
        box: [659, 424, 725, 507],
        exclude: (x) => x >= 724,
        glowZone: (x) => x >= 698,
        dropOrphans: false,
      },
      { box: [118, 532, 175, 593] },
    ],
  },
  special_coliseum_throw: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    // Sequence: lunge grab -> grip -> overhead lift -> brutal downward slam
    frames: [
      { box: [816, 428, 873, 507], exclude: (x) => x >= 872 },
      { box: [872, 304, 932, 381] },
      { box: [933, 285, 984, 381] },
      { box: [176, 532, 238, 593] },
    ],
  },
  // Finisher: Fúria da Arena (5 frames)
  finisher: {
    fps: 8,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [8, 624, 88, 739], dropOrphans: false },
      { box: [91, 624, 168, 739], dropOrphans: false },
      { box: [171, 624, 247, 739], dropOrphans: false },
      { box: [248, 621, 366, 739], dropOrphans: false, glowZone: (x, y) => y >= 682 && (x <= 278 || x >= 332) },
      { box: [368, 621, 497, 739], dropOrphans: false },
    ],
  },
  // Victory: plays once at match end ending in triumphant roaring pose
  victory: {
    fps: 8,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [8, 624, 88, 739], dropOrphans: false },
      { box: [91, 624, 168, 739], dropOrphans: false },
      { box: [171, 624, 247, 739], dropOrphans: false },
      { box: [248, 621, 366, 739], dropOrphans: false, glowZone: (x, y) => y >= 682 && (x <= 278 || x >= 332) },
      { box: [368, 621, 497, 739], dropOrphans: false },
    ],
  },
};

// 6 Visual Effects boxes inside EFEITOS VISUAIS (SPRITES EXTRAS)
const FX_BOXES = {
  fx_minotaur_earth_impact: { box: [522, 570, 620, 645], mode: 'solid_checker' },
  fx_minotaur_shockwave: { box: [626, 570, 718, 645], mode: 'glow' },
  fx_minotaur_dust_trail: { box: [723, 570, 821, 645], mode: 'dust' },
  fx_minotaur_sparks: { box: [522, 668, 620, 747], mode: 'glow' },
  fx_minotaur_rocks: { box: [626, 668, 718, 747], mode: 'solid_checker' },
  fx_minotaur_fury_aura: { box: [723, 668, 821, 747], mode: 'aura' },
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
    file: `/assets/minotaur_wallace/${outFile}`,
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

// Extract the 6 FX sprites
const fxPreview = [];
for (const [fxName, cfg] of Object.entries(FX_BOXES)) {
  let outBuf;
  let fw;
  let fh;

  if (cfg.mode === 'solid_checker') {
    const raw = extractFrameRgba(cfg.box, null, false, null);
    const tight = tightBoundsFromRgba(raw, 20);
    fw = tight.w;
    fh = tight.h;
    outBuf = Buffer.alloc(fw * fh * 4, 0);
    for (let sy = tight.y1; sy <= tight.y2; sy++) {
      for (let sx = tight.x1; sx <= tight.x2; sx++) {
        const si = (sy * raw.bw + sx) * 4;
        const di = ((sy - tight.y1) * fw + (sx - tight.x1)) * 4;
        outBuf[di] = raw.rgba[si];
        outBuf[di + 1] = raw.rgba[si + 1];
        outBuf[di + 2] = raw.rgba[si + 2];
        outBuf[di + 3] = raw.rgba[si + 3];
      }
    }
  } else {
    const [x1, y1, x2, y2] = cfg.box;
    const bw = x2 - x1 + 1;
    const bh = y2 - y1 + 1;
    const rawRgba = new Uint8ClampedArray(bw * bh * 4);
    for (let sy = y1; sy <= y2; sy++) {
      for (let sx = x1; sx <= x2; sx++) {
        const [r, g, b] = getRgb(sx, sy);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const warmth = Math.max(0, r - b);

        // For fury aura, strip dark interior Minotaur silhouette so only fiery red-orange aura remains
        if (cfg.mode === 'aura') {
          if (max <= 120 && diff <= 26) continue;
          if (r < 125 && warmth < 40) continue;
          // Erase dark silhouette interior around center
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2 + 4;
          const dx = (sx - cx) / 20;
          const dy = (sy - cy) / 26;
          if (dx * dx + dy * dy < 0.9 && r < 175) continue;
        } else {
          if (max <= 122 && diff <= 18) continue;
        }

        const signal =
          cfg.mode === 'dust'
            ? Math.max(max - 108, warmth * 1.4 - 10)
            : cfg.mode === 'aura'
            ? Math.max(warmth * 1.35 - 24, max - 118)
            : Math.max(max - 104, warmth * 1.25 - 12);
        if (signal <= 0) continue;

        const alpha = Math.max(0, Math.min(255, Math.round((signal / 128) * 255)));
        if (alpha <= 14) continue;

        const aNorm = Math.max(0.28, alpha / 255);
        const nr = Math.max(0, Math.min(255, Math.round((r - 92 * (1 - aNorm)) / aNorm)));
        const ng = Math.max(0, Math.min(255, Math.round((g - 92 * (1 - aNorm)) / aNorm)));
        const nb = Math.max(0, Math.min(255, Math.round((b - 92 * (1 - aNorm)) / aNorm)));

        const di = ((sy - y1) * bw + (sx - x1)) * 4;
        rawRgba[di] = nr;
        rawRgba[di + 1] = ng;
        rawRgba[di + 2] = nb;
        rawRgba[di + 3] = alpha;
      }
    }
    const tight = tightBoundsFromRgba({ bw, bh, rgba: rawRgba }, 16);
    fw = tight.w;
    fh = tight.h;
    outBuf = Buffer.alloc(fw * fh * 4, 0);
    for (let sy = tight.y1; sy <= tight.y2; sy++) {
      for (let sx = tight.x1; sx <= tight.x2; sx++) {
        const si = (sy * bw + sx) * 4;
        const di = ((sy - tight.y1) * fw + (sx - tight.x1)) * 4;
        outBuf[di] = rawRgba[si];
        outBuf[di + 1] = rawRgba[si + 1];
        outBuf[di + 2] = rawRgba[si + 2];
        outBuf[di + 3] = rawRgba[si + 3];
      }
    }
  }

  const outFile = `${fxName}.png`;
  writeRgbaPng(outBuf, fw, fh, path.join(OUT_DIR, outFile));
  manifest.fx[fxName] = {
    file: `/assets/minotaur_wallace/${outFile}`,
    width: fw,
    height: fh,
  };
  fxPreview.push({ name: fxName, w: fw, h: fh, buf: outBuf });
}

// Extract Portrait bust above "MINOTAURO (WALLACE)" text cleanly over dark coliseum radial gradient (zero baked checker)
const px1 = 8;
const py1 = 6;
const pw = 194;
const ph = 180;
const pSize = 240;
const portraitFg = extractFrameRgba([px1, py1, px1 + pw - 1, py1 + ph - 1], null, false, null);
const pRaw = Buffer.alloc(pw * ph * 4, 0);
for (let sy = 0; sy < ph; sy++) {
  for (let sx = 0; sx < pw; sx++) {
    const dx = (sx - pw * 0.5) / (pw * 0.55);
    const dy = (sy - ph * 0.42) / (ph * 0.58);
    const radial = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
    const bgR = Math.round(18 + radial * 54);
    const bgG = Math.round(10 + radial * 24);
    const bgB = Math.round(12 + radial * 14);
    const si = (sy * portraitFg.bw + sx) * 4;
    const a = portraitFg.rgba[si + 3] / 255;
    const di = (sy * pw + sx) * 4;
    pRaw[di] = Math.round(portraitFg.rgba[si] * a + bgR * (1 - a));
    pRaw[di + 1] = Math.round(portraitFg.rgba[si + 1] * a + bgG * (1 - a));
    pRaw[di + 2] = Math.round(portraitFg.rgba[si + 2] * a + bgB * (1 - a));
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
manifest.portrait = '/assets/minotaur_wallace/portrait.png';

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Contact sheets for visual verification
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
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/minotaur_extracted_check.png');

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
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/minotaur_fx_check.png');

console.log(
  'Extracted Minotaur Wallace!',
  Object.keys(SEQUENCES).length,
  'sequences and',
  Object.keys(FX_BOXES).length,
  'FX'
);
