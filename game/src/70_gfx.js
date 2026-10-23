/* ---------- 纹理生成 ---------- */
function cvs(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); fn(x, w, h); return c; }
function px(x, c, a, b, w = 1, h = 1) { x.fillStyle = c; x.fillRect(a, b, w, h); }
function bevelCanvas(w, h, fill, hi, lo, edge = COL.ink) {
  return cvs(w, h, x => {
    px(x, edge, 1, 0, w - 2, 1); px(x, edge, 1, h - 1, w - 2, 1); px(x, edge, 0, 1, 1, h - 2); px(x, edge, w - 1, 1, 1, h - 2);
    px(x, fill, 1, 1, w - 2, h - 2);
    px(x, hi, 1, 1, w - 2, 1); px(x, hi, 1, 1, 1, h - 2);
    px(x, lo, 1, h - 2, w - 2, 1); px(x, lo, w - 2, 1, 1, h - 2);
  });
}
function buildTextures(sc) {
  const T = sc.textures;
  const add = (k, c) => { if (T.exists(k)) T.remove(k); T.addCanvas(k, c); };
  buildSprites(); makeSmallIcons();
  for (const k of MOB_SPR) SPR[k].forEach((f, i) => { add(`m_${k}_${i}`, f.n); add(`m_${k}_${i}_e`, f.e2); add(`m_${k}_${i}_fl`, f.fl); });
  SPR.hero.forEach((c, i) => { add('hero_' + i, c); add('hero_fl_' + i, SPR.heroFl[i]); });
  for (const m of MODS) add('mod_' + m.id, SPR.mods[m.id] || SPR.mods[m.icon || 'RapidProjectiles']);
  add('ghost', SPR.ghost); add('chest', SPR.chest); add('chestG', SPR.chestG); add('skull', SPR.skull); add('torch', SPR.torch);
  for (const k in SPR.icons) add('i_' + k, SPR.icons[k]);
  for (const k of ['anvil', 'star', 'book', 'ladder']) add('i_' + k, sprite(ART[k]));
  add('i_soulf', sprite(ART.soulf)); add('cursor', sprite(ART.cursor, '#0d0a12')); add('up', sprite(ART.up.map(r => r.replace(/g/g, 'm')), '#0d0a12'));
  add('shard', SPR.shard); for (const g of GLYPHS) add('glyph_' + g.id, SPR.glyphs[g.id]);
  add('dust', DUST_ICON); add('soul', SOUL_ICON); add('glow', GLOW);
  add('px', cvs(1, 1, x => px(x, '#fff', 0, 0)));
  add('px2', cvs(2, 2, x => px(x, '#fff', 0, 0, 2, 2)));
  // 光照用的柔和光斑：白色，透明度按 (1-d²)² 衰减
  add('ldisc', cvs(64, 64, x => { const d = x.createImageData(64, 64); for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const r2 = ((i - 31.5) ** 2 + (j - 31.5) ** 2) / 1024, a = r2 >= 1 ? 0 : (1 - r2) ** 2, o = (j * 64 + i) * 4; d.data[o] = d.data[o + 1] = d.data[o + 2] = 255; d.data[o + 3] = Math.round(a * 255); } x.putImageData(d, 0, 0); }));
  add('shadow', cvs(9, 3, x => { px(x, 'rgba(0,0,0,.4)', 1, 0, 7, 3); px(x, 'rgba(0,0,0,.4)', 0, 1, 9, 1); }));
  // 界面九宫格
  add('f_btn', bevelCanvas(12, 12, '#3a3049', '#5e4f74', '#221b2c'));
  add('f_btn_h', bevelCanvas(12, 12, '#4b3e60', '#7a6896', '#2a2236'));
  add('f_btn_d', bevelCanvas(12, 12, '#211b29', '#2a2333', '#18131e'));
  add('f_btn_w', bevelCanvas(12, 12, '#9a521e', '#ffb45e', '#5a2a0c'));
  add('f_btn_wh', bevelCanvas(12, 12, '#b8642a', '#ffd08a', '#6a320e'));
  add('f_btn_s', bevelCanvas(12, 12, '#5a3a14', '#e0b050', '#2e1c08'));
  add('f_btn_r', bevelCanvas(12, 12, '#5a1c22', '#c0505a', '#2a0c10'));
  add('f_plaque', bevelCanvas(12, 12, '#4a2e10', '#d8a048', '#22140a'));
  add('f_bar', bevelCanvas(12, 12, '#1b1520', '#33293f', '#0f0b14'));
  add('f_slot', cvs(8, 8, x => { px(x, COL.ink, 0, 0, 8, 8); px(x, '#140f1b', 1, 1, 6, 6); px(x, '#0a070d', 1, 1, 6, 1); px(x, '#0a070d', 1, 1, 1, 6); px(x, '#30283c', 1, 6, 6, 1); px(x, '#30283c', 6, 1, 1, 6); }));
  // 凹槽内圈的稀有度光：最外一圈实色，往里两圈渐淡
  add('f_glow', cvs(8, 8, x => { for (const [k, a] of [[0, 0.95], [1, 0.4], [2, 0.15]]) { x.strokeStyle = `rgba(255,255,255,${a})`; x.lineWidth = 1; x.strokeRect(k + 0.5, k + 0.5, 8 - 2 * k - 1, 8 - 2 * k - 1); } }));
  add('f_rar', cvs(6, 6, x => { px(x, '#fff', 0, 0, 6, 1); px(x, '#fff', 0, 5, 6, 1); px(x, '#fff', 0, 0, 1, 6); px(x, '#fff', 5, 0, 1, 6); }));
  add('f_tip', cvs(6, 6, x => { px(x, COL.ink, 0, 0, 6, 6); px(x, '#5a4d6e', 1, 1, 4, 4); px(x, 'rgba(15,11,20,.97)', 2, 2, 2, 2); }));
  add('f_win', cvs(24, 24, x => {
    const w = 24, h = 24;
    px(x, COL.ink, 2, 0, w - 4, 1); px(x, COL.ink, 2, h - 1, w - 4, 1); px(x, COL.ink, 0, 2, 1, h - 4); px(x, COL.ink, w - 1, 2, 1, h - 4); px(x, COL.ink, 1, 1); px(x, COL.ink, w - 2, 1); px(x, COL.ink, 1, h - 2); px(x, COL.ink, w - 2, h - 2);
    px(x, '#a8742a', 1, 2, w - 2, h - 4); px(x, '#a8742a', 2, 1, w - 4, h - 2);
    px(x, '#f0c060', 2, 1, w - 4, 1); px(x, '#f0c060', 1, 2, 1, h - 4);
    px(x, '#5a3a14', 2, h - 2, w - 4, 1); px(x, '#5a3a14', w - 2, 2, 1, h - 4);
    px(x, '#6a4416', 3, 3, w - 6, h - 6);
    px(x, COL.ink, 4, 4, w - 8, h - 8);
    px(x, '#1d1726', 5, 5, w - 10, h - 10);
    px(x, '#2a2236', 5, 5, w - 10, 1);
    for (const [a, b] of [[2, 2], [w - 4, 2], [2, h - 4], [w - 4, h - 4]]) { px(x, '#ffe08a', a, b, 2, 2); px(x, '#5a3a14', a + 1, b + 1); }
  }));
  chromeTextures(add);
  add('node', cvs(22, 22, x => {
    const o = [[7, 0, 8, 1], [4, 1, 14, 1], [2, 2, 18, 2], [1, 4, 20, 3], [0, 7, 22, 8], [1, 15, 20, 3], [2, 18, 18, 2], [4, 20, 14, 1], [7, 21, 8, 1]];
    for (const [a, b, w, h] of o) px(x, '#fff', a, b, w, h);
  }));
  add('nodeIn', cvs(22, 22, x => {
    const o = [[7, 2, 8, 1], [5, 3, 12, 1], [3, 4, 16, 3], [2, 7, 18, 8], [3, 15, 16, 3], [5, 18, 12, 1], [7, 19, 8, 1]];
    for (const [a, b, w, h] of o) px(x, '#fff', a, b, w, h);
  }));
}
/* ---------- 游戏化界面外框：铁框 + 青铜、凹槽、血球、骨头条、石台 ---------- */
const CH = { ink: '#0b080e', iron: '#2e2638', iron2: '#45394f', ironH: '#5d4f6b', br: '#7a4c16', brH: '#c9893a', gold: '#e8b84a' };
function chromeTextures(add) {
  let seed = 7; const R = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  // 九宫格外框：铁边、青铜细线、四角铆钉；fill 是两种底色交替的噪点
  const frame = (w, cn, fill) => cvs(w, w, x => {
    const h = w, P = (c, a, b, ww = 1, hh = 1) => px(x, c, a, b, ww, hh);
    if (fill) for (let j = 3; j < h - 3; j++) for (let i = 3; i < w - 3; i++) P(typeof fill === 'function' ? fill() : R() < 0.5 ? fill[0] : fill[1], i, j);
    P(CH.ink, 1, 0, w - 2, 1); P(CH.ink, 1, h - 1, w - 2, 1); P(CH.ink, 0, 1, 1, h - 2); P(CH.ink, w - 1, 1, 1, h - 2);
    P(CH.iron2, 1, 1, w - 2, 2); P(CH.iron, 1, h - 3, w - 2, 2); P(CH.iron2, 1, 1, 2, h - 2); P(CH.iron, w - 3, 1, 2, h - 2);
    P(CH.ironH, 1, 1, w - 2, 1); P(CH.ironH, 1, 1, 1, h - 2);
    P(CH.br, 3, 3, w - 6, 1); P(CH.br, 3, h - 4, w - 6, 1); P(CH.br, 3, 3, 1, h - 6); P(CH.br, w - 4, 3, 1, h - 6);
    const k = cn; for (const [cx, cy] of [[0, 0], [w - k, 0], [0, h - k], [w - k, h - k]]) { P(CH.ink, cx, cy + 2, k, k - 4); P(CH.ink, cx + 2, cy, k - 4, k); P(CH.iron2, cx + 1, cy + 3, k - 2, k - 6); P(CH.iron2, cx + 3, cy + 1, k - 6, k - 2); P(CH.ironH, cx + 3, cy + 1, k - 6, 1); P(CH.br, cx + 3, cy + 3, k - 6, k - 6); P(CH.gold, cx + 4, cy + 4, k - 8, k - 8); P('#fff2c8', cx + 4, cy + 4, 1, 1); }
  });
  // 外框的中间是纯色，噪点纹理另用平铺贴图（九宫格拉伸会把噪点拉成色块）
  const noise = pick => cvs(16, 16, x => { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) px(x, pick(), i, j); });
  add('f_win', frame(24, 8, ['#1e1827', '#1e1827'])); add('n_win', noise(() => R() < 0.5 ? '#1d1726' : '#1f1929'));
  add('f_stone', frame(24, 8, ['#251e2e', '#251e2e'])); add('n_stone', noise(() => R() < 0.5 ? '#241d2d' : R() < 0.8 ? '#272030' : '#211a29'));
  add('f_leather', frame(24, 8, ['#29190f', '#29190f'])); add('o_frame', frame(24, 8, null)); add('n_leather', noise(() => R() < 0.35 ? '#2a1a14' : R() < 0.5 ? '#24160f' : '#2e1d16'));
  // 按钮：铁（普通）、青铜（主要），四角小铆钉
  const btn = (fill, hi, hi2, lo, rv, rvh) => cvs(12, 12, x => { const P = (c, a, b, ww = 1, hh = 1) => px(x, c, a, b, ww, hh); P(CH.ink, 1, 0, 10, 12); P(CH.ink, 0, 1, 12, 10); P(fill, 1, 1, 10, 10); P(hi, 2, 1, 8, 2); if (hi2) P(hi2, 2, 1, 8, 1); P(lo, 1, 9, 10, 2); for (const [a, b] of [[2, 3], [9, 3], [2, 8], [9, 8]]) { P(rv, a, b); } P(rvh, 2, 3); });
  add('f_btn', btn('#3a3047', '#4a3d58', '#5d4f6b', '#241c2d', '#1a1422', '#7a6896'));
  add('f_btn_h', btn('#4b3e60', '#5d4f74', '#7a6896', '#2a2236', '#1a1422', '#9a88b6'));
  add('f_btn_d', btn('#211b29', '#262030', null, '#18131e', '#15101b', '#2a2333'));
  add('f_btn_w', btn('#b8752a', '#e8b84a', '#ffe08a', '#7a4614', '#5a3008', '#ffe08a'));
  add('f_btn_wh', btn('#cc8836', '#f4c65a', '#fff0b0', '#8a5218', '#5a3008', '#fff0b0'));
  add('f_btn_s', btn('#5a3a14', '#8a5a20', '#e0b050', '#2e1c08', '#2e1c08', '#e0b050'));
  add('f_btn_r', btn('#5a1c22', '#7a2a30', '#c0505a', '#2a0c10', '#2a0c10', '#c0505a'));
  add('f_plaque', cvs(12, 12, x => { px(x, CH.ink, 1, 0, 10, 12); px(x, CH.ink, 0, 1, 12, 10); px(x, '#3a1e1a', 1, 1, 10, 10); px(x, '#5a2a22', 1, 1, 10, 2); px(x, '#2a1210', 1, 9, 10, 2); px(x, CH.br, 1, 2, 10, 1); px(x, CH.br, 1, 9, 10, 1); }));
  // 凹槽：系统入口、身上槽位
  add('sock', cvs(12, 12, x => { px(x, CH.ink, 0, 0, 12, 12); px(x, '#0f0b14', 1, 1, 10, 10); px(x, '#08060b', 1, 1, 10, 2); px(x, '#08060b', 1, 1, 2, 10); px(x, CH.iron2, 1, 10, 10, 1); px(x, CH.iron2, 10, 1, 1, 10); px(x, '#1a1422', 3, 3, 6, 6); }));
  add('sock_h', cvs(12, 12, x => { px(x, CH.br, 0, 0, 12, 12); px(x, CH.gold, 0, 0, 12, 1); px(x, CH.ink, 1, 1, 10, 10); px(x, '#08060b', 2, 2, 8, 2); px(x, '#2a1e1a', 3, 3, 6, 6); }));
  // 绶带（三宫格：左右燕尾）
  add('ribbon', cvs(40, 22, x => { const w = 40, P = (c, a, b, ww = 1, hh = 1) => px(x, c, a, b, ww, hh); P(CH.ink, 10, 2, w - 20, 18); P('#3a1e1a', 11, 3, w - 22, 16); P('#5a2a22', 11, 3, w - 22, 2); P('#2a1210', 11, 16, w - 22, 3); P(CH.br, 11, 4, w - 22, 1); P(CH.br, 11, 17, w - 22, 1);
    for (const sd of [-1, 1]) { const x0 = sd < 0 ? 0 : w - 12; for (let j = 0; j < 16; j++) { const k = Math.abs(j - 8) >> 1; for (let i = 0; i < 12; i++) { const ii = sd < 0 ? i : 11 - i; if (ii >= k) P(j === 0 || j === 15 || ii === k ? CH.ink : '#2e1814', x0 + i, 3 + j); } } } }));
  // 骨头条（Boss / 进度），两端骷髅，中间 184×6 留给填充
  add('bonebar', cvs(200, 16, x => { const w = 200, P = (c, a, b, ww = 1, hh = 1) => px(x, c, a, b, ww, hh); P(CH.ink, 6, 3, w - 12, 10); P('#d9cfb8', 7, 4, w - 14, 1); P('#9a8f78', 7, 11, w - 14, 1); P('#1c1022', 8, 5, w - 16, 6);
    for (const xx of [0, w - 14]) { P(CH.ink, xx, 0, 14, 16); P('#d9cfb8', xx + 1, 1, 12, 11); P('#ece3cb', xx + 1, 1, 12, 2); P(CH.ink, xx + 3, 5, 3, 3); P(CH.ink, xx + 8, 5, 3, 3); P('#ff5a4a', xx + 4, 6, 1, 1); P('#ff5a4a', xx + 9, 6, 1, 1); P(CH.ink, xx + 6, 9, 2, 2); P('#b9ad94', xx + 3, 12, 8, 3); P(CH.ink, xx + 5, 12, 1, 3); P(CH.ink, xx + 8, 12, 1, 3); } }));
  // 血球 / 灯火瓶：底（玻璃 + 铜圈 + 顶上骷髅）和高光分两张，液体在中间用图形画
  const OC = 32, OY = 33, ORr = 24;
  const orbBg = glass => cvs(64, 64, x => { for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const d = Math.hypot(i + 0.5 - OC, j + 0.5 - OY); if (d < ORr) px(x, d > ORr - 3 ? '#0d0912' : glass, i, j); else if (d < ORr + 2) px(x, CH.ink, i, j); else if (d < ORr + 5) px(x, ((i + j) >> 1) % 5 === 0 ? CH.brH : CH.br, i, j); else if (d < ORr + 6) px(x, CH.ink, i, j); }
    const P = (c, a, b, ww = 1, hh = 1) => px(x, c, a, b, ww, hh); P(CH.ink, OC - 5, 1, 10, 9); P('#d9cfb8', OC - 4, 2, 8, 6); P('#ece3cb', OC - 4, 2, 8, 1); P(CH.ink, OC - 3, 4, 2, 2); P(CH.ink, OC + 1, 4, 2, 2); P(CH.ink, OC - 1, 7, 2, 1); P('#b9ad94', OC - 3, 8, 6, 1); });
  add('orb_hp', orbBg('#1a0d12')); add('orb_soul', orbBg('#120c1c'));
  add('orb_hi', cvs(64, 64, x => { for (let a = 3.6; a < 4.5; a += 0.05) px(x, 'rgba(255,255,255,.55)', Math.round(OC + Math.cos(a) * (ORr - 6)), Math.round(OY + Math.sin(a) * (ORr - 6))); for (let a = 3.4; a < 4.7; a += 0.04) px(x, 'rgba(255,255,255,.12)', Math.round(OC + Math.cos(a) * (ORr - 8)), Math.round(OY + Math.sin(a) * (ORr - 8))); }));
  // 石台底栏：可横向平铺
  add('dock', cvs(32, 30, x => { for (let j = 2; j < 30; j++) for (let i = 0; i < 32; i++) px(x, R() < 0.5 ? '#231c2c' : '#262030', i, j); px(x, CH.ink, 0, 0, 32, 2); px(x, CH.ironH, 0, 2, 32, 1); px(x, CH.br, 0, 6, 32, 1); px(x, CH.ink, 0, 29, 32, 1); for (let i = 2; i < 32; i += 8) px(x, '#1a1422', i, 12 + (i % 3) * 4, 3, 1); }));
}
const ORB = { cx: 32, cy: 33, r: 24 };
/* ---------- 旋风：龙卷风和旋风斩 ---------- */
// 龙卷风：一层层椭圆往上叠，越往上越宽，整体左右摆；每层的点按角度旋转，朝前的一半更亮
function tornado(g, x, y, h, w, t, seed, a = 1) {
  const L = Math.max(5, h / 2 | 0);
  g.fillStyle(0x1a1422, 0.25 * a).fillEllipse(x, y, w * 0.7, 3); // 脚下的影子
  for (let i = 0; i < L; i++) {
    const f = i / (L - 1), yy = y - f * h, rw = w * (0.18 + 0.82 * f ** 1.4), cx = x + Math.sin(t * 4 + f * 3 + seed) * w * 0.18 * f, m = Math.max(6, rw * 1.2 | 0);
    for (let k = 0; k < m; k++) {
      const an = k / m * Math.PI * 2 + t * 11 - f * 2.5 + seed, sn = Math.sin(an), front = sn > 0;
      if (((k + i) % 3 === 0) && !front) continue;
      g.fillStyle(front ? (k % 2 ? 0xe4dfe8 : 0xb8b0c4) : 0x7a7088, (front ? 0.75 : 0.4) * a * (0.55 + 0.45 * f));
      g.fillRect(Math.round(cx + Math.cos(an) * rw / 2), Math.round(yy + sn * rw * 0.16), front && f > 0.5 ? 2 : 1, 1);
    }
  }
  for (let k = 0; k < 6; k++) { const an = t * 7 + k * 1.05 + seed, rr = w * 0.35 + ((t * 20 + k * 5) % 6); g.fillStyle(0x9a8f78, 0.5 * a).fillRect(Math.round(x + Math.cos(an) * rr), Math.round(y + Math.sin(an) * rr * 0.3), 1, 1); } // 卷起的尘土
}
// 旋风斩：判定是以脚下为圆心、半径 R 的正圆（俯视），所以地面圈和刀光都画成正圆，边缘 = 能砍到的地方。
// ground 画在角色和怪下面（受光照），blade 画在上面，glow 是叠加发光层；f = 旋势层数占比，eye = 风暴之眼
function whirlFx(ground, blade, glow, x, y, R, f, t, eye, ang) { // ang：角色朝向（和转身帧同步），刀光的头在这里
  const spd = 9 + f * 9, TAU = Math.PI * 2;
  // 地面：脚下一片被风压暗的圆，边缘淡淡一圈 = 判定边缘
  ground.fillStyle(0x0a0508, 0.2 + 0.15 * f).fillCircle(x, y, R);
  ground.lineStyle(1, 0xd06a40, 0.18 + 0.12 * f).strokeCircle(x, y, R);
  // 风暴之眼：吸扯范围外往里流的风线
  if (eye) { const PR = R * RL.areaEye.pullR; for (let k = 0; k < 14; k++) { const ph = (t * 0.9 + k * 0.37) % 1, rr = PR - (PR - R) * ph, an = k * 2.4 - t * 1.5 - ph * 1.2; for (let s = 0; s < 6; s++) { const r2 = rr + s * 1.5; ground.fillStyle(0xd08a60, 0.45 * Math.sin(ph * Math.PI) * (1 - s / 6)).fillRect(Math.round(x + Math.cos(an + s * 0.02) * r2), Math.round(y + Math.sin(an + s * 0.02) * r2), 1, 1); } } }
  // 刀光：经典旋风斩那种粗的红橙色月牙拖影（叠加发光层，外沿 = 判定半径）。一道长的主弧 + 对面一道短的，头粗尾细
  const g = blade, cy = y - 3, W = Math.min(R * 0.55, 12 + f * 12), S = 24;
  const band = (r0, r1, b0, b1) => { const n = 3, pts = []; for (let j = 0; j <= n; j++) { const a = b0 + (b1 - b0) * j / n; pts.push({ x: x + Math.cos(a) * r1, y: cy + Math.sin(a) * r1 }); } for (let j = n; j >= 0; j--) { const a = b0 + (b1 - b0) * j / n; pts.push({ x: x + Math.cos(a) * r0, y: cy + Math.sin(a) * r0 }); } g.fillPoints(pts, true); }; // 一小段环形扇面，相邻段首尾相接不重叠
  for (let i = 0; i < 2; i++) {
    const a0 = (ang ?? -t * spd) + i * Math.PI, arc = (i ? 0.5 : 1) * (1.4 + f * 2.2), w0 = W * (i ? 0.6 : 1);
    for (let s = 0; s < S; s++) {
      const q = s / S, k = (1 - q) ** 0.8, w = Math.max(1, w0 * k), b0 = a0 + q * arc, b1 = b0 + arc / S;
      g.fillStyle(0xa01208, 0.5 * k); band(R - w * 1.6, R - w, b0, b1); // 内侧暗红雾
      g.fillStyle(0xff3c10, 0.85 * k); band(R - w, R - w * 0.3, b0, b1); // 红橙主体
      g.fillStyle(0xffc070, k); band(R - w * 0.3, R, b0, b1); // 刃口亮边（外沿 = 判定半径）
    }
    g.fillStyle(0xffe6b0, 0.9).fillCircle(x + Math.cos(a0) * (R - 2), cy + Math.sin(a0) * (R - 2), 1.5 + f); // 刀头
    if (glow) { glow.lineStyle(3, 0xff6a30, 0.35); glow.beginPath(); glow.arc(x, cy, R - 1, a0, a0 + arc * 0.25); glow.strokePath(); } // 只有刀头一小段发光
  }
  for (let k = 0; k < 8; k++) { const an = -t * spd * 0.6 + k * 0.79, rr = R * (0.4 + ((t * 2.5 + k * 0.37) % 1) * 0.7); ground.fillStyle(0x8a6a4a, 0.5 * (1 - rr / (R * 1.15))).fillRect(Math.round(x + Math.cos(an) * rr), Math.round(y + Math.sin(an) * rr), 1, 1); } // 往外甩的尘土
}
// 旋风之心的小旋风：和大旋风同一套红橙色月牙拖影，竖着叠成一个漏斗（每层是一道压扁的转动月牙，越往上越宽）。
// ground 画脚下的伤害范围（半径 r），glow 是叠加发光层；a = 淡入淡出
function devilFx(ground, glow, x, y, r, t, seed, a = 1) {
  ground.fillStyle(0x0a0508, 0.22 * a).fillCircle(x, y, r);
  const L = 5, h = r * 3;
  const band = (cx, cy, rx0, rx1, sq, b0, b1) => { const n = 3, pts = []; for (let j = 0; j <= n; j++) { const an = b0 + (b1 - b0) * j / n; pts.push({ x: cx + Math.cos(an) * rx1, y: cy + Math.sin(an) * rx1 * sq }); } for (let j = n; j >= 0; j--) { const an = b0 + (b1 - b0) * j / n; pts.push({ x: cx + Math.cos(an) * rx0, y: cy + Math.sin(an) * rx0 * sq }); } glow.fillPoints(pts, true); };
  for (let l = 0; l < L; l++) {
    const f = l / (L - 1), cy = y - 1 - f * h, cx = x + Math.sin(t * 5 + f * 2.5 + seed) * r * 0.2 * f, rx = r * (0.4 + 0.9 * f), w = 2.5 + f * 3, a0 = -t * (16 - f * 4) + seed + l * 1.9, arc = 3.6, S = 14;
    for (let s = 0; s < S; s++) {
      const q = s / S, k = (1 - q) ** 0.8 * a, ww = Math.max(0.6, w * (1 - q * 0.7)), b0 = a0 + q * arc, b1 = b0 + arc / S;
      glow.fillStyle(0xa01208, 0.45 * k); band(cx, cy, rx - ww * 1.6, rx - ww, 0.35, b0, b1);
      glow.fillStyle(0xff3c10, 0.8 * k); band(cx, cy, rx - ww, rx - ww * 0.3, 0.35, b0, b1);
      glow.fillStyle(0xffc070, 0.95 * k); band(cx, cy, rx - ww * 0.3, rx, 0.35, b0, b1);
    }
  }
}
/* ---------- 文字：平滑字体，按画布的实际分辨率渲染 ---------- */
const FONT_FAM = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "WenQuanYi Zen Hei", sans-serif';
const FS = { 8: [8, 500, 10], 12: [10, 500, 13], num: [7, 700, 8] }; // 字号、字重、行高（逻辑像素）
const fontCss = s => `${FS[s][1]} ${FS[s][0]}px ${FONT_FAM}`;
const MC = document.createElement('canvas').getContext('2d');
let MW = {};
const charW = (ch, s) => MW[s + ch] ??= (MC.font = fontCss(s), MC.measureText(ch).width);
function textW(str, s = 12) { let w = 0; for (const ch of String(str)) w += charW(ch, s); return Math.ceil(w); }
function wrapText(str, maxW, s = 12) {
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '', w = 0;
    for (const ch of para) {
      const a = charW(ch, s);
      if (w + a > maxW && line) {
        // 中文标点不放行首
        if ('，。、：；！？）」”'.includes(ch)) { line += ch; w += a; continue; }
        out.push(line); line = ''; w = 0; if (ch === ' ') continue;
      }
      line += ch; w += a;
    }
    out.push(line);
  }
  return out;
}
const LH = { 12: 13, 8: 10, num: 8 };

