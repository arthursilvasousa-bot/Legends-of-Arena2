import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SHEET1 = 'public/assets/aistudio/Folha_de_Sprites_do_Lutador_Mascarado_2e4e0448.png';
const SHEET2 = 'public/assets/aistudio/Sprite_Sheet_de_Habilidades_Urbanas_c821c134.png';
const OUT_ANIM_DIR = 'public/assets/dono/animations';
const MANIFEST_PATH = 'public/assets/dono/manifest.json';

const W = 1536;
const H = 1024;

function loadRgba(file) {
  return execFileSync('convert', [file, '-depth', '8', 'rgba:-'], {
    maxBuffer: 64 * 1024 * 1024,
  });
}

function isCheckerPixel(buf, idx) {
  const o = idx * 4;
  const r = buf[o];
  const g = buf[o + 1];
  const b = buf[o + 2];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mn >= 180 && mx - mn <= 24;
}

function computeOuterBackground(buf) {
  const bg = new Uint8Array(W * H);
  const q = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  for (let x = 0; x < W; x++) {
    for (const y of [0, H - 1]) {
      const i = y * W + x;
      if (!bg[i] && isCheckerPixel(buf, i)) {
        bg[i] = 1;
        q[tail++] = i;
      }
    }
  }
  for (let y = 0; y < H; y++) {
    for (const x of [0, W - 1]) {
      const i = y * W + x;
      if (!bg[i] && isCheckerPixel(buf, i)) {
        bg[i] = 1;
        q[tail++] = i;
      }
    }
  }
  while (head < tail) {
    const c = q[head++];
    const x = c % W;
    const y = (c / W) | 0;
    if (x > 0) {
      const ni = c - 1;
      if (!bg[ni] && isCheckerPixel(buf, ni)) {
        bg[ni] = 1;
        q[tail++] = ni;
      }
    }
    if (x + 1 < W) {
      const ni = c + 1;
      if (!bg[ni] && isCheckerPixel(buf, ni)) {
        bg[ni] = 1;
        q[tail++] = ni;
      }
    }
    if (y > 0) {
      const ni = c - W;
      if (!bg[ni] && isCheckerPixel(buf, ni)) {
        bg[ni] = 1;
        q[tail++] = ni;
      }
    }
    if (y + 1 < H) {
      const ni = c + W;
      if (!bg[ni] && isCheckerPixel(buf, ni)) {
        bg[ni] = 1;
        q[tail++] = ni;
      }
    }
  }
  return bg;
}

function inRects(x, y, rects) {
  for (const [rx1, ry1, rx2, ry2] of rects) {
    if (x >= rx1 && x <= rx2 && y >= ry1 && y <= ry2) return true;
  }
  return false;
}

/**
 * Find 2D connected components inside a sheet region, optionally bridging small gaps
 * (radius = 1 connects 8-neighbors cleanly without merging adjacent fighters).
 */
function findRegionComponents(buf, bg, region, excludeRects = [], radius = 1, minPixels = 60) {
  const [x1, y1, x2, y2] = region;
  const rw = x2 - x1 + 1;
  const rh = y2 - y1 + 1;
  const fg = new Uint8Array(rw * rh);
  for (let ry = 0; ry < rh; ry++) {
    const gy = y1 + ry;
    for (let rx = 0; rx < rw; rx++) {
      const gx = x1 + rx;
      if (inRects(gx, gy, excludeRects)) continue;
      if (!bg[gy * W + gx]) fg[ry * rw + rx] = 1;
    }
  }

  const vis = new Uint8Array(rw * rh);
  const comps = [];
  for (let ry = 0; ry < rh; ry++) {
    for (let rx = 0; rx < rw; rx++) {
      const start = ry * rw + rx;
      if (!fg[start] || vis[start]) continue;
      const q = [start];
      vis[start] = 1;
      let head = 0;
      let minX = rx;
      let maxX = rx;
      let minY = ry;
      let maxY = ry;
      while (head < q.length) {
        const cur = q[head++];
        const cx = cur % rw;
        const cy = (cur / rw) | 0;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
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
        comps.push({
          x1: x1 + minX,
          y1: y1 + minY,
          x2: x1 + maxX,
          y2: y1 + maxY,
          pixels: q, // local indices into rw*rh
          rw,
          originX: x1,
          originY: y1,
          count: q.length,
        });
      }
    }
  }
  comps.sort((a, b) => a.x1 - b.x1);
  return comps;
}

