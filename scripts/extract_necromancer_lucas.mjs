import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Spritesheet_de_Necromante_Sombrio_e_Magias_Roxas_48cad68f.png';
const OUT_DIR = 'public/assets/necromancer_lucas';
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1536;
const H = 1024;
const srcBuf = execFileSync('convert', [SRC, '-depth', '8', 'rgba:-'], {
  maxBuffer: 64 * 1024 * 1024,
});

function getRgba(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0, 0];
  const i = (y * W + x) * 4;
  return [srcBuf[i], srcBuf[i + 1], srcBuf[i + 2], srcBuf[i + 3]];
}

// Exact label pill bounding boxes [x1, y1, x2, y2] to erase cleanly while preserving tall staves/flames beside them
const LABEL_RECTS = [
  // Row 1-3 labels sit completely above sprite bands
  [0, 0, 1535, 37],
  [0, 166, 1535, 203],
  [0, 322, 1535, 355],
  // Row 4 labels (right-bounded so tall staves/flames beside them are untouched)
  [6, 480, 252, 509],    // R - ESFERA DAS TREVAS (15 FPS)
  [778, 483, 1012, 513], // T - MÃOS DO SUBMUNDO (15 FPS)
  // Row 5 labels
  [6, 622, 255, 650],    // Y - EXÉRCITO ESPECTRAL (15 FPS)
  [778, 628, 1012, 656], // U - TELEPORTE SOMBRIO (15 FPS)
  // Row 6 labels
  [6, 772, 291, 801],    // FINALIZAÇÃO - RITUAL DA MORTE (10 FPS)
  // FX labels
  [1098, 772, 1535, 819],
  [1098, 915, 1535, 938],
];

function inLabelRect(x, y) {
  for (let i = 0; i < LABEL_RECTS.length; i++) {
    const r = LABEL_RECTS[i];
    if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) return true;
  }
  return false;
}

function extractFrameRgba(box, excludeFn = null) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const rgba = new Uint8ClampedArray(bw * bh * 4);

  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (inLabelRect(x, y) || (excludeFn && excludeFn(x, y))) continue;
      const [r, g, b, a] = getRgba(x, y);
      if (a <= 4) continue;
      const idx = ((y - y1) * bw + (x - x1)) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  return { bw, bh, rgba };
}

function scaleFrameRgba(frame, scale) {
  if (Math.abs(scale - 1) < 0.001) return frame;
  const nw = Math.max(1, Math.round(frame.bw * scale));
  const nh = Math.max(1, Math.round(frame.bh * scale));
  const scaled = execFileSync(
    'convert',
    ['-size', `${frame.bw}x${frame.bh}`, '-depth', '8', 'rgba:-', '-resize', `${nw}x${nh}!`, '-depth', '8', 'rgba:-'],
    { input: Buffer.from(frame.rgba), maxBuffer: 32 * 1024 * 1024 }
  );
  return { bw: nw, bh: nh, rgba: new Uint8ClampedArray(scaled) };
}

function tightBoundsFromRgba(frame, alphaThresh = 20) {
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
    let solid = 0;
    for (let x = x1; x <= x2; x++) {
      const idx = (y * bw + x) * 4;
      const a = rgba[idx + 3];
      if (a > 120) solid++;
    }
    if (solid >= 3) return y;
  }
  return y2;
}

