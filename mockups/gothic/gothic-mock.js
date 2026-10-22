// 灰烬地窖 美术方向样稿：哥特精绘（参考渎神的气质，原创内容）
// 480x270 内部分辨率；环境=反照率×光照图→调色板量化；角色=材质分区自动体积着色。
(function () {
const W = 480, H = 270, WALL = 86;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hx = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];

// ---- 主调色板（约 50 色）----
const RAMP = {
  ink: ['#050307', '#0b080e', '#120d15', '#1a131c'],
  stone: ['#211820', '#2c2027', '#3a2a2e', '#4b3836', '#5f4840', '#7a604f', '#977d66', '#b49a7c'],
  cold: ['#191826', '#252536', '#343749', '#4a5064', '#6b7587', '#94a0b0', '#c4ccd6', '#e6eaee'],
  crim: ['#22070c', '#3e0d14', '#62141d', '#8a1d25', '#b0302d', '#d65038'],
  gold: ['#2e1b0b', '#4f3010', '#7a4c16', '#a8701f', '#d29a32', '#f0c860', '#fbe6a0'],
  bone: ['#4e4236', '#76664f', '#a08e71', '#c7b796', '#e5dabd', '#f6f0dc'],
  flame: ['#e05a1c', '#ff8a2a', '#ffb84c', '#ffe08a', '#fff6d8'],
  soul: ['#123634', '#1f5c55', '#3a9484', '#6fd0b4', '#b8f6e0'],
  glass: ['#1c2a5c', '#2e4a8e', '#4f78c0'],
};
const PALETTE = [].concat(...Object.values(RAMP)).map(hx);
// 5bit LUT 量化（亮度加权距离）
const LUT = new Uint8Array(32768);
for (let i = 0; i < 32768; i++) {
  const r = ((i >> 10) & 31) / 31, g = ((i >> 5) & 31) / 31, b = (i & 31) / 31;
  let best = 0, bd = 1e9;
  for (let k = 0; k < PALETTE.length; k++) {
    const p = PALETTE[k], dr = r - p[0], dg = g - p[1], db = b - p[2];
    const dl = (dr * .3 + dg * .59 + db * .11);
    const d = dr * dr * .5 + dg * dg * .6 + db * db * .4 + dl * dl * 3;
    if (d < bd) { bd = d; best = k; }
  }
  LUT[i] = best;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - .5));

// ---- 噪声 ----
const NS = 64, NV = new Float32Array(NS * NS); for (let i = 0; i < NV.length; i++) NV[i] = rnd();
const smooth = t => t * t * (3 - 2 * t);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = NV[((yi & 63) * NS) + (xi & 63)], b = NV[((yi & 63) * NS) + ((xi + 1) & 63)];
  const c = NV[(((yi + 1) & 63) * NS) + (xi & 63)], d = NV[(((yi + 1) & 63) * NS) + ((xi + 1) & 63)];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
const fbm = (x, y) => vnoise(x, y) * .5 + vnoise(x * 2.1, y * 2.1) * .3 + vnoise(x * 4.3, y * 4.3) * .2;

// ---- 环境缓冲：反照率 A，自发光 E，法线朝向 F（0=地面 1=墙面）----
const A = new Float32Array(W * H * 3), E = new Float32Array(W * H * 3), F = new Uint8Array(W * H);
const setA = (x, y, c, k = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; A[i] = c[0] * k; A[i + 1] = c[1] * k; A[i + 2] = c[2] * k; };
const setE = (x, y, c, k = 1) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; E[i] += c[0] * k; E[i + 1] += c[1] * k; E[i + 2] += c[2] * k; };
const mulA = (x, y, k) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; A[i] *= k; A[i + 1] *= k; A[i + 2] *= k; };
const R = n => RAMP[n].map(hx);
const STONE = R('stone'), COLD = R('cold'), INK = R('ink'), CRIM = R('crim'), GOLD = R('gold'), BONE = R('bone'), FLAME = R('flame'), SOUL = R('soul'), GLASS = R('glass');
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rampAt = (ramp, t) => { t = Math.max(0, Math.min(.999, t)) * (ramp.length - 1); const i = Math.floor(t); return mix(ramp[i], ramp[Math.min(ramp.length - 1, i + 1)], t - i); };

