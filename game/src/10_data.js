/* ---------------- 数据 ----------------
   机制与数值按 Astroloot 复刻；名字和文字是地窖主题的原创改写。
   所有数值都在 data/*.json（构建时并入 DATA）：原作配置表在 data/astro.json，
   其余是自行设定的成长、掉落、怪物、天赋等。这里只把表接成代码里用的形状，并给出显示文字。 */
const ASTRO = DATA.astro;
const PROG = DATA.progression, LOOT = DATA.loot;
// 伤害类型（原作：动能 / 爆炸 / 等离子 / 电能 / 核能；热能 = 爆炸 + 等离子 + 电能）
const ELEM = ['kin', 'exp', 'pla', 'ele', 'nuc', 'cold'];
const ELEM_N = { kin: '物理', exp: '火焰', pla: '圣光', ele: '闪电', nuc: '瘟疫', cold: '寒霜' };
const ELEM_C = { kin: '#e9e0c9', exp: '#ff8a3d', pla: '#ffe27a', ele: '#7fc8ff', nuc: '#8fe05a', cold: '#9fe3ff' };
const THERMAL = { exp: 1, pla: 1, ele: 1, cold: 1 }; // 元素 = 火焰 + 圣光 + 闪电 + 寒霜（spec-bd-gear §1）
const THERMAL_N = '元素';
// 各元素专属异常
const AIL = {
  kin: { id: 'shrap', n: '碎骨', d: '命中后在周围炸开碎骨，造成一部分伤害（碎骨不会再触发碎骨）' },
  exp: { id: 'after', n: '余震', d: '按上一击的一定比例再重复命中数次' },
  ele: { id: 'shock', n: '感电', d: '叠层降低目标全部抗性' },
  pla: { id: 'blind', n: '致盲', d: '目标伤害与速度总降，随时间减弱' },
  nuc: { id: 'rad', n: '疫病', d: '按命中伤害的比例持续造成伤害，可以叠加' },
  cold: { id: 'chill', n: '冰缓', d: '每层降低移速和攻速，叠满冻结：不能移动、不能攻击、不能重击' },
};
const BURN = { n: '灼烧', d: '火焰伤害累积成伤害池，每跳衰减' };

// 主属性（原作：质量 / 能量 / 时间）
const ATTR_N = { mass: '体魄', energy: '魂力', time: '时砂' };

// 品质 11 档：[名字, 物品等级下限, 上限, 掉落权重]
const QUAL = LOOT.quality.list.map(q => [q.n, q.ilvlMin, q.ilvlMax, q.w]);
const QN = QUAL.map(q => q[0]);

// 稀有度
const RAR = [{ n: '普通', max: 0 }, { n: '罕见', max: 2 }, { n: '稀有', max: 4 }, { n: '独特', max: 0 }];
const RCOL = ['#c9c2b4', '#78a9ff', '#ffd84a', '#ff8a3d'];
const LEG_C = '#ff5fa2', EX_C = '#7dffcf'; // 传奇（熔铸过的独特）、溢彩（带只能掉落的顶档词条）
const icol = it => it.leg ? LEG_C : it.ex ? EX_C : RCOL[it.rar];
const rarName = it => it.leg ? '传奇' : it.ex ? '溢彩' + RAR[it.rar].n : RAR[it.rar].n;

// 装备槽
const SLOTS = [
  { id: 'gem', n: '技能', kind: 'gem' }, // 技能格（spec-skill-gems）
  { id: 'wl', n: '主手', kind: 'weapon' }, { id: 'wr', n: '副手', kind: 'off' }, // 只有主手武器带技能；副手只强化主手技能
  { id: 'shield', n: '盾牌', kind: 'shield' }, { id: 'core', n: '头冠', kind: 'core' },
  { id: 'engine', n: '遁靴', kind: 'engine' }, { id: 'hub', n: '法阵', kind: 'hub' },
];
const KIND_N = { gem: '技能石', weapon: '武器', off: '副手', shield: '盾牌', core: '头冠', engine: '遁靴', hub: '法阵', chip: '印记' };

// 模组槽 / 升级槽数量的随机权重（原作配置：武器、头冠（原作：核心）、遁靴有模组槽；法阵有升级槽）
const SOCKET_W = LOOT.sockets.weapon;
const USOCKET_W = LOOT.sockets.hub;
const SOCKET_KINDS = { core: 1, engine: 1 }; // 武器不再有符文槽（辅助符文插在技能石上）

