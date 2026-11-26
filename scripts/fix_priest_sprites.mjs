import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'public/assets/priest_guilherme';
const MANIFEST_PATH = path.join(DIR, 'manifest.json');

function readPngRgba(filePath) {
  const dim = execFileSync('identify', ['-format', '%wx%h', filePath]).toString().trim();
  const [w, h] = dim.split('x').map(Number);
  const buf = execFileSync('convert', [filePath, '-depth', '8', 'rgba:-'], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return { w, h, buf: new Uint8ClampedArray(buf) };
}

function writePngRgba(rgba, w, h, filePath) {
  execFileSync(
    'convert',
    ['-size', `${w}x${h}`, '-depth', '8', 'rgba:-', filePath],
    { input: Buffer.from(rgba), maxBuffer: 32 * 1024 * 1024 }
  );
}

function makeFrame(w, h) {
  return { w, h, buf: new Uint8ClampedArray(w * h * 4) };
}

function splitStrip(strip, frameWidth, frameCount) {
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const f = makeFrame(frameWidth, strip.h);
    const ox = i * frameWidth;
    for (let y = 0; y < strip.h; y++) {
      for (let x = 0; x < frameWidth; x++) {
        const si = (y * strip.w + ox + x) * 4;
        const di = (y * frameWidth + x) * 4;
        f.buf[di] = strip.buf[si];
        f.buf[di + 1] = strip.buf[si + 1];
        f.buf[di + 2] = strip.buf[si + 2];
        f.buf[di + 3] = strip.buf[si + 3];
      }
    }
    frames.push(f);
  }
  return frames;
}

function cloneFrame(f) {
  return { w: f.w, h: f.h, buf: new Uint8ClampedArray(f.buf) };
}

function clearRect(f, x1, y1, x2, y2) {
  const sx = Math.max(0, x1);
  const sy = Math.max(0, y1);
  const ex = Math.min(f.w - 1, x2);
  const ey = Math.min(f.h - 1, y2);
  for (let y = sy; y <= ey; y++) {
    for (let x = sx; x <= ex; x++) {
      const i = (y * f.w + x) * 4;
      f.buf[i] = 0;
      f.buf[i + 1] = 0;
      f.buf[i + 2] = 0;
      f.buf[i + 3] = 0;
    }
  }
}

function clearPredicate(f, fn) {
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      if (fn(x, y)) {
        const i = (y * f.w + x) * 4;
        f.buf[i] = 0;
        f.buf[i + 1] = 0;
        f.buf[i + 2] = 0;
        f.buf[i + 3] = 0;
      }
    }
  }
}

function copyPatch(src, sx1, sy1, sx2, sy2, dst, dx, dy) {
  const pw = sx2 - sx1 + 1;
  const ph = sy2 - sy1 + 1;
  // Ensure dst is wide/tall enough by returning expanded frame if needed
  const needW = Math.max(dst.w, dx + pw);
  const needH = Math.max(dst.h, dy + ph);
  let target = dst;
  if (needW > dst.w || needH > dst.h) {
    target = makeFrame(needW, needH);
    for (let y = 0; y < dst.h; y++) {
      for (let x = 0; x < dst.w; x++) {
        const si = (y * dst.w + x) * 4;
        const di = (y * needW + x) * 4;
        target.buf[di] = dst.buf[si];
        target.buf[di + 1] = dst.buf[si + 1];
        target.buf[di + 2] = dst.buf[si + 2];
        target.buf[di + 3] = dst.buf[si + 3];
      }
    }
  }
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const rx = sx1 + x;
      const ry = sy1 + y;
      if (rx < 0 || ry < 0 || rx >= src.w || ry >= src.h) continue;
      const tx = dx + x;
      const ty = dy + y;
      if (tx < 0 || ty < 0 || tx >= target.w || ty >= target.h) continue;
      const si = (ry * src.w + rx) * 4;
      const a = src.buf[si + 3];
      if (a <= 14) continue;
      const di = (ty * target.w + tx) * 4;
      const da = target.buf[di + 3];
      if (a >= da) {
        target.buf[di] = src.buf[si];
        target.buf[di + 1] = src.buf[si + 1];
        target.buf[di + 2] = src.buf[si + 2];
        target.buf[di + 3] = a;
      }
    }
  }
  return target;
}

// Alpha-blend src frame onto dst frame at (offsetX, offsetY)
function alphaOverFrame(dst, src, offsetX = 0, offsetY = 0) {
  for (let y = 0; y < src.h; y++) {
    const dy = y + offsetY;
    if (dy < 0 || dy >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const dx = x + offsetX;
      if (dx < 0 || dx >= dst.w) continue;
      const si = (y * src.w + x) * 4;
      const sa = src.buf[si + 3] / 255;
      if (sa <= 0.02) continue;
      const di = (dy * dst.w + dx) * 4;
      const da = dst.buf[di + 3] / 255;
      const outA = sa + da * (1 - sa);
      if (outA <= 0.001) continue;
      dst.buf[di] = Math.round((src.buf[si] * sa + dst.buf[di] * da * (1 - sa)) / outA);
      dst.buf[di + 1] = Math.round((src.buf[si + 1] * sa + dst.buf[di + 1] * da * (1 - sa)) / outA);
      dst.buf[di + 2] = Math.round((src.buf[si + 2] * sa + dst.buf[di + 2] * da * (1 - sa)) / outA);
      dst.buf[di + 3] = Math.round(outA * 255);
    }
  }
}

