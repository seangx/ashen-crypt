/* =========================================================
   手机：属性石（gear-v2 §7）——上 = 已装备部位的孔，下 = 背包（同种同阶叠放）。
   点背包里的石头选中 → 点空孔放入；点孔里的石头取回；3 颗同种同阶 → 合成高一阶。
   ========================================================= */
let stonePick = null;
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
      const nm = itemName(it); T(this, 16, yy + 19, nm.length > 7 ? nm.slice(0, 7) + '…' : nm, { size: 8, color: COL.text, parent: c });
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
      if (sum) T(this, 16 + 70, yy + 19, sum.length > 14 ? sum.slice(0, 14) + '…' : sum, { size: 8, color: '#9be05a', parent: c });
    });
    y += Math.max(1, slots.length) * 42 + 8;
    // 背包：按 (种类, 阶) 叠放
    const G = {}; for (const s of bag) { const k = s.sid + '|' + s.t; (G[k] = G[k] || []).push(s); }
    const keys = Object.keys(G).sort((a, b) => { const [sa, ta] = a.split('|'), [sb, tb] = b.split('|'); return sa === sb ? tb - ta : sa < sb ? -1 : 1; });
    T(this, 12, y, `背包 · ${bag.length} 颗`, { size: 12, color: COL.emberHi, parent: c }); y += 20;
    if (!keys.length) { T_(this, c, w / 2, y + 6, '打怪有几率掉属性石（直接进背包）', { size: 8, color: COL.dim }); return; }
    const cw = Math.floor((w - 24) / 2), ch = 44, fit = Math.max(2, Math.floor((h - y - 50) / (ch + 6)) * 2), more = keys.length - fit;
    if (more > 0) { keys.length = fit - 1; T_(this, c, 8 + 1.5 * cw + 8, y + ((fit - 1) / 2 | 0) * (ch + 6) + 16, `还有 ${more + 1} 种…`, { size: 8, color: COL.dim }); }
    keys.forEach((k, i) => bub(this, c, 8 + (i % 2) * (cw + 8), y + (i / 2 | 0) * (ch + 6), cw, ch, 0x2a2236, { flat: 1, ring: G[k].some(s => s.id === stonePick) ? CY : null }));
    keys.forEach((k, i) => {
      const L = G[k], s = L[0], fz = L.length >= 3 && s.t < 5, S0 = stoneOf(s.sid), x = 8 + (i % 2) * (cw + 8), yy = y + (i / 2 | 0) * (ch + 6);
      bub(this, c, x + 4, yy + 7, 26, 26, hx(S0.c));
      T_(this, c, x + 17, yy + 12, String(s.t), { size: 12, color: '#1a1426', shadowColor: null });
      T(this, x + 36, yy + 5, `${S0.n} ×${L.length}`, { size: 8, color: COL.text, parent: c });
      const wf = S0.w ? `${STAT_N2[S0.w[0]] || S0.w[0]}` : '武器无效', af = S0.a ? `${STAT_N2[S0.a[0]] || S0.a[0]}` : '护甲无效';
      T(this, x + 36, yy + 18, `武 ${wf}`.slice(0, fz ? 5 : 9), { size: 8, color: COL.dim, parent: c });
      T(this, x + 36, yy + 30, `甲 ${af}`.slice(0, fz ? 5 : 9), { size: 8, color: COL.dim, parent: c });
      zoneOn(this, c, x, yy, cw - (L.length >= 3 && s.t < 5 ? 40 : 0), ch, () => { stonePick = stonePick === s.id ? null : s.id; R(); });
      if (L.length >= 3 && s.t < 5) mkBtn(this, c, x + cw - 40, yy + 14, 36, 24, '合成', () => { if (stoneFuse(s.sid, s.t)) toast(`合成 ${S0.n} ${s.t + 1} 阶`, '#ffe066'); stonePick = null; R(); }, { size: 8, style: 'w' });
    });
    y += Math.ceil(keys.length / 2) * (ch + 6);
    if (stonePick) { const p = bag.find(x => x.id === stonePick); if (p) T(this, 12, y + 4, '已选中：点上面的空孔放入', { size: 8, color: '#ffe066', parent: c }); }
    this.paneH = y + 30;
  },
});
