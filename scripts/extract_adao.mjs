import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASICS_SHEET = 'public/assets/aistudio/Folha_de_Sprites_de_Luta_do_Jaylon_7006cfa2.png';
const SPECIALS_SHEET = 'public/assets/aistudio/Guia_de_golpes_especiais_de_Jaylon_835728d1.png';
const OUT_ROOT = 'public/characters/adao';

const W = 1536;
const H = 1024;

function loadRgba(file) {
  return execFileSync('convert', [file, '-depth', '8', 'rgba:-'], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function inRects(x, y, rects) {
  for (const [rx1, ry1, rx2, ry2] of rects) {
    if (x >= rx1 && x <= rx2 && y >= ry1 && y <= ry2) return true;
  }
  return false;
}

/**
 * Cleanly remove faint alpha noise (a <= 14) and optional white halos while preserving
 * opaque sprites and glowing kinetic trails.
 */
function buildPixelPredicate(buf, excludeRects = [], minAlpha = 20, extraFilter = null) {
  return (x, y) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return false;
    if (inRects(x, y, excludeRects)) return false;
    const o = (y * W + x) * 4;
    const a = buf[o + 3];
    if (a < minAlpha) return false;
    if (extraFilter && !extraFilter(x, y, buf[o], buf[o + 1], buf[o + 2], a)) return false;
    return true;
  };
}

/**
 * Find 2D connected components on opaque core pixels (alpha > coreAlpha),
 * returning bounding boxes & pixel sets.
 */
function findCoreComponents(buf, region, excludeRects = [], coreAlpha = 130, radius = 1, minPixels = 250, extraFilter = null) {
  const [x1, y1, x2, y2] = region;
  const rw = x2 - x1 + 1;
  const rh = y2 - y1 + 1;
  const fg = new Uint8Array(rw * rh);
  for (let ry = 0; ry < rh; ry++) {
    const gy = y1 + ry;
    for (let rx = 0; rx < rw; rx++) {
      const gx = x1 + rx;
      if (inRects(gx, gy, excludeRects)) continue;
      const o = (gy * W + gx) * 4;
      const a = buf[o + 3];
      if (a <= coreAlpha) continue;
      if (extraFilter && !extraFilter(gx, gy, buf[o], buf[o + 1], buf[o + 2], a)) continue;
      fg[ry * rw + rx] = 1;
    }
  }
  const vis = new Uint8Array(rw * rh);
  const comps = [];
  for (let i = 0; i < rw * rh; i++) {
    if (!fg[i] || vis[i]) continue;
    const q = [i];
    vis[i] = 1;
    let h = 0;
    let mnX = rw, mxX = 0, mnY = rh, mxY = 0;
    while (h < q.length) {
      const c = q[h++];
      const cx = c % rw;
      const cy = (c / rw) | 0;
      if (cx < mnX) mnX = cx;
      if (cx > mxX) mxX = cx;
      if (cy < mnY) mnY = cy;
      if (cy > mxY) mxY = cy;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < rw && ny >= 0 && ny < rh) {
            const ni = ny * rw + nx;
            if (fg[ni] && !vis[ni]) {
              vis[ni] = 1;
              q.push(ni);
            }
          }
        }
      }
    }
    if (q.length >= minPixels) {
      let sumX = 0;
      for (const p of q) sumX += x1 + (p % rw);
      comps.push({
        x1: x1 + mnX,
        x2: x1 + mxX,
        y1: y1 + mnY,
        y2: y1 + mxY,
        cx: sumX / q.length,
        pixels: q,
        rw,
        originX: x1,
        originY: y1,
        count: q.length,
      });
    }
  }
  comps.sort((a, b) => a.cx - b.cx);
  return comps;
}

/**
 * Dilate / assign semi-transparent anti-aliased edge pixels (alpha > minAlpha) around a core component
 * without stealing pixels belonging to any other core component.
 */