// Scale frame with bilinear-like sampling
function scaleFrame(f, scale) {
  const nw = Math.max(1, Math.round(f.w * scale));
  const nh = Math.max(1, Math.round(f.h * scale));
  const out = makeFrame(nw, nh);
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(f.h - 1, Math.max(0, y / scale));
    const y0 = Math.floor(sy);
    const y1 = Math.min(f.h - 1, y0 + 1);
    const fy = sy - y0;
    for (let x = 0; x < nw; x++) {
      const sx = Math.min(f.w - 1, Math.max(0, x / scale));
      const x0 = Math.floor(sx);
      const x1 = Math.min(f.w - 1, x0 + 1);
      const fx = sx - x0;
      const i00 = (y0 * f.w + x0) * 4;
      const i10 = (y0 * f.w + x1) * 4;
      const i01 = (y1 * f.w + x0) * 4;
      const i11 = (y1 * f.w + x1) * 4;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const a = f.buf[i00 + 3] * w00 + f.buf[i10 + 3] * w10 + f.buf[i01 + 3] * w01 + f.buf[i11 + 3] * w11;
      const di = (y * nw + x) * 4;
      if (a <= 12) {
        out.buf[di + 3] = 0;
        continue;
      }
      // Premultiplied interpolation to avoid black fringe
      let pr = 0, pg = 0, pb = 0;
      for (const [idx, w] of [[i00, w00], [i10, w10], [i01, w01], [i11, w11]]) {
        const pa = f.buf[idx + 3] * w;
        pr += f.buf[idx] * pa;
        pg += f.buf[idx + 1] * pa;
        pb += f.buf[idx + 2] * pa;
      }
      out.buf[di] = Math.round(pr / a);
      out.buf[di + 1] = Math.round(pg / a);
      out.buf[di + 2] = Math.round(pb / a);
      out.buf[di + 3] = Math.round(a);
    }
  }
  return out;
}

// Convert dark-brown / neutral gray baked background behind golden FX into smooth alpha
function keyGlowRegion(f, regionFn = null, strength = 1.0) {
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      if (regionFn && !regionFn(x, y)) continue;
      const i = (y * f.w + x) * 4;
      const aOrig = f.buf[i + 3];
      if (aOrig <= 10) continue;
      const r = f.buf[i];
      const g = f.buf[i + 1];
      const b = f.buf[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      const warmth = Math.max(0, r - b);

      // Erase muddy dark brown/olive/gray checkerboard slab pixels
      if ((max <= 116 * strength && diff <= 52) || (max <= 102 && warmth <= 62)) {
        f.buf[i] = 0;
        f.buf[i + 1] = 0;
        f.buf[i + 2] = 0;
        f.buf[i + 3] = 0;
        continue;
      }

      const signal = Math.max(max - 102, warmth * 1.15 - 24);
      if (signal <= 0) {
        f.buf[i] = 0;
        f.buf[i + 1] = 0;
        f.buf[i + 2] = 0;
        f.buf[i + 3] = 0;
      } else {
        const newA = Math.min(aOrig, Math.max(0, Math.min(255, Math.round((signal / 132) * 255))));
        if (newA <= 16) {
          f.buf[i] = 0;
          f.buf[i + 1] = 0;
          f.buf[i + 2] = 0;
          f.buf[i + 3] = 0;
        } else {
          const aNorm = Math.max(0.28, newA / 255);
          f.buf[i] = Math.max(0, Math.min(255, Math.round((r - 82 * (1 - aNorm)) / aNorm)));
          f.buf[i + 1] = Math.max(0, Math.min(255, Math.round((g - 78 * (1 - aNorm)) / aNorm)));
          f.buf[i + 2] = Math.max(0, Math.min(255, Math.round((b - 68 * (1 - aNorm)) / aNorm)));
          f.buf[i + 3] = newA;
        }
      }
    }
  }
}

// Drop disconnected tiny specks (<= maxSize pixels), keeping components >= minKeepSize
function dropSmallComponents(f, maxDropSize = 20, alphaThresh = 20) {
  const total = f.w * f.h;
  const vis = new Uint8Array(total);
  const q = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    if (vis[i] || f.buf[i * 4 + 3] <= alphaThresh) continue;
    let h = 0;
    let t = 0;
    vis[i] = 1;
    q[t++] = i;
    while (h < t) {
      const c = q[h++];
      const cx = c % f.w;
      const cy = (c - cx) / f.w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
          const ni = ny * f.w + nx;
          if (!vis[ni] && f.buf[ni * 4 + 3] > alphaThresh) {
            vis[ni] = 1;
            q[t++] = ni;
          }
        }
      }
    }
    if (t <= maxDropSize) {
      for (let k = 0; k < t; k++) {
        const p = q[k] * 4;
        f.buf[p] = 0;
        f.buf[p + 1] = 0;
        f.buf[p + 2] = 0;
        f.buf[p + 3] = 0;
      }
    }
  }
}

