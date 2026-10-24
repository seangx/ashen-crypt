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
const STICK_R = 26; // 摇杆半径（逻辑像素）
class MobileUI extends UI {
  create() {
    G.ui = this; this.cameras.main.setZoom(Z).centerOn(W / 2, H / 2); this.winId = null; this.winC = null; this.tipC = null; this.feeds = []; this.toastC = null; this.pan = 0;
    this.buildHud(); this.buildNav(); this.buildStick();
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
    this.aiBtn = mkBtn(this, pan, bx, 8, bw, 20, '自动', () => { S.auto.ai = !S.auto.ai; if (S.auto.ai) AUTO.manualT = -1e9; save(); });
    this.lockBtn = mkBtn(this, pan, bx + bw + 4, 8, bw, 20, '推层', () => { S.auto.lock = !S.auto.lock; save(); });
    this.mainBtn = mkBtn(this, pan, bx, 32, fw, 24, '开始', () => { ac(); this.toggleLoop(); }, { style: 'w' });
    this.retBtn = mkBtn(this, pan, bx, 60, bw, 20, '返回', () => { ac(); if (!RUN || RUN.ending) return; if (!confirm2('abandon')) { toast('再点一次确认提前返回'); return; } abandonRun(); });
    this.moreBtn = mkBtn(this, pan, bx + bw + 4, 60, bw, 20, '菜单', () => this.toggleWin('more'));
    this.lvT = T(this, W / 2, 84, '', { size: 8, color: COL.xp, align: 'center', parent: pan });
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
    this.retBtn.setDisabled(!RUN || !!RUN.ending); this.retBtn.setLabel(confirmKey === 'abandon' ? '确认返回?' : '返回'); if (!this.retBtn.disabled) this.retBtn.lab.setTint(hex(confirmKey === 'abandon' ? COL.bad : COL.emberHi));
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
    const id = this.winId, native = ['settings', 'more', 'ladder'].includes(id);
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
  closeWin() { STICK.on = false; super.closeWin(); }
  /* 设置：竖屏原生 */
  win_settings(c, w, h) {
    const row = (y, name, sub, val, fn) => { c.add(nine(this, 8, y, w - 16, 36, 'f_slot', 3)); T(this, 16, y + 5, name, { parent: c }); T(this, 16, y + 21, sub, { size: 8, color: COL.dim, parent: c }); if (val != null) mkBtn(this, c, w - 70, y + 7, 54, 22, val, () => { fn(); save(); this.refresh(); }, { style: 'w' }); };
    let y = 20;
    row(y, '移动方式', '浮动摇杆：左下按哪出哪；松手几秒后交还自动', S.auto.ai ? '自动' : '手动', () => { S.auto.ai = !S.auto.ai; if (S.auto.ai) AUTO.manualT = -1e9; }); y += 42;
    row(y, '音效', '攻击、拾取、界面音效', S.settings.sound ? '开' : '关', () => { S.settings.sound = !S.settings.sound; ac(); }); y += 42;
    row(y, '特效', '飘字、拾取记录、横幅和震屏', G.fx ? '开' : '关', () => { G.fx = !G.fx; }); y += 42;
    row(y, '推层', S.auto.lock ? `锁定在难度 ${S.depth}` : '打赢就去最深层，连输退一层', S.auto.lock ? '锁层' : '推层', () => { S.auto.lock = !S.auto.lock; if (!S.auto.lock) S.depth = S.maxDepth; }); y += 42;
    c.add(nine(this, 8, y, w - 16, 36, 'f_slot', 3)); T(this, 16, y + 5, `难度 ${S.depth}`, { parent: c }); T(this, 16, y + 21, `最深纪录：第 ${S.maxDepth - 1} 层通关`, { size: 8, color: COL.dim, parent: c });
    mkBtn(this, c, w - 70, y + 7, 26, 22, '<', () => { if (S.depth > 1 && !RUN) { S.depth--; S.auto.lock = true; save(); } this.refresh(); }, { disabled: RUN || S.depth <= 1 });
    mkBtn(this, c, w - 42, y + 7, 26, 22, '>', () => { if (S.depth < S.maxDepth && !RUN) { S.depth++; S.auto.lock = S.depth < S.maxDepth; save(); } this.refresh(); }, { disabled: RUN || S.depth >= S.maxDepth }); y += 50;
    TW(this, 12, y, '只有一个操作：移动。武器自动攻击最近的敌人，没有冲刺和主动技能。', w - 24, { size: 8, color: COL.faint, parent: c });
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
  buildCamp() { this.campC = this.add.container(0, 0); this.facs = []; } // 竖屏营地暂不画设施标签，入口都在导航和菜单里
  updateCamp() { if (!this.campC) this.buildCamp(); }
  update(_, delta) {
    this.updateHud(); this.updateCamp(); this.drawStick(Math.min(0.05, (delta || 16) / 1000));
    if (this.tipC) this.placeTip();
    this.feedC.list.forEach(t => { const age = G.time - t.feed.t; t.setAlpha(age > 8 ? Math.max(0, 1 - (age - 8) / 2) : 1); });
    this.feedC.setVisible(!this.winId); this.autoT.setVisible(!this.winId);
  }
}