// 标签（原作同名机制）
const TAG_N = {
  Attack: '攻击', AttackSpeed: '攻速', Range: '射程', AoE: '范围', Projectile: '投射物', ProjectileCanReturn: '可返回', ProjectileCanPierce: '可穿透',
  ProjectileCanChain: '可弹射', ProjectileCanSplit: '可分裂', DoT: '持续伤害', Hit: '命中', Melee: '近战', Mine: '陷阱', Field: '力场', Reflect: '反伤',
  Weapon: '武器', Engine: '遁靴', Core: '头冠', Minion: '召唤物',
};
// 原作的距离单位换算成本作像素
const UNIT = DATA.mechanics.offense.unit;

/* 武器：数值来自 ASTRO.weapons（原作配置），名字、图标和攻击形态在 data/items.json */
const WEAPON_SKIN = DATA.items.weapons;
const WEAPONS = {};
for (const k in WEAPON_SKIN) WEAPONS[k] = { key: k, ...ASTRO.weapons[k], ...WEAPON_SKIN[k], tags: ASTRO.weapons[k].tags.filter(t => t !== 'Weapon').concat('Weapon') };
// 遁靴（原作：引擎，冲刺即技能；本身也带武器标签）
const ENGINE_SKIN = DATA.items.engines;
const ARMORS = { shield: {}, core: {}, engine: {}, hub: {}, off: {}, gem: {} };
/* 技能石（spec-skill-gems，data/gems.json）：主手只给数值，技能来自技能格里的技能石 */
const GEMC = DATA.mechanics.gems;
const GEMS = DATA.gems.list, GEM_BY = Object.fromEntries(GEMS.map(g => [g.id, g]));
for (const g of GEMS) ARMORS.gem[g.id] = { key: g.id, n: g.n, ic: g.ic, tags: g.tags, w: 0, gem: g };
const WEAPON_CAT = {}; for (const c in GEMC.cats) for (const k of GEMC.cats[c].bases) WEAPON_CAT[k] = c;
for (const k in WEAPONS) { WEAPONS[k].cat = WEAPONS[k].cat || WEAPON_CAT[k]; if (GEMC.retired.includes(k)) WEAPONS[k].retired = 1; }
const GEM_OF_BASE = {}; for (const g of GEMS) for (const k of g.src) GEM_OF_BASE[k] = g.id;
const FORM_GEM = Object.fromEntries(GEMS.filter(g => g.fr).map(g => [g.fr, g.id])); // 形态符文 → 技能石
for (const k in ENGINE_SKIN) ARMORS.engine[k] = { key: k, ...ASTRO.engines[k], ...ENGINE_SKIN[k] };
const SHIELD_SKIN = DATA.items.shield, CORE_SKIN = DATA.items.core, HUB_SKIN = DATA.items.hub; // 头冠（原作：核心）
for (const [kind, skin, src] of [['shield', SHIELD_SKIN, ASTRO.shield], ['core', CORE_SKIN, ASTRO.core], ['hub', HUB_SKIN, ASTRO.nexus]])
  for (const k in skin) ARMORS[kind][k] = { key: k, ...src[k], n: skin[k][0], ic: skin[k][1] };
// 副手：data/items.json 的 offhand（隐性支援效果 sup）
for (const k in DATA.items.offhand) if (k[0] !== '_') ARMORS.off[k] = { key: k, ...DATA.items.offhand[k] };
// 印记（原作：芯片）：插在天赋树的印记槽里
ARMORS.chip = Object.fromEntries(Object.entries(DATA.items.chip).map(([k, v]) => [k, { key: k, ...v }]));
const ENGINE_THRUST = ASTRO.thrust; // 原作：所有引擎共享的推力 / 最高速度（按品质）

/* 词条：族、分档数值、物品等级窗口、权重都来自 ASTRO.affixes（原作配置）
   这里只写显示文字和作用方式。local = 只作用于这把武器 */
