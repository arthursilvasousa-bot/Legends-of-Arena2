import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Sprite_Sheet_do_Ninja_Pedro_em_A__o_1__165c4f1f.png';
const OUT_DIR = 'public/assets/ninja_pedro';
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1536;
const H = 1024;
const srcBuf = execFileSync('convert', [SRC, '-depth', '8', 'rgba:-'], {
  maxBuffer: 32 * 1024 * 1024,
});

function getPixel(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return [0, 0, 0, 0];
  const i = (y * W + x) * 4;
  return [srcBuf[i], srcBuf[i + 1], srcBuf[i + 2], srcBuf[i + 3]];
}

// Compute tight bounding box inside [x1, y1, x2, y2], with optional pixel exclusion predicate
function tightBounds(x1, y1, x2, y2, alphaThresh = 20, excludeFn = null) {
  let minX = x2;
  let minY = y2;
  let maxX = x1;
  let maxY = y1;
  let found = false;
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (excludeFn && excludeFn(x, y)) continue;
      const [, , , a] = getPixel(x, y);
      if (a > alphaThresh) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return found ? { x1: minX, y1: minY, x2: maxX, y2: maxY, excludeFn } : { x1, y1, x2, y2, excludeFn };
}

// Find bottom-most opaque foot Y (alpha > 160)
function footBottomY(box) {
  for (let y = box.y2; y >= box.y1; y--) {
    let opaque = 0;
    for (let x = box.x1; x <= box.x2; x++) {
      if (box.excludeFn && box.excludeFn(x, y)) continue;
      const [, , , a] = getPixel(x, y);
      if (a > 160) opaque++;
    }
    if (opaque >= 3) return y;
  }
  return box.y2;
}

// Find horizontal center of the Ninja's dense torso/leg core (ignoring trailing slash arcs / smoke)
function bodyCenterX(box) {
  const w = box.x2 - box.x1 + 1;
  const colWeights = new Array(w).fill(0);
  for (let x = box.x1; x <= box.x2; x++) {
    let count = 0;
    for (let y = box.y1; y <= box.y2; y++) {
      if (box.excludeFn && box.excludeFn(x, y)) continue;
      const [r, g, b, a] = getPixel(x, y);
      if (a > 190) {
        // Slightly downweight bright purple/violet aura pixels so solid body core dominates
        const isPurpleGlow = b > r + 25 && b > g + 35;
        count += isPurpleGlow ? 0.25 : 1;
      }
    }
    colWeights[x - box.x1] = count;
  }

  const win = Math.min(34, w);
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
  // Compute weighted center inside best window
  let num = 0;
  let den = 0;
  for (let i = bestStart; i < Math.min(w, bestStart + win); i++) {
    num += (box.x1 + i) * colWeights[i];
    den += colWeights[i];
  }
  return den > 0 ? Math.round(num / den) : Math.round((box.x1 + box.x2) / 2);
}