/* ---------- 界面小部件 ---------- */
function T(sc, x, y, str, o = {}) {
  const s = o.size || 12, k = o.scale || 1; const [px, wt, lh] = FS[s];
  const asc = (px * 0.9 + (lh - px) / 2) * k;
  const t = sc.add.text(Math.round(x), Math.round(y), String(str), { fontFamily: FONT_FAM, fontSize: px * k + 'px', fontStyle: String(wt), color: '#ffffff', resolution: Z, metrics: { ascent: asc, descent: lh * k - asc, fontSize: lh * k } });
  t.setTint(hex(o.color || COL.text));
  if (o.shadow !== false) t.setShadow(Z * 0.5, Z * 0.5, o.shadowColor || COL.ink, 0, false, true);
  t.setOrigin(o.align === 'center' ? 0.5 : o.align === 'right' ? 1 : 0, o.valign === 'middle' ? 0.5 : 0);
  if (o.parent) o.parent.add(t);
  return t;
}
function TW(sc, x, y, str, maxW, o = {}) {
  const s = o.size || 12;
  const lines = wrapText(str, maxW, s);
  const t = T(sc, x, y, lines.join('\n'), o);
  t.lines = lines.length; t.h = lines.length * LH[s];
  return t;
}
function nine(sc, x, y, w, h, key, sl = 4) { return sc.add.nineslice(x, y, key, null, Math.max(w, sl * 2), Math.max(h, sl * 2), sl, sl, sl, sl).setOrigin(0); }
function img(sc, x, y, key, parent) { const i = sc.add.image(Math.round(x), Math.round(y), key).setOrigin(0); if (parent) parent.add(i); return i; }
function rect(sc, x, y, w, h, col, a = 1, parent) { const r = sc.add.rectangle(x, y, w, h, hex(col), a).setOrigin(0); if (parent) parent.add(r); return r; }