const AFF_TEXT = {
  FlatKineticDamage: [v => `附加 ${v[0]}–${v[1]} 物理伤害`, 'flat', 'kin'], FlatExplosiveDamage: [v => `附加 ${v[0]}–${v[1]} 火焰伤害`, 'flat', 'exp'],
  FlatPlasmaDamage: [v => `附加 ${v[0]}–${v[1]} 圣光伤害`, 'flat', 'pla'], FlatElectricDamage: [v => `附加 ${v[0]}–${v[1]} 闪电伤害`, 'flat', 'ele'],
  FlatNuclearDamage: [v => `附加 ${v[0]}–${v[1]} 瘟疫伤害`, 'flat', 'nuc'], FlatColdDamage: [v => `附加 ${v[0]}–${v[1]} 寒霜伤害`, 'flat', 'cold'],
  IncreasedKineticBaseDamage: [v => `物理基础伤害提高 ${v}%`, 'baseInc', 'kin'], IncreasedExplosiveBaseDamage: [v => `火焰基础伤害提高 ${v}%`, 'baseInc', 'exp'],
  IncreasedPlasmaBaseDamage: [v => `圣光基础伤害提高 ${v}%`, 'baseInc', 'pla'], IncreasedElectricBaseDamage: [v => `闪电基础伤害提高 ${v}%`, 'baseInc', 'ele'],
  IncreasedNuclearBaseDamage: [v => `瘟疫基础伤害提高 ${v}%`, 'baseInc', 'nuc'], IncreasedThermalBaseDamage: [v => `元素基础伤害提高 ${v}%`, 'baseInc', 'thermal'], IncreasedColdBaseDamage: [v => `寒霜基础伤害提高 ${v}%`, 'baseInc', 'cold'],
  IncreasedBaseAttackSpeed: [v => `基础攻速提高 ${v}%`, 'baseAspd'],
  IncreasedAttackSpeed: [v => `攻击速度提高 ${v}%`, 'aspd'],
  KineticResistance: [v => `物理抗性 +${v}%`, 'res', 'kin'], ExplosiveResistance: [v => `火焰抗性 +${v}%`, 'res', 'exp'], PlasmaResistance: [v => `圣光抗性 +${v}%`, 'res', 'pla'],
  ElectricResistance: [v => `闪电抗性 +${v}%`, 'res', 'ele'], NuclearResistance: [v => `瘟疫抗性 +${v}%`, 'res', 'nuc'], ThermalResistance: [v => `元素抗性 +${v}%`, 'res', 'thermal'], ColdResistance: [v => `寒霜抗性 +${v}%`, 'res', 'cold'],
  MaxKineticResistance: [v => `物理抗性上限 +${v}%`, 'maxRes', 'kin'], MaxExplosiveResistance: [v => `火焰抗性上限 +${v}%`, 'maxRes', 'exp'], MaxPlasmaResistance: [v => `圣光抗性上限 +${v}%`, 'maxRes', 'pla'],
  MaxElectricResistance: [v => `闪电抗性上限 +${v}%`, 'maxRes', 'ele'], MaxNuclearResistance: [v => `瘟疫抗性上限 +${v}%`, 'maxRes', 'nuc'], MaxColdResistance: [v => `寒霜抗性上限 +${v}%`, 'maxRes', 'cold'],
  FlatArmor: [v => `护甲 +${v}`, 'armor'], IncreasedArmor: [v => `护甲提高 ${v}%`, 'armorInc'],
  FlatDeflectorShield: [v => `护盾 +${v}`, 'deflect'], IncreasedDeflectorShield: [v => `护盾提高 ${v}%`, 'deflectInc'], FlatDodge: [v => `闪避 +${v}`, 'dodge'],
  DashDamage: [v => `遁靴伤害提高 ${v}%`, 'dashDmg'], DashRecharge: [v => `冲刺回复速度提高 ${v}%`, 'dashRegen'], IncreasedBaseVelocity: [v => `基础移动速度提高 ${v}%`, 'velocity'],
  DashSlot: [v => v[0] === v[1] ? `冲刺槽 +${v[0]}` : `冲刺槽 +${v}`, 'dashMax'],
  FlatMass: [v => `${ATTR_N.mass} +${v}`, 'mass'], FlatEnergy: [v => `${ATTR_N.energy} +${v}`, 'energy'], FlatTime: [v => `${ATTR_N.time} +${v}`, 'time'],
  AllModsLevel: [v => `所有符文等级 +${v}`, 'modLvl'], IncreasedThermalDamage: [v => `元素伤害提高 ${v}%`, 'thermalInc'],
};
// 印记（原作：芯片）专属词条：插在天赋树的印记槽里，效果并入天赋汇总。[文字, 天赋键, a=提高/附加 m=总增]
const ELN = { Kinetic: 'kin', Explosive: 'exp', Plasma: 'pla', Electric: 'ele', Nuclear: 'nuc', Cold: 'cold' };
const CHIP_TEXT = {
  IncreasedCritChance: [v => `暴击率提高 ${v}%`, 'critInc', 'a'], ChipIncreasedCritChance: [v => `暴击率提高 ${v}%`, 'critInc', 'a'],
  IncreasedCritDamage: [v => `暴击伤害 +${v}%`, 'critDmg', 'a'], ChipIncreasedCritDamage: [v => `暴击伤害 +${v}%`, 'critDmg', 'a'],
  IncreasedDamageOverTime: [v => `持续伤害提高 ${v}%`, 'dotInc', 'a'], ChipIncreasedDamageOverTime: [v => `持续伤害提高 ${v}%`, 'dotInc', 'a'],
  ChipFlatTime: [v => `${ATTR_N.time} +${v}`, 'time', 'a'], ChipFlatMass: [v => `${ATTR_N.mass} +${v}`, 'mass', 'a'], ChipFlatEnergy: [v => `${ATTR_N.energy} +${v}`, 'energy', 'a'],
  ChipIncreasedArmor: [v => `护甲提高 ${v}%`, 'armorInc', 'a'], ChipIncreasedDeflectorShield: [v => `护盾提高 ${v}%`, 'deflectInc', 'a'], ChipFlatDodge: [v => `闪避 +${v}`, 'dodge', 'a'],
  ChipIncreasedAttackSpeed: [v => `攻击速度提高 ${v}%`, 'aspd', 'a'], ChipThermalResistance: [v => `元素抗性 +${v}%`, 'res:thermal', 'a'],
  ChipAllModsLevel: [v => `所有符文等级 +${v}`, 'modLvl', 'a'], ChipMoreThermalDamage: [v => `元素伤害总增 ${v}%`, 'dmg:thermal', 'm'],
  ChipIncreasedMass: [v => `${ATTR_N.mass}提高 ${v}%`, 'massInc', 'a'], ChipIncreasedTime: [v => `${ATTR_N.time}提高 ${v}%`, 'timeInc', 'a'], ChipIncreasedEnergy: [v => `${ATTR_N.energy}提高 ${v}%`, 'energyInc', 'a'],
  ChipDashSlot: [v => `冲刺槽 +${v}`, 'dashMax', 'a'], ChipMoreArmor: [v => `护甲总增 ${v}%`, 'armor', 'm'], ChipMoreDeflectorShield: [v => `护盾总增 ${v}%`, 'deflect', 'm'],
  ChipDoubleDamage: [v => `${v}% 几率造成双倍伤害`, 'double', 'a'], ChipMoreDamageOverTime: [v => `持续伤害总增 ${v}%`, 'dot', 'm'],
  ChipRange: [v => `射程提高 ${v}%`, 'rangeInc', 'a'], ChipAreaOfEffect: [v => `范围提高 ${v}%`, 'aoeInc', 'a'], ChipAreaDamage: [v => `范围伤害提高 ${v}%`, 'areaInc', 'a'],
  ChipProjectileSpeed: [v => `投射物速度提高 ${v}%`, 'projSpd', 'a'],
};
for (const [en, e] of Object.entries(ELN)) {
  CHIP_TEXT[`Increased${en}Damage`] = CHIP_TEXT[`ChipIncreased${en}Damage`] = [v => `${ELEM_N[e]}伤害提高 ${v}%`, 'inc:' + e, 'a'];
  CHIP_TEXT[`Chip${en}Resistance`] = [v => `${ELEM_N[e]}抗性 +${v}%`, 'res:' + e, 'a'];
  CHIP_TEXT[`ChipMore${en}Damage`] = [v => `${ELEM_N[e]}伤害总增 ${v}%`, 'dmg:' + e, 'm'];
}
for (const k in CHIP_TEXT) AFF_TEXT[k] = [CHIP_TEXT[k][0], 'chip'];
const AFF = [];
for (const k in AFF_TEXT) {
  const src = ASTRO.affixes[k]; if (!src) continue;
  const [f, stat, el] = AFF_TEXT[k];
  const local = ['flat', 'baseInc', 'baseAspd'].includes(stat);
  AFF.push({ k, f, stat, el, local, grp: src.grp, type: src.type, on: src.on, pair: stat === 'flat', tiers: src.tiers, tk: CHIP_TEXT[k] && CHIP_TEXT[k][1], tm: CHIP_TEXT[k] && CHIP_TEXT[k][2] });
}
// 流派自带的词条族（data/mechanics.json 的 whirl.affixes）：text 里的 # 填数值
for (const [k, a] of Object.entries({ ...DATA.mechanics.soul.affixes, ...DATA.mechanics.whirl.affixes, ...DATA.mechanics.spark.affixes, ...DATA.mechanics.defense.affixes, ...DATA.mechanics.tags.affixes, ...DATA.mechanics.gear.affixes, ...DATA.mechanics.offhand.affixes })) AFF.push({ k, f: v => a.text.replace('#', v), stat: a.stat, el: null, local: !!a.local, grp: a.grp, type: a.type, on: a.on, tag: a.tag, pair: false, tiers: a.tiers, off: !!a.off });
// 副手也能掷武器上的非局部词条（攻速、范围、投射物、暴击……）
if (DATA.mechanics.offhand.weaponAffixes) for (const a of AFF) if (!a.local && a.on && a.on.includes('weapon') && !a.on.includes('off')) a.on = [...a.on, 'off'];
// 不再掉落的词条（权重全 0 的空词条、等新流派的词条）：铁砧 / 重铸也不出
for (const a of AFF) if (a.tiers.every(t => !t[1])) a.off = true;
for (const a of AFF) if (a.on && a.on.length && a.on.every(o => o === 'chip' || o === 'chipE')) a.off = true; // 印记词条：印记已下线
const AFF_BY = Object.fromEntries(AFF.map(a => [a.k, a]));
// 原作的数值掷骰：value = lo + round((r-1)/254 * (hi-lo))，r 为 1..255 的字节
const rollRange = (lo, hi) => lo + Math.round((ri(1, 255) - 1) / 254 * (hi - lo));
const RARITY_W = [LOOT.rarityWeights.normal, LOOT.rarityWeights.magic, LOOT.rarityWeights.rare]; // 普通 / 罕见 / 稀有

