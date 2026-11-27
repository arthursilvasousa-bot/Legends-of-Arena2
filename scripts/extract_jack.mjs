import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BASICS_SHEET = 'public/assets/aistudio/Imagem_do_ChatGPT_27_de_nov._de_2026__11_06_50_577f610d.png';
const PORTRAIT_SRC = 'public/assets/aistudio/Imagem_do_ChatGPT_27_de_nov._de_2026__11_06_56_fde0e840.webp';
const SPECIALS_SHEET = 'public/assets/aistudio/Imagem_do_ChatGPT_27_de_nov._de_2026__11_07_10_592b7ee3.png';
const OUT_ROOT = 'public/assets/jack_estripador';

const W = 1536;
const H = 1024;
const TARGET_STANDING_H = 156;

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

function findCoreComponents(buf, region, excludeRects = [], coreAlpha = 180, radius = 1, minPixels = 250, extraFilter = null) {
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

function componentWithEdgesToImage(buf, compsInput, allCompsInRegion = null, minAlpha = 18, padMargin = 8, extraFilter = null) {
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
    const srcO = ni * 4;
    const a = buf[srcO + 3];
    if (extraFilter && !extraFilter(gx, gy, buf[srcO], buf[srcO + 1], buf[srcO + 2], a)) continue;
    const dx = gx - minX;
    const dy = gy - minY;
    const dstO = (dy * w + dx) * 4;
    rgba[dstO] = buf[srcO];
    rgba[dstO + 1] = buf[srcO + 1];
    rgba[dstO + 2] = buf[srcO + 2];
    rgba[dstO + 3] = a >= 244 ? 255 : a;
  }
  return { w, h, rgba, srcMinX: minX, srcMaxX: maxX, srcMinY: minY, srcMaxY: maxY };
}

function extractMaskedBox(buf, box, minAlpha = 14, excludeRects = [], customKeep = null) {
  const [x1, y1, x2, y2] = box;
  let minX = x2, maxX = x1, minY = y2, maxY = y1;
  const pixels = [];
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (inRects(x, y, excludeRects)) continue;
      if (customKeep && !customKeep(x, y, buf[(y * W + x) * 4], buf[(y * W + x) * 4 + 1], buf[(y * W + x) * 4 + 2], buf[(y * W + x) * 4 + 3])) continue;
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

function removeIsolatedDots(img, minCluster = 14) {
  const { w, h, rgba } = img;
  const fg = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (rgba[i * 4 + 3] >= 20) fg[i] = 1;
  }
  const vis = new Uint8Array(w * h);
  const out = Buffer.from(rgba);
  for (let i = 0; i < w * h; i++) {
    if (!fg[i] || vis[i]) continue;
    const q = [i];
    vis[i] = 1;
    let head = 0;
    while (head < q.length) {
      const c = q[head++];
      const cx = c % w;
      const cy = (c / w) | 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const ni = ny * w + nx;
            if (fg[ni] && !vis[ni]) {
              vis[ni] = 1;
              q.push(ni);
            }
          }
        }
      }
    }
    if (q.length < minCluster) {
      for (const p of q) {
        out[p * 4] = 0;
        out[p * 4 + 1] = 0;
        out[p * 4 + 2] = 0;
        out[p * 4 + 3] = 0;
      }
    }
  }
  return { ...img, rgba: out };
}

function trimTransparent(img) {
  const { w, h, rgba } = img;
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] >= 12) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return img;
  const nw = maxX - minX + 1;
  const nh = maxY - minY + 1;
  const out = Buffer.alloc(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sO = ((y + minY) * w + (x + minX)) * 4;
      const dO = (y * nw + x) * 4;
      out[dO] = rgba[sO];
      out[dO + 1] = rgba[sO + 1];
      out[dO + 2] = rgba[sO + 2];
      out[dO + 3] = rgba[sO + 3];
    }
  }
  return { w: nw, h: nh, rgba: out };
}

