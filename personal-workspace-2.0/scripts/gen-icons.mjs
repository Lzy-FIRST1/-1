// 纯 Node 生成 PWA 图标（无外部依赖）：渐变圆角方块 + 三根圆角竖条（极简工作台意象）
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(root, { recursive: true });

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function distToRoundedRect(x, y, x0, y0, x1, y1, r) {
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  const dx = x - cx;
  const dy = y - cy;
  let d = Math.sqrt(dx * dx + dy * dy);
  if (x >= x0 + r && x <= x1 - r && (y < y0 || y > y1)) d = Math.min(Math.abs(y - y0), Math.abs(y - y1));
  else if (y >= y0 + r && y <= y1 - r && (x < x0 || x > x1)) d = Math.min(Math.abs(x - x0), Math.abs(x - x1));
  return d;
}

function distToCapsule(x, y, x0, x1, yTop, yBot, r) {
  const midY = (yTop + yBot) / 2;
  const half = (yBot - yTop) / 2;
  const cx = Math.max(x0, Math.min(x, x1));
  const cy = Math.max(midY - half, Math.min(y, midY + half));
  const dx = x - cx;
  const dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy) - r;
}

function makeIcon(size, { rounded = true, maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const s = size;
  const corner = rounded ? s * 0.22 : 0;
  const pad = maskable ? s * 0.18 : s * 0.14;
  const cx = s / 2;
  const base = s * (maskable ? 0.62 : 0.7);
  const barW = base * 0.17;
  const gap = base * 0.09;
  const top = s / 2 - base * 0.52;
  const bot = s / 2 + base * 0.48;
  const x0 = cx - barW * 1.5 - gap;
  const x1 = cx - barW / 2;
  const x2 = cx + barW / 2;
  const x3 = cx + barW * 1.5 + gap;
  const heights = [0.55, 0.85, 0.42]; // 三条竖条高度比例
  const bars = [
    [x0, x1, bot - base * heights[0]],
    [x1, x2, bot - base * heights[1]],
    [x2, x3, bot - base * heights[2]]
  ];
  const r = barW / 2;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const i = (y * s + x) * 4;
      const d = distToRoundedRect(px, py, pad, pad, s - pad, s - pad, corner);
      let inside = d <= 0;
      let alpha = 1;
      if (rounded && d > 0 && d < 1.5) {
        inside = true;
        alpha = Math.max(0, 1 - d / 1.5);
      }
      if (!inside) {
        pixels[i + 3] = 0;
        continue;
      }
      // 渐变背景
      const t = py / s;
      const rC = Math.round(10 + 20 * t);
      const gC = Math.round(132 + 20 * t);
      const bC = Math.round(255 - 110 * t);
      pixels[i] = rC;
      pixels[i + 1] = gC;
      pixels[i + 2] = bC;
      pixels[i + 3] = Math.round(255 * alpha);
      // 白色竖条
      let barAlpha = 0;
      for (const [bx0, bx1, byTop] of bars) {
        const db = distToCapsule(px, py, bx0, bx1, byTop, bot, r);
        if (db <= 0) barAlpha = 1;
        else if (db < 1.2) barAlpha = Math.max(barAlpha, Math.max(0, 1 - db / 1.2));
      }
      if (barAlpha > 0) {
        const white = 252;
        pixels[i] = Math.round(pixels[i] + (white - pixels[i]) * barAlpha);
        pixels[i + 1] = Math.round(pixels[i + 1] + (white - pixels[i + 1]) * barAlpha);
        pixels[i + 2] = Math.round(pixels[i + 2] + (white - pixels[i + 2]) * barAlpha);
        pixels[i + 3] = Math.round(Math.max(pixels[i + 3], 255 * alpha * (0.92 * barAlpha + 0.08)));
      }
    }
  }
  return encodePNG(size, pixels);
}

writeFileSync(join(root, 'icon-192.png'), makeIcon(192));
writeFileSync(join(root, 'icon-512.png'), makeIcon(512));
writeFileSync(join(root, 'icon-maskable-512.png'), makeIcon(512, { maskable: true }));
writeFileSync(join(root, 'apple-touch-icon.png'), makeIcon(180));
console.log('icons generated →', root);
