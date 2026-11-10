/* =========================================================
   专有名词说明（11-10 用户要求）：自动换行的文字（TW）里出现 data/glossary.json 的名词时，
   在名词下面画一条下划线、盖一块点击区，点开弹出说明（叠在其他弹窗上面；说明里的名词还能继续点，有“返回”）。
   - 每段文字里同一个名词只标第一次；居中 / 靠右对齐的文字不标；TW 传 gloss:false 关掉（整张卡片可点的地方用）。
   - 说明里的 {EFX.sunMax} 读游戏数据，{%X.y} 乘 100。
   ========================================================= */
const GLOSS = DATA.glossary, GLOSS_T = GLOSS.terms;
const GLOSS_M = (() => { const L = []; for (const id in GLOSS_T) { const g = GLOSS_T[id]; for (const s of g.m || [g.n, ...(g.aka || [])]) if (s) L.push([s, id]); } L.sort((a, b) => b[0].length - a[0].length); const by = {}; for (const x of L) (by[x[0][0]] = by[x[0][0]] || []).push(x); return by; })();
const GLOSS_ROOTS = { EFX, MECH, LST, SOUL, TRG, CLS, PLAYER };
function glossText(id) {
  const g = GLOSS_T[id]; if (!g) return '';
  if (g.fx) return FX_TEXT[g.fx] + '。来自传奇词条和部分神话装备。';
  return g.d.replace(/\{(%?)([A-Z]+)\.([\w.]+)\}/g, (all, pct, root, path) => { let v = GLOSS_ROOTS[root]; for (const k of path.split('.')) v = v == null ? v : v[k]; if (typeof v !== 'number') return '?'; v = pct ? v * 100 : v; return String(Math.round(v * 100) / 100); });
}
// 找出一段文字里的名词：返回 [{ at, len, id }]（不重叠、同一个名词只取第一次）
function glossFind(str, skip) {
  const out = [], seen = new Set(skip ? [skip] : []);
  for (let i = 0; i < str.length;) { const C = GLOSS_M[str[i]]; let hit = null;
    if (C) for (const [s, id] of C) if (str.startsWith(s, i)) { hit = [s, id]; break; }
    if (hit && !seen.has(hit[1])) { seen.add(hit[1]); out.push({ at: i, len: hit[0].length, id: hit[1] }); i += hit[0].length; } else i += hit ? hit[0].length : 1; }
  return out;
}
// TW 画完以后调用：t 是文字对象，lines 是换行后的各行
function glossLink(sc, t, lines, s, o) {
  if (!sc.glossOpen || o.gloss === false || (o.align && o.align !== 'left') || o.scale) return;
  const flat = lines.join(''), hits = glossFind(flat, o.glossSkip); if (!hits.length) return;
  const lh = LH[s], par = o.parent, add = x => { if (par) par.add(x); return x; };
  const pos = []; lines.forEach((ln, li) => { let x = 0; for (const ch of ln) { const w = charW(ch, s); pos.push({ li, x, w }); x += w; } });
  for (const h of hits) {
    const segs = []; for (let k = h.at; k < h.at + h.len; k++) { const p = pos[k]; if (!p) break; const g = segs[segs.length - 1]; if (g && g.li === p.li) g.w = p.x + p.w - g.x; else segs.push({ li: p.li, x: p.x, w: p.w }); }
    for (const g of segs) {
      const x = t.x + g.x, y = t.y + g.li * lh;
      add(sc.add.rectangle(x, y + lh - 1, g.w, 1, hex(COL.emberHi), 0.85).setOrigin(0));
      const z = add(sc.add.zone(x - 2, y - 3, g.w + 4, lh + 6).setOrigin(0).setInteractive()); z.glossId = h.id;
      z.on('pointerup', () => { if (sc.tcD && sc.tcD.off) return; sfx('click'); sc.glossOpen(h.id); });
    }
  }
}
Object.assign(MobileUI.prototype, {
  glossOpen(id) { if (!GLOSS_T[id]) return; hideTip(); this.glossStack = this.glossC ? [...(this.glossStack || []), id] : [id]; this.glossRender(); },
  glossBack() { (this.glossStack || []).pop(); if (this.glossStack.length) this.glossRender(); else this.glossClose(); },
  glossClose() { if (this.glossF) { this.glossF.destroy(); this.glossF = null; } if (this.glossC) { this.glossC.destroy(); this.glossC = null; } this.glossStack = []; },
  glossRender() {
    if (this.glossF) { this.glossF.destroy(); this.glossF = null; } if (this.glossC) { this.glossC.destroy(); this.glossC = null; }
    this.initTapCancel(); const id = this.glossStack[this.glossStack.length - 1], g = GLOSS_T[id];
    const c = this.add.container(0, 0).setDepth(400); this.glossC = c;
    rect(this, 0, 0, W, H, COL.ink, 0.5, c).setInteractive().on('pointerup', () => this.glossClose());
    const pw = W - 40, iw = pw - 20, maxH = H - NAV_H - 60;
    const F = new MFrame(this, 30, 0, iw, 10, 'gloss', 401); this.glossF = F; this.scrollPos = this.scrollPos || {}; this.scrollPos.gloss = 0;
    const b = F.body; let y = 0;
    T(this, 0, y, g.n, { color: COL.emberHi, parent: b }); T(this, iw, y + 3, g.cat, { size: 8, color: COL.faint, align: 'right', parent: b }); y += 18;
    y += TW(this, 0, y, glossText(id), iw, { size: 12, color: COL.text, parent: b, glossSkip: id }).h + 6;
    const see = (g.see || []).filter(k => GLOSS_T[k] && k !== id);
    if (see.length) { T(this, 0, y, '相关', { size: 8, color: COL.dim, parent: b }); y += 12; const per = 3, bw = Math.floor((iw - (per - 1) * 4) / per);
      see.forEach((k, i) => mkBtn(this, b, (i % per) * (bw + 4), y + (i / per | 0) * 30, bw, 26, GLOSS_T[k].n, () => this.glossOpen(k), { size: 8 })); y += Math.ceil(see.length / per) * 30; }
    F.end(y);
    const ph = Math.min(maxH, Math.ceil(y) + 58), py = Math.round(Math.max(16, (H - NAV_H - ph) / 2));
    c.add(this.add.tileSprite(23, py + 3, pw - 6, ph - 6, 'n_win').setOrigin(0)); c.add(nine(this, 20, py, pw, ph, 'o_frame', 8).setInteractive());
    const fc = F.foot(38), back = this.glossStack.length > 1, bw = Math.floor((iw - 4) / 2);
    if (back) mkBtn(this, fc, 0, 6, bw, 30, '返回', () => this.glossBack(), { size: 8 });
    mkBtn(this, fc, back ? bw + 4 : 0, 6, back ? bw : iw, 30, '关闭', () => this.glossClose(), { size: 8 });
    F.y = py + 10; F.h = ph - 20; F.build(); for (const f of F.pending || []) f(); F.pending = null;
  },
  // 帮助页“名词”：按分类列出全部名词
  glossIndex(c, w, y) {
    const per = 3, bw = Math.floor((w - 24 - (per - 1) * 4) / per);
    for (const cat of GLOSS.cats) { const ids = Object.keys(GLOSS_T).filter(k => GLOSS_T[k].cat === cat); if (!ids.length) continue;
      T(this, 12, y, cat, { size: 8, color: COL.dim, parent: c }); y += 13;
      ids.forEach((k, i) => mkBtn(this, c, 12 + (i % per) * (bw + 4), y + (i / per | 0) * 30, bw, 26, GLOSS_T[k].n, () => this.glossOpen(k), { size: 8 })); y += Math.ceil(ids.length / per) * 30 + 6; }
    return y;
  },
});
