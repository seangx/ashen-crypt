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