function componentToImage(buf, compsInput) {
  const list = Array.isArray(compsInput) ? compsInput : [compsInput];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const c of list) {
    if (c.x1 < minX) minX = c.x1;
    if (c.x2 > maxX) maxX = c.x2;
    if (c.y1 < minY) minY = c.y1;
    if (c.y2 > maxY) maxY = c.y2;
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const rgba = Buffer.alloc(w * h * 4);
  for (const c of list) {
    for (const idx of c.pixels) {
      const lx = idx % c.rw;
      const ly = (idx / c.rw) | 0;
      const gx = c.originX + lx;
      const gy = c.originY + ly;
      const dx = gx - minX;
      const dy = gy - minY;
      const srcO = (gy * W + gx) * 4;
      const dstO = (dy * w + dx) * 4;
      rgba[dstO] = buf[srcO];
      rgba[dstO + 1] = buf[srcO + 1];
      rgba[dstO + 2] = buf[srcO + 2];
      rgba[dstO + 3] = 255;
    }
  }
  // Clean 1px semi-transparent anti-checker fringe around black outlines if white/grey halo exists
  return { w, h, rgba };
}

function scaleImage(img, scale) {
  if (Math.abs(scale - 1) < 0.001) return img;
  const nw = Math.max(1, Math.round(img.w * scale));
  const nh = Math.max(1, Math.round(img.h * scale));
  const tmpIn = `.playwright-cli/_tmp_scale_in.rgba`;
  const tmpOut = `.playwright-cli/_tmp_scale_out.rgba`;
  fs.mkdirSync('.playwright-cli', { recursive: true });
  fs.writeFileSync(tmpIn, img.rgba);
  execFileSync('convert', [
    '-size', `${img.w}x${img.h}`,
    '-depth', '8',
    `rgba:${tmpIn}`,
    '-filter', 'Box',
    '-resize', `${nw}x${nh}!`,
    '-depth', '8',
    `rgba:${tmpOut}`,
  ]);
  const outBuf = fs.readFileSync(tmpOut);
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  return { w: nw, h: nh, rgba: outBuf };
}

/**
 * Extract a rectangular pose slice from a sheet using outer-bg removal + interior orphan drop.
 * Used when green aura/speed streaks surround a body cleanly within known non-overlapping x-bounds.
 */
