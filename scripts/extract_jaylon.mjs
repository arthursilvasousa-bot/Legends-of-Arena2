import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Sprite_de_Anima__es_do_Jaylon_cdbe5554.png';
const OUT_DIR = 'public/assets/jaylon';
const ANIM_DIR = path.join(OUT_DIR, 'animations');
const FX_DIR = path.join(OUT_DIR, 'fx');

// Clean old stale files in public/assets/jaylon before writing organized folders
if (fs.existsSync(OUT_DIR)) {
  for (const entry of fs.readdirSync(OUT_DIR)) {
    const full = path.join(OUT_DIR, entry);
    fs.rmSync(full, { recursive: true, force: true });
  }
}
fs.mkdirSync(ANIM_DIR, { recursive: true });
fs.mkdirSync(FX_DIR, { recursive: true });

const W = 1536;
const H = 1024;
const srcRgba = execFileSync('convert', [SRC, '-depth', '8', 'rgba:-'], {
  maxBuffer: 64 * 1024 * 1024,
});

function getRgba(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0, 0];
  const i = (y * W + x) * 4;
  return [srcRgba[i], srcRgba[i + 1], srcRgba[i + 2], srcRgba[i + 3]];
}

// Exact purple title badges and "-25% Energia" callout rects (never clip adjacent hair/smoke)
const EXCLUDE_RECTS = [
  // Row 1 labels
  [7, 2, 110, 34],     // PARADO
  [376, 2, 444, 33],   // ANDAR
  [789, 2, 864, 33],   // CORRER
  [1203, 2, 1274, 33], // PULAR
  // Row 2 labels
  [7, 195, 90, 225],     // AGACHAR
  [330, 195, 424, 225],  // LEVANTAR
  [621, 195, 693, 224],  // DEFESA
  [915, 196, 970, 225],  // SOCO
  [1203, 196, 1267, 225],// CHUTE
  // Row 3 labels
  [7, 377, 62, 405],     // DANO
  [390, 377, 487, 403],  // ATORDOADO
  [659, 376, 764, 403],  // DERRUBADO
  [1075, 377, 1207, 403],// BEBER CERVEJA
  [1274, 377, 1403, 402],// FUMAR CIGARRO
  // Row 4 labels
  [6, 551, 240, 581],    // 1. LANCA CASCO DE CERVEJA
  [715, 552, 875, 581],  // 2. RESSACA BRABA
  // Row 5 labels
  [7, 705, 179, 736],    // 3. GOLE NA CERVEJA
  [446, 748, 524, 806],  // -25% Energia
  [645, 705, 750, 736],  // 4. MALBORO
  // Row 6 bottom card/portrait border zone (keep Row 5 clean above y=865)
];

function inExcludedLabel(x, y) {
  for (let i = 0; i < EXCLUDE_RECTS.length; i++) {
    const r = EXCLUDE_RECTS[i];
    if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
  }
  return false;
}

function isGreenVomit(r, g, b) {
  return (g > r + 10 && g > b + 28) || (g > 155 && r > 130 && b < 85 && g >= r - 12);
}

function isPurpleSmoke(r, g, b) {
  return b > r + 10 && b > g + 22 && r > 75 && g < 170;
}

function extractFrameRgba(box, opts = {}) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const total = bw * bh;
  const rgba = new Uint8ClampedArray(total * 4);
  const fg = new Uint8Array(total);
  const { exclude = null, dropOrphans = 'single', keepOnly = null } = opts;

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (inExcludedLabel(x, y)) continue;
      const [r, g, b, a] = getRgba(x, y);
      if (a <= 24) continue;
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

  if (dropOrphans) {
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
      if (dropOrphans === 'single') {
        for (const idx of c.pixels) {
          rgba[idx * 4] = 0;
          rgba[idx * 4 + 1] = 0;
          rgba[idx * 4 + 2] = 0;
          rgba[idx * 4 + 3] = 0;
        }
      } else if (dropOrphans === 'bodyAndFx') {
        // Keep detached stars/smoke/bottle near the character, drop tiny edge specks (< 12px) or far corner chips
        const nearEdge = c.minLx <= 1 || c.maxLx >= bw - 2;
        if (c.count < 12 || (nearEdge && c.count < 180)) {
          for (const idx of c.pixels) {
            rgba[idx * 4] = 0;
            rgba[idx * 4 + 1] = 0;
            rgba[idx * 4 + 2] = 0;
            rgba[idx * 4 + 3] = 0;
          }
        }
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
      if (rgba[(y * bw + x) * 4 + 3] > alphaThresh) {
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
        // Weight solid body (pink shirt, blue shorts, skin) heavier than overhead stars/smoke
        const isTopFx = y < y1 + (y2 - y1) * 0.25 && (b < 80 || (r > 160 && g > 160 && b > 160));
        cw += isTopFx ? 0.15 : 1;
      }
    }
    colWeights[x - x1] = cw;
  }

  const win = Math.min(44, w);
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