function scaleImage(img, scale) {
  if (Math.abs(scale - 1) < 0.002) return img;
  const nw = Math.max(1, Math.round(img.w * scale));
  const nh = Math.max(1, Math.round(img.h * scale));
  const tmpIn = '.playwright-cli/_jack_in.rgba';
  const tmpOut = '.playwright-cli/_jack_out.rgba';
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
  const tmpRaw = '.playwright-cli/_jack_write.rgba';
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
 * Anchor horizontally by feet / lower legs center-of-mass (excluding wide trailing capes/blood/slashes).
 */
function computeBodyAnchorX(img) {
  const startY = Math.floor(img.h * 0.45);
  let sumX = 0;
  let totalW = 0;
  for (let y = startY; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const o = (y * img.w + x) * 4;
      const a = img.rgba[o + 3];
      if (a >= 195) {
        const r = img.rgba[o], g = img.rgba[o + 1], b = img.rgba[o + 2];
        // De-weight very bright silver/white slash arcs & vivid red blood droplets
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const isBrightArc = minC > 195;
        const isCrimsonFx = r > 140 && g < 45 && b < 45;
        const w = isBrightArc || isCrimsonFx ? 0.08 : 1;
        sumX += x * w;
        totalW += w;
      }
    }
  }
  if (totalW > 10) return Math.round(sumX / totalW);
  return Math.round(img.w / 2);
}

function writeSequenceFolder(folderDir, frames, fps, loop, fixedAnchorAlign = true, impactFrame = null) {
  fs.mkdirSync(folderDir, { recursive: true });
  const anchors = frames.map((fr) =>
    fixedAnchorAlign ? computeBodyAnchorX(fr) : Math.round(fr.w / 2)
  );
  const maxLeft = fixedAnchorAlign
    ? Math.max(...frames.map((fr, i) => anchors[i]))
    : Math.max(...frames.map((fr) => Math.ceil(fr.w / 2)));
  const maxRight = fixedAnchorAlign
    ? Math.max(...frames.map((fr, i) => fr.w - anchors[i]))
    : Math.max(...frames.map((fr) => Math.ceil(fr.w / 2)));
  const maxH = Math.max(...frames.map((f) => f.h));

  const padX = 6;
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

    const frameFileName = `frame_${String(fi + 1).padStart(3, '0')}.png`;
    writePngFromRgba(path.join(folderDir, frameFileName), frameWidth, frameHeight, singleRgba);
    frameFiles.push(frameFileName);
  }

  const stripOutPath = path.join(folderDir, 'strip.png');
  writePngFromRgba(stripOutPath, stripW, frameHeight, stripRgba);

  return {
    file: `/${stripOutPath.replace(/^public\//, '')}`,
    frames: frameFiles.map((f) => `/${path.join(folderDir, f).replace(/^public\//, '')}`),
    frameWidth,
    frameHeight,
    frameCount: frames.length,
    fps,
    duration: Number((frames.length / fps).toFixed(3)),
    loop,
    anchorX,
    anchorY,
    impactFrame,
  };
}

function writeFxSprite(outFile, img) {
  const cleaned = trimTransparent(removeIsolatedDots(img, 10));
  writePngFromRgba(outFile, cleaned.w, cleaned.h, cleaned.rgba);
  return { file: `/${outFile.replace(/^public\//, '')}`, width: cleaned.w, height: cleaned.h };
}

console.log('Loading Jack Estripador official source sheets...');
const basicsBuf = loadRgba(BASICS_SHEET);
const specialsBuf = loadRgba(SPECIALS_SHEET);

// ==================== 1. BASICS SHEET EXTRACTION ====================
// Row 1: Andando (8 frames) + Correndo (7 frames)
const r1Excl = [[0, 0, 1535, 41]];
const r1WalkComps = findCoreComponents(basicsBuf, [0, 42, 770, 196], r1Excl, 180, 1, 500);
if (r1WalkComps.length !== 8) throw new Error(`Expected 8 walk comps, got ${r1WalkComps.length}`);
const walkRaw = r1WalkComps.map((c) => componentWithEdgesToImage(basicsBuf, c, r1WalkComps, 18, 6));

