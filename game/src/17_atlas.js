/* ---------------- 墓图 · 命盘 · Boss 祝福 ----------------
   对应原作的星区（地图物品）、弹珠机树（只加掉落和难度的元进度）和 Boss 祝福。
   原作这部分的数值没有提取到，这里按原作的结构自行设定（数值在 data/atlas.json，Boss 在 data/progression.json）。 */
const ATLAS = DATA.atlas;

// 4 个 Boss，按任务等级轮换
// Boss 的配色（像素图换色）；数值在 data/progression.json 的 bosses
const BOSS_PAL = { lord: {}, moon: { w: 'v', b: 'V', y: 'l', Y: 'B', P: 'p', p: 'P', g: 'V', r: 'c' }, bog: { w: 'm', b: 'g', y: 'Y', Y: 'N', P: 'h', p: 'N', g: 'h', r: 'y' }, storm: { w: 'l', b: 'B', y: 'y', Y: 'Y', P: 'C', p: 'c', g: 'B', r: 'f' } };
const BOSSES = PROG.bosses.list.map(b => ({ ...b, pal: BOSS_PAL[b.id] || {} }));
const MOB_SPR = ['skel', 'armor', 'thief', 'mage', 'boss', ...BOSSES.map(b => 'boss_' + b.id)];
const BOSS_BY = Object.fromEntries(BOSSES.map(b => [b.id, b]));
const bossFor = L => BOSSES[(L - 1) % BOSSES.length]; // 按层数轮换
const BOSS_PAT_N = { ring: '向四周放骨刺，时不时冲锋', blink: '瞬移到你身边，放出旋转的月光', pool: '往你脚下丢腐沼，站在里面会持续受伤', bolt: '连射闪电，还会召唤骷髅' };

// Boss 祝福：每个 Boss 3 种，击杀 1 / 5 / 15 次后永久获得
const BOON_AT = ATLAS.boons.at;
const BOONS = Object.fromEntries(BOSSES.map(b => [b.id, ATLAS.boons[b.id]]));
const boonGot = (id, i) => ((S.bossKills || {})[id] || 0) >= BOON_AT[i];
function boonAdds() { const out = []; for (const b of BOSSES) BOONS[b.id].forEach((x, i) => { if (boonGot(b.id, i)) out.push(x.add); }); return out; }

