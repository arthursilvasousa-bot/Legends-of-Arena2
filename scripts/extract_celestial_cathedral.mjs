import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'public/assets/aistudio/Gemini_Generated_Image_ujrhxjujrhxjujrh_16638a25.jpeg';
const OUT_DIR = 'public/assets/arenas';

const W = 480;
const H = 270;
const PAD = 20; // padded width = 520

fs.mkdirSync(OUT_DIR, { recursive: true });

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function mirrorPadHorizontal(buf, w, h, pad) {
  const outW = w + pad * 2;
  const out = Buffer.alloc(outW * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < outW; x++) {
      let sx = x - pad;
      if (sx < 0) sx = -sx;
      else if (sx >= w) sx = 2 * w - 2 - sx;
      sx = clamp(sx, 0, w - 1);
      const si = (y * w + sx) * 4;
      const di = (y * outW + x) * 4;
      out[di] = buf[si];
      out[di + 1] = buf[si + 1];
      out[di + 2] = buf[si + 2];
      out[di + 3] = buf[si + 3];
    }
  }
  return out;
}

const base = execFileSync(
  'convert',
  [SRC, '-filter', 'Lanczos', '-resize', `${W}x${H}!`, '-alpha', 'on', '-depth', '8', 'rgba:-'],
  { maxBuffer: 32 * 1024 * 1024 }
);

const padded = mirrorPadHorizontal(base, W, H, PAD);
const outPath = path.join(OUT_DIR, 'celestial_cathedral_bg.png');

execFileSync(
  'convert',
  ['-size', `${W + PAD * 2}x${H}`, '-depth', '8', 'rgba:-', outPath],
  { input: padded, maxBuffer: 32 * 1024 * 1024 }
);

console.log(`Generated ${outPath} (${W + PAD * 2}x${H})`);