// Run: pose 0 & pose 1 touch around x=918; poses 2..6 are separate components
const r1RunComps = findCoreComponents(basicsBuf, [775, 42, 1535, 198], r1Excl, 180, 1, 500);
if (r1RunComps.length !== 6) throw new Error(`Expected 6 run comps (0+1 merged + 2..6), got ${r1RunComps.length}`);
const run0 = removeIsolatedDots(
  extractMaskedBox(basicsBuf, [784, 48, 926, 196], 18, r1Excl, (x, y) =>
    y < 108 ? x <= 926 : y < 130 ? x <= 913 : x <= 906
  )
);
const run1 = removeIsolatedDots(
  extractMaskedBox(basicsBuf, [908, 48, 1024, 196], 18, r1Excl, (x, y) => {
    const leftOk = y < 108 ? x >= 927 : y < 130 ? x >= 914 : x >= 909;
    const rightOk = y < 126 ? x <= 1022 : x <= 1003;
    return leftOk && rightOk;
  })
);
const runRest = r1RunComps.slice(1).map((c) => componentWithEdgesToImage(basicsBuf, c, r1RunComps, 18, 6));
const runRaw = [run0, run1, ...runRest];

const R1_SCALE = TARGET_STANDING_H / 146;
const walkFrames = walkRaw.map((f) => scaleImage(removeIsolatedDots(f, 16), R1_SCALE));
const runFrames = runRaw.map((f) => scaleImage(removeIsolatedDots(f, 16), R1_SCALE));

// Row 2: Levantando (6 frames) + Derrubado (5 frames)
const r2Excl = [[0, 198, 1535, 243]];
const r2GetupComps = findCoreComponents(basicsBuf, [0, 238, 750, 386], r2Excl, 180, 1, 500);
const r2DownComps = findCoreComponents(basicsBuf, [755, 238, 1535, 386], r2Excl, 180, 1, 500);
if (r2GetupComps.length !== 6) throw new Error(`Expected 6 getup comps, got ${r2GetupComps.length}`);
if (r2DownComps.length !== 5) throw new Error(`Expected 5 knockdown comps, got ${r2DownComps.length}`);
const R2_SCALE = TARGET_STANDING_H / 137;
const getupFrames = r2GetupComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(basicsBuf, c, r2GetupComps, 18, 6), 16), R2_SCALE));
const knockdownFrames = r2DownComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(basicsBuf, c, r2DownComps, 18, 6), 16), R2_SCALE));

// Row 3: Soco (6 frames, frame 6 + crescent arc) + Chute (6 frames, frame 6 + crescent arc)
const r3Excl = [[0, 390, 1535, 427]];
const r3SocoComps = findCoreComponents(basicsBuf, [0, 427, 760, 576], r3Excl, 180, 1, 500);
const r3ChuteComps = findCoreComponents(basicsBuf, [760, 427, 1535, 576], r3Excl, 180, 1, 500);
if (r3SocoComps.length !== 7) throw new Error(`Expected 7 soco comps (6 + arc), got ${r3SocoComps.length}`);
if (r3ChuteComps.length !== 7) throw new Error(`Expected 7 chute comps (6 + arc), got ${r3ChuteComps.length}`);
const R3_SCALE = TARGET_STANDING_H / 137;
const punchFrames = [
  ...r3SocoComps.slice(0, 5).map((c) => componentWithEdgesToImage(basicsBuf, c, r3SocoComps, 16, 6)),
  componentWithEdgesToImage(basicsBuf, [r3SocoComps[5], r3SocoComps[6]], r3SocoComps, 16, 6),
].map((f) => scaleImage(removeIsolatedDots(f, 14), R3_SCALE));
const kickFrames = [
  ...r3ChuteComps.slice(0, 5).map((c) => componentWithEdgesToImage(basicsBuf, c, r3ChuteComps, 16, 6)),
  componentWithEdgesToImage(basicsBuf, [r3ChuteComps[5], r3ChuteComps[6]], r3ChuteComps, 16, 6),
].map((f) => scaleImage(removeIsolatedDots(f, 14), R3_SCALE));