function mkBtn(sc, parent, x, y, w, h, label, onClick, o = {}) {
  const c = sc.add.container(x, y); if (parent) parent.add(c);
  const style = o.style || 'n';
  const keys = { n: ['f_btn', 'f_btn_h'], w: ['f_btn_w', 'f_btn_wh'], s: ['f_btn_s', 'f_btn_s'], r: ['f_btn_r', 'f_btn_h'] }[style];
  const bg = nine(sc, 0, 0, w, h, keys[0]); const bgh = nine(sc, 0, 0, w, h, keys[1]).setVisible(false); const bgd = nine(sc, 0, 0, w, h, 'f_btn_d').setVisible(false);
  c.add([bg, bgh, bgd]);
  let lx = o.labelX ?? w / 2;
  if (o.icon) { const ic = img(sc, o.iconX ?? 4, Math.round((h - sc.textures.get(o.icon).getSourceImage().height) / 2), o.icon, c); if (o.iconScale) ic.setScale(o.iconScale); lx = o.labelX ?? (w / 2 + 6); }
  const lab = T(sc, lx, Math.round(h / 2), label, { size: o.size || 12, color: o.color || (style === 'w' ? '#2a1306' : COL.text), shadow: style !== 'w', align: o.labelX !== undefined ? 'left' : 'center', valign: 'middle', parent: c });
  const zone = sc.add.zone(0, 0, w, h).setOrigin(0).setInteractive(); c.add(zone);
  c.disabled = !!o.disabled;
  const labCol = hex(o.color || (style === 'w' ? '#2a1306' : COL.text));
  c.setDisabled = d => { if (c.disabled === d && c.inited) return; c.inited = true; c.disabled = d; bg.setVisible(!d); bgd.setVisible(d); bgh.setVisible(false); lab.setTint(d ? hex(COL.faint) : labCol); };
  c.setLabel = s => lab.setText(s);
  c.lab = lab;
  c.setDisabled(c.disabled);
  zone.on('pointerover', () => { if (!c.disabled) bgh.setVisible(true); if (o.tip) showTip(typeof o.tip === 'function' ? o.tip() : o.tip); });
  zone.on('pointerout', () => { bgh.setVisible(false); c.y = y; if (o.tip) hideTip(); });
  zone.on('pointerdown', () => { if (!c.disabled) c.y = y + 1; });
  zone.on('pointerup', () => { c.y = y; if (c.disabled) { if (o.whyDisabled) toast(o.whyDisabled); return; } sfx('click'); onClick && onClick(); });
  return c;
}
function mkCheck(sc, parent, x, y, label, on, onToggle, o = {}) {
  const c = sc.add.container(x, y); parent.add(c);
  const box = nine(sc, 0, 1, 9, 9, 'f_slot', 3); c.add(box);
  if (on) rect(sc, 2, 3, 5, 5, COL.ember, 1, c);
  const t = T(sc, 13, 1, label, { size: 8, color: on ? COL.text : COL.dim, parent: c });
  const w = 13 + textW(label, 8);
  const zone = sc.add.zone(0, 0, w, 11).setOrigin(0).setInteractive(); c.add(zone);
  zone.on('pointerover', () => { t.setTint(hex(COL.emberHi)); if (o.tip) showTip(o.tip); });
  zone.on('pointerout', () => { t.setTint(hex(on ? COL.text : COL.dim)); if (o.tip) hideTip(); });
  zone.on('pointerup', () => { sfx('click'); onToggle(!on); });
  c.w = w;
  return c;
}
function mkCell(sc, parent, x, y, it, o = {}) {
  const s = o.size || 20;
  const c = sc.add.container(x, y); parent.add(c);
  c.add(nine(sc, 0, 0, s, s, 'sock', 3));
  if (it) {
    const isMod = it.kind === 'mod';
    if (!isMod) c.add(nine(sc, 1, 1, s - 2, s - 2, 'f_glow', 3).setTint(hex(icol(it))).setAlpha(it.rar ? 1 : 0.45));
    const key = isMod ? 'mod_' + it.mid : 'i_' + iconOf(it); const tw = sc.textures.get(key).getSourceImage().width, th = sc.textures.get(key).getSourceImage().height;
    img(sc, Math.round((s - tw) / 2), Math.round((s - th) / 2), key, c);
    if (isMod) T(sc, 1, s - 8, String(it.lvl), { size: 'num', color: modActiveHere(it, o.host) ? COL.text : COL.bad, parent: c });
    else if (it.kind === 'map') T(sc, 1, s - 8, String(it.tier), { size: 'num', color: COL.text, parent: c });
    else if (it.q) T(sc, 1, s - 8, String(it.q), { size: 'num', color: COL.dim, parent: c });
    if (!isMod && o.upg && isUpgrade(it)) img(sc, s - 7, 1, 'up', c);
    if (it.isNew) rect(sc, 2, 2, 2, 2, COL.ember, 1, c);
  } else if (o.ghost) { const g = img(sc, Math.round((s - 14) / 2), Math.round((s - 14) / 2), o.ghost, c); g.setTintFill(hex('#3a3049')); }
  if (o.sel) c.add(nine(sc, -1, -1, s + 2, s + 2, 'f_rar', 2).setTint(hex(COL.emberHi)));
  const hl = rect(sc, 1, 1, s - 2, s - 2, '#ffffff', 0, c);
  const zone = sc.add.zone(0, 0, s, s).setOrigin(0).setInteractive(); c.add(zone);
  zone.on('pointerover', () => { hl.setFillStyle(0xffffff, 0.12); if (o.onHover) o.onHover(it); else if (it) showTip({ item: it }); else if (o.tip) showTip(o.tip); });
  zone.on('pointerout', () => { hl.setFillStyle(0xffffff, 0); if (o.onOut) o.onOut(it); else hideTip(); });
  zone.on('pointerup', () => { if (o.onClick) { sfx('click'); o.onClick(it); } });
  return c;
}
function isUpgrade(it) {
  const slot = slotsFor(it)[0]; if (!slot) return false; const eq = S.equip[slot]; if (eq === it || Object.values(S.equip).includes(it)) return false;
  return !eq || itemValue(it) > itemValue(eq) * 1.02;
}
const modActiveHere = (m, host) => !host || modActive(m, host);