// All individual poses from Sprite_de_Anima__es_do_Jaylon_cdbe5554.png (1536x1024)
const POSES = {
  // ROW 1: PARADO (3), ANDAR (5), CORRER (4), PULAR (4)
  idle_0: { box: [24, 30, 128, 190] },
  idle_1: { box: [136, 18, 226, 190] },
  idle_2: { box: [236, 14, 338, 190] },

  walk_0: { box: [388, 32, 478, 190] },
  walk_1: { box: [482, 34, 558, 190] },
  walk_2: { box: [560, 32, 637, 190] },
  walk_3: { box: [638, 32, 699, 190] },
  walk_4: { box: [700, 32, 768, 190] },

  run_0: { box: [792, 32, 897, 190] },
  run_1: { box: [897, 32, 982, 190], exclude: (x, y) => x >= 975 && y >= 105 },
  run_2: {
    box: [976, 32, 1082, 190],
    exclude: (x, y) => (x <= 981 && y <= 105) || (x >= 1078 && y <= 105) || (x >= 1058 && y >= 106),
  },
  run_3: {
    box: [1058, 32, 1172, 190],
    exclude: (x, y) => x <= 1078 && y <= 104,
  },

  jump_0: { box: [1192, 50, 1278, 186] },
  jump_1: { box: [1284, 34, 1358, 184] },
  jump_2: { box: [1364, 28, 1435, 168] },
  jump_3: { box: [1443, 34, 1515, 176] },

  // ROW 2: AGACHAR (3), LEVANTAR (3), DEFESA (3), SOCO (3), CHUTE (3)
  crouch_0: { box: [10, 220, 126, 365] },
  crouch_1: { box: [129, 255, 238, 365] },
  crouch_2: { box: [239, 255, 323, 365] },

  standup_0: { box: [334, 220, 424, 370] },
  standup_1: { box: [432, 225, 518, 370] },
  standup_2: { box: [526, 212, 604, 370] },

  block_0: { box: [620, 220, 725, 370] },
  block_1: { box: [726, 220, 820, 370] },
  block_2: { box: [822, 220, 905, 370] },

  punch_0: { box: [906, 224, 995, 370] },
  punch_1: {
    box: [998, 224, 1077, 370],
    exclude: (x, y) => x >= 1072 && y >= 330,
  },
  punch_2: {
    box: [1070, 224, 1198, 370],
    exclude: (x, y) => x <= 1076 && y <= 290,
  },

  kick_0: { box: [1206, 220, 1309, 370] },
  kick_1: { box: [1312, 226, 1448, 373] },
  kick_2: { box: [1449, 220, 1522, 370] },

  // ROW 3: DANO (3), ATORDOADO (3), DERRUBADO (4), BEBER CERVEJA (2), FUMAR CIGARRO (3)
  damage_0: { box: [6, 405, 108, 546] },
  damage_1: { box: [112, 402, 223, 546] },
  damage_2: { box: [224, 402, 322, 546] },

  stun_0: { box: [348, 404, 445, 546], dropOrphans: 'bodyAndFx' },
  stun_1: { box: [452, 402, 538, 546], dropOrphans: 'bodyAndFx' },
  stun_2: { box: [539, 402, 636, 546], dropOrphans: 'bodyAndFx' },

  down_0: { box: [648, 445, 740, 548] },
  down_1: { box: [742, 475, 836, 548] },
  down_2: {
    box: [838, 490, 965, 548],
    exclude: (x, y) => (x >= 962 && y >= 524) || (x >= 964 && y >= 505),
  },
  down_3: {
    box: [961, 495, 1066, 548],
    exclude: (x, y) => (x <= 964 && y <= 523) || (x <= 959 && y >= 524),
  },

  drink_0: { box: [1076, 406, 1168, 553] },
  drink_1: { box: [1171, 406, 1252, 553] },

  smoke_0: { box: [1272, 406, 1356, 553] },
  smoke_1: { box: [1365, 382, 1451, 553], dropOrphans: 'bodyAndFx' },
  smoke_2: { box: [1452, 382, 1528, 553], dropOrphans: 'bodyAndFx' },

  // ROW 4: 1. LANCA CASCO DE CERVEJA (5), 2. RESSACA BRABA (standing gag/vomit cleanly without puddle)
  casco_0: { box: [8, 581, 110, 703] },
  casco_1: { box: [111, 581, 232, 703] },
  casco_2: { box: [236, 580, 328, 703], dropOrphans: 'bodyAndFx' },
  casco_3: {
    box: [330, 581, 413, 704],
    exclude: (x, y) => x >= 412 && y >= 635,
  },
  casco_4: {
    box: [412, 581, 522, 704],
    exclude: (x, y) => x <= 413 && y <= 658,
  },

  vomit_0: { box: [735, 582, 842, 707] },
  // Extract Jaylon leaning/vomiting cleanly WITHOUT any green vomit stream or floor puddle attached!
  vomit_1: {
    box: [845, 582, 956, 707],
    exclude: (x, y, r, g, b) => {
      // Exclude forward vomit fountain & puddle completely
      if (x >= 942 && y >= 620) return true;
      if (x >= 908 && y >= 688) return true;
      // Remove all lime/olive/green vomit droplets & splatters around torso/legs/floor
      if (
        y >= 622 &&
        x >= 878 &&
        (isGreenVomit(r, g, b) || (g > r + 4 && g > b + 12) || (g > 110 && g > b + 20 && r < 220))
      ) {
        return true;
      }
      return false;
    },
  },

  // Opponent / victim slipping frames (cleanly separated from green floor puddle if ever referenced)
  slip_0: {
    box: [1006, 616, 1158, 706],
    exclude: (x, y, r, g, b) => y >= 686 && isGreenVomit(r, g, b),
  },
  slip_1: {
    box: [1170, 620, 1336, 706],
    exclude: (x, y, r, g, b) => y >= 686 && isGreenVomit(r, g, b),
  },

  // ROW 5: 3. GOLE NA CERVEJA (5 frames), 4. MALBORO (5 frames)
  gole_0: { box: [14, 735, 120, 864] },
  gole_1: { box: [121, 735, 226, 864] },
  gole_2: { box: [230, 722, 330, 864] },
  gole_3: { box: [338, 735, 438, 864] },
  gole_4: { box: [532, 720, 640, 864], dropOrphans: 'bodyAndFx' },

  malboro_0: { box: [646, 735, 754, 864] },
  malboro_1: { box: [764, 735, 855, 864] },
  malboro_2: { box: [864, 735, 993, 864], dropOrphans: 'bodyAndFx' },
  malboro_3: { box: [994, 735, 1113, 864], dropOrphans: 'bodyAndFx' },
  malboro_4: {
    box: [1114, 735, 1218, 864],
    exclude: (x, y, r, g, b) => {
      // Cut purple smoke plume cleanly while keeping Jaylon's face & white cigarette (x <= 1212, y=775..788)
      if (x >= 1208 && y <= 776) return true;
      if (x >= 1208 && y >= 787) return true;
      if (x >= 1208 && isPurpleSmoke(r, g, b)) return true;
      if (x >= 1213) return true;
      return false;
    },
  },
};