// Fill tiny enclosed transparent pinholes inside solid robes/armor (<= 6px, <= 4x4 box, not touching frame border)
function fillInteriorPinholes(f) {
  const total = f.w * f.h;
  const vis = new Uint8Array(total);
  const q = new Int32Array(total);
  for (let i = 0; i < total; i++) {
    if (vis[i] || f.buf[i * 4 + 3] >= 120) continue;
    let h = 0;
    let t = 0;
    vis[i] = 1;
    q[t++] = i;
    let touchesEdge = false;
    let minX = f.w, maxX = -1, minY = f.h, maxY = -1;
    while (h < t) {
      const c = q[h++];
      const cx = c % f.w;
      const cy = (c - cx) / f.w;
      if (cx === 0 || cy === 0 || cx === f.w - 1 || cy === f.h - 1) touchesEdge = true;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      const dirs = [
        cx > 0 ? c - 1 : -1,
        cx + 1 < f.w ? c + 1 : -1,
        cy > 0 ? c - f.w : -1,
        cy + 1 < f.h ? c + f.w : -1,
      ];
      for (const ni of dirs) {
        if (ni < 0 || vis[ni] || f.buf[ni * 4 + 3] >= 120) continue;
        vis[ni] = 1;
        q[t++] = ni;
      }
    }
    if (!touchesEdge && t <= 6 && (maxX - minX + 1) <= 4 && (maxY - minY + 1) <= 4) {
      for (let k = 0; k < t; k++) {
        const c = q[k];
        const cx = c % f.w;
        const cy = (c - cx) / f.w;
        let sr = 0, sg = 0, sb = 0, cnt = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= f.w || ny >= f.h) continue;
            const ni = (ny * f.w + nx) * 4;
            if (f.buf[ni + 3] >= 180) {
              sr += f.buf[ni];
              sg += f.buf[ni + 1];
              sb += f.buf[ni + 2];
              cnt++;
            }
          }
        }
        if (cnt >= 3) {
          const p = c * 4;
          f.buf[p] = Math.round(sr / cnt);
          f.buf[p + 1] = Math.round(sg / cnt);
          f.buf[p + 2] = Math.round(sb / cnt);
          f.buf[p + 3] = 255;
        }
      }
    }
  }
}

