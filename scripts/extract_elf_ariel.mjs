import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Sprite_Sheet_do_Arqueiro__lfico_M_stico_81b67e49.png';
const OUT_DIR = 'public/assets/elf_ariel';
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
  return found
    ? { x1: minX, y1: minY, x2: maxX, y2: maxY, excludeFn }
    : { x1, y1, x2, y2, excludeFn };
}

function footBottomY(box) {
  for (let y = box.y2; y >= box.y1; y--) {
    let opaque = 0;
    for (let x = box.x1; x <= box.x2; x++) {
      if (box.excludeFn && box.excludeFn(x, y)) continue;
      const [, , , a] = getPixel(x, y);
      if (a > 155) opaque++;
    }
    if (opaque >= 3) return y;
  }
  return box.y2;
}

// Compute horizontal body center using column height + core opacity so wide bow/beam FX never hijack anchorX
function bodyCenterX(box) {
  const w = box.x2 - box.x1 + 1;
  const colWeights = new Array(w).fill(0);
  for (let x = box.x1; x <= box.x2; x++) {
    let minY = box.y2;
    let maxY = box.y1;
    let solidCount = 0;
    for (let y = box.y1; y <= box.y2; y++) {
      if (box.excludeFn && box.excludeFn(x, y)) continue;
      const [r, g, b, a] = getPixel(x, y);
      if (a > 175) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        // Downweight pure bright FX aura slightly so Ariel's armored body anchors solidly
        const isBrightFx = (b > r + 40 && b > 170) || (r > 230 && g > 190 && b < 130);
        solidCount += isBrightFx ? 0.45 : 1.0;
      }
    }
    const span = maxY >= minY ? maxY - minY + 1 : 0;
    // Columns belonging to the standing fighter span vertically (~60-100px), whereas horizontal beams are ~25px
    colWeights[x - box.x1] = solidCount * (span >= 55 ? 1.5 : 0.65);
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
  let num = 0;
  let den = 0;
  for (let i = bestStart; i < Math.min(w, bestStart + win); i++) {
    num += (box.x1 + i) * colWeights[i];
    den += colWeights[i];
  }
  return den > 0 ? Math.round(num / den) : Math.round((box.x1 + box.x2) / 2);
}