/* 符文（原作：模组）：数值和可插条件在 data/runes.json，这里是数值写法的解释和显示文字 */
const lp = (a, b) => L => a + (b - a) * (L - 1) / 19;
const lpsq = (a, b) => L => a + (b - a) * ((L - 1) / 19) ** 2;
const r2 = v => Math.round(v * 100) / 100;
const roundTo = (v, dec) => dec == null ? v : dec === 0 ? Math.round(v) : Math.round(v * 10 ** dec) / 10 ** dec;
// 数字 / ["lp", a, b, 小数位] / ["lpsq", a, b, 小数位] / ["step", 基数, 每几级] / ["cyc", 每级, 周期, 小数位]，可以嵌套在对象和数组里
function specAt(s, L) {
  if (typeof s === 'number') return s;
  if (Array.isArray(s) && typeof s[0] === 'string') {
    const [f, a, b, dec] = s;
    if (f === 'lp') return roundTo(lp(a, b)(L), dec);
    if (f === 'lpsq') return roundTo(lpsq(a, b)(L), dec);
    if (f === 'step') return a + Math.floor(L / b);
    if (f === 'cyc') return roundTo(a * (L % b), dec);
    throw new Error('未知的数值写法 ' + f);
  }
  if (Array.isArray(s)) return s.map(x => specAt(x, L));
  const o = {}; for (const k in s) o[k] = specAt(s[k], L); return o;
}
// fit：weapon / engine / tag:标签，全部满足才能插
const fitOf = conds => it => conds.every(c => c === 'weapon' ? it.kind === 'weapon' || it.kind === 'gem' : c === 'engine' ? it.kind === 'engine' : itemTags(it).includes(c.slice(4)));
const WH = DATA.mechanics.whirl; // 旋风斩流派的数值
const SP = DATA.mechanics.spark; // 游雷（电球）流派的数值
const SHT = DATA.mechanics.shield; // 圣盾掷（飞盾圣骑）流派的数值
const OB = DATA.mechanics.orb; // 寒魄球（冰封球）流派的数值
const MT = DATA.mechanics.meteor; // 陨火（陨石术）流派的数值
const NV = DATA.mechanics.nova; // 霜环（冰霜新星）流派的数值
const GEAR = DATA.mechanics.gear; // 词条改版（spec-bd-gear §2、§3）
const SOUL = DATA.mechanics.soul; // 魂火（共用资源）
const MOD_D = {
  ShieldThrow: f => `只对圣徽盾生效：盾每 1/攻速 秒自动扔向最近的敌人，伤害 = 盾的护甲 × ${f.throwK}（吃盾牌伤害、圣光伤害），无限穿透；弹射 ${f.chain} 次（碰屏幕边反弹），每弹一次之后伤害 +${f.chainStepInc}%；弹完或寿命到了飞回手上。盾在飞时没有格挡。每次投掷消耗 ${SHT.soulPerThrow} 灯火，反弹过之后每次命中返还 ${SHT.soulPerChain}`,
  FrostOrbRune: f => `只对寒魄宝珠生效：冰球飞行中每 ${OB.emit} 秒向四周放 ${OB.shardDirs} 片冰片（+ 派生 +N），每片 ×${f.shardMul}，不穿透，算投射物。每次施放消耗 ${OB.soulPerCast} 灯火，冰片打中冻结的敌人每片返还 ${OB.refund}（每次最多 ${OB.refundCap}）`,
  Meteor: f => `只对坠星杖生效：陨石伤害 ×${f.meteorMul}，落地留 ${f.ground.dur} 秒火地（每 ${f.ground.tick} 秒造成这次命中的 ${Math.round(f.ground.pct * 100)}%，吃持续时间），火地里的敌人伤害降低 ${Math.round(MT.groundWeaken * 100)}%。每次施放消耗 ${MT.soulPerCast} 灯火，一次杀 ${MT.refundKills} 只以上返还 ${MT.soulRefund}`,
  FrostNova: f => `只对霜钟 / 圣钟生效：新星伤害 ×${f.novaMul}，每次命中叠 ${f.chillStacks} 层冰缓，击退 ${NV.knockPx} 像素；圣钟的元素改成寒霜。每次新星消耗 ${NV.soulPerCast} 灯火，每冻结一只返还 ${NV.refund}（每次最多 ${NV.refundCap}）`,
  Spark: f => `只对雷灵生效：每次出手朝目标扇形放出 ${f.sparkN} 颗游雷（每颗伤害 ×${f.sparkMul}），沿波浪线飞 ${SP.life} 秒（吃持续时间和投射物持续时间，弹速决定飞多远）；碰到屏幕边按弹射次数反弹（每弹一次伤害 ×${SP.chainMul}），弹射用完就飞出屏幕；有穿透时无限穿透，同一串游雷对同一个敌人每 ${SP.rehit} 秒最多打一次，没有穿透时打中就消失；弹射 +${f.chain}；${AIL.ele.n}几率 +${Math.round(f.ail.ele * 100)}%。投射物 +N 让每次多放 N 颗（相加）。每次出手消耗 ${SP.soulPerCast} 灯火，灯火不够时只射普通的一发`,
  Pierce: f => `投射物无限穿透（同一个敌人每 ${MECH.projRehit} 秒最多打一次），穿透后的命中伤害总增 ${Math.round((f.pierceMore - 1) * 100)}%`,
  Chain: f => `投射物弹射 +${f.chain}（碰到屏幕边反弹；闪电链类则在敌人之间多连锁 ${f.chain} 次），每剩一次弹射伤害提高 ${Math.round(f.chainInc * 100)}%`,
  Split: f => `投射物分裂 ${f.split} 次，初次命中每次分裂伤害提高 ${Math.round(f.splitInc * 100)}%`,
  Boomerang: f => `投射物飞到尽头后返回，投射物伤害${f.projInc >= 0 ? '提高' : '降低'} ${Math.abs(f.projInc)}%`,
  Persist: f => `投射物持续时间总增 ${f.projDurMore}%，投射物速度降低 ${-f.projSpd}%（游雷飞得慢但在屏幕里来回更久）`,
  Velocity: f => `投射物速度提高 ${f.projSpd}%，投射物伤害总降 ${Math.round((1 - f.projMore) * 100)}%`,
  Comet: f => `投射物持续时间提高 ${f.projDur}%，速度提高 ${f.projSpd}%，投射物伤害总降 ${Math.round((1 - f.projMore) * 100)}%`,
  RapidProjectiles: f => `投射物伤害提高 ${f.projInc}%，速度提高 ${f.projSpd}%`,
  AreaOfEffect: f => `范围提高 ${f.aoeInc}%，范围伤害提高 ${f.areaInc}%`,
  AdditionalAttacks: f => `额外攻击 ${f.extra} 次${f.extraChance ? `，${Math.round(f.extraChance * 100)}% 几率再多一次` : ''}，伤害总降 ${Math.round((1 - f.more) * 100)}%`,
  AttackSpeed: f => `攻击速度总增 ${f.aspdMore}%`,
  Range: f => `射程提高 ${f.rangeInc}%`,
  Knockback: f => `命中击退敌人，击退造成的伤害总增 ${Math.round((f.knockMore - 1) * 100)}%`,
  Debris: f => `${AIL.kin.n}几率 +${Math.round(f.ail.kin * 100)}%，${AIL.kin.n}伤害总增 ${Math.round((f.debrisMore - 1) * 100)}%`,
  Aftershock: f => `${AIL.exp.n}几率 +${Math.round(f.ail.exp * 100)}%，额外获得 ${Math.round(f.gain.exp * 100)}% 伤害作为火焰伤害`,
  Shock: f => `${AIL.ele.n}几率 +${Math.round(f.ail.ele * 100)}%，额外获得 ${Math.round(f.gain.ele * 100)}% 伤害作为闪电伤害`,
  Blind: f => `${AIL.pla.n}几率 +${Math.round(f.ail.pla * 100)}%，致盲效果总增 ${Math.round((f.blindMore - 1) * 100)}%`,
  Radiation: f => `${AIL.nuc.n}几率 +${Math.round(f.ail.nuc * 100)}%，疫病伤害总增 ${Math.round((f.radMore - 1) * 100)}%`,
  Kinetic: f => `额外获得 ${Math.round(f.gain.kin * 100)}% 伤害作为物理伤害`,
  Thermal: f => `额外获得 ${Math.round(f.thermalGain * 100)}% 伤害作为元素伤害（火焰、圣光、闪电、寒霜均分）`,
  Plasma: f => `附加 ${f.flat.pla[0]}–${f.flat.pla[1]} 圣光伤害，额外获得 ${Math.round(f.gain.pla * 100)}% 伤害作为圣光伤害`,
  Electric: f => `附加 1–${f.flat.ele[1]} 闪电伤害，额外获得 ${Math.round(f.gain.ele * 100)}% 伤害作为闪电伤害`,
  Inferno: f => `附加 ${f.flat.exp[0]}–${f.flat.exp[1]} 火焰伤害，范围提高 ${f.aoeInc}%`,
  SteamHammer: f => `附加 ${f.flat.kin[0]}–${f.flat.kin[1]} 物理伤害，额外获得 ${Math.round(f.gain.kin * 100)}% 伤害作为物理伤害`,
  Agony: f => `持续伤害总增 ${f.dotMore}%`,
  Rigor: f => `暴击率提高 ${f.critInc}%`,
  Lethal: f => `暴击伤害提高 ${f.critDmg}%`,
  ArmorOnHit: f => `命中时回复 ${f.armorOnHit} 点生命`,
  Thorns: f => `受击时对周围的敌人造成一次技能伤害的 ${f.thorns}%（荆棘）`,
  Melee: f => `近战伤害提高 ${f.meleeInc}%，近战命中后承受伤害总降 ${Math.round(MECH.meleeGuardLess * 100)}%`,
  Whirl: f => `回旋骨刃连续砍中时每秒 +${WH.gainPerSec} 层旋势（基础上限 ${WH.maxStacks} 层，${WH.decay} 秒没砍中清零）。有旋势时角色原地转起来，边转边走（移速 ×${WH.spinMoveMul}）：每层伤害总增 ${Math.round((f.spinMore - 1) * 1000) / 10}%（乘算），判定半径 +${WH.rngPer}%，承受伤害降低 ${WH.drPerStack}%（最多 ${WH.drCap}%）。转的时候每秒消耗 ${WH.soulPerSec} 灯火，每砍中一个敌人回 ${WH.soulPerHit}（一次最多按 ${WH.soulHitCap} 个算），灯火空了不再涨层。命中后 ${MECH.meleeGuardTime} 秒内承受伤害总降 ${Math.round(MECH.meleeGuardLess * 100)}%${f.armorOnHit ? `，每砍中一个敌人回复 ${Math.round(f.armorOnHit * 10) / 10} 点生命` : ''}`,
  Crush: f => `近战伤害总增 ${Math.round((f.meleeMore - 1) * 100)}%，${Math.round(f.doubleChance * 100)}% 几率造成双倍伤害`,
  Purity: f => `伤害总增 ${Math.round((f.more - 1) * 100)}%，但这把武器的伤害不能附加或转换成其他元素`,
  DeathThreshold: f => `敌人生命低于 ${f.cull}% 时直接击杀`,
  Overcharge: f => `每个冲刺槽使伤害提高 ${Math.round(f.perDashInc * 100)}%`,
  DashOnHit: f => `命中时回复 ${(f.dashOnHit * 100).toFixed(1)}% 冲刺槽`,
  Agility: f => `遁靴伤害总增 ${f.engineMore}%，冲刺槽 +${f.dashMax}`,
  Aegis: f => `护盾 +${f.deflect}`,
  Diamond: f => `全部抗性 +${f.resAll}%`,
  Eclipse: f => `圣光抗性 +${f.res.pla}%`,
  Faraday: f => `闪电抗性 +${f.res.ele}%`,
  BlastGuard: f => `火焰抗性 +${f.res.exp}%`,
  Resilience: f => `护盾每秒回复 +${f.armorRegen}%（占护盾上限）`,
  Recharge: f => `每秒回复 ${Math.round(f.dashPerSec * 100)}% 冲刺槽`,
  Mass: f => `${ATTR_N.mass}提高 ${f.massInc}%`,
  Energy: f => `${ATTR_N.energy}提高 ${f.energyInc}%`,
  Time: f => `${ATTR_N.time}提高 ${f.timeInc}%`,
};
const MODS = DATA.runes.list.map(r => ({ id: r.id, n: r.n, field: r.field, req: r.req, w: r.w, fit: r.field ? undefined : fitOf(r.fit),
  fx: L => { const f = specAt(r.fx, L); if (f.thermalGain != null) f.gain = { exp: f.thermalGain / 4, pla: f.thermalGain / 4, ele: f.thermalGain / 4, cold: f.thermalGain / 4 }; return f; }, d: MOD_D[r.id] }));
