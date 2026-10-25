/* =========================================================
   手机竖屏界面（只进 ashen-crypt-mobile.html）
   继承桌面界面类 UI：提示、拾取记录、横幅、结算、各个窗口的内容都沿用；这里只换布局和操作：
   顶栏（层数 + 骨头条）→ 战斗区 → 操作区（血球 / 自动·推层·继续·返回·菜单 / 灯火瓶）→ 底部导航（中间凸起的「战斗」）。
   唯一的操作是移动：左下按哪出哪的浮动摇杆，写进 STICK，由核心的移动代码读取。
   ========================================================= */
const MNAV = [
  { id: 'gear', n: '装备', ic: 'i_w_crossbow' }, { id: 'tree', n: '天赋', ic: 'i_star' }, { id: 'craft', n: '铁砧', ic: 'i_anvil' },
  { id: 'battle', n: '战斗', ic: 'torch' },
  { id: 'mods', n: '符文', ic: 'mod_Chain' }, { id: 'ladder', n: '天梯', ic: 'i_ladder' }, { id: 'settings', n: '设置', ic: null },
];
const STICK_R = 26;
const MCOLS = 8; // 竖屏格子每行 8 个，每格 TOUCH 见方 // 摇杆半径（逻辑像素）
class MobileUI extends UI {
  create() {
    G.ui = this; this.cameras.main.setZoom(Z).centerOn(W / 2, H / 2); this.winId = null; this.winC = null; this.tipC = null; this.feeds = []; this.toastC = null; this.pan = 0;
    this.buildHud(); this.buildNav(); this.buildStick(); this.buildTouch();
    this.titleC = this.add.container(0, 0); // 竖屏不放标题画面
    this.bannerT = T(this, W / 2, MTOP + 50, '', { color: COL.boss, align: 'center', scale: 2, shadowColor: '#2b0b10' }).setDepth(30).setAlpha(0);
    this.feedC = this.add.container(0, 0).setDepth(15);
    this.toastC = this.add.container(0, 0).setDepth(300);
    this.input.keyboard?.on('keydown-ESC', () => this.closeWin());
  }
  /* --- 顶栏 + 操作区 --- */
  buildHud() {
    const top = this.add.container(0, 0).setDepth(10); this.topC = top;
    top.add(rect(this, 0, 0, W, MTOP, COL.ink, 0.82)); top.add(rect(this, 0, MTOP - 1, W, 1, '#6a5433', 1));
    this.ribbon = this.add.nineslice(0, 1, 'ribbon', null, 120, 22, 14, 14, 0, 0).setOrigin(0); top.add(this.ribbon);
    this.depthT = T(this, W / 2, 6, '', { align: 'center', color: COL.emberHi, parent: top });
    const bc = this.add.container(W / 2 - 100, 22); top.add(bc); this.bossC = bc;
    this.bossT = T(this, 100, -1, '', { size: 8, align: 'center', parent: bc });
    bc.add(img(this, 0, 9, 'bonebar')); this.bossG = this.add.graphics(); bc.add(this.bossG); this.bossG.y = -1;
    // 操作区：石台底纹铺满
    const pan = this.add.container(0, MBOT).setDepth(10); this.panC = pan;
    pan.add(this.add.tileSprite(0, 0, W, H - MBOT - NAV_H, 'dock').setOrigin(0));
    this.xpG = this.add.graphics(); pan.add(this.xpG);
    const orb = (x, key) => { const c = this.add.container(x, H - NAV_H - 66).setDepth(11); c.add(img(this, 0, 0, key)); const g = this.add.graphics(); c.add(g); c.add(img(this, 0, 0, 'orb_hi')); c.g = g; c.key = ''; return c; };
    this.hpOrb = orb(1, 'orb_hp'); this.hpT = T(this, 32, 27, '', { align: 'center', parent: this.hpOrb }); this.defT = T(this, 32, 40, '', { size: 8, color: '#bfe0ff', align: 'center', parent: this.hpOrb });
    this.gdT = T(this, 4, MBOT - 12, '', { size: 8, color: '#e8dcc0' }).setDepth(12);
    this.soulOrb = orb(W - 65, 'orb_soul'); this.soulT = T(this, 32, 27, '', { color: '#e6dcff', align: 'center', parent: this.soulOrb }); this.burnT = T(this, 32, 40, '', { size: 8, color: '#b9a2ff', align: 'center', parent: this.soulOrb });
    this.spinC = this.add.container(4, MBOT + 8).setDepth(11); img(this, 0, 0, 'mod_Whirl', this.spinC); this.spinT = T(this, 13, 1, '', { parent: this.spinC });
    // 中间一列按钮：自动 | 推层 / 继续 / 返回 | 菜单
    const bx = 68, bw = 65, fw = 134;
    this.aiBtn = mkBtn(this, pan, bx, 4, bw, 28, '自动', () => { S.auto.ai = !S.auto.ai; if (S.auto.ai) AUTO.manualT = -1e9; save(); });
    this.lockBtn = mkBtn(this, pan, bx + bw + 4, 4, bw, 28, '推层', () => { S.auto.lock = !S.auto.lock; save(); });
    this.mainBtn = mkBtn(this, pan, bx, 35, fw, 28, '开始', () => { ac(); this.toggleLoop(); }, { style: 'w' });
    this.retBtn = mkBtn(this, pan, bx, 66, bw, 28, '返回', () => { ac(); if (!RUN || RUN.ending) return; this.ask('提前返回营地？', () => { if (RUN && !RUN.ending) abandonRun(); }, '返回营地', '东西全部带走，没打完的这一层不算通过。'); });
    this.moreBtn = mkBtn(this, pan, bx + bw + 4, 66, bw, 28, '菜单', () => this.toggleWin('more'));
    this.lvT = T(this, W / 2, 96, '', { size: 8, color: COL.xp, align: 'center', parent: pan });
  }
  /* --- 底部导航：7 格，中间「战斗」凸起 --- */
  buildNav() {
    const y0 = H - NAV_H, c = this.add.container(0, y0).setDepth(60), sw = W / MNAV.length; this.navC = c;
    c.add(rect(this, 0, 0, W, NAV_H, '#141019', 1)); c.add(rect(this, 0, 0, W, 1, '#c8913a', 1));
    this.navs = MNAV.map((m, i) => {
      const x = Math.round(i * sw), w = Math.round((i + 1) * sw) - x, mid = m.id === 'battle', b = this.add.container(x, 0); c.add(b);
      if (mid) { b.add(nine(this, 1, -10, w - 2, NAV_H + 8, 'f_btn_w', 4)); }
      b.hl = rect(this, 2, 2, w - 4, NAV_H - 4, '#ffd36a', 0, b);
      const iy = mid ? 0 : 9;
      if (m.ic) { const s = this.textures.get(m.ic).getSourceImage(); b.ic = img(this, Math.round(w / 2 - s.width / 2), iy + Math.round(8 - s.height / 2), m.ic, b); }
      else { const g = this.add.graphics(); b.add(g); const cx = Math.round(w / 2), cy = iy + 8; g.fillStyle(0xe9e0c9, 1); g.fillRect(cx - 4, cy - 4, 8, 8); g.fillRect(cx - 1, cy - 7, 2, 14); g.fillRect(cx - 7, cy - 1, 14, 2); g.fillStyle(0x141019, 1); g.fillRect(cx - 1, cy - 1, 2, 2); b.ic = g; }
      b.lab = T(this, Math.round(w / 2), iy + 20, m.n, { size: mid ? 12 : 8, color: mid ? '#2a1306' : COL.text, shadow: !mid, align: 'center', parent: b });
      b.badge = T(this, w - 4, 2, '', { size: 'num', color: COL.ember, align: 'right', parent: b });
      const z = this.add.zone(0, mid ? -10 : 0, w, NAV_H + (mid ? 10 : 0)).setOrigin(0).setInteractive(); b.add(z);
      z.on('pointerup', () => { sfx('click'); this.navTo(m.id); });
      b.m = m; return b;
    });
  }
  navTo(id) {
    if (id === 'battle') return this.closeWin();
    if (MENU.some(m => m.id === id) && !unlocked(id)) { toast(`${MENU.find(m => m.id === id).n}：${unlockText(id)}`); return; }
    this.toggleWin(id);
  }
  /* --- 浮动摇杆：左下按下就出现在拇指下，拖动方向 = 移动方向，越远越快；松手淡出，几秒后交还自动 --- */
  buildStick() {
    this.stickG = this.add.graphics().setDepth(55); this.stickP = null; this.stickA = 0;
    this.input.on('pointerdown', (p, over) => {
      if (this.winId || this.stickP != null || (over && over.length)) return;
      const x = p.worldX, y = p.worldY; // 逻辑像素（相机已经按 Z 缩放）
      if (y < MTOP || y > H - NAV_H || x > W * 0.62) return; // 左下热区：顶栏以下、导航以上、屏幕左边六成
      this.stickP = p.id; this.stickO = { x, y }; this.stickK = { x, y }; this.stickA = 1; STICK.on = true; STICK.x = STICK.y = 0; ac();
    });
    this.input.on('pointermove', p => {
      if (p.id !== this.stickP) return;
      let dx = p.worldX - this.stickO.x, dy = p.worldY - this.stickO.y; const l = Math.hypot(dx, dy); if (l > STICK_R) { dx *= STICK_R / l; dy *= STICK_R / l; }
      this.stickK = { x: this.stickO.x + dx, y: this.stickO.y + dy };
      const f = Math.hypot(dx, dy) / STICK_R; STICK.x = f < 0.15 ? 0 : dx / STICK_R; STICK.y = f < 0.15 ? 0 : dy / STICK_R; // 中心一小圈是死区
      if (STICK.x || STICK.y) autoTouch(-1); // 推动摇杆 = 接管角色
    });
    const up = p => { if (p.id !== this.stickP) return; this.stickP = null; STICK.on = false; STICK.x = STICK.y = 0; };
    this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
  }
  drawStick(dt) {
    const g = this.stickG; g.clear();
    if (this.stickP == null && this.stickA > 0) this.stickA = Math.max(0, this.stickA - dt * 3);
    if (this.stickA <= 0 || !this.stickO) return;
    const a = this.stickA, o = this.stickO, k = this.stickK;
    g.fillStyle(0x0d0a12, 0.45 * a).fillCircle(o.x, o.y, STICK_R + 2);
    g.lineStyle(2, 0xc8913a, 0.9 * a).strokeCircle(o.x, o.y, STICK_R);
    g.fillStyle(0x0d0a12, 0.9 * a).fillCircle(k.x, k.y, 11); g.fillStyle(0xe9e0c9, a).fillRect(Math.round(k.x) - 5, Math.round(k.y) - 5, 10, 10); g.fillStyle(0xffd36a, a).fillRect(Math.round(k.x) - 5, Math.round(k.y) - 5, 10, 2);
  }
  updateHud() {
    const P = STATS;
    const hf = clamp(player.life / P.life, 0, 1), df = P.shield > 0 ? clamp(player.shield / P.shield, 0, 1) : 0;
    this.drawOrb(this.hpOrb, hf, 0xb52a2a, 0xff7a6a, 0x6a1418, df, 0xbfe0ff);
    const fk = player.fbT > 0 ? player.fb * player.fbT / 0.2 : 0; // 受击：战斗区四边淡红，不刷白
    if (!this.vigG) this.vigG = this.add.graphics().setDepth(9); const vg = this.vigG; vg.clear();
    if (fk > 0) for (let i = 0; i < 6; i++) { vg.fillStyle(0xa01010, fk * 0.22 * (1 - i / 6)); vg.fillRect(0, MTOP + i * 2, W, 2); vg.fillRect(0, MBOT - 2 - i * 2, W, 2); vg.fillRect(i * 2, MTOP, 2, MBOT - MTOP); vg.fillRect(W - 2 - i * 2, MTOP, 2, MBOT - MTOP); }
    const sf = clamp(player.soul / P.soulMax, 0, 1), lad = RUN && RUN.mode === 'ladder', blink = RUN && !lad && sf < SOUL.lowWarn && (G.time * 4 | 0) % 2;
    this.drawOrb(this.soulOrb, sf, player.soul <= 0 ? 0x5a4a7a : blink ? 0xd8a040 : 0x7a55d0, blink ? 0xffe08a : 0xc9b0ff, 0x3a2470, 0, 0);
    const set = (t, s) => { if (t.text !== s) t.setText(s); };
    set(this.hpT, String(Math.ceil(player.life))); set(this.defT, P.shield ? '+' + Math.ceil(player.shield) : '');
    const n = player.closeN || 0; set(this.gdT, !RUN || this.winId ? '' : n > 0 ? `贴 −${Math.round(Math.min(P.closeCap, n * P.closePer))}%` : player.farOK && P.farDR > 0 ? `远 −${P.farDR}%` : '');
    set(this.soulT, Math.round(sf * 100) + '%'); set(this.burnT, !RUN ? '' : lad ? `+${r1(P.soulRegen)}/秒` : `−${r1((SOUL.burn + RUN.base * SOUL.burnPerFloor) * P.burnMul)}/秒`);
    const wi = P.weapons.findIndex(w => w && w.whirl); const sn = wi >= 0 ? player.spin[wi].n : 0; this.spinC.setVisible(sn > 0); if (sn > 0) set(this.spinT, String(sn));
    // 顶栏
    const L = RUN ? RUN.L : S.depth;
    const dl = RUN && RUN.mode === 'ladder' ? `天梯 ${L} 层 · ${mmss(Math.max(0, RUN.limit - RUN.t))}` : RUN && RUN.map ? `墓图 ${RUN.map.tier} 阶` : RUN ? `第 ${L} 层 · ${themeFor(L).n}` : `营地 · 下一趟第 ${descentStart()} 层`;
    if (this.depthT.text !== dl) { this.depthT.setText(dl); const rw = Math.min(W - 4, textW(dl) + 44); this.ribbon.setSize(rw, 22); this.ribbon.x = Math.round(W / 2 - rw / 2); }
    this.bossC.setVisible(!!RUN);
    const b = this.bossG; b.clear();
    if (RUN && RUN.boss && !RUN.boss.dead) {
      const f = RUN.boss.hp / RUN.boss.max, fw = Math.round(184 * f);
      b.fillStyle(0xc23a5a, 1).fillRect(8, 15, fw, 6); b.fillStyle(0xff8aa0, 1).fillRect(8, 15, fw, 1);
      const fat = Math.round((fatigue(RUN.boss) - 1) * 100), t = RUN.bossD.n + (fat > 0 ? `  疲惫 +${fat}%` : ''); if (this.bossT.text !== t) this.bossT.setText(t).setTint(hex('#ff9aa8'));
    } else if (RUN) {
      const f = Math.min(1, RUN.prog / RUN.need), fw = Math.round(184 * f), won = RUN.result === 'win';
      b.fillStyle(won ? 0xffd36a : 0x7a55a0, 1).fillRect(8, 15, fw, 6); b.fillStyle(won ? 0xfff0b0 : 0xa888d0, 1).fillRect(8, 15, fw, 1);
      const t = won ? '完成' : `${Math.floor(RUN.prog + 1e-6)} / ${RUN.need}`; if (this.bossT.text !== t) this.bossT.setText(t).setTint(hex(COL.text));
    }
    const xg = this.xpG; xg.clear(); xg.fillStyle(0x14202c, 1).fillRect(0, 0, W, 3); xg.fillStyle(0x9fd8ff, 1).fillRect(0, 0, Math.round(W * clamp(S.xp / xpNeed(S.level), 0, 1)), 2);
    set(this.lvT, `等级 ${S.level} · 秒伤 ${fmt(P.dps)}`);
    // 按钮
    this.mainBtn.setLabel(S.auto.loop ? '暂停' : RUN ? '继续' : '开始');
    this.retBtn.setDisabled(!RUN || !!RUN.ending); if (!this.retBtn.disabled) this.retBtn.lab.setTint(hex(COL.emberHi));
    this.aiBtn.setLabel(S.auto.ai ? '自动' : '手动'); this.aiBtn.lab.setTint(hex(S.auto.ai ? COL.good : COL.dim));
    this.lockBtn.setLabel(S.auto.lock ? '锁层' : '推层'); this.lockBtn.lab.setTint(hex(S.auto.lock ? COL.emberHi : COL.text));
    // 导航：当前页高亮、角标、未解锁变暗
    const cur = this.winId && MNAV.some(m => m.id === this.winId) ? this.winId : this.winId ? null : 'battle';
    this.navs.forEach(bt => {
      const id = bt.m.id, on = !MENU.some(m => m.id === id) || unlocked(id); let badge = '';
      if (id === 'gear') { const k = S.stash.filter(x => x.isNew).length; badge = k ? String(k) : ''; }
      if (id === 'mods' && S.mods.some(m => m.isNew)) badge = '!';
      if (id === 'tree' && treePoints() > 0) badge = String(treePoints());
      set(bt.badge, on ? badge : ''); bt.hl.setFillStyle(0xffd36a, id === cur && id !== 'battle' ? 0.14 : 0); bt.ic.setAlpha(on ? 1 : 0.3);
    });
    this.updateAuto();
  }
  buildAuto() {
    this.autoT = T(this, W / 2, MBOT - 12, '', { size: 8, color: COL.faint, align: 'center' }).setDepth(12);
    const c = this.add.container(Math.round((W - 220) / 2), MTOP + 6).setDepth(40).setVisible(false); this.sumC = c;
    c.add(nine(this, 0, 0, 220, 44, 'f_win', 8));
    this.sumT = [T(this, 110, 5, '', { align: 'center', parent: c }), T(this, 110, 19, '', { size: 8, color: COL.dim, align: 'center', parent: c }), T(this, 110, 31, '', { size: 8, color: COL.faint, align: 'center', parent: c })];
  }
  toast(msg, color = COL.text) {
    if (!G.fx) return;
    const list0 = this.toastC.list; if (list0.length && list0[list0.length - 1].msg === msg && list0[list0.length - 1].alpha > 0.5) return;
    while (this.toastC.list.length >= 3) this.toastC.list[0].destroy();
    const c = this.add.container(W / 2, MTOP + 4); c.msg = msg; this.toastC.add(c);
    const w = Math.min(W - 8, textW(msg) + 14); c.add(nine(this, -w / 2, 0, w, 19, 'f_tip', 2)); T(this, 0, 4, msg, { color, align: 'center', parent: c });
    this.toastC.list.forEach(o => { if (o !== c) o.y += 22; });
    this.tweens.add({ targets: c, alpha: 0, delay: 1800, duration: 400, onComplete: () => c.destroy() });
  }
  renderFeed() { this.feedC.removeAll(true); this.feeds.forEach((f, i) => { const y = MBOT - 28 - i * 15, c = this.add.container(0, 0); this.feedC.add(c); c.feed = f; if (f.icon && this.textures.exists(f.icon)) { const s = this.textures.get(f.icon).getSourceImage(); img(this, W - 18 + Math.round((14 - s.width) / 2), y + Math.round((14 - s.height) / 2), f.icon, c); } T(this, W - 22, y + 2, f.msg, { size: 8, color: f.color, align: 'right', parent: c }); }); }
  placeTip() { const c = this.tipC; if (!c) return; let x = mouse.x - c.tw / 2, y = mouse.y - c.th - 12; if (y < 2) y = mouse.y + 16; c.setPosition(Math.round(clamp(x, 2, W - 2 - c.tw)), Math.round(clamp(y, 2, H - 2 - c.th))); }
  /* --- 窗口：竖屏原生页（设置、菜单），其余暂时沿用桌面版的内容，宽出屏幕的部分左右拖动查看 --- */
  refresh(anim) {
    hideTip();
    if (this.winC) { this.winC.destroy(); this.winC = null; }
    if (!this.winId) return;
    if (!this.dimR) { this.dimR = rect(this, 0, 0, W, H - NAV_H, COL.ink, 0.88).setDepth(90).setInteractive(); }
    const id = this.winId, native = ['settings', 'more', 'ladder', 'gear', 'mods', 'craft', 'tree', 'summary', 'depart', 'salvage', 'atlas', 'help'].includes(id);
    const [w, h] = native ? [W - 12, H - NAV_H - MTOP - 24] : ({ summary: [372, 176], depart: [300, 134] }[id] || [470, 210]);
    this.panMax = Math.max(0, w - (W - 8)); this.pan = clamp(this.pan, 0, this.panMax);
    const y = native ? MTOP + 8 : Math.round(clamp((H - NAV_H - h) / 2, MTOP + 12, H)), c = this.add.container(this.panMax ? 4 - this.pan : Math.round((W - w) / 2), y).setDepth(100); this.winC = c; c.w = w;
    const skin = { gear: 'f_leather', mods: 'f_leather', craft: 'f_stone', salvage: 'f_stone', depart: 'f_stone' }[id] || 'f_win';
    c.add(this.add.tileSprite(3, 3, w - 6, h - 6, 'n' + skin.slice(1)).setOrigin(0));
    const bg = nine(this, 0, 0, w, h, 'o_frame', 8); c.add(bg); bg.setInteractive();
    this['win_' + id](c, w, h);
    const title = { gear: '装备', mods: '符文', craft: '铁砧', tree: '天赋', atlas: '墓图', ladder: '天梯', help: '手册', summary: '', depart: '地窖入口', salvage: '分解祭坛', settings: '设置', more: '菜单' }[id];
    if (title) { const pw = textW(title) + 44, tx = native ? (w - pw) / 2 : this.pan + (W - 8 - pw) / 2; c.add(this.add.nineslice(Math.round(tx), -10, 'ribbon', null, pw, 22, 14, 14, 0, 0).setOrigin(0)); T(this, Math.round(tx + pw / 2), -5, title, { color: COL.emberHi, align: 'center', parent: c }); }
    if (this.panMax) { // 宽页：底下一条拖动提示 + 两个翻页按钮
      const hy = h + 4; T(this, this.pan + (W - 8) / 2, hy + 3, `竖屏版这一页还在做 · 左右拖动查看（${Math.round(this.pan / this.panMax * 100)}%）`, { size: 8, color: COL.dim, align: 'center', parent: c });
      mkBtn(this, c, this.pan, hy, 26, 16, '<', () => { this.pan = Math.max(0, this.pan - 120); this.refresh(); }, { size: 8, disabled: this.pan <= 0 });
      mkBtn(this, c, this.pan + W - 8 - 26, hy, 26, 16, '>', () => { this.pan = Math.min(this.panMax, this.pan + 120); this.refresh(); }, { size: 8, disabled: this.pan >= this.panMax });
    }
    if (!this.panHook) { // 在窗口上横向拖动 = 平移
      this.panHook = true;
      this.input.on('pointermove', p => { if (!p.isDown || !this.winC || !this.panMax || p.id === this.stickP) return; const dx = (p.x - p.prevPosition.x) / Z; if (!dx) return; this.pan = clamp(this.pan - dx, 0, this.panMax); this.winC.x = 4 - this.pan; this.panDirty = true; });
      this.input.on('pointerup', () => { if (this.panDirty) { this.panDirty = false; this.refresh(); } });
    }
    if (anim) { c.setAlpha(0.6); this.tweens.add({ targets: c, alpha: 1, duration: 90 }); }
  }
  openWin(id, arg) { if (this.winId !== id) this.pan = 0; super.openWin(id, arg); }
  closeWin() { STICK.on = false; this.closePopup(); super.closeWin(); }
  /* 设置：竖屏原生 */
  win_settings(c, w, h) {
    const row = (y, name, sub, val, fn) => { c.add(nine(this, 8, y, w - 16, 36, 'f_slot', 3)); T(this, 16, y + 5, name, { parent: c }); T(this, 16, y + 21, sub, { size: 8, color: COL.dim, parent: c }); if (val != null) mkBtn(this, c, w - 70, y + 7, 54, 22, val, () => { fn(); save(); this.refresh(); }, { style: 'w' }); };
    let y = 20;
    row(y, '移动方式', '浮动摇杆：左下按哪出哪；松手几秒后交还自动', S.auto.ai ? '自动' : '手动', () => { S.auto.ai = !S.auto.ai; if (S.auto.ai) AUTO.manualT = -1e9; }); y += 42;
    row(y, '视野', S.settings.view === 'pano' ? '全景：整条战斗区缩进屏幕，上下留黑边' : '跟随：跟着角色看中间一段，场外敌人看箭头', S.settings.view === 'pano' ? '全景' : '跟随', () => { S.settings.view = S.settings.view === 'pano' ? 'follow' : 'pano'; }); y += 42;
    row(y, '音效', '攻击、拾取、界面音效', S.settings.sound ? '开' : '关', () => { S.settings.sound = !S.settings.sound; ac(); }); y += 42;
    row(y, '特效', '飘字、拾取记录、横幅和震屏', G.fx ? '开' : '关', () => { G.fx = !G.fx; }); y += 42;
    row(y, '推层', S.auto.lock ? `锁定在难度 ${S.depth}` : '打赢就去最深层，连输退一层', S.auto.lock ? '锁层' : '推层', () => { S.auto.lock = !S.auto.lock; if (!S.auto.lock) S.depth = S.maxDepth; }); y += 42;
    c.add(nine(this, 8, y, w - 16, 36, 'f_slot', 3)); T(this, 16, y + 5, `难度 ${S.depth}`, { parent: c }); T(this, 16, y + 21, `最深纪录：第 ${S.maxDepth - 1} 层通关`, { size: 8, color: COL.dim, parent: c });
    mkBtn(this, c, w - 70, y + 7, 26, 22, '<', () => { if (S.depth > 1 && !RUN) { S.depth--; S.auto.lock = true; save(); } this.refresh(); }, { disabled: RUN || S.depth <= 1 });
    mkBtn(this, c, w - 42, y + 7, 26, 22, '>', () => { if (S.depth < S.maxDepth && !RUN) { S.depth++; S.auto.lock = S.depth < S.maxDepth; save(); } this.refresh(); }, { disabled: RUN || S.depth >= S.maxDepth }); y += 50;
    TW(this, 12, y, '只有一个操作：移动。武器自动攻击最近的敌人，没有冲刺和主动技能。', w - 24, { size: 8, color: COL.faint, parent: c });
  }
  equipSlots(c, ox, oy, onClick, selFn) {
    const pos = { core: [32, 0], wl: [0, 32], wr: [64, 32], hub: [0, 64], engine: [32, 64], shield: [64, 64] };
    const ghost = { wl: 'i_w_crossbow', wr: 'i_w_sickle', shield: 'i_a_boneward', core: 'i_a_helm', engine: 'i_a_shadowstep', hub: 'i_a_circle' };
    for (const s of SLOTS) { const it = S.equip[s.id], [x, y] = pos[s.id]; mkCell(this, c, ox + x, oy + y, it, { size: TOUCH, sel: selFn(it, s.id), ghost: ghost[s.id], acts: v => this.itemActs(v) }); }
  }
  /* 装备：竖屏原生（身上 + 属性 → 背包 → 选中物品的详情抽屉） */
  win_gear(c, w, h) {
    selId = null; this.equipSlots(c, 10, 6, null, () => false);
    { const cv = dollCanvas(S.equip, 0); if (this.textures.exists('doll_ui')) this.textures.remove('doll_ui'); this.textures.addCanvas('doll_ui', cv);
      rect(this, 42, 38, 30, 30, '#120c18', 1, c); const im = img(this, 42 + 15 - DOLL_W / 2, 38 + 30 - DOLL_H, 'doll_ui', c); im.setCrop(DOLL_W / 2 - 15, 0, 30, DOLL_H); }
    const P = STATS;
    [['预计秒伤', fmt(P.dps), COL.emberHi], ['生命', fmt(P.life), '#ff8a7a'], ['护盾', `${fmt(P.shield)} +${r1(P.shieldRegen)}/秒`, '#bfe0ff'], ['护甲', `${fmt(P.armor)} 减伤${Math.round(armorDr(P.armor, typicalHit(S.depth)) * 100)}%`], ['闪避', P.dodge + '%'], ['冲刺槽', String(P.dashMax)]]
      .forEach(([a, b, col], i) => { T(this, 112, 8 + i * 11, a, { size: 8, color: COL.dim, parent: c }); T(this, w - 10, 8 + i * 11, b, { size: 8, color: col || COL.text, align: 'right', parent: c }); });
    T(this, 112, 76, '抗性', { size: 8, color: COL.dim, parent: c });
    ELEM.forEach((e, i) => T(this, 134 + i * 20, 76, String(P.res[e]), { size: 8, color: ELEM_C[e], parent: c }));
    T(this, 12, 100, `背包 ${S.stash.length}/${STASH_CAP}`, { size: 8, color: COL.dim, parent: c });
    mkBtn(this, c, w - 150, 92, 50, 26, '整理', () => { sortStash(); this.refresh(); }, { size: 8 });
    mkBtn(this, c, w - 96, 92, 86, 26, '拆解普通', () => this.ask('拆解所有普通物品？', () => { S.stash.filter(x => x.rar === 0).forEach(salvage); save(); this.refresh(); }, '拆解', '白色品质的物品会变成碎片。'), { size: 8, style: 'n' });
    const cols = MCOLS, st = TOUCH, cs = st, x0 = Math.round((w - cols * st) / 2);
    for (let i = 0; i < STASH_CAP; i++) {
      const it = S.stash[i]; const x = x0 + (i % cols) * st, y = 122 + (i / cols | 0) * st;
      mkCell(this, c, x, y, it, { size: cs, sel: it && it.id === selId, upg: true, acts: v => this.itemActs(v) });
    }
    this.gearY = 122 + Math.ceil(STASH_CAP / cols) * st + 4;
    T(this, 12, this.gearY, '点物品看详情，在弹窗里装备 / 拆解 / 进铁砧。绿箭头 = 更好。', { size: 8, color: COL.faint, parent: c });
    this.paneC = this.add.container(0, this.gearY + 14); c.add(this.paneC); this.paneW = w; this.paneH = h - this.gearY - 14;
    this.renderPane();
  }
  renderPane() {
    if (!this.paneC || this.winId !== 'gear') return;
    const p = this.paneC, w = this.paneW; p.removeAll(true);
    const f = selId ? findItem(selId) : null; if (!f) return;
    const it = f.it, bw = Math.floor((w - 28) / 4), B = (i, n, fn, o) => mkBtn(this, p, 10 + i * (bw + 2), 0, bw, 28, n, fn, Object.assign({ size: 8 }, o));
    rect(this, 4, -4, w - 8, this.paneH, '#17111f', 0.97, p); rect(this, 4, -4, w - 8, 1, '#5a4a6a', 1, p);
    if (f.where === 'stash') {
      if (it.kind === 'weapon') { B(0, '装左手', () => { equipItem(it, 'wl'); save(); this.refresh(); }, { style: 'w' }); B(1, '装右手', () => { equipItem(it, 'wr'); save(); this.refresh(); }, { style: 'w', disabled: !unlocked('wr') }); }
      else B(0, '装备', () => { equipItem(it); save(); this.refresh(); }, { style: 'w' });
      B(2, '拆解', () => { if (confirm2('sal' + it.id)) { const g = salvage(it); const n = Object.values(g).reduce((a, b) => a + b, 0); if (n) toast(`得到 ${n} 个词条碎片`, '#d9cfb8'); selId = null; save(); } this.refresh(); }, { style: 'n' });
    } else {
      B(0, '卸下', () => { unequip(f.slot); save(); this.refresh(); });
      if (it.sock || ['core', 'engine', 'hub'].includes(f.slot)) B(1, '符文', () => { modWeapon = f.slot; this.openWin('mods'); });
    }
    B(3, '铁砧', () => { craftId = it.id; craftAff = -1; craftTab = 0; this.openWin('craft'); }, { disabled: !unlocked('craft') });
    mkCard(this, p, 10, 34, it, w - 20, { compare: true });
  }
  /* 符文：竖屏原生（部位页签 → 槽位和武器数据 → 符文库存） */
  win_mods(c, w, h) {
    const host = S.equip[modWeapon], hosts = ['wl', 'wr', 'core', 'engine', 'hub'], bw = Math.floor((w - 20) / 5); this.sockR = [];
    hosts.forEach((s, i) => mkBtn(this, c, 10 + i * bw, 6, bw - 2, 28, SLOTS.find(x => x.id === s).n, () => { modWeapon = s; this.refresh(); }, { size: 8, style: modWeapon === s ? 's' : 'n' }));
    const isHub = modWeapon === 'hub'; let y = 40;
    if (!host) { T(this, 10, y + 4, '这个位置没有装备。', { size: 8, color: COL.faint, parent: c }); y += 20; }
    else {
      mkCell(this, c, 10, y, host, { size: TOUCH });
      T(this, 46, y, itemName(host), { color: icol(host), parent: c });
      TW(this, 46, y + 14, '标签：' + itemTags(host).filter(t => TAG_N[t] && t !== 'Weapon').map(t => TAG_N[t]).join(' '), w - 56, { size: 8, color: COL.dim, parent: c });
      y += 38; T(this, 10, y, isHub ? '升级槽：符文在这里随击杀成长' : `符文槽 ${host.sock}`, { size: 8, color: COL.faint, parent: c }); y += 12;
      if (!host.sock) { T(this, 10, y, '这件装备没有符文槽。', { size: 8, color: COL.faint, parent: c }); y += 14; }
      for (let i = 0; i < host.sock; i++) {
        const m = host.mods[i], x = 10 + i * 34;
        if (isHub) rect(this, x - 2, y - 2, 34, 34, '#c08a1c', 1, c);
        (this.sockR ||= [])[i] = { x, y, s: 30 };
        mkCell(this, c, x, y, m, { size: 30, host, direct: feedOn, actL: '取下', onHover: v => { if (v) showTip(modTip(v, host)); }, onOut: hideTip, onClick: v => { if (this.drag && this.drag.moved) return; if (v && feedOn && feedSrc && feedSrc !== v) return this.doFeed(v); if (v) { host.mods[i] = null; S.mods.unshift(v); refreshStats(); save(); this.refresh(); } } });
      }
      if (host.sock) y += 38;
      const Wi = modWeapon === 'wl' ? STATS.weapons[0] : modWeapon === 'wr' ? STATS.weapons[1] : modWeapon === 'engine' ? STATS.engine : null;
      if (Wi) [Wi.form === 'engine' ? `冲刺伤害 ${fmt(Wi.avg)}` : `秒伤 ${fmt(Wi.dps)} · 每秒 ${r1(Wi.aps)} 次 · 暴击 ${pct(Math.min(1, Wi.crit))} ×${Wi.critMult.toFixed(2)}`,
        ELEM.filter(e => Wi.max[e] > 0).map(e => `${ELEM_N[e]} ${fmt(Wi.min[e])}–${fmt(Wi.max[e])}`).join('  '),
        [Wi.pierce && '无限穿透', Wi.chain && `${Wi.form === 'proj' ? '弹射' : '连锁'} ${Wi.chain}`, Wi.split && `分裂 ${Wi.split}`, Wi.ret && '回旋', Wi.extra && `额外攻击 ${Wi.extra}`].filter(Boolean).join('  ') || '没有弹道加成',
        '异常：' + (ELEM.filter(e => Wi.ail[e] > 0).map(e => `${AIL[e].n} ${pct(Math.min(1, Wi.ail[e]))}`).join('  ') || '无')]
        .forEach(s => { const r = TW(this, 10, y, s, w - 20, { size: 8, color: COL.text, parent: c }); y += r.h + 1; });
    }
    y += 4; rect(this, 10, y, w - 20, 1, '#33293f', 1, c); y += 6;
    T(this, 10, y, `符文 ${S.mods.length}`, { size: 8, color: COL.dim, parent: c });
    mkBtn(this, c, w - 90, y - 8, 80, 26, feedOn ? '喂养：开' : '喂养：关', () => { feedOn = !feedOn; feedSrc = null; this.refresh(); }, { size: 8, style: feedOn ? 's' : 'n', disabled: !unlocked('feed') });
    y += 20; const cols = MCOLS, st = TOUCH, x0 = Math.round((w - cols * st) / 2), rows = Math.max(1, Math.floor((h - y - 40) / st));
    S.mods.slice(0, cols * rows).forEach((m, i) => {
      const x = x0 + (i % cols) * st, yy = y + (i / cols | 0) * st;
      if (feedOn && feedSrc === m) rect(this, x - 1, yy - 1, st, st, COL.ember, 1, c);
      mkCell(this, c, x, yy, m, { size: st, host, direct: feedOn, actL: '镶嵌', onHover: v => showTip(modTip(v, host)), onOut: hideTip, onDown: (v, p) => { if (!feedOn) this.drag = { m: v, x: p.worldX, y: p.worldY, moved: false }; }, onClick: v => {
        if (this.drag && this.drag.moved) return; m.isNew = false;
        if (feedOn) { if (!feedSrc || feedSrc === v) { feedSrc = feedSrc === v ? null : v; return this.refresh(); } return this.doFeed(v); }
        if (!host) return toast('这个位置没有装备');
        const k = host.mods.indexOf(null); if (k < 0) return toast(host.sock ? '槽满了，先点上面的符文取下' : '这件装备没有符文槽');
        host.mods[k] = v; S.mods = S.mods.filter(x => x !== v); refreshStats(); save(); this.refresh();
      } });
    });
    y += Math.max(1, Math.ceil(Math.min(S.mods.length, cols * rows) / cols)) * st + 4;
    TW(this, 10, y, feedOn ? (feedSrc ? `已选 ${MOD_BY[feedSrc.mid].n} 当饲料，再点要喂的符文。` : `先点一个符文当饲料：被喂的获得它经验的 ${Math.round(DATA.runes.feed.mul * 100)}%。`) : '点符文看详情并镶嵌，也可以直接拖进槽；点槽里的符文可取下。红色等级表示在这里不生效。', w - 20, { size: 8, color: feedOn ? COL.emberHi : COL.faint, parent: c });
  }
  /* 铁砧：竖屏原生（物品格 → 词条卡 → 操作 → 加词条） */
  win_craft(c, w, h) {
    [['铁砧', true], ['熔铸', unlocked('fuse')]].forEach(([n, ok], i) => mkBtn(this, c, 10 + i * 52, 4, 48, 28, n, () => { craftTab = i; this.refresh(); }, { size: 8, style: craftTab === i ? 's' : 'n', disabled: !ok }));
    if (craftTab === 1 && unlocked('fuse')) return this.fusePaneM(c, w, h);
    const all = [...SLOTS.map(s => S.equip[s.id]).filter(Boolean), ...S.stash];
    let it = all.find(x => x.id === craftId); if (!it) { it = all.find(craftable) || all[0]; craftId = it && it.id; craftAff = -1; }
    GLYPHS.forEach((g, i) => T(this, 118 + i * 23, 14, `${g.n.slice(0, 1)}${glyphN(g.id)}`, { size: 8, color: glyphN(g.id) ? g.c : COL.faint, parent: c }));
    const cols = MCOLS - 1, st = TOUCH, per0 = cols * 2, pg = Math.max(1, Math.ceil(all.length / per0)); this.cPage = clamp(this.cPage || 0, 0, pg - 1);
    if (this.cPage * per0 > all.indexOf(it) || all.indexOf(it) >= (this.cPage + 1) * per0) { if (this.cPageFor !== it) this.cPage = Math.max(0, Math.floor(all.indexOf(it) / per0)); } this.cPageFor = it;
    all.slice(this.cPage * per0, this.cPage * per0 + per0).forEach((x, i) => mkCell(this, c, 9 + (i % cols) * st, 36 + (i / cols | 0) * st, x, { size: st, sel: x === it, direct: true, onClick: v => { craftId = v.id; craftAff = -1; craftLog = []; addPage = 0; this.refresh(); } }));
    mkBtn(this, c, w - 31, 36, 22, 28, '<', () => { this.cPage = (this.cPage + pg - 1) % pg; this.cPageFor = null; this.refresh(); }, { size: 8, disabled: pg < 2 }); mkBtn(this, c, w - 31, 66, 22, 28, '>', () => { this.cPage = (this.cPage + 1) % pg; this.cPageFor = null; this.refresh(); }, { size: 8, disabled: pg < 2 });
    let y = 36 + 2 * st + 6;
    if (craftLog[0]) { const r = TW(this, 10, y, craftLog[0], w - 20, { size: 8, color: COL.good, parent: c }); y += r.h + 4; }
    if (!it) return T(this, 10, y, '没有可锻造的装备。', { size: 8, color: COL.faint, parent: c });
    if (craftAff >= it.affs.length) craftAff = -1;
    const card = mkCard(this, c, 10, y, it, w - 20, { pick: craftable(it) ? i => { craftAff = craftAff === i ? -1 : i; this.refresh(); } : null, selAff: craftAff });
    y += card.h + 6;
    const done = msg => { craftLog.unshift(msg); sfx('craft'); refreshStats(); save(); this.refresh(); }, adv = unlocked('craftAdv');
    if (useHope && !glyphN('hope')) useHope = false; if (useChaos && !glyphN('chaos')) useChaos = false;
    const bw = Math.floor((w - 24) / 3), B = (i, row, n, fn, o) => mkBtn(this, c, 10 + i * (bw + 2), y + row * 30, bw, 28, n, fn, Object.assign({ size: 8 }, o));
    const sel = it.affs[craftAff], uw = upWhy(it, craftAff);
    mkBtn(this, c, 10, y, w - 20, 28, sel ? `升一档 · 碎片 ${shardN(sel.k)}` : '升一档（先点一条词条）', () => done(craftUp(it, craftAff, useHope, useChaos)), { size: 8, style: 'w', disabled: !!uw });
    y += 30;
    const rw = adv ? refineWhy(it, craftAff) : unlockText('craftAdv'), sw = adv ? stripWhy(it) : unlockText('craftAdv'), ow = oathWhy(it);
    B(0, 0, '洗数值', () => done(craftRefine(it, craftAff)), { disabled: !!rw });
    B(1, 0, '移除', () => done(craftStrip(it)), { disabled: !!sw });
    B(2, 0, `立誓 ×${glyphN('oath')}`, () => done(craftOath(it)), { disabled: !!ow });
    B(0, 1, useHope ? '带希望符' : '不带希望', () => { useHope = !useHope; this.refresh(); }, { style: useHope ? 's' : 'n', disabled: !glyphN('hope') });
    B(1, 1, useChaos ? '带混沌符' : '不带混沌', () => { useChaos = !useChaos; this.refresh(); }, { style: useChaos ? 's' : 'n', disabled: !glyphN('chaos') });
    B(2, 1, '拆解', () => this.ask(`拆解 ${itemName(it)}？`, '拆解', '会变成词条碎片，不能撤销。', () => { const g = salvage(it); const n = Object.values(g).reduce((a, b) => a + b, 0); craftId = null; done(`拆解 ${itemName(it)}，得到 ${n} 个词条碎片`); }), { style: 'n' });
    y += 62;
    const opts = craftable(it) ? AFF.filter(a => shardN(a.k) > 0 && canAdd(it, a)) : [];
    const per = Math.max(1, Math.floor((h - y - 16) / 30)), pages = Math.max(1, Math.ceil(opts.length / per)); addPage = Math.min(addPage, pages - 1);
    T(this, 10, y + 2, `加词条（${opts.length} 种可加）`, { size: 8, color: COL.dim, parent: c });
    if (pages > 1) { mkBtn(this, c, w - 70, y - 6, 28, 24, '<', () => { addPage = (addPage + pages - 1) % pages; this.refresh(); }, { size: 8 }); mkBtn(this, c, w - 38, y - 6, 28, 24, '>', () => { addPage = (addPage + 1) % pages; this.refresh(); }, { size: 8 }); }
    y += 16; const aw = anvilWhy(it);
    if (!opts.length) TW(this, 10, y, aw || (it.affs.length >= AFF_MAX ? `已经有 ${AFF_MAX} 条词条` : '没有能加到这件装备上的碎片。'), w - 20, { size: 8, color: COL.faint, parent: c });
    opts.slice(addPage * per, addPage * per + per).forEach((a, i) => mkBtn(this, c, 10, y + i * 30, w - 20, 28, `${a.type === 'P' ? '前' : '后'} ${affName(a)} ×${shardN(a.k)}`, () => done(craftAdd(it, a.k, useHope)), { size: 8, labelX: 4, disabled: !!addWhy(it, a.k) }));
  }
  fusePaneM(c, w, h) {
    const items = [...SLOTS.map(s => S.equip[s.id]).filter(Boolean), ...S.stash], us = items.filter(x => x.u && !x.leg);
    let u = us.find(x => x.id === craftId) || us[0]; craftId = u && u.id;
    const cols = MCOLS, st = TOUCH; let y = 38;
    T(this, 10, y, `独特装备 ${us.length}`, { size: 8, color: COL.dim, parent: c }); y += 12;
    us.slice(0, cols * 2).forEach((x, i) => mkCell(this, c, 9 + (i % cols) * st, y + (i / cols | 0) * st, x, { size: st, sel: x === u, direct: true, onClick: v => { craftId = v.id; fuseId = null; this.refresh(); } }));
    y += Math.max(1, Math.ceil(Math.min(us.length, cols * 2) / cols)) * st + 6;
    if (!u) return TW(this, 10, y, '没有可以熔铸的独特装备。独特装备保留固定词条，再从同部位稀有装备转移词条。', w - 20, { size: 8, color: COL.faint, parent: c });
    const rs = items.filter(x => x.kind === u.kind && x.rar === 2 && !x.u), r = rs.find(x => x.id === fuseId) || null, why = fuseWhy(u, r);
    mkBtn(this, c, 10, y, w - 20, 28, '熔铸', () => this.ask('熔铸这两件装备？', '熔铸', '材料装备会被消耗。', () => { craftLog.unshift(craftFuse(u, r)); fuseId = null; sfx('craft'); save(); this.refresh(); }), { style: 'w', size: 8, disabled: !!why });
    y += 34; T(this, 10, y, `同部位的稀有装备 ${rs.length}`, { size: 8, color: COL.dim, parent: c }); y += 12;
    rs.slice(0, cols * 2).forEach((x, i) => mkCell(this, c, 9 + (i % cols) * st, y + (i / cols | 0) * st, x, { size: st, sel: x === r, direct: true, onClick: v => { fuseId = v.id; this.refresh(); } }));
    y += Math.max(1, Math.ceil(Math.min(rs.length, cols * 2) / cols)) * st + 6;
    mkCard(this, c, 10, y, u, w - 20);
  }
  /* 天赋：复用星图，窄屏默认收起两侧栏 */
  win_tree(c, w, h) {
    if (!this._treeInit) { this._treeInit = 1; treeUI.left = false; treeUI.right = false; }
    super.win_tree(c, w, h);
  }
  /* 结算：竖屏原生 */
  win_summary(c, w, h) {
    const r = this.winArg; if (!r) return;
    const lad = r.mode === 'ladder', lamp = r.result === 'lampout', back = r.result === 'retreat', emg = r.result === 'emergency', abd = r.result === 'abandon';
    const win = r.result === 'win' || (!lad && (lamp || back || emg || abd)); // 推关：灯火燃尽、撤回、紧急撤回都是平安返回
    const title = abd ? '提前返回' : lad ? (win ? `天梯 ${r.L} 层通过` : r.result === 'timeout' ? '时间到' : '阵亡') : lamp ? '灯火燃尽 · 平安返回' : back ? '险胜 · 撤回' : emg ? '紧急撤回' : win ? '抵达最深处' : '阵亡';
    const g = r.gain;
    const note = lad && win && r.lad.tierUp.length ? [`晋升${LADDER_TIERS[r.lad.tierUp[r.lad.tierUp.length - 1]].n}：送每种铸符各 ${LD.tiers.firstGlyphs} 张`, COL.emberHi]
      : g.boon ? [`${BOSS_BY[g.boon.b].n}的祝福：${BOONS[g.boon.b][g.boon.i].n}（${treeText(...Object.entries(BOONS[g.boon.b][g.boon.i].add)[0])}）`, COL.emberHi]
      : abd ? [lad ? '提前离开天梯：这一层不算通过，没有损失' : '提前返回：东西全部带走，没打完的这一层不算通过', COL.emberHi]
      : emg ? [`护甲跌到 ${SOUL.returnHpNow}% 以下，带着全部东西撤回`, COL.emberHi]
      : back ? [`最后一层最低血量 ${Math.round(r.descent.minHp * 100)}%，打完守关 Boss 撤回，东西全部带走`, COL.emberHi]
      : lad ? [win ? `跳 ${r.lad.jump} 层，已解锁到第 ${S.ladder.unlocked} 层` : '天梯失败没有损失', COL.dim]
      : r.descent.floors ? [`打通到第 ${r.descent.from + r.descent.floors - 1} 层 · 最深纪录第 ${S.maxDepth - 1} 层`, COL.good] : null;
    const floors = lad ? `${r.L}` : r.descent.from === r.base ? `${r.base}` : `${r.descent.from}–${r.base}`;
    const cols = [['i_ladder', floors, r.map ? `墓图 ${r.map.tier} 阶` : '层'], ['skull', String(r.kills), '击杀'], ['torch', mmss(r.t), '用时'], ['i_star', '+' + fmt(g.xp), g.lv ? `升 ${g.lv} 级` : '经验'], ['shard', '+' + (g.shards + (r.salv ? r.salv.shards : 0)), r.salv && r.salv.n ? `分解 ${r.salv.n} 件` : '碎片']];
    const kept = g.items.filter(it => S.stash.includes(it) || Object.values(S.equip).includes(it) || Object.values(S.chips).includes(it));
    const extra = [...g.mods.map(m => ['mod_' + m.mid, '']), ...Object.entries(g.glyphs).map(([k, n]) => ['glyph_' + k, '×' + n]), ...(g.maps.length ? [['i_a_map', '×' + g.maps.length]] : [])];
    const pw = textW(title) + 52; c.add(this.add.nineslice(Math.round((w - pw) / 2), -10, 'ribbon', null, pw, 22, 14, 14, 0, 0).setOrigin(0)); T(this, w / 2, -5, title, { color: win ? COL.emberHi : COL.bad, align: 'center', parent: c });
    let y = 20;
    if (note) { const t = TW(this, 12, y, note[0], w - 24, { size: 8, color: note[1], parent: c }); y += t.h + 8; }
    const cw = Math.floor((w - 24) / 3);
    cols.forEach(([ic, v, l], i) => { const cx = 12 + (i % 3) * cw + cw / 2, yy = y + (i / 3 | 0) * 50, s2 = this.textures.get(ic).getSourceImage();
      c.add(nine(this, 12 + (i % 3) * cw + 2, yy, cw - 4, 46, 'f_slot', 3));
      img(this, Math.round(cx - s2.width / 2), yy + 4, ic, c); T(this, cx, yy + 22, v, { align: 'center', color: i === 3 ? COL.xp : COL.text, parent: c }); T(this, cx, yy + 35, l, { size: 8, color: COL.dim, align: 'center', parent: c }); });
    y += Math.ceil(cols.length / 3) * 50 + 6;
    T(this, 12, y, `带回的装备 ${kept.length}`, { size: 8, color: COL.dim, parent: c }); y += 12;
    const best = [...kept].sort((a, b) => b.rar - a.rar || b.q - a.q).slice(0, MCOLS * 2), st = TOUCH;
    best.forEach((it, i) => mkCell(this, c, 9 + (i % MCOLS) * st, y + (i / MCOLS | 0) * st, it, { size: st, upg: true, acts: v => this.itemActs(v) }));
    if (!best.length) T(this, 12, y, '没有留下装备', { size: 8, color: COL.faint, parent: c });
    y += Math.max(1, Math.ceil(best.length / MCOLS)) * st + 6;
    if (extra.length) { T(this, 12, y, '符文 · 铸符 · 墓图', { size: 8, color: COL.dim, parent: c }); y += 12; let ex = 12;
      for (const [ic, t] of extra) { const s2 = this.textures.get(ic).getSourceImage(), ww = s2.width + 1 + (t ? textW(t, 8) : 0) + 6; if (ex + ww > w - 12) { ex = 12; y += 18; } img(this, ex, y, ic, c); if (t) T(this, ex + s2.width + 1, y + 3, t, { size: 8, parent: c }); ex += ww; }
      y += 22; }
    if (!lad && r.lost) { const t = TW(this, 12, y, `阵亡：捡到的东西每件 ${SOUL.deathKeep}% 几率保住，这次丢了装备 ${r.lost.items} 件、符文 ${r.lost.mods} 个、碎片 ${r.lost.shards} 个。`, w - 24, { size: 8, color: COL.bad, parent: c }); y += t.h; }
    else if (!win) TW(this, 12, y, '失败不会丢掉已经捡起的东西。地上没捡的会消失。', w - 24, { size: 8, color: COL.faint, parent: c });
    const hw = Math.floor((w - 28) / 2);
    mkBtn(this, c, 12, h - 74, hw, 28, '装备', () => { this.closeWin(); this.openWin('gear'); }, { size: 8, icon: 'i_w_crossbow', iconX: 8, labelX: 30 });
    mkBtn(this, c, 16 + hw, h - 74, hw, 28, '铁砧', () => { this.closeWin(); this.openWin('craft'); }, { size: 8, icon: 'i_anvil', iconX: 8, labelX: 30, disabled: !unlocked('craft') });
    mkBtn(this, c, 12, h - 42, w - 24, 30, lad ? '再打天梯' : `再下行 · ${descentStart()} 层`, () => { this.closeWin(); if (lad) ladderChallenge(S.ladder.unlocked); else startRun(); }, { style: 'w', icon: 'torch', iconX: 10, labelX: 30 });
  }
  /* 地窖入口：竖屏原生 */
  win_depart(c, w, h) {
    const m = armedMap(); let y = 18;
    T(this, w / 2, y, `下一趟从第 ${descentStart()} 层出发`, { align: 'center', color: COL.emberHi, parent: c }); y += 18;
    TW(this, 12, y, `最深纪录：第 ${S.maxDepth - 1} 层通关 · ${S.auto.lock ? '锁层：从选定的层出发' : `从最深层往回退 ${SOUL.startBack} 层热身`}`, w - 24, { size: 8, color: COL.dim, parent: c }); y += 28;
    mkBtn(this, c, 12, y, 40, 30, '<', () => { if (S.depth > 1) { S.depth--; S.auto.lock = true; save(); } this.refresh(); }, { disabled: S.depth <= 1 });
    T(this, w / 2, y + 15, `难度 ${S.depth}`, { align: 'center', valign: 'middle', parent: c });
    mkBtn(this, c, w - 52, y, 40, 30, '>', () => { if (S.depth < S.maxDepth) { S.depth++; S.auto.lock = S.depth < S.maxDepth; save(); } this.refresh(); }, { disabled: S.depth >= S.maxDepth }); y += 38;
    mkBtn(this, c, 12, y, w - 24, 30, S.auto.lock ? '锁层：开（点击改为推层）' : '推层：开（点击改为锁层）', () => { S.auto.lock = !S.auto.lock; if (!S.auto.lock) S.depth = S.maxDepth; save(); this.refresh(); }, { size: 8 }); y += 40;
    if (m) TW(this, 12, y, `会用掉墓图台上的${mapName(m)}（怪物等级 +${m.tier}）`, w - 24, { size: 8, color: RCOL[m.rar], parent: c });
    else if (unlocked('ladder')) T(this, 12, y, '天梯从天梯石碑出发（营地面板或导航「天梯」）', { size: 8, color: COL.faint, parent: c });
    mkBtn(this, c, 12, h - 76, w - 24, 30, '出发', () => { this.closeWin(); startRun(); }, { style: 'w', disabled: !!RUN });
    mkBtn(this, c, 12, h - 42, w - 24, 30, S.auto.loop ? '停止自动刷' : '自动刷（一趟接一趟）', () => { this.closeWin(); this.toggleLoop(); }, { size: 8 });
  }
  /* 分解祭坛：竖屏原生 */
  win_salvage(c, w, h) {
    const R = salvRules(), fav = salvFav(), back = S.maxDepth - CAMP.salvageIlvlBack;
    const tog = (x, y, bw, on, label, fn) => { const b = mkBtn(this, c, x, y, bw, 28, label, () => { fn(); save(); this.refresh(); }, { size: 8, labelX: 20 }); rect(this, 6, 10, 9, 9, '#120c18', 1, b); if (on) rect(this, 7, 11, 7, 7, COL.ember, 1, b); };
    let y = 14; T(this, 12, y, '回营地时自动分解带回的装备', { size: 8, color: COL.emberHi, parent: c }); y += 14;
    const hw = Math.floor((w - 28) / 2);
    tog(12, y, hw, R.on, '自动分解', () => { R.on = !R.on; }); tog(16 + hw, y, hw, R.old, `旧装备 <${Math.max(1, back)}`, () => { R.old = !R.old; }); y += 32;
    const tw = Math.floor((w - 28) / 3); ['普通', '罕见', '稀有'].forEach((n, i) => tog(12 + i * (tw + 2), y, tw, R.rar[i], n, () => { R.rar[i] = !R.rar[i]; })); y += 34;
    const t = TW(this, 12, y, '独特、传奇、溢彩装备和印记、符文、墓图永远不会被自动分解；身上穿着的也不会。带收藏词条的装备不按稀有度分解。', w - 24, { size: 8, color: COL.faint, parent: c }); y += t.h + 6;
    const n = S.stash.filter(salvWhy).length;
    mkBtn(this, c, 12, y, w - 24, 30, `现在分解背包（${n} 件）`, () => this.ask(`分解背包里 ${n} 件？`, '分解', '会变成词条碎片，不能撤销。', () => { const g = autoSalvage([...S.stash]); toast(`分解 ${g.n} 件，得到碎片 ${g.shards} 个`, '#d9cfb8'); save(); this.refresh(); }), { size: 8, style: 'w', disabled: !n }); y += 38;
    T(this, 12, y, `收藏词条 ${fav.length} 个${R.fav ? '' : '（默认）'}`, { size: 8, color: COL.emberHi, parent: c });
    if (R.fav) mkBtn(this, c, w - 84, y - 6, 72, 22, '恢复默认', () => { R.fav = null; save(); this.refresh(); }, { size: 8 });
    y += 18;
    const list = AFF.filter(a => !a.tk).sort((a, b) => (fav.includes(b.k) - fav.includes(a.k)) || (affName(a) < affName(b) ? -1 : 1));
    const rows = Math.max(1, Math.floor((h - y - 40) / 24)), per = rows * 2, pages = Math.ceil(list.length / per); this.salvPage = Math.min(this.salvPage || 0, pages - 1);
    list.slice(this.salvPage * per, this.salvPage * per + per).forEach((a, i) => {
      const on = fav.includes(a.k), b = mkBtn(this, c, 12 + (i % 2) * (hw + 4), y + (i / 2 | 0) * 24, hw, 22, affName(a), () => { R.fav = on ? fav.filter(k => k !== a.k) : [...fav, a.k]; save(); this.refresh(); }, { size: 8, labelX: 16, color: on ? COL.emberHi : COL.text });
      rect(this, 5, 7, 8, 8, '#120c18', 1, b); if (on) rect(this, 6, 8, 6, 6, COL.ember, 1, b);
    });
    if (pages > 1) { mkBtn(this, c, 12, h - 36, 50, 28, '<', () => { this.salvPage = (this.salvPage + pages - 1) % pages; this.refresh(); }); T(this, w / 2, h - 22, `${this.salvPage + 1} / ${pages}`, { size: 8, color: COL.dim, align: 'center', valign: 'middle', parent: c }); mkBtn(this, c, w - 62, h - 36, 50, 28, '>', () => { this.salvPage = (this.salvPage + 1) % pages; this.refresh(); }); }
  }
  /* 墓图：竖屏原生（墓图 / 命盘 / 祝福） */
  win_atlas(c, w, h) {
    const bw = Math.floor((w - 24) / 3);
    ['墓图', '命盘', '祝福'].forEach((n, i) => mkBtn(this, c, 12 + i * bw, 8, bw - 2, 26, n + (i === 1 && marblePoints() ? ` ${marblePoints()}` : ''), () => { atlasTab = i; this.refresh(); }, { size: 8, style: atlasTab === i ? 's' : 'n' }));
    this['atlasM_' + atlasTab](c, w, h);
  }
  atlasM_0(c, w, h) {
    const sel = S.maps.find(m => m.id === atlasSel) || null, armed = armedMap(); let y = 42;
    mkCell(this, c, 12, y, armed, { size: 30, sel: armed && armed === sel, ghost: 'i_a_map', direct: true, onClick: m => { if (m) { atlasSel = m.id; this.refresh(); } } });
    TW(this, 46, y + 2, armed ? `墓图台：${mapName(armed)}（下次任务消耗）` : '墓图台空着：按普通难度出发', w - 58, { size: 8, color: armed ? RCOL[armed.rar] : COL.faint, parent: c }); y += 36;
    T(this, 12, y, `墓图 ${S.maps.length}`, { size: 8, color: COL.dim, parent: c }); y += 12;
    const list = [...S.maps].sort((a, b) => b.tier - a.tier || b.rar - a.rar), st = TOUCH;
    for (let i = 0; i < MCOLS * 4; i++) { const m = list[i]; mkCell(this, c, 9 + (i % MCOLS) * st, y + (i / MCOLS | 0) * st, m, { size: st, sel: m && (m.id === atlasSel || m.id === S.mapArmed), direct: true, onClick: m => { if (!m) return; m.isNew = false; atlasSel = m.id; this.refresh(); } }); }
    y += 4 * st + 8; rect(this, 12, y, w - 24, 1, '#33293f', 1, c); y += 8;
    if (!sel) { TW(this, 12, y, '点一张墓图查看。墓图从怪物和 Boss 身上掉落，阶级越高怪越强、掉落越多。', w - 24, { size: 8, color: COL.faint, parent: c }); return; }
    img(this, 12, y, 'i_a_map', c); T(this, 30, y + 1, mapName(sel), { color: RCOL[sel.rar], parent: c }); y += 18;
    for (const l of mapTip(sel).slice(1)) { const t = TW(this, 12, y, l.t, w - 24, { size: 8, color: l.c || '#b8afc4', parent: c }); y += t.h; }
    const on = sel.id === S.mapArmed, hw = Math.floor((w - 28) / 2);
    mkBtn(this, c, 12, h - 40, hw, 28, on ? '从墓图台取下' : '放上墓图台', () => { S.mapArmed = on ? null : sel.id; sel.isNew = false; save(); this.refresh(); }, { size: 8, style: on ? 'n' : 'w' });
    mkBtn(this, c, 16 + hw, h - 40, hw, 28, '丢弃', () => this.ask('丢弃这张墓图？', () => { S.maps = S.maps.filter(m => m !== sel); if (S.mapArmed === sel.id) S.mapArmed = null; save(); this.refresh(); }, '丢弃', '不能撤销。'), { size: 8, style: 'n' });
  }
  atlasM_1(c, w, h) {
    const pts = marblePoints(); let y = 42;
    T(this, 12, y, `命盘点 ${pts}`, { color: pts ? COL.emberHi : COL.dim, parent: c });
    mkBtn(this, c, w - 84, y - 4, 72, 24, '全部重置', () => { if (!S.marble.length) return; this.ask('重置全部弹珠石盘？', () => { S.marble = []; save(); this.refresh(); }, '重置'); }, { size: 8, style: 'n' }); y += 22;
    const t = TW(this, 12, y, '每解锁一层难度、每完成两张墓图得 1 点。只能点亮上方相邻钉子已点亮的钉子。长按钉子看效果。', w - 24, { size: 8, color: COL.faint, parent: c }); y += t.h + 10;
    const g = this.add.graphics(); c.add(g);
    const cx = Math.round(w / 2), top = y + 6, dx = 26, dy = 24, P = nd => [cx + (nd.c - nd.r / 2) * dx, top + nd.r * dy];
    let maxY = top;
    for (const id in MARBLE.nodes) { const nd = MARBLE.nodes[id]; const [x, y1] = P(nd); maxY = Math.max(maxY, y1); for (const d of nd.down) { const [x2, y2] = P(MARBLE.nodes[d]); const lit = marbleOn(id) && marbleOn(d); g.lineStyle(1, hex(lit ? COL.emberHi : marbleOn(id) || marbleOn(d) ? '#6a5a7e' : '#33293f'), 1).lineBetween(x, y1, x2, y2); } }
    for (const id in MARBLE.nodes) {
      const nd = MARBLE.nodes[id]; const [x, y1] = P(nd); const got = marbleOn(id), can = marbleCanAlloc(id);
      const r = nd.kind === 'k' ? 6 : nd.kind === 'n' ? 5 : nd.kind === 'start' ? 6 : 4, col = nd.kind === 'k' ? COL.emberHi : nd.kind === 'n' ? COL.cyan : '#e9d9a8';
      g.fillStyle(0x120c18, 1).fillCircle(x, y1, r + 1); g.fillStyle(hex(got ? col : can ? '#4b3e60' : '#231b2e'), 1).fillCircle(x, y1, r);
      if (can) g.lineStyle(1, hex(COL.emberHi), 0.8).strokeCircle(x, y1, r + 2);
      const z = this.add.zone(x - 12, y1 - 11, 24, 22).setOrigin(0).setInteractive(); c.add(z);
      const lines = [{ t: nd.kind === 'start' ? '弹珠起点' : nd.n || (nd.kind === 'n' ? '召唤' : '钉子'), c: col }, ...marbleLines(nd).map(t => ({ t, s: 8 }))];
      z.on('pointerup', () => { sfx('click'); const R = () => { save(); this.refresh(); };
        this.showLines(lines, can ? [{ l: '点亮', style: 'w', fn: () => { S.marble.push(id); sfx('craft'); R(); } }] : S.marble.includes(id) && marbleCanRefund(id) ? [{ l: '退还', fn: () => { S.marble = S.marble.filter(x => x !== id); R(); } }] : []); });
    }
    g.fillStyle(0xdfe6ee, 1).fillCircle(cx, top - 12, 3);
    y = maxY + 16; const L = lootFx(null);
    const rows = Object.keys(MARBLE_TEXT).filter(k => !k.startsWith('call:') && L[k]).map(k => MARBLE_TEXT[k](L[k])).concat(Object.entries(L.call).map(([k, v]) => MARBLE_TEXT['call:' + k](v)));
    for (const s of rows) { if (y > h - 14) break; T(this, 12, y, s, { size: 8, color: '#e9d9a8', parent: c }); y += 10; }
  }
  atlasM_2(c, w, h) {
    let y = 42; const t = TW(this, 12, y, '四个 Boss 按任务等级轮流出现。每个 Boss 击败 1、5、15 次后，各得到一种永久祝福。', w - 24, { size: 8, color: COL.faint, parent: c }); y += t.h + 6;
    BOSSES.forEach(B => {
      const k = S.bossKills[B.id] || 0; rect(this, 12, y, w - 24, 92, '#1a1422', 1, c);
      img(this, 14, y + 2, 'm_boss_' + B.id + '_0', c).setScale(0.75);
      T(this, 40, y + 4, B.n, { size: 8, color: ELEM_C[B.el], parent: c }); T(this, w - 18, y + 4, `击败 ${k} 次`, { size: 8, color: COL.dim, align: 'right', parent: c });
      BOONS[B.id].forEach((bn, j) => { const got = boonGot(B.id, j), by = y + 22 + j * 23;
        rect(this, 40, by, w - 58, 21, got ? '#3a2a12' : '#231b2e', 1, c);
        T(this, 44, by + 1, `${bn.n}${got ? '' : `（${BOON_AT[j]} 次）`}`, { size: 8, color: got ? COL.emberHi : COL.faint, parent: c });
        T(this, 44, by + 11, Object.entries(bn.add).map(([kk, v]) => treeText(kk, v)).join('，'), { size: 8, color: got ? '#e9d9a8' : '#5d5170', parent: c }); });
      y += 96;
    });
  }
  /* 手册：竖屏原生 */
  win_help(c, w, h) {
    const pages = helpPages(); pages[0] = ['操作', '手机上只有一个操作：移动。在屏幕左下按住拖动出现浮动摇杆，松手几秒后交还自动。两只手上的武器会自动攻击射程内最近的敌人；没有冲刺按钮和主动技能。底部导航打开装备、天赋、铁砧、符文、天梯、设置；中间「战斗」回到战场。长按物品或词条看详情。每升一级得 1 个天赋点。'];
    const bw = Math.floor((w - 24) / 4);
    pages.forEach(([n], i) => mkBtn(this, c, 12 + (i % 4) * bw, 8 + (i / 4 | 0) * 30, bw - 2, 28, n, () => { helpTopic = i; this.refresh(); }, { size: 8, style: helpTopic === i ? 's' : 'n' }));
    let y = 8 + Math.ceil(pages.length / 4) * 30 + 6; const [n, txt] = pages[helpTopic];
    T(this, 12, y, n, { color: COL.emberHi, parent: c }); y += 18;
    const t = TW(this, 12, y, txt, w - 24, { size: 12, color: COL.text, parent: c }); y += t.h + 8;
    if (n === '存档') {
      const D = [['demo', 'whirl', '旋风斩'], ['demoSpark', 'spark', '游雷'], ['demoNova', 'nova', '霜环'], ['demoShield', 'shield', '圣盾掷'], ['demoOrb', 'orb', '寒魄球'], ['demoMeteor', 'meteor', '陨火']], hw = Math.floor((w - 28) / 2);
      D.forEach(([ck, id, nm], i) => mkBtn(this, c, 12 + (i % 2) * (hw + 4), y + (i / 2 | 0) * 32, hw, 28, `载入${nm}存档`, () => this.ask(`载入${nm}存档？`, '载入', '当前进度会先备份，之后可以恢复。', () => { loadDemo(id); toast(`已载入${nm}毕业存档`, COL.emberHi); }), { size: 8, style: 'w' }));
      y += 3 * 32; mkBtn(this, c, 12, y, w - 24, 28, '恢复之前的进度', () => this.ask('恢复之前的进度？', '恢复', '当前进度会被覆盖。', () => { restoreBackup(); toast('已恢复之前的进度', COL.emberHi); }), { size: 8, style: 'n', disabled: !hasBackup() });
    }
    T(this, w / 2, h - 14, '系统与数值参考 Astroloot 复刻；画面、名字和文字为原创。', { size: 8, color: COL.faint, align: 'center', parent: c });
  }
  /* 天梯：竖屏原生（段位 → 选层和挑战 → 各元素最好 → 最近记录） */
  win_ladder(c, w, h) {
    const L = S.ladder, ti = ladderTier(L.best), tier = LADDER_TIERS[ti], nx = LADDER_TIERS[ti + 1];
    ladPick = clamp(ladPick, 1, L.unlocked);
    T(this, 12, 16, tier ? tier.n : '未定段位', { color: tier ? tier.c : COL.dim, scale: 2, parent: c });
    T(this, w - 12, 18, nx ? `下一段位 ${nx.n}：${nx.at} 层` : '已是最高段位', { size: 8, color: COL.dim, align: 'right', parent: c });
    T(this, w - 12, 30, L.best ? `最高 ${L.best} 层 · ${mmss(L.bestTime)}` : '还没有通过任何一层', { size: 8, align: 'right', parent: c });
    T(this, 12, 46, `已解锁到第 ${L.unlocked} 层`, { size: 8, color: COL.good, parent: c });
    let y = 60;
    mkBtn(this, c, 12, y, 30, 24, '<', () => { ladPick = Math.max(1, ladPick - 1); this.refresh(); }, { disabled: ladPick <= 1 });
    T(this, 82, y + 12, `第 ${ladPick} 层`, { align: 'center', valign: 'middle', color: COL.emberHi, parent: c });
    mkBtn(this, c, 122, y, 30, 24, '>', () => { ladPick = Math.min(L.unlocked, ladPick + 1); this.refresh(); }, { disabled: ladPick >= L.unlocked });
    mkBtn(this, c, 158, y, 50, 24, '最高', () => { ladPick = L.unlocked; this.refresh(); }, { size: 8, disabled: ladPick >= L.unlocked });
    mkBtn(this, c, 212, y, w - 224, 24, L.chain ? '连打开' : '连打关', () => { L.chain = !L.chain; save(); this.refresh(); }, { size: 8, style: L.chain ? 's' : 'n' });
    y += 30; const busy = ladderBusy(), queued = LAD.pending;
    mkBtn(this, c, 12, y, w - 24, 28, busy ? '进行中' : queued ? '已排队（这局打完后开始）' : RUN ? '挑战（这局打完后开始）' : '挑战', () => { ladderChallenge(ladPick); this.refresh(); }, { style: 'w', disabled: !!(busy || queued) });
    y += 36; const R = LD.run, J = LD.jumps.list;
    const d = TW(this, 12, y, `怪物等级 = 层数。攒满 ${ladderNeed(ladPick)} 点出守关 Boss，限时 ${mmss(R.timeLimit)}；剩 ${J[0][0]} 秒以上跳 ${J[0][1]} 层，${J[1][0]} 秒以上跳 ${J[1][1]} 层。墓图和命盘不生效。`, w - 24, { size: 8, color: COL.dim, parent: c });
    y += d.h + 8; rect(this, 12, y, w - 24, 1, '#33293f', 1, c); y += 6;
    T(this, 12, y, '各元素最好', { size: 8, color: COL.emberHi, parent: c }); y += 12;
    const be = ladderBestByElem(), cw = Math.floor((w - 24) / 2);
    ELEM.forEach((e, i) => { const r = be[e], x = 12 + (i % 2) * cw, yy = y + (i / 2 | 0) * 12; T(this, x, yy, ELEM_N[e], { size: 8, color: ELEM_C[e], parent: c }); T(this, x + 30, yy, r ? `${r.lvl} 层 ${mmss(r.time)}` : '—', { size: 8, color: r ? COL.text : COL.faint, parent: c }); });
    y += Math.ceil(ELEM.length / 2) * 12 + 6; rect(this, 12, y, w - 24, 1, '#33293f', 1, c); y += 6;
    T(this, 12, y, `最近记录（共 ${L.records.length} 条）`, { size: 8, color: COL.emberHi, parent: c }); y += 12;
    if (!L.records.length) T(this, 12, y, '通过一层后会记下用时和当时的配装', { size: 8, color: COL.faint, parent: c });
    const nm = q => q.u ? UNIQUE_BY[q.u].n : baseOf({ kind: q.slot === 'wl' || q.slot === 'wr' ? 'weapon' : q.slot, b: q.b }).n;
    L.records.slice(0, Math.max(0, Math.floor((h - y - 6) / 11))).forEach((r, i) => {
      const wp = r.build.equip.find(q => q.slot === 'wl') || r.build.equip[0], tc = LADDER_TIERS[ladderTier(r.lvl)];
      T(this, 12, y + i * 11, `${r.lvl} 层 · ${mmss(r.time)} · +${r.jump}`, { size: 8, color: tc ? tc.c : COL.text, parent: c });
      T(this, w - 12, y + i * 11, `${r.date.slice(5, 10)} ${ELEM_N[r.build.elem]} ${wp ? nm(wp) : ''}`, { size: 8, color: COL.faint, align: 'right', parent: c });
    });
  }
  /* 菜单：底部导航放不下的页面 */
  win_more(c, w, h) {
    const items = [['atlas', '墓图', 'i_a_map'], ['help', '手册', 'i_book'], ['salvage', '分解祭坛', 'shard'], ['depart', '地窖入口 · 选层', 'torch']];
    items.forEach(([id, n, ic], i) => {
      const y = 20 + i * 40, open = !MENU.some(m => m.id === id) || unlocked(id);
      mkBtn(this, c, 12, y, w - 24, 32, n, () => { if (!open) { toast(`${n}：${unlockText(id)}`); return; } this.openWin(id); }, { icon: ic, iconX: 10, labelX: 34, disabled: !open || (RUN && id === 'depart') });
    });
    T(this, w / 2, 20 + items.length * 40 + 6, RUN ? '任务进行中 · 装备、天赋等修改立即生效' : '营地', { size: 8, color: COL.dim, align: 'center', parent: c });
  }
  /* 营地：战场上方一块设施面板（营地的设施在 480 宽的场景里，竖屏看不全，入口集中放这里） */
  buildCamp() { this.campC = this.add.container(0, MTOP + 4).setDepth(20); this.facs = []; this.campKey = ''; }
  updateCamp() {
    if (!this.campC) this.buildCamp();
    const show = !RUN && !this.winId; this.campC.setVisible(show); if (!show) return;
    const F = [['depart', '地窖入口', 'torch'], ['atlas', '墓图台', 'i_a_map'], ['ladder', '天梯石碑', 'i_ladder'], ['salvage', '分解祭坛', 'shard'], ['gear', '储物箱', 'i_w_crossbow'], ['help', '手册', 'i_book']];
    const ok = id => !MENU.some(m => m.id === id) || unlocked(id), key = F.map(f => +ok(f[0])).join('') + descentStart();
    if (key === this.campKey) return; this.campKey = key;
    const c = this.campC; c.removeAll(true); const bw = Math.floor((W - 16) / 3);
    c.add(nine(this, 4, 0, W - 8, 92, 'f_win', 6));
    T(this, W / 2, 5, `营地 · 下一趟第 ${descentStart()} 层`, { size: 8, color: COL.emberHi, align: 'center', parent: c });
    F.forEach(([id, n, ic], i) => mkBtn(this, c, 8 + (i % 3) * bw, 18 + (i / 3 | 0) * 34, bw - 2, 30, n, () => { if (!ok(id)) return toast(`${n}：${unlockText(id)}`); this.openWin(id); }, { size: 8, icon: ic, iconX: 3, labelX: 21, disabled: !ok(id) }));
  }
  /* --- 触屏细节：双指缩放天赋图、符文拖进槽、长按看详情 --- */
  buildTouch() {
    this.input.addPointer(1);
    this.input.on('pointermove', p => {
      const a = this.input.pointer1, b = this.input.pointer2;
      if (this.winId === 'tree' && a.isDown && b.isDown && this.treeZoom) { const d = Math.hypot(a.x - b.x, a.y - b.y); if (this.pinchD) this.treeZoom(d / this.pinchD); this.pinchD = d; return; }
      this.pinchD = 0;
      const D = this.drag; if (!D || !p.isDown) return;
      if (!D.moved && Math.hypot(p.worldX - D.x, p.worldY - D.y) > 8) { D.moved = true; hideTip(); D.img = img(this, 0, 0, 'mod_' + D.m.mid).setDepth(260).setScale(1.5); }
      if (D.moved) D.img.setPosition(Math.round(p.worldX - 12), Math.round(p.worldY - 20));
    });
    this.input.on('pointerup', p => {
      this.pinchD = 0; const D = this.drag; this.drag = null; if (!D) return;
      if (D.img) D.img.destroy(); if (!D.moved || this.winId !== 'mods' || !this.winC) return;
      const host = S.equip[modWeapon], lx = p.worldX - this.winC.x, ly = p.worldY - this.winC.y;
      const k = (this.sockR || []).findIndex(r => lx >= r.x - 4 && lx <= r.x + r.s + 4 && ly >= r.y - 4 && ly <= r.y + r.s + 4);
      if (!host || k < 0 || !S.mods.includes(D.m)) return;
      const old = host.mods[k]; host.mods[k] = D.m; S.mods = S.mods.filter(x => x !== D.m); if (old) S.mods.unshift(old);
      D.m.isNew = false; sfx('craft'); refreshStats(); save(); this.refresh();
    });
  }
  // 长按弹出的详情卡；点任意处关闭
  popup(build, acts = [], closeL = '关闭') {
    this.closePopup(); hideTip();
    const c = this.add.container(0, 0).setDepth(250); this.popC = c;
    const dim = rect(this, 0, 0, W, H, COL.ink, 0.6, c).setInteractive(); dim.on('pointerup', () => this.closePopup());
    const pw = W - 24, in_ = this.add.container(12 + 8, 0); const hh = build(in_, pw - 16);
    const ph = Math.min(H - 40, hh + 50), py = Math.round(Math.max(20, (H - NAV_H - ph) / 2));
    const bg = nine(this, 12, py, pw, ph, 'o_frame', 8).setInteractive(); c.add(this.add.tileSprite(15, py + 3, pw - 6, ph - 6, 'n_win').setOrigin(0)); c.add(bg);
    in_.y = py + 10; c.add(in_);
    const all = [...acts, { l: closeL }], n = all.length, bw = Math.floor((pw - 16 - (n - 1) * 4) / n);
    all.forEach((a, i) => mkBtn(this, c, 20 + i * (bw + 4), py + ph - 38, bw, 30, a.l, () => { this.closePopup(); if (a.fn) a.fn(); }, { size: 8, style: a.style || 'n', disabled: !!a.disabled }));
  }
  // 手机确认弹窗：确认 / 取消（点外面也算取消）
  ask(title, fn, ok = '确认', body = '') { this.showLines([{ t: title, c: COL.emberHi }, body && { t: body, s: 8, c: COL.dim }], [{ l: ok, fn, style: 'r' }], '取消'); }
  // 物品详情弹窗里的操作
  itemActs(it) {
    const f = findItem(it.id), A = [], R = () => { save(); this.refresh(); }; it.isNew = false; if (!f) return A;
    if (f.where === 'stash') {
      if (it.kind === 'weapon') { A.push({ l: '装左手', style: 'w', fn: () => { equipItem(it, 'wl'); R(); } }); if (unlocked('wr')) A.push({ l: '装右手', style: 'w', fn: () => { equipItem(it, 'wr'); R(); } }); }
      else if (slotsFor(it)[0]) A.push({ l: '装备', style: 'w', fn: () => { equipItem(it); R(); } });
      A.push({ l: '拆解', fn: () => this.ask(`拆解 ${itemName(it)}？`, () => { const g = salvage(it); const n = Object.values(g).reduce((a, b) => a + b, 0); if (n) toast(`得到 ${n} 个词条碎片`, '#d9cfb8'); R(); }, '拆解', '会变成词条碎片，不能撤销。') });
    } else {
      A.push({ l: '卸下', fn: () => { unequip(f.slot); R(); } });
      if (it.sock || ['core', 'engine', 'hub'].includes(f.slot)) A.push({ l: '符文', fn: () => { modWeapon = f.slot; this.openWin('mods'); } });
    }
    if (unlocked('craft')) A.push({ l: '铁砧', fn: () => { craftId = it.id; craftAff = -1; craftTab = 0; this.openWin('craft'); } });
    return A;
  }
  /* 进出战斗的过场：像素方块盖住画面 → 卸掉营地界面、开打（或回营地）→ 方块散开 */
  loadGo(fn) {
    if (this.loadC) return; this.prevRun = true; // 自己负责过场，update 里不再补一次
    this.runLoad('下行中', `第 ${LAD.pending ? '天梯 ' + LAD.pending : descentStart()} 层`, () => { this.closePopup(); hideTip(); this.closeWin(); fn(); }, false);
  }
  runLoad(title, sub, mid, covered) {
    if (this.loadC) this.loadC.destroy();
    const c = this.add.container(0, 0).setDepth(400); this.loadC = c;
    c.add(rect(this, 0, 0, W, H, '#000000', 0.001).setInteractive());
    const g = this.add.graphics(); c.add(g); const cs = 18, cols = Math.ceil(W / cs), rows = Math.ceil(H / cs), N = cols * rows;
    const ord = [...Array(N).keys()].map(i => [i, Math.random() + ((i % cols) + (i / cols | 0)) / (cols + rows)]).sort((a, b) => a[1] - b[1]).map(a => a[0]);
    const info = this.add.container(W / 2, H / 2 - 30).setAlpha(0); c.add(info);
    T(this, 0, 0, title, { align: 'center', color: COL.emberHi, scale: 2, parent: info }); T(this, 0, 30, sub, { align: 'center', color: COL.dim, parent: info });
    const bar = this.add.graphics(); info.add(bar); img(this, -12, 40, 'torch', info).setScale(3);
    const paint = k => { g.clear(); g.fillStyle(0x07050a, 1); const n = Math.round(k * N); for (let j = 0; j < n; j++) { const i = ord[j]; g.fillRect((i % cols) * cs, (i / cols | 0) * cs, cs, cs); } };
    const pbar = k => { bar.clear(); for (let i = 0; i < 12; i++) { bar.fillStyle(i < Math.round(k * 12) ? 0xffb347 : 0x2a2236, 1); bar.fillRect(-60 + i * 10, 76, 8, 6); } };
    const W8 = (ms, f) => new Promise(res => { const t0 = performance.now(), step = () => { if (!c.scene) return res(); const k = Math.min(1, (performance.now() - t0) / ms); f(k); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
    (async () => {
      if (!covered) await W8(320, paint); else paint(1);
      info.setAlpha(1); if (mid) mid(); this.scene.pause('world');
      await W8(this.loadHold || 650, pbar);
      this.scene.resume('world'); info.setAlpha(0);
      await W8(320, k => paint(1 - k));
      c.destroy(); this.loadC = null;
    })();
  }
  closePopup() { if (this.popC) { this.popC.destroy(); this.popC = null; } }
  showDetail(it, host, acts = []) {
    if (it.kind === 'mod') return this.showLines(modTip(it, host), acts);
    if (it.kind === 'map') return this.showLines(mapTip(it), acts);
    this.popup((p, w) => mkCard(this, p, 0, 0, it, w, { compare: !!slotsFor(it)[0] }).h, acts);
  }
  showLines(lines, acts = [], closeL) {
    this.popup((p, w) => { let y = 0; for (const l of lines) { if (!l || !l.t) continue; const t = TW(this, 0, y, l.t, w, { size: l.s || 12, color: l.c || COL.text, parent: p }); y += t.h + 1; } return y; }, acts, closeL);
  }
  // 全景时战斗区上下的黑边
  drawLetterbox() {
    if (!this.lbG) this.lbG = this.add.graphics().setDepth(9);
    const g = this.lbG; g.clear(); if (S.settings.view !== 'pano') return;
    const k = W / VW, t = Math.round(SCR_CY - VIEW_CY * k), b = Math.round(t + VH * k);
    g.fillStyle(0x07050a, 1); if (t > MTOP) g.fillRect(0, MTOP, W, t - MTOP); if (b < MBOT) g.fillRect(0, b, W, MBOT - b);
    g.fillStyle(0x6a5433, 1); g.fillRect(0, t - 1, W, 1); g.fillRect(0, b, W, 1);
  }
  update(_, delta) {
    if (this.prevRun && !RUN && !this.loadC) this.runLoad('返回营地', '战利品已带回', null, true);
    this.prevRun = !!RUN;
    this.updateHud(); this.updateCamp(); this.drawLetterbox();
    this.dimR && this.dimR.setVisible(!!this.winId); this.drawStick(Math.min(0.05, (delta || 16) / 1000));
    if (this.tipC) this.placeTip();
    this.feedC.list.forEach(t => { const age = G.time - t.feed.t; t.setAlpha(age > 8 ? Math.max(0, 1 - (age - 8) / 2) : 1); });
    this.feedC.setVisible(!this.winId); this.autoT.setVisible(!this.winId);
  }
}

// 手机：每次开打都先走过场（自动循环、天梯、出发按钮都经过 startRun）
{ const raw = startRun; startRun = function (L) { if (G.ui && G.ui.loadGo && !G.ui.loadC) return G.ui.loadGo(() => raw(L)); if (G.ui && G.ui.loadC) return; return raw(L); }; }
