/* =========================================================
   手机：触发器页（v4/v5 设计：design/mockups-v4、mockups-v5）+ 新底部导航 + 战斗里的触发器小条
   一个界面：上 = 触发器栏（1–4），中 = 选中触发器的孔，下 = 宝石背包。点宝石 → 点孔放入；再点同一颗 = 自动放；点孔里的宝石 = 取回。无确认弹窗。
   ========================================================= */
MNAV.splice(0, MNAV.length,
  { id: 'gear', n: '装备', ic: 'i_w_crossbow' }, { id: 'trig', n: '魂龛', ic: null }, { id: 'battle', n: '战斗', ic: 'torch' },
  { id: 'tree', n: '天赋', ic: 'i_star' }, { id: 'craft', n: '铁砧', ic: 'i_anvil' });
const DK = 0x1a1426, CY = 0xffc83a; // 弹壳风：粗深色描边、亮黄选中
let trigSel = 0, gemPick = null, gemTab = 'all', gemPage = 0, tbagSel = null;
const hx = s => typeof s === 'number' ? s : parseInt(String(s).slice(1), 16);
function bub(sc, c, x, y, w, h, fill, o = {}) { // 圆角粗描边 3D 块
  const g = sc.add.graphics(); c.add(g); const r = o.r ?? 7;
  g.fillStyle(DK, 1).fillRoundedRect(x - 2, y - 2, w + 4, h + 5, r + 2);
  g.fillStyle(fill, o.a ?? 1).fillRoundedRect(x, y, w, h, r);
  if (!o.flat) { g.fillStyle(0xffffff, 0.28).fillRoundedRect(x + 2, y + 2, w - 4, Math.max(2, h * 0.28), { tl: r - 2, tr: r - 2, bl: 2, br: 2 }); g.fillStyle(0x000000, 0.18).fillRect(x + 3, y + h - 4, w - 6, 3); }
  if (o.ring) { g.lineStyle(2, o.ring, 1).strokeRoundedRect(x - 4, y - 4, w + 8, h + 8, r + 3); }
  return g;
}
function zoneOn(sc, c, x, y, w, h, fn) { const z = sc.add.zone(x, y, w, h).setOrigin(0).setInteractive(); c.add(z); z.on('pointerup', () => { sfx('click'); fn(); }); return z; }
function bolt(g, cx, cy, s, col) { g.fillStyle(DK, 1); const P = [[0.15, -0.5], [-0.35, 0.08], [-0.02, 0.08], [-0.15, 0.5], [0.35, -0.1], [0.02, -0.1], [0.15, -0.5]]; const pts = P.map(([a, b]) => ({ x: cx + a * s * 1.25, y: cy + b * s * 1.25 })); g.fillPoints(pts, true); g.fillStyle(col, 1); g.fillPoints(P.map(([a, b]) => ({ x: cx + a * s, y: cy + b * s })), true); }
const RAR_C = [0xb9bfd6, 0x4fa8f0, 0xc070f0, 0xffa31a];
const trigTile = (sc, c, x, y, s, T, o = {}) => { // 触发器图块：条件色 + 条件短名，稀有度描边
  const C = TCOND[T.c]; bub(sc, c, x, y, s, s, hx(C.c), { ring: o.sel ? 0xffffff : null });
  const g = sc.add.graphics(); c.add(g); g.lineStyle(2, RAR_C[T.rar] || RAR_C[0], 1).strokeRoundedRect(x + 2, y + 2, s - 4, s - 4, 5);
  T_(sc, c, x + s / 2, y + s / 2 - (s > 30 ? 9 : 6), C.s, { size: 12, scale: s > 30 ? 1.4 : 1, color: '#ffffff' });
  if (T.legacy) T_(sc, c, x + s - 4, y + 1, '旧', { size: 8, color: '#ffe066', align: 'right' });
};
const T_ = (sc, c, x, y, s, o = {}) => T(sc, x, y, s, { align: 'center', parent: c, shadowColor: '#1a1426', ...o });

