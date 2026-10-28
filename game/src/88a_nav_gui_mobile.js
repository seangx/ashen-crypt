/* =========================================================
   手机底部导航换皮（Sean：最该换的是下面的 tab 页）：GUI Pro-SuperCasual 的底栏样式。
   深紫底栏；选中页签 = 凸起的浅紫圆顶块 + 图标上移 + 显示名字；没选中 = 只有图标、稍暗；
   中间「战斗」始终是凸起的大余烬色块（选中更亮）。未解锁：图标变灰 + 小锁 + “锁N”，点了照旧提示解锁条件。红点角标沿用。
   图集没加载 / 皮肤关掉时退回原来的导航（87t）。
   ========================================================= */
{
  const P = MobileUI.prototype, _build = P.buildNav, _draw = P.navDraw;
  const NAV_IC = { gear: 'nav_gear', trig: 'nav_trig', battle: 'nav_battle', tree: 'nav_tree', craft: 'nav_craft' };
  const NAV_TINT = { nav_craft: 0xffb45e }; // 线性图标染成余烬色
  const BAR = 0x1d1629, TAB_SEL = 0x6a5490, BAT = 0xd8742a, BAT_SEL = 0xff9a3d;
  P.buildNav = function () {
    if (!guiReady(this)) { this.navGui = false; return _build.call(this); }
    this.navGui = true;
    const y0 = H - NAV_H, c = this.add.container(0, y0).setDepth(60), sw = W / MNAV.length; this.navC = c;
    c.add(rect(this, 0, 0, W, NAV_H + 40, '#' + BAR.toString(16).padStart(6, '0'), 1)); // 往下多铺一截：安全区 / 黑边也是底栏色
    c.add(rect(this, 0, 0, W, 2, '#0d0a12', 1)); c.add(rect(this, 0, 2, W, 1, '#3a2c4e', 1));
    this.navs = MNAV.map((m, i) => {
      const x = Math.round(i * sw), w = Math.round((i + 1) * sw) - x, b = this.add.container(x, 0), bat = m.id === 'battle'; c.add(b);
      b.tab = gNine(this, bat ? -4 : 2, bat ? -14 : -6, bat ? w + 8 : w - 4, bat ? NAV_H + 14 : NAV_H + 6, 'tab', bat ? BAT : TAB_SEL, b);
      b.shine = this.add.rectangle(bat ? 2 : 6, bat ? -10 : -3, bat ? w - 4 : w - 12, 3, 0xffffff, 0.25).setOrigin(0); b.add(b.shine);
      b.hl = rect(this, 0, 0, 1, 1, '#000000', 0, b);
      const k = NAV_IC[m.id], s = bat ? 32 : 22;
      b.ic = this.add.image(Math.round(w / 2), bat ? 8 : 18, 'gui', k).setDisplaySize(s, s); if (NAV_TINT[k]) b.ic.setTint(NAV_TINT[k]); b.add(b.ic); b.icTint = NAV_TINT[k] ?? 0xffffff;
      b.lab = T(this, Math.round(w / 2), bat ? 27 : 31, m.n, { size: bat ? 12 : 8, color: '#ffffff', align: 'center', parent: b, shadowColor: '#1a1426' });
      b.lk = this.add.image(Math.round(w / 2) + 8, 23, 'gui', 'nav_lock').setDisplaySize(10, 10).setTint(0xe9e0c9).setVisible(false); b.add(b.lk);
      b.dot = this.add.container(w - 14, -2); b.add(b.dot); const dg = this.add.graphics(); b.dot.add(dg); dg.fillStyle(0x0d0a12, 1).fillCircle(4, 4, 6); dg.fillStyle(0xff3b3b, 1).fillCircle(4, 4, 4.5);
      b.badge = T(this, 4, 0, '', { size: 'num', color: '#ffffff', align: 'center', parent: b.dot }); b.lock = T(this, 0, 0, '', { size: 8 }).setVisible(false); b.add(b.lock);
      const z = this.add.zone(0, bat ? -14 : -6, w, NAV_H + (bat ? 14 : 6)).setOrigin(0).setInteractive(); b.add(z); // 至少 TOUCH 见方
      z.on('pointerup', () => { sfx('click'); this.navTo(m.id); });
      b.m = m; b.w = w; b.bat = bat; return b;
    });
  };
  P.navDraw = function () {
    if (!this.navGui) return _draw.call(this);
    const cur = this.winId && MNAV.some(m => m.id === this.winId) ? this.winId : this.winId === 'tbag' ? 'trig' : this.winId === 'ladder' ? 'battle' : this.winId ? null : 'battle';
    for (const b of this.navs) {
      const id = b.m.id, on = !MENU.some(m => m.id === id) || unlocked(id), sel = id === cur;
      if (b.bat) { b.tab.setTint(sel ? BAT_SEL : BAT); b.shine.setAlpha(sel ? 0.35 : 0.18); b.ic.setDisplaySize(sel ? 32 : 28, sel ? 32 : 28); b.lab.setTint(hex(sel ? '#2a1306' : '#3a1a08')).setVisible(true); }
      else {
        b.tab.setVisible(sel); b.shine.setVisible(sel);
        b.ic.y = sel ? 11 : 18; b.ic.setDisplaySize(sel ? 24 : 22, sel ? 24 : 22);
        if (on) b.ic.setTint(sel ? b.icTint : Phaser.Display.Color.ValueToColor(b.icTint).darken(22).color).setAlpha(sel ? 1 : 0.85); else b.ic.setTint(0x6a6278).setAlpha(0.55);
        const lt = on ? b.m.n : (unlockText(id).match(/\d+/) ? '锁' + unlockText(id).match(/\d+/)[0] : b.m.n);
        b.lab.setText(lt).setVisible(sel || !on).setY(sel ? 28 : 33).setTint(hex(sel ? '#ffffff' : '#9b90a8'));
        b.lk.setVisible(!on);
      }
      let badge = '';
      if (id === 'gear') { const k = S.stash.filter(x => x.isNew && x.kind !== 'gem').length; badge = k ? String(Math.min(9, k)) : ''; }
      if (id === 'trig' && (S.trigBag.some(t => t.isNew) || S.stash.some(g => g.kind === 'gem' && g.isNew) || S.mods.some(m => m.isNew))) badge = '!';
      if (id === 'tree' && treePoints() > 0) badge = String(Math.min(9, treePoints()));
      b.dot.setVisible(on && !!badge); b.badge.setText(badge); b.dot.y = b.bat ? -14 : sel ? -8 : 2;
    }
  };
}
