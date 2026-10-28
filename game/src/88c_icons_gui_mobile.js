/* 手机界面图标换成 GUI Pro-SuperCasual 风格（只换界面图标；战场 / 角色 / 怪物 / 宝石与装备像素画不动）。
   图标来自 gui 图集（tools/gui_atlas.py 打包的 PictoIcon_* 白色线性图标，运行时染色；彩色道具图标 nav_gear / nav_craft 保留原色）。
   调用处用 mkBtn 的 gicon 选项指定；没有皮肤图集（?gui=0）时原来的像素图标原样保留。 */
{
  const ICT = 0xe9e0c9, GOLD = 0xf2c46a, EMB = 0xffb45e;
  // 菜单 / 营地入口 → 图标帧 + 染色
  window.GI = { ladder: ['ic_trophy', GOLD], settings: ['ic_setting', ICT], mods: ['ic_diamond', 0xc9a0ff], stones: ['ic_crystal', 0x9fd8ff], help: ['ic_book', ICT], salvage: ['ic_recycle', 0x9be05a], depart: ['ic_temple', EMB], gear: ['ic_chest', GOLD], craft: ['nav_craft', EMB], equip: ['nav_gear', null], again: ['ic_again', ICT], pause: ['ic_pause', ICT], down: ['ic_down', 0x2a1306] };
  const guiImg = (sc, x, y, size, fr, tint, parent) => { const i = sc.add.image(x, y, 'gui', fr).setDisplaySize(size, size); if (tint != null) i.setTint(tint); if (parent) parent.add(i); return i; };
  window.guiImg = guiImg;
  // 结算页统计小格的图标
  window.sumIcon = (sc, cx, y, legacy, frame, tint, c) => {
    if (frame && guiReady(sc)) return guiImg(sc, cx, y + 8, 16, frame, tint, c);
    const s2 = sc.textures.get(legacy).getSourceImage(); return img(sc, Math.round(cx - s2.width / 2), y, legacy, c);
  };
  const _mk = mkBtn;
  mkBtn = function (sc, parent, x, y, w, h, label, onClick, o = {}) {
    const arrow = (label === '<' || label === '>') && guiReady(sc);
    const g = o.gicon && guiReady(sc) ? o.gicon : arrow ? [label === '<' ? 'ic_prev' : 'ic_next', ICT] : null;
    const c = _mk(sc, parent, x, y, w, h, label, onClick, g && o.icon ? { ...o, icon: null } : o);
    if (!g) return c;
    const [fr, tint] = g, isz = arrow ? 14 : Math.min(w < 45 ? 12 : 16, h - 8), ly = Math.round(h / 2);
    let ix;
    if (arrow) { c.lab.setVisible(false); ix = w / 2; }
    else if (o.labelX !== undefined) ix = (o.iconX ?? 6) + isz / 2;
    else { const tw = c.lab.width || 0, gw = isz + 3 + tw, st = (w - gw) / 2; ix = st + isz / 2; c.lab.x = st + isz + 3 + tw / 2; }
    const ic = guiImg(sc, Math.round(ix), ly, isz, fr, tint); c.add(ic); // 加在点击区后面也行：图标本身不接收输入
    const _sd = c.setDisabled; c.setDisabled = d => { _sd(d); ic.setAlpha(d ? 0.45 : 1); };
    c.setDisabled(c.disabled);
    return c;
  };
  // 战斗里的齿轮 / 关闭按钮：圆润的皮肤底 + 设置图标（展开时转 45° 的加号当 ×）
  const P = MobileUI.prototype, _dsi = P.drawSideIcon;
  P.drawSideIcon = function () {
    _dsi.call(this); if (!guiReady(this) || !this.sideBtn) return;
    const b = this.sideBtn; this.sideG.clear();
    if (!this.sideSkin) {
      const old = b.list.find(k => k.type === 'NineSlice'); if (old) old.setAlpha(0);
      this.sideSkin = gNine(this, 0, 0, 34, 34, 'btn', GUI_PAL.n); b.addAt(this.sideSkin, 0);
      this.sideIc = guiImg(this, 17, 17, 20, 'ic_setting', ICT, b);
    }
    const open = this.sideOpen; this.sideIc.setFrame(open ? 'ic_plus' : 'ic_setting').setAngle(open ? 45 : 0).setTint(open ? GOLD : ICT);
  };
}