// ---- 墙面 ----
const COLS = [0, 160, 320, 480];
function archInside(x, y, cx, w, ys, r) {
  // 尖拱：两段圆弧求交
  if (Math.abs(x - cx) > w / 2) return false;
  if (y >= ys) return true;
  const off = r - w / 2;
  const d1 = Math.hypot(x - (cx - off), y - ys), d2 = Math.hypot(x - (cx + off), y - ys);
  return d1 <= r && d2 <= r;
}
for (let y = 0; y < WALL; y++) {
  const row = Math.floor(y / 7), shift = (row & 1) * 9;
  for (let x = 0; x < W; x++) {
    F[y * W + x] = 1;
    const bx = Math.floor((x + shift) / 18), lx = (x + shift) % 18, ly = y % 7;
    const id = bx * 31 + row * 17;
    let t = .34 + NV[id & 4095 % 4096 & (NS * NS - 1)] * .14 + (fbm(x * .15, y * .15) - .5) * .12;
    if (lx === 0 || ly === 0) t = .08;
    else if (ly === 1 || lx === 1) t += .1;
    else if (ly === 6) t -= .1;
    if (NV[(x * 7 + y * 13) & 4095] > .985) t -= .15; // 麻点
    const top = Math.min(1, y / 46); // 越往上越沉入黑暗
    setA(x, y, rampAt(STONE, t), .35 + .65 * top);
  }
}
// 立柱
for (const cx of COLS) {
  const hw = 15;
  for (let y = 0; y < WALL + 6; y++) for (let x = cx - hw; x <= cx + hw; x++) {
    if (x < 0 || x >= W) continue;
    let u = (x - cx) / hw; // -1..1
    const capital = y > 14 && y < 22, base = y > WALL - 8;
    let w2 = hw - 4; if (capital || base) w2 = hw;
    if (Math.abs(x - cx) > w2) continue;
    u = (x - cx) / w2;
    let shade = .25 + .55 * Math.max(0, Math.cos((u + .25) * 1.5)); // 柱体圆柱着色
    if (!capital && !base && ((x - cx + 40) % 4 === 0)) shade *= .62; // 凹槽
    if (capital && (y === 15 || y === 21)) shade *= .5;
    if (base && y === WALL - 7) shade += .15;
    shade += (fbm(x * .3, y * .2) - .5) * .1;
    const top = Math.min(1, y / 40);
    setA(x, y, rampAt(STONE, shade * .95), .4 + .6 * top);
    F[y * W + x] = 1;
  }
}
// 侧龛（雕像 + 烛群），中间为彩窗
const GCELLS = []; for (let k = 0; k < 34; k++) GCELLS.push([(rnd() - .5) * 44, 30 + rnd() * 58, [GLASS[0], GLASS[1], CRIM[2], CRIM[3], GOLD[3], GLASS[1], SOUL[1]][Math.floor(rnd() * 7)]]);
const NICHES = [{ cx: 80, kind: 'saint' }, { cx: 240, kind: 'window' }, { cx: 400, kind: 'saint' }];
const LIGHTS = [];
const CANDLES = [];
for (const n of NICHES) {
  const w = n.kind === 'window' ? 44 : 50, ys = n.kind === 'window' ? 36 : 40, r = w * .78;
  for (let y = 0; y < WALL; y++) for (let x = n.cx - w / 2 - 4; x <= n.cx + w / 2 + 4; x++) {
    const inO = archInside(x, y, n.cx, w + 8, ys, r + 4), inI = archInside(x, y, n.cx, w, ys, r);
    if (inO && !inI) { // 拱券线脚
      const d = archInside(x, y, n.cx, w + 4, ys, r + 2) ? .62 : .48;
      setA(x, y, rampAt(STONE, d + (fbm(x * .4, y * .4) - .5) * .12), .5 + .5 * Math.min(1, y / 30));
    } else if (inI) {
      if (n.kind === 'window') {
        // 彩窗：不规则玻璃块（Voronoi）+ 铅条 + 竖棂 + 顶部玫瑰窗
        const lx = x - n.cx, ly = y;
        let b1 = 1e9, b2 = 1e9, bi = 0;
        for (let k = 0; k < GCELLS.length; k++) { const c = GCELLS[k], d = (lx - c[0]) ** 2 + (ly - c[1]) ** 2; if (d < b1) { b2 = b1; b1 = d; bi = k; } else if (d < b2) b2 = d; }
        const rose = Math.hypot(lx, ly - 20);
        const lead = Math.sqrt(b2) - Math.sqrt(b1) < 1.1 || Math.abs(lx) < 1 && ly > 30 || Math.abs(rose - 9) < .8 || (rose < 9 && Math.abs(Math.sin(Math.atan2(ly - 20, lx) * 4)) < .12);
        if (lead) setA(x, y, INK[2]);
        else {
          const col = rose < 3.2 ? GOLD[5] : rose < 9 ? [CRIM[4], GOLD[4]][(Math.floor((Math.atan2(ly - 20, lx) + 4) / .785)) & 1] : GCELLS[bi][2];
          const fade = (.3 + .45 * (1 - ly / WALL)) * (.75 + fbm(x * .25, y * .25) * .5);
          setA(x, y, col, .3); setE(x, y, col, fade);
        }
      } else {
        // 壁龛内部：深凹
        const depth = Math.abs(x - n.cx) / (w / 2);
        setA(x, y, rampAt(INK, .3 + depth * .6));
      }
    }
  }
  if (n.kind === 'window') {
    // 窗下祭台
    for (let y = WALL - 14; y < WALL + 4; y++) for (let x = n.cx - 26; x <= n.cx + 26; x++) {
      const step = y < WALL - 8 ? 20 : 26;
      if (Math.abs(x - n.cx) > step) continue;
      let t = .45 + (fbm(x * .3, y * .3) - .5) * .15;
      if (y === WALL - 14 || y === WALL - 8) t = .72;
      if (y === WALL - 13 || y === WALL - 7) t = .6;
      setA(x, y, rampAt(STONE, t)); F[y * W + x] = 1;
      // 祭台红布
      if (Math.abs(x - n.cx) < 10 && y >= WALL - 14 && y < WALL - 3) setA(x, y, rampAt(CRIM, .35 + (y % 3 === 0 ? .25 : .1) - Math.abs(x - n.cx) * .02));
    }
    // 圣杯
    for (let y = WALL - 22; y < WALL - 14; y++) for (let x = n.cx - 4; x <= n.cx + 4; x++) {
      const k = y - (WALL - 22), ww = k < 3 ? 4 - (k === 0 ? 1 : 0) : k < 6 ? 1 : 3;
      if (Math.abs(x - n.cx) <= ww) setA(x, y, rampAt(GOLD, .5 + (n.cx - x) * .08 + (k < 3 ? .2 : 0)));
    }
    LIGHTS.push({ x: n.cx, y: WALL - 20, c: GOLD[5], i: .35, r: 24, fl: 0 });
  } else {
    // 雕像：低头的蒙面圣女，双手捧着荆棘心
    const cx = n.cx, by = WALL - 12;
    for (let y = 14; y < by; y++) for (let x = cx - 18; x <= cx + 18; x++) {
      const k = (y - 14) / (by - 14);
      let half;
      if (k < .2) half = 3 + k * 25; // 兜帽
      else if (k < .3) half = 7 + (k - .2) * 10;
      else half = 8 + (k - .3) * 16;
      const lx = x - cx + (k < .2 ? -1 : 0);
      if (Math.abs(lx) > half) continue;
      const u = lx / half;
      let t = .12 + .7 * Math.max(0, Math.cos((u + .3) * 1.6));
      // 衣褶
      if (k > .35) t += (Math.sin(lx * 1.1 + k * 4) > .55 ? -.22 : 0);
      if (Math.abs(u) > .85) t -= .15;
      if (k < .2 && u > -.2 && u < .5 && y > 18) t = .05; // 兜帽内阴影
      if (k > .3 && k < .45 && Math.abs(lx) < 4) t = .55; // 双手
      setA(x, y, rampAt(BONE, t * (.45 + .55 * k)), .55);
    }
    // 荆棘心（红）
    for (let y = 27; y < 32; y++) for (let x = cx - 3; x <= cx + 3; x++) if (Math.hypot(x - cx, (y - 29) * 1.2) < 2.8) setA(x, y, rampAt(CRIM, .6 + (cx - x) * .08));
    // 底座
    for (let y = by; y < WALL + 2; y++) for (let x = cx - 16; x <= cx + 16; x++) {
      let t = y === by ? .75 : y === by + 1 ? .6 : .35 + (fbm(x * .4, y * .4) - .5) * .15;
      setA(x, y, rampAt(STONE, t)); F[y * W + x] = 1;
    }
    // 烛群
    for (let i = 0; i < 11; i++) {
      const x = cx - 15 + Math.floor(rnd() * 31), h = 3 + Math.floor(rnd() * 7), y0 = by - h + (i % 3 === 0 ? 1 : 0);
      CANDLES.push({ x, y: y0, h, wall: true });
    }
    LIGHTS.push({ x: cx, y: by - 4, c: FLAME[1], i: .6, r: 34, fl: rnd() * 9 });
  }
}
// 立柱上的残破旗帜
for (const cx of [160, 320]) {
  for (let y = 24; y < 70; y++) {
    const k = (y - 24) / 46, half = 8 - (k > .8 ? (k - .8) * 20 : 0);
    for (let x = cx - 8; x <= cx + 8; x++) {
      const lx = x - cx;
      if (Math.abs(lx) > half) continue;
      if (k > .75 && NV[(x * 5 + y) & 4095] > .55) continue; // 破洞/流苏
      let t = .35 + Math.sin(lx * .7 + 1) * .12 - k * .15;
      if (y === 24 || y === 25) { setA(x, y, rampAt(GOLD, .6)); continue; }
      if (Math.abs(lx) === 6) { setA(x, y, rampAt(GOLD, .35)); continue; }
      // 纹章：倒置的烛台
      if (Math.abs(lx) < 1 && y > 34 && y < 52) t = .9;
      if (y === 36 && Math.abs(lx) < 4) t = .9;
      setA(x, y, t > .85 ? rampAt(GOLD, .55) : rampAt(CRIM, t));
    }
  }
}