// Row 4: Agachar (4 frames) + Pular (6 frames)
const r4Excl = [[0, 585, 1535, 628]];
const r4CrouchComps = findCoreComponents(basicsBuf, [0, 626, 520, 774], r4Excl, 180, 1, 500);
const r4JumpComps = findCoreComponents(basicsBuf, [760, 610, 1535, 774], r4Excl, 180, 1, 500);
if (r4CrouchComps.length !== 4) throw new Error(`Expected 4 crouch comps, got ${r4CrouchComps.length}`);
if (r4JumpComps.length !== 6) throw new Error(`Expected 6 jump comps, got ${r4JumpComps.length}`);
const R4_SCALE = TARGET_STANDING_H / 139;
const crouchAllFrames = r4CrouchComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(basicsBuf, c, r4CrouchComps, 18, 6), 16), R4_SCALE));
const jumpFrames = r4JumpComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(basicsBuf, c, r4JumpComps, 18, 6), 16), R4_SCALE));

// Row 5: Vitória (7 frames)
const r5Excl = [[0, 770, 1535, 818]];
const r5VicComps = findCoreComponents(basicsBuf, [0, 812, 1020, 1005], r5Excl, 180, 1, 500);
if (r5VicComps.length !== 7) throw new Error(`Expected 7 victory comps, got ${r5VicComps.length}`);
const R5_SCALE = TARGET_STANDING_H / 172;
const victoryFrames = r5VicComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(basicsBuf, c, r5VicComps, 18, 6), 16), R5_SCALE));

// ==================== 2. SPECIALS SHEET EXTRACTION ====================
// Special 1 — Lançar Facas (7 character poses + knife FX)
const s1Excl = [[0, 0, 1535, 40]];
const s1PoseComps = findCoreComponents(specialsBuf, [0, 42, 765, 224], s1Excl, 180, 1, 500);
if (s1PoseComps.length !== 7) throw new Error(`Expected 7 S1 pose comps, got ${s1PoseComps.length}`);
const S1_SCALE = TARGET_STANDING_H / 155;
const special1Frames = s1PoseComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(specialsBuf, c, s1PoseComps, 16, 6), 14), S1_SCALE));

// Knife FX assets from S1 right side
const knifeSingleRaw = extractMaskedBox(specialsBuf, [952, 66, 1074, 92], 14, s1Excl);
const knifeTrailRaw = extractMaskedBox(specialsBuf, [1175, 45, 1320, 84], 12, s1Excl);
const knifeBurstRaw = extractMaskedBox(specialsBuf, [1335, 36, 1528, 224], 12, s1Excl);

// Special 2 — Olho da Alma (3 character standing poses + 4 red-eye vortex FX)
const s2Excl = [[0, 224, 1535, 260]];
const s2PoseComps = findCoreComponents(specialsBuf, [0, 264, 342, 430], s2Excl, 180, 1, 500);
if (s2PoseComps.length !== 3) throw new Error(`Expected 3 S2 pose comps, got ${s2PoseComps.length}`);
const S2_SCALE = TARGET_STANDING_H / 152;
const s2Standing = s2PoseComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(specialsBuf, c, s2PoseComps, 16, 6), 14), S2_SCALE));

// Calm idle breathing loop & Soul Eye cast sequence
const idleFrames = [s2Standing[0], s2Standing[1], s2Standing[2], s2Standing[1]];
const special2Frames = [s2Standing[0], s2Standing[1], s2Standing[2]];