// Find horizontal center of Lucas's solid body core (ignoring luminous purple spells/staff tips)
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
      if (a > 170) {
        // Luminous violet magic weighs less than Lucas's dark armor & crimson robes
        const isBrightVioletGlow = b > 140 && r > 90 && g < 110;
        colWeight += isBrightVioletGlow ? 0.25 : 1;
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
    fps: 6,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [10, 38, 99, 165] },
      { box: [100, 38, 174, 165] },
      { box: [175, 38, 244, 165] },
      { box: [245, 38, 312, 165] },
    ],
  },
  walk: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [317, 38, 382, 165] },
      { box: [383, 38, 454, 165] },
      { box: [456, 38, 536, 165] },
      { box: [539, 38, 612, 165] },
    ],
  },
  run: {
    fps: 16,
    loop: true,
    alignMode: 'row_top',
    frames: [
      { box: [623, 38, 722, 165] },
      { box: [723, 38, 812, 165] },
      { box: [813, 38, 903, 165] },
    ],
  },
  jump: {
    fps: 12,
    loop: false,
    alignMode: 'center',
    frames: [
      { box: [915, 38, 1015, 165] },
      { box: [1029, 38, 1120, 165] },
    ],
  },
  crouch: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1130, 38, 1215, 165] },
      { box: [1216, 38, 1285, 165] },
      { box: [1286, 38, 1353, 165] },
    ],
  },
  standup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1356, 38, 1420, 165] },
      { box: [1421, 38, 1488, 165] },
    ],
  },
  block: {
    fps: 10,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [9, 204, 93, 322] },
      { box: [94, 204, 178, 322], exclude: (x, y) => x >= 167 && y >= 272 },
      { box: [167, 204, 287, 322], exclude: (x, y) => x <= 183 && y <= 275 },
    ],
  },
  roll: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [296, 204, 384, 322], exclude: (x, y) => x >= 372 && y >= 278 },
      { box: [370, 204, 452, 322], exclude: (x, y) => (x <= 380 && y <= 264) || (x >= 445 && y >= 278) },
      { box: [446, 204, 517, 322], exclude: (x, y) => x <= 454 && y <= 264 },
      { box: [518, 204, 597, 322] },
    ],
  },
  knockdown: {
    fps: 8,
    loop: false,
    alignMode: 'feet',
    // Ordered falling -> collapsing -> prone so KO ends lying flat on the arena floor
    frames: [
      { box: [786, 204, 872, 322] },
      { box: [709, 204, 786, 322] },
      { box: [600, 204, 708, 322] },
    ],
  },
  getup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [891, 204, 966, 322] },
      { box: [967, 204, 1042, 322] },
      { box: [1042, 204, 1118, 322] },
    ],
  },
  punch: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1127, 204, 1195, 322] },
      { box: [1195, 204, 1258, 322] },
      { box: [1258, 204, 1348, 322] },
    ],
  },
  kick: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1359, 204, 1435, 322] },
      { box: [1436, 204, 1526, 322] },
    ],
  },
  heavy_punch: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [9, 356, 89, 478] },
      { box: [91, 356, 175, 478] },
      { box: [175, 356, 267, 478] },
    ],
  },
  heavy_kick: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [276, 356, 367, 478] },
      { box: [368, 356, 466, 478], exclude: (x, y) => x >= 454 && y >= 425 },
      { box: [454, 356, 558, 478], exclude: (x, y) => x <= 466 && y <= 415 },
    ],
  },
  staff_attack: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [558, 356, 647, 478] },
      { box: [651, 356, 748, 478], exclude: (x, y) => x >= 740 && y >= 435 },
      { box: [740, 356, 830, 478], exclude: (x, y) => x <= 747 && y <= 410 },
    ],
  },
  staff_slam: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [835, 356, 948, 478] },
      { box: [948, 356, 1062, 478] },
    ],
  },
  grab: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1066, 356, 1139, 478] },
      { box: [1146, 356, 1240, 478] },
      { box: [1246, 356, 1356, 478] },
    ],
  },
  throw: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1246, 356, 1356, 478] },
      { box: [1359, 356, 1447, 478] },
    ],
  },
  special_dark_sphere: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [10, 509, 84, 623] },
      { box: [84, 509, 139, 623] },
      { box: [139, 509, 192, 623] },
      { box: [192, 509, 252, 623] },
      { box: [252, 500, 326, 623] },
      { box: [326, 500, 424, 623] },
    ],
  },
  special_underworld_hands: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [780, 512, 895, 623] },
      { box: [962, 513, 1022, 623] },
    ],
  },
  special_spectral_army: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [10, 650, 84, 767] },
      { box: [85, 650, 148, 767] },
    ],
  },
  special_shadow_teleport: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [780, 652, 895, 768] },
      { box: [897, 652, 995, 768] },
      { box: [1082, 652, 1196, 768] },
      { box: [1301, 652, 1413, 768] },
    ],
  },
  finisher: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    scale: 0.71, // Normalize larger row-6 Lucas height (~156px body) down to IDLE scale (~111px)
    frames: [
      { box: [6, 804, 136, 1012], exclude: (x, y) => x >= 126 && y >= 920 },
      { box: [122, 804, 252, 1012], exclude: (x, y) => (x <= 136 && y <= 915) || (x >= 242 && y >= 910) },
      { box: [242, 783, 346, 1012], exclude: (x, y) => (x <= 253 && y <= 905) || (x >= 336 && y >= 870) },
      { box: [334, 783, 420, 1012], exclude: (x, y) => x <= 346 && y <= 865 },
      { box: [420, 783, 502, 1012], exclude: (x, y) => x >= 492 && y >= 820 },
      { box: [490, 783, 582, 1012], exclude: (x, y) => (x <= 502 && y >= 870) || (x >= 572 && y >= 830) },
      { box: [572, 783, 695, 1012], exclude: (x, y) => x <= 582 && y >= 890 },
      { box: [690, 783, 886, 1012] },
      { box: [886, 783, 966, 1012] },
      { box: [966, 783, 1096, 1012] },
    ],
  },
  victory: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    scale: 0.71, // Keep Necromancer visible throughout all 7 frames ending on raised-staff dark-wings win pose
    frames: [
      { box: [6, 804, 126, 1012] },
      { box: [128, 804, 244, 1012], exclude: (x, y) => x <= 150 && y <= 832 },
      { box: [246, 783, 338, 1012], exclude: (x, y) => x <= 286 && y <= 875 },
      { box: [340, 783, 418, 1012], exclude: (x, y) => x <= 362 && y <= 848 },
      { box: [422, 783, 496, 1012] },
      { box: [502, 773, 576, 1012] },
      { box: [582, 773, 694, 1012] },
    ],
  },
};