function componentWithEdgesToImage(buf, compsInput, allCompsInRegion = null, minAlpha = 20, padMargin = 8, extraFilter = null) {
  const list = Array.isArray(compsInput) ? compsInput : [compsInput];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const ownSet = new Set();
  for (const c of list) {
    if (c.x1 < minX) minX = c.x1;
    if (c.x2 > maxX) maxX = c.x2;
    if (c.y1 < minY) minY = c.y1;
    if (c.y2 > maxY) maxY = c.y2;
    for (const p of c.pixels) {
      const gx = c.originX + (p % c.rw);
      const gy = c.originY + ((p / c.rw) | 0);
      ownSet.add(gy * W + gx);
    }
  }

  const otherSet = new Set();
  if (allCompsInRegion) {
    for (const oc of allCompsInRegion) {
      if (list.includes(oc)) continue;
      for (const p of oc.pixels) {
        const gx = oc.originX + (p % oc.rw);
        const gy = oc.originY + ((p / oc.rw) | 0);
        otherSet.add(gy * W + gx);
      }
    }
  }

  const sx1 = Math.max(0, minX - padMargin);
  const sy1 = Math.max(0, minY - padMargin);
  const sx2 = Math.min(W - 1, maxX + padMargin);
  const sy2 = Math.min(H - 1, maxY + padMargin);

  // BFS outward from ownSet up to 3 pixels into anti-aliased fringes not owned by otherSet
  const included = new Set(ownSet);
  let frontier = Array.from(ownSet);
  for (let step = 0; step < 3; step++) {
    const next = [];
    for (const gIdx of frontier) {
      const gx = gIdx % W;
      const gy = (gIdx / W) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < sx1 || nx > sx2 || ny < sy1 || ny > sy2) continue;
          const ni = ny * W + nx;
          if (included.has(ni) || otherSet.has(ni)) continue;
          const o = ni * 4;
          const a = buf[o + 3];
          if (a >= minAlpha && (!extraFilter || extraFilter(nx, ny, buf[o], buf[o + 1], buf[o + 2], a))) {
            included.add(ni);
            next.push(ni);
            if (nx < minX) minX = nx;
            if (nx > maxX) maxX = nx;
            if (ny < minY) minY = ny;
            if (ny > maxY) maxY = ny;
          }
        }
      }
    }
    frontier = next;
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const rgba = Buffer.alloc(w * h * 4);
  for (const ni of included) {
    const gx = ni % W;
    const gy = (ni / W) | 0;
    const dx = gx - minX;
    const dy = gy - minY;
    const srcO = ni * 4;
    const dstO = (dy * w + dx) * 4;
    rgba[dstO] = buf[srcO];
    rgba[dstO + 1] = buf[srcO + 1];
    rgba[dstO + 2] = buf[srcO + 2];
    // Boost nearly-opaque core pixels (248..254) cleanly to 255 for crisp edges
    const a = buf[srcO + 3];
    rgba[dstO + 3] = a >= 244 ? 255 : a;
  }
  return { w, h, rgba, srcMinX: minX, srcMaxX: maxX, srcMinY: minY, srcMaxY: maxY };
}

/**
 * Extract a rectangular region of pixels with optional mask predicate, keeping soft FX alpha intact.
 */
function extractMaskedBox(buf, box, minAlpha = 18, excludeRects = [], customKeep = null) {
  const [x1, y1, x2, y2] = box;
  let minX = x2, maxX = x1, minY = y2, maxY = y1;
  const pixels = [];
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (inRects(x, y, excludeRects)) continue;
      if (customKeep && !customKeep(x, y)) continue;
      const o = (y * W + x) * 4;
      const a = buf[o + 3];
      if (a < minAlpha) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      pixels.push([x, y, buf[o], buf[o + 1], buf[o + 2], a >= 244 ? 255 : a]);
    }
  }
  if (pixels.length === 0) throw new Error(`Empty box extraction: ${JSON.stringify(box)}`);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const rgba = Buffer.alloc(w * h * 4);
  for (const [x, y, r, g, b, a] of pixels) {
    const dstO = ((y - minY) * w + (x - minX)) * 4;
    rgba[dstO] = r;
    rgba[dstO + 1] = g;
    rgba[dstO + 2] = b;
    rgba[dstO + 3] = a;
  }
  return { w, h, rgba, srcMinX: minX, srcMaxX: maxX, srcMinY: minY, srcMaxY: maxY };
}

/**
 * Compute horizontal body anchor X relative to frame image (weighted by bottom/core opaque pixels).
 */
