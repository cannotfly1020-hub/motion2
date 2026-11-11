import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'resources');

const NAVY = [15, 23, 42];
const BALL = [30, 41, 59];
const RIM = [51, 65, 85];
const WHITE = [248, 250, 252];
const CYAN = [6, 182, 212];
const EMERALD = [16, 185, 129];

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])), 0);
  return Buffer.concat([length, name, data, crc]);
}

function encodePng(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const dest = y * (stride + 1);
    raw[dest] = 0;
    rgb.copy(raw, dest + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function createCanvas(size) {
  const data = Buffer.alloc(size * size * 3);
  for (let i = 0; i < data.length; i += 3) {
    data[i] = NAVY[0];
    data[i + 1] = NAVY[1];
    data[i + 2] = NAVY[2];
  }
  return {
    size,
    data,
    set(x, y, color) {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 0 || py < 0 || px >= size || py >= size) return;
      const i = (py * size + px) * 3;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
    }
  };
}

function fillCircle(canvas, cx, cy, radius, color) {
  const r = Math.ceil(radius);
  const r2 = radius * radius;
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      if (x * x + y * y <= r2) canvas.set(cx + x, cy + y, color);
    }
  }
}

function strokeCircle(canvas, cx, cy, radius, width, color) {
  const outer = radius + width / 2;
  const inner = Math.max(0, radius - width / 2);
  const r = Math.ceil(outer);
  const outer2 = outer * outer;
  const inner2 = inner * inner;
  for (let y = -r; y <= r; y += 1) {
    for (let x = -r; x <= r; x += 1) {
      const d = x * x + y * y;
      if (d <= outer2 && d >= inner2) canvas.set(cx + x, cy + y, color);
    }
  }
}

function fillDisc(canvas, x, y, radius, color) {
  fillCircle(canvas, x, y, radius, color);
}

function strokeLine(canvas, x0, y0, x1, y1, radius, color) {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    fillDisc(canvas, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, radius, color);
  }
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function seamPoint(t, sign, scale) {
  const y = -0.78 + t * 1.56;
  const bulge = Math.sin(t * Math.PI);
  const x = sign * (0.05 + bulge * 0.46);
  return { x: 512 + x * scale, y: 512 + y * scale };
}

function drawSeam(canvas, sign, scale) {
  const points = [];
  for (let i = 0; i <= 96; i += 1) points.push(seamPoint(i / 96, sign, scale));
  for (let i = 0; i < points.length; i += 1) {
    const color = mix(CYAN, EMERALD, i / (points.length - 1));
    fillDisc(canvas, points[i].x, points[i].y, 18, color);
    if (i > 0 && i < points.length - 1 && i % 8 === 0) {
      const prev = points[i - 1];
      const next = points[i + 1];
      const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1;
      const px = -(next.y - prev.y) / len;
      const py = (next.x - prev.x) / len;
      strokeLine(canvas, points[i].x - px * 28, points[i].y - py * 28, points[i].x + px * 28, points[i].y + py * 28, 6, color);
    }
  }
}

function drawSkeleton(canvas) {
  const joints = {
    head: [512, 292],
    neck: [516, 372],
    shoulder: [524, 418],
    hip: [496, 560],
    frontKnee: [404, 676],
    frontFoot: [372, 804],
    backKnee: [628, 688],
    backFoot: [692, 812],
    elbow: [624, 456],
    wrist: [712, 372],
    glove: [392, 486]
  };
  const bones = [
    ['head', 'neck'],
    ['neck', 'shoulder'],
    ['shoulder', 'hip'],
    ['hip', 'frontKnee'],
    ['frontKnee', 'frontFoot'],
    ['hip', 'backKnee'],
    ['backKnee', 'backFoot'],
    ['shoulder', 'elbow'],
    ['elbow', 'wrist'],
    ['shoulder', 'glove']
  ];
  bones.forEach(function(pair) {
    const a = joints[pair[0]];
    const b = joints[pair[1]];
    strokeLine(canvas, a[0], a[1], b[0], b[1], 11, WHITE);
  });
  Object.keys(joints).forEach(function(name, index) {
    const point = joints[name];
    const halo = index % 2 === 0 ? CYAN : EMERALD;
    const radius = name === 'head' ? 28 : 16;
    fillDisc(canvas, point[0], point[1], radius, halo);
    fillDisc(canvas, point[0], point[1], name === 'head' ? 14 : 7, WHITE);
  });
}

function drawMaster() {
  const canvas = createCanvas(1024);
  fillCircle(canvas, 512, 512, 292, BALL);
  strokeCircle(canvas, 512, 512, 292, 10, RIM);
  drawSeam(canvas, -1, 250);
  drawSeam(canvas, 1, 250);
  drawSkeleton(canvas);
  return canvas;
}

function drawSplash(icon) {
  const size = 2732;
  const canvas = createCanvas(size);
  const target = 1080;
  const origin = Math.round((size - target) / 2);
  for (let y = 0; y < target; y += 1) {
    const sy = Math.min(icon.size - 1, Math.round((y + 0.5) * icon.size / target - 0.5));
    for (let x = 0; x < target; x += 1) {
      const sx = Math.min(icon.size - 1, Math.round((x + 0.5) * icon.size / target - 0.5));
      const from = (sy * icon.size + sx) * 3;
      canvas.set(origin + x, origin + y, [icon.data[from], icon.data[from + 1], icon.data[from + 2]]);
    }
  }
  return canvas;
}

const icon = drawMaster();
const splash = drawSplash(icon);
mkdirSync(outDir, { recursive: true });
const splashPng = encodePng(splash.size, splash.size, splash.data);
writeFileSync(join(outDir, 'icon.png'), encodePng(icon.size, icon.size, icon.data));
writeFileSync(join(outDir, 'splash.png'), splashPng);
writeFileSync(join(outDir, 'splash-dark.png'), splashPng);
console.log('resources/icon.png 1024x1024');
console.log('resources/splash.png 2732x2732');
console.log('resources/splash-dark.png 2732x2732');