// ---- 地面：透视石板 ----
let y = WALL, rowi = 0;
while (y < H) {
  const rh = Math.round(9 + (y - WALL) / (H - WALL) * 9);
  let x = -Math.floor(rnd() * 20);
  while (x < W) {
    const sw = Math.round(rh * (1.6 + rnd() * 1.6));
    const base = .26 + rnd() * .14, sunk = rnd() < .12;
    for (let yy = y; yy < Math.min(H, y + rh); yy++) for (let xx = Math.max(0, x); xx < Math.min(W, x + sw); xx++) {
      const lx = xx - x, ly = yy - y;
      let t = base + (fbm(xx * .12, yy * .18) - .5) * .16 + (fbm(xx * .5, yy * .6) - .5) * .06;
      const chip = NV[((xx * 3) ^ (yy * 11)) & 4095];
      if (lx === 0 || ly === 0) t = chip > .2 ? .02 : t;
      else if (ly === 1 || lx === 1) t += .09;
      else if (ly >= rh - 2 || lx >= sw - 1) t -= .08;
      if (sunk) t -= .06;
      setA(xx, yy, rampAt(STONE, t));
    }
    // 裂缝
    if (rnd() < .3) { let cx = x + rnd() * sw, cy = y + 1; for (let k = 0; k < rh * 1.2; k++) { cx += (rnd() - .5) * 2; cy += rnd() * .9; mulA(cx | 0, cy | 0, .45); } }
    x += sw;
  }
  y += rh; rowi++;
}
// 墙根 AO
for (let yy = WALL; yy < WALL + 18; yy++) for (let x = 0; x < W; x++) mulA(x, yy, .45 + .55 * (yy - WALL) / 18);
// 地面刻痕：仪式圆环
const RC = { x: 240, y: 186, r: 74 };
for (let yy = WALL; yy < H; yy++) for (let x = 0; x < W; x++) {
  const dx = x - RC.x, dy = (yy - RC.y) * 1.75, d = Math.hypot(dx, dy);
  const ring = Math.abs(d - RC.r) < 1.1 || Math.abs(d - RC.r + 7) < .8;
  const ang = Math.atan2(dy, dx);
  const spoke = d < RC.r - 7 && d > RC.r - 22 && Math.abs(((ang / (Math.PI * 2) * 12) % 1 + 1) % 1 - .5) < .03 * (RC.r / d);
  if (ring || spoke) { mulA(x, yy, .5); mulA(x, yy + 1, 1.25); }
}
// 血迹
function blood(cx, cy, r) {
  for (let yy = cy - r; yy <= cy + r; yy++) for (let x = cx - r * 2; x <= cx + r * 2; x++) {
    const d = Math.hypot((x - cx) / 2, yy - cy) / r + (fbm(x * .3, yy * .3) - .5) * .9;
    if (d < 1) { const i = (yy * W + x) * 3; if (yy < WALL) continue; const c = rampAt(CRIM, .15 + (1 - d) * .25); A[i] = A[i] * .3 + c[0] * .7; A[i + 1] = A[i + 1] * .3 + c[1] * .7; A[i + 2] = A[i + 2] * .3 + c[2] * .7; }
  }
  for (let k = 0; k < r * 3; k++) { const a = rnd() * 6.28, dd = r * (1.2 + rnd() * 1.6); setA((cx + Math.cos(a) * dd * 2) | 0, (cy + Math.sin(a) * dd) | 0, CRIM[1]); }
}
blood(150, 214, 6); blood(330, 140, 4); blood(372, 236, 5);
// 散落骸骨
function bone(x, y, len, ang) {
  for (let k = 0; k <= len; k++) { const px = Math.round(x + Math.cos(ang) * k), py = Math.round(y + Math.sin(ang) * k * .6); setA(px, py, BONE[3]); setA(px, py + 1, BONE[0], .6); }
  setA(Math.round(x), Math.round(y) - 1, BONE[4]); setA(Math.round(x + Math.cos(ang) * len), Math.round(y + Math.sin(ang) * len * .6) - 1, BONE[4]);
}
function skull(x, y) {
  const S = ['.bbb.', 'bcccb', 'ckckc', 'bcccb', '.cac.'];
  S.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '.') return; setA(x + i, y + j, ch === 'k' ? INK[1] : ch === 'b' ? BONE[2] : ch === 'a' ? BONE[1] : BONE[3]); }));
  setA(x, y + 5, INK[0], .5); for (let i = 1; i < 5; i++) mulA(x + i, y + 5, .5);
}
for (let k = 0; k < 22; k++) bone(10 + rnd() * 460, WALL + 10 + rnd() * 170, 3 + rnd() * 4, rnd() * 6.28);
[[34, 120], [446, 160], [96, 250], [300, 258], [190, 108], [420, 110]].forEach(([x, y]) => skull(x, y));
// 地面烛群 + 铁火盆
function floorCandles(cx, cy, n) { for (let i = 0; i < n; i++) { const x = cx + Math.round((rnd() - .5) * 18), yb = cy + Math.round((rnd() - .5) * 6), h = 2 + Math.floor(rnd() * 6); CANDLES.push({ x, y: yb - h, h }); } LIGHTS.push({ x: cx, y: cy - 3, c: FLAME[1], i: .9, r: 40, fl: rnd() * 9 }); }
floorCandles(40, 148, 9); floorCandles(446, 214, 8); floorCandles(128, 104, 6);
const BRAZ = [{ x: 34, y: 232 }, { x: 448, y: 124 }];
for (const b of BRAZ) LIGHTS.push({ x: b.x, y: b.y - 12, c: FLAME[2], i: 1.5, r: 64, fl: rnd() * 9, braz: true });
// 蜡烛写入反照率（蜡体），火焰在渲染时画
for (const c of CANDLES) {
  for (let k = 0; k < c.h; k++) { setA(c.x, c.y + k, BONE[k === 0 ? 4 : 3]); setA(c.x + 1, c.y + k, BONE[k === 0 ? 3 : 1]); }
  if (c.h > 4) setA(c.x - 1, c.y + 2, BONE[3]); // 蜡泪
  setA(c.x, c.y + c.h, INK[2]); setA(c.x + 1, c.y + c.h, INK[2]);
}
// 彩窗光柱多边形
const SHAFT = { x0a: 224, x0b: 256, y0: 40, x1a: 236, x1b: 330, y1: 250 };
function inShaft(x, y) {
  if (y < SHAFT.y0 || y > SHAFT.y1) return 0;
  const t = (y - SHAFT.y0) / (SHAFT.y1 - SHAFT.y0), a = SHAFT.x0a + (SHAFT.x1a - SHAFT.x0a) * t, b = SHAFT.x0b + (SHAFT.x1b - SHAFT.x0b) * t;
  if (x < a || x > b) return 0;
  const e = Math.min(x - a, b - x) / 10; return Math.min(1, e) * (1 - t * .6);
}