// Soul Eye FX (4 blood-red eye vortices)
const soulEyeFxFrames = [
  extractMaskedBox(specialsBuf, [798, 264, 992, 436], 14, s2Excl),
  extractMaskedBox(specialsBuf, [1002, 260, 1198, 438], 14, s2Excl),
  extractMaskedBox(specialsBuf, [1202, 260, 1344, 438], 14, s2Excl),
  extractMaskedBox(specialsBuf, [1345, 260, 1532, 438], 14, s2Excl),
].map((f) => removeIsolatedDots(f, 8));

// Special 3 — Tesoura Gigante (9 character poses + giant scissors + spin slash FX)
const s3Excl = [[0, 434, 1535, 468]];
// Body cores have n >= 7000; FX fragments have n < 2300
const s3BodyComps = findCoreComponents(specialsBuf, [0, 468, 1223, 686], s3Excl, 180, 1, 2500);
if (s3BodyComps.length !== 8) throw new Error(`Expected 8 S3 pose comps (P1+P2 merged), got ${s3BodyComps.length}`);
const s3P0 = componentWithEdgesToImage(specialsBuf, s3BodyComps[0], s3BodyComps, 14, 6);
const s3P1 = extractMaskedBox(specialsBuf, [122, 468, 234, 672], 14, s3Excl, (x) => x <= 234);
const s3P2 = extractMaskedBox(specialsBuf, [235, 468, 369, 672], 14, s3Excl, (x) => x >= 235);
const s3Rest = s3BodyComps.slice(2).map((c) => componentWithEdgesToImage(specialsBuf, c, s3BodyComps, 14, 3));
const S3_SCALE = TARGET_STANDING_H / 143;
const special3Frames = [s3P0, s3P1, s3P2, ...s3Rest].map((f) => scaleImage(removeIsolatedDots(f, 14), S3_SCALE));

// Separate Giant Scissors & Crouching Spin Slash FX from S3 right side
const scissorsOpenRaw = extractMaskedBox(
  specialsBuf,
  [1220, 468, 1362, 622],
  14,
  s3Excl,
  (x, y) => y <= 570 || (x >= 1244 && x <= 1308 && y <= 622)
);
const scissorsClosedRaw = extractMaskedBox(
  specialsBuf,
  [1366, 465, 1528, 597],
  14,
  s3Excl,
  (x, y) => (y <= 574 || (x <= 1506 && y <= 597)) && !(x <= 1410 && y >= 578)
);
const scissorSpinSlashRaw = extractMaskedBox(
  specialsBuf,
  [1220, 574, 1528, 692],
  12,
  s3Excl,
  (x, y) => !(x >= 1242 && x <= 1312 && y <= 622) && !(x >= 1372 && x <= 1510 && y <= 598)
);

// Special 4 — Mãos de Deus (6 character poses + 4 crimson blood FX)
const s4Excl = [[0, 692, 1535, 728]];
const s4PoseComps = findCoreComponents(specialsBuf, [0, 704, 895, 990], s4Excl, 180, 1, 2500);
if (s4PoseComps.length !== 6) throw new Error(`Expected 6 S4 pose comps, got ${s4PoseComps.length}`);
const S4_SCALE = TARGET_STANDING_H / 176;
const special4Frames = s4PoseComps.map((c) => scaleImage(removeIsolatedDots(componentWithEdgesToImage(specialsBuf, c, s4PoseComps, 14, 4), 12), S4_SCALE));

const bloodSplatterRaw = extractMaskedBox(specialsBuf, [870, 710, 1000, 988], 12, s4Excl);
const bloodWaveRaw = extractMaskedBox(specialsBuf, [1008, 710, 1216, 950], 12, s4Excl);
const bloodSplashRaw = extractMaskedBox(specialsBuf, [1220, 700, 1394, 988], 12, s4Excl);
const bloodEruptionRaw = extractMaskedBox(specialsBuf, [1394, 735, 1532, 988], 12, s4Excl);