const FX_BOXES = {
  fx_necro_dark_sphere: { box: [1104, 819, 1202, 899] },
  fx_necro_portal: { box: [1215, 819, 1298, 899] },
  fx_necro_chains: { box: [1308, 819, 1420, 899] },
  fx_necro_soul_explosion: { box: [1426, 819, 1528, 899] },
  fx_necro_skulls: { box: [1099, 938, 1201, 1016] },
  fx_necro_smoke: { box: [1210, 938, 1306, 1016] },
  fx_necro_aura: { box: [1315, 938, 1423, 1016] },
  fx_necro_sigils: { box: [1428, 938, 1525, 1016] },
  fx_necro_hand: { box: [1170, 512, 1245, 623] },
  fx_necro_specter: { box: [694, 650, 767, 767] },
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
  const frameScale = seq.scale ?? 1;
  const frames = seq.frames.map(({ box, exclude }) => {
    const raw = extractFrameRgba(box, exclude || null);
    const scaled = scaleFrameRgba(raw, frameScale);
    const f = tightBoundsFromRgba(scaled, 20);
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
    const groundedFoot = Math.max(...frames.map((f) => f.footY - rowMinY));
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
        if (a <= 10) continue;
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
    file: `/assets/necromancer_lucas/${outFile}`,
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

// Extract all 8 Necromancer FX sprites preserving original alpha channel
const fxPreview = [];
for (const [fxName, cfg] of Object.entries(FX_BOXES)) {
  const raw = extractFrameRgba(cfg.box);
  const tight = tightBoundsFromRgba(raw, 12);
  const fw = tight.w;
  const fh = tight.h;
  const out = Buffer.alloc(fw * fh * 4, 0);
  for (let sy = tight.y1; sy <= tight.y2; sy++) {
    for (let sx = tight.x1; sx <= tight.x2; sx++) {
      const si = (sy * raw.bw + sx) * 4;
      const di = ((sy - tight.y1) * fw + (sx - tight.x1)) * 4;
      out[di] = raw.rgba[si];
      out[di + 1] = raw.rgba[si + 1];
      out[di + 2] = raw.rgba[si + 2];
      out[di + 3] = raw.rgba[si + 3];
    }
  }
  const outFile = `${fxName}.png`;
  writeRgbaPng(out, fw, fh, path.join(OUT_DIR, outFile));
  manifest.fx[fxName] = {
    file: `/assets/necromancer_lucas/${outFile}`,
    width: fw,
    height: fh,
  };
  fxPreview.push({ name: fxName, w: fw, h: fh, buf: out });
}

// Compose crisp 240x240 Necromante Lucas portrait from high-res finisher bust + necromantic backdrop
const pRaw = extractFrameRgba([14, 804, 152, 922]);
const pTight = tightBoundsFromRgba(pRaw, 18);
const pw = pTight.w;
const ph = pTight.h;
const pCropped = Buffer.alloc(pw * ph * 4, 0);
for (let sy = pTight.y1; sy <= pTight.y2; sy++) {
  for (let sx = pTight.x1; sx <= pTight.x2; sx++) {
    const si = (sy * pRaw.bw + sx) * 4;
    const di = ((sy - pTight.y1) * pw + (sx - pTight.x1)) * 4;
    pCropped[di] = pRaw.rgba[si];
    pCropped[di + 1] = pRaw.rgba[si + 1];
    pCropped[di + 2] = pRaw.rgba[si + 2];
    pCropped[di + 3] = pRaw.rgba[si + 3];
  }
}
const sigilBg = path.join(OUT_DIR, 'fx_necro_sigils.png');
const auraBg = path.join(OUT_DIR, 'fx_necro_aura.png');
const tmpChar = path.join(OUT_DIR, '_tmp_portrait_char.png');
writeRgbaPng(pCropped, pw, ph, tmpChar);
execFileSync('convert', [
  '-size', '240x240',
  'radial-gradient:#3b1464-#0d0618',
  '(', sigilBg, '-resize', '210x210', '-evaluate', 'multiply', '0.55', ')', '-gravity', 'center', '-composite',
  '(', auraBg, '-resize', '220x220', '-evaluate', 'multiply', '0.45', ')', '-gravity', 'south', '-composite',
  '(', tmpChar, '-resize', '228x228', ')', '-gravity', 'south', '-geometry', '+0+0', '-composite',
  path.join(OUT_DIR, 'portrait.png'),
]);
fs.unlinkSync(tmpChar);
manifest.portrait = '/assets/necromancer_lucas/portrait.png';

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
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/necro_extracted_check.png');

// Contact sheet for FX + Portrait
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
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/necro_fx_check.png');

console.log(
  'Extracted Necromancer Lucas!',
  Object.keys(SEQUENCES).length,
  'sequences and',
  Object.keys(FX_BOXES).length,
  'FX'
);