function tightBounds(f, alphaThresh = 24) {
  let minX = f.w, minY = f.h, maxX = -1, maxY = -1;
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      if (f.buf[(y * f.w + x) * 4 + 3] > alphaThresh) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { x1: 0, y1: 0, x2: f.w - 1, y2: f.h - 1, w: f.w, h: f.h };
  return { x1: minX, y1: minY, x2: maxX, y2: maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function footBottomY(f, b) {
  for (let y = b.y2; y >= b.y1; y--) {
    let opaque = 0;
    for (let x = b.x1; x <= b.x2; x++) {
      const idx = (y * f.w + x) * 4;
      const r = f.buf[idx], g = f.buf[idx + 1], bl = f.buf[idx + 2], a = f.buf[idx + 3];
      const isSoftSpark = a < 210 && r > 180 && g > 130 && bl < 90;
      if (a > 160 && !isSoftSpark) opaque++;
    }
    if (opaque >= 3) return y;
  }
  return b.y2;
}

function bodyCenterX(f, b) {
  const w = b.x2 - b.x1 + 1;
  const colWeights = new Array(w).fill(0);
  for (let x = b.x1; x <= b.x2; x++) {
    let colWeight = 0;
    for (let y = b.y1; y <= b.y2; y++) {
      const idx = (y * f.w + x) * 4;
      const r = f.buf[idx], g = f.buf[idx + 1], bl = f.buf[idx + 2], a = f.buf[idx + 3];
      if (a > 190) {
        const isBrightGoldGlow = r > 185 && g > 130 && bl < 95 && r - bl > 95;
        colWeight += isBrightGoldGlow ? 0.2 : 1;
      }
    }
    colWeights[x - b.x1] = colWeight;
  }
  const win = Math.min(28, w);
  let bestSum = -1, bestStart = 0, curSum = 0;
  for (let i = 0; i < w; i++) {
    curSum += colWeights[i];
    if (i >= win) curSum -= colWeights[i - win];
    if (i >= win - 1 && curSum > bestSum) {
      bestSum = curSum;
      bestStart = i - win + 1;
    }
  }
  let num = 0, den = 0;
  for (let i = bestStart; i < Math.min(w, bestStart + win); i++) {
    num += (b.x1 + i) * colWeights[i];
    den += colWeights[i];
  }
  return den > 0 ? Math.round(num / den) : Math.round((b.x1 + b.x2) / 2);
}

// Re-pack frames into tightly aligned horizontal sprite strip
function packFrames(frames, alignMode = 'feet', opts = {}) {
  const measured = frames.map((f) => {
    const b = tightBounds(f, 24);
    const fy = footBottomY(f, b);
    const bcx = bodyCenterX(f, b);
    return {
      f,
      ...b,
      footY: fy,
      bodyCenterX: bcx,
      leftReach: bcx - b.x1,
      rightReach: b.x2 - bcx,
    };
  });

  const maxLeftReach = Math.max(...measured.map((m) => m.leftReach)) + 4;
  const maxRightReach = Math.max(...measured.map((m) => m.rightReach)) + 4;
  const frameW = Math.ceil((maxLeftReach + maxRightReach) / 2) * 2;
  const anchorX = maxLeftReach;

  let frameH;
  let anchorY;
  const rowMinY = Math.min(...measured.map((m) => m.y1));

  if (alignMode === 'row_top') {
    const maxRelBottom = Math.max(...measured.map((m) => m.y2 - rowMinY));
    frameH = Math.ceil((maxRelBottom + 6) / 2) * 2;
    const groundedFoot = Math.max(...measured.slice(0, Math.min(3, measured.length)).map((m) => m.footY - rowMinY));
    anchorY = 3 + groundedFoot;
  } else if (alignMode === 'jump') {
    const maxH = Math.max(...measured.map((m) => m.h));
    frameH = Math.ceil((maxH + 14) / 2) * 2;
    anchorY = frameH - 4;
  } else {
    const maxAboveFoot = Math.max(...measured.map((m) => m.footY - m.y1));
    const maxBelowFoot = Math.max(...measured.map((m) => m.y2 - m.footY));
    frameH = Math.ceil((maxAboveFoot + maxBelowFoot + 6) / 2) * 2;
    anchorY = frameH - 3 - maxBelowFoot;
  }

  if (opts.minFrameH && frameH < opts.minFrameH) {
    const diff = opts.minFrameH - frameH;
    frameH = opts.minFrameH;
    anchorY += diff;
  }

  const stripW = frameW * measured.length;
  const out = new Uint8ClampedArray(stripW * frameH * 4);

  measured.forEach((m, idx) => {
    const destXStart = idx * frameW + (anchorX - m.leftReach);
    let destYStart;
    if (alignMode === 'jump') {
      // f0 rising (mid), f1 apex (top), f2 landing (bottom)
      if (idx === 0) destYStart = Math.round((frameH - m.h) * 0.45);
      else if (idx === 1) destYStart = 3;
      else destYStart = frameH - 4 - m.h;
    } else if (alignMode === 'row_top') {
      destYStart = 3 + (m.y1 - rowMinY);
    } else {
      destYStart = anchorY - (m.footY - m.y1);
    }

    for (let sy = m.y1; sy <= m.y2; sy++) {
      const dy = destYStart + (sy - m.y1);
      if (dy < 0 || dy >= frameH) continue;
      for (let sx = m.x1; sx <= m.x2; sx++) {
        const dx = destXStart + (sx - m.x1);
        if (dx < idx * frameW || dx >= (idx + 1) * frameW) continue;
        const si = (sy * m.f.w + sx) * 4;
        const a = m.f.buf[si + 3];
        if (a <= 14) continue;
        const di = (dy * stripW + dx) * 4;
        out[di] = m.f.buf[si];
        out[di + 1] = m.f.buf[si + 1];
        out[di + 2] = m.f.buf[si + 2];
        out[di + 3] = a;
      }
    }
  });

  return {
    stripW,
    frameW,
    frameH,
    anchorX,
    anchorY,
    frameCount: measured.length,
    out,
  };
}

// =========================================================================
// Load all current sequences
// =========================================================================
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const strips = {};
for (const [key, meta] of Object.entries(manifest.sequences)) {
  const img = readPngRgba(path.join(DIR, path.basename(meta.file)));
  strips[key] = splitStrip(img, meta.frameWidth, meta.frameCount);
}

// 1. IDLE (clean specks + pinholes)
for (const f of strips.idle) {
  dropSmallComponents(f, 12);
  fillInteriorPinholes(f);
}

// 2. WALK (clean specks + pinholes)
for (const f of strips.walk) {
  dropSmallComponents(f, 12);
  fillInteriorPinholes(f);
}

// 3. RUN (graft orphaned fists from f1->f0, f2->f1, f3->f2; remove orphans + specks)
{
  const [f0, f1, f2, f3] = strips.run;
  strips.run[0] = copyPatch(f1, 3, 32, 16, 45, f0, 86, 32);
  clearRect(f1, 0, 28, 17, 46);
  strips.run[1] = copyPatch(f2, 19, 32, 31, 43, f1, 83, 33);
  clearRect(f2, 0, 28, 31, 45);
  strips.run[2] = copyPatch(f3, 32, 32, 42, 44, f2, 81, 32);
  clearRect(f3, 0, 28, 42, 46);
  for (const f of strips.run) {
    dropSmallComponents(f, 20);
    fillInteriorPinholes(f);
  }
}

// 4. JUMP (remove right sliver on f1, remove left half-priest clone on f2)
{
  const [, f1, f2] = strips.jump;
  clearRect(f1, 80, 0, f1.w - 1, f1.h - 1);
  // Remove left clone in f2 carefully around the gap at x=34..40
  clearPredicate(f2, (x, y) => {
    if (y < 68 && x <= 34) return true;
    if (y >= 68 && y <= 88 && x <= 40) return true;
    return false;
  });
  for (const f of strips.jump) {
    dropSmallComponents(f, 20);
    fillInteriorPinholes(f);
  }
}

// 5. CROUCH (remove top-right circle speck on f2 + tiny specks)
for (const f of strips.crouch) {
  dropSmallComponents(f, 60);
  fillInteriorPinholes(f);
}

// 6. GETUP (keep f0's hand [43..51, 40..49], remove 1px specks, fill robe pinholes)
for (const f of strips.getup) {
  dropSmallComponents(f, 12);
  fillInteriorPinholes(f);
}

// 7. STANDUP (rebuild 3 clean frames: getup f1 -> getup f2 -> clean standup f0)
{
  const standupCleanTop = cloneFrame(strips.standup[0]);
  dropSmallComponents(standupCleanTop, 12);
  fillInteriorPinholes(standupCleanTop);
  strips.standup = [
    cloneFrame(strips.getup[1]),
    cloneFrame(strips.getup[2]),
    standupCleanTop,
  ];
}

// 8. BLOCK (pinholes + tiny specks)
for (const f of strips.block) {
  dropSmallComponents(f, 12);
  fillInteriorPinholes(f);
}

// 9. ROLL (clean f0 bottom-right, clean f1 right curve, replace truncated f2 with clean tucked recovery)
{
  const [f0, f1] = strips.roll;
  clearRect(f0, 58, 52, f0.w - 1, f0.h - 1);
  // In f1, trim stray curved robe slice on the right (x >= 63)
  clearPredicate(f1, (x, y) => (y <= 55 && x >= 62) || (y > 55 && x >= 63));
  dropSmallComponents(f0, 25);
  dropSmallComponents(f1, 25);
  fillInteriorPinholes(f0);
  fillInteriorPinholes(f1);

  // Build f2 from intact crouch f2 (complete crouched dodge recovery pose, zero truncated legs)
  const recovery = cloneFrame(strips.crouch[2]);
  dropSmallComponents(recovery, 60);
  fillInteriorPinholes(recovery);
  strips.roll[2] = recovery;
}

// 10. KNOCKDOWN (clean specks + pinholes)
for (const f of strips.knockdown) {
  dropSmallComponents(f, 12);
  fillInteriorPinholes(f);
}

// 11. PUNCH (graft f2's orphan fist onto f1 wrist, clean f2)
{
  const [, f1, f2] = strips.punch;
  strips.punch[1] = copyPatch(f2, 10, 22, 23, 31, f1, 62, 23);
  clearRect(f2, 8, 18, 25, 34);
  for (const f of strips.punch) {
    dropSmallComponents(f, 15);
    fillInteriorPinholes(f);
  }
}

// 12. HEAVY_KICK (remove left block speck on f2 + tiny specks)
{
  const f2 = strips.heavy_kick[2];
  clearRect(f2, 0, 38, 13, 55);
  for (const f of strips.heavy_kick) {
    dropSmallComponents(f, 20);
    fillInteriorPinholes(f);
  }
}

// 13. KICK (clean f1 right face fragment, replace two-clone f2 with crisp single high kick)
{
  const [f0, f1] = strips.kick;
  clearRect(f1, 83, 18, f1.w - 1, 52);
  dropSmallComponents(f0, 15);
  dropSmallComponents(f1, 20);
  fillInteriorPinholes(f0);
  fillInteriorPinholes(f1);

  // Use clean high kick from heavy_kick[2], scaled 0.94 so proportions align smoothly with kick f0/f1
  const cleanHighKick = scaleFrame(strips.heavy_kick[2], 0.94);
  dropSmallComponents(cleanHighKick, 12);
  strips.kick[2] = cleanHighKick;
}

// 14. HEAVY_PUNCH & STAFF_ATTACK (graft f1's orphan fist onto f0 wrist, clean f1)
{
  const [hp0, hp1, hp2] = strips.heavy_punch;
  strips.heavy_punch[0] = copyPatch(hp1, 3, 20, 19, 33, hp0, 70, 21);
  clearRect(hp1, 0, 18, 20, 35);
  for (const f of strips.heavy_punch) {
    dropSmallComponents(f, 15);
    fillInteriorPinholes(f);
  }

  // staff_attack[0] shares the same base pose as heavy_punch[0] (+11px left margin -> wrist at x=81)
  const [sa0] = strips.staff_attack;
  const repHp0 = strips.heavy_punch[0];
  strips.staff_attack[0] = copyPatch(repHp0, 70, 20, repHp0.w - 1, 34, sa0, 81, 20);
  for (const f of strips.staff_attack) {
    dropSmallComponents(f, 15);
    fillInteriorPinholes(f);
  }
}

// 15. STAFF_SLAM (keep f1 staff bottom tip [5..11, 68..75], remove tiny specks, remove f2 top-left crescent bleed)
{
  const [, f1, f2] = strips.staff_slam;
  dropSmallComponents(f1, 10);
  clearRect(f2, 0, 0, 33, 49);
  for (const f of strips.staff_slam) {
    dropSmallComponents(f, 10);
    fillInteriorPinholes(f);
  }
}

// 16. GRAB (clean tiny specks + pinholes)
for (const f of strips.grab) {
  dropSmallComponents(f, 12);
  fillInteriorPinholes(f);
}

// 17. THROW (remove f1 bottom-right fragment)
{
  const f1 = strips.throw[1];
  clearRect(f1, 77, 62, f1.w - 1, f1.h - 1);
  for (const f of strips.throw) {
    dropSmallComponents(f, 20);
    fillInteriorPinholes(f);
  }
}

// 18. SPECIAL_HOLY_BEAM (clean specks + pinholes)
for (const f of strips.special_holy_beam) {
  dropSmallComponents(f, 15);
  fillInteriorPinholes(f);
}

// 19. SPECIAL_HOLY_SHIELD (remove f3 left sliver + clean specks + soften top dark shield edge)
{
  const [f0, f1, f2, f3] = strips.special_holy_shield;
  clearRect(f3, 0, 0, 10, f3.h - 1);
  // Key dark muddy halo on top of shield in f2 (x >= 50, y <= 14) and f3 (x >= 46, y <= 24)
  keyGlowRegion(f2, (x, y) => x >= 50 && y <= 14, 1.0);
  keyGlowRegion(f3, (x, y) => x >= 44 && y <= 26, 1.0);
  for (const f of strips.special_holy_shield) {
    dropSmallComponents(f, 15);
    fillInteriorPinholes(f);
  }
}

// 20. SPECIAL_CELESTIAL_HAMMER (clean f1 left bleed + holes, f2 top-left crescent, composite priest into f3)
{
  const [f0, f1, f2, f3] = strips.special_celestial_hammer;
  dropSmallComponents(f0, 10);
  fillInteriorPinholes(f0);

  clearRect(f1, 0, 0, 31, f1.h - 1);
  dropSmallComponents(f1, 20);
  fillInteriorPinholes(f1);

  clearRect(f2, 0, 0, 33, 49);
  dropSmallComponents(f2, 12);
  fillInteriorPinholes(f2);

  // Clean stray left fragments and dark background in f3, then composite slamming priest (f2) behind pillars!
  clearRect(f3, 0, 0, 30, 58);
  keyGlowRegion(f3, null, 1.0);
  dropSmallComponents(f3, 20);

  // Create composite f3 canvas wide enough so slamming priest stays grounded in place and hammer pillars erupt in front
  const compF3 = makeFrame(Math.max(f3.w + 26, 116), f3.h);
  const priestSlam = cloneFrame(f2);
  // Trim upper-right floating crescent wing on f2 so f3's vertical impact pillars shine cleanly
  clearRect(priestSlam, 64, 0, priestSlam.w - 1, 52);
  alphaOverFrame(compF3, priestSlam, 0, 0);
  alphaOverFrame(compF3, f3, 24, 0);
  strips.special_celestial_hammer[3] = compF3;
}

// 21. SPECIAL_HOLY_EXPLOSION (clean f1 seam/blotches, clean f2 dark rect + composite visible casting priest)
{
  const [f0, f1, f2] = strips.special_holy_explosion;
  dropSmallComponents(f0, 15);
  fillInteriorPinholes(f0);

  // Clean dark background blotches in f1 around the burst (x >= 42)
  keyGlowRegion(f1, (x, y) => x >= 42 || y <= 26, 1.08);
  dropSmallComponents(f1, 15);
  fillInteriorPinholes(f1);

  // Clean entire dark rectangular background slab from f2 golden mandala explosion
  keyGlowRegion(f2, null, 1.08);
  dropSmallComponents(f2, 20);

  // Composite clean raised-staff casting priest (special_holy_shield f1) in front of/left-center of the mandala burst
  const caster = cloneFrame(strips.special_holy_shield[1]);
  const compF2 = makeFrame(f2.w, f2.h + 4);
  alphaOverFrame(compF2, f2, 0, 3);
  alphaOverFrame(compF2, caster, 10, compF2.h - caster.h - 2);
  strips.special_holy_explosion[2] = compF2;
}

// 22. VICTORY (strip dark brown pillar on left of f3, clean bottom-right speck)
{
  const [f0, f1, f2, f3] = strips.victory;
  dropSmallComponents(f0, 12);
  dropSmallComponents(f1, 12);
  dropSmallComponents(f2, 12);
  clearRect(f3, 104, 88, f3.w - 1, f3.h - 1);
  // Erase straight-edged brown/gold pillar rectangle on left of f3 (preserving staff & halo)
  clearPredicate(f3, (x, y) => {
    if (x <= 41) return true;
    if (y <= 43 && x <= 46) return true;
    return false;
  });
  keyGlowRegion(f3, (x, y) => x <= 48 && y <= 46, 1.0);
  for (const f of strips.victory) {
    dropSmallComponents(f, 12);
    fillInteriorPinholes(f);
  }
}

// 23. FINISHER (clean f5 dark oval, f9 dark rect + sliver, f10 dark left pillar)
{
  const fin = strips.finisher;
  for (let idx = 0; idx < fin.length; idx++) {
    const f = fin[idx];
    if (idx === 5) {
      // Remove dark gray oval above head behind golden sun star
      keyGlowRegion(f, (x, y) => y <= 55, 1.12);
    } else if (idx === 9) {
      // Remove stray sliver on left and dark brown/gray rectangle behind cross sigil
      clearRect(f, 0, 0, 54, 56);
      keyGlowRegion(f, null, 1.08);
    } else if (idx === 10) {
      // Clean dark brown background slab behind left rays/staff (same cleanup as victory f3, keeping bright rays)
      keyGlowRegion(f, (x, y) => x <= 56, 1.05);
      clearPredicate(f, (x, y) => x <= 46 && y <= 44 && f.buf[(y * f.w + x) * 4 + 3] > 0 && Math.max(f.buf[(y * f.w + x) * 4], f.buf[(y * f.w + x) * 4 + 1]) < 150);
    }
    dropSmallComponents(f, 15);
    fillInteriorPinholes(f);
  }
}

// 24. FX_PRIEST_GOLDEN_AURA (clean jagged black/dark silhouette remnants around inner cutout)
{
  const auraPath = path.join(DIR, 'fx_priest_golden_aura.png');
  const aura = readPngRgba(auraPath);
  const f = { w: aura.w, h: aura.h, buf: aura.buf };
  // Inside inner elliptical ring where priest stood, erase any dark/low-warmth remnant pixels
  const cx = 62;
  const cy = 54;
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const i = (y * f.w + x) * 4;
      const a = f.buf[i + 3];
      if (a <= 10) continue;
      const r = f.buf[i], g = f.buf[i + 1], b = f.buf[i + 2];
      const max = Math.max(r, g, b);
      const warmth = r - b;
      const dx = (x - cx) / 31;
      const dy = (y - cy) / 38;
      const r2 = dx * dx + dy * dy;
      if (r2 < 1.05 || (r2 < 1.5 && (max < 175 || warmth < 55))) {
        f.buf[i] = 0;
        f.buf[i + 1] = 0;
        f.buf[i + 2] = 0;
        f.buf[i + 3] = 0;
      } else if (max < 115 && warmth < 35) {
        f.buf[i] = 0;
        f.buf[i + 1] = 0;
        f.buf[i + 2] = 0;
        f.buf[i + 3] = 0;
      } else if (r2 < 1.5) {
        const fade = Math.max(0, Math.min(1, (r2 - 1.05) / 0.45));
        f.buf[i + 3] = Math.round(a * fade);
      }
    }
  }
  dropSmallComponents(f, 10);
  writePngRgba(f.buf, f.w, f.h, auraPath);

  // Also write checkerboard preview for aura
  const aw = f.w + 20, ah = f.h + 20;
  const ap = new Uint8ClampedArray(aw * ah * 4);
  for (let y = 0; y < ah; y++) {
    for (let x = 0; x < aw; x++) {
      const i = (y * aw + x) * 4;
      const v = ((x % 16 < 8) ^ (y % 16 < 8)) ? 44 : 28;
      ap[i] = v; ap[i + 1] = v + 3; ap[i + 2] = v + 10; ap[i + 3] = 255;
    }
  }
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const si = (y * f.w + x) * 4;
      const a = f.buf[si + 3] / 255;
      if (a <= 0) continue;
      const di = ((y + 10) * aw + (x + 10)) * 4;
      ap[di] = Math.round(f.buf[si] * a + ap[di] * (1 - a));
      ap[di + 1] = Math.round(f.buf[si + 1] * a + ap[di + 1] * (1 - a));
      ap[di + 2] = Math.round(f.buf[si + 2] * a + ap[di + 2] * (1 - a));
    }
  }
  fs.mkdirSync('.playwright-cli', { recursive: true });
  writePngRgba(ap, aw, ah, '.playwright-cli/priest_repaired_aura.png');
}

