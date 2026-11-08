/* =========================================================
   手机：属性石（gear-v2 §7）——上 = 已装备部位的孔，下 = 背包（同种同阶叠放）。
   点背包里的石头选中 → 点空孔放入；点孔里的石头取回；3 颗同种同阶 → 合成高一阶。
   ========================================================= */
let stonePick = null;
const fitW = (s, mw, sz = 8) => { s = String(s); if (textW(s, sz) <= mw) return s; while (s.length > 1 && textW(s + '…', sz) > mw) s = s.slice(0, -1); return s + '…'; }; // 长词条按像素宽截断
Object.assign(MobileUI.prototype, {
  win_stones(c, w, h) {
    const R = () => this.refresh(), bag = S.stones || [];
    TW(this, 12, 24, '武器 / 副手：伤害；护甲部位：防御。同种只算最高阶一颗', w - 24, { size: 8, color: COL.dim, parent: c });
    let y = 42; const SZ = 30;
    const slots = SLOTS.filter(s => s.id !== 'gem' && S.equip[s.id] && stoneSockN(S.equip[s.id]) > 0);
    // 先画所有底块，再画内容（后画的底块会盖住前面的按钮）
    slots.forEach((s, i) => bub(this, c, 8, y + i * 42, w - 16, 36, 0x2a2236, { flat: 1 }));
    if (!slots.length) T_(this, c, w / 2, y + 8, '没有带孔的装备：魔法装备 1 孔、稀有 2 孔', { size: 8, color: COL.dim });
    slots.forEach((s, i) => {
      const it = S.equip[s.id], n = stoneSockN(it), yy = y + i * 42; it.stones = it.stones || [];
      T(this, 16, yy + 5, s.n, { size: 8, color: COL.dim, parent: c });
      const nm = itemName(it); T(this, 16, yy + 19, fitW(nm, 66), { size: 8, color: COL.text, parent: c });
      for (let k = 0; k < n; k++) {
        const x = w - 16 - (n - k) * (SZ + 6), st = it.stones[k], S0 = st && stoneOf(st.sid);
        bub(this, c, x, yy + 3, SZ, SZ, st ? hx(S0.c) : 0x120e1a, { ring: !st && stonePick ? CY : null });
        if (st) T_(this, c, x + SZ / 2, yy + 10, String(st.t), { size: 12, color: '#1a1426', shadowColor: null });
        zoneOn(this, c, x, yy + 3, SZ, SZ, () => {
          if (st) { stoneUnsocket(it, k); toast(`取回 ${S0.n} ${st.t} 阶`); }
          else if (stonePick) { const p = bag.find(x => x.id === stonePick); if (p) { stoneSocket(it, k, p); toast(stoneText(it, p), '#ffe066'); } stonePick = null; }
          else toast('先在下面选一颗属性石');
          R();
        });
      }
      const sum = it.stones.filter(Boolean).map(x => stoneFx(it, x)).filter(Boolean).map(f => `${STAT_N2[f[0]] || f[0]} +${f[1]}`).join(' ');
      if (sum) T(this, 16 + 70, yy + 19, fitW(sum, w - 16 - 86 - (n * 36) - 4), { size: 8, color: '#9be05a', parent: c });
    });
    y += Math.max(1, slots.length) * 42 + 8;
    // 背包：按 (种类, 阶) 叠放
    const G = {}; for (const s of bag) { const k = s.sid + '|' + s.t; (G[k] = G[k] || []).push(s); }
    const keys = Object.keys(G).sort((a, b) => { const [sa, ta] = a.split('|'), [sb, tb] = b.split('|'); return sa === sb ? tb - ta : sa < sb ? -1 : 1; });
    T(this, 12, y, `背包 · ${bag.length} 颗`, { size: 12, color: COL.emberHi, parent: c }); y += 20;
    if (!keys.length) { T_(this, c, w / 2, y + 6, '打怪有几率掉属性石（直接进背包）', { size: 8, color: COL.dim }); return; }
    // 背包：小方块网格（颜色 = 种类，数字 = 阶，右下角 = 数量），点一下选中，选中的那种在下面显示效果和合成
    const SZ2 = 30, per = Math.max(1, Math.floor((w - 16) / (SZ2 + 6)));
    keys.forEach((k, i) => {
      const L = G[k], s = L[0], S0 = stoneOf(s.sid), x = 8 + (i % per) * (SZ2 + 6), yy = y + (i / per | 0) * (SZ2 + 6);
      bub(this, c, x, yy, SZ2, SZ2, hx(S0.c), { ring: L.some(t => t.id === stonePick) ? CY : null });
      T_(this, c, x + SZ2 / 2, yy + 7, String(s.t), { size: 12, color: '#1a1426', shadowColor: null });
      if (L.length > 1) T(this, x + SZ2 - 1, yy + SZ2 - 9, '×' + L.length, { size: 8, color: COL.text, align: 'right', parent: c });
      zoneOn(this, c, x, yy, SZ2, SZ2, () => { stonePick = L.some(t => t.id === stonePick) ? null : s.id; R(); });
    });
    y += Math.ceil(keys.length / per) * (SZ2 + 6) + 4;
    const pk = stonePick && bag.find(x => x.id === stonePick);
    if (pk) {
      const S0 = stoneOf(pk.sid), L = G[pk.sid + '|' + pk.t] || [], fz = L.length >= 3 && pk.t < 5;
      const wf = S0.w ? `${STAT_N2[S0.w[0]] || S0.w[0]}` : '武器无效', af = S0.a ? `${STAT_N2[S0.a[0]] || S0.a[0]}` : '护甲无效';
      T(this, 12, y, `${S0.n} ${pk.t} 阶 ×${L.length}`, { size: 8, color: COL.text, parent: c });
      T(this, 12, y + 12, fitW(`武 ${wf} · 甲 ${af}`, w - 24 - (fz ? 48 : 0)), { size: 8, color: COL.dim, parent: c });
      T(this, 12, y + 24, '已选中：点上面的空孔放入', { size: 8, color: '#ffe066', parent: c });
      if (fz) mkBtn(this, c, w - 56, y, 44, 28, '合成', () => { if (stoneFuse(pk.sid, pk.t)) toast(`合成 ${S0.n} ${pk.t + 1} 阶`, '#ffe066'); stonePick = null; R(); }, { size: 8, style: 'w' });
      y += 36;
    } else { T(this, 12, y, '点一颗选中，看效果；3 颗同种同阶可以合成', { size: 8, color: COL.faint, parent: c }); y += 14; }
    this.paneH = y + 30;
  },
});
