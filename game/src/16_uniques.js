/* ---------------- 独特装备 ----------------
   名单、底材、需求等级、掉落权重、保底词条（族 + 档位）来自原作配置（bases.json 的 unique_affixes）；
   专属规则的具体数值原作表里没有，这里按原作描述自定。名字和文字为原创。
   fixed: [词条族, 档位 N（T1 最高）]；rules: [规则键, 下限, 上限]。表在 data/uniques.json。 */
const UNIQUE_BY = Object.fromEntries(DATA.uniques.list.map(u => [u.id, u])); // 含传奇词条模板，按规则查数值用
const UNIQUES = DATA.uniques.list.filter(u => !u.leg); // 神话（data/uniques.json）
const LEGA = DATA.uniques.list.filter(u => u.leg); // 传奇词条模板：稀有装备带一条（11-10 稀有度改版）
const ruleSrc = it => it ? UNIQUE_BY[it.u] || UNIQUE_BY[it.la] || null : null; // 神话的规则，或传奇装备的传奇词条
const RULE_TEXT = {
  knock: () => '命中击退敌人', knockMore: v => `伤害总增 ${v}%`, aspdLess: v => `攻击速度总降 ${v}%`,
  afterPct: v => `余震每次保留 ${v}% 伤害`, afterRep: v => `余震多重复 ${v} 次`, convKinThermal: v => `${v}% 的物理伤害平均转换为火焰、圣光、闪电、寒霜、瘟疫`, pierceInf: () => '投射物无限穿透',
  pierce: () => '投射物无限穿透', convExpNuc: v => `${v}% 的火焰伤害转换为瘟疫伤害`, pull: () => '命中把敌人拉近',
  dotMore: v => `持续伤害总增 ${v}%`, 'shred:nuc': v => `命中使敌人瘟疫抗性 -${v}%（3 秒）`, chain: v => `弹射 +${v}（投射物打中敌人后转向附近另一个没打过的敌人，射程重新算；先弹射，弹完再穿透）`,
  flatPerArmor: v => `每 100 护甲附加 ${v}–${v * 2} 物理伤害`, armorInc: v => `护甲提高 ${v}%`, shieldRegenPct: v => `护盾每秒回复 +${v}%`, energyAdd: v => `${ATTR_N.energy} +${v}`, aspdLessAll: v => `代价：攻击速度总降 ${v}%`, debrisPerEnergy: v => `每点${ATTR_N.energy}使碎骨范围提高 ${v}%`,
  killInc: v => `本趟下行每击杀一个敌人，伤害提高 ${v}%（最多 ${RULES.killInc.max}%）`, cull: v => `敌人生命低于 ${v}% 时直接击杀`,
  twinNuc: v => `装着副手时，瘟疫伤害提高 ${v}%`, convPlaNuc: v => `${v}% 的圣光伤害转换为瘟疫伤害`, massAdd: v => `${ATTR_N.mass} +${v}`,
  dotInc: v => `持续伤害提高 ${v}%`, burnSlow: v => `灼烧衰减降低 ${v}%`, kinBaseInc: v => `物理基础伤害提高 ${v}%`,
  kinShock: v => `物理伤害有 ${v}% 几率造成感电`, double: v => `${v}% 几率造成双倍伤害`, shockMul: v => `感电效果提高 ${v}%`, runeLvl: v => `这件装备上的符文等级 +${v}`,
  massInc: v => `${ATTR_N.mass}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, energyInc: v => `${ATTR_N.energy}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`, timeInc: v => `${ATTR_N.time}${v >= 0 ? '提高' : '降低'} ${Math.abs(v)}%`,
  rangeInc: v => `射程提高 ${v}%`, spinDecay: v => `代价：旋转层数掉得更快，不命中 ${Math.round(WH.decay * (1 - v / 100) * 10) / 10} 秒就清零（原来 ${WH.decay} 秒）`, resAll: v => `全抗 ${v >= 0 ? '+' : ''}${v}`, rangedDRU: v => `远程伤害降低 ${v}%`, rangedSpike: () => `被远程命中时，骨刺刺穿身边的敌人（护盾上限的 50%），每秒最多一次`, blindAura: () => ruleText('blindAura'), shockAura: () => ruleText('shockAura'),
  fieldHere: () => '力场符文插在这里也生效', takenKin: v => `受到的伤害有 ${v}% 按物理抗性结算`, dodge: v => `闪避 +${v}`,
  velocity: v => `移动速度提高 ${v}%`, critLess: v => `暴击率总降 ${v}%`,
  areaEye: () => ruleText('areaEye'), projLess: v => `代价：投射物伤害总降 ${v}%`, armorLess: v => `代价：护盾总降 ${v}%`,
  delayCrown: v => `每多 0.1 秒延迟，延迟伤害总增 ${v}%`, delayAdd: v => `延迟 +${v} 秒`, aoeInc: v => `范围提高 ${v}%`, earlyWarn: () => '代价：预警圈更早出现（圈里的怪会往外躲）',
  groundStack: v => `你的地面效果在同一位置可以叠 ${v} 层（各自计时）`, durLess: v => `代价：持续时间降低 ${v}%`,
  martyrThrow: v => `圣盾掷的回弹次数 ×2；每次命中回 ${v / 10}% 护盾`, martyrArmor: () => '代价：盾在飞时不算盾的护甲',
  echoCrown: v => `弹射或回弹过的投射物，命中时在命中点小爆（半径 ${UQX.echoR} 像素，×${v}%，算范围）`, chainLess: v => `代价：弹射 −${v}`,
  winterHeart: v => `冰球速度 −70%；持续时间 +${v}%；冰片频率 ×1.5`, winterCost: v => `代价：每次施放的灯火消耗 +${v}%`,
  shardCrown: () => '派生物再派生一层（每层 ×0.5）', frozenTaken: v => `冻结的敌人受到的伤害提高 ${v}%`, projSlowU: v => `代价：投射物速度降低 ${v}%（寒魄球用起来是好处）`,
  autoNova: v => `新星每 ${UQX.autoNovaEvery} 秒自动脉冲一次（×${v}%），不再按攻速出手`, iceGround: () => `脚下留 ${UQX.iceGround.dur} 秒冰地，每秒叠 ${UQX.iceGround.chillPerSec} 层冰缓`, moveLess: v => `代价：移速 −${v}%`,
  coffin: () => `每冻结一个敌人回 ${UQX.coffinShield}% 护盾`, freezeDur: v => `冻结时间 +${v}%`, fireResLess: v => `代价：火焰抗性 −${v}`,
  twinFx: v => `装备给的命中效果（碎裂、引燃、雷爆、霜结、致盲、疫染）每次触发两次（第二次 ${v}%）`, prismFx: v => `不论技能是什么元素，命中时轮流触发碎裂、引燃、雷爆、霜结、致盲、疫染（强度 ${v}%）`, pureHeart: v => `技能元素的主效果强度 +${v}%`,
  emberGrip: () => '你的命中总是额外引燃（不论技能是什么元素）', boneBreak: v => `物理技能命中时碎裂（波及周围）；碎裂 ${v}% 几率再碎一次（×0.5）`, wildfire: () => '火焰技能命中时引燃；灼烧中的敌人死亡时，把一半灼烧传给 40 码内的敌人',
  burnKeepU: () => '灼烧不再自然衰减', chainBlast: v => `闪电技能命中时雷爆；雷爆额外跳向最近 2 个敌人（${v}% 伤害）`, frostCoffin: v => `寒霜技能命中时霜结；冻结时间 +${v}%；冻结的敌人死亡时向 4 个敌人射出冰片`,
  judgeBlind: v => `圣光技能命中时致盲；对致盲的敌人伤害总增 ${v}%`, plagueTide: v => `瘟疫技能命中时疫染；带疫病的敌人死亡时传染全部层数、范围 ×1.5`,
  returnLight: v => `每局一次：灯火低于 10% 时回到 ${v}%`, lightEater: v => `命中额外回灯火（每秒最多 ${v}）`, lampChain: v => `灯火状态始终为「暗」；灯火消耗 −${v}%`,
  darkWalker: v => `对光照半径外的敌人伤害总增 ${v}%`, whirlHeart: () => '旋风之心：【近战·范围】技能总增', aegisBurst: () => '回响圣盾：【盾】技能总增', otherLess: v => `代价：非【盾】技能伤害总降 ${v}%`,
  vortexTreads: () => `旋风斩常驻且叠满层时移速 +${UQX.vortex.moveFull}%、受到的伤害 −${UQX.vortex.takenFull}%`,
  chainCrown: () => ruleText('chainCrown'), projCrown: () => ruleText('projCrown'), durCrown: () => ruleText('durCrown'), velCrown: () => ruleText('velCrown'), meleeCrown: () => ruleText('meleeCrown'), multicrit: () => ruleText('multicrit'), dashMax: v => `冲刺槽 +${v}`, finale: () => ruleText('finale'), splitEnd: () => ruleText('splitEnd'),
};
for (const k of ELEM) RULE_TEXT['ail:' + k] = v => k === 'kin' || k === 'pla' ? `${AIL[k].n}几率 +${v}%` : `${AIL[k].n}效果 +${v}%`; // v3：灼烧 / 感电 / 疫病 / 冰缓必定触发，这类加成改成强度
const FX_TEXT = { kin: '物理技能命中时碎裂：周围的敌人受到这一下 18% 的伤害', exp: '火焰技能命中时引燃：额外累积这一下 15% 的灼烧', ele: '闪电技能命中时雷爆：半秒后在命中点炸开，周围的敌人受到这一下 24% 的伤害', cold: '寒霜技能命中时霜结：多叠 1 层冰缓；打中冻结的敌人额外造成这一下 45% 的伤害', pla: '圣光技能命中时致盲 2 秒；打中已经致盲的敌人回一点护盾', nuc: '瘟疫技能命中时疫染：多叠一层疫病；带疫病的敌人死亡时，把一半层数传给最近 2 个敌人' };
const FX_N = { kin: '碎裂', exp: '引燃', ele: '雷爆', cold: '霜结', pla: '致盲', nuc: '疫染' }; // 装备给的六种命中效果的名字
for (const k of ELEM) RULE_TEXT['fx:' + k] = () => FX_TEXT[k]; // 六种命中效果（传奇词条）
for (const k of ELEM) RULE_TEXT['efx:' + k] = v => treeText('efx:' + k, v); // 六系主效果强度（传奇词条）
const ruleLines = it => { const u = ruleSrc(it); return u ? [...u.rules.map(([k], i) => RULE_TEXT[k](it.uv[i])), ...(u.when ? [`以上规则只在【${TAG_N[u.when] || u.when}】技能上生效`] : [])] : []; };
const uval = (it, k) => { const u = ruleSrc(it); if (!u) return 0; let s = 0; u.rules.forEach(([kk], i) => { if (kk === k) s += it.uv[i]; }); return s; };
