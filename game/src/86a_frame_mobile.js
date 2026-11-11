/* =========================================================
   手机界面骨架（rexUI，11-10 重构）：每个窗口 / 弹窗 = 固定头 + 可滚动主体 + 固定底。
   - 主体是 rexUI ScrollablePanel 的子元素：内容比可视区高就能上下滑，数量不定的东西（格子、列表、词条）都画在主体里，结构上不会掉出屏幕。
   - 头、底是 ScrollablePanel 的 header / footer：页签、筛选、操作按钮放这里，永远在原位。
   用法（窗口函数里）：
     const F = this.F;                 // 当前窗口的骨架
     const hc = F.head(34);            // 固定头容器（高 34），里面按左上角坐标画
     const fc = F.foot(40);            // 固定底容器
     ... 主体画进参数 c（按左上角坐标，y 往下累加）...
     F.end(y);                         // 主体内容总高度
   F.vh = 主体可视高度（窗口高 − 头 − 底），要“铺满”时用。
   ========================================================= */
class MFrame {
  constructor(ui, x, y, w, h, key, depth) {
    Object.assign(this, { ui, x, y, w, h, key, depth, hh: 0, fh: 0, ch: null, headC: null, footC: null, panel: null, subs: [] });
    this.body = ui.add.container(0, 0);
  }
  head(hh) { if (!this.headC) this.headC = this.ui.add.container(0, 0); this.hh = hh; return this.headC; }
  foot(fh) { if (!this.footC) this.footC = this.ui.add.container(0, 0); this.fh = fh; return this.footC; }
  get vh() { return this.h - this.hh - this.fh; }
  end(ch) { this.ch = ch; }
  // Phaser 容器当 rexUI 子元素：要有尺寸，原点在中心，所以内容整体偏移半个宽高
  box(inner, bw, bh, block) {
    const o = this.ui.add.container(0, 0); o.setSize(bw, Math.max(1, bh));
    if (block) { const r = rect(this.ui, 0, 0, bw, Math.max(1, bh), '#000000', 0.001).setInteractive(); inner.addAt(r, 0); } // 头、底挡住滑到它们下面的主体内容
    inner.setPosition(-bw / 2, -Math.max(1, bh) / 2); o.add(inner); return o;
  }
  build() {
    const ui = this.ui, { w, h, key, depth } = this, vh = Math.max(1, this.vh);
    let ch = this.ch; if (ch == null) { const b = this.body.getBounds(); ch = b.height ? b.bottom - this.body.y : 0; }
    ch = Math.max(vh, Math.ceil(ch)); this.contentH = ch;
    const bodyBox = this.box(this.body, w, ch), cfg = { x: this.x, y: this.y, width: w, height: h, scrollMode: 0, panel: { child: bodyBox, mask: { padding: 0 } }, slider: false,
      scroller: { threshold: 6, rectBoundsInteractive: true, backDeceleration: false, slidingDeceleration: 4000 }, mouseWheelScroller: { focus: true, speed: 0.3 }, clampChildOY: true,
      space: { left: 0, right: 0, top: 0, bottom: 0, panel: 0, header: 0, footer: 0 }, expand: { header: true, footer: true } };
    if (this.headC) cfg.header = this.headBox = this.box(this.headC, w, this.hh, true);
    if (this.footC) cfg.footer = this.footBox = this.box(this.footC, w, this.fh, true);
    const p = this.panel = ui.rexUI.add.scrollablePanel(cfg).setOrigin(0).layout(); p.setDepth(depth);
    if (this.headBox) this.headBox.setDepth(depth + 2); if (this.footBox) this.footBox.setDepth(depth + 2);
    const max = this.max = Math.max(0, ch - vh), top = this.y + this.hh;
    ui.scrollPos = ui.scrollPos || {}; const s0 = clamp(ui.scrollPos[key] || 0, 0, max); ui.scrollPos[key] = s0; if (max > 0) p.setChildOY(-s0);
    // 可视区外的东西关掉点击（不然会挡住头、底和导航栏的按钮）；拖动中全部关掉，这一下不算点击
    const hits = [], walk = (o, oy) => { for (const q of o.list || []) { const yy = oy + (q.y || 0); if (q.input) hits.push({ o: q, y0: yy - (q.displayOriginY || 0), h: q.displayHeight || q.height || 0 }); if (q.list) walk(q, yy); } }; walk(this.body, 0);
    const sync = this.sync = off => { const s = ui.scrollPos[key] || 0; for (const H of hits) if (H.o.input) { const a = H.y0 - s, b = a + H.h; H.o.input.enabled = !off && a >= -2 && b <= vh + 2; } };
    const bar = max > 0 ? ui.add.graphics().setDepth(depth + 3) : null;
    const drawBar = () => { if (!bar) return; const th = Math.max(16, vh * vh / ch), ty = top + (vh - th) * (ui.scrollPos[key] || 0) / max; bar.clear(); bar.fillStyle(0x000000, 0.35).fillRect(this.x + w - 3, top, 3, vh); bar.fillStyle(0xb9c2ea, 0.75).fillRect(this.x + w - 3, Math.round(ty), 3, Math.round(th)); };
    this.bar = bar; sync(); drawBar();
    p.on('scroll', () => { ui.scrollPos[key] = clamp(-p.childOY, 0, max); drawBar(); if (!this.dragging) sync(); });
    const sc = p.getElement('scroller');
    if (sc) { sc.on('dragstart', () => { this.dragging = true; sync(true); hideTip(); if (ui.drag) { if (ui.drag.img) ui.drag.img.destroy(); ui.drag = null; } });
      sc.on('dragend', () => { this.dragging = false; setTimeout(() => { if (this.panel && this.panel.scene) sync(); }, 0); }); }
    if (max <= 0 && sc) sc.setEnable(false);
    return this;
  }
  destroy() { for (const s of this.subs) s.destroy(); this.subs = []; if (this.bar) { this.bar.destroy(); this.bar = null; } if (this.panel) { this.panel.destroy(); this.panel = null; } else { this.body.destroy(); if (this.headC) this.headC.destroy(); if (this.footC) this.footC.destroy(); } }
}
Object.assign(MobileUI.prototype, {
  /* 头 / 底里的小滚动区（比如铁砧顶上两行高的选装备格子）：独立的 rexUI 滚动面板。返回 { lc, done(内容高度) }，用法同旧的 scrollArea。
     c 必须是骨架的头 / 底 / 弹窗容器，或者不滚动的窗口主体 */
  scrollArea(c, x, top, w, vh, key) {
    const F = this.popF || this.F, ui = this, lc = this.add.container(0, 0);
    return { lc, done: contentH => {
      // 位置要等骨架排完版才知道：先记下来，骨架 build 之后再建
      (F.pending ||= []).push(() => { const m = c.getWorldTransformMatrix(), sub = new MFrame(ui, m.tx + x, m.ty + top, w, vh, key, F.depth + 4); sub.body.destroy(); sub.body = lc; sub.end(contentH); sub.build(); F.subs.push(sub); });
    } };
  },
  /* 弹窗：内容画进可滚动的主体，按钮固定在底部（内容再长也不会把按钮挤出屏幕） */
  popup(build, acts = [], closeL = '关闭') {
    this.closePopup(); hideTip(); this.initTapCancel();
    const c = this.add.container(0, 0).setDepth(250); this.popC = c;
    const dim = rect(this, 0, 0, W, H, COL.ink, 0.6, c).setInteractive(); dim.on('pointerup', () => this.closePopup());
    const pw = W - 24, iw = pw - 16, maxH = H - NAV_H - 30; let ph = 0, py = 0;
    const F = new MFrame(this, 20, 0, iw, 10, 'pop', 251); this.popF = F; this.scrollPos = this.scrollPos || {}; this.scrollPos.pop = 0;
    const hh = build(F.body, iw) || 0; F.end(hh);
    ph = Math.min(maxH, Math.ceil(hh) + 58); py = Math.round(Math.max(16, (H - NAV_H - ph) / 2));
    const bg = nine(this, 12, py, pw, ph, 'o_frame', 8).setInteractive(); c.add(this.add.tileSprite(15, py + 3, pw - 6, ph - 6, 'n_win').setOrigin(0)); c.add(bg);
    const fc = F.foot(38), all = [...acts, { l: closeL }], n = all.length, rows = n > 3 ? 2 : 1, per = Math.ceil(n / rows), bw = Math.floor((iw - (per - 1) * 4) / per);
    if (rows > 1) { F.fh = 70; ph = Math.min(maxH, Math.ceil(hh) + 90); } // 按钮多于 3 个排两行
    all.forEach((a, i) => mkBtn(this, fc, (i % per) * (bw + 4), 6 + (i / per | 0) * 32, bw, 30, a.l, () => { this.closePopup(); if (a.fn) a.fn(); }, { size: textW(a.l) > bw - 10 ? 8 : 12, style: a.style || 'n', disabled: !!a.disabled, locked: !!a.why && !!a.disabled, whyDisabled: a.why }));
    F.y = py + 10; F.h = ph - 20; F.build(); for (const f of F.pending || []) f(); F.pending = null;
  },
  closePopup() { if (this.popF) { this.popF.destroy(); this.popF = null; } if (this.popC) { this.popC.destroy(); this.popC = null; } },
  showLines(lines, acts = [], closeL) {
    this.popup((p, w) => { let y = 0, odd = 0; for (const l of lines) { if (!l || !l.t) continue;
      if (l.hd) { if (y) y += 6; rect(this, -4, y, w + 8, 17, COL.ember, 0.18, p); rect(this, -4, y, 3, 17, COL.emberHi, 1, p); T(this, 4, y + 2, l.t, { color: COL.emberHi, parent: p }); y += 20; odd = 0; continue; } // ui-v2：分段标题条
      if (l.k && textW(l.k, 8) + textW(l.v, 8) + 16 < w) { if (odd++ % 2 === 0) rect(this, -4, y - 1, w + 8, 13, '#ffffff', 0.04, p); T(this, 4, y, l.k, { size: 8, color: COL.dim, parent: p }); T(this, w - 2, y, l.v, { size: 8, color: l.c || COL.text, align: 'right', parent: p }); y += 13; continue; } // 名左值右的行条
      const t = TW(this, l.k ? 4 : 0, y, l.t, w - (l.k ? 4 : 0), { size: l.s || 12, color: l.c || COL.text, parent: p }); y += t.h + 1; odd = 0; } return y; }, acts, closeL);
  },
  // 手指按下后移动超过 8 像素 = 在滑动，不是点击：主体里的东西这一下都不响应（不管内容滚不滚得动）
  initTapCancel() {
    if (this._tapCancel) return; this._tapCancel = 1;
    const frames = () => [this.F, ...(this.F ? this.F.subs : []), this.popF, ...(this.popF ? this.popF.subs : []), this.glossF].filter(F => F && F.panel && F.sync);
    this.input.on('pointerdown', p => { this.tcD = { x: p.worldX, y: p.worldY, off: false }; });
    this.input.on('pointermove', p => { const D = this.tcD; if (!D || !p.isDown || D.off) return; if (Math.hypot(p.worldX - D.x, p.worldY - D.y) > 8) { D.off = true; for (const F of frames()) { F.dragging = true; F.sync(true); } hideTip(); } });
    this.input.on('pointerup', () => { const D = this.tcD; this.tcD = null; if (D && D.off) setTimeout(() => { for (const F of frames()) { F.dragging = false; F.sync(); } }, 0); });
  },
  // 建一个骨架：build(F) 里往 F.body / F.head() / F.foot() 画，返回后排版
  mkFrame(x, y, w, h, key, depth, build) {
    this.initTapCancel(); const F = new MFrame(this, x, y, w, h, key, depth); build(F); F.build(); for (const f of F.pending || []) f(); F.pending = null; return F;
  },
});