// Named clean raw boxes from the 1536x1024 Ariel spritesheet
const F = {
  // Row 0: Idle / Walk / Run
  r0_0: { box: [22, 8, 100, 122] },
  r0_1: { box: [110, 8, 198, 120] },
  r0_2: { box: [208, 10, 270, 120] },
  r0_3: { box: [280, 10, 352, 121] },
  r0_4: { box: [362, 10, 433, 120] },
  r0_5: { box: [449, 10, 534, 120] },
  r0_6: { box: [559, 13, 637, 120] },
  r0_7: { box: [651, 10, 734, 120] },
  r0_8: { box: [747, 12, 837, 120] },
  r0_9: { box: [853, 13, 931, 121] },
  r0_10: { box: [949, 14, 1014, 117] },
  r0_11: { box: [1023, 13, 1102, 120] },
  r0_12: { box: [1105, 12, 1204, 117] },
  r0_13a: { box: [1220, 11, 1322, 113] },
  r0_13b: { box: [1321, 11, 1403, 114] },
  r0_14: { box: [1411, 10, 1523, 108] },

  // Row 1: Jump / Crouch / Knockdown / Getup start
  r1_0: { box: [12, 135, 107, 246] },
  r1_1: { box: [115, 131, 239, 240] },
  r1_2: { box: [257, 136, 374, 239] },
  r1_3: { box: [380, 137, 459, 232] },
  r1_4: { box: [466, 139, 541, 239] },
  r1_5: { box: [548, 144, 629, 241] },
  r1_6: { box: [635, 146, 711, 238] },
  r1_7: { box: [724, 150, 808, 241] },
  r1_8: { box: [820, 156, 890, 231] },
  r1_9: { box: [902, 155, 987, 222] },
  r1_10: { box: [998, 154, 1070, 227] },
  r1_11: { box: [1082, 139, 1142, 238] },
  r1_12: { box: [1153, 146, 1225, 238] },
  r1_13a: { box: [1238, 154, 1324, 235] },
  r1_13b: { box: [1326, 154, 1429, 235] },
  r1_14: { box: [1435, 155, 1520, 218] },

  // Row 2: Block / StandUp / Bow Draw / Quick Strikes
  r2_0: { box: [10, 258, 88, 359] },
  r2_1: { box: [99, 258, 171, 360] },
  r2_2: { box: [179, 258, 273, 358] },
  r2_3: { box: [280, 293, 350, 357] },
  r2_4: { box: [356, 265, 433, 358] },
  r2_5: { box: [439, 267, 511, 362] },
  r2_6: { box: [516, 268, 588, 362] },
  r2_7: { box: [602, 273, 675, 366] },
  r2_8: { box: [685, 258, 763, 362] },
  r2_9: { box: [780, 261, 872, 368] },
  r2_10: { box: [883, 263, 987, 367] },
  r2_11: { box: [1007, 263, 1097, 366] },
  r2_12: { box: [1113, 264, 1189, 367] },
  r2_13: { box: [1196, 262, 1277, 367] },
  r2_14: { box: [1286, 269, 1350, 366] },
  r2_15: { box: [1355, 270, 1429, 365] },
  r2_16: { box: [1440, 272, 1522, 366] },

  // Row 3: Melee Punches/Kicks & Sky Bow Aim
  r3_0: { box: [10, 386, 114, 482] },
  r3_1: { box: [126, 390, 215, 483] },
  r3_2: { box: [224, 386, 307, 482] },
  r3_3: { box: [321, 397, 404, 482] },
  r3_4: { box: [410, 393, 500, 484] },
  r3_5: { box: [509, 393, 604, 485] },
  r3_6a: { box: [615, 380, 710, 486] },
  r3_6b: { box: [712, 380, 806, 486] },
  r3_6c: { box: [807, 380, 899, 486] },
  r3_7a: { box: [906, 381, 1008, 495] },
  r3_7b: { box: [1010, 400, 1100, 495] },

  // Row 4: Mid-row Bow shots (fire/ice/rain green)
  r4_bow0: { box: [271, 567, 382, 650] },
  r4_bow1: { box: [547, 539, 638, 646] },
  r4_green0: { box: [650, 549, 764, 649] },
  r4_green1: { box: [771, 529, 904, 650] },

  // Row 5: Green slashes & Blue/Ice bow shots
  r5_0: { box: [9, 650, 160, 761] },
  r5_1: { box: [145, 659, 233, 762] },
  r5_2: { box: [233, 650, 358, 763] },
  r5_blue0: { box: [587, 655, 720, 768] },
  r5_blue1: { box: [727, 655, 857, 766] },
  r5_blue2: { box: [859, 655, 954, 769] },

  // Row 6: Purple Arcane sequence
  r6_0: { box: [11, 783, 129, 884] },
  r6_1: { box: [145, 775, 243, 889] },
  r6_2: { box: [291, 782, 391, 889] },
  r6_3: { box: [393, 783, 502, 887] },
  r6_4: { box: [551, 775, 650, 888] },
  r6_5: { box: [831, 782, 1121, 888] },

  // Row 7: Golden Arco Divino sequence (clip y2=980 on r7_7 to exclude bottom dirt rocks)
  r7_0: { box: [8, 902, 73, 1013] },
  r7_1: { box: [140, 896, 229, 1013] },
  r7_2: { box: [241, 904, 325, 1012] },
  r7_3: { box: [334, 904, 413, 1012] },
  r7_4: { box: [421, 909, 509, 1012] },
  r7_5: { box: [514, 907, 582, 1013] },
  r7_6: { box: [591, 907, 691, 1012] },
  r7_7: { box: [695, 906, 795, 1014] },
  r7_8: { box: [798, 893, 1006, 982], exclude: (x, y) => y <= 897 && x >= 940 },
};