for (const m of MODS) { const a = ASTRO.mods[m.id]; m.req = a ? a.req : (m.req || 1); m.w = a ? a.w : (m.w ?? 450); if (FORM_GEM[m.id]) m.w = 0; } // 形态符文并进技能石，不再掉落
const MOD_BY = Object.fromEntries(MODS.map(m => [m.id, m]));
const MOD_MAX = LOOT.runeDrop.maxLevel;
const MOD_XP = ASTRO.modXp; // 累计经验门槛（原作配置）
const modLevelOf = xp => { let L = 1; for (const t of MOD_XP) if (xp >= t) L++; return Math.min(MOD_MAX, L); };

/* 铁砧和铸符（data/craft.json） */
const CRAFT = DATA.craft;
const GLYPHS = CRAFT.glyphs.list;
const GLYPH_BY = Object.fromEntries(GLYPHS.map(g => [g.id, g]));
const GLYPHS_DROP = GLYPHS.filter(g => !g.special); // 立誓符只从天梯宝箱单独掉
const OATH = CRAFT.oath, OATH_BY = Object.fromEntries(OATH.list.map(o => [o.id, o])); // 誓约（spec-bd-gear §3.5）
const oathFits = (o, it) => o.on.includes(it.kind) || (it.kind === 'weapon' && o.on.includes('wl')) || (it.kind === 'off' && o.on.includes('wr'));
const UQX = DATA.mechanics.uniq, IMPL = DATA.mechanics.implicit; // 第 5 步独特的固定数值、武器底子隐性倾向