/* ---------- 悬浮提示 ---------- */
function showTip(content) { G.ui && G.ui.setTip(content); }
function hideTip() { G.ui && G.ui.setTip(null); }
function toast(msg, color) { G.ui && G.ui.toast(msg, color); }
function feed(msg, color) { G.ui && G.ui.feed(msg, color); }
function feedItem(it) { feed(`${itemName(it)} · ${QN[it.q]} · ${rarName(it)}`, icol(it)); }

/* ---------- 场景背景 ---------- */
const SCONCES = [{ x: 90, y: 38 }, { x: 240, y: 38 }, { x: 390, y: 38 }];
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function drawBackground(x, theme, seed) {
  const R = seeded(seed); const rp = a => a[Math.floor(R() * a.length)];
  x.clearRect(0, 0, W, H);
  x.fillStyle = theme.wallM; x.fillRect(0, 0, W, FLOOR_Y);
  for (let row = 0; row < 10; row++) {
    const off = row % 2 ? 6 : 0;
    for (let bx = -12; bx < W; bx += 12) {
      x.fillStyle = rp(theme.wall); x.fillRect(bx + off + 1, row * 6 + 1, 11, 5);
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(bx + off + 1, row * 6 + 1, 11, 1);
      if (R() < 0.12) { x.fillStyle = theme.wallM; x.fillRect(bx + off + 3 + (R() * 6 | 0), row * 6 + 2, 1, 2); }
    }
  }
  const gr = x.createLinearGradient(0, TOP_H, 0, FLOOR_Y); gr.addColorStop(0, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, W, FLOOR_Y);
  x.fillStyle = theme.mortar; x.fillRect(0, FLOOR_Y - 2, W, 2);
  x.fillStyle = theme.mortar; x.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  for (let ty = FLOOR_Y; ty < H; ty += 14) {
    const off = ((ty - FLOOR_Y) / 14) % 2 ? 9 : 0;
    for (let tx = -18; tx < W; tx += 18) {
      x.fillStyle = rp(theme.floor); x.fillRect(tx + off, ty, 17, 13);
      x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(tx + off, ty, 17, 1);
      x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(tx + off, ty + 12, 17, 1);
      for (let n = 0; n < 6; n++) { x.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; x.fillRect(tx + off + (R() * 17 | 0), ty + (R() * 13 | 0), 1, 1); }
      if (R() < 0.18) { x.fillStyle = theme.mortar; let cx = tx + off + 3 + R() * 10, cy = ty + 2 + R() * 8; for (let n = 0; n < 6; n++) { x.fillRect(cx | 0, cy | 0, 1, 1); cx += R() < 0.5 ? 1 : 0; cy += R() < 0.6 ? 1 : 0; } }
    }
  }
  x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, FLOOR_Y, W, 3);
  for (let n = 0; n < 60; n++) {
    const px_ = R() * W | 0, py = FLOOR_Y + 4 + (R() * (FIELD_B - FLOOR_Y - 6) | 0);
    if (theme === THEMES[0] || theme === THEMES[3]) { x.fillStyle = R() < 0.5 ? theme.acc : theme.acc2; x.fillRect(px_, py, 1 + (R() * 3 | 0), 1); x.fillRect(px_ + 1, py - 1, 1, 1); }
    else if (theme === THEMES[2]) { if (R() < 0.5) { x.fillStyle = theme.acc; let cx = px_, cy = py; for (let i = 0; i < 5; i++) { x.fillRect(cx, cy, 1, 1); cx += 1; cy += R() < 0.5 ? 1 : -1; } } }
    else { x.fillStyle = theme.acc2; x.fillRect(px_, py, 3, 1); x.fillStyle = theme.acc; x.fillRect(px_, py + 1, 1, 1); x.fillRect(px_ + 2, py + 1, 1, 1); }
  }
  for (let n = 0; n < 9; n++) {
    const px_ = 10 + R() * (W - 20) | 0, py = FLOOR_Y + 10 + (R() * (FIELD_B - FLOOR_Y - 18) | 0);
    if (R() < 0.5) x.drawImage(SPR.skull, px_, py); else { x.fillStyle = '#b9ad94'; x.fillRect(px_, py, 5, 1); x.fillStyle = '#ece3cb'; x.fillRect(px_ - 1, py - 1, 1, 1); x.fillRect(px_ + 5, py - 1, 1, 1); x.fillRect(px_ - 1, py + 1, 1, 1); x.fillRect(px_ + 5, py + 1, 1, 1); }
  }
  for (const [cx, cy] of [[14, FLOOR_Y + 6], [462, FLOOR_Y + 8], [12, FIELD_B - 12], [464, FIELD_B - 14]]) { x.fillStyle = '#e8dcc0'; x.fillRect(cx, cy, 2, 4); x.fillRect(cx + 3, cy + 1, 2, 3); x.fillStyle = '#9a8f78'; x.fillRect(cx, cy + 3, 5, 1); }
  for (const s of SCONCES) { x.fillStyle = '#2a2016'; x.fillRect(s.x - 2, s.y, 5, 2); x.fillStyle = '#5a4630'; x.fillRect(s.x - 1, s.y + 2, 3, 4); x.fillRect(s.x, s.y + 6, 1, 2); }
  const vg = x.createRadialGradient(W / 2, (FLOOR_Y + FIELD_B) / 2, 90, W / 2, (FLOOR_Y + FIELD_B) / 2, 300);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
}