// ---- 角色：材质分区 → 自动体积着色 ----
const MAT = {
  H: RAMP.cold.slice(0, 6), C: ['#0b080e', '#141220', '#1f1e2e', '#2e3042', '#454a5e', '#626c80'], R: RAMP.crim, M: RAMP.cold.slice(2),
  G: RAMP.gold.slice(1), B: RAMP.bone, W: RAMP.gold.slice(0, 5), L: RAMP.stone.slice(0, 6), K: RAMP.stone.slice(1, 8), F: ['#2c2027', '#3e3434', '#5a4c42', '#7a6a58', '#9a8a70'],
  I: ['#120d15', '#2a2630', '#4a4650', '#6e6a72', '#a09aa0', '#d0ccc8'],
};
const EMIT = { e: RAMP.soul[4], '1': '#ff8a2a', o: '#ffe08a' };
function shadeSprite(rows, light = [-.75, -.55, .42]) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const at = (i, j) => (j >= 0 && j < h && i >= 0 && i < rows[j].length) ? rows[j][i] : '.';
  const matOf = ch => ch === '.' ? null : (EMIT[ch] ? 'E' : ch.toUpperCase());
  const d1 = new Float32Array(w * h), d2 = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const m = matOf(at(i, j)); if (!m) continue;
    let a = 6, b = 4;
    for (let r = 1; r <= 6; r++) { let hitA = false, hitB = false; for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; const m2 = matOf(at(i + di, j + dj)); if (!m2) hitA = true; else if (m2 !== m) hitB = true; } if (hitA && a === 6) a = r; if (hitB && b === 4 && r <= 4) b = r; }
    d1[j * w + i] = a; d2[j * w + i] = b;
  }
  const ht = (i, j) => { if (!matOf(at(i, j))) return 0; const k = j * w + i; return Math.sqrt(Math.min(d1[k], 5) / 5) * .75 + Math.min(d2[k], 3) / 3 * .25; };
  const L = Math.hypot(...light), lx = light[0] / L, ly = light[1] / L, lz = light[2] / L;
  const px = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = at(i, j), m = matOf(ch);
    if (!m) {
      // 选择性描边：取相邻材质最暗色
      let nb = null; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => { const c = at(i + a, j + b); if (c !== '.' && !nb) nb = c; });
      if (nb) { const mm = matOf(nb); const col = mm === 'E' ? '#0b080e' : MAT[mm][0]; px.push([i, j, mix(hx(col), INK[0], .55)]); }
      continue;
    }
    if (m === 'E') { px.push([i, j, hx(EMIT[ch]), true]); continue; }
    const nx = (ht(i - 1, j) - ht(i + 1, j)) * 1.6, ny = (ht(i, j - 1) - ht(i, j + 1)) * 1.6, nz = 1;
    const nl = Math.hypot(nx, ny, nz);
    let v = .05 + 1.05 * Math.max(0, (nx * lx + ny * ly + nz * lz) / nl);
    // 底部反光（来自地面烛火的暖色反射）
    const rim = Math.max(0, (ny / nl)) * .25;
    if (ch !== ch.toUpperCase()) v -= .28; // 小写 = 褶皱/凹陷
    if (ch === '*') v = 1;
    const ramp = MAT[m];
    const idx = Math.max(0, Math.min(ramp.length - 1, Math.round(v * (ramp.length - 1))));
    let col = hx(ramp[idx]);
    if (rim > .08) col = mix(col, FLAME[1], rim * .5);
    px.push([i, j, col]);
  }
  return { w: w + 0, h, px };
}
// 玩家：灰烬守夜人（深兜帽、铁面罩、红披带、骨弩）
const PLAYER = [
  '...........HH............',
  '..........HHHH...........',
  '.........HHHHHH..........',
  '........HHHHHHHH.........',
  '.......HHHHHHHHHH........',
  '......HHHhhhhhhHHH.......',
  '......HHhhhhhhhhHH.......',
  '.....HHHhhIMMMhhhHH......',
  '.....HHhhhIMMMhhhhH......',
  '.....HHhhheIMehhhhH......',
  '.....HHhhhIMmMhhhHH......',
  '.....HHHhhIMmMhhHHH......',
  '....HHHHHhhIMhhHHHHH.....',
  '...CHHHHHHHhhhHHHHHHC....',
  '..CCCRRHHHHHHHHHHHGGCC...',
  '..CCCCRRRRHHHHHHGGGCCC...',
  '.CCCCCCcRRRRRGGRRCCCCCC..',
  '.CCCCcCCCCcRRRRRRRCCCCC.BB',
  '.CCCcCCCCCCCcRRRRRRCCCB..',
  'CCCCcCCCIIIIIIIIIIIIIB...',
  'CCCcCCCCWWWWWWWWWWWWWWIIM',
  'CCCcCCCcCCcCCCCCRRCCCB...',
  'CCcCCCCcCCCcCCCCcRRCC.B..',
  'CCcCCCCcCCCCcCCCcCRRC..BB',
  'CcCCCCcCCCCCcCCCCcCRRC...',
  'CcCCCCcCCCCCCcCCCcCCRC...',
  'cCCCCcCCCCCCCcCCCCcCCR...',
  'cCCCCcCCCCCCCCcCCCcCCCR..',
  '.cCC.cCCCCCC.CCcCCC.cCC..',
  '..c...cCC..LLL..cC...c...',
  '...........L.L...........',
];
// 骷髅兵（高 26，有甲片与锈剑）
const SKEL = [
  '.......BBBBB.......',
  '......BBBBBBB......',
  '.....BBBBBBBBB.....',
  '.....BBbbBbbBB.....',
  '.....BB1bBb1BB.....',
  '.....BBBBbBBBB.....',
  '......BbBbBbB......',
  '.......bBbBb.......',
  '....IIIIbBbIIII....',
  '...IIIIIBBBIIIIII..',
  '...BI.IbBbBbI.IB...',
  '..BB..BbbBbbB..BB..',
  '..B...BbBBBbB...BI.',
  '..B....bBbBb....BI.',
  '.BB....BbbbB....BI.',
  '.B....RRRRRRR...BI.',
  '......RRrRrRR...BI.',
  '......BB...BB...BI.',
  '......Bb...bB...BI.',
  '.....BB.....BB..I..',
  '.....B.......B..I..',
  '.....B.......B.....',
  '....BBb.....bBB....',
];
// 持钟者：佝偻的巨汉，背着铜钟（精英）
const BELL = [
  '..........IIII..........',
  '...........II...........',
  '.........GGGGGG.........',
  '........GGGGGGGG........',
  '........GGGGGGGG........',
  '........GGGGGGGG........',
  '.......GGGGGGGGGG.......',
  '.......GGGGGGGGGG.......',
  '......GGGGGGGGGGGG......',
  '....GGGGGGGGGGGGGGGG....',
  '...gggggggggggggggggg...',
  '..FFFFFFIFKKKKFIFFFFFF..',
  '.FFFFFFFFIKKKKIFFFFFFFF.',
  '.FFFFFFFFKBoBoKFFFFFFFF.',
  'FFFfFFFFFKBBBBKIFFFFfFFF',
  'FFFfFFFFFIKBbBKFIFFFfFFF',
  'FFf.FfFFIFFKKKFFFIFF.fFF',
  'FFf.FFfIFFFFFFFFFFIF.fFF',
  'FF..FFIFfFFFFFFfFFFI..FF',
  'FF..FIFFFfFFFFfFFFFF..FF',
  'BB..LLLLLLLLLLLLLLLL..BB',
  'BBB.LLLLlLLLLLLlLLLL.BBB',
  '....LLLlLLLLLLLLlLLL....',
  '....LLLLLLLL.LLLLLLL....',
  '....FFFF......FFFFF.....',
  '...BBFFF......FFFBB.....',
];
const SP = { player: shadeSprite(PLAYER), skel: shadeSprite(SKEL), bell: shadeSprite(BELL) };
const HAND = window.HAND_SPRITES || null;
const ENTS = [
  { s: SP.player, hand: 'player', x: 236, y: 192, ph: 0 },
  { s: SP.skel, hand: 'skel', x: 314, y: 206, ph: 1.2 }, { s: SP.skel, hand: 'skel', x: 168, y: 152, ph: .4 }, { s: SP.skel, hand: 'skel', x: 116, y: 222, ph: 2.1 },
  { s: SP.skel, hand: 'skel', x: 360, y: 160, ph: 3.3 }, { s: SP.skel, hand: 'skel', x: 404, y: 244, ph: 1.7 },
  { s: SP.bell, x: 300, y: 122, ph: 0, big: true },
];

