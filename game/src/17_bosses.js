/* ---------------- 轮换 Boss · 天梯层词缀 ----------------
   墓图、命盘、Boss 祝福已下线（design/spec-legacy-cleanup.md）。墓图词缀表（data/atlas.json maps.affixes）留给天梯层词缀用。 */
const ATLAS = DATA.atlas;

// 4 个 Boss，按任务等级轮换
// Boss 的配色（像素图换色）；数值在 data/progression.json 的 bosses
const BOSS_PAL = { lord: {}, moon: { w: 'v', b: 'V', y: 'l', Y: 'B', P: 'p', p: 'P', g: 'V', r: 'c' }, bog: { w: 'm', b: 'g', y: 'Y', Y: 'N', P: 'h', p: 'N', g: 'h', r: 'y' }, storm: { w: 'l', b: 'B', y: 'y', Y: 'Y', P: 'C', p: 'c', g: 'B', r: 'f' } };
const BOSSES = PROG.bosses.list.map(b => ({ ...b, pal: BOSS_PAL[b.id] || {} }));
const MOB_SPR = ['skel', 'armor', 'thief', 'mage', 'hound', 'archer', 'wraith', 'boss', ...BOSSES.map(b => 'boss_' + b.id)];
const BOSS_BY = Object.fromEntries(BOSSES.map(b => [b.id, b]));
const bossFor = L => BOSSES[(L - 1) % BOSSES.length]; // 按层数轮换
const BOSS_PAT_N = { ring: '向四周放骨刺，时不时冲锋', blink: '瞬移到你身边，放出旋转的月光', pool: '往你脚下丢腐沼，站在里面会持续受伤', bolt: '连射闪电，还会召唤骷髅' };

const boonAdds = () => []; // Boss 祝福已下线

/* ---- 天梯层词缀：沿用墓图词缀表里让任务变难的那几条（只加奖励的不要） ---- */
const MAP_AFF_T = {
  mobHp: v => `怪物生命总增 ${v}%`, mobDmg: v => `怪物伤害总增 ${v}%`, mobSpd: v => `怪物移动速度提高 ${v}%`, elite: v => `精英怪数量提高 ${v}%`,
  need: v => `需要多攒 ${v}% 的进度`, bossHp: v => `Boss 生命总增 ${v}%`, mobRes: v => `怪物全部抗性 +${v}%`, noRegen: v => `护盾回复总降 ${v}%`,
};
const MAP_AFF_S = { mobHp: '厚血', mobDmg: '凶残', mobSpd: '迅捷', elite: '精英', need: '漫长', bossHp: '巨首', mobRes: '坚韧', noRegen: '枯竭' };
const LAD_AFF = ATLAS.maps.affixes.filter(a => a.bad).map(a => ({ ...a, t: MAP_AFF_T[a.k], s: MAP_AFF_S[a.k] }));
const LAD_AFF_BY = Object.fromEntries(LAD_AFF.map(a => [a.k, a]));

/* ---- 掉落 / 怪物修正汇总：命盘和墓图没了，只剩天梯层词缀改怪物 ---- */
let LX = { call: {}, mob: {} };
function lootFx(mods) {
  const o = { iiq: 0, iir: 0, xp: 0, dice: 0, runes: 0, unique: 0, twin: 0, lvl: 0, call: {}, mob: {} };
  for (const x of mods || []) o.mob[x.k] = (o.mob[x.k] || 0) + x.v;
  return o;
}
