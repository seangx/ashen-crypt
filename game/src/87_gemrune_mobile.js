/* =========================================================
   技能石 / 符文交互（只进手机包）：堆叠、筛选排序、详情对比、选择器、一键镶嵌、批量拆解
   设计见 design/spec-gem-rune-ux.md；不改存档结构，堆叠只是显示分组
   ========================================================= */
let runeF = 'all', runeSort = 'lvl', runePage = 0, gemF = 'all', gemSort = 'lvl';
const RUNE_SOFT = 150, LV_BANDS = ['1–5', '6–10', '11–15', '16+'];
const runeKey = m => m.mid + '|' + m.lvl;
const gemKey = g => (g.mods || []).some(Boolean) ? 'u' + g.id : [g.b, g.lvl, g.q || 0, g.sock].join('|');
const bandOf = lvl => Math.min(3, Math.floor((Math.max(1, lvl) - 1) / 5));
function stackBy(list, key) { const M = new Map(); for (const x of list) { const k = key(x); if (!M.has(k)) M.set(k, []); M.get(k).push(x); } return [...M.values()]; }
const hostMetric = () => modWeapon === 'engine' ? (STATS.engine ? STATS.engine.avg : 0) : STATS.dps;
function previewSwap(host, k, m) { const old = host.mods[k], before = hostMetric(); host.mods[k] = m; refreshStats(); const after = hostMetric(); host.mods[k] = old; refreshStats(); return { before, after }; }
const deltaTxt = (a, b) => { const d = a ? (b - a) / a : 0; return `${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}%`; };
function socketRune(host, k, m) { const old = host.mods[k]; host.mods[k] = m; S.mods = S.mods.filter(x => x !== m); if (old) S.mods.unshift(old); m.isNew = false; refreshStats(); save(); }
function unsocketAll(host) { let n = 0; host.mods = host.mods.map(m => { if (m) { S.mods.unshift(m); n++; } return null; }); refreshStats(); save(); return n; }
const runeCands = host => stackBy(S.mods.filter(m => modActive(m, host)), runeKey).map(s => s.sort((a, b) => b.xp - a.xp)[0]);
function autoSocket(host) {
  let n = 0;
  for (let k = 0; k < host.sock; k++) {
    if (host.mods[k]) continue;
    const cands = runeCands(host).sort((a, b) => b.lvl - a.lvl).slice(0, 12); if (!cands.length) break;
    let best = cands[0], bv = -Infinity;
    if (host.kind !== 'hub') for (const m of cands) { const v = previewSwap(host, k, m).after; if (v > bv) { bv = v; best = m; } }
    socketRune(host, k, best); n++;
  }
  return n;
}
const runeYield = m => 1 + Math.floor(m.lvl / 5), gemYield = g => 2 + Math.floor(g.lvl / 5);
function giveShards(n) { for (let i = 0; i < n; i++) { const k = rollShard(Math.max(1, S.maxDepth || 1)); S.shards[k] = (S.shards[k] || 0) + 1; } return n; }
function salvageRune(m) { if (!S.mods.includes(m)) return 0; S.mods = S.mods.filter(x => x !== m); return giveShards(runeYield(m)); } // 只拆库存里的
function salvageGem(g) { if (!S.stash.includes(g) || g.kind !== 'gem') return 0; const n = gemYield(g); removeItem(g); return giveShards(n); } // 只拆背包里的；插着的符文退回库存
const rbRunes = sel => S.mods.filter(m => sel[bandOf(m.lvl)]);
const rbGems = sel => S.stash.filter(g => g.kind === 'gem' && sel[bandOf(g.lvl)]);

