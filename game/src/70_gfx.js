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
  for (const m of MODS) add('mod_' + m.id, SPR.mods[m.id]);
  add('ghost', SPR.ghost); add('chest', SPR.chest); add('chestG', SPR.chestG); add('skull', SPR.skull); add('torch', SPR.torch);
  for (const k in SPR.icons) add('i_' + k, SPR.icons[k]);
  for (const k of ['anvil', 'star', 'book', 'ladder']) add('i_' + k, sprite(ART[k]));
  add('i_soulf', sprite(ART.soulf)); add('cursor', sprite(ART.cursor, '#0d0a12')); add('up', sprite(ART.up.map(r => r.replace(/g/g, 'm')), '#0d0a12'));
  add('shard', SPR.shard); for (const g of GLYPHS) add('glyph_' + g.id, SPR.glyphs[g.id]);
  add('dust', DUST_ICON); add('soul', SOUL_ICON); add('glow', GLOW);
  add('px', cvs(1, 1, x => px(x, '#fff', 0, 0)));
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
  add('node', cvs(22, 22, x => {
    const o = [[7, 0, 8, 1], [4, 1, 14, 1], [2, 2, 18, 2], [1, 4, 20, 3], [0, 7, 22, 8], [1, 15, 20, 3], [2, 18, 18, 2], [4, 20, 14, 1], [7, 21, 8, 1]];
    for (const [a, b, w, h] of o) px(x, '#fff', a, b, w, h);
  }));
  add('nodeIn', cvs(22, 22, x => {
    const o = [[7, 2, 8, 1], [5, 3, 12, 1], [3, 4, 16, 3], [2, 7, 18, 8], [3, 15, 16, 3], [5, 18, 12, 1], [7, 19, 8, 1]];
    for (const [a, b, w, h] of o) px(x, '#fff', a, b, w, h);
  }));
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
  c.add(nine(sc, 0, 0, s, s, 'f_slot', 3));
  if (it) {
    const isMod = it.kind === 'mod';
    if (!isMod) c.add(nine(sc, 1, 1, s - 2, s - 2, 'f_rar', 2).setTint(hex(icol(it))).setAlpha(0.9));
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