function computeBodyAnchorX(img, maxSearchX = img.w) {
  // Use core opaque pixels (a >= 190) in the lower 65% of sprite height to stay anchored to hips/legs
  const startY = Math.floor(img.h * 0.3);
  const limitX = Math.min(img.w, maxSearchX);
  let sumX = 0;
  let totalW = 0;
  for (let y = startY; y < img.h; y++) {
    for (let x = 0; x < limitX; x++) {
      const o = (y * img.w + x) * 4;
      const a = img.rgba[o + 3];
      if (a >= 190) {
        const r = img.rgba[o], g = img.rgba[o + 1], b = img.rgba[o + 2];
        // Ignore bright white/lavender trail glare and purple energy blasts
        const mn = Math.min(r, g, b);
        const isPurpleFx = b > r + 15 && g < 150;
        const weight = isPurpleFx ? 0 : mn > 225 ? 0.2 : 1;
        sumX += x * weight;
        totalW += weight;
      }
    }
  }
  if (totalW > 10) return Math.round(sumX / totalW);
  return Math.round(limitX / 2);
}

function scaleImage(img, scale) {
  if (Math.abs(scale - 1) < 0.002) return img;
  const nw = Math.max(1, Math.round(img.w * scale));
  const nh = Math.max(1, Math.round(img.h * scale));
  const tmpIn = `.playwright-cli/_adao_in.rgba`;
  const tmpOut = `.playwright-cli/_adao_out.rgba`;
  fs.mkdirSync('.playwright-cli', { recursive: true });
  fs.writeFileSync(tmpIn, img.rgba);
  execFileSync('convert', [
    '-size', `${img.w}x${img.h}`,
    '-depth', '8',
    `rgba:${tmpIn}`,
    '-filter', 'Lanczos',
    '-resize', `${nw}x${nh}!`,
    '-depth', '8',
    `rgba:${tmpOut}`,
  ]);
  const outBuf = fs.readFileSync(tmpOut);
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  return { w: nw, h: nh, rgba: outBuf };
}

function writePngFromRgba(outFile, w, h, rgba) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const tmpRaw = '.playwright-cli/_adao_write.rgba';
  fs.mkdirSync('.playwright-cli', { recursive: true });
  fs.writeFileSync(tmpRaw, rgba);
  execFileSync('convert', [
    '-size', `${w}x${h}`,
    '-depth', '8',
    `rgba:${tmpRaw}`,
    outFile,
  ]);
  fs.unlinkSync(tmpRaw);
}

/**
 * Write both individual frame PNGs (frame_01.png...) inside folderDir and a combined horizontal strip.png.
 * Supports explicit per-frame anchor alignment so wide FX poses (like Time Transcending Fist) stay rooted!
 */
function writeSequenceFolder(folderDir, stripName, frames, fixedAnchorAlign = false, anchorMaxSearchX = undefined) {
  fs.mkdirSync(folderDir, { recursive: true });
  const anchors = frames.map((fr) =>
    fixedAnchorAlign ? computeBodyAnchorX(fr, anchorMaxSearchX) : Math.round(fr.w / 2)
  );
  const maxLeft = fixedAnchorAlign
    ? Math.max(...frames.map((fr, i) => anchors[i]))
    : Math.max(...frames.map((fr) => Math.ceil(fr.w / 2)));
  const maxRight = fixedAnchorAlign
    ? Math.max(...frames.map((fr, i) => fr.w - anchors[i]))
    : Math.max(...frames.map((fr) => Math.ceil(fr.w / 2)));
  const maxH = Math.max(...frames.map((f) => f.h));

  const padX = 8;
  const padTop = 6;
  const padBottom = 4;
  let frameWidth = maxLeft + maxRight + padX * 2;
  let frameHeight = maxH + padTop + padBottom;
  if (frameWidth % 2 !== 0) frameWidth++;
  if (frameHeight % 2 !== 0) frameHeight++;

  const anchorX = fixedAnchorAlign ? maxLeft + padX : Math.round(frameWidth / 2);
  const anchorY = frameHeight - padBottom;
  const stripW = frameWidth * frames.length;
  const stripRgba = Buffer.alloc(stripW * frameHeight * 4);

  const frameFiles = [];
  for (let fi = 0; fi < frames.length; fi++) {
    const fr = frames[fi];
    const singleRgba = Buffer.alloc(frameWidth * frameHeight * 4);
    const localAnchor = anchors[fi];
    const destLocalX = fixedAnchorAlign ? anchorX - localAnchor : Math.round((frameWidth - fr.w) / 2);
    const destLocalY = anchorY - fr.h;
    const stripOffsetX = fi * frameWidth;

    for (let y = 0; y < fr.h; y++) {
      for (let x = 0; x < fr.w; x++) {
        const srcO = (y * fr.w + x) * 4;
        if (fr.rgba[srcO + 3] === 0) continue;
        const lx = destLocalX + x;
        const ly = destLocalY + y;
        if (lx < 0 || lx >= frameWidth || ly < 0 || ly >= frameHeight) continue;
        const singleO = (ly * frameWidth + lx) * 4;
        const stripO = (ly * stripW + (stripOffsetX + lx)) * 4;
        for (let c = 0; c < 4; c++) {
          singleRgba[singleO + c] = fr.rgba[srcO + c];
          stripRgba[stripO + c] = fr.rgba[srcO + c];
        }
      }
    }

    const frameFileName = `${stripName.replace(/\.png$/, '')}_frame_${String(fi + 1).padStart(2, '0')}.png`;
    writePngFromRgba(path.join(folderDir, frameFileName), frameWidth, frameHeight, singleRgba);
    frameFiles.push(frameFileName);
  }

  const stripOutPath = path.join(folderDir, stripName);
  writePngFromRgba(stripOutPath, stripW, frameHeight, stripRgba);

  return {
    file: `/${stripOutPath.replace(/^public\//, '')}`,
    frameFiles,
    frameWidth,
    frameHeight,
    frameCount: frames.length,
    anchorX,
    anchorY,
  };
}

