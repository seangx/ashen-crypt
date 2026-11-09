/* ---------- 专精（design/mastery-v1.md）：替换星盘天赋 ----------
   6 个专精 = tree.json 的 6 个区，内容原样搬：专精条（原小节点之和摊开）、被动（原中节点，1–5 级）、大天赋（原大天赋，挂在一个被动下）。
   只能选 2 个专精（第 2 个 Lv10 开放），每级 1 点；随时免费单点退、全部洗点。
   存档：S.mst = { picks: [专精 id], bar: {专精: 点数}, pas: {被动 id: 级}, key: {大天赋 id: 1} } */
const MST = DATA.mastery;
const MASTERY = TREE_BRANCH.map(B => {
  const CL = TREE_CLUSTERS[B.id] || [];
  const pass = [{ n: B.notable[0].n, add: B.notable[0].add }, { n: B.notable[1].n, add: B.notable[1].add }, ...CL.map(C => ({ n: C.nn, add: C.nadd }))]
    .map((p, j) => ({ ...p, id: `${B.id}p${j}`, m: B.id, tier: MST.tiers.pass[j] }));
  const mk = (id, K, need, tier) => ({ id, m: B.id, n: K.n, add: K.add || {}, more: K.more, flag: K.flag, d: keyText(K), need, tier });
  const keys = [mk(`${B.id}8`, B.key, `${B.id}p1`, MST.tiers.key[0]), ...CL.map((C, ci) => mk(`${B.id}c${ci}_6`, C.key, `${B.id}p${2 + ci}`, MST.tiers.key[1 + ci]))]; // id 沿用星盘的，sim 的流派配置不用改
  return { id: B.id, n: B.n, c: B.c, bar: MST.bar[B.id] || {}, pass, keys };
});
// 内环（元素环）的大天赋和两个被动，按 mastery.json 的 elem / elemPass 拆进专精
(DATA.tree.bridgeKey || []).forEach((BK, i) => {
  if (BK.k) { const fk = Object.keys(BK.flag || {})[0], M = MASTERY.find(x => x.id === MST.elem[fk]); if (M) M.keys.push({ id: `sk${i}`, m: M.id, n: BK.n, add: BK.add || {}, flag: BK.flag, d: BK.d, need: null, tier: MST.tiers.elemBar, elem: 1 }); }
  else { const M = MASTERY.find(x => x.id === (MST.elemPass || {})[BK.n]); if (M) M.pass.push({ id: `sk${i}`, m: M.id, n: BK.n, add: BK.add || {}, tier: 10, elem: 1 }); }
});
const MST_BY = Object.fromEntries(MASTERY.map(M => [M.id, M]));
const MPASS = Object.fromEntries(MASTERY.flatMap(M => M.pass.map(p => [p.id, p])));
const MKEY = Object.fromEntries(MASTERY.flatMap(M => M.keys.map(k => [k.id, k])));