// Required sequences with exact prompt frame counts & FPS
const SEQUENCES = {
  idle: {
    fps: 8,
    loop: true,
    alignMode: 'feet',
    frames: [F.r0_0, F.r0_1, F.r0_2, F.r0_3, F.r0_2, F.r0_1],
  },
  walk: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [F.r0_4, F.r0_5, F.r0_6, F.r0_7, F.r0_8, F.r0_7, F.r0_6, F.r0_5],
  },
  run: {
    fps: 16,
    loop: true,
    alignMode: 'row_top',
    frames: [F.r0_9, F.r0_10, F.r0_11, F.r0_12, F.r0_13a, F.r0_13b, F.r0_14, F.r0_13b],
  },
  jump: {
    fps: 12,
    loop: false,
    alignMode: 'center',
    frames: [F.r1_0, F.r1_1, F.r1_2, F.r1_3, F.r1_4, F.r1_5, F.r1_6, F.r1_7],
  },
  crouch: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [F.r1_7, F.r1_8, F.r1_9, F.r1_10],
  },
  standup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [F.r2_3, F.r2_4, F.r1_11, F.r0_2],
  },
  block: {
    fps: 10,
    loop: true,
    alignMode: 'feet',
    frames: [F.r2_0, F.r2_1, F.r2_5, F.r2_6],
  },
  roll: {
    fps: 12,
    loop: true,
    alignMode: 'feet',
    frames: [F.r1_5, F.r1_6, F.r1_7, F.r2_3, F.r2_4, F.r1_11],
  },
  knockdown: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [F.r1_12, F.r1_12, F.r1_13a, F.r1_13a, F.r1_13b, F.r1_13b],
  },
  getup: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [F.r1_13b, F.r1_14, F.r2_3, F.r2_4, F.r1_11, F.r0_3],
  },
  punch: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [F.r2_7, F.r2_14, F.r2_15, F.r2_16, F.r3_0],
  },
  kick: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [F.r3_2, F.r3_3, F.r3_4, F.r3_3, F.r3_2],
  },
  heavy_punch: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [F.r2_14, F.r2_16, F.r3_0, F.r3_1, F.r3_5, F.r7_6],
  },
  heavy_kick: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [F.r3_2, F.r5_0, F.r5_1, F.r5_2, F.r5_blue1, F.r5_blue2],
  },
  grab: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [F.r2_2, F.r2_15, F.r2_16, F.r3_1, F.r3_1, F.r3_5, F.r3_5, F.r2_15],
  },
  throw: {
    fps: 12,
    loop: false,
    alignMode: 'feet',
    frames: [F.r3_1, F.r3_5, F.r5_0, F.r5_1, F.r5_2, F.r5_blue1, F.r5_blue2, F.r7_6],
  },
  special_flamejante: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      F.r2_8,
      F.r2_9,
      F.r2_10,
      F.r2_11,
      F.r3_6a,
      F.r3_6b,
      F.r3_6c,
      F.r2_12,
      F.r2_13,
      F.r2_13,
    ],
  },
  special_congelante: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      F.r2_8,
      F.r2_9,
      F.r4_bow0,
      F.r4_bow1,
      F.r5_blue0,
      F.r5_blue1,
      F.r5_blue2,
      F.r2_12,
      F.r2_13,
      F.r2_13,
    ],
  },
  special_chuva: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      F.r2_8,
      F.r2_9,
      F.r2_10,
      F.r3_6b,
      F.r3_7a,
      F.r3_7a,
      F.r4_green0,
      F.r4_green1,
      F.r4_green1,
      F.r3_7a,
      F.r2_12,
      F.r2_13,
    ],
  },
  special_arcana: {
    fps: 15,
    loop: false,
    alignMode: 'feet',
    frames: [
      F.r6_0,
      F.r6_1,
      F.r6_2,
      F.r6_3,
      F.r6_4,
      F.r6_4,
      F.r6_5,
      F.r6_5,
      F.r6_5,
      F.r6_2,
      F.r2_12,
      F.r2_13,
    ],
  },
  finisher: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      F.r7_0,
      F.r7_1,
      F.r7_2,
      F.r7_5,
      F.r7_7,
      F.r7_8,
      F.r7_8,
      F.r7_8,
      F.r7_3,
      F.r7_3,
    ],
  },
  victory: {
    fps: 10,
    loop: false,
    alignMode: 'feet',
    frames: [
      F.r7_0,
      F.r7_2,
      F.r7_3,
      F.r7_4,
      F.r7_5,
    ],
  },
};