const SEQUENCES = {
  idle: { fps: 6, loop: true, alignMode: 'feet', frames: ['idle_0', 'idle_1', 'idle_2', 'idle_1'] },
  walk: { fps: 10, loop: true, alignMode: 'feet', frames: ['walk_0', 'walk_1', 'walk_2', 'walk_3', 'walk_4'] },
  run: { fps: 13, loop: true, alignMode: 'feet', frames: ['run_0', 'run_1', 'run_2', 'run_3'] },
  jump: { fps: 10, loop: false, alignMode: 'center', frames: ['jump_0', 'jump_1', 'jump_2', 'jump_3'] },
  crouch: { fps: 12, loop: false, alignMode: 'feet', frames: ['crouch_0', 'crouch_1', 'crouch_2'] },
  standup: { fps: 12, loop: false, alignMode: 'feet', frames: ['standup_0', 'standup_1', 'standup_2'] },
  block: { fps: 10, loop: true, alignMode: 'feet', frames: ['block_0', 'block_1', 'block_2'] },
  roll: { fps: 12, loop: true, alignMode: 'feet', frames: ['crouch_1', 'crouch_2', 'standup_0'] },
  punch: { fps: 14, loop: false, alignMode: 'feet', frames: ['punch_0', 'punch_1', 'punch_2'] },
  kick: { fps: 13, loop: false, alignMode: 'feet', frames: ['kick_0', 'kick_1', 'kick_2'] },
  heavy_punch: { fps: 13, loop: false, alignMode: 'feet', frames: ['punch_0', 'casco_2', 'punch_2'] },
  heavy_kick: { fps: 12, loop: false, alignMode: 'feet', frames: ['kick_0', 'kick_1', 'kick_2'] },
  grab: { fps: 12, loop: false, alignMode: 'feet', frames: ['punch_1', 'punch_2'] },
  throw: { fps: 12, loop: false, alignMode: 'feet', frames: ['casco_2', 'casco_3'] },
  damage: { fps: 10, loop: false, alignMode: 'feet', frames: ['damage_0', 'damage_1', 'damage_2'] },
  stun: { fps: 6, loop: true, alignMode: 'feet', frames: ['stun_0', 'stun_1', 'stun_2'] },
  knockdown: { fps: 10, loop: false, alignMode: 'feet', frames: ['down_0', 'down_1', 'down_2', 'down_3'] },
  getup: { fps: 10, loop: false, alignMode: 'feet', frames: ['standup_0', 'standup_1', 'standup_2'] },
  drink: { fps: 6, loop: false, alignMode: 'feet', frames: ['drink_0', 'drink_1'] },
  smoke: { fps: 8, loop: false, alignMode: 'feet', frames: ['smoke_0', 'smoke_1', 'smoke_2'] },
  special_bottle: { fps: 13, loop: false, alignMode: 'feet', frames: ['casco_0', 'casco_1', 'casco_2', 'casco_3', 'casco_4'] },
  special_vomit: { fps: 8, loop: false, alignMode: 'feet', frames: ['vomit_0', 'vomit_1', 'vomit_1'] },
  special_drink: { fps: 7, loop: false, alignMode: 'feet', frames: ['gole_0', 'gole_1', 'gole_2', 'gole_3', 'gole_4'] },
  special_malboro: { fps: 9, loop: false, alignMode: 'feet', frames: ['malboro_0', 'malboro_1', 'malboro_2', 'malboro_3', 'malboro_4'] },
  victory: { fps: 6, loop: false, alignMode: 'feet', frames: ['drink_0', 'drink_1', 'smoke_1', 'idle_0'] },
};

