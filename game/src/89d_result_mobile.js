/* 结果弹窗（手机，11-10 UX 过一遍）：批量操作做完后告诉玩家做了什么——合成出了哪些、分解了哪些、得到多少碎片和骨币。
   原来只有一行一闪而过的 toast。 */
// 碎片名：去掉数值占位（“+# 生命”→“生命”，“附加 #–# 物理伤害”→“附加物理伤害”）
const shardLabel = s => s.replace(/[+＋]?\s*#(–#)?\s*%?/g, ' ').replace(/附加\s+/, '附加').replace(/\s+/g, ' ').trim();
Object.assign(MobileUI.prototype, {
  // items：要画成格子的物品（最多 3 行）；lines：[{t, c, s}] 或字符串
  resultPop(title, items = [], lines = []) {
    this.popup((p, w) => {
      let y = 0; T(this, 0, y, title, { color: COL.emberHi, parent: p }); y += 20;
      const st = 34, cols = Math.max(1, Math.floor(w / st)), max = cols * 3, show = items.slice(0, max);
      show.forEach((it, i) => mkCell(this, p, (i % cols) * st, y + (i / cols | 0) * st, it, { size: 32, direct: true, onClick: () => { } }));
      if (show.length) y += Math.ceil(show.length / cols) * st + 2;
      if (items.length > max) { T(this, 0, y, `另 ${items.length - max} 件`, { size: 8, color: COL.faint, parent: p }); y += 12; }
      for (const l of lines) { if (!l) continue; const o = typeof l === 'string' ? { t: l } : l; const r = TW(this, 0, y, o.t, w, { size: o.s || 8, color: o.c || COL.text, parent: p }); y += r.h + 3; }
      return y;
    });
  },
  // 分解 / 拆解的结果：跑 run() 前后比对储物箱、碎片、骨币
  salvReport(title, list, run) {
    const sh0 = { ...S.shards }, c0 = S.coins || 0, cand = [...list];
    run();
    const gone = cand.filter(it => !S.stash.includes(it) && !Object.values(S.equip).includes(it));
    if (!gone.length) return toast('没有分解任何东西', COL.dim);
    const by = {}; for (const it of gone) { const k = it.kind === 'gem' ? '技能石' : rarName(it); by[k] = (by[k] || 0) + 1; }
    const dk = Object.keys(S.shards).map(k => [k, (S.shards[k] || 0) - (sh0[k] || 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
    const tot = dk.reduce((a, x) => a + x[1], 0), coins = (S.coins || 0) - c0;
    const lines = [`${gone.length} 件：${Object.entries(by).map(([k, n]) => `${k} ${n}`).join(' · ')}`];
    if (tot) lines.push({ t: `词条碎片 +${tot}：${dk.slice(0, 8).map(([k, n]) => `${AFF_BY[k] ? shardLabel(affName(AFF_BY[k])) : k} ×${n}`).join('，')}${dk.length > 8 ? ` 等 ${dk.length} 种` : ''}`, c: '#d9cfb8' });
    if (coins) lines.push({ t: `骨币 +${coins}`, c: COL.emberHi });
    sfx('craft'); this.resultPop(title, gone, lines);
  },
  // 宝石 / 辅助石一键合成
  mergeReport() {
    const lv0 = new Map([...S.stash.filter(y => y.kind === 'gem'), ...S.mods].map(x => [x, x.lvl]));
    const r = mergeAll(); if (!r.n) return toast('没有能合成的', COL.dim);
    const ups = r.ups.sort((a, b) => b.lvl - a.lvl);
    sfx('craft'); this.resultPop(`合成 ${r.n} 次`, ups, [`三个同名同等级合成一个高一级的：`, ...ups.map(x => ({ t: `${x.kind === 'mod' ? MOD_BY[x.mid].n : itemName(x)}：${lv0.get(x) || x.lvl - 1} 级 → ${x.lvl} 级`, c: '#ffe066' }))]);
  },
  // 属性石一键合成
  stoneReport() {
    const before = new Set(S.stones || []), n = stoneFuseAll(); if (!n) return toast('没有能合成的', COL.dim);
    const made = (S.stones || []).filter(s => !before.has(s)), g = {};
    for (const s of made) { const k = `${(stoneOf(s.sid) || { n: s.sid }).n} ${s.t} 阶`; g[k] = (g[k] || 0) + 1; }
    sfx('craft'); this.resultPop(`合成 ${n} 次`, [], ['三颗同种同阶合成一颗高一阶的，得到：', ...Object.entries(g).map(([k, c]) => ({ t: `${k}${c > 1 ? ' ×' + c : ''}`, c: '#ffe066' }))]);
  },
});
/* 结算页“伤害统计”（11-11 用户要求）：这一趟按来源分的伤害（技能、普攻、灼烧、疫病、余震、碎冰、审判处决、命中效果……），
   只算实际扣掉的血（不算溢出）。前 8 项单列，其余合成一行；对比面板秒伤和这一趟的平均秒伤（平均值含走路、等怪、换层的时间）。 */
Object.assign(MobileUI.prototype, {
  dmgStat(c, w, y, r) {
    const D = r.dstat; if (!D) return y; const L = Object.entries(D).filter(x => x[1].d > 0).sort((a, b) => b[1].d - a[1].d); if (!L.length) return y;
    const tot = L.reduce((s, x) => s + x[1].d, 0), t = Math.max(1, r.t || 1), top = L.slice(0, 8), rest = L.slice(8);
    if (rest.length) top.push([`其他 ${rest.length} 项`, rest.reduce((a, [, e]) => ({ d: a.d + e.d, n: a.n + e.n, c: a.c + e.c }), { d: 0, n: 0, c: 0 })]);
    T(this, 12, y, '伤害统计', { size: 8, color: COL.dim, parent: c });
    T(this, w - 12, y, `总伤害 ${fmt(tot)} · 平均秒伤 ${fmt(tot / t)}`, { size: 8, color: COL.text, align: 'right', parent: c }); y += 13;
    y += TW(this, 12, y, `面板秒伤 ${fmt(STATS.dps)}（只算单个目标、一直在打）；平均秒伤按这一趟总时长算，含走路、等怪、换层。`, w - 24, { size: 8, color: COL.faint, parent: c }).h + 4;
    const nx = 12, nw = 74, bx = nx + nw + 4, bw = w - 12 - bx - 96, max = top[0][1].d;
    for (const [k, e] of top) {
      T(this, nx, y + 1, k, { size: 8, parent: c });
      rect(this, bx, y + 2, bw, 8, '#1a1626', 1, c); rect(this, bx, y + 2, Math.max(1, Math.round(bw * e.d / max)), 8, COL.ember, 0.9, c);
      T(this, w - 12, y + 1, `${(e.d / tot * 100).toFixed(e.d / tot < 0.1 ? 1 : 0)}% · ${fmt(e.d / t)}/秒`, { size: 8, color: COL.dim, align: 'right', parent: c });
      y += 13;
      if (e.n) { T(this, bx, y - 1, `命中 ${fmt(e.n)} 次 · 平均每下 ${fmt(e.d / e.n)}${e.c ? ` · 暴击 ${Math.round(e.c / e.n * 100)}%` : ''}`, { size: 8, color: COL.faint, parent: c }); y += 11; }
    }
    return y + 8;
  },
});