// ---- 渲染 ----
// 现代光影开关（默认全关 = 原样稿）。light: 鼠标/自动环绕的可移动光源（低分辨率坐标）
const FX = { normal: false, bloom: 'off', shadow: false, haze: false, hit: false, grade: 'none', light: null };
window.GothicFX = FX;
const HIT = { t: -9, sparks: [] };
const SH = new Float32Array(W * H), TMP = new Float32Array(W * H * 3), BL = new Float32Array(W * H * 3);
function nrmOf(s) {
  if (s.nrm) return s.nrm;
  const m = new Uint8Array(s.w * s.h); for (const [i, j] of s.px) m[j * s.w + i] = 1;
  const on = (i, j) => i >= 0 && j >= 0 && i < s.w && j < s.h && m[j * s.w + i];
  const dist = (i, j) => { if (!on(i, j)) return 0; for (let r = 1; r <= 5; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) if (Math.max(Math.abs(di), Math.abs(dj)) === r && !on(i + di, j + dj)) return r; return 5; };
  const hh = (i, j) => Math.sqrt(dist(i, j) / 5);
  s.nrm = s.px.map(([i, j]) => { const nx = (hh(i - 1, j) - hh(i + 1, j)) * 1.5, ny = (hh(i, j - 1) - hh(i, j + 1)) * 1.5, l = Math.hypot(nx, ny, 1); return [nx / l, ny / l, 1 / l]; });
  return s.nrm;
}
function boxBlur(src, r) {  // 低分辨率可分离盒式模糊，原地
  for (const horiz of [true, false]) {
    const n = horiz ? W : H, m = horiz ? H : W;
    for (let a = 0; a < m; a++) {
      let sr = 0, sg = 0, sb = 0;
      const idx = k => (horiz ? (a * W + k) : (k * W + a)) * 3;
      for (let k = -r; k <= r; k++) { const q = idx(Math.max(0, Math.min(n - 1, k))); sr += src[q]; sg += src[q + 1]; sb += src[q + 2]; }
      for (let k = 0; k < n; k++) {
        const o = idx(k); TMP[o] = sr / (2 * r + 1); TMP[o + 1] = sg / (2 * r + 1); TMP[o + 2] = sb / (2 * r + 1);
        const qa = idx(Math.max(0, k - r)), qb = idx(Math.min(n - 1, k + r + 1));
        sr += src[qb] - src[qa]; sg += src[qb + 1] - src[qa + 1]; sb += src[qb + 2] - src[qa + 2];
      }
    }
    src.set(TMP);
  }
}
const lo = document.createElement('canvas'); lo.width = W; lo.height = H;
const lg = lo.getContext('2d'); const img = lg.createImageData(W, H);
const blo = document.createElement('canvas'); blo.width = W; blo.height = H; const blg = blo.getContext('2d'); const bimg = blg.createImageData(W, H);
const bsm = document.createElement('canvas'); bsm.width = W / 4; bsm.height = Math.round(H / 4); const bsg = bsm.getContext('2d');
const BUF = new Float32Array(W * H * 3), LM = new Float32Array(W * H * 3);
const embers = []; for (let i = 0; i < 40; i++) embers.push({ x: rnd() * W, y: rnd() * H, v: .2 + rnd() * .5, ph: rnd() * 9 });
const motes = []; for (let i = 0; i < 50; i++) motes.push({ x: 230 + rnd() * 90, y: 40 + rnd() * 200, ph: rnd() * 9 });

