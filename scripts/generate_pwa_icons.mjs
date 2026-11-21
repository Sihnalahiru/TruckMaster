import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawTruckIcon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const bg = [11, 79, 138, 255]; // #0B4F8A
  const white = [255, 255, 255, 255];
  const cab = [224, 242, 254, 255];
  const emerald = [13, 122, 95, 255];
  const slate = [203, 213, 225, 255];
  const tire = [15, 23, 42, 255];

  const pad = maskable ? 0.16 : 0.0;
  const scale = 1 - pad * 2;

  function setPixel(x, y, col) {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const idx = (y * size + x) * 4;
    buf[idx] = col[0];
    buf[idx + 1] = col[1];
    buf[idx + 2] = col[2];
    buf[idx + 3] = col[3];
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Normalized coords in [0, 512]
      const nx = ((x / size) - pad) / scale * 512;
      const ny = ((y / size) - pad) / scale * 512;
      let col = bg;

      // Cargo box (64..300, 156..324)
      if (nx >= 64 && nx <= 300 && ny >= 156 && ny <= 324) {
        col = white;
        if (nx >= 96 && nx <= 204 && ny >= 192 && ny <= 214) col = emerald;
        else if (nx >= 96 && nx <= 264 && ny >= 232 && ny <= 248) col = slate;
        else if (nx >= 96 && nx <= 228 && ny >= 264 && ny <= 280) col = slate;
      }
      // Cab (312..446, 204..324) with sloped front
      if (nx >= 312 && ny >= 204 && ny <= 324) {
        const slopeLimit = ny < 276 ? 388 + ((ny - 204) / 72) * 58 : 446;
        if (nx <= slopeLimit) {
          col = cab;
          // Windshield
          if (nx >= 336 && ny >= 228 && ny <= 264) {
            const winLimit = 382 + ((ny - 228) / 36) * 20;
            if (nx <= winLimit) col = bg;
          }
        }
      }
      // Wheels
      const d1 = Math.hypot(nx - 152, ny - 340);
      const d2 = Math.hypot(nx - 384, ny - 340);
      if (d1 <= 40 || d2 <= 40) {
        col = d1 <= 18 || d2 <= 18 ? white : tire;
      }

      setPixel(x, y, col);
    }
  }

  return encodePNG(size, size, buf);
}

fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-192x192.png'), drawTruckIcon(192, false));
fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-512x512.png'), drawTruckIcon(512, false));
fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'), drawTruckIcon(512, true));
fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), drawTruckIcon(180, false));
console.log('Generated PWA PNG icons successfully.');