/* ---- 墓图 ---- */
const MP = ATLAS.maps;
const MAP_MAX_TIER = MP.maxTier;
const MAP_LIM = MP.affLimit;
// bad: 让任务变难，同时加物品数量（q）；其余是直接的收益
const MAP_AFF_T = {
  mobHp: v => `怪物生命总增 ${v}%`, mobDmg: v => `怪物伤害总增 ${v}%`, mobSpd: v => `怪物移动速度提高 ${v}%`, elite: v => `精英怪数量提高 ${v}%`,
  need: v => `需要多杀 ${v}% 的怪`, bossHp: v => `Boss 生命总增 ${v}%`, mobRes: v => `怪物全部抗性 +${v}%`, noRegen: v => `灵障回复总降 ${v}%`,
  iir: v => `物品稀有度提高 ${v}%`, xp: v => `经验提高 ${v}%`, dice: v => `词条碎片掉落提高 ${v}%`, runes: v => `符文掉落提高 ${v}%`,
};
const MAP_AFF = MP.affixes.map(a => ({ ...a, t: MAP_AFF_T[a.k] }));
const MAP_AFF_BY = Object.fromEntries(MAP_AFF.map(a => [a.k, a]));
const MAP_NA = ['幽暗', '腐朽', '无声', '血色', '灰烬', '断骨', '永夜', '蛛网', '低语', '沉沦'], MAP_NB = ['回廊', '墓穴', '祭坛', '坑道', '藏骨堂', '王陵', '井底', '钟楼'];
function newMap(tier, rar = 0) { const m = { id: S.nextId++, kind: 'map', tier: clamp(tier, 1, MAP_MAX_TIER), rar: 0, affs: [], isNew: true }; setMapRar(m, rar); return m; }
function mapAffAdd(m) {
  const pool = MAP_AFF.filter(a => !m.affs.some(x => x.k === a.k)); if (!pool.length || m.affs.length >= MAP_LIM[m.rar]) return false;
  const a = pick(pool); m.affs.push({ k: a.k, v: Math.round(ri(a.r[0], a.r[1]) * (1 + (m.tier - 1) * MP.tierScale)) }); return true;
}
function setMapRar(m, r) {
  m.rar = r; m.affs = []; m.rn = r === 2 ? pick(MAP_NA) + pick(MAP_NB) : null;
  const c = r === 1 ? MP.affCount.magic : r === 2 ? MP.affCount.rare : null, n = c ? ri(c[0], c[1]) : 0; for (let i = 0; i < n; i++) mapAffAdd(m);
}
const mapName = m => (m.rn || '墓图') + ` · ${m.tier} 阶`;
const mapQty = m => m.tier * MP.qtyPerTier + MP.rarityQty[m.rar] + m.affs.reduce((s, x) => s + (MAP_AFF_BY[x.k].q || 0), 0);
const mapRar = m => MP.rarityIir[m.rar];
// 墓图掉落的阶级：当前在跑墓图时围绕它，否则跟着任务等级
function rollMapTier(L) {
  const base = RUN && RUN.map ? RUN.map.tier : 1 + Math.floor((L - 1) / MP.tierEvery);
  return clamp(base + wpick([-1, 0, 1], d => MP.tierShiftWeights[d + 1]) + (rnd() * 100 < LX.mapTier ? 1 : 0), 1, MAP_MAX_TIER);
}
function rollMapDrop(L) { return newMap(rollMapTier(L), wpick([0, 1, 2], r => MP.dropRarityWeights[r])); }
/* ---- 命盘（弹珠机树）：一颗弹珠从顶上落下，每个钉子只能从上面相邻的钉子走过来 ---- */
const MARBLE_TEXT = {
  iiq: v => `物品数量提高 ${v}%`, iir: v => `物品稀有度提高 ${v}%`, xp: v => `经验提高 ${v}%`, mapDrop: v => `墓图掉落提高 ${v}%`,
  dice: v => `词条碎片掉落提高 ${v}%`, runes: v => `符文掉落提高 ${v}%`, unique: v => `独特装备几率提高 ${v}%`, mapTier: v => `${v}% 几率掉落高一阶的墓图`,
  twin: v => `${v}% 几率词条碎片掉两个`, chest: v => `${v}% 几率 Boss 多掉 ${ATLAS.marble.chestItems} 件装备`, lvl: v => `怪物等级 +${v}`,
};
const CALL_N = { weapon: '武器', shield: '盾牌', core: '头冠', engine: '遁靴', hub: '法阵', chip: '印记' };
for (const k in CALL_N) MARBLE_TEXT['call:' + k] = v => `${CALL_N[k]}掉落几率提高 ${v}%`;
const MARBLE_ROWS = ATLAS.marble.rows, MARBLE_SMALL = ATLAS.marble.small, MARBLE_BIG = ATLAS.marble.big;
const MARBLE = (() => {
  const nodes = {};
  MARBLE_ROWS.forEach((row, r) => row.forEach((k, c) => {
    const id = `p${r}_${c}`; const big = MARBLE_BIG[k];
    const fx = k === 'start' ? {} : big ? big.fx : { [k]: k.startsWith('call:') ? ATLAS.marble.call : MARBLE_SMALL[k] };
    nodes[id] = { id, r, c, kind: k === 'start' ? 'start' : big ? 'k' : k.startsWith('call:') ? 'n' : 's', n: big && big.n, fx, up: [], down: [] };
  }));
  for (const id in nodes) { const { r, c } = nodes[id]; for (const d of [0, 1]) { const t = nodes[`p${r + 1}_${c + d}`]; if (t) { nodes[id].down.push(t.id); t.up.push(id); } } }
  return { nodes };
})();
const marbleLines = nd => Object.entries(nd.fx).map(([k, v]) => MARBLE_TEXT[k](v));
const marblePoints = () => Math.max(0, S.maxDepth - 1 + Math.floor((S.stats.maps || 0) / ATLAS.marble.mapsPerPoint)) - S.marble.length;
const marbleOn = id => id === 'p0_0' || S.marble.includes(id);
function marbleCanAlloc(id) { const nd = MARBLE.nodes[id]; return !marbleOn(id) && marblePoints() > 0 && nd.up.some(marbleOn); }
function marbleCanRefund(id) {
  if (!S.marble.includes(id)) return false;
  const left = new Set(S.marble.filter(x => x !== id)); const seen = new Set(); const q = ['p0_0'];
  while (q.length) { const c = q.pop(); for (const n of MARBLE.nodes[c].down) if (left.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
  return seen.size === left.size;
}

/* ---- 掉落效果汇总：命盘 + 本次任务用的墓图 ---- */
let LX = { call: {}, mob: {} };
function lootFx(map, bare) { // bare：天梯里命盘不生效
  const o = { iiq: 0, iir: 0, xp: 0, mapDrop: 0, dice: 0, runes: 0, unique: 0, mapTier: 0, twin: 0, chest: 0, lvl: 0, call: {}, mob: {} };
  if (!bare) for (const id of S.marble || []) { const nd = MARBLE.nodes[id]; if (!nd) continue; for (const k in nd.fx) { if (k.startsWith('call:')) o.call[k.slice(5)] = (o.call[k.slice(5)] || 0) + nd.fx[k]; else o[k] += nd.fx[k]; } }
  if (map) {
    o.lvl += map.tier; o.iiq += mapQty(map); o.iir += mapRar(map);
    for (const x of map.affs) { const a = MAP_AFF_BY[x.k]; if (a.bad) o.mob[x.k] = x.v; else o[x.k] += x.v; }
  }
  return o;
}
const armedMap = () => S.mapArmed && S.maps.find(m => m.id === S.mapArmed);