const FX_BOXES = {
  fx_elf_fire_arrow: [10, 498, 88, 529],
  fx_elf_ice_arrow: [390, 532, 544, 562],
  fx_elf_rain_arrow: [1246, 547, 1262, 583],
  fx_elf_arcane_arrow: [10, 568, 86, 597],
  fx_elf_green_burst: [1342, 599, 1428, 647],
  fx_elf_green_slash: [358, 649, 464, 766],
  fx_elf_ice_wave: [970, 658, 1068, 766],
  fx_elf_ice_burst: [1305, 657, 1524, 772],
  fx_elf_arcane_portal: [661, 775, 725, 888],
  fx_elf_arcane_explosion: [1322, 777, 1529, 891],
  fx_elf_gold_beam: [1014, 893, 1527, 983],
  fx_elf_gold_crescent: [74, 896, 134, 986],
  fx_elf_trail: [1114, 404, 1215, 440],
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

  const maxLeftReach = Math.max(...tight.map((b) => b.leftReach)) + 4;
  const maxRightReach = Math.max(...tight.map((b) => b.rightReach)) + 4;
  const frameW = Math.ceil((maxLeftReach + maxRightReach) / 2) * 2;
  const anchorX = maxLeftReach;

  let frameH;
  let anchorY;
  const rowMinY = Math.min(...tight.map((b) => b.y1));

  if (seq.alignMode === 'row_top') {
    const maxRelBottom = Math.max(...tight.map((b) => b.y2 - rowMinY));
    frameH = Math.ceil((maxRelBottom + 6) / 2) * 2;
    const groundedFoot = Math.max(...tight.slice(0, 4).map((b) => b.footY - rowMinY));
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
    file: `/assets/elf_ariel/${outFile}`,
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

// Extract FX sprites cleanly
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
    file: `/assets/elf_ariel/${outFile}`,
    width: fw,
    height: fh,
  };
  fxPreview.push({ name: fxName, w: fw, h: fh, buf: out });
}

