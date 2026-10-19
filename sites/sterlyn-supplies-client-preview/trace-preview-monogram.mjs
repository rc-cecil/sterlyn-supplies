import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url).pathname;
const crop = join(root, 'public/images/sterlyn-official-monogram-crop.webp');
const destination = new URL('./sterlyn-monogram-preview.svg', import.meta.url).pathname;
const { data, info } = await sharp(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const width = info.width;
const height = info.height;
const sourceMask = Buffer.alloc(width * height, 255);

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r > 70 && r > g * 1.06 && r > b * 1.25) sourceMask[y * width + x] = 0;
  }
}

// Blur only the measured gold mask. This removes JPEG edge speckle without
// redrawing the official letterforms or changing their negative spaces.
const smoothed = await sharp(sourceMask, { raw: { width, height, channels: 1 } })
  .blur(1.35).threshold(128).toColourspace('b-w').raw().toBuffer();
let x0 = width, y0 = height, x1 = 0, y1 = 0;
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  if (smoothed[y * width + x] < 128) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x);
    y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
}
if (x1 <= x0 || y1 <= y0) throw new Error('No official monogram silhouette found');
const boundsWidth = x1 - x0 + 1, boundsHeight = y1 - y0 + 1;
const outWidth = 390, outHeight = 503;
const centered = await sharp(smoothed, { raw: { width, height, channels: 1 } })
  .extract({ left: x0, top: y0, width: boundsWidth, height: boundsHeight })
  .resize(outWidth, outHeight, { fit: 'contain', background: '#fff' })
  .threshold(128)
  .toColourspace('b-w').raw().toBuffer();
const packed = Buffer.alloc(Math.ceil(outWidth / 8) * outHeight);
for (let y = 0; y < outHeight; y++) for (let x = 0; x < outWidth; x++) {
  if (centered[y * outWidth + x] < 128) packed[y * Math.ceil(outWidth / 8) + (x >> 3)] |= 128 >> (x & 7);
}
const pbm = '/private/tmp/sterlyn-preview-monogram.pbm';
const traced = '/private/tmp/sterlyn-preview-monogram.svg';
await writeFile(pbm, Buffer.concat([Buffer.from(`P4\n${outWidth} ${outHeight}\n`), packed]));
execFileSync('potrace', [pbm, '--svg', '--turdsize', '4', '--alphamax', '1.3', '--opttolerance', '0.18', '--output', traced]);
const svg = (await readFile(traced, 'utf8'))
  .replace(/<\?xml[^>]*>/, '')
  .replace(/<!DOCTYPE[\s\S]*?>/, '')
  .replace('<svg ', '<svg aria-label="Sterlyn Supplies monogram" ')
  .replace('fill="#000000"', 'fill="#c9a068"');
await writeFile(destination, svg);
console.log(destination);