// =========================================================================
// Repack every sequence & update manifest.json
// =========================================================================
const ALIGN_MODES = {
  run: 'row_top',
  jump: 'jump',
};

const previewRows = [];
for (const [key, meta] of Object.entries(manifest.sequences)) {
  const mode = ALIGN_MODES[key] || 'feet';
  const packed = packFrames(strips[key], mode, {
    // Keep finisher at its crisp 112px height or natural height
    minFrameH: key === 'finisher' || key === 'victory' ? 112 : undefined,
  });
  const outFile = path.join(DIR, path.basename(meta.file));
  writePngRgba(packed.out, packed.stripW, packed.frameH, outFile);

  manifest.sequences[key] = {
    ...meta,
    frameWidth: packed.frameW,
    frameHeight: packed.frameH,
    frameCount: packed.frameCount,
    anchorX: packed.anchorX,
    anchorY: packed.anchorY,
  };
  previewRows.push({
    key,
    w: packed.stripW,
    h: packed.frameH,
    frameW: packed.frameW,
    anchorX: packed.anchorX,
    anchorY: packed.anchorY,
    buf: packed.out,
  });
}

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

// Build crisp 2x visual verification contact sheet (excluding finisher in sheet1, putting finisher separately)
const mainRows = previewRows.filter((r) => r.key !== 'finisher');
const scale = 2;
const pad = 10;
const sheetW = Math.max(...mainRows.map((r) => r.w * scale + pad * 2));
const sheetH = mainRows.reduce((acc, r) => acc + r.h * scale + pad, pad);
const sheet = new Uint8ClampedArray(sheetW * sheetH * 4);
for (let y = 0; y < sheetH; y++) {
  for (let x = 0; x < sheetW; x++) {
    const i = (y * sheetW + x) * 4;
    const isLight = (x % 16 < 8) ^ (y % 16 < 8);
    const v = isLight ? 44 : 28;
    sheet[i] = v;
    sheet[i + 1] = v + 3;
    sheet[i + 2] = v + 10;
    sheet[i + 3] = 255;
  }
}
let curY = pad;
for (const row of mainRows) {
  for (let y = 0; y < row.h; y++) {
    for (let x = 0; x < row.w; x++) {
      const si = (y * row.w + x) * 4;
      const a = row.buf[si + 3] / 255;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const dx = pad + x * scale + sx;
          const dy = curY + y * scale + sy;
          const di = (dy * sheetW + dx) * 4;
          if (a > 0) {
            sheet[di] = Math.round(row.buf[si] * a + sheet[di] * (1 - a));
            sheet[di + 1] = Math.round(row.buf[si + 1] * a + sheet[di + 1] * (1 - a));
            sheet[di + 2] = Math.round(row.buf[si + 2] * a + sheet[di + 2] * (1 - a));
          }
          if (x % row.frameW === 0 && sx === 0) {
            sheet[di] = 240;
            sheet[di + 1] = 80;
            sheet[di + 2] = 80;
          }
          if ((x % row.frameW === row.anchorX && sx === 0) || (y === row.anchorY && sy === 0)) {
            if (a === 0) {
              sheet[di] = 60;
              sheet[di + 1] = 180;
              sheet[di + 2] = 255;
            }
          }
        }
      }
    }
  }
  curY += row.h * scale + pad;
}
fs.mkdirSync('.playwright-cli', { recursive: true });
writePngRgba(sheet, sheetW, sheetH, '.playwright-cli/priest_repaired_sheet.png');

