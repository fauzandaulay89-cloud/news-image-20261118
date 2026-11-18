// One-day world news poster: Wednesday 18 November 2026.
// Node 22, standard library only. Draws the poster pixel by pixel into an
// RGB buffer and writes a deterministic PNG to MAKEFUN_OUTPUT_DIR/entry.png.
// No clock, no randomness, no network: two runs produce identical bytes.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

const NAVY = [11, 22, 38];
const PANEL = [22, 40, 63];
const PANEL2 = [18, 33, 53];
const WHITE = [244, 246, 248];
const MUTED = [168, 184, 202];
const GOLD = [240, 185, 60];
const RED = [226, 57, 70];
const ORANGE = [240, 120, 40];
const BLUE = [70, 160, 235];
const GREEN = [60, 200, 130];
const TEAL = [45, 190, 175];
const PURPLE = [165, 120, 235];
const YELLOW = [250, 215, 70];
const DARK = [8, 15, 26];

function set(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
}

function rect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}

function disc(cx, cy, r, c) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r * r) set(x, y, c);
    }
  }
}

function ring(cx, cy, r, t, c) {
  for (let y = cy - r - t; y <= cy + r + t; y++) {
    for (let x = cx - r - t; x <= cx + r + t; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (Math.abs(d - r) <= t / 2) set(x, y, c);
    }
  }
}

// Thick line: walk the segment stamping discs.
function line(x0, y0, x1, y1, w, c) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x0 + (dx * s) / steps);
    const y = Math.round(y0 + (dy * s) / steps);
    disc(x, y, Math.max(1, Math.floor(w / 2)), c);
  }
}

function tri(x0, y0, x1, y1, x2, y2, c) {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) set(x, y, c);
    }
  }
}

// ---- 5x7 bitmap font (glyphs are 7 rows of 5 bits) ----
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '•': ['00000', '00100', '01110', '01110', '01110', '00100', '00000'],
};

function textWidth(s, scale) {
  return s.length === 0 ? 0 : s.length * 6 * scale - scale;
}

function drawText(s, x, y, scale, c) {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === '1') rect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(s, cx, y, scale, c) {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

// ---- pictograms: one flat scene per story, drawn in a 160x170 box ----
function burst(cx, cy, r, c1, c2) {
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    const x2 = Math.round(cx + Math.cos(a) * r);
    const y2 = Math.round(cy + Math.sin(a) * r);
    line(cx, cy, x2, y2, 7, k % 2 === 0 ? c1 : c2);
  }
  disc(cx, cy, Math.floor(r / 2.5), c1);
}

// 1. Gulf strikes: island in a blue sea, missile streaking in, blast above.
function picGulf(bx, by) {
  const cx = bx + 80, cy = by + 85;
  rect(bx, by + 118, 160, 52, [24, 90, 150]);
  rect(bx, by + 118, 160, 6, BLUE);
  disc(cx - 18, by + 128, 34, [52, 140, 80]);
  disc(cx + 30, by + 132, 22, [52, 140, 80]);
  line(bx + 8, by + 150, bx + 152, by + 150, 3, [120, 200, 240]);
  line(bx + 30, by + 162, bx + 130, by + 162, 3, [120, 200, 240]);
  // missile
  line(cx - 52, by + 92, cx + 6, by + 34, 8, [200, 205, 215]);
  tri(cx + 6, by + 34, cx - 8, by + 22, cx - 2, by + 48, [230, 235, 240]);
  tri(cx - 52, by + 92, cx - 66, by + 98, cx - 58, by + 78, ORANGE);
  tri(cx - 66, by + 98, cx - 80, by + 104, cx - 70, by + 86, YELLOW);
  burst(cx + 34, by + 22, 30, YELLOW, ORANGE);
}