const SEQUENCES = {
  idle: {
    fps: 8,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [320, 72, 382, 188] },
      { box: [395, 72, 456, 188] },
      { box: [468, 72, 530, 188] },
      { box: [542, 72, 604, 188] },
    ],
  },
  walk: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [648, 70, 726, 188] },
      { box: [726, 70, 804, 188] },
      { box: [808, 70, 868, 188] },
      { box: [872, 70, 932, 188] },
    ],
  },
  run: {
    fps: 16,
    loop: true,
    // Keep stride height natural so frame 4 mid-air tuck doesn't sink into ground
    alignMode: 'row_top',
    frames: [
      { box: [955, 70, 1038, 188] },
      { box: [1050, 70, 1143, 188], exclude: (x, y) => x >= 1134 && y >= 145 },
      { box: [1135, 70, 1215, 188], exclude: (x, y) => x <= 1144 && y <= 125 },
      { box: [1216, 70, 1285, 188] },
    ],
  },
  jump: {
    fps: 12,
    loop: false,
    alignMode: 'center',
    frames: [
      { box: [1312, 62, 1366, 186] },
      { box: [1376, 62, 1434, 158] },
      { box: [1450, 62, 1506, 160] },
    ],
  },
  crouch: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [314, 236, 380, 334] },
      { box: [394, 236, 454, 334] },
      { box: [462, 236, 526, 334] },
    ],
  },
  standup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [554, 234, 616, 334] },
      { box: [630, 234, 690, 334] },
      { box: [705, 234, 758, 334] },
    ],
  },
  block: {
    fps: 10,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [778, 234, 830, 334] },
      { box: [834, 234, 888, 334] },
      { box: [892, 234, 945, 334] },
    ],
  },
  roll: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [
      { box: [952, 240, 1028, 332] },
      { box: [1030, 240, 1108, 332] },
    ],
  },
  knockdown: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1120, 245, 1230, 334] },
      { box: [1232, 245, 1338, 334] },
    ],
  },
  getup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1352, 245, 1412, 334] },
      { box: [1414, 245, 1468, 334] },
      { box: [1472, 245, 1520, 334] },
    ],
  },
  punch: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [15, 404, 74, 502] },
      { box: [78, 404, 138, 502] },
      { box: [140, 404, 195, 502] },
      { box: [196, 404, 268, 502] },
    ],
  },
  kick: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [288, 400, 344, 502] },
      { box: [348, 400, 408, 502] },
      { box: [410, 400, 514, 502] },
    ],
  },
  heavy_punch: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [534, 404, 588, 502] },
      { box: [592, 404, 666, 502] },
      { box: [672, 404, 738, 502] },
    ],
  },
  heavy_kick: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [766, 402, 830, 502] },
      { box: [832, 402, 898, 502] },
      { box: [906, 402, 992, 502] },
    ],
  },
  grab: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [1022, 404, 1102, 502] },
      { box: [1105, 404, 1170, 502] },
    ],
  },
  throw: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    // Only the ninja throwing poses (exclude the dummy falling poses to the right)
    frames: [
      { box: [1214, 400, 1306, 502] },
      { box: [1306, 400, 1372, 502] },
    ],
  },
  special_lamina: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [15, 558, 94, 648] },
      { box: [96, 558, 166, 648] },
      { box: [166, 558, 240, 648] },
      { box: [242, 558, 428, 648] },
    ],
  },
  special_teletransporte: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [474, 558, 544, 650] },
      { box: [554, 558, 636, 650] },
      { box: [636, 558, 712, 650] },
      { box: [712, 558, 780, 650] },
      { box: [780, 558, 854, 650] },
    ],
  },
  special_shurikens: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [888, 558, 988, 648] },
      { box: [1000, 558, 1072, 648] },
      { box: [1074, 558, 1134, 648] },
      { box: [1135, 558, 1210, 648] },
    ],
  },
  special_corte: {
    fps: 16,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [15, 676, 90, 781] },
      { box: [90, 676, 156, 781] },
      { box: [160, 676, 227, 781] },
      { box: [227, 676, 297, 781] },
      { box: [299, 676, 377, 781], exclude: (x, y) => x >= 364 && y <= 692 },
      { box: [364, 676, 436, 781], exclude: (x, y) => x <= 383 && y >= 692 },
      { box: [439, 676, 501, 781] },
      { box: [495, 676, 564, 781], exclude: (x, y) => x <= 503 && y <= 688 },
      { box: [566, 676, 624, 781] },
      { box: [627, 676, 688, 781] },
    ],
  },
  finisher: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [12, 810, 112, 971] },
      { box: [128, 810, 234, 971] },
      { box: [240, 810, 314, 971] },
      { box: [315, 810, 444, 971] },
      { box: [445, 810, 570, 971] },
      { box: [571, 810, 698, 971] },
    ],
  },
  victory: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      { box: [240, 810, 308, 971] },
      { box: [315, 810, 444, 971] },
      { box: [445, 810, 566, 971], exclude: (x, y) => x >= 554 && y <= 876 },
      { box: [554, 810, 698, 971], exclude: (x, y) => x <= 570 && (y < 824 || y > 868) },
    ],
  },
};

