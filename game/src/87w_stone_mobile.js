/* =========================================================
   手机：属性石（gear-v2 §7）——上 = 已装备部位的孔，下 = 背包（同种同阶叠放）。
   点背包里的石头选中 → 点空孔放入；点孔里的石头取回；3 颗同种同阶 → 合成高一阶。
   ========================================================= */
let stonePick = null;
const fitW = (s, mw, sz = 8) => { s = String(s); if (textW(s, sz) <= mw) return s; while (s.length > 1 && textW(s + '…', sz) > mw) s = s.slice(0, -1); return s + '…'; }; // 长词条按像素宽截断
const stoneShort = S0 => S0.n.replace(/石$/, '') || S0.n;
const statLine = (k, v) => { const n = STAT_N2[k] || k; return n.endsWith('%') ? `${n.slice(0, -1)} +${v}%` : `${n} +${v}`; };
const stoneLine = (it, s) => { const f = stoneFx(it, s); return f ? statLine(f[0], f[1]) : '这个部位无效'; };
const stoneKindLine = (S0, t, weapon) => { const r = weapon ? S0.w : S0.a; return r ? statLine(r[0], +stoneVal(r, t).toFixed(r[2] < 5 ? 2 : 0)) : '无效'; };
// 一颗石头镶到某件装备某个孔：能不能放、放了以后秒伤 / 坚韧变多少（试放再还原）
function stoneSpot(it, k, s) {
  if (!stoneFx(it, s)) return { why: '这个部位无效' };
  const dup = (it.stones || []).find((x, j) => j !== k && x && x.sid === s.sid && x.t >= s.t); if (dup) return { why: `同件已有${stoneOf(s.sid).n} ${dup.t} 阶（同种只算一颗）` };
  const old = it.stones[k]; it.stones[k] = s; let n; try { n = computeStats(); } finally { it.stones[k] = old; }
  const d = STATS.dps ? (n.dps / STATS.dps - 1) * 100 : 0, tg = toughness(STATS) ? (toughness(n) / toughness(STATS) - 1) * 100 : 0;
  return { d, tg, score: d + tg };
}
const stoneDeltaText = sp => [Math.abs(sp.d) >= 0.5 ? `秒伤 ${sp.d > 0 ? '+' : ''}${sp.d.toFixed(0)}%` : '', Math.abs(sp.tg) >= 0.5 ? `坚韧 ${sp.tg > 0 ? '+' : ''}${sp.tg.toFixed(0)}%` : ''].filter(Boolean).join(' ') || '变化很小';
// 一键合成：所有 3 颗同种同阶 → 高一阶，合到合不动
function stoneFuseAll() { let n = 0; for (let g = 0; g < 200; g++) { const G = {}; for (const x of S.stones || []) if (x.t < 5) { const k = x.sid + '|' + x.t; G[k] = (G[k] || 0) + 1; } const k = Object.keys(G).find(k => G[k] >= 3); if (!k) break; const [sid, t] = k.split('|'); if (!stoneFuse(sid, +t)) break; n++; } return n; }
const stoneFuseN = () => { const G = {}; for (const x of S.stones || []) if (x.t < 5) { const k = x.sid + '|' + x.t; G[k] = (G[k] || 0) + 1; } return Object.values(G).reduce((a, b) => a + Math.floor(b / 3), 0); };
const STONE_SLOTS = () => SLOTS.filter(s => s.id !== 'gem' && S.equip[s.id] && stoneSockN(S.equip[s.id]) > 0);
Object.assign(MobileUI.prototype, {
  /* 属性石（11-09 重做）：上 = 带孔的装备（孔里写石头名和阶、下面一行写这件的全部效果），下 = 背包（名字 + 阶 + 数量）。点石头出底部抽屉：两类部位各加多少、下一阶、能镶的孔（标秒伤 / 坚韧变化）、合成；点孔里的石头看详情再取下 */
  win_stones(c, w, h) {
    const Fr = this.F, B = c; c = Fr.head(34); // 头：说明 + 一键合成；主体：带孔的装备 + 背包，一起上下滑
    const bag = S.stones || [], fz = stoneFuseN();
    TW(this, 12, 4, '武器、副手加伤害，护甲部位加防御；同件装备同种石头只算最高阶一颗', w - 24 - (fz ? 76 : 0), { size: 8, color: COL.dim, parent: c });
    if (fz) mkBtn(this, c, w - 84, 2, 72, 28, `一键合成 ${fz}`, () => { this.stoneReport(); this.refresh(); }, { size: 8, style: 'w' });
    c = B; let y = 4; const slots = STONE_SLOTS();
    if (!slots.length) { T_(this, c, w / 2, y + 8, '没有带孔的装备：魔法装备 1–2 孔、稀有 2–3 孔', { size: 8, color: COL.dim }); y += 30; }
    slots.forEach(sl => { const it = S.equip[sl.id], n = stoneSockN(it); it.stones = it.stones || [];
      bub(this, c, 8, y, w - 16, 46, 0x2a2236, { flat: 1 });
      T(this, 16, y + 4, sl.n, { size: 8, color: COL.dim, parent: c }); T(this, 16, y + 16, fitW(itemName(it), w - 32 - n * 40), { size: 8, color: icol(it), parent: c });
      for (let k = 0; k < n; k++) { const x = w - 16 - (n - k) * 40 + 4, st = it.stones[k], S0 = st && stoneOf(st.sid);
        bub(this, c, x, y + 4, 34, 26, st ? hx(S0.c) : 0x120e1a, { flat: !st });
        if (st) { T_(this, c, x + 17, y + 6, stoneShort(S0), { size: 8, color: '#1a1426', shadowColor: null }); T_(this, c, x + 17, y + 17, `${st.t}阶`, { size: 8, color: '#1a1426', shadowColor: null }); }
        else T_(this, c, x + 17, y + 11, '空', { size: 8, color: COL.faint });
        zoneOn(this, c, x, y + 4, 34, 26, () => st ? this.stoneSheet({ it, k }) : toast('点下面背包里的石头，抽屉里选要镶的孔')); }
      const sum = it.stones.filter(Boolean).map(x => stoneLine(it, x)).join('，');
      T(this, 16, y + 32, fitW(sum || '还没镶石头', w - 32), { size: 8, color: sum ? '#9be05a' : COL.faint, parent: c });
      y += 52; });
    // 背包
    const G = {}; for (const x of bag) { const k = x.sid + '|' + x.t; (G[k] = G[k] || []).push(x); }
    const keys = Object.keys(G).sort((a, b) => { const [sa, ta] = a.split('|'), [sb, tb] = b.split('|'); return sa === sb ? tb - ta : sa < sb ? -1 : 1; });
    T(this, 12, y + 2, `背包 · ${bag.length} 颗`, { size: 12, color: COL.emberHi, parent: c }); T(this, w - 12, y + 6, '点石头看效果、镶嵌、合成', { size: 8, color: COL.faint, align: 'right', parent: c }); y += 22;
    if (!keys.length) { T_(this, c, w / 2, y + 6, '打怪有几率掉属性石（直接进背包）', { size: 8, color: COL.dim }); return Fr.end(y + 30); }
    const TW2 = 44, TH = 38, per = Math.max(1, Math.floor((w - 16 + 4) / (TW2 + 4)));
    keys.forEach((k, i) => { const L = G[k], st = L[0], S0 = stoneOf(st.sid), x = 8 + (i % per) * (TW2 + 4), yy = y + 4 + (i / per | 0) * (TH + 4);
      bub(this, c, x, yy, TW2, TH, hx(S0.c));
      T_(this, c, x + TW2 / 2, yy + 5, stoneShort(S0), { size: 8, color: '#1a1426', shadowColor: null }); T_(this, c, x + TW2 / 2, yy + 19, `${st.t}阶`, { size: 8, color: '#1a1426', shadowColor: null });
      if (L.length > 1) { rect(this, x + TW2 - 15, yy - 3, 17, 11, '#1a1426', 1, c); T(this, x + TW2 + 1, yy - 2, '×' + L.length, { size: 8, color: L.length >= 3 && st.t < 5 ? '#ffe066' : COL.text, align: 'right', parent: c }); }
      zoneOn(this, c, x, yy, TW2, TH, () => this.stoneSheet({ s: st })); });
    Fr.end(y + 8 + Math.ceil(keys.length / per) * (TH + 4));
  },
  // 底部抽屉：背包石头（效果 / 下一阶 / 能镶的孔 / 合成）或孔里的石头（效果 / 取下）
  stoneSheet(o) {
    this.closePopup(); hideTip();
    const c = this.add.container(0, 0).setDepth(250), R = () => { refreshStats(); save(); this.refresh(); }; this.popC = c;
    rect(this, 0, 0, W, H, COL.ink, 0.6, c).setInteractive().on('pointerup', () => this.closePopup());
    const pw = W - 16, inner = this.add.container(16, 0); let y = 0; const L = (t, col, sz) => { const tt = TW(this, 0, y, t, pw - 16, { size: sz || 8, color: col || COL.text, parent: inner }); y += tt.h + 5; };
    const btns = []; // [label, fn, style, disabled, why]
    if (o.s) { const st = o.s, S0 = stoneOf(st.sid), same = (S.stones || []).filter(x => x.sid === st.sid && x.t === st.t);
      L(`${S0.n} ${st.t} 阶  ×${same.length}`, S0.c, 12);
      L(`武器 / 副手：${stoneKindLine(S0, st.t, true)}${st.t < 5 && S0.w ? `（${st.t + 1} 阶 ${stoneKindLine(S0, st.t + 1, true).replace(/^.* \+/, '+')}）` : ''}`);
      L(`护甲部位：${stoneKindLine(S0, st.t, false)}${st.t < 5 && S0.a ? `（${st.t + 1} 阶 ${stoneKindLine(S0, st.t + 1, false).replace(/^.* \+/, '+')}）` : ''}`);
      if (S0.wx) L(`武器 4 阶起额外：${statLine(S0.wx[0], S0.wx[4])}，5 阶 ${statLine(S0.wx[0], S0.wx[5])}`, COL.dim);
      const spots = []; for (const sl of STONE_SLOTS()) { const it = S.equip[sl.id]; it.stones = it.stones || []; for (let k = 0; k < stoneSockN(it); k++) { const sp = stoneSpot(it, k, st), cur = it.stones[k]; spots.push({ sl, it, k, cur, sp }); } }
      const ok = spots.filter(x => !x.sp.why).sort((a, b) => (!a.cur - !b.cur) * -1000 + b.sp.score - a.sp.score).slice(0, 4);
      L(ok.length ? '镶到哪里（按效果排，最多 4 个）：' : '身上没有能镶它的孔' + (spots.length ? `（${spots[0].sp.why}）` : ''), COL.dim);
      for (const x of ok) btns.push([`${x.cur ? '替换' : '镶到'} ${x.sl.n} 第 ${x.k + 1} 孔${x.cur ? `（${stoneOf(x.cur.sid).n}${x.cur.t}阶）` : ''} · ${stoneDeltaText(x.sp)}`, () => { stoneSocket(x.it, x.k, st); toast(stoneText(x.it, st), '#ffe066'); this.closePopup(); R(); }, x.sp.score > 0.5 ? 'w' : 'n']);
      const canF = same.length >= 3 && st.t < 5;
      btns.push([canF ? `合成 3 颗 → ${S0.n} ${st.t + 1} 阶` : st.t >= 5 ? '已是最高阶' : `合成要 3 颗（现在 ${same.length}）`, () => { if (stoneFuse(st.sid, st.t)) { toast(`合成 ${S0.n} ${st.t + 1} 阶`, '#ffe066'); R(); this.stoneSheet({ s: (S.stones || []).find(x => x.sid === st.sid && x.t === st.t) || (S.stones || []).find(x => x.sid === st.sid && x.t === st.t + 1) }); } }, 'n', !canF]);
    } else { const { it, k } = o, st = it.stones[k], S0 = stoneOf(st.sid), sl = SLOTS.find(x => S.equip[x.id] === it);
      L(`${S0.n} ${st.t} 阶`, S0.c, 12); L(`镶在 ${sl ? sl.n : ''} ${itemName(it)} 第 ${k + 1} 孔`, COL.dim);
      L(`效果：${stoneLine(it, st)}`, '#9be05a');
      const dup = (it.stones || []).find((x, j) => j !== k && x && x.sid === st.sid && x.t >= st.t); if (dup) L('同件已有同种更高阶的，这颗不生效', '#ffb27a');
      btns.push(['取下（放回背包，免费）', () => { stoneUnsocket(it, k); toast(`取回 ${S0.n} ${st.t} 阶`); this.closePopup(); R(); }, 'w']); }
    btns.push(['关闭', () => this.closePopup(), 'n']);
    const bh = 30, ph = y + 16 + btns.length * (bh + 4), py = H - NAV_H - ph;
    c.add(this.add.tileSprite(8, py, pw, ph + 8, 'n_win').setOrigin(0)); c.add(nine(this, 8, py, pw, ph + 8, 'o_frame', 8).setInteractive());
    rect(this, W / 2 - 16, py + 4, 32, 3, '#3a4280', 1, c); inner.y = py + 14; c.add(inner);
    btns.forEach(([l, fn, st, dis, why], i) => mkBtn(this, c, 16, py + 14 + y + 2 + i * (bh + 4), pw - 16, bh, l, fn, { size: 8, style: st, disabled: !!dis, whyDisabled: why || '' }));
  },
});