// 2. Kerch Bridge: deck broken in the middle, a span tilting into the strait.
function picBridge(bx, by) {
  const cy = by + 85;
  rect(bx, cy + 42, 160, 62, [24, 90, 150]);
  line(bx + 6, cy + 66, bx + 154, cy + 66, 3, [120, 200, 240]);
  line(bx + 26, cy + 86, bx + 134, cy + 86, 3, [120, 200, 240]);
  // left deck
  rect(bx + 4, cy - 18, 62, 12, [190, 195, 205]);
  line(bx + 14, cy - 6, bx + 14, cy + 42, 5, [150, 155, 165]);
  line(bx + 54, cy - 6, bx + 54, cy + 42, 5, [150, 155, 165]);
  // right deck
  rect(bx + 94, cy - 18, 62, 12, [190, 195, 205]);
  line(bx + 106, cy - 6, bx + 106, cy + 42, 5, [150, 155, 165]);
  line(bx + 146, cy - 6, bx + 146, cy + 42, 5, [150, 155, 165]);
  // fallen span, tilted into the water, drawn as a slab with an edge line
  line(bx + 66, cy - 12, bx + 94, cy + 30, 12, [170, 175, 185]);
  line(bx + 66, cy - 6, bx + 94, cy + 36, 3, [120, 125, 135]);
  line(bx + 66, cy - 12, bx + 80, cy + 8, 4, [120, 125, 135]);
  burst(bx + 80, cy - 26, 24, YELLOW, RED);
  // arch hint on the left deck
  line(bx + 10, cy - 18, bx + 35, cy - 44, 4, [150, 155, 165]);
  line(bx + 35, cy - 44, bx + 60, cy - 18, 4, [150, 155, 165]);
}

// 3. APEC summit: globe with land, gold ring, three summit banners.
function picSummit(bx, by) {
  const cx = bx + 80, cy = by + 72;
  ring(cx, cy, 52, 5, GOLD);
  disc(cx, cy, 50, [38, 110, 190]);
  disc(cx - 18, cy - 14, 14, GREEN);
  disc(cx + 16, cy + 6, 12, GREEN);
  disc(cx + 4, cy - 26, 9, GREEN);
  disc(cx - 26, cy + 22, 10, GREEN);
  // three banners below the globe
  rect(bx + 18, by + 138, 34, 30, RED);
  rect(bx + 63, by + 138, 34, 30, WHITE);
  rect(bx + 108, by + 138, 34, 30, BLUE);
  rect(bx + 18, by + 138, 34, 5, GOLD);
  rect(bx + 63, by + 138, 34, 5, GOLD);
  rect(bx + 108, by + 138, 34, 5, GOLD);
  line(bx + 35, by + 138, bx + 35, by + 130, 3, GOLD);
  line(bx + 80, by + 138, bx + 80, by + 130, 3, GOLD);
  line(bx + 125, by + 138, bx + 125, by + 130, 3, GOLD);
}

// 4. Alaska vote: ballot box, star above, big green check.
function picVote(bx, by) {
  const cx = bx + 80;
  // star
  const sx = cx, sy = by + 34;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
    const a2 = a + Math.PI / 5;
    line(sx, sy, Math.round(sx + Math.cos(a) * 26), Math.round(sy + Math.sin(a) * 26), 5, GOLD);
    line(sx, sy, Math.round(sx + Math.cos(a2) * 11), Math.round(sy + Math.sin(a2) * 11), 5, GOLD);
  }
  disc(sx, sy, 7, GOLD);
  // ballot box
  rect(bx + 34, by + 96, 92, 66, [60, 90, 150]);
  rect(bx + 34, by + 96, 92, 10, [40, 65, 115]);
  rect(bx + 66, by + 88, 28, 8, DARK);
  disc(bx + 80, by + 132, 16, WHITE);
  // green check across the box
  line(bx + 66, by + 132, bx + 78, by + 146, 8, GREEN);
  line(bx + 78, by + 146, bx + 100, by + 116, 8, GREEN);
}

// 5. Measles: red spiked virus over a faded shield.
function picVirus(bx, by, body, spike) {
  const cx = bx + 80, cy = by + 85;
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6;
    line(
      Math.round(cx + Math.cos(a) * 40), Math.round(cy + Math.sin(a) * 40),
      Math.round(cx + Math.cos(a) * 62), Math.round(cy + Math.sin(a) * 62),
      6, spike,
    );
    disc(Math.round(cx + Math.cos(a) * 64), Math.round(cy + Math.sin(a) * 64), 6, spike);
  }
  disc(cx, cy, 42, body);
  disc(cx - 14, cy - 12, 7, spike);
  disc(cx + 12, cy + 8, 9, spike);
  disc(cx + 16, cy - 16, 5, spike);
  disc(cx - 4, cy + 18, 6, spike);
}

// 6. Ebola: teal virus with a white medical cross badge.
function picEbola(bx, by) {
  picVirus(bx, by, [30, 130, 110], TEAL);
  const cx = bx + 118, cy = by + 128;
  disc(cx, cy, 22, WHITE);
  rect(cx - 4, cy - 13, 8, 26, RED);
  rect(cx - 13, cy - 4, 26, 8, RED);
}

