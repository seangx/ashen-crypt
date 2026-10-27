/* =========================================================
   手机界面皮肤（试点）：GUI Pro-SuperCasual 的白色件，运行时染成地穴暗色。
   只换界面外壳（窗口、按钮、行框、开关、确认弹窗），战场 / 角色 / 怪物 / 物品格仍是像素画。
   按页开关：GUI_SKIN.pages 里列出的窗口 id（'popup' = 确认 / 详情弹窗）。整体关掉：localStorage 'ash-gui' = '0' 或网址 ?gui=0。
   图集只在 UI 层用线性过滤，像素画保持最近邻。
   ========================================================= */
const GUI_SKIN = (() => {
  let on = true; try { const q = new URLSearchParams(location.search).get('gui'); if (q != null) on = q !== '0'; else if (localStorage.getItem('ash-gui') === '0') on = false; } catch (e) { }
  return { on, pages: new Set(['settings', 'summary', 'reels', 'popup']) };
})();
// 暗色地穴配色（乘到白色件上：黑描边保持黑，白 → 这个颜色，灰阴影 → 更暗）
const GUI_PAL = { panel: 0x34284a, panelLt: 0x9a80c0, slot: 0x1c1526, title: 0x7a3e16, n: 0x5b4776, nH: 0x7a62a0, w: 0xff9a3d, wH: 0xffc06a, r: 0xb8402f, rH: 0xe0604a, s: 0x4a3d58, d: 0x2c2733, swOn: 0xff9a3d, swOff: 0x3a3244, bone: 0xe9e0c9 };
// 九宫格切边（图集像素：左 右 上 下）
const GUI_INS = { btn: [19, 19, 18, 22], btn_lt: [16, 16, 16, 16], panel: [20, 20, 18, 24], panel_lt: [18, 18, 14, 4], slot: [10, 10, 10, 12], card: [20, 20, 20, 24] };
const GUI_IMG = (() => { const i = new Image(); i.src = GUI_ATLAS.png; return i; })();
function guiAtlasAdd(sc) {
  const go = () => { if (sc.textures.exists('gui')) return; const t = sc.textures.addAtlas('gui', GUI_IMG, { frames: Object.entries(GUI_ATLAS.frames).map(([filename, f]) => ({ filename, ...f })) }); t.setFilter(Phaser.Textures.FilterMode.LINEAR); };
  if (GUI_IMG.complete && GUI_IMG.naturalWidth) go(); else GUI_IMG.addEventListener('load', go, { once: true });
}
{ const _bt = buildTextures; buildTextures = function (sc) { _bt(sc); if (GUI_SKIN.on) guiAtlasAdd(sc); }; }
const guiReady = sc => GUI_SKIN.on && sc.textures.exists('gui');
const guiPage = (sc, id) => guiReady(sc) && GUI_SKIN.pages.has(id);
// 九宫格：图集是 2 倍尺寸，按 0.5 缩放显示；太小放不下切边时再缩一点
function gNine(sc, x, y, w, h, frame, tint, parent) {
  const [l, r, t, b] = GUI_INS[frame] || [8, 8, 8, 8];
  const s = Math.min(0.5, w / (l + r + 2), h / (t + b + 2));
  const n = sc.add.nineslice(x, y, 'gui', frame, w / s, h / s, l, r, t, b).setOrigin(0).setScale(s);
  if (tint != null) n.setTint(tint); if (parent) parent.add(n); return n;
}
// 按钮：沿用 mkBtn 的全部逻辑（点击区、禁用、提示），只把底图换掉
{ const _mk = mkBtn; mkBtn = function (sc, parent, x, y, w, h, label, onClick, o = {}) {
  const c = _mk(sc, parent, x, y, w, h, label, onClick, o);
  if (!sc.guiNow || !guiReady(sc)) return c;
  const st = o.style || 'n', base = GUI_PAL[st] ?? GUI_PAL.n, hi = GUI_PAL[st + 'H'] ?? GUI_PAL.nH;
  for (const k of c.list.slice(0, 3)) k.setAlpha(0); // 原来的像素底图（bg / 悬停 / 禁用）
  const prs = c.list.find(k => k.type === 'Rectangle' && k.fillAlpha > 0.2 && k.fillAlpha < 0.3); if (prs) prs.setAlpha(0);
  const bg = gNine(sc, 0, 0, w, h, 'btn', base); c.addAt(bg, 0);
  const lt = h >= 18 ? gNine(sc, 2, 1, w - 4, Math.round(h * 0.55), 'btn_lt', 0xffffff).setAlpha(0.22) : null; if (lt) c.addAt(lt, 1);
  const _sd = c.setDisabled; c.setDisabled = d => { _sd(d); bg.setTint(d ? GUI_PAL.d : base).setAlpha(d ? 0.75 : 1); if (lt) lt.setVisible(!d); c.lab.setAlpha(d ? 0.7 : 1); };
  c.setDisabled(c.disabled);
  const z = c.list[c.list.length - 1];
  z.on('pointerover', () => { if (!c.disabled) bg.setTint(hi); }); z.on('pointerout', () => { if (!c.disabled) bg.setTint(base); });
  z.on('pointerdown', () => { if (!c.disabled) bg.setTint(Phaser.Display.Color.ValueToColor(base).darken(18).color); });
  z.on('pointerup', () => { if (!c.disabled) bg.setTint(base); });
  if (st === 'w') c.lab.setTint(0x2a1306);
  return c;
}; }
// 开关（设置页的 开 / 关）
function gSwitch(sc, parent, x, y, on, fn) {
  const c = sc.add.container(x, y); parent.add(c); const w = 40, h = 22;
  c.add(gNine(sc, 0, 0, w, h, 'btn', on ? GUI_PAL.swOn : GUI_PAL.swOff));
  const hx = on ? w - 21 : 1; c.add(sc.add.image(hx, 0, 'gui', 'sw_h').setOrigin(0).setDisplaySize(20, 22).setTint(GUI_PAL.bone));
  T(sc, on ? 11 : w - 11, 11, on ? '开' : '关', { size: 8, color: on ? '#2a1306' : COL.dim, shadow: false, align: 'center', valign: 'middle', parent: c });
  const pw = Math.max(0, (TOUCH - w) / 2), ph = Math.max(0, (TOUCH - h) / 2);
  const z = sc.add.zone(-pw, -ph, w + pw * 2, h + ph * 2).setOrigin(0).setInteractive(); c.add(z);
  z.on('pointerup', () => { sfx('click'); fn(); });
  return c;
}
// 窗口 / 弹窗外壳：像素铁框、噪点底、四角金饰、暗角 → 圆角暗紫面板；行框 f_slot → 圆角深槽；标题丝带 → 余烬色药丸
function guiShell(sc, c, x, y, w, h) {
  for (const k of [...c.list]) {
    const key = k.texture && k.texture.key;
    if (key === 'o_corner' || key === 'g_vig') { k.destroy(); continue; }
    if (k.type === 'TileSprite') { k.setVisible(false); continue; } // 噪点底（tileSprite 的纹理 key 是内部生成的）
    if (k.type === 'NineSlice' && key === 'o_frame') { k.setAlpha(0); continue; } // 留着当点击挡板
    if (k.type === 'NineSlice' && key === 'f_slot') { const n = gNine(sc, k.x, k.y, k.width, k.height, 'slot', GUI_PAL.slot); c.addAt(n, c.getIndex(k)); k.destroy(); continue; }
    if (k.type === 'NineSlice' && key === 'ribbon') { const n = gNine(sc, k.x, k.y - 1, k.width, 22, 'btn', GUI_PAL.title); c.addAt(n, c.getIndex(k)); k.destroy(); continue; }
  }
  const p = gNine(sc, x - 2, y - 2, w + 4, h + 6, 'panel', GUI_PAL.panel); c.addAt(p, 0);
}
{
  const P = MobileUI.prototype, _ref = P.refresh, _pop = P.popup, _set = P.win_settings;
  P.refresh = function (anim) {
    const id = this.winId; this.guiNow = !!id && guiPage(this, id);
    try { _ref.call(this, anim); } finally { this.guiNow = false; }
    if (id && this.winC && guiPage(this, id)) guiShell(this, this.winC, 0, 0, this.winC.w, this.winC.list.find(k => k.texture && k.texture.key === 'o_frame')?.height || 0);
  };
  P.popup = function (build, acts, closeL) {
    this.guiNow = guiPage(this, 'popup');
    try { _pop.call(this, build, acts, closeL); } finally { this.guiNow = false; }
    const c = this.popC; if (!c || !guiPage(this, 'popup')) return;
    const fr = c.list.find(k => k.texture && k.texture.key === 'o_frame'); if (fr) guiShell(this, c, fr.x, fr.y, fr.width, fr.height);
    const dim = c.list.find(k => k.type === 'Rectangle'); if (dim) c.moveTo(dim, 0); // 遮罩在最下
  };
  // 设置：开 / 关 换成开关
  P.win_settings = function (c, w, h) {
    _set.call(this, c, w, h); if (!this.guiNow) return;
    for (const b of [...c.list]) if (b.type === 'Container' && b.lab && (b.lab.text === '开' || b.lab.text === '关')) {
      const on = b.lab.text === '开', z = b.list[b.list.length - 1], fire = () => z.emit('pointerup');
      b.setVisible(false); z.disableInteractive(); gSwitch(this, c, b.x + 14, b.y, on, fire);
    }
  };
}