const FX_BOXES = {
  fx_rajada: [720, 725, 868, 845],
  fx_portal: [890, 725, 964, 845],
  fx_shuriken: [1035, 735, 1067, 767],
  fx_sangue: [1120, 725, 1222, 845],
  fx_explosao: [715, 873, 848, 972],
  fx_fumaca: [860, 873, 970, 972],
  fx_rastro: [984, 873, 1106, 972],
  fx_aura: [1120, 873, 1222, 972],
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
  const tight = seq.frames.map(({ box: [x1, y1, x2, y2], exclude }) => {
    const b = tightBounds(x1, y1, x2, y2, 18, exclude || null);
    const fy = footBottomY(b);
    const bcx = bodyCenterX(b);
    return {
      ...b,
      w: b.x2 - b.x1 + 1,
      h: b.y2 - b.y1 + 1,
      footY: fy,
      bodyCenterX: bcx,
      leftReach: bcx - b.x1,
      rightReach: b.x2 - bcx,
    };
  });

  // Align all frames horizontally so Ninja's body stays locked to anchorX!
  const maxLeftReach = Math.max(...tight.map((b) => b.leftReach)) + 4;
  const maxRightReach = Math.max(...tight.map((b) => b.rightReach)) + 4;
  const frameW = Math.ceil((maxLeftReach + maxRightReach) / 2) * 2;
  const anchorX = maxLeftReach;

  let frameH;
  let anchorY;
  let rowMinY = Math.min(...tight.map((b) => b.y1));

  if (seq.alignMode === 'row_top') {
    const maxRelBottom = Math.max(...tight.map((b) => b.y2 - rowMinY));
    frameH = Math.ceil((maxRelBottom + 6) / 2) * 2;
    const groundedFoot = Math.max(...tight.slice(0, 3).map((b) => b.footY - rowMinY));
    anchorY = 3 + groundedFoot;
  } else {
    const maxAboveFoot = Math.max(...tight.map((b) => b.footY - b.y1));
    const maxBelowFoot = Math.max(...tight.map((b) => b.y2 - b.footY));
    frameH = Math.ceil((maxAboveFoot + maxBelowFoot + 6) / 2) * 2;
    anchorY = frameH - 3 - maxBelowFoot;
  }

  const stripW = frameW * tight.length;
  const stripH = frameH;
  const out = Buffer.alloc(stripW * stripH * 4, 0);

  tight.forEach((b, idx) => {
    const destXStart = idx * frameW + (anchorX - b.leftReach);
    let destYStart;
    if (seq.alignMode === 'center') {
      destYStart = Math.floor((frameH - b.h) / 2);
    } else if (seq.alignMode === 'row_top') {
      destYStart = 3 + (b.y1 - rowMinY);
    } else {
      destYStart = anchorY - (b.footY - b.y1);
    }

    for (let sy = b.y1; sy <= b.y2; sy++) {
      const dy = destYStart + (sy - b.y1);
      if (dy < 0 || dy >= stripH) continue;
      for (let sx = b.x1; sx <= b.x2; sx++) {
        if (b.excludeFn && b.excludeFn(sx, sy)) continue;
        const dx = destXStart + (sx - b.x1);
        if (dx < idx * frameW || dx >= (idx + 1) * frameW) continue;
        const [r, g, bCol, a] = getPixel(sx, sy);
        if (a <= 18) continue;
        const di = (dy * stripW + dx) * 4;
        out[di] = r;
        out[di + 1] = g;
        out[di + 2] = bCol;
        out[di + 3] = a;
      }
    }
  });

  const outFile = `${seqName}.png`;
  writeRgbaPng(out, stripW, stripH, path.join(OUT_DIR, outFile));
  manifest.sequences[seqName] = {
    file: `/assets/ninja_pedro/${outFile}`,
    frameWidth: frameW,
    frameHeight: stripH,
    frameCount: tight.length,
    fps: seq.fps,
    loop: seq.loop,
    anchorX,
    anchorY,
  };
  previewRows.push({ name: seqName, w: stripW, h: stripH, buf: out });
}