/**
 * Segment Specials row using core poses + Voronoi horizontal distance assignment for trailing FX pixels.
 */
function segmentSpecialRow(buf, y1, y2, excludeRects, poseBoxes, scaleFactor, keepSoftAlpha = 14) {
  return poseBoxes.map(([bx1, bx2, customPredicate]) => {
    const img = extractMaskedBox(buf, [bx1, y1, bx2, y2], keepSoftAlpha, excludeRects, customPredicate);
    return scaleImage(img, scaleFactor);
  });
}

console.log('Loading Adão source sheets...');
const basicsBuf = loadRgba(BASICS_SHEET);
const specialsBuf = loadRgba(SPECIALS_SHEET);

// ======================== BASICS SHEET EXTRACTION ========================
// Row 1: IDLE (4), ANDAR (5), CORRER (4)
const r1Excl = [[0, 0, 1535, 39]];
const r1Comps = findCoreComponents(basicsBuf, [0, 40, 1535, 248], r1Excl, 130, 1, 250);
const idleFrames = r1Comps.slice(0, 4).map((c) => componentWithEdgesToImage(basicsBuf, c, r1Comps));
const walkFrames = r1Comps.slice(4, 9).map((c) => componentWithEdgesToImage(basicsBuf, c, r1Comps));

// CORRER frames 0, 1 from r1Comps[9..10], and split r1Comps[11] diagonally between pose 2 & 3
const runPose0 = componentWithEdgesToImage(basicsBuf, r1Comps[9], r1Comps);
const runPose1 = componentWithEdgesToImage(basicsBuf, r1Comps[10], r1Comps);
// Diagonal split from (1405, 110) to (1369, 246)
const runDiagSplit = (x) => 1405 - ((x > 0 ? 0 : 0)); // helper below
const runPose2 = extractMaskedBox(
  basicsBuf,
  [1255, 55, 1412, 248],
  20,
  r1Excl,
  (x, y) => {
    // At y<=140, keep x <= 1406; between y=140..248 interpolate boundary 1406 -> 1365
    if (y <= 140) return x <= 1406;
    const splitX = 1406 - ((y - 140) / (248 - 140)) * (1406 - 1366);
    return x <= splitX;
  }
);
const runPose3 = extractMaskedBox(
  basicsBuf,
  [1365, 55, 1505, 248],
  20,
  r1Excl,
  (x, y) => {
    if (y <= 140) return x >= 1408;
    const splitX = 1406 - ((y - 140) / (248 - 140)) * (1406 - 1366);
    return x >= splitX;
  }
);
const runFrames = [runPose0, runPose1, runPose2, runPose3];

