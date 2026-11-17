import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { decodeIco, normalizeIcon, readIconLinks } from '../src/lib/solutions/site-icon';

test('icon links: best first, resolved, mask and data icons skipped, fallbacks last', () => {
  const html = `<html><head>
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
    <link rel="mask-icon" href="/mask.svg" color="#000">
    <link rel="icon" href="data:image/png;base64,AAAA">
    <link rel="icon" href="/static/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple.png">
    <link rel="icon" type="image/png" sizes="512x512" href="https://cdn.example.com/512.png">
  </head><body><link rel="icon" href="/streamed.png"></body></html>`;
  assert.deepEqual(readIconLinks(html, 'https://site.example/es/'), [
    'https://site.example/apple.png', // 180, closest to 192
    'https://cdn.example.com/512.png',
    'https://site.example/static/favicon.svg',
    'https://site.example/icon-32.png',
    'https://site.example/favicon.ico',
    // Streamed after the head (React 19 / Next.js): read, but after the head's own.
    'https://site.example/streamed.png',
    'https://site.example/apple-touch-icon.png',
  ]);
  // A page that declares nothing still gets the two conventional paths.
  assert.deepEqual(readIconLinks('<head></head>', 'https://plain.example/a/b'), [
    'https://plain.example/apple-touch-icon.png',
    'https://plain.example/favicon.ico',
  ]);
  // Only http(s) candidates survive.
  assert.equal(
    readIconLinks('<link rel="icon" href="javascript:alert(1)">', 'https://x.example/').length,
    2,
  );
});

/** A one-entry .ico holding a 32-bit bitmap: left half opaque red, right half transparent. */
function bitmapIco(size: number) {
  const header = 40;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const at = (y * size + x) * 4;
      if (x < size / 2) pixels.set([0, 0, 255, 255], at); // BGRA red
    }
  const mask = Buffer.alloc(Math.ceil(size / 32) * 4 * size);
  const dib = Buffer.alloc(header);
  dib.writeUInt32LE(header, 0);
  dib.writeInt32LE(size, 4);
  dib.writeInt32LE(size * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  const image = Buffer.concat([dib, pixels, mask]);
  const dir = Buffer.alloc(22);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(1, 4);
  dir[6] = size;
  dir[7] = size;
  dir.writeUInt16LE(32, 12);
  dir.writeUInt32LE(image.length, 14);
  dir.writeUInt32LE(22, 18);
  return Buffer.concat([dir, image]);
}

test('decodeIco reads 32-bit bitmaps top-down as RGBA and refuses other files', async () => {
  const decoded = decodeIco(bitmapIco(32));
  assert.ok(decoded && 'raw' in decoded);
  assert.equal(decoded.width, 32);
  assert.deepEqual([...decoded.raw.subarray(0, 4)], [255, 0, 0, 255]); // red, opaque
  assert.equal(decoded.raw[(32 - 1) * 4 + 3], 0); // right half transparent
  const png = await sharp({
    create: { width: 64, height: 64, channels: 4, background: '#365DC4' },
  })
    .png()
    .toBuffer();
  assert.equal(decodeIco(png), null);
});

test('normalizeIcon: square WebP up to 128 px, never tiny, SVG rasterised', async () => {
  const big = await sharp({ create: { width: 512, height: 512, channels: 4, background: '#fff' } })
    .png()
    .toBuffer();
  const out = await normalizeIcon(big);
  assert.ok(out);
  assert.equal(out.size, 128);
  assert.equal((await sharp(out.buffer).metadata()).format, 'webp');

  const tiny = await sharp({ create: { width: 16, height: 16, channels: 4, background: '#000' } })
    .png()
    .toBuffer();
  assert.equal(await normalizeIcon(tiny), null);

  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#365DC4"/></svg>',
  );
  const vector = await normalizeIcon(svg);
  assert.equal(vector?.size, 128);

  const ico = await normalizeIcon(bitmapIco(48));
  assert.equal(ico?.size, 48);
});