// Composite derived standard fighting sequences (exact design, zero missing animations)
const crouchFrames = [crouchAllFrames[1], crouchAllFrames[2], crouchAllFrames[3]];
const standupFrames = [crouchAllFrames[2], crouchAllFrames[1], crouchAllFrames[0]];
const blockFrames = [punchFrames[1], punchFrames[2]];
const dodgeFrames = [jumpFrames[0], crouchAllFrames[2]];
const hitstunFrames = [knockdownFrames[0], knockdownFrames[1]];
const heavyPunchFrames = [punchFrames[0], punchFrames[3], punchFrames[4], punchFrames[5]];
const heavyKickFrames = [kickFrames[0], kickFrames[3], kickFrames[4], kickFrames[5]];
const crouchKickFrames = [crouchAllFrames[2], kickFrames[4]];
const comboFrames = [punchFrames[3], punchFrames[4], punchFrames[5], kickFrames[4], kickFrames[5]];

// ==================== 3. WRITE ORGANIZED ASSET TREE ====================
fs.rmSync(OUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUT_ROOT, { recursive: true });

const manifest = {
  character: 'jack',
  name: 'Jack Estripador',
  title: 'O Cavalheiro da Névoa',
  renderScale: 0.485,
  animations: {},
  effects: {},
  portrait: '/assets/jack_estripador/portrait/portrait.png',
};

const addSeq = (key, folder, frames, fps, loop, fixedAnchor = true, impactFrame = null) => {
  manifest.animations[key] = writeSequenceFolder(
    path.join(OUT_ROOT, folder),
    frames,
    fps,
    loop,
    fixedAnchor,
    impactFrame
  );
};

// Movement & defense: 9–12 FPS
addSeq('idle', 'idle', idleFrames, 9, true, true);
addSeq('walk', 'walk', walkFrames, 11, true, true);
addSeq('run', 'run', runFrames, 12, true, true);
addSeq('jump', 'jump', jumpFrames, 11, false, true);
addSeq('crouch', 'crouch', crouchFrames, 11, false, true);
addSeq('standup', 'standup', standupFrames, 12, false, true);
addSeq('block', 'block', blockFrames, 10, false, true);
addSeq('dodge', 'dodge', dodgeFrames, 12, false, true);
addSeq('hitstun', 'hitstun', hitstunFrames, 12, false, true);
addSeq('knockdown', 'knockdown', knockdownFrames, 11, false, true);
addSeq('getup', 'getup', getupFrames, 12, false, true);
addSeq('victory', 'victory', victoryFrames, 10, false, true);

// Punches, kicks & combos: 12–15 FPS
addSeq('punch', 'punch', punchFrames, 15, false, true, 4);
addSeq('heavy_punch', 'heavy_punch', heavyPunchFrames, 14, false, true, 3);
addSeq('kick', 'kick', kickFrames, 15, false, true, 4);
addSeq('heavy_kick', 'heavy_kick', heavyKickFrames, 14, false, true, 3);
addSeq('crouch_kick', 'crouch_kick', crouchKickFrames, 13, false, true, 1);
addSeq('combo', 'combo', comboFrames, 15, false, true, 4);

// Specials: 15–20 FPS
addSeq('special1_knives', 'special_1_knives', special1Frames, 18, false, true, 4);
addSeq('special2_soul_eye', 'special_2_soul_eye', special2Frames, 15, false, true, 1);
addSeq('special3_giant_scissors', 'special_3_giant_scissors', special3Frames, 18, false, true, 3);
addSeq('special4_gods_hands', 'special_4_gods_hands', special4Frames, 16, false, true, 4);