function extractCleanBox(buf, bg, box, excludeRects = [], scale = 1, softGreenAlpha = false) {
  const [x1, y1, x2, y2] = box;
  const bw = x2 - x1 + 1;
  const bh = y2 - y1 + 1;
  const fg = new Uint8Array(bw * bh);
  for (let ry = 0; ry < bh; ry++) {
    const gy = y1 + ry;
    for (let rx = 0; rx < bw; rx++) {
      const gx = x1 + rx;
      if (inRects(gx, gy, excludeRects)) continue;
      if (bg[gy * W + gx]) continue;
      if (softGreenAlpha) {
        const o = (gy * W + gx) * 4;
        const r = buf[o], g = buf[o + 1], b = buf[o + 2];
        const mn = Math.min(r, b);
        const greenDiff = g - mn;
        // Drop near-checker pale grey/white-green glaze pixels outside saturated neon green
        if (mn >= 180 && Math.abs(r - b) <= 22 && greenDiff < 24) continue;
      }
      fg[ry * bw + rx] = 1;
    }
  }
  // Drop tiny disconnected fragments (< 14 px) along box edges
  const vis = new Uint8Array(bw * bh);
  let minX = bw;
  let maxX = -1;
  let minY = bh;
  let maxY = -1;
  const keep = new Uint8Array(bw * bh);
  for (let i = 0; i < bw * bh; i++) {
    if (!fg[i] || vis[i]) continue;
    const q = [i];
    vis[i] = 1;
    let h = 0;
    let cMinX = bw;
    let cMaxX = 0;
    while (h < q.length) {
      const c = q[h++];
      const cx = c % bw;
      const cy = (c / bw) | 0;
      if (cx < cMinX) cMinX = cx;
      if (cx > cMaxX) cMaxX = cx;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < bw && ny >= 0 && ny < bh) {
            const ni = ny * bw + nx;
            if (fg[ni] && !vis[ni]) {
              vis[ni] = 1;
              q.push(ni);
            }
          }
        }
      }
    }
    // Keep main components or interior puffs, drop tiny edge slivers touching left/right border
    const touchesEdge = cMinX <= 1 || cMaxX >= bw - 2;
    if (q.length >= 25 || (!touchesEdge && q.length >= 6)) {
      for (const p of q) {
        keep[p] = 1;
        const px = p % bw;
        const py = (p / bw) | 0;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const rgba = Buffer.alloc(w * h * 4);
  for (let ry = minY; ry <= maxY; ry++) {
    for (let rx = minX; rx <= maxX; rx++) {
      if (!keep[ry * bw + rx]) continue;
      const gx = x1 + rx;
      const gy = y1 + ry;
      const srcO = (gy * W + gx) * 4;
      const dstO = ((ry - minY) * w + (rx - minX)) * 4;
      const r = buf[srcO], g = buf[srcO + 1], b = buf[srcO + 2];
      let a = 255;
      if (softGreenAlpha) {
        const mn = Math.min(r, b);
        const greenDiff = g - mn;
        if (mn >= 165 && Math.abs(r - b) <= 24 && greenDiff > 0 && greenDiff < 60) {
          a = Math.min(255, Math.max(40, Math.round((greenDiff - 12) * 5.2)));
        }
      }
      rgba[dstO] = r;
      rgba[dstO + 1] = g;
      rgba[dstO + 2] = b;
      rgba[dstO + 3] = a;
    }
  }
  return scaleImage({ w, h, rgba }, scale);
}

/**
 * Pack frames onto uniform even-sized strip with shared baseline anchorY = frameHeight - 4
 * and centered horizontal anchorX.
 */
function writeStrip(outFile, frames) {
  const maxW = Math.max(...frames.map((f) => f.w));
  const maxH = Math.max(...frames.map((f) => f.h));
  const padX = 8;
  const padTop = 6;
  const padBottom = 4;
  let frameWidth = maxW + padX * 2;
  let frameHeight = maxH + padTop + padBottom;
  if (frameWidth % 2 !== 0) frameWidth++;
  if (frameHeight % 2 !== 0) frameHeight++;

  const anchorX = Math.round(frameWidth / 2);
  const anchorY = frameHeight - padBottom;
  const stripW = frameWidth * frames.length;
  const stripRgba = Buffer.alloc(stripW * frameHeight * 4);

  for (let fi = 0; fi < frames.length; fi++) {
    const fr = frames[fi];
    const destStartX = fi * frameWidth + Math.round((frameWidth - fr.w) / 2);
    const destStartY = anchorY - fr.h;
    for (let y = 0; y < fr.h; y++) {
      for (let x = 0; x < fr.w; x++) {
        const srcO = (y * fr.w + x) * 4;
        if (fr.rgba[srcO + 3] === 0) continue;
        const dx = destStartX + x;
        const dy = destStartY + y;
        if (dx < 0 || dx >= stripW || dy < 0 || dy >= frameHeight) continue;
        const dstO = (dy * stripW + dx) * 4;
        stripRgba[dstO] = fr.rgba[srcO];
        stripRgba[dstO + 1] = fr.rgba[srcO + 1];
        stripRgba[dstO + 2] = fr.rgba[srcO + 2];
        stripRgba[dstO + 3] = fr.rgba[srcO + 3];
      }
    }
  }

  fs.mkdirSync('.playwright-cli', { recursive: true });
  const tmpRaw = '.playwright-cli/_tmp_strip.rgba';
  fs.writeFileSync(tmpRaw, stripRgba);
  execFileSync('convert', [
    '-size', `${stripW}x${frameHeight}`,
    '-depth', '8',
    `rgba:${tmpRaw}`,
    outFile,
  ]);
  fs.unlinkSync(tmpRaw);

  return {
    frameWidth,
    frameHeight,
    frameCount: frames.length,
    anchorX,
    anchorY,
  };
}

console.log('Loading Dono source sheets...');
const buf1 = loadRgba(SHEET1);
const bg1 = computeOuterBackground(buf1);
const buf2 = loadRgba(SHEET2);
const bg2 = computeOuterBackground(buf2);

// Sheet 1 connected component extraction (zero banner clipping, zero neighbor bleed!)
const idleComps = findRegionComponents(
  buf1,
  bg1,
  [0, 44, 767, 210],
  [[0, 0, 210, 52]], // only exclude Idle/Parado badge on the far left!
  1,
  1000
);
console.log('Idle comps:', idleComps.length);

const corridaComps = findRegionComponents(
  buf1,
  bg1,
  [0, 248, 767, 405],
  [[0, 210, 150, 256]], // exclude Corrida badge on far left!
  1,
  1000
);
console.log('Corrida comps:', corridaComps.length);

const socosComps = findRegionComponents(
  buf1,
  bg1,
  [0, 452, 785, 610],
  [],
  1,
  1000
);
console.log('Socos comps:', socosComps.length);

const bloqueioComps = findRegionComponents(
  buf1,
  bg1,
  [0, 662, 767, 825],
  [[0, 615, 150, 666]],
  1,
  1000
);
console.log('Bloqueio comps:', bloqueioComps.length);

// Sheet 2 Festa na Favela connected components (separate gun barrels from adjacent shoes cleanly!)
const festaAllComps = findRegionComponents(
  buf2,
  bg2,
  [0, 170, 767, 392],
  [],
  1,
  40
);
// Merge the tiny detached muzzle spark (595..605, 195..207) with P3 (main body count > 1000)
const festaBodies = festaAllComps.filter((c) => c.count > 2000);
const festaSparks = festaAllComps.filter((c) => c.count <= 2000);
const festaPoses = festaBodies.map((body, idx) => {
  if (idx === 3) {
    // attach sparks near x=560..620, y=185..250 to P3 shooting pose
    return [body, ...festaSparks.filter((s) => s.x1 >= 550 && s.x2 <= 630 && s.y2 <= 260)];
  }
  return [body];
});
console.log('Festa poses:', festaPoses.length);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

function updateManifestAnim(key, meta) {
  manifest.animations[key] = {
    ...manifest.animations[key],
    ...meta,
  };
}

// 1. dono_idle (all 6 full-height frames, zero head clipping)
{
  const frames = idleComps.map((c) => componentToImage(buf1, c));
  const m = writeStrip(path.join(OUT_ANIM_DIR, 'dono_idle.png'), frames);
  updateManifestAnim('dono_idle', m);
}

// 2. dono_run_forward & dono_run_backward (compact ~148px frames, zero neighbor slivers)
{
  const frames = corridaComps.map((c) => componentToImage(buf1, c));
  const mFwd = writeStrip(path.join(OUT_ANIM_DIR, 'dono_run_forward.png'), frames);
  updateManifestAnim('dono_run_forward', mFwd);
  const mBwd = writeStrip(path.join(OUT_ANIM_DIR, 'dono_run_backward.png'), [...frames].reverse());
  updateManifestAnim('dono_run_backward', mBwd);
}

// 3. dono_jab (Socos P1 -> P0 -> P3) & dono_heavy_punch (Socos P3 -> P4 -> P5 -> P6)
{
  const jabFrames = [socosComps[1], socosComps[0], socosComps[3]].map((c) => componentToImage(buf1, c));
  updateManifestAnim('dono_jab', writeStrip(path.join(OUT_ANIM_DIR, 'dono_jab.png'), jabFrames));

  const hpFrames = [socosComps[3], socosComps[4], socosComps[5], socosComps[6]].map((c) =>
    componentToImage(buf1, c)
  );
  updateManifestAnim('dono_heavy_punch', writeStrip(path.join(OUT_ANIM_DIR, 'dono_heavy_punch.png'), hpFrames));
}

// 4. dono_victory (clean full heads, zero floating severed fist: Idle F0 -> Idle F4 -> Bloqueio F0 -> Bloqueio F1 -> Idle F5)
{
  const vicFrames = [
    idleComps[0],
    idleComps[4],
    bloqueioComps[0],
    bloqueioComps[1],
    idleComps[5],
  ].map((c) => componentToImage(buf1, c));
  updateManifestAnim('dono_victory', writeStrip(path.join(OUT_ANIM_DIR, 'dono_victory.png'), vicFrames));
}

// 5. Festa na Favela phases (scaled 0.785 to match Sheet 1 stature cleanly)
const SHEET2_SCALE = 0.785;
{
  const p = festaPoses.map((group) => scaleImage(componentToImage(buf2, group), SHEET2_SCALE));
  updateManifestAnim(
    'dono_festa_draw',
    writeStrip(path.join(OUT_ANIM_DIR, 'dono_festa_draw.png'), [p[0], p[1]])
  );
  updateManifestAnim(
    'dono_festa_aim',
    writeStrip(path.join(OUT_ANIM_DIR, 'dono_festa_aim.png'), [p[1], p[2]])
  );
  updateManifestAnim(
    'dono_festa_shoot',
    writeStrip(path.join(OUT_ANIM_DIR, 'dono_festa_shoot.png'), [p[2], p[3], p[4]])
  );
  updateManifestAnim(
    'dono_festa_reload',
    writeStrip(path.join(OUT_ANIM_DIR, 'dono_festa_reload.png'), [p[4], p[0], p[1]])
  );
}

// 6. Onda da MaryJuana speed & end (exact body seam splits at x=1202..1366 and x=1374..1528)
{
  const maryP3 = extractCleanBox(buf2, bg2, [1202, 650, 1366, 884], [], SHEET2_SCALE, true);
  const maryP4 = extractCleanBox(buf2, bg2, [1374, 650, 1528, 884], [], SHEET2_SCALE, true);
  const maryP0 = extractCleanBox(buf2, bg2, [768, 675, 895, 884], [], SHEET2_SCALE, false);
  updateManifestAnim(
    'dono_maryjuana_speed',
    writeStrip(path.join(OUT_ANIM_DIR, 'dono_maryjuana_speed.png'), [maryP3, maryP4])
  );
  updateManifestAnim(
    'dono_maryjuana_end',
    writeStrip(path.join(OUT_ANIM_DIR, 'dono_maryjuana_end.png'), [maryP4, maryP0])
  );
}

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log('Updated Dono animations & manifest.json successfully.');