// Row 2: GUARDA (3), SOCOS (5), CHUTES (5)
const r2Excl = [[0, 250, 1535, 297]];
const r2Comps = findCoreComponents(basicsBuf, [0, 298, 1535, 502], r2Excl, 130, 1, 250);
const guardFrames = r2Comps.slice(0, 3).map((c) => componentWithEdgesToImage(basicsBuf, c, r2Comps));
const punchFrames = r2Comps.slice(3, 8).map((c) => componentWithEdgesToImage(basicsBuf, c, r2Comps));
const kickFrames = r2Comps.slice(8, 13).map((c) => componentWithEdgesToImage(basicsBuf, c, r2Comps));

// Row 3: CHUTE ALTO (3), CHUTE BAIXO (2), ESQUIVA (2), SALTO (3)
const r3Excl = [[0, 505, 1535, 551]];
const r3Comps = findCoreComponents(basicsBuf, [0, 552, 1535, 760], r3Excl, 130, 1, 250);
const highKickFrames = r3Comps.slice(0, 3).map((c) => componentWithEdgesToImage(basicsBuf, c, r3Comps));
const lowKickFrames = r3Comps.slice(3, 5).map((c) => componentWithEdgesToImage(basicsBuf, c, r3Comps));
const evadeFrames = r3Comps.slice(5, 7).map((c) => componentWithEdgesToImage(basicsBuf, c, r3Comps));
const jumpFrames = r3Comps.slice(7, 10).map((c) => componentWithEdgesToImage(basicsBuf, c, r3Comps));

// Row 4: SOCO FORTE (3), CHUTE FORTE (3), TOMBO / DERRUBADO (3), LEVANTAR (3)
const r4Excl = [
  [0, 760, 1535, 804],
  [845, 795, 1058, 822],  // TOMBO pill
  [1308, 795, 1430, 825], // LEVANTAR pill
];
const r4Comps = findCoreComponents(basicsBuf, [0, 805, 1535, 1002], r4Excl, 130, 1, 250);
const heavyPunchFrames = r4Comps.slice(0, 3).map((c) => componentWithEdgesToImage(basicsBuf, c, r4Comps));
// r4Comps[3] = Chute Forte P0; r4Comps[4] has P1 + P2 touching at x=657; r4Comps[5..7] = Tombo; r4Comps[8..10] = Levantar
const heavyKickP0 = componentWithEdgesToImage(basicsBuf, r4Comps[3], r4Comps);
const heavyKickP1 = extractMaskedBox(
  basicsBuf,
  [552, 805, 657, 998],
  20,
  r4Excl,
  (x, y) => !(y < 835 && x > 645)
);
const heavyKickP2 = extractMaskedBox(basicsBuf, [656, 805, 760, 998], 20, r4Excl);
const heavyKickFrames = [heavyKickP0, heavyKickP1, heavyKickP2];
const knockdownFrames = r4Comps.slice(5, 8).map((c) => componentWithEdgesToImage(basicsBuf, c, r4Comps));
const getupFrames = r4Comps.slice(8, 11).map((c) => componentWithEdgesToImage(basicsBuf, c, r4Comps));

// Crouch frames: reuse getup kneel (levantar frame 0) + crouch transition (levantar frame 1 -> frame 0)
const crouchFrames = [getupFrames[1], getupFrames[0]];
// Hitstun frame: Tombo frame 0 + frame 1
const hitFrames = [knockdownFrames[0], knockdownFrames[1]];

// ======================== SPECIALS SHEET EXTRACTION ========================
// Target standing body height matches Basics Idle (~201px)
// S1 standing ~144 -> scale 1.395
// S2 standing ~165 -> scale 1.218
// S3 standing ~162 -> scale 1.240
// S4 standing ~160 -> scale 1.256
const S1_SCALE = 1.395;
const S2_SCALE = 1.218;
const S3_SCALE = 1.240;
const S4_SCALE = 1.256;

// Special 1 - Jabs de Meteoro (11 frames, y=49..213 — excludes all label/description text!)
const s1Excl = [[0, 0, 1535, 48]];
const s1Frames = segmentSpecialRow(
  specialsBuf,
  49,
  213,
  s1Excl,
  [
    [22, 144, null],
    [146, 284, null],
    [286, 425, null],
    [427, 535, null],
    [558, 703, null],
    [684, 818, (x, y) => x >= 703 || y > 135],
    [802, 952, (x, y) => x <= 936 || y < 140],
    [936, 1072, (x, y) => x >= 945 || y < 145],
    [1072, 1244, (x, y) => x <= 1222 || y < 145],
    [1218, 1392, (x, y) => x <= 1350 || y < 138],
    [1349, 1524, (x, y) => x >= 1378 || y > 135],
  ],
  S1_SCALE,
  14
);