function writeRgbaPng(rgba, width, height, outPath) {
  execFileSync(
    'convert',
    ['-size', `${width}x${height}`, '-depth', '8', 'rgba:-', outPath],
    { input: rgba, maxBuffer: 32 * 1024 * 1024 }
  );
}

const poseCache = {};
for (const [poseName, cfg] of Object.entries(POSES)) {
  const raw = extractFrameRgba(cfg.box, {
    exclude: cfg.exclude || null,
    dropOrphans: cfg.dropOrphans || 'single',
    keepOnly: cfg.keepOnly || null,
  });
  const f = tightBoundsFromRgba(raw, 24);
  const fy = footBottomY(f);
  const bcx = bodyCenterX(f);
  poseCache[poseName] = {
    ...f,
    footY: fy,
    bodyCenterX: bcx,
    leftReach: bcx - f.x1,
    rightReach: f.x2 - bcx,
  };
}

const manifest = {
  source: SRC,
  sequences: {},
  fx: {},
  portrait: '/assets/jaylon/portrait.png',
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
    file: `/assets/jaylon/animations/${outFile}`,
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

// Separated FX Sprites (never merged into character sprites)
const FX_SPECS = {
  // Spinning flying brown beer bottle with golden motion arc (Row 6 bottom-left FX)
  fx_jaylon_bottle_spin: {
    box: [674, 932, 754, 992],
    dropOrphans: false,
    exclude: (x, y) => x <= 710 && y <= 940,
  },
  // Impact bottle shatter + yellow stars (Row 4 right of Casco)
  fx_jaylon_bottle_impact: {
    box: [548, 578, 700, 682],
    dropOrphans: false,
  },
  // Stun stars cluster (Row 6 yellow stars above/right of bottle, excluding top line and bottle glow)
  fx_jaylon_stun_stars: {
    box: [722, 874, 836, 956],
    dropOrphans: false,
    exclude: (x, y) => (x <= 764 && y >= 922) || y <= 875,
  },
  // Separated green vomit stream fountain (Row 4 Ressaca Braba frame 1 stream only, no Jaylon body!)
  fx_jaylon_vomit_stream: {
    box: [936, 622, 1018, 707],
    dropOrphans: false,
    keepOnly: (x, y, r, g, b) => isGreenVomit(r, g, b) || (x >= 954 && g > 120 && r > 90 && b < 95),
  },
  // Separated green bubbling vomit puddle for arena floor (Row 6 puddle, clean)
  fx_jaylon_vomit_puddle: {
    box: [1004, 958, 1216, 1006],
    dropOrphans: false,
    keepOnly: (x, y, r, g, b) => isGreenVomit(r, g, b) || y >= 968,
  },
  // Single cohesive gray cigarette smoke cloud (Row 6 middle-left cloud, clean)
  fx_jaylon_smoke: {
    box: [840, 892, 890, 1002],
    dropOrphans: false,
  },
  // Malboro frontal purple smoke + flame blast (Row 5 right of Jaylon frame 5)
  fx_jaylon_fire_breath: {
    box: [1206, 734, 1532, 866],
    dropOrphans: false,
    exclude: (x, y, r, g, b) => {
      if (x <= 1218 && y >= 818) return true;
      if (x <= 1213 && !isPurpleSmoke(r, g, b) && !(r > 150 && g > 90 && b > 170)) return true;
      return false;
    },
  },
  // Fireball impact burst (Row 6 starburst flame)
  fx_jaylon_fire_burst: {
    box: [1220, 878, 1324, 996],
    dropOrphans: false,
  },
};

const fxPreview = [];
for (const [fxName, cfg] of Object.entries(FX_SPECS)) {
  const raw = extractFrameRgba(cfg.box, {
    exclude: cfg.exclude || null,
    dropOrphans: cfg.dropOrphans ?? false,
    keepOnly: cfg.keepOnly || null,
  });
  const tight = tightBoundsFromRgba(raw, 20);
  const fw = tight.w;
  const fh = tight.h;
  const out = Buffer.alloc(fw * fh * 4, 0);
  for (let sy = tight.y1; sy <= tight.y2; sy++) {
    for (let sx = tight.x1; sx <= tight.x2; sx++) {
      const si = (sy * tight.bw + sx) * 4;
      const di = ((sy - tight.y1) * fw + (sx - tight.x1)) * 4;
      out[di] = tight.rgba[si];
      out[di + 1] = tight.rgba[si + 1];
      out[di + 2] = tight.rgba[si + 2];
      out[di + 3] = tight.rgba[si + 3];
    }
  }
  const outFile = `${fxName}.png`;
  writeRgbaPng(out, fw, fh, path.join(FX_DIR, outFile));
  manifest.fx[fxName] = {
    file: `/assets/jaylon/fx/${outFile}`,
    width: fw,
    height: fh,
  };
  fxPreview.push({ name: fxName, w: fw, h: fh, buf: out });
}

// Extract clean original Portrait from Row 6 bottom-left inside its inner frame ([13..166, 874..1008])
const px1 = 13;
const py1 = 874;
const px2 = 166;
const py2 = 1008;
const pw = px2 - px1 + 1;
const ph = py2 - py1 + 1;
const pSize = 240;
const pRaw = Buffer.alloc(pw * ph * 4, 0);
for (let sy = 0; sy < ph; sy++) {
  for (let sx = 0; sx < pw; sx++) {
    const [r, g, b, a] = getRgba(px1 + sx, py1 + sy);
    const af = a / 255;
    const di = (sy * pw + sx) * 4;
    pRaw[di] = Math.round(r * af + 20 * (1 - af));
    pRaw[di + 1] = Math.round(g * af + 10 * (1 - af));
    pRaw[di + 2] = Math.round(b * af + 28 * (1 - af));
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
    '-filter',
    'Point',
    '-resize',
    `${pSize}x${pSize}^`,
    '-gravity',
    'center',
    '-extent',
    `${pSize}x${pSize}`,
    path.join(OUT_DIR, 'portrait.png'),
  ],
  { input: pRaw, maxBuffer: 32 * 1024 * 1024 }
);

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Write visual verification contact sheets in .playwright-cli/
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
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/jaylon_extracted_check.png');

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
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/jaylon_fx_check.png');

console.log(
  'Extracted Jaylon:',
  Object.keys(SEQUENCES).length,
  'sequences,',
  Object.keys(FX_SPECS).length,
  'FX, and portrait.png'
);