/* ---------- 无限场地：可平铺的地砖 + 按区块随机的装饰 ---------- */
// 地砖底图 256×256（16×16 的错缝砖，横 16 块、竖 16 行，首尾相接，平铺没有接缝；边长取 2 的幂，WebGL 平铺时不会被重采样）
const FLOOR_TW = 256, FLOOR_TH = 256, CHUNK = 240;
function drawFloorTile(x, theme, seed) { // mulberry32 随机
  let ms = seed >>> 0; const R = () => { ms = (ms + 0x6D2B79F5) | 0; let t = Math.imul(ms ^ ms >>> 15, 1 | ms); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; const rp = a => a[Math.floor(R() * a.length)];
  x.fillStyle = theme.mortar; x.fillRect(0, 0, FLOOR_TW, FLOOR_TH);
  for (let ty = 0; ty < FLOOR_TH; ty += 16) {
    const off = (ty / 16) % 2 ? 8 : 0;
    for (let tx = 0; tx < FLOOR_TW; tx += 16) {
      const bx = tx + off;
      const col = rp(theme.floor), noise = []; for (let n = 0; n < 6; n++) noise.push([R() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)', R() * 15 | 0, R() * 15 | 0]);
      const crack = R() < 0.18 ? [3 + R() * 8, 2 + R() * 8, Array.from({ length: 6 }, () => [R() < 0.5, R() < 0.6])] : null;
      for (const sh of bx + 15 > FLOOR_TW ? [bx, bx - FLOOR_TW] : [bx]) { // 跨右边界的砖在左边补一半
        x.fillStyle = col; x.fillRect(sh, ty, 15, 15);
        x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(sh, ty, 15, 1);
        x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(sh, ty + 14, 15, 1);
        for (const [c, nx, ny] of noise) { x.fillStyle = c; x.fillRect(sh + nx, ty + ny, 1, 1); }
        if (crack) { x.fillStyle = theme.mortar; let cx = sh + crack[0], cy = ty + crack[1]; for (const [a, b] of crack[2]) { x.fillRect(cx | 0, cy | 0, 1, 1); cx += a ? 1 : 0; cy += b ? 1 : 0; } }
      }
    }
  }
}
// 一个区块（CHUNK×CHUNK）的装饰：苔藓/余烬点、骨头、头骨、碎石、偶尔一圈蜡烛或一个火盆。返回光源位置（区块内坐标）
function drawChunkDecor(x, theme, seed) {
  const R = seeded(seed), lights = [];
  x.clearRect(0, 0, CHUNK, CHUNK);
  for (let n = 0; n < 34; n++) {
    const px_ = R() * (CHUNK - 6) + 3 | 0, py = R() * (CHUNK - 6) + 3 | 0;
    if (theme === THEMES[0] || theme === THEMES[3]) { x.fillStyle = R() < 0.5 ? theme.acc : theme.acc2; x.fillRect(px_, py, 1 + (R() * 3 | 0), 1); x.fillRect(px_ + 1, py - 1, 1, 1); }
    else if (theme === THEMES[2]) { if (R() < 0.5) { x.fillStyle = theme.acc; let cx = px_, cy = py; for (let i = 0; i < 5; i++) { x.fillRect(cx, cy, 1, 1); cx += 1; cy += R() < 0.5 ? 1 : -1; } } }
    else { x.fillStyle = theme.acc2; x.fillRect(px_, py, 3, 1); x.fillStyle = theme.acc; x.fillRect(px_, py + 1, 1, 1); x.fillRect(px_ + 2, py + 1, 1, 1); }
  }
  const nb = 3 + (R() * 5 | 0);
  for (let n = 0; n < nb; n++) {
    const px_ = 8 + R() * (CHUNK - 16) | 0, py = 8 + R() * (CHUNK - 16) | 0, k = R();
    if (k < 0.35) x.drawImage(SPR.skull, px_, py);
    else if (k < 0.75) { x.fillStyle = '#b9ad94'; x.fillRect(px_, py, 5, 1); x.fillStyle = '#ece3cb'; x.fillRect(px_ - 1, py - 1, 1, 1); x.fillRect(px_ + 5, py - 1, 1, 1); x.fillRect(px_ - 1, py + 1, 1, 1); x.fillRect(px_ + 5, py + 1, 1, 1); }
    else { for (let i = 0; i < 6; i++) { x.fillStyle = R() < 0.5 ? theme.mortar : '#3a3240'; x.fillRect(px_ + (R() * 9 | 0), py + (R() * 5 | 0), 2 + (R() * 2 | 0), 2); } } // 碎石堆
  }
  if (R() < 0.3) { // 一摊暗色血迹/水渍
    const cx = 30 + R() * (CHUNK - 60), cy = 30 + R() * (CHUNK - 60); x.fillStyle = 'rgba(0,0,0,.22)';
    for (let i = 0; i < 40; i++) { const a = R() * 6.28, r = R() * 12; x.fillRect(cx + Math.cos(a) * r | 0, cy + Math.sin(a) * r * 0.6 | 0, 2, 1); }
  }
  if (R() < 0.45) { // 蜡烛（火苗是动态画的，这里只画蜡柱）
    const cx = 20 + R() * (CHUNK - 40) | 0, cy = 20 + R() * (CHUNK - 40) | 0, n = 2 + (R() * 3 | 0);
    for (let i = 0; i < n; i++) { const ox = cx + (i * 5) - n * 2, oy = cy + ((i * 3) % 4); x.fillStyle = '#e8dcc0'; x.fillRect(ox, oy, 2, 4); x.fillStyle = '#9a8f78'; x.fillRect(ox, oy + 3, 2, 1); lights.push({ x: ox + 1, y: oy, s: 1 }); }
  } else if (R() < 0.25) { // 火盆
    const cx = 24 + R() * (CHUNK - 48) | 0, cy = 24 + R() * (CHUNK - 48) | 0;
    x.fillStyle = '#2a2016'; x.fillRect(cx - 4, cy, 9, 3); x.fillStyle = '#5a4630'; x.fillRect(cx - 3, cy + 3, 7, 2); x.fillRect(cx - 1, cy + 5, 3, 4); x.fillStyle = '#1a140e'; x.fillRect(cx - 3, cy + 9, 7, 1);
    lights.push({ x: cx, y: cy, s: 2 });
  }
  return lights;
}
// 屏幕暗角（固定在屏幕上）
function drawVignette(x) {
  x.clearRect(0, 0, W, H); const cy = (TOP_H + BOT_Y) / 2;
  const vg = x.createRadialGradient(W / 2, cy, 90, W / 2, cy, 300); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
}

/* ---------- 光照（低分辨率 + 抖动） ---------- */
const LW = 240, LHt = 135;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
let lightImg = null;
function renderLight(lctx, lights, ambient, fog) {
  if (!lightImg) lightImg = lctx.createImageData(LW, LHt);
  const d = lightImg.data;
  for (let y = 0; y < LHt; y++) {
    const py = y * 2 + 1;
    for (let x = 0; x < LW; x++) {
      const px_ = x * 2 + 1; let L = ambient;
      for (let n = 0; n < lights.length; n++) { const l = lights[n]; const dx = px_ - l.x, dy = py - l.y; const dd = dx * dx + dy * dy; if (dd < l.r2) L += l.i * (1 - dd / l.r2); }
      const v = clamp(1 - L, 0, 1) * 4; let q = v | 0; if (v - q > BAYER[(y & 3) * 4 + (x & 3)]) q++;
      const i = (y * LW + x) * 4; d[i] = fog[0]; d[i + 1] = fog[1]; d[i + 2] = fog[2]; d[i + 3] = Math.min(4, q) * 56;
    }
  }
  lctx.putImageData(lightImg, 0, 0);
}


/* ---------- 营地 ---------- */
// 营地底图：地窖前的空地，中间是往下走的地窖入口，周围的设施按 data/camp.json 摆放；没解锁的画成一堆碎石
function drawCamp(x, open) {
  drawBackground(x, THEMES[0], 4242);
  const R = seeded(777), px = (c, a, b, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); };
  // 篝火周围踩实的泥地
  x.fillStyle = 'rgba(20,14,22,.45)'; x.beginPath(); x.ellipse(240, 160, 200, 58, 0, 0, Math.PI * 2); x.fill();
  for (let n = 0; n < 260; n++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()); px(R() < .5 ? '#2a2230' : '#3a3042', 240 + Math.cos(a) * r * 196, 160 + Math.sin(a) * r * 54); }
  const sh = (cx, cy, w) => { x.fillStyle = 'rgba(0,0,0,.45)'; x.beginPath(); x.ellipse(cx, cy, w, 3, 0, 0, Math.PI * 2); x.fill(); };
  const draw = {
    gate(f) { // 石拱门 + 往下走的台阶 + 两个火盆
      const { x: cx, y: cy } = f;
      sh(cx, cy + 1, 34);
      px('#0a070c', cx - 17, cy - 40, 34, 40);
      for (let i = 0; i < 7; i++) { const w = 30 - i * 3, c = ['#3c3446', '#332c3c', '#2a2432', '#221d29', '#1b1721', '#15121a', '#0f0d13'][i]; px(c, cx - w / 2, cy - 4 - i * 5, w, 4); px('rgba(255,255,255,.06)', cx - w / 2, cy - 4 - i * 5, w, 1); }
      for (const s of [-1, 1]) { const bx = s < 0 ? cx - 24 : cx + 17; px('#4f4560', bx, cy - 42, 7, 42); px('#5d5270', bx + (s < 0 ? 1 : 0), cy - 42, 6, 1); for (let yy = cy - 38; yy < cy; yy += 6) px('#2a2233', bx, yy, 7, 1); px('#2a2233', s < 0 ? bx + 6 : bx, cy - 42, 1, 42); }
      px('#5a4f6a', cx - 27, cy - 49, 54, 7); px('#6b5f7c', cx - 27, cy - 49, 54, 1); px('#2a2233', cx - 27, cy - 43, 54, 1);
      for (let i = 0; i < 5; i++) px('#2a2233', cx - 20 + i * 10, cy - 48, 1, 5);
      x.drawImage(SPR.skull, cx - 3, cy - 48);
      px('#3e3548', cx - 26, cy, 52, 3); px('#4f4560', cx - 26, cy, 52, 1);
      for (const s of [-1, 1]) { const bx = cx + s * 36; sh(bx, cy + 1, 7); px('#2a2016', bx - 1, cy - 10, 3, 10); px('#2a2016', bx - 4, cy - 1, 2, 2); px('#2a2016', bx + 3, cy - 1, 2, 2); px('#5a4630', bx - 6, cy - 13, 13, 3); px('#7a6040', bx - 6, cy - 13, 13, 1); px('#3a2a1a', bx - 5, cy - 10, 11, 1); }
    },
    chest(f) {
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 13);
      px('#120c18', cx - 12, cy - 15, 24, 15); px('#6a4426', cx - 11, cy - 9, 22, 8); px('#7d5530', cx - 11, cy - 14, 22, 5); px('#93683c', cx - 11, cy - 14, 22, 1);
      px('#120c18', cx - 11, cy - 9, 22, 1); for (const bx of [cx - 8, cx + 6]) px('#4a4552', bx, cy - 14, 2, 13);
      px('#c9a24a', cx - 1, cy - 10, 3, 3); px('#120c18', cx, cy - 9, 1, 1);
    },
    statue(f) { // 戴兜帽的石像，胸口一颗星
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 12);
      px('#3a3248', cx - 10, cy - 7, 20, 7); px('#4a4158', cx - 10, cy - 7, 20, 1);
      px('#120c18', cx - 7, cy - 33, 14, 26); px('#6a6478', cx - 6, cy - 32, 12, 25); px('#8a849a', cx - 6, cy - 32, 3, 25); px('#4a4458', cx + 3, cy - 32, 3, 25);
      px('#120c18', cx - 4, cy - 29, 8, 5); px('#1a1420', cx - 3, cy - 28, 6, 4);
      px('#ffd36a', cx, cy - 19, 1, 1); px('#ffd36a', cx - 1, cy - 18, 3, 1); px('#ffd36a', cx, cy - 17, 1, 1);
    },
    anvil(f) {
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 12);
      px('#4a3020', cx - 7, cy - 8, 14, 8); px('#5e3e28', cx - 7, cy - 8, 14, 1); for (let i = 0; i < 3; i++) px('#3a2418', cx - 5 + i * 4, cy - 6, 1, 5);
      px('#120c18', cx - 12, cy - 16, 24, 9); px('#3e3c48', cx - 11, cy - 15, 22, 4); px('#6c6a7a', cx - 11, cy - 15, 22, 1); px('#2c2a34', cx - 4, cy - 11, 8, 3); px('#3e3c48', cx - 14, cy - 15, 3, 2);
      px('#8a5a30', cx + 6, cy - 21, 2, 6); px('#5a5866', cx + 3, cy - 23, 8, 3);
    },
    altar(f) { // 石台上一块裂开的魂晶
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 13);
      px('#120c18', cx - 12, cy - 10, 24, 10); px('#4a4158', cx - 11, cy - 9, 22, 8); px('#5d5270', cx - 11, cy - 9, 22, 1); px('#2a2233', cx - 11, cy - 3, 22, 1);
      for (let i = 0; i < 4; i++) px('#8a6ab0', cx - 9 + i * 6, cy - 6, 2, 1);
      px('#120c18', cx - 4, cy - 20, 8, 10); px('#7a55a0', cx - 3, cy - 19, 6, 9); px('#c08aff', cx - 2, cy - 18, 2, 6); px('#120c18', cx, cy - 16, 1, 4);
    },
    runes(f) { // 石桌上摆着几块符文石
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 13);
      for (const bx of [cx - 9, cx + 7]) px('#3a3248', bx, cy - 8, 3, 8);
      px('#120c18', cx - 13, cy - 12, 26, 5); px('#5a4f6a', cx - 12, cy - 11, 24, 3); px('#6b5f7c', cx - 12, cy - 11, 24, 1);
      for (const [dx, c] of [[-8, '#57e0d0'], [-2, '#9fd8ff'], [4, '#57e0d0']]) { px('#120c18', cx + dx - 1, cy - 17, 5, 5); px('#2a3a44', cx + dx, cy - 16, 3, 3); px(c, cx + dx + 1, cy - 15, 1, 1); }
    },
    atlas(f) { // 木桌上铺开的墓图
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 13);
      for (const bx of [cx - 10, cx + 8]) px('#4a3020', bx, cy - 7, 2, 7);
      px('#120c18', cx - 13, cy - 11, 26, 5); px('#6a4426', cx - 12, cy - 10, 24, 3);
      px('#d9c9a0', cx - 9, cy - 15, 18, 5); px('#b9a880', cx - 9, cy - 11, 18, 1); px('#8a3a2a', cx - 5, cy - 14, 1, 1); px('#8a3a2a', cx - 4, cy - 13, 3, 1); px('#8a3a2a', cx, cy - 14, 1, 1); px('#8a3a2a', cx + 3, cy - 13, 2, 1); px('#8a3a2a', cx + 5, cy - 14, 1, 1);
    },
    stele(f) { // 刻满名字的高石碑
      const { x: cx, y: cy } = f; sh(cx, cy + 1, 10);
      px('#120c18', cx - 7, cy - 38, 14, 38); px('#4f4560', cx - 6, cy - 37, 12, 37); px('#6b5f7c', cx - 6, cy - 37, 2, 37); px('#3a3248', cx + 4, cy - 37, 2, 37);
      px('#120c18', cx - 5, cy - 40, 10, 3); px('#5a4f6a', cx - 4, cy - 40, 8, 2);
      for (let i = 0; i < 9; i++) px(i < 3 ? '#ff9a3d' : '#2a2233', cx - 3, cy - 33 + i * 3, 2 + (i * 3) % 5, 1);
      px('#3e3548', cx - 9, cy - 2, 18, 3);
    },
  };
  // 没解锁：一堆碎石盖住
  const rubble = f => { sh(f.x, f.y + 1, 12); const r2 = seeded(f.x * 31 + f.y); for (let i = 0; i < 14; i++) { const a = r2() * Math.PI, rr = r2() * 10, bx = f.x + Math.cos(a) * rr * 1.2, by = f.y - Math.sin(a) * rr * 0.8; const s = 2 + (r2() * 3 | 0); px('#120c18', bx - 1, by - s, s + 2, s + 1); px(r2() < .5 ? '#4a4158' : '#3a3248', bx, by - s + 1, s, s - 1); px('#5d5270', bx, by - s + 1, s, 1); } };
  // 篝火的石圈
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; px('#4a4158', 240 + Math.cos(a) * 8 - 1, 182 + Math.sin(a) * 3 - 1, 3, 2); }
  px('#3a2418', 234, 181, 12, 2); px('#5a3a22', 236, 180, 8, 1);
  for (const f of CAMP.facilities) (open[f.id] ? draw[f.id] : rubble)(f);
}
// 营地每帧的动画：火盆、篝火、魂晶和符文的光
function campFx(g, t, open) {
  const gate = FAC_BY.gate; for (const s of [-1, 1]) flame(g, gate.x + s * 36, gate.y - 13, t + s);
  flame(g, 240, 181, t * 0.8); flame(g, 238, 182, t * 1.1 + 2);
  if (open.altar) { const a = FAC_BY.altar, k = 0.5 + 0.5 * Math.sin(t * 2.4); g.fillStyle(0xc08aff, 0.35 + 0.4 * k); g.fillRect(a.x - 2, a.y - 18, 2, 6); for (let i = 0; i < 3; i++) { const yy = (t * 10 + i * 7) % 20; g.fillStyle(0xc08aff, 0.6 * (1 - yy / 20)); g.fillRect(a.x - 3 + i * 3, a.y - 20 - yy, 1, 1); } }
  if (open.runes) { const r = FAC_BY.runes; [-8, -2, 4].forEach((dx, i) => { g.fillStyle(i === 1 ? 0x9fd8ff : 0x57e0d0, 0.4 + 0.5 * Math.abs(Math.sin(t * 1.7 + i))); g.fillRect(r.x + dx + 1, r.y - 15, 1, 1); }); }
  if (open.stele) { const s = FAC_BY.stele; g.fillStyle(0xffd36a, 0.3 + 0.3 * Math.sin(t * 3)); g.fillRect(s.x - 3, s.y - 33, 4, 1); }
}
