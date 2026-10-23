/* ---------------- 天赋树 ----------------
   原作的天赋树没有提取到，这一版按原作的结构自行设计：
   中心起点 → 六条主题分支（小节点 → 中节点 → 带代价的大型节点），相邻分支之间有桥接节点。
   每升一级得 1 点；只能点和已点节点相连的节点。
   效果写法：add 里是“提高 / 附加”（相加），more 里是“总增 / 总降”（相乘），flag 是规则改写（参数在 data/rules.json）。 */
const TREE_C = { kin: ELEM_C.kin, exp: ELEM_C.exp, ele: ELEM_C.ele, pla: ELEM_C.pla, nuc: ELEM_C.nuc, agi: '#c08aff' };
// 节点效果都在 data/tree.json：主路（小 → 中 → 大型节点）、4 个小团（3 小 → 中 → 2 小 → 改规则的核心天赋；顺序：内左、内右、外左、外右）、桥
const TREE_BRANCH = DATA.tree.branches.map(B => ({ ...B, c: B.c || TREE_C[B.id] || '#ffffff' }));
const TREE_CLUSTERS = DATA.tree.clusters;
const TREE_BRIDGE = DATA.tree.bridge;
const TREE_RING = DATA.tree.ring;
const TREE_TEXT = {
  armor: v => `护甲 +${v}`, armorInc: v => `护甲提高 ${v}%`, deflect: v => `护盾 +${v}`, deflectInc: v => `护盾提高 ${v}%`, dodge: v => `闪避 +${v}`,
  mass: v => `${ATTR_N.mass} +${v}`, energy: v => `${ATTR_N.energy} +${v}`, time: v => `${ATTR_N.time} +${v}`,
  massInc: v => `${ATTR_N.mass}提高 ${v}%`, energyInc: v => `${ATTR_N.energy}提高 ${v}%`, timeInc: v => `${ATTR_N.time}提高 ${v}%`,
  aspd: v => `攻击速度提高 ${v}%`, aoeInc: v => `范围提高 ${v}%`, areaInc: v => `范围武器伤害提高 ${v}%`, dotInc: v => `持续伤害提高 ${v}%`, dashRegen: v => `冲刺回复${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, velocity: v => `移动速度提高 ${v}%`,
  dashMax: v => `冲刺槽 +${v}`, critInc: v => `暴击率提高 ${v}%`, critDmg: v => `暴击伤害 ${v >= 0 ? '+' : ''}${v}%`, 'res:all': v => `全部抗性 ${v >= 0 ? '+' : ''}${v}%`, 'inc:all': v => `全部伤害提高 ${v}%`,
  projSpd: v => `投射物速度提高 ${v}%`, bossInc: v => `对 Boss 伤害总增 ${v}%`, chain: v => `弹射 +${v}（投射物在场边反弹；闪电链在敌人间连锁）`, projAdd: v => `投射物 +${v}`, durInc: v => `持续时间提高 ${v}%`, pierce: v => `额外穿透 ${v}`, double: v => `${v}% 几率造成双倍伤害`,
};
const INC_N = { proj: '投射物', melee: '近战', engine: '遁靴' };
const treeText = (k, v) => k.startsWith('inc:') && k !== 'inc:all' ? `${INC_N[k.slice(4)] || ELEM_N[k.slice(4)]}伤害提高 ${v}%` : k.startsWith('ail:') ? `${AIL[k.slice(4)].n}几率 +${Math.round(v * 100)}%` : k.startsWith('res:') && k !== 'res:all' ? `${ELEM_N[k.slice(4)]}抗性 +${v}%` : TREE_TEXT[k](v);
// 改规则的效果文字：{参数} 取 data/rules.json 里这条规则的参数，{v} 是天赋或装备给的数值，{别的规则.参数} 引用别的规则
const RULES = DATA.rules; RULES.whirl = DATA.mechanics.whirl; RULES.spark = DATA.mechanics.spark; // {whirl.参数} 引用 mechanics.json 的 whirl
const ruleText = (k, v) => { const R = RULES[k]; return R && R.text ? R.text.replace(/\{(\w+)(?:\.(\w+))?\}/g, (m, a, b) => b ? RULES[a][b] : a === 'v' ? v : R[a]) : null; };
const MORE_N = { 'dmg:hit': '命中伤害', 'dmg:nonEle': '闪电以外的伤害', 'dmg:nonKin': '物理以外的伤害', 'dmg:nonPla': '圣光以外的伤害', 'dmg:thermal': '元素伤害', 'dmg:nonAoe': '非范围武器伤害', 'dmg:proj': '投射物伤害',
  speed: '移动速度', armor: '护盾', deflect: '护盾', deflRate: '护盾回复速度', life: '生命', aspd: '攻击速度', dot: '持续伤害', rad: '疫病伤害', blind: '致盲效果', crit: '暴击率' };
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
    else if (['blindAura', 'shockAura', 'dodgeSpikes', 'multicrit', 'finale', 'splitEnd'].includes(k)) flag[k] = 1;
    // 标签式独特（规格 design/spec-tags.md），数值在 rules.json
    else if (k === 'areaEye') { flag.areaEye = 1; A('aoeInc', RULES.areaEye.aoeInc); }
    else if (k === 'projLess') M('dmg:proj', 1 - v / 100);
    else if (k === 'chainCrown') { flag.chainCrown = 1; A('chain', RULES.chainCrown.chain); A('chainStep', RULES.chainCrown.stepInc); }
    else if (k === 'projCrown') { A('projAdd', RULES.projCrown.extra); M('dmg:proj', 1 - RULES.projCrown.less / 100); }
    else if (k === 'durCrown') { A('durInc', RULES.durCrown.durInc); A('aoeInc', RULES.durCrown.aoeInc); }
    else if (k === 'meleeCrown') { flag.meleeCrown = (flag.meleeCrown || 0) + RULES.meleeCrown.chance / 100; M('speed', 1 - RULES.meleeCrown.speedLess / 100); }
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

/* ---------- 天赋树 · 星空版的绘制小工具 ---------- */
const treeUI = { left: true, right: true, q: '', tag: null, preset: null, scroll: 0 };
// 标签：在节点名字和效果文字里找
const TREE_TAGS = [
  { n: '投射物', re: /投射物/ }, { n: '弹射', re: /弹射/ }, { n: '范围', re: /范围/ },
  { n: '近战', re: /近战|旋风/ }, { n: '持续', re: /持续/ }, { n: '暴击', re: /暴击/ },
  { n: '穿透', re: /穿透/ }, { n: '防御', re: /护甲|护盾|闪避|抗性/ }, { n: '速度', re: /速度|冲刺/ },
];
// 5×5 像素图标
const TREE_ICONS = {
  bolt: ['..##.', '.##..', '#####', '..##.', '.##..'], fire: ['..#..', '.##..', '.###.', '#####', '.###.'],
  bone: ['##...', '###..', '.###.', '..###', '...##'], sun: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'],
  spore: ['.#.#.', '#.#.#', '.###.', '#.#.#', '.#.#.'], crit: ['..#..', '.#.#.', '##.##', '.#.#.', '..#..'],
  shield: ['#####', '#####', '#####', '.###.', '..#..'], speed: ['#.#..', '.#.#.', '..#.#', '.#.#.', '#.#..'],
  sword: ['....#', '...#.', '#.#..', '.#...', '#.#..'], arrow: ['..###', '...##', '..#.#', '.#...', '#....'],
  aoe: ['.###.', '#...#', '#.#.#', '#...#', '.###.'], trap: ['#.#.#', '#####', '#...#', '#####', '#.#.#'],
  life: ['.#.#.', '#####', '#####', '.###.', '..#..'], time: ['#####', '.#.#.', '..#..', '.#.#.', '#####'],
};
const ELEM_ICON = { ele: 'bolt', exp: 'fire', kin: 'bone', pla: 'sun', nuc: 'spore', agi: 'speed', melee: 'sword', area: 'aoe', proj: 'arrow', dot: 'time', guard: 'shield', lamp: 'life' }; // 后六个是按标签分的区
function treeIcon(nd) {
  if (nd.icon) return nd.icon;
  const ks = [...Object.keys(nd.add || {}), ...Object.keys(nd.more || {}), ...Object.keys(nd.flag || {})].join(' ');
  const R = [[/crit/i, 'crit'], [/deathBoom|fireTrail|still/, 'trap'], [/chain|proj|pierce|arc/, 'arrow'], [/melee|whirl|exec/, 'sword'], [/aoe|area|shockAura|blindAura/, 'aoe'],
    [/:ele|spark|shock/, 'bolt'], [/:exp|burn/, 'fire'], [/:kin|corrode/, 'bone'], [/:pla|judge|martyr/, 'sun'], [/:nuc|rad|rot|contagion/, 'spore'],
    [/dot|dur|time/, 'time'], [/armor|deflect|deflRate|res:|dodge|absorb|thorns/, 'shield'], [/aspd|velocity|dash|speed/, 'speed'], [/life|energy|mass/, 'life']];
  for (const [re, ic] of R) if (re.test(ks)) return nd.icon = ic;
  return nd.icon = ELEM_ICON[TREE_BRANCH[nd.b]?.id] || 'sun';
}
// 像素圆：整格填充，不走矢量抗锯齿
function pxDisc(g, cx, cy, r, col, a = 1) { g.fillStyle(col, a); for (let dy = -r; dy <= r; dy++) { const hw = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); } }
function pxRing(g, cx, cy, r, col, a = 1) { g.fillStyle(col, a); for (let dy = -r; dy <= r; dy++) { const o = Math.floor(Math.sqrt((r + 0.5) ** 2 - dy * dy)), i = Math.abs(dy) >= r ? -1 : Math.floor(Math.sqrt(Math.max(0, (r - 0.5) ** 2 - dy * dy))); if (i < 0 || o - i <= 1) { if (i < 0) g.fillRect(cx - o, cy + dy, o * 2 + 1, 1); else { g.fillRect(cx - o, cy + dy, o - i, 1); g.fillRect(cx + i + 1, cy + dy, o - i, 1); } } else { g.fillRect(cx - o, cy + dy, o - i, 1); g.fillRect(cx + i + 1, cy + dy, o - i, 1); } } }
function pxLine(g, l, col, a, wd = 1) {
  let [x0, y0, x1, y1] = l.map(Math.round); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, o = wd >> 1;
  g.fillStyle(col, a);
  for (let n = 0; n < 2000; n++) { g.fillRect(x0 - o, y0 - o, wd, wd); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function pxIcon(g, ic, cx, cy, col, a) { const m = TREE_ICONS[ic]; if (!m) return; g.fillStyle(col, a); m.forEach((row, y) => { for (let x = 0; x < 5; x++) if (row[x] === '#') g.fillRect(cx - 2 + x, cy - 2 + y, 1, 1); }); }
// 一个节点：品级决定形状，点亮发光，没点就暗
function treeNodeGfx(g, nd, X, Y, r, got, dim) {
  const A = got ? 1 : 0.55 * dim, bc = hex(nd.c || '#ffffff');
  if (nd.kind === 's') {
    if (got) { pxDisc(g, X, Y, r + 2, 0x9fc8ff, 0.18); }
    g.fillStyle(got ? 0xffffff : 0x5a6496, got ? 1 : 0.75 * dim).fillRect(X - r, Y, r * 2 + 1, 1).fillRect(X, Y - r, 1, r * 2 + 1);
    g.fillStyle(got ? 0xdff0ff : 0x9aa4d8, got ? 1 : 0.8 * dim).fillRect(X, Y, 1, 1);
    return;
  }
  if (nd.kind === 'sock') {
    const ch = chipIn(nd.id);
    if (got) pxDisc(g, X, Y, r + 3, 0x57e0d0, 0.15);
    g.fillStyle(0x07101a, 1); for (let d = -r - 1; d <= r + 1; d++) { const w = r + 1 - Math.abs(d); g.fillRect(X - w, Y + d, w * 2 + 1, 1); }
    g.fillStyle(0x57e0d0, got ? 1 : 0.5 * dim); for (let d = -r; d <= r; d++) { const w = r - Math.abs(d); g.fillRect(X - w, Y + d, 1, 1); g.fillRect(X + w, Y + d, 1, 1); }
    if (ch) { g.fillStyle(hex(ch.rar === 3 ? '#ff9a3c' : ch.b === 'EmpoweredChip' ? COL.emberHi : '#dfe6ee'), 1); for (let d = -r + 2; d <= r - 2; d++) { const w = r - 2 - Math.abs(d); g.fillRect(X - w, Y + d, w * 2 + 1, 1); } }
    return;
  }
  const leg = nd.kind === 'k' || nd.kind === 'start';
  if (leg) {
    // 光芒：8 道像素射线
    const L = r + (got ? 5 : 3), rc = got ? 0xffd36a : 0x8a6a30, ra = got ? 0.9 : 0.5 * dim;
    g.fillStyle(rc, ra).fillRect(X, Y - L, 1, L - r).fillRect(X, Y + r + 1, 1, L - r).fillRect(X - L, Y, L - r, 1).fillRect(X + r + 1, Y, L - r, 1);
    const d = Math.round((L - 1) * 0.7), d0 = Math.round(r * 0.75) + 1; for (let t = d0; t <= d; t++) { g.fillRect(X + t, Y + t, 1, 1).fillRect(X - t, Y + t, 1, 1).fillRect(X + t, Y - t, 1, 1).fillRect(X - t, Y - t, 1, 1); }
    if (got) pxDisc(g, X, Y, r + 3, 0xffb84a, 0.22);
    pxDisc(g, X, Y, r + 1, 0x0a0a18, 1);
    pxDisc(g, X, Y, r, got ? 0x7a4a14 : 0x2a2030, 1);
    pxRing(g, X, Y, r + 1, got ? 0xffe9a8 : 0x9a7a3a, got ? 1 : 0.7 * dim);
    pxRing(g, X, Y, r - 1, nd.kind === 'start' ? 0xffd36a : bc, got ? 1 : 0.6 * dim);
    pxDisc(g, X, Y, Math.max(1, r - 2), got ? 0xc8862a : 0x3a2c22, 1);
    if (nd.kind === 'start') g.fillStyle(0xffffff, 1).fillRect(X - 1, Y - 1, 3, 3);
    else pxIcon(g, treeIcon(nd), X, Y, got ? 0xfff6d8 : 0xb89a5a, got ? 1 : 0.8 * dim);
    return;
  }
  // 稀有：青色环宝珠
  if (got) pxDisc(g, X, Y, r + 3, 0x57e0d0, 0.2);
  pxDisc(g, X, Y, r + 1, 0x0a0a18, 1);
  pxDisc(g, X, Y, r, got ? 0x1a5a6a : 0x161c34, 1);
  pxRing(g, X, Y, r, got ? 0x8ff6e8 : 0x3a8a90, got ? 1 : 0.8 * dim);
  pxIcon(g, treeIcon(nd), X, Y, got ? 0xffffff : bc, got ? 1 : 0.6 * dim);
}
// 星空底图：深蓝渐变 + 抖动的星云 + 星星 + 暗角，全部按整像素画
function treeSkyTex(sc, w, h) {
  const t = sc.textures.createCanvas('tree_sky', w, h), x = t.getContext(), im = x.createImageData(w, h), d = im.data;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const blobs = [[0.32, 0.3, 70, [52, 34, 96]], [0.7, 0.62, 80, [24, 52, 104]], [0.52, 0.85, 50, [70, 30, 90]], [0.15, 0.75, 45, [20, 60, 90]], [0.85, 0.2, 40, [60, 40, 110]]];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const th = B4[(j & 3) * 4 + (i & 3)] / 16, v = j / h;
    let c = v + (th - 0.5) * 0.25 > 0.5 ? [11, 14, 38] : [8, 10, 30];
    for (const [bx, by, br, bc] of blobs) { const dd = Math.hypot(i - bx * w, (j - by * h) * 1.4) / br, s = Math.max(0, 1 - dd) ** 1.5 * (0.75 + 0.25 * Math.sin(i * 0.11 + j * 0.07)); if (s * 1.6 > th) { const k = s > 0.45 && s * 2 > th + 0.4 ? 0.85 : 0.5; c = c.map((q, n) => Math.round(q + (bc[n] - q) * k * 0.6)); } }
    const ed = Math.min(i, w - 1 - i, j, h - 1 - j); if (ed < 14 && ed / 14 < th) c = c.map(q => q * 0.6);
    const o = (j * w + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  for (let n = 0; n < w * h / 90; n++) { const i = Math.floor(rnd() * w), j = Math.floor(rnd() * h), b = rnd(), o = (j * w + i) * 4, v = b > 0.92 ? 230 : b > 0.6 ? 150 : 90; d[o] = v * 0.85; d[o + 1] = v * 0.9; d[o + 2] = v; }
  x.putImageData(im, 0, 0); t.refresh();
}
function treeTwinkles(w, h) {
  let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; const out = [];
  for (let n = 0; n < 46; n++) out.push({ x: Math.floor(rnd() * (w - 4)) + 2, y: Math.floor(rnd() * (h - 4)) + 2, sp: 1 + rnd() * 2.5, ph: rnd() * 6.3, big: rnd() > 0.75, c: [0xffffff, 0xbfd8ff, 0xffe9b8][Math.floor(rnd() * 3)] });
  return out;
}
// 汇总栏：附加、代价、稀有、大型节点、核心天赋
function treeSummary(on) {
  const add = {}, more = {}, flag = {}, rare = [], key = [], core = [];
  for (const id of S.tree) { const nd = TREE.nodes[id]; if (!nd) continue;
    for (const k in nd.add || {}) add[k] = (add[k] || 0) + nd.add[k];
    for (const k in nd.more || {}) more[k] = k === 'dashMax' ? (more[k] || 0) + nd.more[k] : (more[k] ?? 1) * nd.more[k];
    for (const k in nd.flag || {}) flag[k] = 1;
    if (nd.kind === 'n') rare.push(nd); else if (nd.kind === 'k') (/c\d_6$/.test(id) ? core : key).push(nd); }
  const out = [], H = (t, c) => out.push([t, c, true]), L = (t, c = '#d6d9ee') => out.push([t, c, false]);
  const good = [], bad = [];
  for (const k in add) { let t; try { t = treeText(k, add[k]); } catch (e) { continue; } (add[k] < 0 ? bad : good).push(t); }
  for (const k in more) { const t = moreText(k, more[k]); (k !== 'dashMax' && more[k] < 1 ? bad : good).push(t); }
  H('附加', COL.dim); if (good.length) good.forEach(t => L(t)); else L('还没有', COL.faint);
  if (bad.length) { H('代价', COL.dim); bad.forEach(t => L(t, '#ff8a7a')); }
  if (rare.length) { H(`稀有 ${rare.length}`, COL.dim); L(rare.map(n => n.n).join('、'), COL.cyan); }
  if (key.length) { H('大型节点', COL.dim); key.forEach(n => L(n.n, COL.emberHi)); }
  if (core.length) { H('核心天赋', COL.dim); core.forEach(n => { L(n.n, COL.emberHi); L(n.d, '#b8b4d4'); }); }
  return out;
}
// 搜索框：在画布上盖一个浏览器输入框，回车或失焦就确定
function treeSearchInput(sc, x, y, w, h, val, done) {
  const cv = sc.game.canvas, R = cv.getBoundingClientRect(), k = R.width / W;
  const el = document.createElement('input'); el.value = val || ''; el.placeholder = '搜索名称或效果';
  Object.assign(el.style, { position: 'fixed', left: R.left + x * k + 'px', top: R.top + y * k + 'px', width: w * k + 'px', height: h * k + 'px', boxSizing: 'border-box', background: '#141836', color: '#e9e0c9', border: '1px solid #7fc8ff', font: `500 ${8 * k}px ${FONT_FAM}`, padding: `0 ${2 * k}px`, outline: 'none', zIndex: 10 });
  let fin = false; const end = ok => { if (fin) return; fin = true; const v = el.value; el.remove(); if (ok) done(v); };
  el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') end(true); if (e.key === 'Escape') end(false); });
  el.addEventListener('keyup', e => e.stopPropagation());
  el.addEventListener('blur', () => end(true));
  document.body.appendChild(el); setTimeout(() => el.focus(), 0);
}