Object.assign(MobileUI.prototype, {
  chipRow(c, x, y, w, opts, cur, fn) { // 筛选小按钮：[[值, 文字], …]
    const bw = Math.floor((w - (opts.length - 1) * 2) / opts.length);
    opts.forEach(([v, n], i) => mkBtn(this, c, x + i * (bw + 2), y, bw, 28, n, () => fn(v), { size: 8, style: cur === v ? 'w' : 'n' }));
  },
  badge(c, x, y, s, n, anyNew) {
    if (n > 1) { rect(this, x + s - 17, y + 1, 16, 9, COL.ink, 0.8, c); T(this, x + s - 2, y + 1, '×' + n, { size: 'num', color: COL.emberHi, align: 'right', parent: c }); }
    if (anyNew) rect(this, x + 2, y + 2, 4, 4, COL.ember, 1, c);
  },
  /* 符文页 */
  win_mods(c, w, h) {
    const host = S.equip[modWeapon], hosts = ['gem', 'core', 'engine', 'hub'].filter(s => s !== 'gem' || unlocked('gems') || S.equip.gem), bw = Math.floor((w - 20) / hosts.length); this.sockR = [];
    hosts.forEach((s, i) => mkBtn(this, c, 10 + i * bw, 6, bw - 2, 28, SLOTS.find(x => x.id === s).n, () => { modWeapon = s; runePage = 0; this.refresh(); }, { size: 8, style: modWeapon === s ? 's' : 'n' }));
    let y = 40;
    if (!host) { T(this, 10, y + 4, '这个位置没有装备。', { size: 8, color: COL.faint, parent: c }); y += 20; }
    else {
      mkCell(this, c, 10, y, host, { size: TOUCH, direct: true, onClick: () => {} });
      T(this, 46, y + 1, itemName(host), { color: icol(host), parent: c });
      T(this, 46, y + 16, host.kind === 'hub' ? '升级槽：符文在这里成长，力场符文在这里生效' : `符文槽 ${host.mods.filter(Boolean).length}/${host.sock} · ${modWeapon === 'engine' ? '冲刺伤害' : '秒伤'} ${fmt(hostMetric())}`, { size: 8, color: COL.dim, parent: c });
      y += 36;
      if (!host.sock) { T(this, 10, y, '这件装备没有符文槽。', { size: 8, color: COL.faint, parent: c }); y += 14; }
      for (let i = 0; i < host.sock; i++) {
        const m = host.mods[i], x = 10 + i * 34;
        if (host.kind === 'hub') rect(this, x - 2, y - 2, 34, 34, '#c08a1c', 1, c);
        this.sockR[i] = { x, y, s: 30 };
        mkCell(this, c, x, y, m, { size: 30, host, direct: true, onHover: v => { if (v) showTip(modTip(v, host)); }, onOut: hideTip, onClick: v => { if (this.drag && this.drag.moved) return; if (v && feedOn && feedSrc && feedSrc !== v) return this.doFeed(v); v ? this.socketDetail(host, i) : this.openPicker(host, i); } });
        if (!m) T(this, x + 15, y + 15, '+', { color: COL.faint, align: 'center', valign: 'middle', parent: c });
      }
      if (host.sock) {
        const hw = Math.floor((w - 24) / 2); y += 36;
        mkBtn(this, c, 10, y, hw, 28, '一键镶嵌', () => { const n = autoSocket(host); toast(n ? `镶入 ${n} 枚符文` : host.mods.includes(null) ? '没有能在这里生效的符文' : '槽已经满了'); this.refresh(); }, { size: 8, style: 'w', disabled: !host.mods.includes(null) });
        mkBtn(this, c, 14 + hw, y, hw, 28, '全部卸下', () => { const n = unsocketAll(host); toast(`卸下 ${n} 枚`); this.refresh(); }, { size: 8, disabled: !host.mods.some(Boolean) });
        y += 32;
      }
    }
    rect(this, 10, y, w - 20, 1, '#33293f', 1, c); y += 5;
    const over = S.mods.length > RUNE_SOFT;
    T(this, 10, y + 8, `符文库存 ${S.mods.length}${over ? ` · 超过 ${RUNE_SOFT}，建议拆一些` : ''}`, { size: 8, color: over ? COL.bad : COL.dim, parent: c });
    const fw = unlocked('feed') ? 52 : 0;
    if (fw) mkBtn(this, c, w - 10 - 56 - fw, y, fw, 26, feedOn ? '喂养开' : '喂养', () => { feedOn = !feedOn; feedSrc = null; this.refresh(); }, { size: 8, style: feedOn ? 's' : 'n' });
    mkBtn(this, c, w - 64, y, 54, 26, '批量拆', () => this.openRBulk(), { size: 8, style: over ? 'w' : 'n' }); y += 30;
    this.chipRow(c, 10, y, w - 20, [['all', '全部'], ['fit', '适用'], ['new', '新'], ['field', '力场'], ['sort', runeSort === 'lvl' ? '等级↓' : '名称']], runeF, v => { if (v === 'sort') runeSort = runeSort === 'lvl' ? 'name' : 'lvl'; else runeF = v; runePage = 0; this.refresh(); }); y += 30;
    const F = { all: () => true, fit: m => host && modActive(m, host), new: m => m.isNew, field: m => MOD_BY[m.mid].field }[runeF] || (() => true);
    const stacks = stackBy(S.mods.filter(F), runeKey).sort(runeSort === 'lvl' ? (a, b) => b[0].lvl - a[0].lvl || MOD_BY[a[0].mid].n.localeCompare(MOD_BY[b[0].mid].n) : (a, b) => MOD_BY[a[0].mid].n.localeCompare(MOD_BY[b[0].mid].n) || b[0].lvl - a[0].lvl);
    const cols = MCOLS, st = TOUCH, x0 = Math.round((w - cols * st) / 2), rows = Math.max(1, Math.floor((h - y - 52) / st)), per = cols * rows, pages = Math.max(1, Math.ceil(stacks.length / per));
    runePage = clamp(runePage, 0, pages - 1);
    if (!stacks.length) TW(this, 12, y + 6, S.mods.length ? { fit: host ? `没有能在${SLOTS.find(s => s.id === modWeapon).n}上生效的符文。` : '先选一个有装备的部位。', new: '没有新符文。', field: '没有力场符文（力场符文只在法阵里生效）。' }[runeF] || '没有符合的符文。' : '还没有符文。打怪会掉落，Boss 宝箱里也有。', w - 24, { size: 8, color: COL.dim, parent: c });
    if (!stacks.length && runeF !== 'all' && S.mods.length) mkBtn(this, c, 12, y + 34, 96, 28, '显示全部', () => { runeF = 'all'; this.refresh(); }, { size: 8 });
    stacks.slice(runePage * per, runePage * per + per).forEach((sk, i) => {
      const x = x0 + (i % cols) * st, yy = y + (i / cols | 0) * st, rep = sk[0];
      if (feedOn && sk.includes(feedSrc)) rect(this, x - 1, yy - 1, st, st, COL.ember, 1, c);
      mkCell(this, c, x, yy, { ...rep, isNew: false }, { size: st, host, direct: true, onHover: v => showTip(modTip(v, host)), onOut: hideTip, onDown: (v, p) => { if (!feedOn) this.drag = { m: rep, x: p.worldX, y: p.worldY, moved: false }; }, onClick: () => {
        if (this.drag && this.drag.moved) return;
        if (feedOn) { const v = sk.find(x => x !== feedSrc) || rep; if (!feedSrc) { feedSrc = v; return this.refresh(); } if (sk.includes(feedSrc) && sk.length === 1) { feedSrc = null; return this.refresh(); } return this.doFeed(v); }
        this.runeDetail(sk, host);
      } });
      this.badge(c, x, yy, st, sk.length, sk.some(m => m.isNew));
    });
    const by = y + rows * st + 2;
    if (pages > 1) { mkBtn(this, c, 10, by, 40, 26, '<', () => { runePage--; this.refresh(); }, { disabled: runePage <= 0 }); T(this, w / 2, by + 13, `${runePage + 1} / ${pages}`, { size: 8, color: COL.dim, align: 'center', valign: 'middle', parent: c }); mkBtn(this, c, w - 50, by, 40, 26, '>', () => { runePage++; this.refresh(); }, { disabled: runePage >= pages - 1 }); }
    else TW(this, 10, by + 4, feedOn ? (feedSrc ? `已选 ${MOD_BY[feedSrc.mid].n} 当饲料，再点要喂的符文。` : '先点一个符文当饲料。') : '同名同级的符文叠在一起。点空槽挑符文，点库存看详情和秒伤变化。', w - 20, { size: 8, color: feedOn ? COL.emberHi : COL.faint, parent: c });
  },
  runeDetail(sk, host) {
    const m = sk[0], d = MOD_BY[m.mid], L = [...modTip(m, host)], A = [];
    L.push({ t: `库存 ${sk.length} 枚`, s: 8, c: COL.dim });
    if (host) {
      const same = host.mods.filter(x => x && x.mid === m.mid); if (same.length) L.push({ t: `当前已插：${same.map(x => x.lvl + ' 级').join('、')}`, s: 8, c: COL.cyan });
      if (!modActive(m, host)) L.push({ t: `插在${SLOTS.find(s => s.id === modWeapon).n}上不生效`, s: 8, c: COL.bad });
      let k = host.mods.indexOf(null), rep = false;
      if (host.sock && k < 0) { rep = true; let wv = -Infinity; host.mods.forEach((x, i) => { const v = host.kind === 'hub' ? -x.lvl : previewSwap(host, i, m).after; if (v > wv) { wv = v; k = i; } }); }
      if (host.sock && k >= 0) {
        if (host.kind !== 'hub') { const { before, after } = previewSwap(host, k, m); L.push({ t: `${rep ? `替换第 ${k + 1} 格（${MOD_BY[host.mods[k].mid].n}）：` : ''}${modWeapon === 'engine' ? '冲刺伤害' : '秒伤'} ${fmt(before)} → ${fmt(after)}（${deltaTxt(before, after)}）`, c: after >= before ? COL.good : COL.bad }); }
        A.push({ l: rep ? '替换' : '镶嵌', style: 'w', fn: () => { socketRune(host, k, m); this.refresh(); } });
      }
    }
    if (feedOn === false && unlocked('feed') && sk.length > 1) A.push({ l: '喂给同类', fn: () => { feedSrc = sk[1]; this.doFeed(m); } });
    A.push({ l: '拆解 1 枚', fn: () => this.ask(`拆解 1 枚 ${d.n}（${m.lvl} 级）？`, () => { const n = salvageRune(sk[sk.length - 1]); toast(`得到 ${n} 个词条碎片`, '#d9cfb8'); save(); this.refresh(); }, '拆解', `得到 ${runeYield(m)} 个随机词条碎片，不能撤销。`) });
    sk.forEach(x => { x.isNew = false; });
    this.showLines(L, A);
  },
  socketDetail(host, i) {
    const m = host.mods[i];
    this.showLines(modTip(m, host), [{ l: '卸下', fn: () => { host.mods[i] = null; S.mods.unshift(m); refreshStats(); save(); this.refresh(); } }, { l: '换一个', style: 'w', fn: () => this.openPicker(host, i) }]);
  },
  openPicker(host, k) { // 只列能在这里生效的符文，按预估增益排序
    const cands = runeCands(host).sort((a, b) => b.lvl - a.lvl).slice(0, 24), n = {}; S.mods.forEach(m => { n[runeKey(m)] = (n[runeKey(m)] || 0) + 1; });
    const rows = cands.map(m => { if (host.kind === 'hub') return { m, v: m.lvl, t: '' }; const { before, after } = previewSwap(host, k, m); return { m, v: after - before, t: deltaTxt(before, after) }; }).sort((a, b) => b.v - a.v).slice(0, 10);
    this.popup((p, pw) => {
      T(this, 0, 0, `第 ${k + 1} 格 · 能在${SLOTS.find(s => s.id === modWeapon).n}上生效的符文`, { size: 8, color: COL.emberHi, parent: p });
      if (!rows.length) { TW(this, 0, 16, '没有能在这里生效的符文。换个部位，或者去打怪攒符文。', pw, { size: 8, color: COL.faint, parent: p }); return 40; }
      rows.forEach((r, i) => mkBtn(this, p, 0, 16 + i * 32, pw, 30, `${MOD_BY[r.m.mid].n} ${r.m.lvl}级${n[runeKey(r.m)] > 1 ? ' ×' + n[runeKey(r.m)] : ''}   ${r.t}`, () => { this.closePopup(); socketRune(host, k, r.m); sfx('craft'); this.refresh(); }, { size: 8, icon: 'mod_' + r.m.mid, iconX: 6, labelX: 28, style: i === 0 ? 'w' : 'n' }));
      return 16 + rows.length * 32;
    }, [], '取消');
  },
  /* 装备页 · 技能石页 */
  gemPane(c, w, h, y) {
    this.paneC = null;
    this.chipRow(c, 10, y, w - 20, [['all', '全部'], ['new', '新'], ['form', '同形态'], ['sort', gemSort === 'lvl' ? '等级↓' : '品质↓']], gemF, v => { if (v === 'sort') gemSort = gemSort === 'lvl' ? 'q' : 'lvl'; else gemF = v; this.refresh(); }); y += 30;
    const cur = S.equip.gem && GEM_BY[S.equip.gem.b], F = { all: () => true, new: g => g.isNew, form: g => cur && GEM_BY[g.b].form === cur.form }[gemF] || (() => true);
    const all = S.stash.filter(g => g.kind === 'gem'), stacks = stackBy(all.filter(F), gemKey).sort(gemSort === 'lvl' ? (a, b) => b[0].lvl - a[0].lvl || (b[0].q || 0) - (a[0].q || 0) : (a, b) => (b[0].q || 0) - (a[0].q || 0) || b[0].lvl - a[0].lvl);
    const cols = MCOLS, st = TOUCH, x0 = Math.round((w - cols * st) / 2);
    if (!stacks.length) TW(this, 12, y + 6, all.length ? { new: '没有新技能石。', form: cur ? `没有和${cur.n}同形态的技能石。` : '身上还没有技能石。' }[gemF] || '没有符合的技能石。' : '背包里没有技能石。Boss 宝箱和精英会掉。', w - 24, { size: 8, color: COL.dim, parent: c });
    if (!stacks.length && gemF !== 'all' && all.length) mkBtn(this, c, 12, y + 34, 96, 28, '显示全部', () => { gemF = 'all'; this.refresh(); }, { size: 8 });
    stacks.slice(0, cols * 8).forEach((sk, i) => {
      const x = x0 + (i % cols) * st, yy = y + (i / cols | 0) * st;
      mkCell(this, c, x, yy, sk[0], { size: st, upg: true, acts: v => { sk.forEach(g => { g.isNew = false; }); return this.itemActs(v); } });
      this.badge(c, x, yy, st, sk.length, sk.some(g => g.isNew));
    });
    const ty = y + Math.max(1, Math.ceil(Math.min(stacks.length, cols * 8) / cols)) * st + 6;
    TW(this, 12, ty, `技能石 ${all.length} 颗（占背包格）。同底材、同等级、同品质、同槽数的叠在一起；点开看详情和与身上那颗的对比。「批量」可按等级拆符文和技能石。`, w - 24, { size: 8, color: COL.faint, parent: c });
  },
  /* 批量拆解：符文 + 技能石（只动库存 / 背包里的） */
  openRBulk() { this.rb = { r: [true, false, false, false], g: [false, false, false, false] }; this.openWin('rbulk'); },
  win_rbulk(c, w, h) {
    const rb = this.rb || (this.rb = { r: [true, false, false, false], g: [false, false, false, false] }); let y = 14;
    const sec = (title, key, list) => {
      T(this, 12, y, title, { size: 8, color: COL.emberHi, parent: c }); y += 14;
      const bw = Math.floor((w - 24 - 6) / 4);
      LV_BANDS.forEach((n, i) => { const k = list.filter(x => bandOf(x.lvl) === i).length; mkBtn(this, c, 12 + i * (bw + 2), y, bw, 30, `${n}级 ×${k}`, () => { rb[key][i] = !rb[key][i]; this.refresh(); }, { size: 8, style: rb[key][i] ? 's' : 'n' }); });
      y += 38;
    };
    sec('符文（库存里未镶嵌的）', 'r', S.mods); sec('技能石（背包里的，不含身上那颗）', 'g', S.stash.filter(g => g.kind === 'gem'));
    const R = rbRunes(rb.r), Gm = rbGems(rb.g), n = R.reduce((a, m) => a + runeYield(m), 0) + Gm.reduce((a, g) => a + gemYield(g), 0);
    TW(this, 12, y, `将拆解：符文 ${R.length} 枚、技能石 ${Gm.length} 颗\n预计得到 ${n} 个随机词条碎片${Gm.some(g => (g.mods || []).some(Boolean)) ? '\n技能石上插着的符文会退回库存' : ''}`, w - 24, { size: 8, color: COL.text, parent: c }); y += 44;
    TW(this, 12, y, '身上的技能石和槽里的符文永远不会被拆。', w - 24, { size: 8, color: COL.faint, parent: c });
    mkBtn(this, c, 12, h - 44, w - 24, 30, '拆解', () => this.ask(`拆解 ${R.length} 枚符文、${Gm.length} 颗技能石？`, () => { let k = 0; R.forEach(m => { k += salvageRune(m); }); Gm.forEach(g => { k += salvageGem(g); }); save(); toast(`得到 ${k} 个词条碎片`, '#d9cfb8'); sfx('craft'); this.refresh(); }, '拆解', '不能撤销。'), { style: 'r', disabled: !R.length && !Gm.length });
  },
});