Object.assign(MobileUI.prototype, {
  /* 底部导航：粗圆角底栏，中间“战斗”凸起黄色 3D，选中项放大，未选中去饱和，红点角标，未解锁显示锁 */
  buildNav() {
    const y0 = H - NAV_H, c = this.add.container(0, y0).setDepth(60), sw = W / MNAV.length; this.navC = c;
    c.add(rect(this, 0, 0, W, NAV_H, '#141019', 1));
    const g = this.add.graphics(); c.add(g); g.fillStyle(DK, 1).fillRoundedRect(2, 3, W - 4, NAV_H - 5, 10); g.fillStyle(0x46538a, 1).fillRoundedRect(4, 5, W - 8, NAV_H - 10, 8); g.fillStyle(0xffffff, 0.18).fillRoundedRect(6, 7, W - 12, 6, 4);
    this.navs = MNAV.map((m, i) => {
      const x = Math.round(i * sw), w = Math.round((i + 1) * sw) - x, b = this.add.container(x, 0); c.add(b);
      b.bg = this.add.graphics(); b.add(b.bg);
      b.hl = rect(this, 0, 0, 1, 1, '#000000', 0, b); // 兼容旧刷新逻辑
      if (m.ic) { const s = this.textures.get(m.ic).getSourceImage(); b.ic = img(this, Math.round(w / 2 - s.width / 2), Math.round(17 - s.height / 2), m.ic, b); }
      else { b.ic = this.add.graphics(); b.add(b.ic); bolt(b.ic, w / 2, 16, 14, 0xfff36a); }
      b.lab = T(this, Math.round(w / 2), 29, m.n, { size: 8, color: '#ffffff', align: 'center', parent: b, shadowColor: '#1a1426' });
      b.dot = this.add.container(w - 12, 3); b.add(b.dot); const dg = this.add.graphics(); b.dot.add(dg); dg.fillStyle(DK, 1).fillCircle(4, 4, 6); dg.fillStyle(0xff3b3b, 1).fillCircle(4, 4, 4.5);
      b.badge = T(this, 4, 0, '', { size: 'num', color: '#ffffff', align: 'center', parent: b.dot }); b.lock = T(this, w / 2, 9, '', { size: 8, align: 'center', parent: b }).setVisible(false);
      const z = this.add.zone(0, -12, w, NAV_H + 12).setOrigin(0).setInteractive(); b.add(z);
      z.on('pointerup', () => { sfx('click'); this.navTo(m.id); });
      b.m = m; b.w = w; return b;
    });
  },
  navDraw() {
    const cur = this.winId && MNAV.some(m => m.id === this.winId) ? this.winId : this.winId === 'tbag' ? 'trig' : this.winId === 'ladder' ? 'battle' : this.winId ? null : 'battle';
    for (const b of this.navs) {
      const id = b.m.id, on = !MENU.some(m => m.id === id) || unlocked(id), sel = id === cur, w = b.w, g = b.bg; g.clear();
      if (sel) { g.fillStyle(DK, 1).fillRoundedRect(1, -12, w - 2, NAV_H + 6, 9); g.fillStyle(id === 'battle' ? 0xff9a3a : CY, 1).fillRoundedRect(3, -10, w - 6, NAV_H + 1, 7); g.fillStyle(0xffffff, 0.45).fillRoundedRect(5, -8, w - 10, 7, 4); g.fillStyle(0xc46a00, 0.6).fillRect(5, NAV_H - 14, w - 10, 4); }
      else if (id === 'battle') { g.fillStyle(DK, 1).fillRoundedRect(3, -6, w - 6, NAV_H, 9); g.fillStyle(0xd07a2a, 1).fillRoundedRect(5, -4, w - 10, NAV_H - 5, 7); }
      const lift = sel ? -8 : id === 'battle' ? -4 : 0; b.ic.y = (b.icY0 ??= b.ic.y) + lift; b.lab.y = 29 + lift + (sel ? 2 : 0);
      b.ic.setScale?.(1); b.ic.setAlpha(on ? (sel || id === 'battle' ? 1 : 0.6) : 0.45); b.lab.setTint(hex(sel ? '#ffffff' : on ? '#c8d0f0' : '#aab2d6'));
      b.lock.setVisible(!on); if (!on) b.lab.setText(unlockText(id).match(/\d+/) ? '锁' + unlockText(id).match(/\d+/)[0] : b.m.n); else b.lab.setText(b.m.n);
      let badge = '';
      if (id === 'gear') { const k = S.stash.filter(x => x.isNew && x.kind !== 'gem').length; badge = k ? String(Math.min(9, k)) : ''; }
      if (id === 'trig' && (S.trigBag.some(t => t.isNew) || S.stash.some(g => g.kind === 'gem' && g.isNew) || S.mods.some(m => m.isNew))) badge = '!';
      if (id === 'tree' && treePoints() > 0) badge = String(Math.min(9, treePoints()));
      b.dot.setVisible(on && !!badge); b.badge.setText(badge); b.dot.y = 3 + lift;
    }
  },
  /* 战斗里的触发器小条：最多 4 格，冷却遮罩，触发时闪一下，没开的显示锁 */
  trigHud() {
    if (!this.trigHudC) { this.trigHudC = this.add.container(0, 0).setDepth(12); this.trigHudG = this.add.graphics(); this.trigHudC.add(this.trigHudG); this.trigHudT = [0, 1, 2, 3].map(() => T(this, 0, 0, '', { size: 8, align: 'center', parent: this.trigHudC, shadowColor: '#1a1426' })); }
    const g = this.trigHudG; g.clear(); const s = 18, gap = 4, x0 = Math.round(W / 2 - (4 * s + 3 * gap) / 2), y = MBOT - 26, n = trigSlots();
    this.trigHudC.setVisible(!this.winId);
    for (let i = 0; i < 4; i++) {
      const x = x0 + i * (s + gap), T0 = S.trigs[i], t = STATS.trigs && STATS.trigs[i], lab = this.trigHudT[i];
      g.fillStyle(DK, 0.9).fillRoundedRect(x - 1, y - 1, s + 2, s + 3, 5);
      if (i >= n || !T0) { g.fillStyle(0x4a4f6a, 0.8).fillRoundedRect(x, y, s, s, 4); lab.setText(i >= n ? '锁' : '').setPosition(x + s / 2, y + 4); continue; }
      const fl = TRIGS_RT.flash[i] > 0; g.fillStyle(fl ? 0xffffff : hx(TCOND[T0.c].c), 1).fillRoundedRect(x, y, s, s, 4);
      const p = trigProgress(i), full = p >= 1 && t && t.mode === 'charge'; if (p < 1) g.fillStyle(0x000000, 0.55).fillRect(x, y, s, Math.round(s * (1 - p))); // 充能：从下往上亮，满了发光
      if (full) g.lineStyle(2, 0xfff36a, 1).strokeRoundedRect(x - 2, y - 2, s + 4, s + 4, 5);
      if (t && t.cast) g.fillStyle(0xffffff, 1).fillTriangle(x + s - 6, y + s - 1, x + s - 1, y + s - 1, x + s - 1, y + s - 6); // 【出手】角标
      if (t && !t.ws.length) g.fillStyle(0x000000, 0.5).fillRoundedRect(x, y, s, s, 4);
      lab.setText(TCOND[T0.c].s).setPosition(x + s / 2, y + 4);
    }
  },
  /* 触发器页 */
  win_trig(c, w, h) {
    const n = trigSlots(); trigSel = clamp(trigSel, 0, 3); const s = 52, gap = Math.floor((w - 16 - 4 * s) / 3);
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * (s + gap), y = 16, T0 = S.trigs[i], lock = i >= n;
      if (lock) { bub(this, c, x, y, s, s, 0x5a6080); T_(this, c, x + s / 2, y + 10, '锁', { size: 12 }); T_(this, c, x + s / 2, y + 32, trigSlotLock(i) || '', { size: 8, color: '#e0e4f0' }); zoneOn(this, c, x, y, s, s, () => toast(`第 ${i + 1} 位：${i < 3 ? `角色 ${trigSlotLock(i)} 解锁` : '角色 Lv35，或主手 / 法阵的“魂龛位 +1”'}`)); continue; }
      if (T0) trigTile(this, c, x, y, s, T0, { sel: i === trigSel }); else { bub(this, c, x, y, s, s, 0x2c3460, { ring: i === trigSel ? 0xffffff : null, flat: 1 }); T_(this, c, x + s / 2, y + 16, '＋', { size: 12, scale: 1.4, color: '#7f8ac0' }); }
      if (T0) T_(this, c, x + s / 2, y + s + 4, (TCOND[T0.c].kind === 'cast' ? '出·' : '') + TCOND[T0.c].n, { size: 8, color: TCOND[T0.c].kind === 'cast' ? '#ffd23a' : '#ffffff' });
      zoneOn(this, c, x, y, s, s, () => { if (trigSel === i && (!T0 || S.trigBag.length)) { tbagSel = null; this.openWin('tbag'); return; } trigSel = i; gemPick = null; this.refresh(); });
    }
    let y = 88; const T0 = S.trigs[trigSel], t = STATS.trigs && STATS.trigs[trigSel];
    bub(this, c, 6, y, w - 12, 108, 0x4f5d9a, { r: 10 });
    if (!T0) { T_(this, c, w / 2, y + 30, '这一位还没有魂龛', { size: 12 }); mkBtn(this, c, w / 2 - 50, y + 56, 100, 28, `换魂龛 (${S.trigBag.length})`, () => { tbagSel = null; this.openWin('tbag'); }, { style: 'w', size: 8 }); }
    else {
      T(this, 14, y + 6, trigName(T0), { parent: c, color: '#ffffff', shadowColor: '#1a1426' }); T(this, 14 + textW(trigName(T0)) + 6, y + 8, TRIG_RAR_N[T0.rar] + ' · ' + T0.sock + ' 孔', { size: 8, parent: c, color: '#' + (RAR_C[T0.rar] || 0).toString(16).padStart(6, '0') });
      const ib = this.add.container(w - 30, y + 4); c.add(ib); bub(this, ib, 0, 0, 16, 16, 0x6fc8ff, { r: 8 }); T_(this, ib, 8, 3, 'i', { size: 8 });
      zoneOn(this, c, w - 36, y, 28, 26, () => this.ask('魂龛规则', () => {}, '知道了', `【${trigKindN(T0.c)}】${TCOND[T0.c].n}：${TCOND[T0.c].d}。\n【出手】魂龛轮到时替换这一次出手（左边优先）；【响应】魂龛满了立刻额外放。\n技能石每次施放耗灯火，辅助石加倍率；灯火低于 10% 只放底技能。\n每个魂龛只能放 ${trigMaxSkills(T0)} 颗技能石，其余孔放辅助石${trigMaxSkills(T0) > 1 ? (trigFx(T0).rotate ? '（轮转：两颗轮流放，不分流）' : `（${trigU(T0).n}：两颗同时放，各 −${Math.round((1 - trigSplit(T0)) * 100)}%）`) : ''}。想换技能石：点宝石 → 装备，会换下现在这颗。技能石推荐底子一致时 +20%。\n常驻只能插瘟疫光环、游雷、旋风斩。`));
      mkBtn(this, c, w - 74, y + 4, 40, 18, '换', () => { tbagSel = null; this.openWin('tbag'); }, { size: 8 });
      if (trigCanAddSock(T0)) mkBtn(this, c, w - 124, y + 4, 46, 18, `开孔${S.glyphs && S.glyphs.socket || 0}`, () => { const r = trigAddSock(T0); toast(r); this.refresh(); }, { size: 8, disabled: !(S.glyphs && S.glyphs.socket > 0) });
      const ss = 30, lk = 6, k0 = T0.sock, rw = k0 * ss + (k0 - 1) * lk, sx = Math.round((w - rw) / 2), sy = y + 34, skills = T0.socks.filter(isSkill);
      const lg = this.add.graphics(); c.add(lg);
      for (let k = 0; k < k0; k++) {
        const x = sx + k * (ss + lk), it = T0.socks[k], fits = isSupport(it) && skills.some(g => supportFits(it, g)), ok = gemPick && it !== gemPick && trigCanSock(T0, k, gemPick);
        if (k > 0) { const on = (isSupport(it) && fits) || (isSkill(it) && T0.socks.some(m => isSupport(m) && supportFits(m, it))); lg.fillStyle(on ? 0xffe36a : DK, 1).fillRect(x - lk - 1, sy + ss / 2 - 3, lk + 2, 6); }
        if (ok) { lg.fillStyle(0x7cf05a, 0.5).fillRoundedRect(x - 4, sy - 4, ss + 8, ss + 8, 10); }
        const g = this.add.graphics(); c.add(g);
        if (!it) { g.fillStyle(DK, 1).fillCircle(x + ss / 2, sy + ss / 2, ss / 2 + 1); g.fillStyle(0x2c3460, 1).fillCircle(x + ss / 2, sy + ss / 2, ss / 2 - 1); T_(this, c, x + ss / 2, sy + 8, '＋', { size: 12, color: ok ? '#7cf05a' : '#7f8ac0' }); }
        else {
          if (isSkill(it)) { g.fillStyle(DK, 1).fillRoundedRect(x - 2, sy - 2, ss + 4, ss + 5, 8); g.fillStyle(0xf58a3a, 1).fillRoundedRect(x, sy, ss, ss, 7); }
          else { g.fillStyle(DK, 1).fillCircle(x + ss / 2, sy + ss / 2 + 1, ss / 2 + 2); g.fillStyle(fits ? 0x3a8ae8 : 0x5a6080, 1).fillCircle(x + ss / 2, sy + ss / 2, ss / 2); }
          const key = isSkill(it) ? 'i_' + iconOf(it) : 'mod_' + it.mid, im = this.textures.get(key).getSourceImage();
          const ic = img(this, x + ss / 2 - im.width / 2, sy + ss / 2 - im.height / 2, key, c); if (isSupport(it) && !fits) ic.setAlpha(0.45);
          T(this, x + ss - 1, sy + ss - 8, String(it.lvl || 1), { size: 'num', align: 'right', parent: c, color: '#ffe066' });
        }
        zoneOn(this, c, x - 3, sy - 3, ss + 6, ss + 6, () => {
          if (gemPick) { if (trigCanSock(T0, k, gemPick)) { socketInto(T0, k, gemPick); gemPick = null; } else toast(isSkill(gemPick) && skills.length >= trigMaxSkills(T0) ? `一个魂龛只能 ${trigMaxSkills(T0)} 颗技能石，点已装的那颗来替换` : isSkill(gemPick) && T0.c === 'always' ? '常驻只能插瘟疫光环、游雷、旋风斩' : '这里放不下'); }
          else if (it) { this.gemDetail(it, { T0, k }); return; } else toast('点下面的宝石看详情再装备'); this.refresh();
        });
      }
      T_(this, c, w / 2, y + 74, t && !t.on ? '魂龛位暂停' : skills.length ? '⚔ ' + fmt(t ? t.dps : 0) + ' 秒伤' : '空 · 放一颗技能石', { size: 12, color: t && !t.on ? '#b9bfd6' : '#ffd23a' });
      if (t && t.on && skills.length) T_(this, c, w / 2, y + 88, `每秒 ${(t.per || 0).toFixed(2)} 次${t.cast && STATS.weapons[0] ? ' · 占出手 ' + Math.round(Math.min(1, t.per / (STATS.weapons[0].aps || 1)) * 100) + '%' : ''} · 耗灯 ${t.cost.toFixed(1)}${t.mode === 'always' ? '/秒' : '/次'}`, { size: 8, color: '#e0e4f0' });
      const af = trigU(T0) ? '独特：' + trigU(T0).d : trigAffList(T0).join('  '); if (af) T_(this, c, w / 2, y + 99, wrapText(af, w - 24, 8).slice(0, 1).join(''), { size: 8, color: '#9fe08a' });
      if (trigSel > 0 && trigSel < n) mkBtn(this, c, 14, y + 22, 22, 14, '◀', () => { swapTrigs(trigSel, trigSel - 1); trigSel--; this.refresh(); }, { size: 8 });
      if (trigSel < n - 1) mkBtn(this, c, w - 36, y + 22, 22, 14, '▶', () => { swapTrigs(trigSel, trigSel + 1); trigSel++; this.refresh(); }, { size: 8 });
    }
    // 宝石背包
    y = 206; const tabs = [['all', '全部'], ['skill', '技能'], ['sup', '辅助']];
    tabs.forEach(([v, nm], i) => mkBtn(this, c, 8 + i * 46, y, 44, 22, nm, () => { gemTab = v; gemPage = 0; gemPick = null; this.refresh(); }, { size: 8, style: gemTab === v ? 'w' : 'n' }));
    T(this, w - 10, y + 6, gemPick ? '点亮起的孔放入·再点宝石取消' : '点宝石看详情', { size: 8, align: 'right', parent: c, color: gemPick ? '#7cf05a' : '#b9c2ea' });
    const gems = S.stash.filter(x => x.kind === 'gem').sort((a, b) => b.lvl - a.lvl), sups = S.mods.filter(m => !MOD_BY[m.mid].field).sort((a, b) => b.lvl - a.lvl);
    const list = gemTab === 'skill' ? gems : gemTab === 'sup' ? sups : [...gems, ...sups];
    const cs = TOUCH, cols = Math.floor((w - 12) / (cs + 2)), rows = Math.max(1, Math.floor((h - (y + 30) - 30) / (cs + 2))), per = cols * rows, pg = Math.max(1, Math.ceil(list.length / per)); gemPage = clamp(gemPage, 0, pg - 1);
    const gx = Math.round((w - cols * (cs + 2)) / 2);
    list.slice(gemPage * per, gemPage * per + per).forEach((it, i) => {
      const x = gx + (i % cols) * (cs + 2), yy = y + 30 + Math.floor(i / cols) * (cs + 2), bad = gemPick && T0 && !T0.socks.some((_, k) => !T0.socks[k] && trigCanSock(T0, k, it));
      if (gemPick === it) { const g = this.add.graphics(); c.add(g); g.fillStyle(0xffffff, 1).fillRoundedRect(x - 3, yy - 3, cs + 6, cs + 6, 6); }
      const cell = mkCell(this, c, x, yy, it, { size: cs, direct: true, onClick: () => {
        if (gemPick === it) { gemPick = null; this.refresh(); return; } this.gemDetail(it, { T0 }); } });
      if (gemPick && gemPick !== it) cell.setAlpha(0.6);
      if (it.isNew) rect(this, x + 2, yy + 2, 4, 4, '#ff3b3b', 1, c);
    });
    if (!list.length) T_(this, c, w / 2, y + 44, gemTab === 'sup' ? '还没有辅助石' : '还没有宝石', { size: 8, color: '#b9c2ea' });
    if (pg > 1) { mkBtn(this, c, 8, h - 28, 30, 22, '<', () => { gemPage--; this.refresh(); }, { disabled: gemPage <= 0 }); T_(this, c, w / 2, h - 24, `${gemPage + 1}/${pg}`, { size: 8 }); mkBtn(this, c, w - 38, h - 28, 30, 22, '>', () => { gemPage++; this.refresh(); }, { disabled: gemPage >= pg - 1 }); }
  },
  /* 触发器背包 / 掉落对比：点一个 → 当前 vs 新（孔数、秒伤变化），只有 分解 / 替换 */
  win_tbag(c, w, h) {
    const cur = S.trigs[trigSel], bag = S.trigBag; let y = 14;
    T_(this, c, w / 2, y, `第 ${trigSel + 1} 位 · 背包 ${bag.length} 个`, { size: 8, color: '#b9c2ea' }); y += 16;
    const s = 40, cols = Math.floor((w - 12) / (s + 6)), gx = Math.round((w - cols * (s + 6)) / 2);
    bag.slice(0, cols * 3).forEach((T0, i) => { const x = gx + (i % cols) * (s + 6), yy = y + Math.floor(i / cols) * (s + 14); trigTile(this, c, x, yy, s, T0, { sel: tbagSel === T0 }); T_(this, c, x + s / 2, yy + s + 2, '●'.repeat(T0.sock), { size: 8, color: '#ffffff' }); if (T0.isNew) rect(this, x + 1, yy + 1, 5, 5, '#ff3b3b', 1, c); zoneOn(this, c, x, yy, s, s, () => { tbagSel = T0; T0.isNew = false; this.refresh(); }); });
    if (!bag.length) T_(this, c, w / 2, y + 20, '还没有别的魂龛 · 打怪会掉', { size: 8, color: '#b9c2ea' });
    y += Math.max(1, Math.ceil(Math.min(bag.length, cols * 3) / cols)) * (s + 14) + 10;
    const N = tbagSel && bag.includes(tbagSel) ? tbagSel : null; if (!N) { mkBtn(this, c, w / 2 - 40, h - 40, 80, 28, '返回', () => this.openWin('trig'), {}); if (cur) mkBtn(this, c, 8, h - 40, 70, 28, '卸下', () => { unequipTrig(trigSel); this.openWin('trig'); }, { size: 8 }); return; }
    // 对比：临时把当前的宝石按顺序搬进新触发器算秒伤
    const before = STATS.dps, keep = S.trigs[trigSel]; const tmp = { ...N, socks: Array(N.sock).fill(null) };
    if (keep) { let k = 0; for (const g of keep.socks.filter(Boolean)) { while (k < tmp.sock && !trigCanSock(tmp, k, g)) k++; if (k < tmp.sock) tmp.socks[k++] = g; } }
    S.trigs[trigSel] = tmp; refreshStats(); const after = STATS.dps; S.trigs[trigSel] = keep; refreshStats();
    bub(this, c, 6, y, w - 12, 150, 0x4f5d9a, { r: 10 });
    if (keep) { trigTile(this, c, 30, y + 14, 50, keep); T_(this, c, 55, y + 68, keep.sock + ' 孔', { size: 8 }); T_(this, c, w / 2, y + 30, '➜', { size: 12, scale: 1.4 }); }
    trigTile(this, c, w - 80, y + 14, 50, N); T_(this, c, w - 55, y + 68, `${TRIG_RAR_N[N.rar]} · ${N.sock} 孔`, { size: 8 });
    const d = before ? (after - before) / before : 0; T_(this, c, w / 2, y + 86, (d >= 0 ? '▲ +' : '▼ ') + Math.round(d * 100) + '%', { size: 12, scale: 1.4, color: d >= 0 ? '#7cf05a' : '#ff6a5a' });
    const af = trigAffList(N).join('  '); T_(this, c, w / 2, y + 100, wrapText(`【${trigKindN(N.c)}】` + TCOND[N.c].n + (af ? ' · ' + af : ''), w - 24, 8).slice(0, 2).join('\n'), { size: 8, color: '#9fe08a' });
    T_(this, c, w / 2, y + 124, wrapText(trigU(N) ? '独特：' + trigU(N).d : '替换时宝石自动搬过去', w - 24, 8).slice(0, 2).join('\n'), { size: 8, color: '#b9c2ea' });
    y += 160;
    mkBtn(this, c, 10, y, 70, 30, '分解', () => { const n = salvageTrig(N); toast(`分解：碎片 +${n}`); tbagSel = null; this.refresh(); }, { style: 'r' });
    mkBtn(this, c, 88, y, w - 98, 30, '替换', () => { equipTrig(trigSel, N); tbagSel = null; this.openWin('trig'); }, { style: 'w' });
    mkBtn(this, c, w / 2 - 40, h - 36, 80, 26, '返回', () => this.openWin('trig'), { size: 8 });
    if (cur) mkBtn(this, c, 8, h - 36, 60, 26, '卸下', () => { unequipTrig(trigSel); this.openWin('trig'); }, { size: 8 });
  },
  /* 骸骨轮盘（unique-reels.md）：三张独特卡，点一张 = 选；重转（希望符）、放弃（+15 碎片）。第一版没有转轮动画，开窗时卡片依次亮起 */
  win_reels(c, w, h) {
    const p = reelCurrent(); if (!p) { T_(this, c, w / 2, 40, '没有未开的轮盘', { size: 12 }); mkBtn(this, c, w / 2 - 40, h - 40, 80, 28, '返回', () => this.closeWin()); return; }
    T_(this, c, w / 2, 14, `第 ${p.floor} 层里程碑 · 还有 ${S.reelsPending.length} 次`, { size: 8, color: '#b9c2ea' });
    if (p.jack) T_(this, c, w / 2, 28, '三连！三件全给', { size: 12, color: '#ffd23a' });
    const cw = Math.floor((w - 24) / 3), ch = 190, y0 = 46;
    p.opts.forEach((it, k) => bub(this, c, 8 + k * (cw + 4), y0, cw, ch, 0x4f5d9a, { r: 9, ring: 0xffa31a }));
    p.opts.forEach((it, k) => {
      const x = 8 + k * (cw + 4), tw = it.kind === 'trig';
      if (tw) trigTile(this, c, x + cw / 2 - 20, y0 + 8, 40, it); else mkCell(this, c, x + cw / 2 - 18, y0 + 8, it, { size: 36, direct: true, onClick: () => {} });
      const nm = tw ? trigName(it) : itemName(it), kind = tw ? '魂龛' : KIND_N[it.kind] || it.kind;
      T_(this, c, x + cw / 2, y0 + 54, nm, { size: 8, color: '#ffa31a' }); T_(this, c, x + cw / 2, y0 + 66, kind + ' · ' + it.ilvl + ' 级', { size: 8, color: '#e0e4f0' });
      const lines = tw ? [`【${trigKindN(it.c)}】${TCOND[it.c].n}`, trigU(it).d] : ruleLines(it);
      const wl = lines.flatMap(l => wrapText(l, cw - 8, 8)), txt = (wl.length > 7 ? [...wl.slice(0, 6), wl[6].slice(0, Math.max(1, wl[6].length - 1)) + '…'] : wl).join('\n'); // 长规则：截断并标省略号（点图标看全文）
      if (!tw && reelTags({ id: it.u }).some(t => reelSkillTags().has(t))) T_(this, c, x + cw / 2, y0 + ch - 40, '★ 同标签', { size: 8, color: '#ffd23a' }); T_(this, c, x + cw / 2, y0 + 80, txt, { size: 8, color: '#9fe08a' });
      const b = mkBtn(this, c, x + 4, y0 + ch - 26, cw - 8, 22, p.jack ? '全拿' : '选这件', () => { reelPick(k); toast(p.jack ? '三件都进背包了' : `${nm} 进背包了`); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { size: 8, style: 'w' });

    });
    p.shown = 1; const hope = (S.glyphs && S.glyphs.hope) || 0, y = y0 + ch + 12;
    mkBtn(this, c, 8, y, (w - 20) / 2, 26, `重转（希望符 ${hope}）`, () => { if (reelReroll()) { p.shown = 0; this.refresh(); } else toast('没有希望符'); }, { size: 8, disabled: !hope });
    mkBtn(this, c, 12 + (w - 20) / 2, y, (w - 20) / 2, 26, `放弃（+${REEL.skipShards} 碎片）`, () => { reelSkip(); toast(`碎片 +${REEL.skipShards}`); if (S.reelsPending.length) this.refresh(); else this.closeWin(); }, { size: 8, style: 'r' });
    mkBtn(this, c, w / 2 - 40, h - 36, 80, 26, '稍后再开', () => this.closeWin(), { size: 8 });
  },
});
// 刷新钩子：导航和战斗触发器小条每帧更新
{ const up0 = MobileUI.prototype.updateHud; MobileUI.prototype.updateHud = function () { up0.call(this); this.navDraw(); this.trigHud(); }; }