// Generate crisp HD bust portrait from Ariel's hero idle & golden pose over dark emerald MK3 backdrop
const heroBox = tightBounds(22, 8, 100, 122, 18);
const PW = 240;
const PH = 240;
const portraitBuf = Buffer.alloc(PW * PH * 4, 0);
for (let py = 0; py < PH; py++) {
  for (let px = 0; px < PW; px++) {
    // Dramatic radial emerald-gold arcade backdrop
    const nx = (px - PW * 0.5) / (PW * 0.55);
    const ny = (py - PH * 0.42) / (PH * 0.55);
    const dist = Math.sqrt(nx * nx + ny * ny);
    const glow = Math.max(0, 1 - dist);
    const r = Math.round(10 + glow * glow * 34);
    const g = Math.round(18 + glow * 72);
    const b = Math.round(16 + glow * 36);
    const di = (py * PW + px) * 4;
    portraitBuf[di] = r;
    portraitBuf[di + 1] = g;
    portraitBuf[di + 2] = b;
    portraitBuf[di + 3] = 255;
  }
}
// Composite zoomed upper-body bust (top 72px of heroBox centered cleanly)
const cropW = heroBox.x2 - heroBox.x1 + 1;
const cropH = Math.min(72, heroBox.y2 - heroBox.y1 + 1);
const scale = 3.25;
const drawW = cropW * scale;
const ox = Math.round((PW - drawW) / 2) - 12;
const oy = 22;
for (let py = 0; py < PH; py++) {
  for (let px = 0; px < PW; px++) {
    const sxF = heroBox.x1 + (px - ox) / scale;
    const syF = heroBox.y1 + (py - oy) / scale;
    if (sxF < heroBox.x1 || sxF > heroBox.x2 || syF < heroBox.y1 || syF >= heroBox.y1 + cropH) continue;
    const x0 = Math.floor(sxF);
    const y0 = Math.floor(syF);
    const x1 = Math.min(heroBox.x2, x0 + 1);
    const y1 = Math.min(heroBox.y2, y0 + 1);
    const fx = sxF - x0;
    const fy = syF - y0;
    const p00 = getPixel(x0, y0);
    const p10 = getPixel(x1, y0);
    const p01 = getPixel(x0, y1);
    const p11 = getPixel(x1, y1);
    const a =
      p00[3] * (1 - fx) * (1 - fy) +
      p10[3] * fx * (1 - fy) +
      p01[3] * (1 - fx) * fy +
      p11[3] * fx * fy;
    if (a <= 20) continue;
    const alpha = Math.min(1, a / 255);
    const r =
      p00[0] * (1 - fx) * (1 - fy) +
      p10[0] * fx * (1 - fy) +
      p01[0] * (1 - fx) * fy +
      p11[0] * fx * fy;
    const g =
      p00[1] * (1 - fx) * (1 - fy) +
      p10[1] * fx * (1 - fy) +
      p01[1] * (1 - fx) * fy +
      p11[1] * fx * fy;
    const b =
      p00[2] * (1 - fx) * (1 - fy) +
      p10[2] * fx * (1 - fy) +
      p01[2] * (1 - fx) * fy +
      p11[2] * fx * fy;
    const di = (py * PW + px) * 4;
    portraitBuf[di] = Math.round(r * alpha + portraitBuf[di] * (1 - alpha));
    portraitBuf[di + 1] = Math.round(g * alpha + portraitBuf[di + 1] * (1 - alpha));
    portraitBuf[di + 2] = Math.round(b * alpha + portraitBuf[di + 2] * (1 - alpha));
  }
}
// Vignette edge frame
for (let py = 0; py < PH; py++) {
  for (let px = 0; px < PW; px++) {
    const edge = Math.min(px, py, PW - 1 - px, PH - 1 - py);
    if (edge < 14) {
      const f = 0.45 + 0.55 * (edge / 14);
      const di = (py * PW + px) * 4;
      portraitBuf[di] = Math.round(portraitBuf[di] * f);
      portraitBuf[di + 1] = Math.round(portraitBuf[di + 1] * f);
      portraitBuf[di + 2] = Math.round(portraitBuf[di + 2] * f);
    }
  }
}
writeRgbaPng(portraitBuf, PW, PH, path.join(OUT_DIR, 'portrait.png'));
manifest.portrait = '/assets/elf_ariel/portrait.png';

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Contact sheet for animation strips
const sheetW = Math.max(1200, ...previewRows.map((r) => r.w + 20));
const sheetH = previewRows.reduce((acc, r) => acc + r.h + 10, 20);
const sheet = Buffer.alloc(sheetW * sheetH * 4, 0);
for (let y = 0; y < sheetH; y++) {
  for (let x = 0; x < sheetW; x++) {
    const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 30 : 44;
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
writeRgbaPng(sheet, sheetW, sheetH, '.playwright-cli/elf_extracted_check.png');

// Contact sheet for FX sprites
const fxW = fxPreview.reduce((acc, r) => acc + r.w + 16, 16);
const fxH = Math.max(...fxPreview.map((r) => r.h)) + 20;
const fxSheet = Buffer.alloc(fxW * fxH * 4, 0);
for (let y = 0; y < fxH; y++) {
  for (let x = 0; x < fxW; x++) {
    const checker = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0 ? 28 : 42;
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
writeRgbaPng(fxSheet, fxW, fxH, '.playwright-cli/elf_fx_check.png');

console.log('Extracted Ariel cleanly!', Object.keys(SEQUENCES).length, 'sequences and', Object.keys(FX_BOXES).length, 'FX');