function render(t, rt = t) {
  // 光照图
  const amb = [.17, .15, .23];
  const DL = FX.light ? LIGHTS.concat([{ x: FX.light.x, y: FX.light.y, c: [1, .82, .6], i: 1.7, r: 62, fl: 0, h: 24, still: true }]) : LIGHTS;
  const flick = DL.map(l => l.still ? l.i : l.i * (1 + .12 * Math.sin(t * 9 + l.fl) + .06 * Math.sin(t * 23 + l.fl * 2)));
  const player = ENTS[0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, wall = F[y * W + x];
    let r = amb[0], g = amb[1], b = amb[2];
    for (let k = 0; k < DL.length; k++) {
      const l = DL[k], dx = x - l.x, dy = (y - l.y) * (wall ? 1 : 1.6);
      const d2 = (dx * dx + dy * dy) / (l.r * l.r); if (d2 > 4) continue;
      const f = flick[k] / (1 + d2 * 6) * (1 - d2 / 4);
      r += l.c[0] * f; g += l.c[1] * f; b += l.c[2] * f;
    }
    // 玩家脚下的魂火
    { const dx = x - player.x, dy = (y - player.y + 6) * 1.6, d2 = (dx * dx + dy * dy) / 900; if (d2 < 4) { const f = .5 / (1 + d2 * 6) * (1 - d2 / 4); r += SOUL[3][0] * f; g += SOUL[3][1] * f; b += SOUL[3][2] * f; } }
    const s = inShaft(x, y);
    if (s > 0) { const n = .7 + .3 * fbm(x * .05 + t * .1, y * .05); r += .5 * s * n; g += .42 * s * n; b += .55 * s * n; }
    LM[i] = r; LM[i + 1] = g; LM[i + 2] = b;
    BUF[i] = A[i] * r * 2.2 + E[i]; BUF[i + 1] = A[i + 1] * g * 2.2 + E[i + 1]; BUF[i + 2] = A[i + 2] * b * 2.2 + E[i + 2];
  }
  const put = (x, y, c, k = 1) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; BUF[i] = c[0] * k; BUF[i + 1] = c[1] * k; BUF[i + 2] = c[2] * k; };
  const add = (x, y, c, k) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; BUF[i] += c[0] * k; BUF[i + 1] += c[1] * k; BUF[i + 2] += c[2] * k; };
  const mul = (x, y, k) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; BUF[i] *= k; BUF[i + 1] *= k; BUF[i + 2] *= k; };
  // 火焰
  for (const c of CANDLES) {
    const fh = 2 + ((Math.sin(t * 11 + c.x) > .3) ? 1 : 0);
    for (let k = 0; k < fh; k++) put(c.x + (k === fh - 1 && Math.sin(t * 7 + c.x) > 0 ? 1 : 0), c.y - 1 - k, FLAME[k === 0 ? 3 : k === 1 ? 2 : 1], 1.1);
    put(c.x, c.y - 1, FLAME[4]);
  }
  // 火盆
  for (const b of BRAZ) {
    for (let yy = -5; yy <= 12; yy++) for (let xx = -9; xx <= 9; xx++) {
      const bowl = yy >= -5 && yy <= 0 && Math.abs(xx) <= 9 - (yy + 5) * .6, leg = yy > 0 && (Math.abs(xx) === 6 - (yy >> 2) || (xx === 0 && yy < 9));
      if (bowl || leg) { const lit = yy === -4 ? 1.6 : 1 - (xx + 8) / 30; put(b.x + xx, b.y + yy, rampAt(MAT.I.map(hx), .25 * lit + .05)); }
    }
    for (let yy = -22; yy <= -4; yy++) for (let xx = -6; xx <= 6; xx++) {
      const h = (-4 - yy) / 18, wid = 6 * (1 - h) * (.6 + .4 * Math.sin(h * 3)), nz = vnoise(xx * .5 + 10, yy * .35 + t * 7);
      if (Math.abs(xx) > wid + nz * 2 - 1) continue;
      const heat = (1 - h) * (1 - Math.abs(xx) / (wid + 1)) + nz * .5 - .25;
      if (heat < .1) continue;
      put(b.x + xx, b.y + yy, FLAME[Math.min(4, Math.floor(heat * 5))], 1.1);
    }
  }
  // 实体：脚下阴影 + 精灵（按 y 排序）
  const ents = ENTS.slice().sort((a, b) => a.y - b.y);
  const hitAge = rt - HIT.t, target = ENTS[1];
  const frameOf = e => { let s = e.s; if (HAND && e.hand) { const fr = HAND[e.hand]; s = fr[Math.floor(t * 6 + e.ph * 3) % fr.length]; } return s; };
  const kb = e => (FX.hit && e === target && hitAge < .25) ? Math.round(3 * (1 - hitAge / .25)) : 0;
  if (FX.shadow) {
    // 动态投影：把精灵轮廓按每个近处光源反方向投到地面
    SH.fill(1);
    const casters = DL.filter(l => l.braz || l.still || l.i >= .85);
    for (const e of ents) {
      const s = frameOf(e), ex0 = e.x + kb(e);
      for (const l of casters) {
        let dx = ex0 - l.x, dy = (e.y - l.y) * 1.6; const d = Math.hypot(dx, dy); if (d > l.r * 2.2 || d < 1) continue;
        dx /= d; dy /= d; const k = .62 * Math.min(1, (l.r * 2.2 - d) / (l.r * 1.2)), lh = l.h || (l.braz ? 16 : 7), stretch = Math.min(2.2, 26 / lh);
        for (const [i, j] of s.px) {
          const hgt = s.h - j, fx = Math.round(ex0 - s.w / 2 + i + dx * hgt * .7 * stretch * .5 - (i - s.w / 2) * .3), fy = Math.round(e.y + dy * hgt * .3 * stretch);
          for (const o of [0, 1]) { const q = fy * W + fx + o; if (fy > WALL && fy < H && fx + o >= 0 && fx + o < W) SH[q] = Math.min(SH[q], 1 - k); }
        }
      }
      for (let xx = -s.w * .3; xx <= s.w * .3; xx++) for (const yy of [-1, 0, 1]) { const q = (e.y + yy) * W + Math.round(ex0 + xx); if (q >= 0 && q < W * H) SH[q] = Math.min(SH[q], .35); }
    }
    for (let q = 0; q < W * H; q++) if (SH[q] < 1) { BUF[q * 3] *= SH[q]; BUF[q * 3 + 1] *= SH[q]; BUF[q * 3 + 2] *= SH[q]; }
  }
  for (const e of ents) {
    const s = frameOf(e);
    const bob = Math.round(Math.sin(t * 4 + e.ph) * .6), ex0 = e.x + kb(e), ox = Math.round(ex0 - s.w / 2), oy = Math.round(e.y - s.h) + bob;
    if (!FX.shadow) { const sw = s.w * .5, sh = e.big ? 4 : 3; for (let yy = -sh; yy <= sh; yy++) for (let xx = -sw; xx <= sw; xx++) if ((xx / sw) ** 2 + (yy / sh) ** 2 < 1) mul(ex0 + xx, e.y + yy, .45); }
    const flash = FX.hit && e === target && hitAge < .09;
    const li = (e.y * W + (e.x | 0)) * 3, lr = LM[li], lgc = LM[li + 1], lb = LM[li + 2];
    const lum = Math.max(.9, Math.min(1.5, (lr + lgc + lb) / .9));
    const nrm = FX.normal ? nrmOf(s) : null;
    const near = nrm ? DL.map((l, k) => [l, flick[k]]).filter(([l]) => Math.abs(l.x - e.x) < l.r * 2 && Math.abs(l.y - e.y) < l.r * 1.4) : null;
    s.px.forEach(([i, j, c, em], n) => {
      if (flash) { put(ox + i, oy + j, BONE[5], .95); return; }
      if (em) { put(ox + i, oy + j, c, 1.2); return; }
      if (!nrm) { put(ox + i, oy + j, [c[0] * lum * (.8 + lr * .4), c[1] * lum * (.8 + lgc * .3), c[2] * lum * (.8 + lb * .3)]); return; }
      // 法线光照：像素在角色身上的高度 = 脚底到该像素
      const [nx, ny, nz] = nrm[n], X = ox + i, hgt = s.h - j;
      let r = .3, g = .29, b = .38;
      for (const [l, fi] of near) {
        const lx = l.x - X, lup = (l.h || (l.braz ? 16 : 6)) - hgt, lz = (l.y - e.y) * 1.2 + 4, dl = Math.hypot(lx, lup, lz);
        const dot = Math.max(0, (nx * lx - ny * lup + nz * lz) / dl), fall = fi / (1 + (dl / l.r) ** 2 * 5);
        r += l.c[0] * dot * fall * 1.5; g += l.c[1] * dot * fall * 1.5; b += l.c[2] * dot * fall * 1.5;
      }
      put(X, oy + j, [c[0] * r * 1.6, c[1] * g * 1.6, c[2] * b * 1.6]);
    });
  }
  // 骨弩箭矢与拖尾 → 命中火花
  const pr = (t * 1.3) % 1, sx = 252, sy = 167, ex = 306, ey = 186;
  const bx = sx + (ex - sx) * pr, by = sy + (ey - sy) * pr;
  for (let k = 0; k < 14; k++) { const q = Math.max(0, pr - k * .012); add(sx + (ex - sx) * q, sy + (ey - sy) * q, SOUL[3], .6 - k * .04); }
  for (let k = 0; k < 4; k++) put(bx - k * 1.2, by - k * .4, k === 0 ? SOUL[4] : BONE[4]);
  if (!FX.hit && pr > .85) { for (let k = 0; k < 10; k++) { const a = k * .63 + t * 3, d = (pr - .85) * 60; add(ex + Math.cos(a) * d, ey - 8 + Math.sin(a) * d * .7, SOUL[4], .9); } }
  if (FX.hit) for (const p of HIT.sparks) { const a = rt - p.t0; if (a > p.life) continue; const x = p.x + p.vx * a, y = p.y + p.vy * a + 60 * a * a; add(x, y, p.c, 1.2 * (1 - a / p.life)); if (p.trail) add(x - p.vx * .012, y - p.vy * .012, p.c, .5 * (1 - a / p.life)); }
  // 骷髅身上的血/骨屑飞溅（固定一帧）
  [[160, 142], [176, 136], [172, 131], [164, 129]].forEach(([x, y], k) => put(x, y + Math.sin(t * 5 + k), BONE[4]));
  // 可移动光源：一团漂浮的鬼火
  if (FX.light) {
    const lx = Math.round(FX.light.x), ly = Math.round(FX.light.y - 12 + Math.sin(rt * 3) * 1.5);
    for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) { const d = Math.hypot(xx, yy * 1.2); if (d < 3.2) put(lx + xx, ly + yy, d < 1.2 ? FLAME[4] : d < 2.2 ? FLAME[3] : FLAME[2], 1.05); }
    for (let k = 0; k < 4; k++) put(lx + Math.round(Math.sin(rt * 6 + k) * 1.5), ly + 4 + k, FLAME[2], .9 - k * .2);
  }
  // 前景剪影：吊着的链条与香炉（视差）
  const sway = Math.sin(t * .8) * 2;
  for (let yy = 0; yy < 58; yy++) { const xx = 14 + sway * yy / 58; put(xx, yy, (yy & 3) < 2 ? INK[0] : INK[2]); put(xx + 1, yy, INK[0]); }
  for (let yy = 0; yy < 12; yy++) for (let xx = -6; xx <= 6; xx++) if (Math.abs(xx) <= 6 - Math.abs(yy - 5) * .5) put(16 + sway + xx, 58 + yy, yy === 0 ? COLD[2] : INK[1]);
  for (let k = 0; k < 6; k++) add(16 + sway + Math.sin(t + k) * 3, 56 - k * 4 - (t * 8 % 4), COLD[3], .12);
  for (let yy = 0; yy < 32; yy++) { const xx = 470 - sway * .6; put(xx, yy, (yy & 3) < 2 ? INK[0] : INK[2]); }
  // 前景立柱剪影（右下）
  for (let yy = 196; yy < H; yy++) for (let xx = 0; xx < 26; xx++) { const x = W - 26 + xx - Math.max(0, (yy - 230) * .1); if (xx < 2) put(x, yy, STONE[2], .6); else put(x, yy, INK[0]); }
  // 余烬上升
  for (const m of embers) { const yy = (m.y - t * 14 * m.v) % H, y2 = yy < 0 ? yy + H : yy; const x = m.x + Math.sin(t * 2 + m.ph) * 3; if (Math.sin(t * 5 + m.ph) > -.3) add(x, y2, FLAME[1], .8); }
  // 光柱中的浮尘
  for (const m of motes) { const x = m.x + Math.sin(t * .7 + m.ph) * 4, y = m.y + Math.cos(t * .5 + m.ph) * 3; const s = inShaft(x | 0, y | 0); if (s > .1) add(x, y, BONE[5], .5 * s); }
  // 地雾 + 暗角
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3;
    const fog = Math.max(0, fbm(x * .02 + t * .06, y * .05 - t * .02) - .45) * (y > WALL ? .5 : .25);
    BUF[i] += .17 * fog; BUF[i + 1] += .16 * fog; BUF[i + 2] += .24 * fog;
    const vx = (x - W / 2) / (W / 2), vy = (y - H * .55) / (H * .6), v = 1 - Math.min(1, Math.pow(vx * vx * .7 + vy * vy, 1.4)) * .75;
    BUF[i] *= v; BUF[i + 1] *= v; BUF[i + 2] *= v;
  }
  // 热浪与冲击波：低分辨率位移
  if (FX.haze) {
    TMP.set(BUF);
    for (const b of BRAZ) for (let y = b.y - 46; y < b.y - 6; y++) {
      const fade = Math.min(1, (y - (b.y - 46)) / 14) * Math.min(1, (b.y - 6 - y) / 6), off = Math.round(Math.sin(y * .8 + t * 10) * 1.3 * fade);
      if (!off) continue; for (let x = b.x - 11; x <= b.x + 11; x++) { const q = (y * W + x) * 3, q2 = (y * W + x + off) * 3; BUF[q] = TMP[q2]; BUF[q + 1] = TMP[q2 + 1]; BUF[q + 2] = TMP[q2 + 2]; }
    }
    if (FX.hit && hitAge < .35) {
      const R0 = hitAge * 130, cxh = 306, cyh = 180; TMP.set(BUF);
      for (let y = cyh - 50; y < cyh + 50; y++) for (let x = cxh - 50; x < cxh + 50; x++) {
        const dx = x - cxh, dy = (y - cyh) * 1.4, d = Math.hypot(dx, dy), w = 1 - Math.abs(d - R0) / 4; if (w <= 0 || d < 1) continue;
        const k = 2.2 * w * (1 - hitAge / .35), sx2 = Math.round(x - dx / d * k), sy2 = Math.round(y - dy / d * k * .7), q = (y * W + x) * 3, q2 = (sy2 * W + sx2) * 3;
        BUF[q] = TMP[q2] * 1.08; BUF[q + 1] = TMP[q2 + 1] * 1.08; BUF[q + 2] = TMP[q2 + 2] * 1.12;
      }
    }
  }
  // 辉光：亮部提取 → 模糊
  if (FX.bloom !== 'off') {
    for (let q = 0; q < W * H * 3; q += 3) { const L = BUF[q] * .3 + BUF[q + 1] * .59 + BUF[q + 2] * .11, k = Math.max(0, L - .6) * 2.4; BL[q] = BUF[q] * k; BL[q + 1] = BUF[q + 1] * k; BL[q + 2] = BUF[q + 2] * k; }
    boxBlur(BL, FX.bloom === 'pixel' ? 4 : 2); if (FX.bloom === 'pixel') boxBlur(BL, 3);
    if (FX.bloom === 'pixel') for (let q = 0; q < W * H * 3; q++) BUF[q] += BL[q] * .9;
  }
  // 量化
  const d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 3, o = (y * W + x) * 4, dz = BAYER[(y & 3) * 4 + (x & 3)] * .022;
    const q = c => Math.max(0, Math.min(31, Math.round((c + dz) * 31)));
    const p = PALETTE[LUT[(q(BUF[i]) << 10) | (q(BUF[i + 1]) << 5) | q(BUF[i + 2])]];
    d[o] = p[0] * 255; d[o + 1] = p[1] * 255; d[o + 2] = p[2] * 255; d[o + 3] = 255;
  }
  if (FX.grade !== 'none') for (let o = 0; o < d.length; o += 4) {
    const r = d[o], g = d[o + 1], b = d[o + 2], L = (r * .3 + g * .59 + b * .11) / 255;
    if (FX.grade === 'cold') { d[o] = r * .82 + 4; d[o + 1] = g * .94 + 6; d[o + 2] = Math.min(255, b * 1.12 + 22 * (1 - L)); }
    else { d[o] = Math.min(255, r * 1.18 + 18 * (1 - L)); d[o + 1] = g * .78; d[o + 2] = b * .74; }
  }
  lg.putImageData(img, 0, 0);
  if (FX.bloom === 'hd') {
    const bd = bimg.data;
    for (let q = 0, o = 0; q < W * H * 3; q += 3, o += 4) { bd[o] = Math.min(255, BL[q] * 255); bd[o + 1] = Math.min(255, BL[q + 1] * 255); bd[o + 2] = Math.min(255, BL[q + 2] * 255); bd[o + 3] = 255; }
    blg.putImageData(bimg, 0, 0);
  }
}

