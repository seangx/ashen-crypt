/* ---------------- 天赋树 ----------------
   原作的天赋树没有提取到，这一版按原作的结构自行设计：
   中心起点 → 六条主题分支（小节点 → 中节点 → 带代价的大型节点），相邻分支之间有桥接节点。
   每升一级得 1 点；只能点和已点节点相连的节点。
   效果写法：add 里是“提高 / 附加”（相加），more 里是“总增 / 总降”（相乘），flag 是规则改写（参数在 data/rules.json）。 */
const TREE_C = { kin: ELEM_C.kin, exp: ELEM_C.exp, ele: ELEM_C.ele, pla: ELEM_C.pla, nuc: ELEM_C.nuc, agi: '#c08aff' };
// 节点效果都在 data/tree.json：主路（小 → 中 → 大型节点）、4 个小团（3 小 → 中 → 2 小 → 改规则的核心天赋；顺序：内左、内右、外左、外右）、桥
const TREE_BRANCH = DATA.tree.branches.map(B => ({ ...B, c: TREE_C[B.id] }));
const TREE_CLUSTERS = DATA.tree.clusters;
const TREE_BRIDGE = DATA.tree.bridge;
const TREE_RING = DATA.tree.ring;
const TREE_TEXT = {
  armor: v => `护甲 +${v}`, armorInc: v => `护甲提高 ${v}%`, deflect: v => `护盾 +${v}`, deflectInc: v => `护盾提高 ${v}%`, dodge: v => `闪避 +${v}`,
  mass: v => `${ATTR_N.mass} +${v}`, energy: v => `${ATTR_N.energy} +${v}`, time: v => `${ATTR_N.time} +${v}`,
  massInc: v => `${ATTR_N.mass}提高 ${v}%`, energyInc: v => `${ATTR_N.energy}提高 ${v}%`, timeInc: v => `${ATTR_N.time}提高 ${v}%`,
  aspd: v => `攻击速度提高 ${v}%`, aoeInc: v => `范围提高 ${v}%`, areaInc: v => `范围武器伤害提高 ${v}%`, dotInc: v => `持续伤害提高 ${v}%`, dashRegen: v => `冲刺回复${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, velocity: v => `移动速度提高 ${v}%`,
  dashMax: v => `冲刺槽 +${v}`, critInc: v => `暴击率提高 ${v}%`, critDmg: v => `暴击伤害 ${v >= 0 ? '+' : ''}${v}%`, 'res:all': v => `全部抗性 ${v >= 0 ? '+' : ''}${v}%`, 'inc:all': v => `全部伤害提高 ${v}%`,
  projSpd: v => `投射物速度提高 ${v}%`, bossInc: v => `对 Boss 伤害总增 ${v}%`, chain: v => `额外连锁 ${v}`, pierce: v => `额外穿透 ${v}`, double: v => `${v}% 几率造成双倍伤害`,
};
const INC_N = { proj: '投射物', melee: '近战', engine: '遁靴' };
const treeText = (k, v) => k.startsWith('inc:') && k !== 'inc:all' ? `${INC_N[k.slice(4)] || ELEM_N[k.slice(4)]}伤害提高 ${v}%` : k.startsWith('ail:') ? `${AIL[k.slice(4)].n}几率 +${Math.round(v * 100)}%` : k.startsWith('res:') && k !== 'res:all' ? `${ELEM_N[k.slice(4)]}抗性 +${v}%` : TREE_TEXT[k](v);
// 改规则的效果文字：{参数} 取 data/rules.json 里这条规则的参数，{v} 是天赋或装备给的数值，{别的规则.参数} 引用别的规则
const RULES = DATA.rules; RULES.whirl = DATA.mechanics.whirl; // {whirl.参数} 引用 mechanics.json 的 whirl
const ruleText = (k, v) => { const R = RULES[k]; return R && R.text ? R.text.replace(/\{(\w+)(?:\.(\w+))?\}/g, (m, a, b) => b ? RULES[a][b] : a === 'v' ? v : R[a]) : null; };
const MORE_N = { 'dmg:hit': '命中伤害', 'dmg:nonEle': '闪电以外的伤害', 'dmg:nonKin': '物理以外的伤害', 'dmg:nonPla': '圣光以外的伤害', 'dmg:thermal': '元素伤害', 'dmg:nonAoe': '非范围武器伤害',
  speed: '移动速度', armor: '护盾', deflect: '护盾', deflRate: '护盾回复速度', aspd: '攻击速度', dot: '持续伤害', rad: '疫病伤害', blind: '致盲效果', crit: '暴击率' };
for (const e of ELEM) MORE_N['dmg:' + e] = ELEM_N[e] + '伤害';
const moreText = (k, v) => k === 'dashMax' ? `冲刺槽 ${v}（至少 1）` : `${MORE_N[k] || k}${v >= 1 ? '总增' : '总降'} ${Math.round(Math.abs(v - 1) * 100)}%`;
// 大型节点的说明：规则 → 附加 → 代价，按数值自动生成
const keyText = K => [...Object.entries(K.flag || {}).map(([k, v]) => ruleText(k, v)), ...Object.entries(K.add || {}).map(([k, v]) => treeText(k, v)), ...Object.entries(K.more || {}).map(([k, v]) => moreText(k, v))].filter(Boolean).join('；');

// 生成节点和连线：世界坐标以起点为原点，天赋窗口里可以拖动和缩放
const TREE = { nodes: {}, edges: [] };
(function buildTree() {
  const SC = 1.45;
  const pos = (a, r) => [Math.round(Math.cos(a) * r * SC), Math.round(Math.sin(a) * r * SC)];
  const node = (id, o) => { TREE.nodes[id] = { id, nb: [], ...o }; };
  const link = (a, b) => { TREE.nodes[a].nb.push(b); TREE.nodes[b].nb.push(a); TREE.edges.push([a, b]); };
  const keyNode = (id, i, K, x, y, c) => node(id, { kind: 'k', b: i, x, y, n: K.n, add: K.add || {}, more: K.more, flag: K.flag, d: keyText(K), c });
  node('start', { kind: 'start', n: '灯芯', x: 0, y: 0, add: {}, c: '#ffd75e' });
  const ang = i => -Math.PI / 2 + i * Math.PI / 3;
  TREE_BRANCH.forEach((B, i) => {
    const a = ang(i);
    // 主路：小 小 小 中 小 小 中 小 大
    const plan = ['s', 's', 's', 'n0', 's', 's', 'n1', 's', 'k'];
    let prev = 'start', si = 0;
    plan.forEach((p, k) => {
      const id = `${B.id}${k}`; const [x, y] = pos(a, 16 + k * 16);
      if (p === 's') node(id, { kind: 's', b: i, x, y, add: B.small[si++ % B.small.length], c: B.c });
      else if (p[0] === 'n') { const N = B.notable[+p[1]]; node(id, { kind: 'n', b: i, x, y, n: N.n, add: N.add, c: B.c }); }
      else { const [x2, y2] = pos(a, 16 + k * 16 + 4); keyNode(id, i, B.key, x2, y2, B.c); }
      link(prev, id); prev = id;
    });
    // 4 个小团：内侧两个从主路第 3 个节点岔出，外侧两个从第 7 个节点岔出
    TREE_CLUSTERS[B.id].forEach((C, ci) => {
      const side = ci % 2 ? 1 : -1, outer = ci >= 2;
      let p = `${B.id}${outer ? 6 : 2}`;
      for (let j = 0; j < 7; j++) {
        const id = `${B.id}c${ci}_${j}`;
        const r = outer ? 112 + 9 * (j + 1) : 48 + 8 * (j + 1), off = outer ? 0.14 + 0.05 * j : 0.16 + 0.05 * j;
        const [x, y] = pos(a + side * off, r);
        if (j === 3) node(id, { kind: 'n', b: i, x, y, n: C.nn, add: C.nadd, c: B.c });
        else if (j === 6) keyNode(id, i, C.key, x, y, B.c);
        else node(id, { kind: 's', b: i, x, y, add: C.small, c: B.c });
        link(p, id); p = id;
      }
    });
  });
  // 相邻分支之间：内圈和外圈各一座桥，桥中间是印记槽
  TREE_BRANCH.forEach((B, i) => {
    const N = TREE_BRANCH[(i + 1) % 6], a = ang(i) + Math.PI / 6;
    const mk = (pre, from, to, r, dOff, add, sk) => {
      const ids = [`${pre}${i}a`, `sk${sk}`, `${pre}${i}b`];
      [[-dOff, r], [0, r + 4], [dOff, r]].forEach(([o, rr], k) => {
        const [x, y] = pos(a + o, rr);
        if (k === 1) node(ids[1], { kind: 'sock', b: -1, x, y, n: '印记槽', add: {}, c: '#57e0d0' });
        else node(ids[k], { kind: 's', b: -1, x, y, add, c: '#b8afc4' });
      });
      link(from, ids[0]); link(ids[0], ids[1]); link(ids[1], ids[2]); link(ids[2], to);
    };
    mk('br', `${B.id}2`, `${N.id}2`, 40, 0.24, TREE_BRIDGE[i], i);
    mk('ring', `${B.id}c3_3`, `${N.id}c2_3`, 150, 0.12, TREE_RING[i], i + 6);
  });
})();
const treePoints = () => Math.max(0, S.level - 1) - S.tree.length;
function treeCanAlloc(id) {
  const nd = TREE.nodes[id]; if (!nd || nd.kind === 'start' || S.tree.includes(id)) return false;
  return treePoints() > 0 && nd.nb.some(x => x === 'start' || S.tree.includes(x));
}
// 只能退掉不会让别的节点断开的节点
function treeCanRefund(id) {
  if (!S.tree.includes(id)) return false;
  const left = new Set(S.tree.filter(x => x !== id)); const seen = new Set(['start']); const q = ['start'];
  while (q.length) { const c = q.pop(); for (const n of TREE.nodes[c].nb) if (left.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
  return seen.size - 1 === left.size;
}
// 印记：插在已点亮的印记槽里
const chipIn = id => S.chips && S.chips[id];
function equipChip(it) {
  const free = Object.keys(TREE.nodes).filter(id => TREE.nodes[id].kind === 'sock' && S.tree.includes(id) && !chipIn(id));
  if (!free.length) { toast('先在天赋树上点亮一个空的印记槽'); return false; }
  S.chips[free[0]] = it; S.stash = S.stash.filter(x => x !== it); it.isNew = false; refreshStats(); return true;
}
function unequipChip(id) { const it = chipIn(id); if (!it) return; delete S.chips[id]; S.stash.unshift(it); refreshStats(); }
const chipSock = it => Object.keys(S.chips || {}).find(k => S.chips[k] === it);
// 退掉天赋时把插着的印记还回仓库
function treeKeep(ids) { for (const k of Object.keys(S.chips)) if (!ids.includes(k)) { S.stash.unshift(S.chips[k]); delete S.chips[k]; } S.tree = ids; }
function treeLines(nd) {
  const out = [];
  for (const k in nd.add || {}) out.push(treeText(k, nd.add[k]));
  return nd.d ? [nd.d] : out;
}
// 汇总被动效果：已点节点 + 插着的印记 + 已装备独特装备的全局规则
function treeStats(ids = S.tree, eq = S.equip) {
  const add = {}, more = {}, flag = {};
  const A = (k, v) => add[k] = (add[k] || 0) + v, M = (k, v) => more[k] = (more[k] ?? 1) * v;
  const uniqueRules = it => { const u = UNIQUE_BY[it.u]; if (!u) return; u.rules.forEach(([k], i) => { const v = it.uv[i];
    if (['massInc', 'energyInc', 'timeInc', 'rangeInc', 'dodge', 'velocity', 'dashMax'].includes(k)) A(k, v);
    else if (k === 'massAdd') A('mass', v); else if (k === 'resAll') A('res:all', v);
    else if (k === 'critLess') M('crit', 1 - v / 100); else if (k === 'armorLess') M('armor', 1 - v / 100); else if (k === 'shockMul') flag.shockMul = (flag.shockMul || 1) * (1 + v / 100);
    else if (k === 'dodgeCap') flag.dodgeCap = (flag.dodgeCap || 0) + v;
    else if (k === 'spinDecay') flag.spinDecay = (flag.spinDecay || 1) * (1 - v / 100);
    else if (['blindAura', 'shockAura', 'dodgeSpikes', 'multicrit', 'finale', 'splitEnd', 'stormEye'].includes(k)) flag[k] = 1;
    else if (k === 'takenKin') flag.takenKin = Math.max(flag.takenKin || 0, v / 100); }); };
  for (const id of ids) { const it = chipIn(id); if (!it) continue;
    for (const x of it.affs) { const a = AFF_BY[x.k]; if (!a || !a.tk) continue; const v = Array.isArray(x.v) ? x.v[0] : x.v; if (a.tm === 'm') M(a.tk, 1 + v / 100); else A(a.tk, v); }
    uniqueRules(it); }
  for (const k in eq) if (eq[k] && eq[k].u) uniqueRules(eq[k]);
  for (const b of boonAdds()) for (const k in b) A(k, b[k]);
  for (const id of ids) {
    const nd = TREE.nodes[id]; if (!nd) continue;
    for (const k in nd.add || {}) add[k] = (add[k] || 0) + nd.add[k];
    for (const k in nd.more || {}) more[k] = k === 'dashMax' ? (more[k] || 0) + nd.more[k] : (more[k] ?? 1) * nd.more[k];
    for (const k in nd.flag || {}) flag[k] = k === 'shockMul' ? (flag[k] || 1) * nd.flag[k] : (flag[k] || 0) + nd.flag[k];
  }
  return { add, more, flag };
}
