/* ---------------- 套装（design/gear-v3.md §3、data/sets.json） ----------------
   套装件 = 稀有装备 + it.set（套装 id）：底材固定，词条照稀有随机，能上铁砧，跟随底材代数。
   身上同一套的件数 → 2 / 4 / 6 件效果；骸王之戒：每套件数 ≥ 2 的 +1。 */
const SETD = DATA.sets, SETS = SETD.list, SET_BY = Object.fromEntries(SETS.map(s => [s.id, s]));
const SET_KINDS = ['core', 'hands', 'chest', 'shoulders', 'engine', 'amulet'];
const SET_C = '#7fe08a'; // 套装的颜色（名字、掉落光柱）
const setOf = it => it && it.set ? SET_BY[it.set] : null;
const setOfGem = id => SETS.find(s => s.skills.includes(id)) || null;
// 主技能对应的套装（出手类魂龛里的技能石优先）
function mainSet() { const g = typeof mainSkillGem === 'function' ? mainSkillGem() : null; return g ? setOfGem(g.b) : null; }
// 身上每套几件（骸王之戒：≥ 2 件的 +1）
function setCounts(eq = S.equip) {
  const n = {}; for (const it of Object.values(eq)) if (it && it.set && SET_BY[it.set]) n[it.set] = (n[it.set] || 0) + 1;
  const ring = Object.values(eq).some(it => it && it.u === SETD.ring);
  if (ring) for (const k in n) if (n[k] >= 2) n[k]++;
  return n;
}
// 生效的档：[{ set, k: 2 | 4 | 6, b }]
function setTiers(eq = S.equip) {
  const out = [], n = setCounts(eq);
  for (const id in n) { const s = SET_BY[id]; for (const k of [2, 4, 6]) if (n[id] >= k && s.bonus[k]) out.push({ set: s, k, b: s.bonus[k] }); }
  return out;
}
// computeStats 里调用：加到天赋池 TA、装备池 A，机制开关进 flag
function applySets(eq, A, TA, FL) {
  for (const { b } of setTiers(eq)) {
    for (const k in b.add || {}) TA[k] = (TA[k] || 0) + b.add[k];
    for (const k in b.raw || {}) A[k] = (A[k] || 0) + b.raw[k];
    for (const k in b.flag || {}) FL[k] = (FL[k] || 0) + b.flag[k];
  }
  for (const { set, b } of setTiers(eq)) if (b.more) { const M = FL.setMore || (FL.setMore = {}); M[set.id] = (M[set.id] || 1) * (1 + b.more / 100); } // 套装技能伤害总增（暗黑 3 式的大倍数，按套分开；各档相乘，存的是倍数）
}
// 生成一件套装件（kind 不给就随机一个部位）
function newSetPiece(id, kind, ilvl) {
  const s = SET_BY[id]; kind = kind || pick(SET_KINDS); const [n, b] = s.pieces[kind];
  const it = newItem(kind, b, ilvl, 0, 2); it.set = id; it.rn = n; it.la = null; return it;
}
// 缺哪几件（身上 + 背包都算有）
function setMissing(id) {
  const have = new Set([...Object.values(S.equip), ...S.stash].filter(it => it && it.set === id).map(it => it.kind));
  return SET_KINDS.filter(k => !have.has(k));
}
// 掉落：rollItem 之前调用。boss / chest 用更高几率；主技能那套 main 的几率；Boss 保底 pity
function rollSetDrop(ilvl, src) {
  const D = SETD.drop; if (ilvl < D.minIlvl) return null;
  const pity = src === 'boss' && (S.setPity || 0) + 1 >= D.pity;
  if (!pity && rnd() >= (D[src] ?? D.normal)) { if (src === 'boss') S.setPity = (S.setPity || 0) + 1; return null; }
  S.setPity = 0;
  const ms = mainSet(), s = ms && (pity || rnd() < D.main) ? ms : pick(SETS), miss = setMissing(s.id);
  return newSetPiece(s.id, pity && miss.length ? pick(miss) : null, ilvl);
}
// 第一次推到 giftDepth 层：送主技能那套 giftN 件（缺的部位）
function setGift() {
  const D = SETD.drop; if (S.setGift || (S.maxDepth || 0) < D.giftDepth) return null;
  const s = mainSet() || SETS[0], miss = setMissing(s.id).slice(0, D.giftN); if (!miss.length) { S.setGift = 1; return null; }
  S.setGift = 1; const got = miss.map(k => newSetPiece(s.id, k, Math.max(D.minIlvl, S.maxDepth || 1)));
  for (const it of got) { it.isNew = true; S.stash.unshift(it); }
  return { set: s, items: got };
}
// 详情卡用：这一件属于哪套、身上几件、每档效果（生效的标亮）
function setLines(it) {
  const s = setOf(it); if (!s) return [];
  const n = setCounts()[s.id] || 0, out = [[`套装 · ${s.n}（身上 ${Math.min(6, n)} / 6）`, s.c]];
  for (const k of [2, 4, 6]) out.push([`${k} 件：${s.bonus[k].t}`, n >= k ? SET_C : COL.faint]);
  const miss = setMissing(s.id); if (miss.length) out.push([`还缺：${miss.map(k => KIND_N[k]).join('、')}`, COL.dim]);
  return out;
}