const mstFresh = () => ({ picks: [], bar: {}, pas: {}, key: {} });
const mstS = () => (S.mst ??= mstFresh());
const mstPickMax = () => MST.picks.reduce((n, [lv, k]) => (S.level || 1) >= lv ? k : n, 0);
const mstSpent = () => { const m = mstS(); return Object.values(m.bar).reduce((a, b) => a + b, 0) + Object.values(m.pas).reduce((a, b) => a + b, 0) + Object.keys(m.key).length; };
const mstBar = mid => mstS().bar[mid] || 0, mstRank = pid => mstS().pas[pid] || 0, mstHas = kid => !!mstS().key[kid];
// 能不能加 / 减：返回 null 表示可以，否则是原因（界面上直接显示）
function mstWhy(kind, id, dir) {
  const m = mstS();
  if (kind === 'pick') return m.picks.includes(id) ? '已选' : m.picks.length >= mstPickMax() ? (mstPickMax() < MST.picks[MST.picks.length - 1][1] ? `第 ${m.picks.length + 1} 个专精 Lv${MST.picks.find(([, k]) => k > m.picks.length)[0]} 开放` : '最多选 2 个专精') : null;
  const o = kind === 'bar' ? MST_BY[id] : kind === 'pass' ? MPASS[id] : MKEY[id], mid = kind === 'bar' ? id : o && o.m;
  if (!o || !m.picks.includes(mid)) return '先选这个专精';
  if (dir > 0) {
    if (treePoints() <= 0) return '没有天赋点';
    if (kind === 'bar') return mstBar(id) >= MST.barMax ? '专精条满了' : null;
    if (mstBar(mid) < o.tier) return `专精条要 ${o.tier} 点`;
    if (kind === 'pass') return mstRank(id) >= MST.passMax ? '已满级' : null;
    if (mstHas(id)) return '已点';
    return o.need && mstRank(o.need) < MST.keyNeed ? `要 ${MPASS[o.need].n} ${MST.keyNeed} 级` : null;
  }
  if (kind === 'bar') { if (!mstBar(id)) return '没有可退的'; const nb = mstBar(id) - 1, M = MST_BY[id]; return M.pass.some(p => mstRank(p.id) && p.tier > nb) || M.keys.some(k => mstHas(k.id) && k.tier > nb) ? '会让已点的被动 / 大天赋失效，先退它们' : null; }
  if (kind === 'pass') { if (!mstRank(id)) return '没有可退的'; return mstRank(id) - 1 < MST.keyNeed && Object.values(MKEY).some(k => k.need === id && mstHas(k.id)) ? '挂在它下面的大天赋要先退' : null; }
  return mstHas(id) ? null : '没有可退的';
}
function mstDo(kind, id, dir) {
  if (mstWhy(kind, id, dir)) return false; const m = mstS();
  if (kind === 'pick') m.picks.push(id);
  else if (kind === 'bar') m.bar[id] = mstBar(id) + dir;
  else if (kind === 'pass') m.pas[id] = mstRank(id) + dir;
  else if (dir > 0) m.key[id] = 1; else delete m.key[id];
  for (const t of ['bar', 'pas']) for (const k in m[t]) if (!m[t][k]) delete m[t][k];
  return true;
}
// 退掉一个专精：它上面的点全部退回
function mstUnpick(mid) { const m = mstS(), M = MST_BY[mid]; if (!M) return; delete m.bar[mid]; M.pass.forEach(p => delete m.pas[p.id]); M.keys.forEach(k => delete m.key[k.id]); m.picks = m.picks.filter(x => x !== mid); }
function mstReset() { const keep = mstS().picks; S.mst = { ...mstFresh(), picks: keep }; } // 洗点：点数全退，专精保留（要换专精再点“换”）
// 加成的来源：专精条 × 点数、被动 × 级 ÷ passRef、已点的大天赋（交给 treeStats 汇总）
function masteryParts() {
  const m = mstS(), out = [], sc = (o, f) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, mstVal(k, v, f)]));
  for (const mid of m.picks) { const M = MST_BY[mid]; if (!M) continue; const b = mstBar(mid); if (b) out.push({ add: sc(M.bar, b) });
    for (const p of M.pass) { const r = mstRank(p.id); if (r) out.push({ add: sc(p.add, r / MST.passRef) }); }
    for (const k of M.keys) if (mstHas(k.id)) out.push(k); }
  return out;
}
// 弹射、穿透、投射物数这类整数加成不按级摊：满 passRef 级才给 1 个（5 级仍是 1 个）
const MST_INT = new Set(['chain', 'pierce', 'projAdd', 'spawnAdd', 'delayAdd', 'split']);
const mstVal = (k, v, f) => MST_INT.has(k) ? Math.floor(v * f + 1e-9) : v * f;
const mstLines = (add, f = 1) => Object.entries(add || {}).filter(([k, v]) => mstVal(k, v, f)).map(([k, v]) => treeText(k, Math.round(mstVal(k, v, f) * 100) / 100));
// 自动加点（sim、新手“按推荐点”）：先选专精，再按目标大天赋补专精条和挂靠的被动，最后专精条、被动轮流加满
function mstAuto(picks, keys = []) {
  const m = mstS(); for (const p of picks) if (!m.picks.includes(p)) mstDo('pick', p, 1);
  for (let guard = 0; guard < 500 && treePoints() > 0; guard++) {
    let did = false;
    for (const kid of keys) { const k = MKEY[kid]; if (!k || mstHas(kid) || !m.picks.includes(k.m)) continue;
      if (mstBar(k.m) < k.tier) { did = mstDo('bar', k.m, 1); break; }
      if (k.need && mstRank(k.need) < MST.keyNeed) { did = mstDo('pass', k.need, 1); break; }
      did = mstDo('key', kid, 1); break; }
    if (did) continue;
    for (const mid of m.picks) { const M = MST_BY[mid]; const opts = [['bar', mid], ...M.pass.map(p => ['pass', p.id])]; for (const [kd, id] of opts) if (!mstWhy(kd, id, 1)) { did = mstDo(kd, id, 1); break; } if (did) break; }
    if (!did) break;
  }
}