// Finisher sheet
const finRow = previewRows.find((r) => r.key === 'finisher');
const finCols = 6;
const finRows = 2;
const fw = finRow.frameW;
const fh = finRow.h;
const fOutW = finCols * fw;
const fOutH = finRows * fh;
const fOut = new Uint8ClampedArray(fOutW * fOutH * 4);
for (let y = 0; y < fOutH; y++) {
  for (let x = 0; x < fOutW; x++) {
    const i = (y * fOutW + x) * 4;
    const isLight = (x % 16 < 8) ^ (y % 16 < 8);
    const v = isLight ? 44 : 28;
    fOut[i] = v;
    fOut[i + 1] = v + 3;
    fOut[i + 2] = v + 10;
    fOut[i + 3] = 255;
  }
}
for (let f = 0; f < 11; f++) {
  const row = Math.floor(f / finCols);
  const col = f % finCols;
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const si = (y * finRow.w + f * fw + x) * 4;
      const a = finRow.buf[si + 3] / 255;
      if (a <= 0) continue;
      const di = ((row * fh + y) * fOutW + (col * fw + x)) * 4;
      fOut[di] = Math.round(finRow.buf[si] * a + fOut[di] * (1 - a));
      fOut[di + 1] = Math.round(finRow.buf[si + 1] * a + fOut[di + 1] * (1 - a));
      fOut[di + 2] = Math.round(finRow.buf[si + 2] * a + fOut[di + 2] * (1 - a));
    }
  }
}
writePngRgba(fOut, fOutW, fOutH, '.playwright-cli/priest_repaired_finisher.png');

console.log('Repaired all 24 Priest sequences + fx_priest_golden_aura!');
for (const r of previewRows) {
  console.log(r.key.padEnd(26), `${r.frameW}x${r.h}`, `anchor=(${r.anchorX},${r.anchorY})`);
}