/* 机制常数（data/mechanics.json）和成长、怪物、掉落（data/progression.json、data/loot.json） */
const MECH = { ...DATA.mechanics.attributes, ...DATA.mechanics.defense, ...DATA.mechanics.offense, ...DATA.mechanics.ailments,
  fatigueStart: PROG.bossFatigue.start, fatigueStep: PROG.bossFatigue.step, fatigueMax: PROG.bossFatigue.max };
// 敌人：hp / dmg 是 1 级数值，按怪物等级成长
const MOBS = PROG.monsters;
const BOSS = PROG.bosses.list[0];
const MS = PROG.monsterScaling;
// 分段成长：L 超过 knee 后改用第二段倍率（knee 为 null 时不分段）
const msPow = (g1, g2, L) => { const k = MS.knee || 1e9; return L <= k ? Math.pow(g1, L - 1) : Math.pow(g1, k - 1) * Math.pow(g2 ?? g1, L - k); };
const monHp = L => msPow(MS.hpGrowth, MS.hpGrowth2, L);
const monDmg = L => msPow(MS.dmgGrowth, MS.dmgGrowth2, L);
const monXp = L => Math.pow(MS.xpGrowth, L - 1);
const killNeed = L => PROG.run.killsBase + L * PROG.run.killsPerLevel;
const DROP = LOOT.drop;
const PLAYER = PROG.player;
const xpNeed = L => Math.round(PROG.xp.base * Math.pow(PROG.xp.growth, L - 1));
// 系统解锁：已通关的最深层数、角色等级、天梯最高层都达到要求才开放
const unlockOf = id => PROG.unlocks[id];
const unlocked = id => { const u = unlockOf(id); if (!u || UNLOCK_ALL) return true; return S.maxDepth - 1 >= (u.depth || 0) && S.level >= (u.level || 0) && (S.ladder ? S.ladder.best : 0) >= (u.ladder || 0) && (!u.event || UNLOCK_EV || !!(S.events && S.events[u.event])); };
// spec-unlocks §3.6：说明文字里 {u:系统id|文字}，系统没解锁时显示“？？？（以后会知道）”
const ulk = s => String(s).replace(/\{u:(\w+)\|([^}]*)\}/g, (_, id, t) => unlocked(id) ? t : '？？？（以后会知道）');
const unlockText = id => { const u = unlockOf(id); const p = []; if (u && u.depth) p.push(`通关第 ${u.depth} 层`); if (u && u.level) p.push(`角色 ${u.level} 级`); if (u && u.ladder) p.push(`天梯通过第 ${u.ladder} 层`); return p.join('、') + '后开放'; };