// Extract FX assets cleanly
const fxPreview = [];
for (const [fxName, [x1, y1, x2, y2]] of Object.entries(FX_BOXES)) {
  const b = tightBounds(x1, y1, x2, y2, 16);
  const fw = b.x2 - b.x1 + 1;
  const fh = b.y2 - b.y1 + 1;
  const out = Buffer.alloc(fw * fh * 4, 0);
  for (let sy = b.y1; sy <= b.y2; sy++) {
    for (let sx = b.x1; sx <= b.x2; sx++) {
      const [r, g, bCol, a] = getPixel(sx, sy);
      if (a <= 14) continue;
      const di = ((sy - b.y1) * fw + (sx - b.x1)) * 4;
      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = bCol;
      out[di + 3] = a;
    }
  }
  const outFile = `${fxName}.png`;
  writeRgbaPng(out, fw, fh, path.join(OUT_DIR, outFile));
  manifest.fx[fxName] = {
    file: `/assets/ninja_pedro/${outFile}`,
    width: fw,
    height: fh,
  };
  fxPreview.push({ name: fxName, w: fw, h: fh, buf: out });
}

// Extract clean Ninja Pedro Portrait bust above the "NINJA (PEDRO)" text (x: 10..279, y: 10..248)
const pw = 270;
const ph = 238;
const pOut = Buffer.alloc(pw * ph * 4, 0);
for (let sy = 10; sy < 10 + ph; sy++) {
  for (let sx = 10; sx < 10 + pw; sx++) {
    const [r, g, bCol, a] = getPixel(sx, sy);
    const di = ((sy - 10) * pw + (sx - 10)) * 4;
    pOut[di] = r;
    pOut[di + 1] = g;
    pOut[di + 2] = bCol;
    pOut[di + 3] = a;
  }
}
writeRgbaPng(pOut, pw, ph, path.join(OUT_DIR, 'portrait.png'));
manifest.portrait = '/assets/ninja_pedro/portrait.png';

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Contact sheet for animation strips
const sheetW = Math.max(960, ...previewRows.map((r) => r.w + 20));
const sheetH = previewRows.reduce((acc, r) => acc + r.h + 10, 20);
const sheet = Buffer.alloc(sheetW * sheetH * 4, 0);
for (let y = 0; y < sheetH; y++) {
  for (let x = 0; x < sheetW; x++) {
    const checker = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) === 0 ? 32 : 46;
    const i = (y * sheetW + x) * 4;
    sheet[i] = checker;
    sheet[i + 1] = checker;
    sheet[i + 2] = checker + 6;
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
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/ninja_extracted_check.png');

// Contact sheet for FX sprites
const fxW = fxPreview.reduce((acc, r) => acc + r.w + 16, 16);
const fxH = Math.max(...fxPreview.map((r) => r.h)) + 20;
const fxSheet = Buffer.alloc(fxW * fxH * 4, 0);
for (let y = 0; y < fxH; y++) {
  for (let x = 0; x < fxW; x++) {
    const checker = ((Math.floor(x / 8) + Math.floor(y / 8)) % 2) === 0 ? 30 : 44;
    const i = (y * fxW + x) * 4;
    fxSheet[i] = checker;
    fxSheet[i + 1] = checker;
    fxSheet[i + 2] = checker + 6;
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
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/ninja_fx_check.png');

console.log('Re-extracted cleanly!', Object.keys(SEQUENCES).length, 'sequences and', Object.keys(FX_BOXES).length, 'FX');