// Special 2 - Replicação Divina (7 frames, y=271..460)
const s2Excl = [[0, 218, 1535, 270]];
// Note: strip Japanese katakana ゴゴ at [273..305, 290..355] if desired? Actually katakana SFX fits S2 aesthetic, or keep clean red aura!
// Let's check exact x slices in S2:
// P0: 24..134, P1: 158..298, P2: 312..424, P3 (red aura): 430..642, P4 (ghost double): 644..818,
// P5 (purple multi-shadow trio): 836..1165, P6 (multi-shadow dash strike): 1180..1524
const s2Frames = segmentSpecialRow(
  specialsBuf,
  271,
  460,
  s2Excl,
  [
    [22, 136, null],
    [156, 300, null],
    [310, 425, null],
    [429, 642, null],
    [643, 818, null],
    [835, 1166, null],
    [1178, 1524, null],
  ],
  S2_SCALE,
  14
);

// Special 3 - Time Transcending Fist (4 frames, y=514..718, exclude header/desc y<=512)
const s3Excl = [
  [0, 460, 1535, 513],
  [418, 514, 468, 595], // detached katakana right of pose 1
  [712, 514, 795, 572], // detached katakana between pose 2 & 3
];
const s3ChargeFrames = segmentSpecialRow(
  specialsBuf,
  514,
  718,
  s3Excl,
  [
    [22, 148, null],
    [172, 418, null],
    [470, 712, null],
  ],
  S3_SCALE,
  12
);
const s3BlastFrames = segmentSpecialRow(
  specialsBuf,
  514,
  718,
  s3Excl,
  [[744, 1518, null]],
  S3_SCALE,
  12
);

// Special 4 - Machado Divino (10 frames, y=772..985, exclude subtitle y<=770)
const s4Excl = [[0, 722, 1535, 770]];
// Split S4 cleanly preserving overhanging kicking feet above adjacent poses:
const s4Frames = segmentSpecialRow(
  specialsBuf,
  771,
  985,
  s4Excl,
  [
    [16, 130, null],
    [131, 272, null],
    [273, 418, (x, y) => x <= 394 || y <= 845],
    [394, 539, (x, y) => x >= 416 || y >= 845],
    [540, 694, (x, y) => x <= 662 || y <= 858],
    [662, 822, (x, y) => x >= 694 || y >= 862],
    [814, 962, (x, y) => x <= 944 || y <= 852],
    [944, 1110, (x, y) => (x >= 962 || y >= 852) && (x <= 1098 || y <= 840)],
    [1095, 1314, (x, y) => x >= 1110 || y >= 845],
    [1296, 1524, (x, y) => x >= 1314 || y >= 940],
  ],
  S4_SCALE,
  14
);

// Victory animation: proud stance + aura surge (Idle 0 -> S2 P2 red-eye gleam -> S2 P3 crimson aura stance -> S2 P3)
const victoryFrames = [idleFrames[0], s2Frames[2], s2Frames[3], s2Frames[3]];

// ======================== WRITE FOLDERS & STRIPS ========================
const manifest = {
  character: 'adao',
  name: 'Adão',
  title: 'O Primeiro Homem',
  renderScale: 0.371,
  animations: {},
};

const addSeq = (key, folder, stripName, frames, fps, loop, fixedAnchor = false, anchorMaxSearchX = undefined) => {
  const meta = writeSequenceFolder(path.join(OUT_ROOT, folder), stripName, frames, fixedAnchor, anchorMaxSearchX);
  manifest.animations[key] = {
    key,
    file: meta.file,
    frameWidth: meta.frameWidth,
    frameHeight: meta.frameHeight,
    frameCount: meta.frameCount,
    fps,
    loop,
    anchorX: meta.anchorX,
    anchorY: meta.anchorY,
  };
};