const THEMES = [
  { from: 1, n: '白骨长廊', wall: ['#4a3f55', '#433a4e', '#3e3548'], wallM: '#2a2233', floor: ['#3a3244', '#352e3f', '#3f3649'], mortar: '#241e2c', acc: '#b9ad94', acc2: '#7d7262', fog: [12, 8, 18] },
  { from: 6, n: '苔藓墓室', wall: ['#3a4a3f', '#34443a', '#2f3f35'], wallM: '#1e2a22', floor: ['#2d3a31', '#29352d', '#324036'], mortar: '#1a241d', acc: '#6fae5a', acc2: '#3f6a35', fog: [8, 14, 10] },
  { from: 12, n: '熔渣深坑', wall: ['#4f3530', '#4a302b', '#432a26'], wallM: '#2a1814', floor: ['#3a2824', '#352420', '#402c27'], mortar: '#221410', acc: '#ff6a2a', acc2: '#8a3a1a', fog: [18, 8, 4] },
  { from: 20, n: '霜冻王座', wall: ['#3a4658', '#354153', '#303c4e'], wallM: '#1e2633', floor: ['#2c3646', '#283241', '#303b4c'], mortar: '#1a202b', acc: '#9fd8ff', acc2: '#5b8fe0', fog: [6, 10, 18] },
];
const themeFor = d => { let t = THEMES[0]; for (const x of THEMES) if (d >= x.from) t = x; return t; };
