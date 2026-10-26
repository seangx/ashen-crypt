/* v5 手机换肤：弹壳风 —— 深色粗描边 + 蓝色圆角面板 + 亮黄/绿/红按钮。只替换九宫格贴图，所有页面一起换。 */
{
  const _bt = buildTextures;
  const rr = (x, c, a, b, w, h, r) => { x.fillStyle = c; x.beginPath(); x.roundRect(a, b, w, h, r); x.fill(); };
  const panel = (w, fill, edge, hi, lo, r = 5, s = w) => cvs(w, s, x => { rr(x, edge, 0, 0, w, s, r + 1); rr(x, lo, 1, 1, w - 2, s - 2, r); rr(x, fill, 1, 1, w - 2, s - 4, r); if (hi) { x.fillStyle = hi; x.fillRect(r, 2, w - r * 2, 2); } });
  buildTextures = function (sc) {
    _bt(sc);
    const T = sc.textures, add = (k, c) => { if (T.exists(k)) T.remove(k); T.addCanvas(k, c); };
    const flat = c => cvs(16, 16, x => px(x, c, 0, 0, 16, 16));
    // 窗体：外框只描边（中间透明），底色用平铺纯色
    add('o_frame', cvs(24, 24, x => { rr(x, '#1a1426', 0, 0, 24, 24, 8); x.clearRect(4, 4, 16, 16); rr(x, '#6f7fc0', 2, 2, 20, 20, 6); x.clearRect(4, 4, 16, 16); x.fillStyle = '#8b9ad6'; x.fillRect(7, 2, 10, 1); }));
    for (const [k, c] of [['win', '#3c4778'], ['stone', '#38426f'], ['leather', '#3c4778']]) { add('f_' + k, panel(24, c, '#1a1426', null, c, 7)); add('n_' + k, flat(c)); }
    add('f_slot', panel(8, '#2a3260', '#1a1426', null, '#232a52', 2));
    add('f_btn', panel(12, '#5a68a8', '#1a1426', '#8794d0', '#3a4680', 3));
    add('f_btn_h', panel(12, '#6c7bc0', '#1a1426', '#a0acdf', '#46529a', 3));
    add('f_btn_d', panel(12, '#353b5c', '#1a1426', null, '#2a2f4a', 3));
    add('f_btn_w', panel(12, '#ffc83a', '#1a1426', '#fff0a0', '#c88a10', 3));
    add('f_btn_wh', panel(12, '#ffd65e', '#1a1426', '#fff6c0', '#d89a20', 3));
    add('f_btn_s', panel(12, '#5cc84a', '#1a1426', '#a8f090', '#2e8a2a', 3));
    add('f_btn_r', panel(12, '#e0504a', '#1a1426', '#ff9a8a', '#a02a2a', 3));
    add('f_plaque', panel(12, '#2a3260', '#1a1426', '#46538a', '#20264a', 3));
    add('sock', panel(12, '#232a52', '#1a1426', null, '#3a4680', 3));
    add('sock_h', cvs(12, 12, x => { rr(x, '#ffc83a', 0, 0, 12, 12, 4); rr(x, '#232a52', 2, 2, 8, 8, 2); }));
    add('ribbon', cvs(40, 22, x => { rr(x, '#1a1426', 0, 1, 40, 20, 6); rr(x, '#c88a10', 2, 3, 36, 16, 4); rr(x, '#ffc83a', 2, 3, 36, 13, 4); x.fillStyle = '#fff0a0'; x.fillRect(6, 4, 28, 2); }));
    add('dock', cvs(32, 30, x => { px(x, '#1a1426', 0, 0, 32, 30); px(x, '#2e3766', 0, 2, 32, 28); px(x, '#46538a', 0, 2, 32, 1); }));
  };
  decoWin = function () {}; // 去掉金角、暗角
  Object.assign(COL, { dim: "#b9c2ea", faint: "#8a94c6" });
}
/* 战斗页（营地）：v5 的大卡片 —— 层数 + 选层 + 战力 + 开战 */
MobileUI.prototype.updateCamp = function () {
  if (!this.campC) this.buildCamp();
  const show = !RUN && !this.winId; this.campC.setVisible(show); if (!show) return;
  const F = [['ladder', '天梯', 'i_ladder'], ['salvage', '分解', 'shard'], ['help', '手册', 'i_book']];
  const ok = id => !MENU.some(m => m.id === id) || unlocked(id);
  const key = [F.map(f => +ok(f[0])).join(''), S.depth, S.maxDepth, S.auto.lock, S.auto.loop, Math.round(STATS.dps || 0)].join('|');
  if (key === this.campKey) return; this.campKey = key;
  const c = this.campC; c.removeAll(true); const pw = W - 16;
  bub(this, c, 8, 4, pw, 132, 0x46538a, { r: 10 });
  T(this, W / 2, 10, S.auto.lock ? '锁层' : '推层 · 打赢就往下', { size: 8, color: '#b9c2ea', align: 'center', parent: c });
  T(this, W / 2, 24, `第 ${descentStart()} 层`, { size: 12, scale: 2, color: '#ffe08a', align: 'center', parent: c });
  mkBtn(this, c, 20, 26, 30, 26, '<', () => { if (S.depth > 1) { S.depth--; S.auto.lock = true; save(); } this.campKey = ''; }, { disabled: S.depth <= 1 });
  mkBtn(this, c, W - 50, 26, 30, 26, '>', () => { if (S.depth < S.maxDepth) { S.depth++; S.auto.lock = S.depth < S.maxDepth; save(); } this.campKey = ''; }, { disabled: S.depth >= S.maxDepth });
  T(this, W / 2, 56, `最深 ${S.maxDepth - 1} 层 · 战力 ${fmt(Math.round(STATS.dps || 0))}`, { size: 8, color: '#ffffff', align: 'center', parent: c });
  mkBtn(this, c, 16, 70, pw - 16, 32, '开 战 !', () => startRun(), { style: 'w' });
  mkBtn(this, c, 16, 106, (pw - 20) / 2, 24, S.auto.loop ? '停止自动' : '自动刷', () => { this.toggleLoop(); this.campKey = ''; }, { size: 8 });
  const bw = Math.floor((pw - 20) / 2 / F.length);
  F.forEach(([id, n, ic], i) => mkBtn(this, c, 20 + (pw - 20) / 2 + i * bw, 106, bw - 2, 24, n, () => { if (!ok(id)) return toast(`${n}：${unlockText(id)}`); this.openWin(id); }, { size: 8, disabled: !ok(id) }));
};