window.GothicDrawSprite = function (ctx, name, x, y, z) { const sp = SP[name]; for (const [i, j, c] of sp.px) { ctx.fillStyle = `rgb(${c[0] * 255 | 0},${c[1] * 255 | 0},${c[2] * 255 | 0})`; ctx.fillRect(x + i * z, y + j * z, z, z); } return sp; };

// ---- 输出 + 高清 HUD（Noto Sans SC，平滑文字）----
window.GothicMock = function (canvas, opts = {}) {
  const cx = canvas.getContext('2d'), Z = canvas.width / W;
  const hud = opts.hud !== false;
  let simT = 0, lastRt = null, lastPr = 0;
  function frame(rt, fixed) {
    // 顿帧：命中后 70ms 世界时间暂停
    if (fixed != null) simT = fixed; else { const dt = lastRt == null ? 0 : rt - lastRt; lastRt = rt; if (!(FX.hit && rt - HIT.t < .07)) simT += dt; }
    const t = simT, pr = (t * 1.3) % 1;
    if (lastPr < .85 && pr >= .85) {
      HIT.t = rt; HIT.sparks = HIT.sparks.filter(p => rt - p.t0 < p.life);
      for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 70; HIT.sparks.push({ x: 306, y: 182, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7 - 30, t0: rt, life: .25 + Math.random() * .3, c: k % 3 ? SOUL[4] : BONE[5], trail: true }); }
      for (let k = 0; k < 7; k++) HIT.sparks.push({ x: 312, y: 184, vx: 20 + Math.random() * 50, vy: -40 - Math.random() * 40, t0: rt, life: .6, c: BONE[3] });
    }
    lastPr = pr;
    if (FX.light && FX.light.auto) { FX.light.x = 236 + Math.cos(rt * .9) * 58; FX.light.y = 192 + Math.sin(rt * .9) * 30; }
    render(t, rt);
    const age = rt - HIT.t, shake = FX.hit && age < .16 ? Math.round((Math.random() - .5) * 4 * (1 - age / .16)) * Z / 2 : 0, shake2 = FX.hit && age < .16 ? Math.round((Math.random() - .5) * 3 * (1 - age / .16)) * Z / 2 : 0;
    cx.fillStyle = '#000'; cx.fillRect(0, 0, canvas.width, canvas.height);
    cx.imageSmoothingEnabled = false; cx.drawImage(lo, shake, shake2, W * Z, H * Z);
    if (FX.bloom === 'hd') {
      bsg.clearRect(0, 0, bsm.width, bsm.height); bsg.imageSmoothingEnabled = true; bsg.drawImage(blo, 0, 0, bsm.width, bsm.height);
      cx.save(); cx.globalCompositeOperation = 'lighter'; cx.imageSmoothingEnabled = true; cx.globalAlpha = .95; cx.drawImage(bsm, shake, shake2, W * Z, H * Z); cx.globalAlpha = .5; cx.drawImage(blo, shake, shake2, W * Z, H * Z); cx.restore();
    }
    if (!hud) return;
    const f = (px, w = 500) => `${w} ${px * Z}px "Noto Sans SC", sans-serif`;
    // 顶部：生命条（铸铁框 + 血红）
    cx.fillStyle = 'rgba(5,3,7,.78)'; cx.fillRect(6 * Z, 6 * Z, 132 * Z, 12 * Z);
    cx.strokeStyle = '#7a4c16'; cx.lineWidth = Z; cx.strokeRect(6.5 * Z, 6.5 * Z, 131 * Z, 11 * Z);
    const hp = .72 + .04 * Math.sin(t);
    const gr = cx.createLinearGradient(0, 8 * Z, 0, 16 * Z); gr.addColorStop(0, '#d65038'); gr.addColorStop(.5, '#8a1d25'); gr.addColorStop(1, '#3e0d14');
    cx.fillStyle = gr; cx.fillRect(9 * Z, 9 * Z, 126 * hp * Z, 6 * Z);
    cx.fillStyle = '#f0c860'; cx.fillRect(9 * Z + 126 * hp * Z - Z, 9 * Z, Z, 6 * Z);
    cx.font = f(7, 600); cx.fillStyle = '#e5dabd'; cx.textBaseline = 'middle'; cx.fillText('105 / 146', 12 * Z, 12.3 * Z);
    // 标题（居中）
    cx.textAlign = 'center'; cx.font = f(9, 600); cx.fillStyle = '#c7b796';
    cx.shadowColor = '#000'; cx.shadowBlur = 3 * Z; cx.fillText('第一层 · 白骨长廊', W / 2 * Z, 12 * Z); cx.shadowBlur = 0;
    cx.textAlign = 'left';
    // 伤害数字（平滑字体，金/白）
    if (pr > .85 || pr < .35) { const a = pr > .85 ? (pr - .85) * 3 : .45 + pr; cx.globalAlpha = Math.max(0, 1 - a * .9); cx.font = f(9, 800); cx.lineWidth = 2.5 * Z * .5; cx.strokeStyle = '#0b080e'; cx.strokeText('38', 300 * Z, (168 - a * 14) * Z); cx.fillStyle = '#fbe6a0'; cx.fillText('38', 300 * Z, (168 - a * 14) * Z); cx.globalAlpha = 1; }
    cx.font = f(8, 800); cx.strokeStyle = '#0b080e'; cx.lineWidth = 1.2 * Z; cx.strokeText('112!', 150 * Z, 118 * Z); cx.fillStyle = '#d65038'; cx.fillText('112!', 150 * Z, 118 * Z);
    // 精英名牌
    cx.font = f(6.5, 600); cx.textAlign = 'center'; cx.fillStyle = '#d29a32'; cx.strokeStyle = '#0b080e'; cx.lineWidth = Z; cx.strokeText('持钟者 · 精英', 300 * Z, 92 * Z); cx.fillText('持钟者 · 精英', 300 * Z, 92 * Z);
    cx.fillStyle = 'rgba(5,3,7,.8)'; cx.fillRect(282 * Z, 95 * Z, 36 * Z, 3 * Z); cx.fillStyle = '#b0302d'; cx.fillRect(282.5 * Z, 95.5 * Z, 26 * Z, 2 * Z);
    cx.textAlign = 'left';
  }
  if (opts.still != null) { frame(opts.still, opts.still); return; }
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(1.7, 1.7); return; }
  let t0 = performance.now(), last = 0, alive = true;
  window.__mockStop = () => { alive = false; };
  (function loop(now) { if (!alive) return; if (now - last > 66) { last = now; frame((now - t0) / 1000); } requestAnimationFrame(loop); })(t0);
};
})();