// Independent FX layers: 18–24 FPS
const fxDir = path.join(OUT_ROOT, 'effects');
manifest.effects.knife_single = writeFxSprite(path.join(fxDir, 'knife_single.png'), knifeSingleRaw);
manifest.effects.knife_trail = writeFxSprite(path.join(fxDir, 'knife_trail.png'), knifeTrailRaw);
manifest.effects.knife_burst = writeFxSprite(path.join(fxDir, 'knife_burst.png'), knifeBurstRaw);
manifest.effects.soul_eye_strip = writeSequenceFolder(path.join(fxDir, 'soul_eye'), soulEyeFxFrames, 18, false, false, 1);
manifest.effects.giant_scissors_open = writeFxSprite(path.join(fxDir, 'giant_scissors_open.png'), scissorsOpenRaw);
manifest.effects.giant_scissors_closed = writeFxSprite(path.join(fxDir, 'giant_scissors_closed.png'), scissorsClosedRaw);
manifest.effects.scissor_spin_slash = writeFxSprite(path.join(fxDir, 'scissor_spin_slash.png'), scissorSpinSlashRaw);
manifest.effects.blood_splatter = writeFxSprite(path.join(fxDir, 'blood_splatter.png'), bloodSplatterRaw);
manifest.effects.blood_wave = writeFxSprite(path.join(fxDir, 'blood_wave.png'), bloodWaveRaw);
manifest.effects.blood_splash = writeFxSprite(path.join(fxDir, 'blood_splash.png'), bloodSplashRaw);
manifest.effects.blood_eruption = writeFxSprite(path.join(fxDir, 'blood_eruption.png'), bloodEruptionRaw);

// Official Portrait (cropped cleanly from official ref 736x981 -> 240x240 PNG)
const portraitOut = path.join(OUT_ROOT, 'portrait', 'portrait.png');
fs.mkdirSync(path.dirname(portraitOut), { recursive: true });
execFileSync('convert', [
  PORTRAIT_SRC,
  '-crop', '736x736+0+10',
  '+repage',
  '-resize', '240x240',
  portraitOut,
]);

fs.writeFileSync(path.join(OUT_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

// Contact Sheets for visual inspection
execFileSync('montage', [
  path.join(OUT_ROOT, 'idle', 'strip.png'),
  path.join(OUT_ROOT, 'walk', 'strip.png'),
  path.join(OUT_ROOT, 'run', 'strip.png'),
  path.join(OUT_ROOT, 'punch', 'strip.png'),
  path.join(OUT_ROOT, 'kick', 'strip.png'),
  path.join(OUT_ROOT, 'crouch', 'strip.png'),
  path.join(OUT_ROOT, 'jump', 'strip.png'),
  path.join(OUT_ROOT, 'knockdown', 'strip.png'),
  path.join(OUT_ROOT, 'getup', 'strip.png'),
  path.join(OUT_ROOT, 'victory', 'strip.png'),
  '-background', '#1a1b26',
  '-tile', '1x',
  '-geometry', '+4+8',
  '.playwright-cli/jack_anims_check.png',
]);

execFileSync('montage', [
  path.join(OUT_ROOT, 'special_1_knives', 'strip.png'),
  path.join(OUT_ROOT, 'special_2_soul_eye', 'strip.png'),
  path.join(OUT_ROOT, 'special_3_giant_scissors', 'strip.png'),
  path.join(OUT_ROOT, 'special_4_gods_hands', 'strip.png'),
  path.join(OUT_ROOT, 'effects', 'soul_eye', 'strip.png'),
  path.join(OUT_ROOT, 'effects', 'giant_scissors_open.png'),
  path.join(OUT_ROOT, 'effects', 'giant_scissors_closed.png'),
  path.join(OUT_ROOT, 'effects', 'scissor_spin_slash.png'),
  path.join(OUT_ROOT, 'effects', 'blood_wave.png'),
  path.join(OUT_ROOT, 'effects', 'blood_splatter.png'),
  path.join(OUT_ROOT, 'effects', 'blood_eruption.png'),
  path.join(OUT_ROOT, 'effects', 'knife_burst.png'),
  portraitOut,
  '-background', '#1a1b26',
  '-tile', '1x',
  '-geometry', '+4+8',
  '.playwright-cli/jack_fx_check.png',
]);

console.log('Jack Estripador sprites, FX & manifest extracted successfully!');