// ---- one story panel ----
function panel(x, y, w, h, s) {
  rect(x, y, w, h, PANEL);
  rect(x, y, w, 10, s.accent);
  rect(x, y + 10, w, 2, PANEL2);
  // number badge
  disc(x + w - 32, y + 36, 17, s.accent);
  drawTextCentered(s.num, x + w - 32, y + 27, 2, WHITE);
  // icon box
  s.pic(x + 16, y + 30);
  const tx = x + 192;
  drawText(s.kicker, tx, y + 34, 2, s.accent);
  drawText(s.head1, tx, y + 62, 3, WHITE);
  drawText(s.head2, tx, y + 90, 3, WHITE);
  drawText(s.det1, tx, y + 138, 2, MUTED);
  drawText(s.det2, tx, y + 160, 2, MUTED);
  drawText(s.det3, tx, y + 182, 2, MUTED);
  rect(tx, y + 216, 120, 4, s.accent);
}

// ---- PNG encoding (zlib via node:zlib, CRC32 by hand) ----
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crcIn = new Uint8Array(4 + data.length);
  crcIn.set(out.subarray(4, 8), 0);
  crcIn.set(data, 4);
  dv.setUint32(8 + data.length, crc32(crcIn));
  return out;
}
function encodePng() {
  const raw = new Uint8Array((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = deflateSync(raw, { level: 9 });
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

// ---- poster layout ----
function draw() {
  rect(0, 0, W, H, NAVY);
  rect(0, 0, W, 10, GOLD);
  drawTextCentered('18 NOVEMBER 2026', W / 2, 36, 5, WHITE);
  drawTextCentered('WEDNESDAY  •  WORLD NEWS IN ONE IMAGE', W / 2, 96, 2, GOLD);
  line(24, 138, W - 24, 138, 3, [45, 70, 100]);

  const specs = [
    {
      num: '1', kicker: 'MIDDLE EAST', accent: ORANGE,
      head1: "US STRIKES", head2: "IRAN'S QESHM",
      det1: 'IRAN DRONES HIT', det2: 'BAHRAIN AND KUWAIT', det3: 'AFTER THE US STRIKE',
      pic: picGulf,
    },
    {
      num: '2', kicker: 'UKRAINE WAR', accent: BLUE,
      head1: 'KERCH BRIDGE', head2: 'HIT AGAIN',
      det1: 'SPAN FALLS INTO', det2: 'THE STRAIT', det3: 'SECOND DAY OF HITS',
      pic: picBridge,
    },
    {
      num: '3', kicker: 'ASIA-PACIFIC', accent: GOLD,
      head1: 'APEC OPENS', head2: 'IN SHENZHEN',
      det1: 'XI URGES AI AND', det2: 'FREE TRADE', det3: 'TRUMP, PUTIN MEET THU',
      pic: picSummit,
    },
    {
      num: '4', kicker: 'UNITED STATES', accent: PURPLE,
      head1: 'PELTOLA WINS', head2: 'ALASKA SENATE',
      det1: 'DEMOCRATS REACH', det2: '56 SENATE SEATS', det3: 'REPUBLICAN INCUMBENT OUT',
      pic: picVote,
    },
    {
      num: '5', kicker: 'HEALTH', accent: RED,
      head1: 'US LOSES', head2: 'MEASLES-FREE',
      det1: 'STATUS AFTER', det2: '26 YEARS', det3: '5,400 CASES IN 2026',
      pic: (bx, by) => picVirus(bx, by, [190, 40, 55], [240, 90, 105]),
    },
    {
      num: '6', kicker: 'AFRICA', accent: TEAL,
      head1: 'EBOLA SURGES', head2: 'IN DR CONGO',
      det1: '11,000 CASES', det2: '5,400 DEAD', det3: 'OUTBREAK DOUBLED',
      pic: picEbola,
    },
  ];

  const top = 164, gap = 16, pw = 480, ph = 262;
  for (let i = 0; i < specs.length; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    panel(24 + col * (pw + gap), top + row * (ph + gap), pw, ph, specs[i]);
  }

  drawTextCentered('SIX STORIES  •  ONE DAY  •  18 NOVEMBER 2026', W / 2, 996, 2, MUTED);
}

draw();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePng());