addSeq('adao_idle', 'idle', 'strip.png', idleFrames, 7, true, false);
addSeq('adao_walk', 'walk', 'strip.png', walkFrames, 11, true, false);
addSeq('adao_run', 'run', 'strip.png', runFrames, 14, true, false);
addSeq('adao_jump', 'jump', 'strip.png', jumpFrames, 12, false, false);
addSeq('adao_guard', 'defense', 'guard_strip.png', guardFrames, 10, false, false);
addSeq('adao_crouch', 'defense', 'crouch_strip.png', crouchFrames, 10, false, false);
addSeq('adao_evade', 'defense', 'evade_strip.png', evadeFrames, 12, false, false);
addSeq('adao_hit', 'defense', 'hit_strip.png', hitFrames, 12, false, false);
addSeq('adao_knockdown', 'defense', 'knockdown_strip.png', knockdownFrames, 10, false, false);
addSeq('adao_getup', 'defense', 'getup_strip.png', getupFrames, 10, false, false);
addSeq('adao_punch', 'punch', 'punch_strip.png', punchFrames, 16, false, false);
addSeq('adao_heavy_punch', 'punch', 'heavy_punch_strip.png', heavyPunchFrames, 14, false, false);
addSeq('adao_kick', 'kick', 'kick_strip.png', kickFrames, 16, false, false);
addSeq('adao_high_kick', 'kick', 'high_kick_strip.png', highKickFrames, 15, false, false);
addSeq('adao_low_kick', 'kick', 'low_kick_strip.png', lowKickFrames, 14, false, false);
addSeq('adao_heavy_kick', 'kick', 'heavy_kick_strip.png', heavyKickFrames, 14, false, false);
addSeq('adao_special1', 'special_1_meteor_jabs', 'strip.png', s1Frames, 20, false, true);
addSeq('adao_special2', 'special_2_divine_replication', 'strip.png', s2Frames, 12, false, true);
addSeq('adao_special3_charge', 'special_3_time_transcending_fist', 'charge_strip.png', s3ChargeFrames, 8, false, true);
addSeq('adao_special3_blast', 'special_3_time_transcending_fist', 'blast_strip.png', s3BlastFrames, 12, false, true, 260);
addSeq('adao_special4', 'special_4_divine_axe', 'strip.png', s4Frames, 18, false, true);
addSeq('adao_victory', 'victory', 'strip.png', victoryFrames, 6, false, true);

// ======================== PORTRAIT GENERATION ========================
// Crop Adão's upper torso & face from IDLE frame 0 over a dark divine purple/crimson vignette
const idle0 = idleFrames[0];
const portraitPath = path.join(OUT_ROOT, 'portrait.png');
const tmpIdle0 = '.playwright-cli/_adao_idle0.png';
writePngFromRgba(tmpIdle0, idle0.w, idle0.h, idle0.rgba);
const cropW = Math.min(idle0.w, 72);
const cropH = Math.min(idle0.h, 72);
const cropX = Math.max(0, Math.round((idle0.w - cropW) / 2));
execFileSync('convert', [
  '-size', '128x128',
  'radial-gradient:#6d28d9-#0d0718',
  '(', '-background', 'none', tmpIdle0, '-crop', `${cropW}x${cropH}+${cropX}+0`, '+repage', '-resize', '124x124', ')',
  '-gravity', 'south', '-composite',
  portraitPath,
]);
fs.unlinkSync(tmpIdle0);

fs.writeFileSync(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// ======================== CONTACT SHEET FOR VISUAL INSPECTION ========================
const previewSeqs = [
  ['idle', 'strip.png'],
  ['walk', 'strip.png'],
  ['run', 'strip.png'],
  ['defense', 'guard_strip.png'],
  ['punch', 'punch_strip.png'],
  ['kick', 'kick_strip.png'],
  ['kick', 'heavy_kick_strip.png'],
  ['defense', 'knockdown_strip.png'],
  ['special_1_meteor_jabs', 'strip.png'],
  ['special_2_divine_replication', 'strip.png'],
  ['special_3_time_transcending_fist', 'charge_strip.png'],
  ['special_3_time_transcending_fist', 'blast_strip.png'],
  ['special_4_divine_axe', 'strip.png'],
];
execFileSync('montage', [
  ...previewSeqs.map(([f, n]) => path.join(OUT_ROOT, f, n)),
  '-background', '#1a1b26',
  '-tile', '1x',
  '-geometry', '+4+8',
  '.playwright-cli/adao_contact.png',
]);
console.log('Adão sprites & contact sheet generated successfully!');
